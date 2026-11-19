import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase, dataRoot } from './db.js';
import { hashPassword } from './lib/auth.js';
import { insert } from './lib/errors.js';
import {
  createBooking,
  convertBooking,
  requestPayment,
  transitionPayment,
} from './lib/workflow.js';
export async function seed(db, password) {
  return await db
    .transaction(async () => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        'dealerflow-seed-' + db.schema,
      ]);
      if ((await db.prepare('SELECT COUNT(*) AS count FROM employees').get()).count) return false;
      const employees = await Promise.all(
        [
          ['Aditi Sharma', 'admin'],
          ['Rohan Mehta', 'sales'],
          ['Neha Kapoor', 'inventory'],
          ['Vikram Rao', 'manager'],
        ].map(
          async ([name, role]) =>
            await insert(db, 'employees', {
              name,
              email: `${role}@dealerflow.demo`,
              role,
              ...hashPassword(password),
            }),
        ),
      );
      const admin = employees[0];
      const branches = await Promise.all(
        [
          ['Mumbai Central', 'Lower Parel, Mumbai, Maharashtra'],
          ['Pune West', 'Baner Road, Pune, Maharashtra'],
          ['Bengaluru South', 'JP Nagar, Bengaluru, Karnataka'],
        ].map(async ([name, address]) => await insert(db, 'branches', { name, address })),
      );
      const models = await Promise.all(
        [
          ['Tata', 'Nexon', 'Fearless Plus', 'Petrol', 'Automatic', 145000000],
          ['Mahindra', 'XUV700', 'AX7', 'Diesel', 'Automatic', 245000000],
          ['Hyundai', 'Creta', 'SX Tech', 'Petrol', 'Manual', 178000000],
          ['Maruti Suzuki', 'Grand Vitara', 'Alpha Plus', 'Hybrid', 'Automatic', 199500000],
          ['Tata', 'Punch EV', 'Empowered Plus', 'Electric', 'Automatic', 139900000],
          ['Toyota', 'Innova Hycross', 'ZX', 'Hybrid', 'Automatic', 315000000],
        ].map(
          async ([brand, name, variant, fuel, transmission, base_price]) =>
            await insert(db, 'vehicle_models', {
              brand,
              name,
              variant,
              fuel,
              transmission,
              base_price,
            }),
        ),
      );
      const vehicles = await Promise.all(
        Array.from(
          { length: 30 },
          async (_, index) =>
            await insert(db, 'vehicles', {
              vin: `MAT${String(20260000000000 + index)}`,
              model_id: models[index % models.length].id,
              branch_id: branches[index % branches.length].id,
              color: ['Pearl White', 'Midnight Black', 'Daytona Grey', 'Flame Red'][index % 4],
              status: index > 24 ? 'in_transit' : 'available',
            }),
        ),
      );
      const names = [
        'Arjun Desai',
        'Priya Nair',
        'Kabir Shah',
        'Ananya Iyer',
        'Ishaan Patel',
        'Meera Joshi',
        'Dev Malhotra',
        'Tara Menon',
      ];
      const customers = await Promise.all(
        names.map(
          async (name, index) =>
            await insert(db, 'customers', {
              name,
              phone: `98${String(41000000 + index)}`,
              email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
              address: `${24 + index}, Lakeview Residency, Mumbai`,
            }),
        ),
      );
      await createBooking(db, { customer_id: customers[0].id, vehicle_id: vehicles[0].id }, admin);
      const booking = await createBooking(
        db,
        { customer_id: customers[1].id, vehicle_id: vehicles[1].id },
        admin,
      );
      const order = await convertBooking(db, booking.id, { extras: 2500000, tax: 4000000 });
      const payment = await requestPayment(
        db,
        order.id,
        { amount: 5000000, note: 'Initial booking deposit' },
        admin,
      );
      await transitionPayment(db, payment.id, 'paid', admin);
      await requestPayment(
        db,
        order.id,
        { amount: 10000000, note: 'Finance instalment · awaiting approval' },
        admin,
      );
      const secondBooking = await createBooking(
        db,
        { customer_id: customers[2].id, vehicle_id: vehicles[2].id },
        admin,
      );
      await convertBooking(db, secondBooking.id, { extras: 0, tax: 0 });
      return true;
    })
    .immediate();
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const db = await openDatabase();
  const password = process.env.DEMO_PASSWORD || randomBytes(15).toString('base64url');
  if (await seed(db, password)) {
    mkdirSync(dataRoot, { recursive: true });
    writeFileSync(
      resolve(dataRoot, 'demo-access.json'),
      JSON.stringify(
        {
          note: 'Fictional demo access. Remove or change before production.',
          password,
          emails: ['admin', 'sales', 'inventory', 'manager'].map(
            (role) => `${role}@dealerflow.demo`,
          ),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.info('Demo seeded. Local login details are in .data/demo-access.json (not committed).');
  } else console.info('Existing dealership data retained. Seed skipped.');
  await db.close();
}
