import { insert, row, requireCondition, timestamp } from './errors.js';
export async function createBooking(db, input, employee) {
  return await db
    .transaction(async () => {
      await row(db, 'customers', input.customer_id);
      const vehicle = await row(db, 'vehicles', input.vehicle_id);
      requireCondition(vehicle.status === 'available', 'This VIN is no longer available');
      const booking = await insert(db, 'bookings', {
        ...input,
        employee_id: employee.id,
        status: 'confirmed',
      });
      await db
        .prepare("UPDATE vehicles SET status = 'reserved' WHERE id = ? AND status = 'available'")
        .run(vehicle.id);
      return booking;
    })
    .immediate();
}
export async function cancelBooking(db, id) {
  return await db
    .transaction(async () => {
      const booking = await row(db, 'bookings', id);
      requireCondition(
        booking.status === 'confirmed',
        'Only confirmed, unconverted bookings can be cancelled',
      );
      await db
        .prepare(`UPDATE bookings SET status = 'cancelled', updated_at = ${timestamp} WHERE id = ?`)
        .run(id);
      await db
        .prepare("UPDATE vehicles SET status = 'available' WHERE id = ?")
        .run(booking.vehicle_id);
      return await row(db, 'bookings', id);
    })
    .immediate();
}
export async function convertBooking(db, id, input) {
  return await db
    .transaction(async () => {
      const booking = await row(db, 'bookings', id);
      requireCondition(booking.status === 'confirmed', 'Only confirmed bookings can become orders');
      const vehicle = await row(db, 'vehicles', booking.vehicle_id);
      requireCondition(vehicle.status === 'reserved', 'The booked VIN must be reserved');
      const model = await row(db, 'vehicle_models', vehicle.model_id);
      const order = await insert(db, 'orders', {
        booking_id: id,
        base_price: model.base_price,
        ...input,
        total: model.base_price + input.extras + input.tax,
      });
      await insert(db, 'invoices', {
        order_id: order.id,
        reference: `DF-${new Date().getFullYear()}-${String(order.id).padStart(6, '0')}`,
        amount: order.total,
      });
      await db
        .prepare(`UPDATE bookings SET status = 'converted', updated_at = ${timestamp} WHERE id = ?`)
        .run(id);
      return order;
    })
    .immediate();
}
export async function balance(db, order) {
  const sums = await db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END),0) AS paid,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END),0) AS pending
    FROM payment_requests WHERE order_id = ?`,
    )
    .get(order.id);
  return {
    ...sums,
    outstanding: order.total - sums.paid,
    requestable: order.total - sums.paid - sums.pending,
  };
}
export async function requestPayment(db, orderId, input, employee) {
  return await db
    .transaction(async () => {
      const order = await row(db, 'orders', orderId);
      requireCondition(order.status === 'open', 'Delivered orders cannot accept payment requests');
      requireCondition(
        input.amount <= (await balance(db, order)).requestable,
        'Paid and pending amounts cannot exceed the order total',
      );
      return await insert(db, 'payment_requests', {
        order_id: orderId,
        ...input,
        status: 'pending',
        created_by: employee.id,
      });
    })
    .immediate();
}
export async function transitionPayment(db, id, action, employee) {
  return await db
    .transaction(async () => {
      const existing = await row(db, 'payment_requests', id);
      const order = await row(db, 'orders', existing.order_id);
      const payment = await row(db, 'payment_requests', id);
      requireCondition(
        payment.status === 'pending',
        'Only pending payment requests can be changed',
      );
      requireCondition(order.status === 'open', 'Delivered orders cannot be changed');
      if (action === 'paid') {
        requireCondition(
          (await balance(db, order)).outstanding >= payment.amount,
          'This payment would exceed the outstanding balance',
        );
        await db
          .prepare(
            `UPDATE payment_requests SET status = 'paid', settled_by = ?, settled_at = ${timestamp} WHERE id = ?`,
          )
          .run(employee.id, id);
      } else {
        await db
          .prepare(
            `UPDATE payment_requests SET status = 'cancelled', cancelled_at = ${timestamp} WHERE id = ?`,
          )
          .run(id);
      }
      return await row(db, 'payment_requests', id);
    })
    .immediate();
}
export async function deliveryReadiness(db, order) {
  const verified = (
    await db
      .prepare(
        "SELECT DISTINCT type FROM documents WHERE order_id = ? AND status = 'verified' LIMIT 4",
      )
      .all(order.id)
  ).map((document) => document.type);
  return {
    ...(await balance(db, order)),
    identity: verified.includes('identity'),
    address: verified.includes('address'),
  };
}
export async function deliverOrder(db, id, employee) {
  return await db
    .transaction(async () => {
      const order = await row(db, 'orders', id);
      requireCondition(order.status === 'open', 'This order is already delivered');
      const readiness = await deliveryReadiness(db, order);
      requireCondition(
        readiness.outstanding === 0,
        'Settle the outstanding balance before delivery',
      );
      requireCondition(
        readiness.identity && readiness.address,
        'Verify identity and address documents before delivery',
      );
      const booking = await row(db, 'bookings', order.booking_id);
      requireCondition(
        (await row(db, 'vehicles', booking.vehicle_id)).status === 'reserved',
        'The VIN must be reserved for this order',
      );
      await db
        .prepare(
          `UPDATE orders SET status = 'delivered', delivered_by = ?, delivered_at = ${timestamp} WHERE id = ?`,
        )
        .run(employee.id, id);
      await db.prepare("UPDATE vehicles SET status = 'sold' WHERE id = ?").run(booking.vehicle_id);
      return await row(db, 'orders', id);
    })
    .immediate();
}
