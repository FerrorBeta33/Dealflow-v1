import test from 'node:test';
import assert from 'node:assert/strict';
import { placeholders } from '../lib/sql.js';

test('PostgreSQL binding preserves quoted question marks and escaped SQL quotes', () => {
  assert.equal(
    placeholders(`SELECT '?' AS "?", ? AS value, 'can''t ?' AS literal, ? AS other`),
    `SELECT '?' AS "?", $1 AS value, 'can''t ?' AS literal, $2 AS other`,
  );
  assert.equal(placeholders('SELECT $1::text, $2::integer'), 'SELECT $1::text, $2::integer');
});
