import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { seed } from './seed.js';
import { insert, requireCondition } from './lib/errors.js';
import {
  createBooking,
  cancelBooking,
  convertBooking,
  requestPayment,
  transitionPayment,
  deliverOrder,
} from './lib/workflow.js';
import { reviewDocument } from './lib/documents.js';
import { demoDocument } from '../../shared/demo-document.js';
const day = 86400000;
function addDocument(db, root, order, type, status, employee, at, files) {
  const bytes = Buffer.from(demoDocument(type));
  const storage_name = `${randomUUID()}.pdf`;
  const filename = resolve(root, storage_name);
  writeFileSync(filename, bytes, { flag: 'wx', mode: 0o600 });
  files.push(filename);
  const document = insert(db, 'documents', {
    order_id: order.id,
    type,
    filename: `Fictional-${type}.pdf`,
    storage_name,
    mime: 'application/pdf',
    size: bytes.length,
    uploaded_by: employee.id,
    created_at: at,
  });
  if (status !== 'pending') {
    reviewDocument(db, document.id, { status, note: 'Fictional showcase verification' }, employee);
    db.prepare('UPDATE documents SET reviewed_at=? WHERE id=?').run(at, document.id);
  }
}
export function seedShowcase(db, uploadRoot, password, now = new Date()) {
  requireCondition(
    db.prepare('SELECT COUNT(*) AS count FROM employees').get().count === 0,
    'Showcase initialization requires an empty database and never replaces existing records',
    409,
  );
  const files = [];
  mkdirSync(uploadRoot, { recursive: true, mode: 0o700 });
  const time = now.getTime();
  const stamp = (daysAgo) => new Date(time - daysAgo * day).toISOString();
  try {
    return db
      .transaction(() => {
        seed(db, password);
        const admin = db.prepare("SELECT * FROM employees WHERE role='admin'").get();
        const manager = db.prepare("SELECT * FROM employees WHERE role='manager'").get();
        const models = db.prepare('SELECT id FROM vehicle_models ORDER BY id').all();
        const branches = db.prepare('SELECT id FROM branches ORDER BY id').all();
        const customers = db.prepare('SELECT id FROM customers ORDER BY id').all();
        db.prepare('UPDATE customers SET created_at=?').run(stamp(90));
        db.prepare('UPDATE vehicle_models SET created_at=?').run(stamp(120));
        const vehicles = Array.from({ length: 60 }, (_, index) =>
          insert(db, 'vehicles', {
            vin: `SHW${String(index + 1).padStart(14, '0')}`,
            model_id: models[index % models.length].id,
            branch_id: branches[Math.floor(index / models.length) % branches.length].id,
            color: ['Pearl White', 'Steel Grey', 'Ocean Blue'][index % 3],
            status: index % 9 === 0 ? 'in_transit' : 'available',
            created_at: stamp(5 + ((index * 7) % 60)),
          }),
        )
          .filter((vehicle) => vehicle.status === 'available')
          .slice(0, 24);
        vehicles.forEach((vehicle, index) => {
          const age = 4 + (index % 23);
          const mode = index % 8;
          const booking = createBooking(
            db,
            { vehicle_id: vehicle.id, customer_id: customers[index % customers.length].id },
            admin,
          );
          db.prepare('UPDATE vehicles SET created_at=MIN(created_at,?) WHERE id=?').run(
            stamp(age + 2),
            vehicle.id,
          );
          db.prepare('UPDATE bookings SET created_at=?,updated_at=? WHERE id=?').run(
            stamp(age),
            stamp(age),
            booking.id,
          );
          if (mode === 0) {
            cancelBooking(db, booking.id);
            db.prepare('UPDATE bookings SET updated_at=? WHERE id=?').run(
              stamp(age - 1),
              booking.id,
            );
            return;
          }
          if (mode === 1) return;
          const order = convertBooking(db, booking.id, {
            extras: (index + 1) * 120000,
            tax: 2500000,
          });
          const created = stamp(age - 1);
          db.prepare('UPDATE bookings SET updated_at=? WHERE id=?').run(created, booking.id);
          db.prepare('UPDATE orders SET created_at=? WHERE id=?').run(created, order.id);
          db.prepare('UPDATE invoices SET created_at=? WHERE order_id=?').run(created, order.id);
          const full = mode <= 4;
          const payment = requestPayment(
            db,
            order.id,
            {
              amount: mode === 7 || full ? order.total : Math.floor(order.total / 4),
              note: 'FICTIONAL SHOWCASE · simulated settlement',
            },
            admin,
          );
          db.prepare('UPDATE payment_requests SET created_at=? WHERE id=?').run(
            stamp(age - 1.1),
            payment.id,
          );
          if (mode !== 7) {
            transitionPayment(db, payment.id, 'paid', manager);
            db.prepare('UPDATE payment_requests SET settled_at=? WHERE id=?').run(
              stamp(age - 1.4),
              payment.id,
            );
            if (!full) {
              const pending = requestPayment(
                db,
                order.id,
                { amount: Math.floor(order.total / 3), note: 'Fictional pending finance' },
                admin,
              );
              db.prepare('UPDATE payment_requests SET created_at=? WHERE id=?').run(
                stamp(age - 1.5),
                pending.id,
              );
            }
          }
          for (const type of ['identity', 'address']) {
            const status =
              mode === 6 ? 'pending' : mode === 4 && type === 'address' ? 'rejected' : 'verified';
            addDocument(db, uploadRoot, order, type, status, manager, stamp(age - 1.6), files);
          }
          if (mode === 3) {
            deliverOrder(db, order.id, manager);
            db.prepare('UPDATE orders SET delivered_at=? WHERE id=?').run(stamp(age - 2), order.id);
          }
        });
        return {
          fictional: true,
          vehicles: 90,
          orders: db.prepare('SELECT COUNT(*) AS count FROM orders').get().count,
          note: 'Explicit fictional showcase only. No normal database, login or seed records were replaced.',
        };
      })
      .immediate();
  } catch (error) {
    for (const filename of files) unlinkSync(filename);
    throw error;
  }
}
