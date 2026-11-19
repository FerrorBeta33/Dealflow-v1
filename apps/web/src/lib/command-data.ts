import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';
import type { CommandActions, QueryFilters } from './command-types';

const day = 86400000;
const offset = 19800000;
export function istDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid date');
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value)
    throw new Error('Choose a valid date');
  return timestamp - offset;
}
export function periodRange(period = '30d', start = '', end = '', now = Date.now()) {
  const today = Math.floor((now + offset) / day) * day - offset;
  const from =
    period === 'custom'
      ? istDay(start)
      : today - (period === 'today' ? 0 : period === '7d' ? 6 : 29) * day;
  const to = period === 'custom' ? istDay(end) + day : today + day;
  if (to <= from || to - from > 366 * day)
    throw new Error('Choose an ordered date range of at most 366 days');
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}
export function bucketRange(date: string, bucket: string, filters: QueryFilters) {
  const start = istDay(date);
  return {
    from: new Date(Math.max(start, Date.parse(filters.from))).toISOString(),
    to: new Date(
      Math.min(start + (bucket === 'week' ? 7 : 1) * day, Date.parse(filters.to)),
    ).toISOString(),
  };
}
export function analyticsParams(filters: QueryFilters) {
  return new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== ''),
  ).toString();
}
export function useAnalytics<T>(resource: string, filters: QueryFilters, enabled = true) {
  const query = analyticsParams(filters);
  return useQuery({
    queryKey: ['analytics', resource, query],
    queryFn: ({ signal }) => api<T>(`/analytics/${resource}?${query}`, { signal }),
    enabled: enabled && !filters.invalid,
    staleTime: 15000,
    refetchOnMount: 'always',
  });
}
export function useCommandFilters() {
  const [params, setParams] = useSearchParams();
  let period: { from: string; to: string };
  let error = '';
  try {
    period = periodRange(
      params.get('period') || '30d',
      params.get('start') || '',
      params.get('end') || '',
    );
  } catch (problem) {
    error = (problem as Error).message;
    period = { from: '', to: '' };
  }
  const filters: QueryFilters = {
    ...period,
    branch_id: params.get('branch_id') || '',
    model_id: params.get('model_id') || '',
  };
  if (error) filters.invalid = 'true';
  const update = (changes: QueryFilters) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  const actions: CommandActions = {
    update,
    openMetric: (metric, range) =>
      update({
        metric,
        order: '',
        record_page: '',
        drill_from: range?.from || '',
        drill_to: range?.to || '',
        drill_status: '',
        drill_model: '',
        vin: '',
      }),
    openJourney: (id) => update({ order: String(id), vin: '' }),
    openVin: (id) => update({ vin: String(id), order: '' }),
    openStock: (status = '', model) =>
      update({
        metric: 'stock',
        order: '',
        vin: '',
        record_page: '',
        drill_status: status,
        drill_model: model ? String(model) : '',
        drill_from: '',
        drill_to: '',
      }),
  };
  return { params, filters, actions, error };
}
export function fullListLink(
  metric: string,
  entity: string,
  filters: QueryFilters,
  returnTo = '/',
) {
  const query = new URLSearchParams({ cc_metric: metric, cc_return: returnTo });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(`cc_${key}`, value);
  return `/${entity}?${query}`;
}
export const metricNumber = (value: number | null, unit: string) =>
  value === null
    ? '—'
    : unit === 'paise'
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        }).format(value / 100)
      : new Intl.NumberFormat('en-IN', { maximumFractionDigits: unit === 'days' ? 1 : 0 }).format(
          value,
        );
