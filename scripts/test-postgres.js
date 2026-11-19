import { mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startPostgres } from './local-postgres.js';

mkdirSync('.data', { recursive: true });
const root = mkdtempSync(resolve('.data/pg-test-'));
const reservation = createServer();
await new Promise((done) => reservation.listen(0, '127.0.0.1', done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const postgres = await startPostgres(root, port);
const config = postgres.config;
const env = {
  ...process.env,
  DEALERFLOW_TEST_POSTGRES: '1',
  DATABASE_URL: '',
  PGHOST: config.host,
  PGPORT: String(config.port),
  PGDATABASE: config.database,
  PGUSER: config.user,
  PGPASSWORD: config.password,
};
const scope = process.argv[2] || 'all';
let code = 0;
try {
  const steps = [];
  if (scope !== 'web') {
    const files = process.argv.slice(3);
    steps.push([
      process.execPath,
      [
        '--test',
        '--test-concurrency=3',
        ...(files.length
          ? files
          : readdirSync('apps/api/test')
              .filter((file) => file.endsWith('.test.js'))
              .map((file) => 'apps/api/test/' + file)),
      ],
    ]);
  }
  if (scope !== 'api')
    steps.push(['npx', ['vitest', 'run', '--config', 'apps/web/vite.config.ts']]);
  for (const [command, args] of steps) {
    const child = spawn(command, args, { stdio: 'inherit', env });
    const [result] = await once(child, 'exit');
    if (result !== 0) code = 1;
  }
} finally {
  await postgres.stop();
  await rm(root, { recursive: true, force: true });
}
process.exitCode = code;
