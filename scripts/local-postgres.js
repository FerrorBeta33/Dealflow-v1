import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, chownSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { Client } from 'pg';

export async function startPostgres(directory, port = 54329) {
  const root = resolve(directory);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const file = resolve(root, 'credentials.json');
  if (!existsSync(file))
    writeFileSync(
      file,
      JSON.stringify({
        host: '127.0.0.1',
        port,
        database: 'dealerflow',
        user: 'dealerflow',
        password: randomBytes(32).toString('base64url'),
      }),
      { mode: 0o600, flag: 'wx' },
    );
  chmodSync(root, 0o700);
  chmodSync(file, 0o600);
  // Drop privileges only for this child; never create system accounts or change the host.
  const identity = process.getuid?.() === 0 ? { uid: 65534, gid: 65534 } : {};
  if (identity.uid) {
    chownSync(root, identity.uid, identity.gid);
    chownSync(file, identity.uid, identity.gid);
  }
  const child = spawn(process.execPath, ['scripts/postgres-process.js', root], {
    ...identity,
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      reject(new Error(`Local PostgreSQL exited before ready (${code})`)),
    );
    child.once('message', (message) =>
      message.ready ? accept() : reject(new Error(message.error)),
    );
  });
  return {
    config: JSON.parse(readFileSync(file, 'utf8')),
    async stop() {
      if (child.exitCode !== null) return;
      const exit = once(child, 'exit');
      child.kill('SIGTERM');
      await exit;
    },
  };
}

export async function checkPostgres() {
  const config = JSON.parse(readFileSync(resolve('.data/postgres/credentials.json'), 'utf8'));
  const client = new Client({ ...config, ssl: false, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } finally {
    await client.end();
  }
}
if (
  process.argv[1]?.endsWith('/local-postgres.js') ||
  process.argv[1] === 'scripts/local-postgres.js'
) {
  if (process.argv[2] === 'check') {
    try {
      await checkPostgres();
    } catch (error) {
      console.error('PostgreSQL not ready:', error.code || error.message);
      process.exitCode = 1;
    }
  } else {
    const server = await startPostgres('.data/postgres');
    console.info('Local PostgreSQL ready');
    for (const signal of ['SIGTERM', 'SIGINT'])
      process.once(signal, async () => {
        await server.stop();
      });
  }
}
