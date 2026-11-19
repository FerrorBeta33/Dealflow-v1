export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function requireCondition(condition, message, status = 409) {
  if (!condition) throw new HttpError(status, message);
}
export async function row(db, table, id) {
  const lock = db.inTransaction() && ['vehicles', 'bookings', 'orders'].includes(table);
  const found = await db
    .prepare(`SELECT * FROM ${table} WHERE id = ?${lock ? ' FOR UPDATE' : ''}`)
    .get(id);
  requireCondition(found, 'Record not found', 404);
  return found;
}
export const timestamp = 'now()';
export async function insert(db, table, values) {
  const keys = Object.keys(values);
  const result = await db
    .prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
    .run(...Object.values(values));
  return await row(db, table, Number(result.lastInsertRowid));
}
export async function update(db, table, id, values) {
  const keys = Object.keys(values);
  await row(db, table, id);
  await db
    .prepare(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(',')} WHERE id = ?`)
    .run(...Object.values(values), id);
  return await row(db, table, id);
}
