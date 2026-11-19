import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fixture } from './helpers.js';
import { seed } from '../seed.js';
import { hashPassword } from '../lib/auth.js';
await mkdir('.data', { recursive: true });
test('FR-01: short-domain employee login validates credentials and rejects malformed identifiers', async (t) => {
  const { api, db, password } = await fixture(t);
  const hashed = hashPassword(password);
  await db
    .prepare(
      `INSERT INTO employees (name, email, role, salt, password_hash)
    VALUES (?, ?, ?, ?, ?)`,
    )
    .run('Demo Admin', 'admin@demo', 'admin', hashed.salt, hashed.password_hash);
  const result = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo', password },
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.employee.role, 'admin');
  assert.equal((await api('/auth/me', { token: result.data.token })).data.email, 'admin@demo');
  for (const email of ['missing-at', '@demo', 'admin@', 'admin@@demo', 'admin @demo']) {
    assert.equal(
      (
        await api('/auth/login', {
          method: 'POST',
          body: { email, password },
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await api('/auth/login', {
        method: 'POST',
        body: { email: 'admin@demo', password: 'incorrect' },
      })
    ).status,
    401,
  );
});
test('FR-01: login, hashed sessions, expiry, role denial, logout and unauthenticated APIs', async (t) => {
  const { api, db, tokens } = await fixture(t);
  assert.equal(
    (
      await api('/auth/login', {
        method: 'POST',
        body: { email: 'admin@dealerflow.demo', password: 'wrong' },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await api('/auth/login', {
        method: 'POST',
        body: { email: 'nobody@example.com', password: 'wrong' },
      })
    ).status,
    401,
  );
  assert.equal((await api('/auth/me')).data.role, 'admin');
  const stored = await db.prepare('SELECT * FROM sessions LIMIT 1').get();
  assert.notEqual(stored.token_hash, tokens.admin);
  assert.ok(stored.expires_at > Date.now() + 9 * 60 * 60 * 1000);
  for (const path of [
    '/dashboard',
    '/models',
    '/vehicles',
    '/customers',
    '/bookings',
    '/orders',
    '/branches',
    '/orders/1/invoice',
    '/orders/1/documents',
    '/documents/1/content',
  ]) {
    assert.equal((await api(path, { token: '' })).status, 401, path);
  }
  assert.equal(
    (
      await api('/customers', {
        role: 'inventory',
        method: 'POST',
        body: { name: 'Test', phone: '9876543210' },
      })
    ).status,
    403,
  );
  assert.equal((await api('/auth/logout', { method: 'POST' })).status, 200);
  assert.equal((await api('/auth/me')).status, 401);
  await db.prepare('UPDATE sessions SET expires_at = 0').run();
  assert.equal((await api('/auth/me', { role: 'sales' })).status, 401);
});
test('FR-03–05: catalog, stock and customer create/view/search/filter/edit persist with validation', async (t) => {
  const { api, db } = await fixture(t);
  const modelInput = {
    brand: 'Tata',
    name: 'Curvv',
    variant: 'Accomplished',
    fuel: 'Petrol',
    transmission: 'Automatic',
    base_price: 180000000,
  };
  assert.equal(
    (await api('/models', { method: 'POST', body: { ...modelInput, base_price: 0 } })).status,
    400,
  );
  assert.equal(
    (await api('/models', { method: 'POST', body: modelInput, role: 'sales' })).status,
    403,
  );
  const model = (await api('/models', { method: 'POST', body: modelInput, role: 'inventory' }))
    .data;
  assert.equal((await api(`/models/${model.id}`)).data.name, 'Curvv');
  assert.equal(
    (
      await api(`/models/${model.id}`, {
        method: 'PATCH',
        body: { ...modelInput, base_price: 190000000 },
      })
    ).status,
    200,
  );
  assert.equal(
    (await db.prepare('SELECT base_price FROM vehicle_models WHERE id = ?').get(model.id))
      .base_price,
    190000000,
  );
  const stock = {
    vin: 'MAT12345678901234',
    model_id: model.id,
    branch_id: 1,
    color: 'Ocean Blue',
    status: 'in_transit',
  };
  const created = await api('/vehicles', { method: 'POST', body: stock });
  assert.equal(created.status, 201);
  assert.equal((await api('/vehicles', { method: 'POST', body: stock })).status, 409);
  assert.equal(
    (
      await api(`/vehicles/${created.data.id}`, {
        method: 'PATCH',
        body: { ...stock, status: 'available', color: 'White' },
      })
    ).status,
    200,
  );
  assert.equal((await api(`/vehicles/${created.data.id}`)).data.color, 'White');
  assert.equal(
    (
      await api(
        '/vehicles?status=available&brand=Tata&fuel=Petrol&transmission=Automatic&sort=price',
      )
    ).status,
    200,
  );
  assert.equal((await api('/vehicles?page=0')).status, 400);
  assert.equal((await api('/vehicles?limit=10000')).status, 400);
  assert.equal((await api('/vehicles?q=NO-MATCH')).data.total, 0);
  const customerInput = {
    name: 'Kavya Rao',
    phone: '9876543210',
    email: 'kavya@example.com',
    address: 'Pune',
  };
  assert.equal(
    (await api('/customers', { method: 'POST', body: { ...customerInput, phone: 'abc' } })).status,
    400,
  );
  assert.equal(
    (await api('/customers', { method: 'POST', body: { ...customerInput, email: 'invalid' } }))
      .status,
    400,
  );
  const customer = (await api('/customers', { method: 'POST', body: customerInput, role: 'sales' }))
    .data;
  await api(`/customers/${customer.id}`, {
    method: 'PATCH',
    body: { ...customerInput, name: 'Kavya Shah' },
  });
  assert.equal((await api(`/customers/${customer.id}`)).data.name, 'Kavya Shah');
  assert.equal((await api('/customers?q=Kavya&sort=name')).data.total, 1);
  assert.equal(
    (await api('/models?brand=Tata')).data.items.every((item) => item.brand === 'Tata'),
    true,
  );
  assert.equal((await api('/models/99999')).status, 404);
});
test('FR-02/FR-15: seed is non-destructive, dashboard is database-derived and lists are bounded', async (t) => {
  const { api, db, password } = await fixture(t);
  const before = (await db.prepare('SELECT COUNT(*) AS count FROM bookings').get()).count;
  assert.equal(await seed(db, password), false);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM bookings').get()).count, before);
  const dashboard = (await api('/dashboard')).data;
  assert.equal(
    dashboard.metrics.available,
    (await db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE status = 'available'").get())
      .count,
  );
  assert.equal(dashboard.metrics.received, 5000000);
  assert.ok(dashboard.events.length > 0);
  assert.equal(
    dashboard.stock.reduce((total, item) => total + item.count, 0),
    30,
  );
  assert.equal((await api('/vehicles')).data.items.length, 20);
  assert.equal((await api('/branches')).data.items.length, 3);
  for (const entity of ['bookings', 'orders'])
    assert.equal((await api(`/${entity}?customer_id=1&sort=oldest`)).status, 200);
});
