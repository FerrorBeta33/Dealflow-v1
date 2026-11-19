import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openDatabase } from '../db.js';
import { createApp } from '../server.js';

test('deployment serves SPA routes, assets and health without exposing API or local files', async (t) => {
  await mkdir('.data', { recursive: true });
  const root = await mkdtemp(resolve('.data/deployment-'));
  const db = openDatabase(':memory:');
  const webRoot = resolve(root, 'web');
  await mkdir(webRoot);
  await writeFile(resolve(webRoot, 'index.html'), '<html><body>DealerFlow</body></html>');
  await writeFile(resolve(webRoot, 'app.js'), 'console.info("DealerFlow");');
  await writeFile(resolve(webRoot, '.env'), 'PRIVATE_TEST_VALUE=hidden');
  const server = createApp(db, resolve(root, 'uploads'), webRoot).listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
    db.close();
    await rm(root, { recursive: true, force: true });
  });
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${url}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  for (const path of ['/', '/vehicles', '/orders/123']) {
    const response = await fetch(`${url}${path}`, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /DealerFlow/);
  }
  const asset = await fetch(`${url}/app.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  const missingApi = await fetch(`${url}/api/not-a-route`);
  assert.equal(missingApi.status, 401);
  assert.match(missingApi.headers.get('content-type'), /json/);
  const protectedApi = await fetch(`${url}/api/vehicles`);
  assert.equal(protectedApi.status, 401);
  for (const path of ['/missing.js', '/.env']) {
    assert.equal((await fetch(`${url}${path}`)).status, 404);
  }
  assert.equal(
    (await fetch(`${url}/orders`, { headers: { Accept: 'application/json' } })).status,
    404,
  );
  assert.equal((await fetch(`${url}/orders`, { method: 'POST' })).status, 404);
});
