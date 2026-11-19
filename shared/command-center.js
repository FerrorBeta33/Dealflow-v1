export const calculationVersion = 'dealerflow.cc.1';
export const metricDefinitions = [
  {
    id: 'stock',
    label: 'Stock VINs',
    unit: 'vehicles',
    basis: 'Snapshot now',
    entity: 'vehicles',
    formula:
      'Current VIN records in branch/model scope. Status filtering, when present, is applied to exact drilldown rows.',
  },
  {
    id: 'bookingsCreated',
    label: 'Bookings created',
    unit: 'bookings',
    basis: 'Booking creation date',
    entity: 'bookings',
    formula:
      'All bookings created in the selected period, including subsequently converted or cancelled bookings.',
  },
  {
    id: 'ordersCreated',
    label: 'Orders created',
    unit: 'orders',
    basis: 'Order creation date',
    entity: 'orders',
    formula:
      'Orders created from confirmed bookings in the selected period, regardless of current delivery state.',
  },
  {
    id: 'available',
    label: 'Available vehicles',
    unit: 'vehicles',
    basis: 'Snapshot now',
    entity: 'vehicles',
    formula:
      'Available VINs in the selected branch/model scope. Current stock, not historical inventory.',
  },
  {
    id: 'activeBookings',
    label: 'Active bookings',
    unit: 'bookings',
    basis: 'Snapshot now',
    entity: 'bookings',
    formula: 'Confirmed bookings only; converted and cancelled bookings are excluded.',
  },
  {
    id: 'openOrders',
    label: 'Open sales orders',
    unit: 'orders',
    basis: 'Snapshot now',
    entity: 'orders',
    formula: 'Orders with status open, irrespective of booking creation date.',
  },
  {
    id: 'collected',
    label: 'Demo recorded payments',
    unit: 'paise',
    basis: 'Settlement date',
    entity: 'orders',
    formula:
      'Sum of paid payment requests settled in the period. Pending/cancelled requests excluded; not audited bank receipts.',
  },
  {
    id: 'outstanding',
    label: 'Outstanding balance',
    unit: 'paise',
    basis: 'Snapshot now',
    entity: 'orders',
    formula:
      'Sum of max(order total minus paid settlements, 0) for open orders. Pending requests do not reduce balances.',
  },
  {
    id: 'ready',
    label: 'Delivery-ready orders',
    unit: 'orders',
    basis: 'Snapshot now',
    entity: 'orders',
    formula:
      'Open orders, linked VIN reserved, zero outstanding, and any verified identity and address documents.',
  },
  {
    id: 'inTransit',
    label: 'In-transit vehicles',
    unit: 'vehicles',
    basis: 'Snapshot now',
    entity: 'vehicles',
    formula: 'VINs with current status in_transit. No historical inventory snapshots are stored.',
  },
  {
    id: 'invoiced',
    label: 'Invoiced order value',
    unit: 'paise',
    basis: 'Order creation date',
    entity: 'orders',
    formula:
      'Sum of immutable invoice amounts for orders created in the selected period. Not recognized revenue.',
  },
  {
    id: 'paymentBlocked',
    label: 'Payment-blocked orders',
    unit: 'orders',
    basis: 'Snapshot now',
    entity: 'orders',
    formula:
      'Open orders with positive outstanding, including orders also blocked by mandatory documents.',
  },
  {
    id: 'documentBlocked',
    label: 'Document-blocked orders',
    unit: 'orders',
    basis: 'Snapshot now',
    entity: 'orders',
    formula:
      'Fully paid open orders without verified identity or address documents. Combined blockers appear separately.',
  },
  {
    id: 'delivered',
    label: 'Delivered vehicles',
    unit: 'vehicles',
    basis: 'Delivery timestamp',
    entity: 'orders',
    formula:
      'Delivered orders with a delivered_at timestamp inside the period; not order creation date.',
  },
  {
    id: 'aged30',
    label: 'Available record age 30+',
    unit: 'vehicles',
    basis: 'Snapshot now',
    entity: 'vehicles',
    formula:
      'Available VIN records created at least 30 days ago. Record age, not physical days-on-lot.',
  },
  {
    id: 'aged45',
    label: 'Available record age 45+',
    unit: 'vehicles',
    basis: 'Snapshot now',
    entity: 'vehicles',
    formula: 'Available VIN records created at least 45 days ago. Unknown dates are excluded.',
  },
  {
    id: 'cycle',
    label: 'Average fulfillment cycle',
    unit: 'days',
    basis: 'Delivery timestamp',
    entity: 'orders',
    formula:
      'Mean delivery minus linked booking creation time for completed journeys with valid timestamps in the period.',
  },
  {
    id: 'paidOrders',
    label: 'Fully paid open orders',
    unit: 'orders',
    basis: 'Snapshot now',
    entity: 'orders',
    formula: 'Open orders with zero outstanding. Document verification is a separate dimension.',
  },
  {
    id: 'verifiedOrders',
    label: 'Verified open orders',
    unit: 'orders',
    basis: 'Snapshot now',
    entity: 'orders',
    formula: 'Open orders with verified identity and address. Payment may still be outstanding.',
  },
];
export const heroMetrics = [
  'available',
  'activeBookings',
  'openOrders',
  'collected',
  'outstanding',
  'ready',
];
export const stages = [
  { metric: 'available', title: 'Available', subtitle: 'VIN inventory', icon: 'stock' },
  { metric: 'activeBookings', title: 'Reserved', subtitle: 'Confirmed booking', icon: 'booking' },
  { metric: 'openOrders', title: 'Ordered', subtitle: 'Order + invoice', icon: 'order' },
  { metric: 'paidOrders', title: 'Paid', subtitle: 'Zero balance', icon: 'payment' },
  {
    metric: 'verifiedOrders',
    title: 'Verified',
    subtitle: 'Mandatory documents',
    icon: 'documents',
  },
  { metric: 'delivered', title: 'Delivered', subtitle: 'Period handovers', icon: 'delivery' },
];
export const exceptionTypes = [
  'all',
  'ready',
  'payment',
  'documents',
  'combined',
  'pending',
  'aging',
];
export const commandPanels = [
  'journey',
  'actions',
  'stock',
  'pulse',
  'branches',
  'activity',
  'models',
];
