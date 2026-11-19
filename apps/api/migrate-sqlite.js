import { resolve } from 'node:path';
import { openDatabase, dataRoot } from './db.js';
import { migrateSQLite } from './lib/sqlite-migration.js';

if (!process.argv.includes('--offline'))
  throw new Error(
    'Stop application writes, then run npm run db:migrate:sqlite -- --offline [source.sqlite]',
  );
const filename =
  process.argv.slice(2).find((argument) => argument !== '--offline') ||
  resolve(dataRoot, 'dealerflow.sqlite');
const db = await openDatabase();
try {
  const report = await migrateSQLite(db, filename, resolve(dataRoot, 'backups'));
  console.info(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(
    'Migration failed without changing the SQLite source:',
    error.code || error.message,
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
