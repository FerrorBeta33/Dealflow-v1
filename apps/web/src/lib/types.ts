export interface Entry {
  id: number;
  [key: string]: unknown;
}
export interface Page<T = Entry> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}
export interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
}
export interface Order extends Entry {
  booking_id: number;
  customer_id: number;
  customer: string;
  phone: string;
  email: string;
  address: string;
  vin: string;
  label: string;
  branch: string;
  base_price: number;
  extras: number;
  tax: number;
  total: number;
  paid: number;
  outstanding: number;
  status: string;
  created_at: string;
  delivered_at: string | null;
  invoice_reference: string;
  readiness: {
    paid: number;
    pending: number;
    outstanding: number;
    requestable: number;
    identity: boolean;
    address: boolean;
  };
}
export interface DocumentEntry extends Entry {
  type: string;
  filename: string;
  status: string;
  note: string;
  created_at: string;
  reviewed_at: string;
}
export interface PaymentEntry extends Entry {
  amount: number;
  status: string;
  note: string;
  created_at: string;
}
export type Entity = 'models' | 'vehicles' | 'customers' | 'bookings' | 'orders';
export interface FieldSpec {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  source?: Entity | 'branches';
  optional?: boolean;
  hint?: string;
}
export interface EntityConfig {
  title: string;
  singular: string;
  subtitle: string;
  action: string;
  fields: FieldSpec[];
  columns: { key: string; label: string; format?: 'money' | 'status' | 'date' }[];
  filters: FieldSpec[];
}
