import { Link } from 'react-router-dom';
import { useAnalytics, metricNumber } from '../../lib/command-data';
import type { QueryFilters, RecordData, CommandActions } from '../../lib/command-types';
import { Badge } from '../ui';
import { WidgetState, PageControls, drillStyle } from './widget-state';
export function RecordExplorer({
  metric,
  filters,
  page,
  onPage,
  actions,
}: {
  metric: string;
  filters: QueryFilters;
  page: string;
  onPage: (page: number) => void;
  actions?: CommandActions;
}) {
  const query = useAnalytics<RecordData>('records', { ...filters, metric, page, limit: '10' });
  const data = query.data;
  return (
    <WidgetState
      query={query}
      empty={data?.total === 0}
      emptyText="No source records match this metric and scope."
    >
      {data && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {data.total} source records · {data.definition.basis}. {data.definition.formula}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Scope: {data.filters.branch_id ? `branch #${data.filters.branch_id}` : 'all branches'} ·
            {data.filters.model_id ? ` model #${data.filters.model_id}` : ' all models'} ·{' '}
            {filters.status || 'all statuses'} · Last successful load{' '}
            {new Date(data.asOf).toLocaleTimeString('en-IN')}
          </p>
          <ul className="divide-y divide-border">
            {data.items.map((item) => {
              const orderId = item.entity === 'orders' ? Number(item.id) : item.order_id;
              const vehicleId = item.entity === 'vehicles' ? Number(item.id) : item.vehicle_id;
              const amount =
                metric === 'outstanding'
                  ? item.outstanding
                  : metric === 'collected'
                    ? item.amount
                    : item.total;
              return (
                <li key={item.id} className="space-y-2 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {orderId && actions ? (
                      <button onClick={() => actions.openJourney(orderId)} className={drillStyle}>
                        {item.reference}
                      </button>
                    ) : (
                      <Link to={item.href} className={drillStyle}>
                        {item.reference}
                      </Link>
                    )}
                    {item.status && <Badge value={item.status} />}
                  </div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {item.branch}
                    {item.customer ? ` · ${item.customer}` : ''}
                  </p>
                  {amount !== undefined && (
                    <p className="text-sm font-semibold tabular-nums">
                      {metricNumber(amount, 'paise')}
                      {metric === 'outstanding'
                        ? ' outstanding'
                        : metric === 'collected'
                          ? ' recorded settlement'
                          : ' order value'}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {vehicleId && actions && (
                      <button className={drillStyle} onClick={() => actions.openVin(vehicleId)}>
                        Trace VIN →
                      </button>
                    )}
                    <Link className={drillStyle} to={item.href}>
                      Open {item.entity === 'payments' ? 'payment workflow' : 'record'} →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <PageControls {...data} onChange={onPage} />
        </>
      )}
    </WidgetState>
  );
}
