import type { Entity, EntityConfig, FieldSpec } from './types';
import {
  fuelTypes,
  transmissions,
  vehicleStatuses,
  bookingStatuses,
} from '../../../../shared/domain.js';
const branch: FieldSpec = { key: 'branch_id', label: 'Branch', source: 'branches' };
const model: FieldSpec = { key: 'model_id', label: 'Model', source: 'models' };
const fuel: FieldSpec = { key: 'fuel', label: 'Fuel', options: fuelTypes };
const transmission: FieldSpec = {
  key: 'transmission',
  label: 'Transmission',
  options: transmissions,
};
const status = (options: string[]): FieldSpec => ({ key: 'status', label: 'Status', options });
export const configs: Record<Entity, EntityConfig> = {
  models: {
    title: 'Model catalog',
    singular: 'model',
    action: 'catalog',
    subtitle: 'Your lineup, including newly announced models. Prices in INR.',
    fields: [
      { key: 'brand', label: 'Brand' },
      { key: 'name', label: 'Model name' },
      { key: 'variant', label: 'Variant' },
      fuel,
      transmission,
      { key: 'base_price', label: 'Base price (₹)', type: 'money' },
    ],
    columns: [
      { key: 'label', label: 'Model / variant' },
      { key: 'fuel', label: 'Fuel' },
      { key: 'transmission', label: 'Transmission' },
      { key: 'base_price', label: 'Base price', format: 'money' },
    ],
    filters: [
      { key: 'brand', label: 'Brand' },
      { key: 'variant', label: 'Variant' },
      fuel,
      transmission,
    ],
  },
  vehicles: {
    title: 'Vehicle inventory',
    singular: 'vehicle',
    action: 'catalog',
    subtitle: 'Track every VIN, from incoming stock to completed delivery.',
    fields: [
      model,
      { key: 'vin', label: 'VIN', hint: '17 characters; I, O and Q are not permitted.' },
      branch,
      { key: 'color', label: 'Color' },
      status(['available', 'in_transit']),
    ],
    columns: [
      { key: 'label', label: 'Vehicle' },
      { key: 'vin', label: 'VIN' },
      { key: 'branch', label: 'Branch' },
      { key: 'status', label: 'Status', format: 'status' },
      { key: 'base_price', label: 'Base price', format: 'money' },
    ],
    filters: [
      status(vehicleStatuses),
      branch,
      model,
      { key: 'brand', label: 'Brand' },
      { key: 'variant', label: 'Variant' },
      fuel,
      transmission,
    ],
  },
  customers: {
    title: 'Customers',
    singular: 'customer',
    action: 'sales',
    subtitle: 'Customer details and their connected dealership journey.',
    fields: [
      { key: 'name', label: 'Full name' },
      {
        key: 'phone',
        label: 'Phone',
        type: 'tel',
        hint: '10–15 digits, optionally starting with +.',
      },
      { key: 'email', label: 'Email', type: 'email', optional: true },
      { key: 'address', label: 'Address', optional: true },
    ],
    columns: [
      { key: 'name', label: 'Customer' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
    ],
    filters: [],
  },
  bookings: {
    title: 'Bookings',
    singular: 'booking',
    action: 'sales',
    subtitle: 'Reserve a specific available VIN, then convert it into a sales order.',
    fields: [
      { key: 'customer_id', label: 'Customer', source: 'customers' },
      { key: 'vehicle_id', label: 'Available VIN', source: 'vehicles' },
    ],
    columns: [
      { key: 'id', label: 'Booking #' },
      { key: 'customer', label: 'Customer' },
      { key: 'label', label: 'Vehicle' },
      { key: 'vin', label: 'VIN' },
      { key: 'status', label: 'Status', format: 'status' },
    ],
    filters: [status(bookingStatuses), branch],
  },
  orders: {
    title: 'Sales orders',
    singular: 'order',
    action: 'none',
    subtitle: 'Invoices, payments, documents and delivery in one connected workspace.',
    fields: [],
    columns: [
      { key: 'invoice_reference', label: 'Invoice / order' },
      { key: 'customer', label: 'Customer' },
      { key: 'label', label: 'Vehicle' },
      { key: 'status', label: 'Status', format: 'status' },
      { key: 'outstanding', label: 'Outstanding', format: 'money' },
    ],
    filters: [status(['open', 'delivered']), branch],
  },
};
