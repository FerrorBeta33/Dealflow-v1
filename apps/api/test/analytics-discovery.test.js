import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fixture } from './helpers.js';

await mkdir('.data', { recursive: true });
test('Command Center: stock distributions, model search/paging and record ages use complete scoped data', async (t) => {
  const { api, db } = await fixture(t);
  db.prepare("UPDATE vehicles SET created_at='2026-01-01T00:00:00.000Z' WHERE id=4").run();
  const stock = (await api('/analytics/stock?limit=2')).data;
  assert.equal(
    stock.distribution.reduce((sum, item) => sum + item.count, 0),
    30,
  );
  assert.equal(stock.models.items.length, 2);
  assert.equal(stock.models.total, 6);
  assert.ok(stock.age.aged45 >= 1);
  const scoped = (await api('/analytics/stock?branch_id=1&status=available')).data;
  assert.ok(scoped.distribution.every((item) => item.status === 'available'));
  assert.equal(
    scoped.distribution.reduce((sum, item) => sum + item.count, 0),
    db
      .prepare("SELECT COUNT(*) AS count FROM vehicles WHERE branch_id=1 AND status='available'")
      .get().count,
  );
  assert.ok(
    (await api('/analytics/exceptions?type=aging')).data.items.some(
      (item) => item.vehicle_id === 4,
    ),
  );
  assert.ok(
    (await api('/analytics/records?metric=aged45')).data.items.some((item) => item.id === 4),
  );
  assert.equal((await api('/analytics/stock?q=Nexon')).data.models.total, 1);
  assert.equal((await api('/analytics/stock?q=NotAModel')).data.models.total, 0);
});

test('Command Center: events respect independent timestamps, exclusive boundaries and IST buckets', async (t) => {
  const { api, db } = await fixture(t);
  db.prepare("UPDATE bookings SET created_at='2026-01-02T18:29:59.000Z' WHERE id=1").run();
  db.prepare("UPDATE orders SET created_at='2026-01-02T18:30:00.000Z' WHERE id=1").run();
  db.prepare(
    "UPDATE payment_requests SET settled_at='2026-01-03T18:30:00.000Z' WHERE status='paid'",
  ).run();
  const range = 'from=2026-01-02T18:30:00.000Z&to=2026-01-03T18:30:00.000Z';
  const summary = (await api(`/analytics/summary?${range}`)).data;
  const value = (id) => summary.metrics.find((item) => item.id === id).value;
  assert.equal(value('bookingsCreated'), 0);
  assert.equal(value('ordersCreated'), 1);
  assert.equal(value('collected'), 0);
  const trends = (await api(`/analytics/trends?${range}`)).data;
  assert.equal(trends.points.length, 1);
  assert.equal(trends.points[0].bucket, '2026-01-03');
  assert.equal(trends.points[0].orders, 1);
  assert.equal(trends.historyAvailable, false);
  assert.match(trends.note, /Insufficient history/);
  const rows = (await api(`/analytics/records?metric=ordersCreated&${range}`)).data;
  assert.equal(rows.total, value('ordersCreated'));
  assert.equal(rows.items[0].id, 1);
  const weekly = (await api(`/analytics/trends?bucket=week&${range}`)).data;
  assert.equal(weekly.points[0].bucket, '2025-12-29');
  assert.equal((await api('/analytics/journeys/1?branch_id=1')).status, 404);
});

test('Command Center: federated search is bounded, scoped, linked and exposes no credentials or document storage paths', async (t) => {
  const { api, db } = await fixture(t);
  const vin = db.prepare('SELECT vin FROM vehicles WHERE id=1').get().vin;
  const search = (await api(`/analytics/search?q=${vin}`)).data;
  assert.ok(search.items.some((item) => item.entity === 'vehicles' && item.href === '/vehicles/1'));
  assert.ok(search.items.length <= 20);
  assert.equal((await api('/analytics/search')).data.items.length, 0);
  assert.ok(
    (await api('/analytics/search?q=DF-')).data.items.some((item) => item.entity === 'orders'),
  );
  assert.ok(
    (await api('/analytics/search?q=Priya')).data.items.some((item) => item.entity === 'customers'),
  );
  const scoped = (await api(`/analytics/search?q=${vin}&branch_id=2`)).data;
  assert.equal(scoped.items.length, 0);
  const serialized = JSON.stringify(search);
  for (const forbidden of ['password_hash', 'token_hash', 'salt', 'storage_name'])
    assert.ok(!serialized.includes(forbidden));
  assert.ok(
    (await api('/analytics/summary')).data.events.every((event) => event.href.startsWith('/')),
  );
  assert.equal((await api('/dashboard')).status, 200);
});
