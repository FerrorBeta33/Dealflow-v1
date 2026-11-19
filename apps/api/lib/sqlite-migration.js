import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, chmod, lstat } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { tableNames } from '../db.js';

const digest = () => createHash('sha256');
const canonical = (row) =>
  JSON.stringify(
    Object.keys(row)
      .sort()
      .map((key) => {
        let value = row[key];
        if (key.endsWith('_at') && typeof value === 'string') value = new Date(value).toISOString();
        if (typeof value === 'bigint') {
          value = Number(value);
          if (!Number.isSafeInteger(value))
            throw new Error('Legacy integer exceeds the supported safe range');
        }
        return [key, value];
      }),
  );
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
function* sourceBatches(source, table) {
  const key = table === 'sessions' ? 'token_hash' : 'id';
  let last;
  while (true) {
    const rows =
      last === undefined
        ? source.prepare(`SELECT * FROM ${table} ORDER BY ${key} LIMIT 500`).all()
        : source
            .prepare(`SELECT * FROM ${table} WHERE ${key} > ? ORDER BY ${key} LIMIT 500`)
            .all(last);
    if (!rows.length) break;
    yield rows;
    last = rows.at(-1)[key];
  }
}
function sourceManifest(source) {
  return Object.fromEntries(
    tableNames.map((table) => {
      const hash = digest();
      let count = 0;
      for (const rows of sourceBatches(source, table)) {
        for (const row of rows) hash.update(canonical(row) + '\n');
        count += rows.length;
      }
      return [table, { count, sha256: hash.digest('hex') }];
    }),
  );
}
async function importTable(db, source, table, expected) {
  const key = table === 'sessions' ? 'token_hash' : 'id';
  for (const rows of sourceBatches(source, table)) {
    const columns = Object.keys(rows[0]);
    const values = rows.flatMap((row) => columns.map((column) => row[column]));
    const tuples = rows.map(() => '(' + columns.map(() => '?').join(',') + ')');
    await db.query(
      `INSERT INTO ${table} (${columns.map(quote).join(',')}) VALUES ${tuples.join(',')}`,
      values.map((value) => (typeof value === 'bigint' ? value.toString() : value)),
    );
  }
  const hash = digest();
  let last;
  let count = 0;
  while (true) {
    const rows =
      last === undefined
        ? await db.prepare(`SELECT * FROM ${table} ORDER BY ${key} LIMIT 500`).all()
        : await db
            .prepare(`SELECT * FROM ${table} WHERE ${key} > ? ORDER BY ${key} LIMIT 500`)
            .all(last);
    if (!rows.length) break;
    for (const row of rows) hash.update(canonical(row) + '\n');
    count += rows.length;
    last = rows.at(-1)[key];
  }
  if (count !== expected.count || hash.digest('hex') !== expected.sha256)
    throw new Error(`Migration verification failed for ${table}; transaction rolled back`);
}
async function verifyFinancialState(db) {
  const { count } = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM orders o
    JOIN bookings b ON b.id=o.booking_id JOIN vehicles v ON v.id=b.vehicle_id
    LEFT JOIN invoices i ON i.order_id=o.id
    LEFT JOIN (SELECT order_id,
      SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) AS paid,
      SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) AS pending
      FROM payment_requests GROUP BY order_id) p ON p.order_id=o.id
    WHERE i.id IS NULL OR i.amount<>o.total OR COALESCE(p.paid,0)+COALESCE(p.pending,0)>o.total
      OR b.status<>'converted' OR (o.status='open' AND v.status<>'reserved')
      OR (o.status='delivered' AND (v.status<>'sold' OR COALESCE(p.paid,0)<>o.total
        OR NOT EXISTS (SELECT 1 FROM documents WHERE order_id=o.id AND type='identity' AND status='verified')
        OR NOT EXISTS (SELECT 1 FROM documents WHERE order_id=o.id AND type='address' AND status='verified')))`,
    )
    .get();
  if (count)
    throw new Error('Migrated financial/delivery invariants failed; transaction rolled back');
}

export async function migrateSQLite(db, filename, backupDirectory) {
  if (!backupDirectory) throw new Error('A private backup directory is required');
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const backup = resolve(backupDirectory, `dealerflow-${randomUUID()}.sqlite`);
  const original = new Database(resolve(filename), { readonly: true, fileMustExist: true });
  try {
    await original.backup(backup);
  } finally {
    original.close();
  }
  await chmod(backup, 0o600);
  const source = new Database(backup, { readonly: true, fileMustExist: true });
  source.defaultSafeIntegers(true);
  try {
    if (
      source.pragma('integrity_check', { simple: true }) !== 'ok' ||
      source.pragma('foreign_key_check').length
    )
      throw new Error('Legacy SQLite integrity check failed; source and target were not changed');
    const tables = sourceManifest(source);
    for (const batch of sourceBatches(source, 'documents')) {
      for (const document of batch) {
        if (
          basename(document.storage_name) !== document.storage_name ||
          document.storage_name.startsWith('.')
        )
          throw new Error('Legacy document storage reference is unsafe');
        const file = await lstat(resolve(dirname(filename), 'uploads', document.storage_name));
        if (!file.isFile() || file.size !== Number(document.size))
          throw new Error('Legacy document is missing or differs from its recorded size');
      }
    }
    const fingerprint = digest().update(JSON.stringify(tables)).digest('hex');
    return await db.transaction(async () => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['dealerflow-data-import']);
      await db.query(`LOCK TABLE ${tableNames.join(',')} IN ACCESS EXCLUSIVE MODE`);
      const completed = await db
        .prepare('SELECT report FROM data_imports WHERE source_checksum=?')
        .get(fingerprint);
      if (completed) return { ...completed.report, alreadyImported: true };
      for (const table of tableNames) {
        if (
          (await db.prepare(`SELECT EXISTS(SELECT 1 FROM ${table}) AS populated`).get()).populated
        )
          throw new Error('Target contains dealership data; refusing to overwrite or merge');
      }
      for (const table of tableNames) await importTable(db, source, table, tables[table]);
      await verifyFinancialState(db);
      for (const table of tableNames.filter((name) => name !== 'sessions')) {
        await db
          .prepare(
            `SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE(MAX(id),1), COUNT(*)>0) FROM ${table}`,
          )
          .get(`${db.schema}.${table}`);
      }
      const report = {
        migrated: true,
        tables,
        backup,
        foreignKeyViolations: 0,
        financialChecks: 'passed',
      };
      await db.query('INSERT INTO data_imports(source_checksum,report) VALUES ($1,$2)', [
        fingerprint,
        JSON.stringify(report),
      ]);
      return report;
    })();
  } finally {
    source.close();
  }
}
