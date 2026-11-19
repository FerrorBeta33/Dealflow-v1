import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { openDatabase } from './db.js';
import { seedShowcase } from './showcase-data.js';
if (!process.env.SHOWCASE_DATABASE_URL)
  throw new Error('Set SHOWCASE_DATABASE_URL to a separate, empty PostgreSQL showcase database.');
const root = resolve('.data-showcase');
if (existsSync(root))
  throw new Error('Showcase directory already exists. Existing demo data is never replaced.');
mkdirSync(root, { mode: 0o700 });
const db = await openDatabase({ connectionString: process.env.SHOWCASE_DATABASE_URL });
try {
  const password = process.env.SHOWCASE_PASSWORD || randomBytes(20).toString('base64url');
  const result = await seedShowcase(db, resolve(root, 'uploads'), password);
  writeFileSync(
    resolve(root, 'demo-access.json'),
    JSON.stringify(
      {
        note: 'FICTIONAL SHOWCASE ONLY. Change or remove these local demo credentials before production.',
        password,
        emails: ['admin', 'sales', 'inventory', 'manager'].map((role) => `${role}@dealerflow.demo`),
      },
      null,
      2,
    ),
    { flag: 'wx', mode: 0o600 },
  );
  console.info(JSON.stringify(result));
  console.info(
    'Showcase access is stored privately in .data-showcase/demo-access.json. Normal app data and credentials are unchanged.',
  );
  console.info(
    'To opt in separately: set DATABASE_URL to your showcase target and DATA_DIR=.data-showcase.',
  );
} finally {
  await db.close();
}
