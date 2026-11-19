import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fixture } from './helpers.js';
test('deployment health is public, read-only and does not relax business API authentication', async (t) => {
  await mkdir('.data', { recursive: true });
  const { url, db, api } = await fixture(t);
  const before = (await db.fingerprint()).count;
  const health = new URL('/health', url);
  const response = await fetch(health);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal((await fetch(health, { method: 'POST' })).status, 404);
  assert.equal((await api('/vehicles', { token: '' })).status, 401);
  assert.equal((await db.fingerprint()).count, before);
});
