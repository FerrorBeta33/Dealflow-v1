import { Pool, types } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { placeholders } from './lib/sql.js';

export const dataRoot = resolve(process.env.DATA_DIR || '.data');
export const tableNames = [
  'employees',
  'sessions',
  'branches',
  'vehicle_models',
  'vehicles',
  'customers',
  'bookings',
  'orders',
  'invoices',
  'payment_requests',
  'documents',
];
const numeric = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (Number.isInteger(parsed) && !Number.isSafeInteger(parsed)))
    throw new RangeError('Database number is outside the supported safe range');
  return parsed;
};
types.setTypeParser(20, numeric);
types.setTypeParser(1700, numeric);
types.setTypeParser(1082, (value) => value);
types.setTypeParser(1184, (value) => new Date(value).toISOString());

export function connectionOptions() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL, ssl: false };
  if (process.env.PGHOST) return { ssl: false };
  const file = resolve('.data/postgres/credentials.json');
  if (process.env.NODE_ENV !== 'production' && existsSync(file))
    return { ...JSON.parse(readFileSync(file, 'utf8')), ssl: false };
  throw new Error('Configure DATABASE_URL or PGHOST for PostgreSQL; SQLite fallback is disabled');
}

export async function openDatabase(options = {}) {
  if (typeof options !== 'object') throw new Error('Use PostgreSQL connection/schema options');
  const schema = options.schema || 'public';
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error('Invalid database schema');
  const pool = new Pool({
    ...connectionOptions(),
    ...options,
    ssl: false,
    max: 8,
    connectionTimeoutMillis: 5000,
    options: `-c search_path=${schema} -c timezone=UTC`,
  });
  pool.on('error', (error) => console.error('PostgreSQL pool connection error:', error.code));
  const context = new AsyncLocalStorage();
  const query = (sql, args = []) => (context.getStore() || pool).query(placeholders(sql), args);
  const db = {
    pool,
    schema,
    query,
    inTransaction: () => Boolean(context.getStore()),
    prepare(sql) {
      return {
        async get(...args) {
          return (await query(sql, args)).rows[0];
        },
        async all(...args) {
          return (await query(sql, args)).rows;
        },
        async run(...args) {
          const text =
            /^\s*INSERT\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)
              ? sql.replace(/;\s*$/, '') + ' RETURNING *'
              : sql;
          const result = await query(text, args);
          return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
        },
      };
    },
    transaction(callback, { readOnly = false } = {}) {
      const execute = async () => {
        if (context.getStore()) return callback();
        const client = await pool.connect();
        try {
          await client.query(
            readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN',
          );
          const result = await context.run(client, callback);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      };
      execute.immediate = execute;
      return execute;
    },
    async fingerprint() {
      const rows = tableNames.map(
        (table) => `SELECT row_to_json(t)::text AS value FROM ${table} t`,
      );
      return (
        await query(
          `SELECT md5(COALESCE(string_agg(value,'' ORDER BY value),'')) AS count FROM (${rows.join(' UNION ALL ')}) data`,
        )
      ).rows[0];
    },
    async close() {
      if (options.dropOnClose) await query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
    },
  };
  try {
    await db.transaction(async () => {
      await query('SELECT pg_advisory_xact_lock(hashtext($1))', ['dealerflow-schema-' + schema]);
      await query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
      );
      const applied = await query('SELECT version FROM schema_migrations WHERE version = 1');
      if (!applied.rowCount) {
        await query(readFileSync(resolve('apps/api/migrations/001-initial.sql'), 'utf8'));
        await query('INSERT INTO schema_migrations(version) VALUES (1)');
      }
    })();
    mkdirSync(dataRoot, { recursive: true });
    return db;
  } catch (error) {
    await pool.end();
    throw error;
  }
}
