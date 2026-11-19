import { Link } from 'react-router-dom';
import { metricDefinitions } from '../../../../../shared/command-center.js';
import { fullListLink, useAnalytics } from '../../lib/command-data';
import type { CommandActions, QueryFilters } from '../../lib/command-types';
import { Dialog, Badge } from '../ui';
import { VehicleImage } from '../vehicle-image';
import { RecordExplorer } from './record-explorer';
import { OrderJourneyContent } from './journey-drawer';
import { WidgetState, drillStyle } from './widget-state';
type VinData = {
  vehicle: {
    id: number;
    label: string;
    vin: string;
    status: string;
    branch: string;
    color: string;
  };
  booking: { id: number; status: string; customer: string; order_id: number | null } | null;
};
function VinContent({ id, filters }: { id: string; filters: QueryFilters }) {
  const query = useAnalytics<VinData>(`vins/${id}`, filters);
  const data = query.data;
  return (
    <WidgetState query={query}>
      {data &&
        (data.booking?.order_id ? (
          <OrderJourneyContent id={String(data.booking.order_id)} filters={filters} />
        ) : (
          <div className="space-y-4">
            <VehicleImage label={data.vehicle.label} priority />
            <h3 className="text-xl font-semibold">{data.vehicle.label}</h3>
            <p className="break-all font-mono text-sm">{data.vehicle.vin}</p>
            <Badge value={data.vehicle.status} />
            <p className="text-sm">
              {data.vehicle.branch} · {data.vehicle.color}
            </p>
            <p className="text-sm">
              {data.booking
                ? `Booking #${data.booking.id} · ${data.booking.status} · ${data.booking.customer}`
                : 'No booking recorded for this VIN.'}
            </p>
            <p className="rounded-control bg-background p-4 text-sm text-muted-foreground">
              Order / invoice: not created. Payment, document and delivery gates apply after an
              order exists.
            </p>
            <Link className={drillStyle} to={`/vehicles/${id}`}>
              Open inventory record →
            </Link>
            {data.booking && (
              <Link className={drillStyle} to={`/bookings/${data.booking.id}`}>
                Open booking →
              </Link>
            )}
          </div>
        ))}
    </WidgetState>
  );
}
export function CommandDrawers({
  params,
  filters,
  actions,
}: {
  params: URLSearchParams;
  filters: QueryFilters;
  actions: CommandActions;
}) {
  const order = params.get('order');
  const vin = params.get('vin');
  const metric = params.get('metric');
  const definition = metricDefinitions.find((item) => item.id === metric);
  const applied = {
    ...filters,
    from: params.get('drill_from') || filters.from,
    to: params.get('drill_to') || filters.to,
    status: params.get('drill_status') || '',
    model_id: params.get('drill_model') || filters.model_id,
  };
  if (order)
    return (
      <Dialog side title={`Order journey #${order}`} close={() => actions.update({ order: '' })}>
        <OrderJourneyContent id={order} filters={filters} />
      </Dialog>
    );
  if (vin)
    return (
      <Dialog side title="VIN journey" close={() => actions.update({ vin: '' })}>
        <VinContent id={vin} filters={filters} />
      </Dialog>
    );
  if (metric)
    return (
      <Dialog
        side
        title={definition?.label || 'Metric records'}
        close={() => actions.update({ metric: '', drill_from: '', drill_to: '', record_page: '' })}
      >
        {definition && (
          <Link
            className={drillStyle}
            to={fullListLink(metric, definition.entity, applied, `/?${params}`)}
          >
            Open full filtered list →
          </Link>
        )}
        <RecordExplorer
          metric={metric}
          filters={applied}
          page={params.get('record_page') || '1'}
          onPage={(page) => actions.update({ record_page: String(page) })}
          actions={actions}
        />
      </Dialog>
    );
  return null;
}
