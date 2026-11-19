import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.js';
test('VIN lineage is scoped, read-only and authenticated for all existing employee roles', async (t) => {
  const { api, db } = await fixture(t);
  const before = db.prepare('SELECT total_changes() AS count').get().count;
  assert.equal((await api('/analytics/vins/1', { token: '' })).status, 401);
  for (const role of ['admin', 'manager', 'sales', 'inventory']) {
    const response = await api('/analytics/vins/2', { role });
    assert.equal(response.status, 200);
    assert.equal(response.data.vehicle.id, 2);
    assert.equal(response.data.booking.order_id, 1);
  }
  assert.equal((await api('/analytics/vins/4')).data.booking, null);
  assert.equal((await api('/analytics/vins/1?branch_id=2')).status, 404);
  assert.equal((await api('/analytics/vins/1?model_id=2')).status, 404);
  assert.equal((await api('/analytics/vins/99999')).status, 404);
  assert.equal((await api('/analytics/vins/not-an-id')).status, 400);
  assert.equal((await api('/analytics/vins/1?unknown=true')).status, 400);
  const stock = await api('/analytics/records?metric=stock&status=reserved&branch_id=2');
  assert.equal(stock.status, 200);
  assert.equal(
    stock.data.total,
    db
      .prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status='reserved' AND branch_id=2")
      .get().count,
  );
  assert.ok(stock.data.items.every((item) => item.status === 'reserved' && item.branch_id === 2));
  const paged = await api('/analytics/records?metric=stock&limit=2&page=999');
  assert.equal(paged.data.page, paged.data.pages);
  assert.ok(paged.data.items.length <= 2);
  assert.equal(db.prepare('SELECT total_changes() AS count').get().count, before);
});
