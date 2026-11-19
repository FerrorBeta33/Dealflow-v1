import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { openDatabase, dataRoot } from './db.js';
import { migrateSQLite } from './lib/sqlite-migration.js';

// Run before the HTTP server starts. Never seed over an existing SQLite dealership.
const legacy = resolve(dataRoot, 'dealerflow.sqlite');
if (existsSync(legacy)) {
  const db = await openDatabase();
  try {
    const report = await migrateSQLite(db, legacy, resolve(dataRoot, 'backups'));
    console.info(
      report.alreadyImported
        ? 'Existing PostgreSQL import retained.'
        : 'SQLite data copied and verified in PostgreSQL; original and private backup retained.',
    );
  } finally {
    await db.close();
  }
} else {
  const child = spawn(process.execPath, ['apps/api/seed.js'], {
    stdio: 'inherit',
    env: process.env,
  });
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error('PostgreSQL initialization failed');
}
