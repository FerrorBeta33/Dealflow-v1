import { z } from 'zod';
import { fuelTypes, transmissions, documentTypes, reviewStatuses } from '../../../shared/domain.js';
const text = z.string().trim().min(1, 'This field is required').max(160);
export const identifier = z.coerce.number().int().positive().safe();
const amount = z.number().int().min(0).max(100000000000);
export const schemas = {
  login: z
    .object({
      email: z
        .string()
        .trim()
        .max(160)
        .regex(/^[^\s@]+@[^\s@]+$/, 'Enter your employee email'),
      password: z.string().min(1).max(256),
    })
    .strict(),
  models: z
    .object({
      brand: text,
      name: text,
      variant: text,
      fuel: z.enum(fuelTypes),
      transmission: z.enum(transmissions),
      base_price: amount.positive(),
    })
    .strict(),
  vehicles: z
    .object({
      vin: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Enter a 17-character VIN without I, O or Q'),
      model_id: identifier,
      branch_id: identifier,
      color: text,
      status: z.enum(['available', 'in_transit']),
    })
    .strict(),
  customers: z
    .object({
      name: text,
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{10,15}$/, 'Enter 10–15 phone digits, optionally starting with +'),
      email: z.union([z.email().max(160), z.literal('')]).default(''),
      address: z.string().trim().max(600).default(''),
    })
    .strict(),
  bookings: z.object({ customer_id: identifier, vehicle_id: identifier }).strict(),
  conversion: z.object({ extras: amount.default(0), tax: amount.default(0) }).strict(),
  payment: z
    .object({ amount: amount.positive(), note: z.string().trim().max(500).default('') })
    .strict(),
  upload: z.object({ type: z.enum(documentTypes) }).strict(),
  review: z
    .object({
      status: z.enum(reviewStatuses.filter((status) => status !== 'pending')),
      note: z.string().trim().max(500).default(''),
    })
    .strict(),
};
export function parse(schema, value) {
  return schema.parse(value);
}
export const idOf = (request) => identifier.parse(request.params.id);
export const orderIdOf = (request) => identifier.parse(request.params.orderId);
export const listQuery = z
  .object({
    q: z.string().max(160).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'oldest', 'name', 'price']).default('newest'),
    status: z.string().max(32).optional(),
    branch_id: identifier.optional(),
    model_id: identifier.optional(),
    customer_id: identifier.optional(),
    brand: z.string().max(160).optional(),
    variant: z.string().max(160).optional(),
    fuel: z.string().max(32).optional(),
    transmission: z.string().max(32).optional(),
    type: z.string().max(32).optional(),
  })
  .strict();
