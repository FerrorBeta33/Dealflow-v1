import { metricDefinitions } from '../../../shared/command-center.js';
import { dataCte, scope, metadata, readyPredicate, missingDocuments } from './analytics-query.js';

export const metricSources = {
  stock: ['vehicle_data', '1=1'],
  bookingsCreated: ['booking_data', '1=1', undefined, 'created_at'],
  ordersCreated: ['order_data', '1=1', undefined, 'created_at'],
  available: ['vehicle_data', "status = 'available'"],
  inTransit: ['vehicle_data', "status = 'in_transit'"],
  activeBookings: ['booking_data', "status = 'confirmed'"],
  openOrders: ['order_data', "status = 'open'"],
  collected: ['payment_data', "status = 'paid'", 'SUM(amount)', 'settled_at'],
  outstanding: ['order_data', "status = 'open'", 'SUM(outstanding)'],
  ready: ['order_data', readyPredicate],
  invoiced: ['order_data', '1=1', 'SUM(invoice_amount)', 'created_at'],
  paymentBlocked: ['order_data', "status = 'open' AND outstanding > 0"],
  documentBlocked: ['order_data', `status = 'open' AND outstanding = 0 AND ${missingDocuments}`],
  delivered: ['order_data', "status = 'delivered'", undefined, 'delivered_at'],
  aged30: ['vehicle_data', "status = 'available' AND julianday(?) - julianday(created_at) >= 30"],
  aged45: ['vehicle_data', "status = 'available' AND julianday(?) - julianday(created_at) >= 45"],
  cycle: [
    'order_data',
    "status = 'delivered' AND delivered_at >= booking_at",
    'AVG(julianday(delivered_at) - julianday(booking_at))',
    'delivered_at',
  ],
  paidOrders: ['order_data', "status = 'open' AND outstanding = 0"],
  verifiedOrders: ['order_data', "status = 'open' AND identity = 1 AND address = 1"],
};
export function metricCondition(metric, input) {
  const [source, predicate, aggregate = 'COUNT(*)', dateColumn] = metricSources[metric];
  const scoped = scope(input);
  const args = [...scoped.args];
  if (metric === 'aged30' || metric === 'aged45') args.push(input.asOf);
  let where = `${scoped.sql} AND ${predicate}`;
  if (dateColumn) {
    where += ` AND ${dateColumn} >= ? AND ${dateColumn} < ?`;
    args.push(input.from, input.to);
  }
  return { source, where, args, aggregate, dateColumn };
}
export function metricValues(db, input) {
  const args = [];
  const selects = metricDefinitions.map((definition) => {
    const spec = metricCondition(definition.id, input);
    args.push(...spec.args);
    return `(SELECT json_object('value', ${spec.aggregate}, 'records', COUNT(*))
      FROM ${spec.source} data WHERE ${spec.where}) AS ${definition.id}`;
  });
  const row = db.prepare(`${dataCte} SELECT ${selects.join(',')}`).get(...args);
  return metricDefinitions.map((definition) => {
    const result = JSON.parse(row[definition.id]);
    return {
      ...definition,
      ...result,
      value: result.value ?? (definition.id === 'cycle' ? null : 0),
      comparison: null,
      comparisonNote: 'Insufficient comparable history; no percentage change asserted.',
    };
  });
}
export function branchComparison(db, input) {
  const vehicleScope = scope(input);
  const args = [
    ...vehicleScope.args,
    input.from,
    input.to,
    ...vehicleScope.args,
    ...vehicleScope.args,
  ];
  const sql = `${dataCte}, inventory AS (
    SELECT branch_id, SUM(status = 'available') AS available FROM vehicle_data data
    WHERE ${vehicleScope.sql} GROUP BY branch_id
  ), work AS (
    SELECT branch_id, SUM(status = 'open') AS orders,
      SUM(CASE WHEN status = 'open' THEN outstanding ELSE 0 END) AS outstanding,
      SUM(CASE WHEN ${readyPredicate} THEN 1 ELSE 0 END) AS ready,
      SUM(status = 'delivered' AND delivered_at >= ? AND delivered_at < ?) AS delivered
    FROM order_data data WHERE ${vehicleScope.sql} GROUP BY branch_id
  ), demand AS (
    SELECT branch_id, COUNT(*) AS bookings FROM booking_data data
    WHERE status = 'confirmed' AND ${vehicleScope.sql} GROUP BY branch_id
  ) SELECT br.id, br.name, COALESCE(i.available,0) AS available, COALESCE(w.orders,0) AS orders,
    COALESCE(w.outstanding,0) AS outstanding, COALESCE(w.ready,0) AS ready,
    COALESCE(w.delivered,0) AS delivered, COALESCE(d.bookings,0) AS bookings
    FROM branches br LEFT JOIN inventory i ON i.branch_id = br.id
    LEFT JOIN work w ON w.branch_id = br.id LEFT JOIN demand d ON d.branch_id = br.id
    ${input.branch_id ? 'WHERE br.id = ?' : ''}
    ORDER BY ${['outstanding', 'available', 'ready'].includes(input.sort) ? input.sort + ' DESC' : 'br.name ASC'}, br.id
    LIMIT 100`;
  if (input.branch_id) args.push(input.branch_id);
  return db.prepare(sql).all(...args);
}
export function activity(db, input) {
  const scoped = scope(input);
  return db
    .prepare(
      `${dataCte}, events AS (
    SELECT 'booking-' || id AS event_id, 'Booking ' || status AS title,
      'Booking #' || id AS detail, updated_at AS happened_at, '/bookings/' || id AS href,
      branch_id, model_id FROM booking_data
    UNION ALL SELECT 'order-' || id, 'Order created', 'Order #' || id, created_at,
      '/orders/' || id, branch_id, model_id FROM order_data
    UNION ALL SELECT 'delivery-' || id, 'Vehicle delivered', vin, delivered_at,
      '/orders/' || id, branch_id, model_id FROM order_data WHERE delivered_at IS NOT NULL
    UNION ALL SELECT 'payment-' || id, 'Demo payment recorded', 'Payment #' || id, settled_at,
      '/orders/' || order_id || '/payments', branch_id, model_id FROM payment_data WHERE status = 'paid'
    UNION ALL SELECT 'document-' || d.id, 'Document ' || d.status, 'Order #' || d.order_id || ' · ' || d.type,
      d.reviewed_at, '/orders/' || d.order_id || '/documents', o.branch_id, o.model_id
      FROM documents d JOIN order_data o ON o.id = d.order_id WHERE reviewed_at IS NOT NULL
  ) SELECT * FROM events data WHERE ${scoped.sql} AND happened_at >= ? AND happened_at < ?
    ORDER BY happened_at DESC, event_id LIMIT 12`,
    )
    .all(...scoped.args, input.from, input.to);
}
export function summary(db, input) {
  return db.transaction(() => ({
    ...metadata(input),
    metrics: metricValues(db, input),
    branches: branchComparison(db, input),
    events: activity(db, input),
    activityNote:
      'Latest recorded entity milestones, not a complete audit trail. Period applies to this feed.',
    cohortNote: 'Booking conversion rate unavailable: cohort maturity rules are not defined.',
  }))();
}
