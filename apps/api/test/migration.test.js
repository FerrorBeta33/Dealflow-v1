import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtemp, rm, readFile, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { legacyFixture } from './legacy-fixture.js';
import { temporaryDatabase } from './postgres.js';
import { migrateSQLite } from '../lib/sqlite-migration.js';
import { authenticate, login } from '../lib/auth.js';
import { insert } from '../lib/errors.js';
import { seed } from '../seed.js';
import { tableNames } from '../db.js';

async function migrationFixture(t) {
  const root = await mkdtemp(resolve('.data/migration-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacy = legacyFixture(root);
  const db = await temporaryDatabase(t);
  return {
    ...legacy,
    db,
    root,
    migrate: () => migrateSQLite(db, legacy.filename, resolve(root, 'backups')),
  };
}

test('migration preserves every table, hashes, sessions, amounts, timestamps, files and sparse IDs across batches', async (t) => {
  const context = await migrationFixture(t);
  const { db, filename, root } = context;
  const source = new Database(filename);
  source.transaction(() => {
    const statement = source.prepare('INSERT INTO customers(id,name,phone) VALUES (?,?,?)');
    for (let index = 0; index < 501; index++)
      statement.run(1000 + index, 'Fictional Archive Customer', '9876543210');
  })();
  source.close();
  const original = await readFile(filename);
  const report = await context.migrate();
  assert.equal(report.migrated, true);
  assert.equal(report.financialChecks, 'passed');
  assert.equal(report.tables.customers.count, 502);
  assert.equal(Object.keys(report.tables).length, 11);
  for (const table of tableNames) {
    assert.equal(
      (await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).count,
      report.tables[table].count,
    );
    assert.match(report.tables[table].sha256, /^[a-f0-9]{64}$/);
  }
  assert.equal((await stat(report.backup)).mode & 0o777, 0o600);
  assert.equal(original.equals(await readFile(filename)), true);
  const account = await db.prepare('SELECT salt,password_hash FROM employees WHERE id=41').get();
  assert.deepEqual(account, context.passwordRecord);
  assert.equal(
    (await db.prepare('SELECT expires_at FROM sessions').get()).expires_at,
    context.expires,
  );
  const request = { headers: { authorization: `Bearer ${context.token}` } };
  await authenticate(db)(request, {}, (error) => {
    if (error) throw error;
  });
  assert.equal(request.employee.id, 41);
  assert.equal(
    (await login(db, { email: 'migration@example.com', password: context.password })).employee.id,
    41,
  );
  assert.equal(await seed(db, 'unused'), false);
  const customer = await insert(db, 'customers', {
    name: 'Fictional Post-migration Customer',
    phone: '9876543210',
  });
  assert.equal(customer.id, 1501);
  const repeated = await context.migrate();
  assert.equal(repeated.alreadyImported, true);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM customers').get()).count, 503);
  assert.equal(
    (await db.prepare('SELECT settled_at FROM payment_requests').get()).settled_at,
    '2026-01-02T18:30:00.000Z',
  );
  assert.equal((await db.prepare('SELECT total FROM orders').get()).total, 1000);
  assert.equal(
    (await readFile(resolve(root, 'uploads/fictional.pdf'))).subarray(0, 5).toString(),
    '%PDF-',
  );
});

test('migration refuses a populated PostgreSQL target without changing it', async (t) => {
  const context = await migrationFixture(t);
  await insert(context.db, 'customers', {
    name: 'Existing Fictional Customer',
    phone: '9876543210',
  });
  const before = await context.db.fingerprint();
  await assert.rejects(context.migrate, /refusing to overwrite/);
  assert.deepEqual(await context.db.fingerprint(), before);
});

test('PostgreSQL constraint failure rolls back all imported tables', async (t) => {
  const context = await migrationFixture(t);
  await context.db.query(
    "ALTER TABLE vehicles ADD CONSTRAINT test_reject_color CHECK (color <> 'White')",
  );
  const before = await context.db.fingerprint();
  await assert.rejects(context.migrate, { code: '23514' });
  assert.deepEqual(await context.db.fingerprint(), before);
  assert.equal(
    (await context.db.prepare('SELECT COUNT(*) AS count FROM data_imports').get()).count,
    0,
  );
});

test('migration rejects inconsistent financial state and rolls back all records', async (t) => {
  const context = await migrationFixture(t);
  const source = new Database(context.filename);
  source.prepare('UPDATE payment_requests SET amount=2000').run();
  source.close();
  const before = await context.db.fingerprint();
  await assert.rejects(context.migrate, /financial\/delivery invariants/);
  assert.deepEqual(await context.db.fingerprint(), before);
});

test('migration rejects broken SQLite relationships before copying', async (t) => {
  const context = await migrationFixture(t);
  const source = new Database(context.filename);
  source.pragma('foreign_keys = OFF');
  source.prepare('UPDATE bookings SET customer_id=999999').run();
  source.close();
  const before = await context.db.fingerprint();
  await assert.rejects(context.migrate, /integrity check failed/);
  assert.deepEqual(await context.db.fingerprint(), before);
});

test('migration rejects missing private document files without modifying PostgreSQL', async (t) => {
  const context = await migrationFixture(t);
  await unlink(resolve(context.root, 'uploads/fictional.pdf'));
  const before = await context.db.fingerprint();
  await assert.rejects(context.migrate, { code: 'ENOENT' });
  assert.deepEqual(await context.db.fingerprint(), before);
});
