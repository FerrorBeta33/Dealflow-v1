import { randomBytes } from 'node:crypto';
import { openDatabase } from '../db.js';

export async function temporaryDatabase(t) {
  if (process.env.DEALERFLOW_TEST_POSTGRES !== '1')
    throw new Error(
      'Run npm test (or node scripts/test-postgres.js api) to use an isolated PostgreSQL server',
    );
  const db = await openDatabase({
    schema: 'test_' + randomBytes(12).toString('hex'),
    dropOnClose: true,
  });
  t.after(() => db.close());
  return db;
}
