export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function requireCondition(condition, message, status = 409) {
  if (!condition) throw new HttpError(status, message);
}
export function row(db, table, id) {
  const found = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  requireCondition(found, 'Record not found', 404);
  return found;
}
export const timestamp = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
export function insert(db, table, values) {
  const keys = Object.keys(values);
  const result = db
    .prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`)
    .run(...Object.values(values));
  return row(db, table, Number(result.lastInsertRowid));
}
export function update(db, table, id, values) {
  const keys = Object.keys(values);
  row(db, table, id);
  db.prepare(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(',')} WHERE id = ?`).run(
    ...Object.values(values),
    id,
  );
  return row(db, table, id);
}
