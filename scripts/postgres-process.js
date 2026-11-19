import EmbeddedPostgres from 'embedded-postgres';
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2]);
const config = JSON.parse(readFileSync(resolve(root, 'credentials.json'), 'utf8'));
const server = new EmbeddedPostgres({
  databaseDir: resolve(root, 'cluster'),
  user: config.user,
  password: config.password,
  port: config.port,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: [
    '-h',
    '127.0.0.1',
    '-k',
    root,
    '-c',
    'shared_buffers=32MB',
    '-c',
    'max_connections=64',
    '-c',
    'work_mem=2MB',
  ],
  onLog: (message) =>
    appendFileSync(resolve(root, 'server.log'), String(message) + '\n', { mode: 0o600 }),
  onError: (message) =>
    appendFileSync(resolve(root, 'server.log'), String(message) + '\n', { mode: 0o600 }),
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  process.disconnect?.();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, stop);
process.once('disconnect', stop);
try {
  if (!existsSync(resolve(root, 'cluster/PG_VERSION'))) await server.initialise();
  await server.start();
  const client = server.getPgClient('postgres');
  try {
    await client.connect();
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      config.database,
    ]);
    if (!found.rowCount) await server.createDatabase(config.database);
  } finally {
    await client.end();
  }
  process.send?.({ ready: true });
} catch (error) {
  console.error('Local PostgreSQL startup failed:', error.message);
  process.send?.({ error: 'Local PostgreSQL could not start; inspect its private server.log' });
  process.exitCode = 1;
  await stop();
}
