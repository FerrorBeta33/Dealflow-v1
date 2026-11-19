import { Client } from 'pg';
import { connectionOptions } from './db.js';

let client;
try {
  client = new Client({ ...connectionOptions(), connectionTimeoutMillis: 2000 });
  await client.connect();
  const result = await client.query(`SELECT version FROM schema_migrations
    WHERE version=1 AND EXISTS (SELECT 1 FROM employees)`);
  if (!result.rowCount) process.exitCode = 1;
} catch (error) {
  console.info('PostgreSQL initialization required:', error.code || 'not configured');
  process.exitCode = 1;
} finally {
  await client?.end();
}
