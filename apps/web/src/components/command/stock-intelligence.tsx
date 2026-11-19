import { Boxes } from 'lucide-react';
import type { CommandActions, StockData } from '../../lib/command-types';
import { Select } from '../ui';
import { ChartData } from './chart-data';
import { StockRing } from './stock-ring';
import { WidgetState, WidgetTitle, type QueryState } from './widget-state';
const states = ['available', 'reserved', 'in_transit', 'sold'];
const dots: Record<string, string> = {
  available: 'bg-primary',
  reserved: 'bg-warning',
  in_transit: 'bg-info',
  sold: 'bg-muted-foreground',
};
export function StockIntelligence({
  query,
  actions,
  status,
}: {
  query: QueryState & { data?: StockData };
  actions: CommandActions;
  status: string;
}) {
  const total = query.data?.distribution.reduce((sum, item) => sum + item.count, 0) || 0;
  return (
    <>
      <WidgetTitle
        title="Stock Intelligence"
        subtitle="Current inventory · branch and model scoped"
        icon={<Boxes size={20} aria-hidden="true" />}
      >
        <Select
          className="max-w-36"
          aria-label="Stock status"
          value={status}
          onChange={(event) => actions.update({ stock_status: event.target.value, model_page: '' })}
        >
          <option value="">All statuses</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state.replaceAll('_', ' ')}
            </option>
          ))}
        </Select>
      </WidgetTitle>
      <WidgetState
        query={query}
        empty={total === 0}
        emptyText="No stock matches the selected inventory scope."
      >
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <StockRing
            distribution={query.data?.distribution || []}
            total={total}
            open={(state) => actions.openStock(state)}
          />
          <div className="space-y-1">
            {states
              .filter((state) => !status || state === status)
              .map((state) => (
                <button
                  key={state}
                  onClick={() => actions.openStock(state)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className={`size-2 rounded-full ${dots[state]}`} />
                  <span className="flex-1 text-left capitalize">{state.replaceAll('_', ' ')}</span>
                  <strong className="font-semibold tabular-nums">
                    {query.data?.distribution.find((item) => item.status === state)?.count || 0}
                  </strong>
                </button>
              ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          {[
            ['aged30', query.data?.age.aged30, '30+ days'],
            ['aged45', query.data?.age.aged45, '45+ days'],
          ].map(([metric, count, label]) => (
            <button
              key={String(metric)}
              onClick={() => actions.openMetric(String(metric))}
              className="rounded-control border border-border bg-background p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <strong className="block text-lg font-semibold tabular-nums">{count ?? '—'}</strong>
              <span className="text-xs text-muted-foreground">{label} · available record age</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Record age is not physical days-on-lot; 45+ is included in 30+. Status selector affects
          stock/model counts only, not available-stock aging.
        </p>
        <ChartData
          caption="Current stock by status (VINs)"
          columns={['Status', 'VINs', 'Inspect']}
          rows={
            query.data?.distribution.map((item) => ({
              key: item.status,
              cells: [
                item.status.replaceAll('_', ' '),
                item.count,
                <button
                  className="min-h-11 text-primary"
                  onClick={() => actions.openStock(item.status)}
                >
                  View VINs
                </button>,
              ],
            })) || []
          }
        />
      </WidgetState>
    </>
  );
}
