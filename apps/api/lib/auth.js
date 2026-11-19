import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { HttpError } from './errors.js';
import { can } from '../../../shared/domain.js';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, password_hash: scryptSync(password, salt, 64).toString('hex') };
}
const dummy = hashPassword(randomBytes(32).toString('hex'));
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
export function login(db, { email, password }) {
  const employee = db.prepare('SELECT * FROM employees WHERE email = ?').get(email.toLowerCase());
  const expected = employee || dummy;
  const actual = scryptSync(password, expected.salt, 64);
  if (!timingSafeEqual(actual, Buffer.from(expected.password_hash, 'hex')) || !employee) {
    console.info('Login rejected');
    throw new HttpError(401, 'Invalid credentials');
  }
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, employee_id, expires_at) VALUES (?, ?, ?)').run(
    tokenHash(token),
    employee.id,
    Date.now() + 10 * 60 * 60 * 1000,
  );
  console.info(`Employee ${employee.id} signed in`);
  return { token, employee: publicEmployee(employee) };
}
const publicEmployee = ({ id, name, email, role }) => ({ id, name, email, role });
export function authenticate(db) {
  return (request, response, next) => {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization || '');
    const employee =
      match &&
      db
        .prepare(
          `SELECT employees.* FROM sessions JOIN employees ON employees.id = sessions.employee_id
      WHERE token_hash = ? AND expires_at > ?`,
        )
        .get(tokenHash(match[1]), Date.now());
    if (!employee) return next(new HttpError(401, 'Please sign in to continue'));
    request.employee = publicEmployee(employee);
    request.tokenHash = tokenHash(match[1]);
    next();
  };
}
export function authorize(action) {
  return (request, response, next) =>
    can(request.employee.role, action)
      ? next()
      : next(new HttpError(403, 'Your role cannot perform this action'));
}
