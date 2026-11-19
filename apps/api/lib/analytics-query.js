import { z } from 'zod';
import {
  metricDefinitions,
  exceptionTypes,
  calculationVersion,
} from '../../../shared/command-center.js';
import { vehicleStatuses } from '../../../shared/domain.js';
const positiveId = z.coerce.number().int().positive().safe();
export const analyticsQuery = z
  .object({
    branch_id: positiveId.optional(),
    model_id: positiveId.optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    bucket: z.enum(['day', 'week']).default('day'),
    page: positiveId.max(100000).default(1),
    limit: positiveId.max(50).default(12),
    metric: z.enum(metricDefinitions.map((metric) => metric.id)).default('available'),
    type: z.enum(exceptionTypes).default('all'),
    status: z.enum(vehicleStatuses).optional(),
    q: z.string().trim().max(100).default(''),
    sort: z
      .enum(['priority', 'outstanding', 'available', 'ready', 'name', 'age'])
      .default('priority'),
  })
  .strict()
  .superRefine((input, context) => {
    if (Boolean(input.from) !== Boolean(input.to))
      context.addIssue({ code: 'custom', message: 'Provide both from and to', path: ['from'] });
    if (input.from && input.to) {
      const duration = Date.parse(input.to) - Date.parse(input.from);
      if (duration <= 0 || duration > 366 * 86400000)
        context.addIssue({
          code: 'custom',
          message: 'Choose a period between 1ms and 366 days',
          path: ['to'],
        });
    }
  });
export function parseAnalytics(query) {
  const input = analyticsQuery.parse(query);
  const asOf = new Date().toISOString();
  return {
    ...input,
    asOf,
    from: input.from
      ? new Date(input.from).toISOString()
      : new Date(Date.parse(asOf) - 30 * 86400000).toISOString(),
    to: input.to ? new Date(input.to).toISOString() : asOf,
  };
}
export function scope(input, alias = 'data') {
  const clauses = ['1=1'];
  const args = [];
  if (input.branch_id) {
    clauses.push(`${alias}.branch_id = ?`);
    args.push(input.branch_id);
  }
  if (input.model_id) {
    clauses.push(`${alias}.model_id = ?`);
    args.push(input.model_id);
  }
  return { sql: clauses.join(' AND '), args };
}
export function metadata(input) {
  return {
    asOf: input.asOf,
    calculationVersion,
    units: 'Amounts are integer paise; dates use UTC with Asia/Kolkata day buckets',
    filters: {
      branch_id: input.branch_id ?? null,
      model_id: input.model_id ?? null,
      from: input.from,
      to: input.to,
    },
    isHistorical: false,
    historyAvailable: false,
    exclusions:
      'Current stock/open work ignore period. No physical received date or inventory snapshots. No conversion cohort rule.',
  };
}
export async function paginated(db, sql, args, input) {
  return await db.transaction(async () => {
    const total = (await db.prepare(`SELECT COUNT(*) AS count FROM (${sql})`).get(...args)).count;
    const pages = Math.max(1, Math.ceil(total / input.limit));
    const page = Math.min(input.page, pages);
    const items = await db
      .prepare(`${sql} LIMIT ? OFFSET ?`)
      .all(...args, input.limit, (page - 1) * input.limit);
    return { items, total, page, pages, limit: input.limit };
  })();
}
export const dataCte = `WITH
  settlements AS (
    SELECT order_id, SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending
    FROM payment_requests GROUP BY order_id
  ), verification AS (
    SELECT order_id,
      MAX(CASE WHEN type = 'identity' AND status = 'verified' THEN 1 ELSE 0 END) AS identity,
      MAX(CASE WHEN type = 'address' AND status = 'verified' THEN 1 ELSE 0 END) AS address
    FROM documents GROUP BY order_id
  ), vehicle_data AS (
    SELECT v.*, m.brand, m.name, m.variant, m.base_price, m.fuel, m.transmission,
      m.brand || ' ' || m.name || ' · ' || m.variant AS label, br.name AS branch
    FROM vehicles v JOIN vehicle_models m ON m.id = v.model_id JOIN branches br ON br.id = v.branch_id
  ), booking_data AS (
    SELECT b.*, v.vin, v.model_id, v.branch_id, v.branch, v.label, c.name AS customer,
      o.id AS order_id FROM bookings b JOIN vehicle_data v ON v.id = b.vehicle_id
    JOIN customers c ON c.id = b.customer_id LEFT JOIN orders o ON o.booking_id = b.id
  ), order_data AS (
    SELECT o.*, b.vehicle_id, b.customer_id, b.employee_id, b.created_at AS booking_at,
      b.branch_id, b.model_id, b.vin, b.label, b.branch, b.customer,
      v.status AS vehicle_status, v.color, v.brand, v.name, v.variant,
      i.reference AS invoice_reference, i.amount AS invoice_amount,
      COALESCE(s.paid,0) AS paid, COALESCE(s.pending,0) AS pending,
      GREATEST(o.total - COALESCE(s.paid,0),0) AS outstanding,
      COALESCE(d.identity,0) AS identity, COALESCE(d.address,0) AS address
    FROM orders o JOIN booking_data b ON b.id = o.booking_id
    JOIN vehicle_data v ON v.id = b.vehicle_id
    JOIN invoices i ON i.order_id = o.id
    LEFT JOIN settlements s ON s.order_id = o.id LEFT JOIN verification d ON d.order_id = o.id
  ), payment_data AS (
    SELECT p.*, o.vehicle_id, o.customer, o.vin, o.label, o.branch_id, o.model_id, o.branch,
      o.invoice_reference FROM payment_requests p JOIN order_data o ON o.id = p.order_id
  )`;
export const readyPredicate =
  "status = 'open' AND vehicle_status = 'reserved' AND outstanding = 0 AND identity = 1 AND address = 1";
export const missingDocuments = '(identity = 0 OR address = 0)';
export const likeTerm = (value) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
