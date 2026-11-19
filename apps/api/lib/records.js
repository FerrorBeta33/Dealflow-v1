import { listQuery } from './validation.js';
import { insert, row, update, requireCondition } from './errors.js';
import { deliveryReadiness } from './workflow.js';
const modelSelect = `SELECT m.*, m.brand || ' ' || m.name || ' · ' || m.variant AS label FROM vehicle_models m`;
const vehicleSelect = `SELECT v.*, m.brand, m.name, m.variant, m.fuel, m.transmission, m.base_price,
  m.brand || ' ' || m.name || ' · ' || m.variant AS label, br.name AS branch FROM vehicles v
  JOIN vehicle_models m ON m.id = v.model_id JOIN branches br ON br.id = v.branch_id`;
const bookingSelect = `SELECT b.*, c.name AS customer, c.phone, v.vin, v.branch_id, br.name AS branch,
  m.brand || ' ' || m.name || ' · ' || m.variant AS label, o.id AS order_id FROM bookings b
  JOIN customers c ON c.id = b.customer_id JOIN vehicles v ON v.id = b.vehicle_id
  JOIN vehicle_models m ON m.id = v.model_id JOIN branches br ON br.id = v.branch_id
  LEFT JOIN orders o ON o.booking_id = b.id`;
const orderSelect = `SELECT o.*, c.id AS customer_id, c.name AS customer, c.phone, c.email, c.address,
  v.vin, v.branch_id, br.name AS branch, br.address AS branch_address,
  m.brand || ' ' || m.name || ' · ' || m.variant AS label, i.reference AS invoice_reference,
  COALESCE((SELECT SUM(p.amount) FROM payment_requests p WHERE p.order_id = o.id AND p.status = 'paid'),0) AS paid,
  o.total - COALESCE((SELECT SUM(p.amount) FROM payment_requests p WHERE p.order_id = o.id AND p.status = 'paid'),0) AS outstanding
  FROM orders o JOIN bookings b ON b.id = o.booking_id JOIN customers c ON c.id = b.customer_id
  JOIN vehicles v ON v.id = b.vehicle_id JOIN vehicle_models m ON m.id = v.model_id
  JOIN branches br ON br.id = v.branch_id JOIN invoices i ON i.order_id = o.id`;
