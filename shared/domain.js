export const roles = ['sales', 'inventory', 'manager', 'admin'];
export const permissions = {
  catalog: ['inventory', 'admin'],
  sales: ['sales', 'admin'],
  approve: ['manager', 'admin'],
};
export const can = (role, action) => permissions[action]?.includes(role) ?? false;
export const vehicleStatuses = ['available', 'reserved', 'in_transit', 'sold'];
export const bookingStatuses = ['confirmed', 'converted', 'cancelled'];
export const paymentStatuses = ['pending', 'paid', 'cancelled'];
export const documentTypes = ['identity', 'address', 'insurance', 'registration'];
export const reviewStatuses = ['pending', 'verified', 'rejected'];
export const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
export const transmissions = ['Manual', 'Automatic'];
export const PAGE_SIZE = 20;
export const money = (paise) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
