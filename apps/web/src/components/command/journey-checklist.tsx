import { Link } from 'react-router-dom';
import { can, money } from '../../../../../shared/domain.js';
import { useAuth } from '../../lib/auth';
import type { JourneyData } from '../../lib/command-types';
import { Badge } from '../ui';
import { drillStyle } from './widget-state';
export function JourneyChecklist({ data }: { data: JourneyData }) {
  const { employee } = useAuth();
  const { order } = data;
  return (
    <section className="mt-5 space-y-4 border-t border-border pt-4">
      <div>
        <h3 className="text-sm font-semibold">Mandatory document gates</h3>
        <ul className="mt-2 space-y-2">
          {(['identity', 'address'] as const).map((type) => (
            <li
              key={type}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-background p-3 text-sm"
            >
              <span className="font-medium capitalize">{type}</span>
              <Badge value={order.readiness[type] ? 'verified' : 'missing'} />
              <span className="w-full text-xs text-muted-foreground">
                {data.documents
                  .filter((document) => document.type === type)
                  .map((document) => `${document.count} ${document.status}`)
                  .join(' · ') || 'No upload recorded'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Any verified document of each required type satisfies the existing backend rule.
          Insurance/registration are not delivery gates.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Payment state</h3>
        <p className="mt-2 text-sm">
          {money(order.pending)} pending requests · pending does not reduce outstanding.
        </p>
        <ul className="mt-1 text-xs text-muted-foreground">
          {data.paymentStates.map((state) => (
            <li key={state.status}>
              {state.count} {state.status} · {money(state.amount)}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-control border border-border bg-background p-3">
        <p className="text-sm font-semibold">
          {order.status === 'delivered'
            ? 'Delivery completed'
            : data.ready
              ? 'Ready for handover'
              : 'Delivery blocked'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.ready
            ? 'Financial and required document gates satisfied.'
            : order.status === 'delivered'
              ? 'This VIN is sold and cannot be booked again.'
              : `${order.outstanding > 0 ? 'Settle the outstanding balance. ' : ''}${!order.identity || !order.address ? 'Verify identity and address. ' : ''}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className={drillStyle} to={`/orders/${order.id}/payments`}>
          {can(employee?.role, 'approve') && order.pending > 0 ? 'Settle payment' : 'View payments'}{' '}
          →
        </Link>
        <Link className={drillStyle} to={`/orders/${order.id}/documents`}>
          {can(employee?.role, 'approve')
            ? 'Review documents'
            : can(employee?.role, 'sales')
              ? 'Upload documents'
              : 'View documents'}{' '}
          →
        </Link>
        <Link className={drillStyle} to={`/orders/${order.id}/delivery`}>
          {can(employee?.role, 'approve') && data.ready
            ? 'Complete delivery'
            : 'View delivery gates'}{' '}
          →
        </Link>
      </div>
    </section>
  );
}
