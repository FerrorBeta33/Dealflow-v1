export interface Metric {
  id: string;
  label: string;
  unit: string;
  basis: string;
  formula: string;
  entity: string;
  value: number | null;
  records: number;
  comparisonNote: string;
}
export interface AnalyticsMeta {
  asOf: string;
  calculationVersion: string;
  units: string;
  filters: { branch_id: number | null; model_id: number | null; from: string; to: string };
  historyAvailable: boolean;
  exclusions: string;
}
export interface AnalyticsPage<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}
export interface ActivityEvent {
  event_id: string;
  title: string;
  detail: string;
  happened_at: string;
  href: string;
}
export interface BranchMetric {
  id: number;
  name: string;
  available: number;
  bookings: number;
  orders: number;
  outstanding: number;
  ready: number;
  delivered: number;
}
export interface SummaryData extends AnalyticsMeta {
  metrics: Metric[];
  branches: BranchMetric[];
  events: ActivityEvent[];
  activityNote: string;
  cohortNote: string;
}
export interface CommandRecord {
  id: number | string;
  reference?: string;
  label: string;
  vin?: string;
  branch?: string;
  branch_id?: number;
  model_id?: number;
  customer?: string;
  status?: string;
  entity?: string;
  href: string;
  order_id?: number | null;
  vehicle_id?: number;
  outstanding?: number;
  total?: number;
  amount?: number;
  created_at?: string;
}
export interface RecordData extends AnalyticsMeta, AnalyticsPage<CommandRecord> {
  definition: Metric;
  entity: string;
}
export interface ExceptionRecord extends CommandRecord {
  type: string;
  priority: number;
  pending: number;
  identity: number;
  address: number;
  age_days: number;
}
export type ExceptionData = AnalyticsMeta & AnalyticsPage<ExceptionRecord>;
export interface ModelSpotlight {
  id: number;
  brand: string;
  name: string;
  variant: string;
  label: string;
  base_price: number;
  available: number;
  reserved: number;
  units: number;
  branches: string | null;
}
export interface StockData extends AnalyticsMeta {
  distribution: { status: string; count: number }[];
  age: { known: number; aged30: number; aged45: number };
  models: AnalyticsPage<ModelSpotlight>;
  note: string;
}
export interface TrendPoint {
  bucket: string;
  bookings: number;
  orders: number;
  settlements: number;
  deliveries: number;
  payments: number;
  first_event: string;
  last_event: string;
}
export interface TrendData extends AnalyticsMeta {
  points: TrendPoint[];
  bucket: 'day' | 'week';
  note: string;
  series: Record<string, string>;
}
export interface JourneyData extends AnalyticsMeta {
  order: {
    id: number;
    booking_id: number;
    vehicle_id: number;
    model_id: number;
    label: string;
    vin: string;
    branch: string;
    customer: string;
    total: number;
    outstanding: number;
    paid: number;
    pending: number;
    invoice_reference: string;
    booking_at: string;
    created_at: string;
    delivered_at: string | null;
    status: string;
    identity: number;
    address: number;
    vehicle_status: string;
    readiness: {
      outstanding: number;
      paid: number;
      pending: number;
      identity: boolean;
      address: boolean;
    };
  };
  documents: { type: string; status: string; count: number; reviewed_at: string | null }[];
  paymentStates: {
    status: string;
    count: number;
    amount: number;
    last_settled_at: string | null;
  }[];
  latestMilestone: string;
  ready: boolean;
}
export type QueryFilters = Record<string, string>;
export interface CommandActions {
  openMetric: (metric: string, range?: { from: string; to: string }) => void;
  openJourney: (id: number) => void;
  openVin: (id: number) => void;
  openStock: (status?: string, model?: number) => void;
  update: (changes: QueryFilters) => void;
}
