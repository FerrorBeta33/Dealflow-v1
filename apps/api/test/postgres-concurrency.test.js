import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fixture, documentForm, pdfBytes } from './helpers.js';
import { openDatabase } from '../db.js';
import {
  createBooking,
  convertBooking,
  requestPayment,
  transitionPayment,
  deliverOrder,
  balance,
} from '../lib/workflow.js';
import { uploadDocument } from '../lib/documents.js';

function oneWinner(results) {
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.equal(rejected.reason.status, 409);
  return results.find((result) => result.status === 'fulfilled').value;
}

test('independent PostgreSQL pools serialize VIN, conversion, money and document/delivery races', async (t) => {
  const { db, api, root } = await fixture(t);
  const other = await openDatabase({ schema: db.schema });
  t.after(() => other.close());
  const firstPid = (await db.query('SELECT pg_backend_pid() AS id')).rows[0].id;
  assert.notEqual((await other.query('SELECT pg_backend_pid() AS id')).rows[0].id, firstPid);
  const employee = { id: 1, role: 'admin' };
  const booking = oneWinner(
    await Promise.allSettled([
      createBooking(db, { customer_id: 1, vehicle_id: 4 }, employee),
      createBooking(other, { customer_id: 2, vehicle_id: 4 }, employee),
    ]),
  );
  const order = oneWinner(
    await Promise.allSettled([
      convertBooking(db, booking.id, { extras: 0, tax: 0 }),
      convertBooking(other, booking.id, { extras: 0, tax: 0 }),
    ]),
  );
  const amount = Math.floor(order.total * 0.75);
  const payment = oneWinner(
    await Promise.allSettled([
      requestPayment(db, order.id, { amount, note: 'Fictional race test' }, employee),
      requestPayment(other, order.id, { amount, note: 'Fictional race test' }, employee),
    ]),
  );
  oneWinner(
    await Promise.allSettled([
      transitionPayment(db, payment.id, 'paid', employee),
      transitionPayment(other, payment.id, 'paid', employee),
    ]),
  );
  const remaining = await balance(db, order);
  assert.equal(remaining.paid, amount);
  const finalPayment = await requestPayment(
    db,
    order.id,
    { amount: remaining.outstanding, note: '' },
    employee,
  );
  await transitionPayment(db, finalPayment.id, 'paid', employee);
  for (const type of ['identity', 'address']) {
    const uploaded = await api(`/orders/${order.id}/documents`, {
      method: 'POST',
      body: documentForm(type),
    });
    assert.equal(uploaded.status, 201);
    assert.equal(
      (
        await api(`/documents/${uploaded.data.id}/review`, {
          method: 'PATCH',
          body: { status: 'verified', note: '' },
        })
      ).status,
      200,
    );
  }
  oneWinner(
    await Promise.allSettled([
      deliverOrder(db, order.id, employee),
      uploadDocument(
        other,
        resolve(root, 'uploads'),
        order.id,
        'identity',
        {
          originalname: 'fictional-replacement.pdf',
          mimetype: 'application/pdf',
          size: pdfBytes.length,
          buffer: pdfBytes,
        },
        employee,
      ),
    ]),
  );
  const finalOrder = await db.prepare('SELECT status FROM orders WHERE id=?').get(order.id);
  const vehicle = await db.prepare('SELECT status FROM vehicles WHERE id=4').get();
  const identity = await db
    .prepare(
      "SELECT status FROM documents WHERE order_id=? AND type='identity' ORDER BY id DESC LIMIT 1",
    )
    .get(order.id);
  if (finalOrder.status === 'delivered') {
    assert.equal(vehicle.status, 'sold');
    assert.equal(identity.status, 'verified');
  } else {
    assert.equal(vehicle.status, 'reserved');
    assert.equal(identity.status, 'pending');
  }
});
