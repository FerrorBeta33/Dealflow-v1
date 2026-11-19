import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { temporaryDatabase } from './postgres.js';
import { seed } from '../seed.js';
import { createApp } from '../server.js';
export async function fixture(t) {
  const root = await mkdtemp(resolve('.data/test-'));
  const db = await temporaryDatabase(t);
  const password = randomBytes(20).toString('hex');
  await seed(db, password);
  const server = createApp(db, resolve(root, 'uploads')).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api`;
  const tokens = {};
  /** @param {string} path @param {{role?: string, method?: string, body?: unknown, token?: string, raw?: boolean}} options */
  const api = async (
    path,
    { role = 'admin', method = 'GET', body, token = undefined, raw = false } = {},
  ) => {
    const authorization = token ?? tokens[role];
    const headers = authorization ? { Authorization: `Bearer ${authorization}` } : {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(url + path, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    const data = raw ? await response.text() : await response.json();
    return { status: response.status, data, headers: response.headers };
  };
  for (const role of ['admin', 'sales', 'inventory', 'manager']) {
    tokens[role] = (
      await api('/auth/login', {
        method: 'POST',
        body: { email: `${role}@dealerflow.demo`, password },
      })
    ).data.token;
  }
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    await rm(root, { recursive: true, force: true });
  });
  return { db, api, tokens, password, root, url };
}
export const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF');
export function documentForm(
  type = 'identity',
  bytes = pdfBytes,
  mime = 'application/pdf',
  filename = 'fictional-id.pdf',
) {
  const form = new FormData();
  form.set('type', type);
  form.set('file', new Blob([bytes], { type: mime }), filename);
  return form;
}
export async function newOrder(api) {
  const available = (await api('/vehicles?status=available')).data.items[0];
  const booking = await api('/bookings', {
    method: 'POST',
    body: { vehicle_id: available.id, customer_id: 1 },
  });
  const order = await api(`/bookings/${booking.data.id}/convert`, {
    method: 'POST',
    body: { extras: 10000, tax: 20000 },
  });
  return { order: order.data, booking: booking.data, vehicle: available };
}
