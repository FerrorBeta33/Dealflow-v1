import { Link } from 'react-router-dom';
import { date, money } from '../../../../../shared/domain.js';
import { useAnalytics } from '../../lib/command-data';
import type { JourneyData, QueryFilters } from '../../lib/command-types';
import { VehicleImage } from '../vehicle-image';
import { Badge } from '../ui';
import { WidgetState, drillStyle } from './widget-state';
import { JourneyPath } from './journey-path';
import { JourneyChecklist } from './journey-checklist';
export function OrderJourneyContent({ id, filters }: { id: string; filters: QueryFilters }) {
  const query = useAnalytics<JourneyData>(`journeys/${id}`, filters);
  const data = query.data;
  const order = data?.order;
  return (
    <WidgetState query={query}>
      {data && order && (
        <>
          <div className="grid grid-cols-3 items-center gap-3">
            <VehicleImage label={order.label} priority />
            <div className="col-span-2 min-w-0">
              <Badge value={order.status} />
              <h3 className="mt-2 text-lg font-semibold">{order.label}</h3>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{order.vin}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {order.customer} · {order.branch}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-container border border-border bg-background p-4">
            {[
              ['Invoice', order.invoice_reference],
              ['Order value', money(order.total)],
              ['Paid settlements', money(order.paid)],
              ['Outstanding', money(order.outstanding)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link className={drillStyle} to={`/orders/${order.id}`}>
              Open order #{order.id} →
            </Link>
            <Link className={drillStyle} to={`/vehicles/${order.vehicle_id}`}>
              Inventory VIN →
            </Link>
            <Link className={drillStyle} to={`/bookings/${order.booking_id}`}>
              Booking #{order.booking_id} →
            </Link>
          </div>
          <JourneyPath order={order} />
          <JourneyChecklist data={data} />
          <p className="mt-4 text-xs text-muted-foreground">
            Latest recorded milestone: {date(data.latestMilestone)} · Entity timestamps, not a
            complete audit trail.
          </p>
        </>
      )}
    </WidgetState>
  );
}
