import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fixture, newOrder, documentForm } from './helpers.js';
await mkdir('.data', { recursive: true });
const metric = (data, id) => data.metrics.find((item) => item.id === id);
test('Command Center: all read APIs require auth, preserve read policies and reject invalid input', async (t) => {
  const { api } = await fixture(t);
  for (const path of [
    'summary',
    'stock',
    'exceptions',
    'trends',
    'records',
    'search?q=Tata',
    'journeys/1',
  ]) {
    assert.equal((await api(`/analytics/${path}`, { token: '' })).status, 401);
    for (const role of ['admin', 'manager', 'sales', 'inventory'])
      assert.equal((await api(`/analytics/${path}`, { role })).status, 200, `${path}:${role}`);
  }
  for (const query of [
    'limit=1000',
    'page=-1',
    'role=admin',
    'branch_id=oops',
    'metric=bogus',
    'type=urgent',
    'from=bad&to=bad',
    'from=2026-01-01T00:00:00.000Z',
    'from=2026-02-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z',
    'from=2020-01-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z',
  ]) {
    assert.equal((await api(`/analytics/summary?${query}`)).status, 400, query);
  }
  assert.equal((await api('/analytics/journeys/999999')).status, 404);
  assert.equal((await api('/analytics/journeys/not-an-id')).status, 400);
  assert.equal(
    (await api('/payments/1/settle', { role: 'inventory', method: 'POST' })).status,
    403,
  );
});
test('Command Center: aggregates reconcile, snapshot ignores period, and drilldowns include every page', async (t) => {
  const { api, db } = await fixture(t);
  const summary = (await api('/analytics/summary')).data;
  assert.equal(summary.calculationVersion, 'dealerflow.cc.1');
  assert.equal(
    metric(summary, 'available').value,
    (await db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status='available'").get())
      .count,
  );
  const old = (
    await api('/analytics/summary?from=2020-01-01T00:00:00.000Z&to=2020-01-02T00:00:00.000Z')
  ).data;
  assert.equal(metric(old, 'available').value, metric(summary, 'available').value);
  assert.equal(metric(old, 'openOrders').value, metric(summary, 'openOrders').value);
  assert.equal(metric(old, 'collected').value, 0);
  assert.equal(metric(old, 'invoiced').value, 0);
  const records = (await api('/analytics/records?metric=available&limit=2')).data;
  assert.equal(records.items.length, 2);
  assert.equal(records.total, metric(summary, 'available').value);
  assert.ok(records.total > records.items.length);
  assert.ok(records.items.every((item) => item.href === `/vehicles/${item.id}`));
  for (const branch of summary.branches) {
    const scoped = (await api(`/analytics/summary?branch_id=${branch.id}`)).data;
    assert.equal(metric(scoped, 'available').value, branch.available);
    assert.equal(metric(scoped, 'outstanding').value, branch.outstanding);
    assert.equal(metric(scoped, 'activeBookings').value, branch.bookings);
    assert.equal(metric(scoped, 'ready').value, branch.ready);
  }
  const scoped = (await api('/analytics/records?metric=available&branch_id=1&model_id=1')).data;
  assert.ok(scoped.items.every((item) => item.branch_id === 1 && item.model_id === 1));
  assert.equal((await api('/analytics/records?metric=available&branch_id=9999')).data.total, 0);
  const before = (await db.prepare('SELECT COUNT(*) AS count FROM orders').get()).count;
  await api('/analytics/search?q=%27%20OR%201%3D1--');
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM orders').get()).count, before);
});
test('Command Center: pending money, combined/document blockers, verified duplicates and delivery reconcile', async (t) => {
  const { api, db } = await fixture(t);
  const { order, vehicle } = await newOrder(api);
  const before = (await api('/analytics/summary')).data;
  const payment = await api(`/orders/${order.id}/payments`, {
    method: 'POST',
    body: { amount: order.total },
  });
  const pending = (await api('/analytics/summary')).data;
  assert.equal(metric(pending, 'outstanding').value, metric(before, 'outstanding').value);
  assert.ok(
    (await api('/analytics/exceptions?type=combined')).data.items.some(
      (item) => item.order_id === order.id,
    ),
  );
  assert.ok(
    (await api('/analytics/exceptions?type=pending')).data.items.some(
      (item) => item.order_id === order.id,
    ),
  );
  assert.equal((await api(`/orders/${order.id}/deliver`, { method: 'POST' })).status, 409);
  await api(`/payments/${payment.data.id}/settle`, { method: 'POST', role: 'manager' });
  const paid = (await api('/analytics/summary')).data;
  assert.equal(
    metric(paid, 'outstanding').value,
    metric(before, 'outstanding').value - order.total,
  );
  assert.equal(metric(paid, 'collected').value, metric(before, 'collected').value + order.total);
  assert.ok(
    (await api('/analytics/exceptions?type=documents')).data.items.some(
      (item) => item.order_id === order.id,
    ),
  );
  for (const type of ['identity', 'identity', 'address']) {
    const document = await api(`/orders/${order.id}/documents`, {
      method: 'POST',
      body: documentForm(type),
    });
    await api(`/documents/${document.data.id}/review`, {
      method: 'PATCH',
      body: { status: 'verified', note: '' },
    });
  }
  const ready = (await api('/analytics/summary')).data;
  assert.equal(metric(ready, 'ready').value, metric(before, 'ready').value + 1);
  assert.equal(
    metric(ready, 'collected').value,
    metric(paid, 'collected').value,
    'documents cannot multiply payments',
  );
  const drawer = (await api(`/analytics/journeys/${order.id}`)).data;
  assert.equal(drawer.ready, true);
  assert.equal(drawer.order.vehicle_id, vehicle.id);
  assert.equal(drawer.order.readiness.outstanding, 0);
  assert.equal(drawer.paymentStates.find((item) => item.status === 'paid').amount, order.total);
  assert.equal((await api(`/orders/${order.id}/deliver`, { method: 'POST' })).status, 200);
  const after = (await api('/analytics/summary')).data;
  assert.equal(metric(after, 'openOrders').value, metric(before, 'openOrders').value - 1);
  assert.equal(metric(after, 'ready').value, metric(before, 'ready').value);
  assert.equal(
    (await db.prepare('SELECT status FROM vehicles WHERE id=?').get(vehicle.id)).status,
    'sold',
  );
  assert.ok(
    !(await api('/analytics/exceptions')).data.items.some((item) => item.order_id === order.id),
  );
});
