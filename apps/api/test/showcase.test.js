import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase } from '../db.js';
import { seedShowcase } from '../showcase-data.js';
import { parseAnalytics } from '../lib/analytics-query.js';
import { summary } from '../lib/analytics-metrics.js';
import { trends } from '../lib/analytics-trends.js';

test('fictional showcase has real ready/blocked/delivered workflows and coherent persisted history', async (t) => {
  await mkdir('.data', { recursive: true });
  const root = await mkdtemp(resolve('.data/showcase-test-'));
  const db = openDatabase(resolve(root, 'fixture.sqlite'));
  t.after(async () => {
    db.close();
    await rm(root, { recursive: true, force: true });
  });
  const now = new Date('2026-11-19T12:00:00.000Z');
  const result = seedShowcase(db, resolve(root, 'uploads'), randomBytes(20).toString('hex'), now);
  assert.equal(result.fictional, true);
  assert.equal(result.vehicles, 90);
  assert.equal(result.orders, 20);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status='sold'").get().count,
    3,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status='delivered'").get().count,
    3,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE status='cancelled'").get().count,
    3,
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  assert.equal(
    db
      .prepare(
        'SELECT COUNT(*) AS count FROM invoices i JOIN orders o ON o.id=i.order_id WHERE i.amount!=o.total',
      )
      .get().count,
    0,
  );
  const input = {
    ...parseAnalytics({ from: '2026-10-20T00:00:00.000Z', to: '2026-11-20T00:00:00.000Z' }),
    asOf: now.toISOString(),
  };
  const overview = summary(db, input);
  const metrics = Object.fromEntries(overview.metrics.map((metric) => [metric.id, metric.value]));
  assert.equal(metrics.ready, 3);
  assert.equal(metrics.activeBookings, 4);
  assert.equal(metrics.available, 54);
  assert.ok(metrics.aged45 > 0);
  assert.ok(metrics.outstanding > 0);
  assert.ok(metrics.collected > 0);
  const history = trends(db, input);
  assert.ok(history.points.length > 1);
  assert.equal(
    history.points.reduce((sum, point) => sum + point.payments, 0),
    metrics.collected,
  );
  const file = db.prepare('SELECT storage_name FROM documents LIMIT 1').get();
  const pdf = await readFile(resolve(root, 'uploads', file.storage_name));
  assert.ok(pdf.toString().startsWith('%PDF-'));
  assert.ok(pdf.toString().includes('FICTIONAL DEMO ONLY'));
  const before = db.prepare('SELECT COUNT(*) AS count FROM vehicles').get().count;
  assert.throws(() => seedShowcase(db, resolve(root, 'uploads'), 'unused'), /never replaces/);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM vehicles').get().count, before);
});
