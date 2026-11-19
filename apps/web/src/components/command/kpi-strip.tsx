import { useState } from 'react';
import { heroMetrics } from '../../../../../shared/command-center.js';
import type { CommandActions, SummaryData } from '../../lib/command-types';
import { WidgetState, type QueryState } from './widget-state';
import { KpiTile } from './kpi-tile';
export function KpiStrip({
  query,
  actions,
  scope,
  inventoryFirst,
}: {
  query: QueryState & { data?: SummaryData };
  actions: CommandActions;
  scope: string;
  inventoryFirst: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const order = inventoryFirst
    ? ['available', 'activeBookings', 'openOrders', 'ready', 'outstanding', 'collected']
    : heroMetrics;
  const metrics = new Map(query.data?.metrics.map((metric) => [metric.id, metric]));
  return (
    <section aria-label="Key performance indicators">
      <WidgetState query={query}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {order.map((id, index) => {
            const metric = metrics.get(id);
            return metric ? (
              <div key={id} className={index > 2 && !expanded ? 'hidden md:block' : ''}>
                <KpiTile
                  metric={metric}
                  asOf={query.data!.asOf}
                  scope={scope}
                  open={() => actions.openMetric(id)}
                />
              </div>
            ) : null;
          })}
        </div>
        <button
          className="mt-2 min-h-11 text-sm font-medium text-primary md:hidden"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show priority metrics' : 'Show all six metrics'}
        </button>
      </WidgetState>
    </section>
  );
}
