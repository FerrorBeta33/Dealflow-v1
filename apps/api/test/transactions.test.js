import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fixture, newOrder, documentForm } from './helpers.js';
await mkdir('.data', { recursive: true });
test('FR-06–09: competing reservations/conversions, cancellation, immutable backend pricing and invoice', async (t) => {
  const { api, db } = await fixture(t);
  const vehicle = (await api('/vehicles?status=available')).data.items[0];
  const attempts = await Promise.all(
    [1, 2].map(() =>
      api('/bookings', { method: 'POST', body: { customer_id: 1, vehicle_id: vehicle.id } }),
    ),
  );
  assert.deepEqual(attempts.map((result) => result.status).sort(), [201, 409]);
  const booking = attempts.find((result) => result.status === 201).data;
  assert.equal((await api(`/bookings/${booking.id}`)).data.status, 'confirmed');
  assert.equal(
    (
      await api(`/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        body: {
          vin: vehicle.vin,
          model_id: vehicle.model_id,
          branch_id: vehicle.branch_id,
          color: 'Black',
          status: 'available',
        },
      })
    ).status,
    409,
  );
  const converts = await Promise.all(
    [1, 2].map(() =>
      api(`/bookings/${booking.id}/convert`, {
        method: 'POST',
        body: { extras: 10000, tax: 20000 },
      }),
    ),
  );
  assert.deepEqual(converts.map((result) => result.status).sort(), [201, 409]);
  const order = converts.find((result) => result.status === 201).data;
  assert.equal(order.total, vehicle.base_price + 30000);
  assert.equal((await api(`/bookings/${booking.id}/cancel`, { method: 'POST' })).status, 409);
  await db
    .prepare('UPDATE vehicle_models SET base_price = base_price + 900000 WHERE id = ?')
    .run(vehicle.model_id);
  assert.equal((await api(`/orders/${order.id}`)).data.invoice.amount, order.total);
  const html = await api(`/orders/${order.id}/invoice`, { raw: true });
  assert.equal(html.status, 200);
  assert.match(html.data, /Sales invoice/);
  assert.match(html.data, /INR/);
  const second = (await api('/vehicles?status=available')).data.items[0];
  const cancelled = (
    await api('/bookings', { method: 'POST', body: { customer_id: 2, vehicle_id: second.id } })
  ).data;
  assert.equal(
    (
      await api(`/bookings/${cancelled.id}/convert`, {
        method: 'POST',
        body: { total: 1, extras: -1 },
      })
    ).status,
    400,
  );
  assert.equal((await api(`/bookings/${cancelled.id}/cancel`, { method: 'POST' })).status, 200);
  assert.equal((await api(`/vehicles/${second.id}`)).data.status, 'available');
  assert.equal((await api(`/bookings/${cancelled.id}/cancel`, { method: 'POST' })).status, 409);
  assert.equal(
    (await api(`/bookings/${cancelled.id}/convert`, { method: 'POST', body: {} })).status,
    409,
  );
});
test('FR-10–11: pending caps, cancellation, role restrictions, concurrent settlement and no duplicate payment', async (t) => {
  const { api, db } = await fixture(t);
  const { order } = await newOrder(api);
  const path = `/orders/${order.id}/payments`;
  assert.equal((await api(path, { method: 'POST', body: { amount: 0 } })).status, 400);
  assert.equal((await api(path, { method: 'POST', body: { amount: -10 } })).status, 400);
  assert.equal(
    (await api(path, { method: 'POST', body: { amount: order.total + 1 } })).status,
    409,
  );
  const pending = (await api(path, { method: 'POST', body: { amount: 1000 } })).data;
  assert.equal(
    (await api(`/payments/${pending.id}/cancel`, { method: 'POST', role: 'sales' })).status,
    200,
  );
  assert.equal((await api(`/payments/${pending.id}/settle`, { method: 'POST' })).status, 409);
  const attempts = await Promise.all(
    [1, 2].map(() => api(path, { method: 'POST', body: { amount: order.total } })),
  );
  assert.deepEqual(attempts.map((result) => result.status).sort(), [201, 409]);
  const payment = attempts.find((result) => result.status === 201).data;
  assert.equal(
    (await api(`/payments/${payment.id}/settle`, { method: 'POST', role: 'sales' })).status,
    403,
  );
  const settles = await Promise.all(
    [1, 2].map(() => api(`/payments/${payment.id}/settle`, { method: 'POST', role: 'manager' })),
  );
  assert.deepEqual(settles.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await api(`/payments/${payment.id}/cancel`, { method: 'POST' })).status, 409);
  assert.equal((await api(`/orders/${order.id}`)).data.outstanding, 0);
  assert.equal(
    (
      await db
        .prepare(
          "SELECT SUM(amount) AS total FROM payment_requests WHERE order_id = ? AND status = 'paid'",
        )
        .get(order.id)
    ).total,
    order.total,
  );
  assert.equal((await api(`${path}?status=paid`)).data.total, 1);
});
test('FR-12–14: complete document/delivery gates, file access, review and sold VIN invariant', async (t) => {
  const { api, db } = await fixture(t);
  const { order, vehicle } = await newOrder(api);
  const deliver = () => api(`/orders/${order.id}/deliver`, { method: 'POST', role: 'manager' });
  assert.equal((await deliver()).status, 409);
  const payment = (
    await api(`/orders/${order.id}/payments`, { method: 'POST', body: { amount: order.total } })
  ).data;
  await api(`/payments/${payment.id}/settle`, { method: 'POST' });
  assert.equal((await deliver()).status, 409);
  const docs = `/orders/${order.id}/documents`;
  assert.equal(
    (await api(docs, { method: 'POST', body: documentForm('identity', Buffer.from('fake')) }))
      .status,
    400,
  );
  assert.equal(
    (await api(docs, { method: 'POST', body: documentForm('identity', Buffer.alloc(4194305)) }))
      .status,
    413,
  );
  assert.equal(
    (await api(docs, { method: 'POST', role: 'inventory', body: documentForm() })).status,
    403,
  );
  const identity = (await api(docs, { method: 'POST', body: documentForm() })).data;
  assert.equal(identity.status, 'pending');
  assert.equal((await api(`/documents/${identity.id}/content`, { raw: true })).status, 200);
  assert.equal(
    (
      await api(`/documents/${identity.id}/review`, {
        method: 'PATCH',
        role: 'sales',
        body: { status: 'verified' },
      })
    ).status,
    403,
  );
  await api(`/documents/${identity.id}/review`, {
    method: 'PATCH',
    body: { status: 'rejected', note: 'Not legible' },
  });
  assert.equal((await deliver()).status, 409);
  const replacement = (await api(docs, { method: 'POST', body: documentForm() })).data;
  assert.equal(
    (
      await api(`/documents/${identity.id}/review`, {
        method: 'PATCH',
        body: { status: 'verified' },
      })
    ).status,
    409,
  );
  await api(`/documents/${replacement.id}/review`, {
    method: 'PATCH',
    body: { status: 'verified' },
  });
  const address = (await api(docs, { method: 'POST', body: documentForm('address') })).data;
  assert.equal((await deliver()).status, 409);
  await api(`/documents/${address.id}/review`, {
    method: 'PATCH',
    role: 'manager',
    body: { status: 'verified' },
  });
  assert.equal(
    (await api(`/orders/${order.id}/deliver`, { method: 'POST', role: 'sales' })).status,
    403,
  );
  assert.equal((await deliver()).status, 200);
  assert.equal(
    (await db.prepare('SELECT status FROM vehicles WHERE id = ?').get(vehicle.id)).status,
    'sold',
  );
  assert.equal((await deliver()).status, 409);
  assert.equal((await api(docs, { method: 'POST', body: documentForm('insurance') })).status, 409);
  assert.equal(
    (
      await api(`/documents/${address.id}/review`, {
        method: 'PATCH',
        body: { status: 'rejected' },
      })
    ).status,
    409,
  );
  assert.equal(
    (await api('/bookings', { method: 'POST', body: { customer_id: 2, vehicle_id: vehicle.id } }))
      .status,
    409,
  );
  assert.equal((await api(`${docs}?status=verified&type=address`)).data.total, 1);
});
