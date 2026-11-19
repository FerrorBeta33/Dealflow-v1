import { dataCte, scope, metadata } from './analytics-query.js';
export async function trends(db, input) {
  const scoped = scope(input);
  const bucket =
    input.bucket === 'week'
      ? "to_char(date_trunc('week', happened_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD')"
      : "to_char(happened_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')";
  const sql = `${dataCte}, pulse AS (
    SELECT created_at AS happened_at, branch_id, model_id, 'bookings' AS kind, 0 AS amount FROM booking_data
    UNION ALL SELECT created_at, branch_id, model_id, 'orders', 0 FROM order_data
    UNION ALL SELECT settled_at, branch_id, model_id, 'payments', amount FROM payment_data WHERE status = 'paid'
    UNION ALL SELECT delivered_at, branch_id, model_id, 'deliveries', 0 FROM order_data WHERE status = 'delivered'
  ) SELECT ${bucket} AS bucket,
    SUM(CASE WHEN kind = 'bookings' THEN 1 ELSE 0 END) AS bookings, SUM(CASE WHEN kind = 'orders' THEN 1 ELSE 0 END) AS orders,
    SUM(CASE WHEN kind = 'payments' THEN 1 ELSE 0 END) AS settlements, SUM(CASE WHEN kind = 'deliveries' THEN 1 ELSE 0 END) AS deliveries,
    SUM(CASE WHEN kind = 'payments' THEN amount ELSE 0 END) AS payments,
    MIN(happened_at) AS first_event, MAX(happened_at) AS last_event
    FROM pulse data WHERE ${scoped.sql} AND happened_at >= ? AND happened_at < ?
    GROUP BY bucket ORDER BY bucket LIMIT 367`;
  const points = await db.prepare(sql).all(...scoped.args, input.from, input.to);
  return {
    ...metadata(input),
    isHistorical: true,
    historyAvailable: points.length > 1,
    bucket: input.bucket,
    points,
    note:
      points.length > 1
        ? 'Recorded events only; gaps have no stored events. Not a forecast or proof of continuous history.'
        : 'Insufficient history for a trend or comparison. Recorded events are shown without invented prior periods.',
    series: {
      bookings: 'Booking creation date, all current booking states',
      orders: 'Order creation date',
      payments: 'Paid settlement date, integer paise',
      deliveries: 'Delivery timestamp',
    },
  };
}
