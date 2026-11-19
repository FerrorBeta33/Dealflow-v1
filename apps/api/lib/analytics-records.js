import {
  dataCte,
  scope,
  metadata,
  paginated,
  likeTerm,
  readyPredicate,
  missingDocuments,
} from './analytics-query.js';
import { metricCondition } from './analytics-metrics.js';
import { metricDefinitions } from '../../../shared/command-center.js';
import { recordDetail } from './records.js';
import { requireCondition } from './errors.js';

export function metricRecords(db, input) {
  const spec = metricCondition(input.metric, input);
  const definition = metricDefinitions.find((metric) => metric.id === input.metric);
  const filters = [spec.where];
  const args = [...spec.args];
  if (input.q) {
    filters.push("(label LIKE ? ESCAPE '\\' OR vin LIKE ? ESCAPE '\\' OR CAST(id AS TEXT) = ?)");
    args.push(likeTerm(input.q), likeTerm(input.q), input.q);
  }
  if (input.status && spec.source === 'vehicle_data') {
    filters.push('status = ?');
    args.push(input.status);
  }
  const sql = `${dataCte} SELECT * FROM ${spec.source} data WHERE ${filters.join(' AND ')} ORDER BY id DESC`;
  const result = paginated(db, sql, args, input);
  const payment = spec.source === 'payment_data';
  const entity = payment ? 'payments' : definition.entity;
  return {
    ...metadata(input),
    ...result,
    definition,
    entity,
    items: result.items.map((item) => ({
      ...item,
      entity,
      reference: payment
        ? `Payment #${item.id}`
        : entity === 'orders'
          ? `Order #${item.id}`
          : entity === 'bookings'
            ? `Booking #${item.id}`
            : item.vin,
      href: payment ? `/orders/${item.order_id}/payments` : `/${entity}/${item.id}`,
    })),
  };
}
const exceptionSql = `${dataCte}, exceptions AS (
  SELECT 'order-' || id AS id, id AS order_id, vehicle_id, vin, label, customer,
    branch, branch_id, model_id, outstanding, pending, identity, address,
    CASE WHEN ${readyPredicate} THEN 'ready'
      WHEN outstanding > 0 AND ${missingDocuments} THEN 'combined'
      WHEN outstanding > 0 THEN 'payment' ELSE 'documents' END AS type,
    CASE WHEN ${readyPredicate} THEN 0 WHEN outstanding > 0 THEN 1 ELSE 2 END AS priority,
    created_at, MAX(CAST(julianday(?) - julianday(created_at) AS INTEGER),0) AS age_days,
    '/orders/' || id AS href
  FROM order_data WHERE status = 'open'
  UNION ALL SELECT 'vehicle-' || id, NULL, id, vin, label, NULL, branch, branch_id, model_id,
    0, 0, 0, 0, 'aging', 3, created_at,
    MAX(CAST(julianday(?) - julianday(created_at) AS INTEGER),0), '/vehicles/' || id
  FROM vehicle_data WHERE status = 'available' AND julianday(?) - julianday(created_at) >= 30
)`;
export function exceptions(db, input) {
  const scoped = scope(input);
  const filters = [scoped.sql];
  const args = [input.asOf, input.asOf, input.asOf, ...scoped.args];
  if (input.type === 'pending') filters.push('pending > 0');
  else if (input.type === 'payment') filters.push("type IN ('payment','combined')");
  else if (input.type !== 'all') {
    filters.push('type = ?');
    args.push(input.type);
  }
  const order =
    input.sort === 'outstanding'
      ? 'outstanding DESC'
      : input.sort === 'age'
        ? 'age_days DESC'
        : 'priority';
  return {
    ...metadata(input),
    ...paginated(
      db,
      `${exceptionSql} SELECT * FROM exceptions data WHERE ${filters.join(' AND ')} ORDER BY ${order}, id`,
      args,
      input,
    ),
  };
}
export function journey(db, id, input) {
  // Existing detail supplies the authoritative balance/readiness and immutable invoice.
  const order = recordDetail(db, 'orders', id);
  const lineage = db.prepare(`${dataCte} SELECT * FROM order_data WHERE id = ?`).get(id);
  requireCondition(
    (!input.branch_id || lineage.branch_id === input.branch_id) &&
      (!input.model_id || lineage.model_id === input.model_id),
    'Order is outside the selected scope',
    404,
  );
  const documents = db
    .prepare(
      `SELECT type, status, COUNT(*) AS count, MAX(reviewed_at) AS reviewed_at
    FROM documents WHERE order_id = ? GROUP BY type,status ORDER BY type,status LIMIT 12`,
    )
    .all(id);
  const paymentStates = db
    .prepare(
      `SELECT status, COUNT(*) AS count, SUM(amount) AS amount,
    MAX(settled_at) AS last_settled_at FROM payment_requests WHERE order_id = ? GROUP BY status LIMIT 3`,
    )
    .all(id);
  const latest = db
    .prepare(
      `SELECT MAX(happened_at) AS happened_at FROM (
    SELECT created_at AS happened_at FROM orders WHERE id = ?
    UNION ALL SELECT delivered_at FROM orders WHERE id = ?
    UNION ALL SELECT settled_at FROM payment_requests WHERE order_id = ?
    UNION ALL SELECT reviewed_at FROM documents WHERE order_id = ?
  )`,
    )
    .get(id, id, id, id);
  return {
    ...metadata(input),
    order: { ...order, ...lineage },
    documents,
    paymentStates,
    latestMilestone: latest.happened_at,
    ready:
      order.status === 'open' &&
      lineage.vehicle_status === 'reserved' &&
      order.readiness.outstanding === 0 &&
      order.readiness.identity &&
      order.readiness.address,
  };
}
export function vinJourney(db, id, input) {
  const vehicle = recordDetail(db, 'vehicles', id);
  requireCondition(
    (!input.branch_id || vehicle.branch_id === input.branch_id) &&
      (!input.model_id || vehicle.model_id === input.model_id),
    'VIN is outside the selected scope',
    404,
  );
  const booking = db
    .prepare(
      `SELECT b.*, c.name AS customer, o.id AS order_id FROM bookings b
    JOIN customers c ON c.id=b.customer_id LEFT JOIN orders o ON o.booking_id=b.id
    WHERE b.vehicle_id=? ORDER BY CASE WHEN b.status IN ('confirmed','converted') THEN 0 ELSE 1 END, b.id DESC LIMIT 1`,
    )
    .get(id);
  return { ...metadata(input), vehicle, booking: booking ?? null };
}
export function search(db, input) {
  const scoped = scope(input);
  const term = likeTerm(input.q);
  const sql = `${dataCte}, searchable AS (
    SELECT 'vehicles' AS entity, id, vin AS reference, label, branch, branch_id, model_id,
      '/vehicles/' || id AS href FROM vehicle_data
    UNION ALL SELECT 'bookings', id, 'Booking #' || id, customer || ' · ' || vin, branch, branch_id, model_id,
      '/bookings/' || id FROM booking_data
    UNION ALL SELECT 'orders', id, 'Order #' || id || ' · ' || invoice_reference,
      customer || ' · ' || vin, branch, branch_id, model_id,
      '/orders/' || id FROM order_data
    UNION ALL SELECT 'models', id, brand || ' ' || name, variant, NULL, NULL, id, '/models/' || id FROM vehicle_models
  ), matches AS (
    SELECT * FROM searchable data WHERE ${scoped.sql}
      AND (reference LIKE ? ESCAPE '\\' OR label LIKE ? ESCAPE '\\' OR CAST(id AS TEXT) = ?)
    UNION ALL SELECT 'customers', c.id, c.name, 'Customer record', NULL, NULL, NULL, '/customers/' || c.id
      FROM customers c WHERE c.name LIKE ? ESCAPE '\\' AND (? IS NULL AND ? IS NULL OR EXISTS (
        SELECT 1 FROM booking_data b WHERE b.customer_id = c.id
          AND (? IS NULL OR b.branch_id = ?) AND (? IS NULL OR b.model_id = ?)))
  ) SELECT *, CASE WHEN reference = ? OR CAST(id AS TEXT) = ? THEN 0 ELSE 1 END AS rank
    FROM matches ORDER BY rank, entity, id LIMIT 20`;
  if (!input.q)
    return {
      ...metadata(input),
      items: [],
      scope: 'VIN, model, booking, order/invoice and customer names',
    };
  return {
    ...metadata(input),
    items: db
      .prepare(sql)
      .all(
        ...scoped.args,
        term,
        term,
        input.q,
        term,
        input.branch_id ?? null,
        input.model_id ?? null,
        input.branch_id ?? null,
        input.branch_id ?? null,
        input.model_id ?? null,
        input.model_id ?? null,
        input.q,
        input.q,
      ),
    scope: 'VIN, model, booking, order/invoice and customer names; at most 20 matches',
  };
}
