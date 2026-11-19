import { Building2 } from 'lucide-react';
import { metricNumber } from '../../lib/command-data';
import type { BranchMetric, CommandActions, SummaryData } from '../../lib/command-types';
import { Select } from '../ui';
import { ChartData } from './chart-data';
import { WidgetState, WidgetTitle, type QueryState } from './widget-state';
export function BranchPerformance({
  query,
  params,
  actions,
}: {
  query: QueryState & { data?: SummaryData };
  params: URLSearchParams;
  actions: CommandActions;
}) {
  const field = (
    ['outstanding', 'available', 'ready'].includes(params.get('branch_sort') || '')
      ? params.get('branch_sort')
      : 'outstanding'
  ) as 'outstanding' | 'available' | 'ready';
  const rows = [...(query.data?.branches || [])].sort((a, b) => b[field] - a[field] || a.id - b.id);
  const max = Math.max(1, ...rows.map((branch) => branch[field]));
  const select = (branch: BranchMetric) =>
    actions.update({ branch_id: String(branch.id), metric: '', order: '', vin: '' });
  return (
    <>
      <WidgetTitle
        title="Branch Performance"
        subtitle="Compare current work · delivered count uses event period"
        icon={<Building2 size={20} aria-hidden="true" />}
      >
        <Select
          className="max-w-44"
          aria-label="Compare branches by"
          value={field}
          onChange={(event) => actions.update({ branch_sort: event.target.value })}
        >
          <option value="outstanding">Outstanding ₹</option>
          <option value="available">Available VINs</option>
          <option value="ready">Delivery ready</option>
        </Select>
      </WidgetTitle>
      <WidgetState query={query} empty={rows.length === 0}>
        <div className="space-y-3">
          {rows.map((branch) => (
            <button
              key={branch.id}
              onClick={() => select(branch)}
              className="block min-h-16 w-full rounded-control border border-border bg-background/40 p-3 text-left transition hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="flex justify-between gap-3 text-sm">
                <strong className="font-semibold">{branch.name}</strong>
                <span className="shrink-0 font-semibold tabular-nums text-primary">
                  {metricNumber(branch[field], field === 'outstanding' ? 'paise' : 'count')} →
                </span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                <svg
                  viewBox="0 0 100 2"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  aria-hidden="true"
                >
                  <rect width={(branch[field] / max) * 100} height="2" className="fill-primary" />
                </svg>
              </span>
              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{branch.available} available</span>
                <span>{branch.bookings} bookings</span>
                <span>{branch.orders} open</span>
                <span>{branch.ready} ready</span>
                <span>{branch.delivered} delivered (period)</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Select a branch to scope the workspace, or clear the branch filter to compare. Up to 100
          branch rows; no audited revenue claim.
        </p>
        <ChartData
          caption="Branch snapshots; delivered uses selected event period"
          columns={[
            'Branch',
            'Available',
            'Bookings',
            'Orders',
            'Outstanding INR',
            'Ready',
            'Delivered (period)',
          ]}
          rows={rows.map((branch) => ({
            key: String(branch.id),
            cells: [
              <button className="min-h-11 text-primary" onClick={() => select(branch)}>
                {branch.name}
              </button>,
              branch.available,
              branch.bookings,
              branch.orders,
              metricNumber(branch.outstanding, 'paise'),
              branch.ready,
              branch.delivered,
            ],
          }))}
        />
      </WidgetState>
    </>
  );
}