const configs = {
  models: {
    sql: modelSelect,
    alias: 'm',
    search: ['m.brand', 'm.name', 'm.variant'],
    filters: {
      brand: 'm.brand',
      variant: 'm.variant',
      fuel: 'm.fuel',
      transmission: 'm.transmission',
    },
    name: 'm.name',
    price: 'm.base_price',
  },
  vehicles: {
    sql: vehicleSelect,
    alias: 'v',
    search: ['v.vin', 'm.brand', 'm.name', 'm.variant', 'v.color'],
    filters: {
      status: 'v.status',
      branch_id: 'v.branch_id',
      model_id: 'v.model_id',
      brand: 'm.brand',
      variant: 'm.variant',
      fuel: 'm.fuel',
      transmission: 'm.transmission',
    },
    name: 'm.name',
    price: 'm.base_price',
  },
  customers: {
    sql: 'SELECT c.*, c.name AS label FROM customers c',
    alias: 'c',
    search: ['c.name', 'c.phone', 'c.email'],
    filters: {},
    name: 'c.name',
  },
  bookings: {
    sql: bookingSelect,
    alias: 'b',
    search: ['c.name', 'v.vin', 'm.name', 'CAST(b.id AS TEXT)'],
    filters: { status: 'b.status', branch_id: 'v.branch_id', customer_id: 'b.customer_id' },
    name: 'c.name',
  },
  orders: {
    sql: orderSelect,
    alias: 'o',
    search: ['c.name', 'v.vin', 'i.reference', 'CAST(o.id AS TEXT)'],
    filters: { status: 'o.status', branch_id: 'v.branch_id', customer_id: 'b.customer_id' },
    name: 'c.name',
    price: 'o.total',
  },
};
export async function listRecords(db, entity, query) {
  const input = listQuery.parse(query);
  const config = configs[entity];
  const args = [];
  const conditions = [];
  if (input.q) {
    conditions.push(
      `(${config.search.map((column) => `${column} ILIKE ? ESCAPE '\\'`).join(' OR ')})`,
    );
    const term = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`;
    args.push(...config.search.map(() => term));
  }
  for (const [key, column] of Object.entries(config.filters)) {
    if (input[key]) {
      conditions.push(`${column} = ?`);
      args.push(input[key]);
    }
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const total = (
    await db.prepare(`SELECT COUNT(*) AS count FROM (${config.sql}${where})`).get(...args)
  ).count;
  const sorts = {
    newest: `${config.alias}.id DESC`,
    oldest: `${config.alias}.id ASC`,
    name: `${config.name} ASC, ${config.alias}.id ASC`,
    price: `${config.price || config.name} ASC, ${config.alias}.id ASC`,
  };
  const items = await db
    .prepare(`${config.sql}${where} ORDER BY ${sorts[input.sort]} LIMIT ? OFFSET ?`)
    .all(...args, input.limit, (input.page - 1) * input.limit);
  return {
    items,
    total,
    page: input.page,
    pages: Math.max(1, Math.ceil(total / input.limit)),
    limit: input.limit,
  };
}
export async function recordDetail(db, entity, id) {
  const config = configs[entity];
  const found = await db.prepare(`${config.sql} WHERE ${config.alias}.id = ?`).get(id);
  requireCondition(found, 'Record not found', 404);
  if (entity === 'orders') {
    found.readiness = await deliveryReadiness(db, found);
    found.invoice = await db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(id);
  }
  return found;
}
export async function saveCatalog(db, entity, id, input) {
  return await db
    .transaction(async () => {
      const table = entity === 'models' ? 'vehicle_models' : entity;
      if (entity === 'vehicles') {
        if (id)
          requireCondition(
            ['available', 'in_transit'].includes((await row(db, table, id)).status),
            'Reserved or sold vehicles cannot be edited',
          );
        await row(db, 'vehicle_models', input.model_id);
        await row(db, 'branches', input.branch_id);
      }
      return id ? await update(db, table, id, input) : await insert(db, table, input);
    })
    .immediate();
}
export async function dashboard(db) {
  const metrics = await db
    .prepare(
      `SELECT
    (SELECT COUNT(*) FROM vehicles WHERE status = 'available') AS available,
    (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS bookings,
    (SELECT COUNT(*) FROM orders WHERE status = 'open') AS orders,
    (SELECT COALESCE(SUM(amount),0) FROM payment_requests WHERE status = 'paid') AS received`,
    )
    .get();
  const stock = await db
    .prepare(
      `SELECT br.name AS branch, v.status, COUNT(*) AS count FROM vehicles v
    JOIN branches br ON br.id = v.branch_id GROUP BY br.id,v.status ORDER BY br.name,v.status LIMIT 100`,
    )
    .all();
  const events = await db
    .prepare(
      `SELECT * FROM (
    SELECT 'Booking ' || status AS title, 'Booking #' || id AS detail, updated_at AS happened_at FROM bookings
    UNION ALL SELECT 'Order created', 'Order #' || id, created_at FROM orders
    UNION ALL SELECT 'Delivery completed', 'Order #' || id, delivered_at FROM orders WHERE delivered_at IS NOT NULL
    UNION ALL SELECT 'Payment received', 'Payment #' || id, settled_at FROM payment_requests WHERE status = 'paid'
    UNION ALL SELECT 'Document ' || status, 'Order #' || order_id || ' · ' || type, reviewed_at FROM documents WHERE reviewed_at IS NOT NULL
    ) ORDER BY happened_at DESC LIMIT 12`,
    )
    .all();
  return { metrics, stock, events };
}
