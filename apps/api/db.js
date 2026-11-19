import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const dataRoot = resolve(process.env.DATA_DIR || '.data');
export function openDatabase(filename = resolve(dataRoot, 'dealerflow.sqlite')) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  if (db.pragma('user_version', { simple: true }) < 1) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL CHECK(role IN ('sales','inventory','manager','admin')),
          salt TEXT NOT NULL, password_hash TEXT NOT NULL
        );
        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY, employee_id INTEGER NOT NULL REFERENCES employees(id),
          expires_at INTEGER NOT NULL
        );
        CREATE TABLE branches (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, address TEXT NOT NULL);
        CREATE TABLE vehicle_models (
          id INTEGER PRIMARY KEY, brand TEXT NOT NULL, name TEXT NOT NULL, variant TEXT NOT NULL,
          fuel TEXT NOT NULL, transmission TEXT NOT NULL, base_price INTEGER NOT NULL CHECK(base_price > 0),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE TABLE vehicles (
          id INTEGER PRIMARY KEY, vin TEXT NOT NULL UNIQUE, model_id INTEGER NOT NULL REFERENCES vehicle_models(id),
          branch_id INTEGER NOT NULL REFERENCES branches(id), color TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('available','reserved','in_transit','sold')),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE TABLE customers (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
          address TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE TABLE bookings (
          id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id),
          vehicle_id INTEGER NOT NULL REFERENCES vehicles(id), employee_id INTEGER NOT NULL REFERENCES employees(id),
          status TEXT NOT NULL CHECK(status IN ('confirmed','converted','cancelled')),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE UNIQUE INDEX active_booking_vin ON bookings(vehicle_id) WHERE status IN ('confirmed','converted');
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY, booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id),
          base_price INTEGER NOT NULL CHECK(base_price > 0), extras INTEGER NOT NULL CHECK(extras >= 0),
          tax INTEGER NOT NULL CHECK(tax >= 0), total INTEGER NOT NULL CHECK(total = base_price + extras + tax),
          status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','delivered')),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          delivered_at TEXT, delivered_by INTEGER REFERENCES employees(id)
        );
        CREATE TABLE invoices (
          id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id), reference TEXT NOT NULL UNIQUE,
          amount INTEGER NOT NULL CHECK(amount > 0),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE TABLE payment_requests (
          id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id),
          amount INTEGER NOT NULL CHECK(amount > 0), status TEXT NOT NULL CHECK(status IN ('pending','paid','cancelled')),
          note TEXT NOT NULL DEFAULT '', created_by INTEGER NOT NULL REFERENCES employees(id),
          settled_by INTEGER REFERENCES employees(id),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), settled_at TEXT, cancelled_at TEXT
        );
        CREATE TABLE documents (
          id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id),
          type TEXT NOT NULL CHECK(type IN ('identity','address','insurance','registration')),
          filename TEXT NOT NULL, storage_name TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, size INTEGER NOT NULL CHECK(size <= 4194304),
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
          note TEXT NOT NULL DEFAULT '', uploaded_by INTEGER NOT NULL REFERENCES employees(id),
          reviewed_by INTEGER REFERENCES employees(id), reviewed_at TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX vehicles_model ON vehicles(model_id);
        CREATE INDEX vehicles_branch_status ON vehicles(branch_id,status);
        CREATE INDEX bookings_customer ON bookings(customer_id);
        CREATE INDEX bookings_status ON bookings(status);
        CREATE INDEX payments_order_status ON payment_requests(order_id,status);
        CREATE INDEX documents_order_type ON documents(order_id,type);
        CREATE INDEX sessions_expiry ON sessions(expires_at);
        PRAGMA user_version = 1;
      `);
    })();
  }
  return db;
}
