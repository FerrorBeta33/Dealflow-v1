import { Link, NavLink, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Order } from '../lib/types';
import { money, date } from '../../../../shared/domain.js';
import { Badge, ErrorBox, Loading, PageHeading, panel } from '../components/ui';
import { linkStyle } from '../components/record-table';
import { PaymentsPanel } from '../components/payments-panel';
import { DocumentsPanel } from '../components/documents-panel';
import { DeliveryPanel } from '../components/delivery-panel';
import { InvoicePanel } from '../components/invoice-panel';
import { VehicleImage } from '../components/vehicle-image';
export function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const tab = location.pathname.split('/')[3] || 'overview';
  const query = useQuery({ queryKey: ['orders', id], queryFn: () => api<Order>(`/orders/${id}`) });
  if (query.isPending) return <Loading />;
  if (!query.data) return <ErrorBox error={query.error} retry={() => void query.refetch()} />;
  const order = query.data;
  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <Link className={linkStyle} to="/orders">
          ← Sales orders
        </Link>
        <PageHeading
          title={`Sales order #${order.id}`}
          subtitle={`${order.customer} · ${order.label}`}
        >
          <Badge value={order.status} />
        </PageHeading>
        <div className="flex flex-wrap items-center gap-3">
          <VehicleImage label={order.label} compact />
          <p className="text-xs text-muted-foreground">
            <span className="block break-all font-mono">{order.vin}</span>
            Representative vehicle illustration—not condition evidence
          </p>
        </div>
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
        <ol
          aria-label="Order progress"
          className="flex flex-wrap gap-3 rounded-container border border-border bg-card p-4 text-sm"
        >
          <li>✓ Booking confirmed</li>
          <li>→ Sales order & invoice</li>
          <li>{order.outstanding === 0 ? '✓' : '○'} Payment settled</li>
          <li>
            {order.readiness.identity && order.readiness.address ? '✓' : '○'} Documents verified
          </li>
          <li>{order.status === 'delivered' ? '✓' : '○'} Delivered</li>
        </ol>
        <nav
          aria-label="Order sections"
          className="flex flex-wrap gap-2 rounded-container border border-border bg-card p-2 shadow-control"
        >
          {['overview', 'invoice', 'payments', 'documents', 'delivery'].map((item) => (
            <NavLink
              key={item}
              end
              to={`/orders/${id}${item === 'overview' ? '' : `/${item}`}`}
              className={({ isActive }) =>
                'min-h-12 rounded-control px-4 py-3 font-medium capitalize ' +
                (isActive
                  ? 'bg-primary text-primary-foreground shadow-control'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
              }
            >
              {item}
            </NavLink>
          ))}
        </nav>
      </div>
      {tab === 'overview' ? (
        <>
          <section className={`${panel} print:hidden`}>
            <h2 className="text-xl font-semibold">Order summary</h2>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Customer', order.customer],
                ['Phone', order.phone],
                ['VIN', order.vin],
                ['Vehicle', order.label],
                ['Branch', order.branch],
                ['Created', date(order.created_at)],
                ['Base price', money(order.base_price)],
                ['Demo extras', money(order.extras)],
                ['Demo tax', money(order.tax)],
                ['Total', money(order.total)],
                ['Paid', money(order.paid)],
                ['Outstanding', money(order.outstanding)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-2 break-words font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-6">
              <Link className={linkStyle} to={`/customers/${order.customer_id}`}>
                View customer →
              </Link>
              <Link className={linkStyle} to={`/bookings/${order.booking_id}`}>
                View booking →
              </Link>
              <Link className={linkStyle} to={`/orders/${id}/invoice`}>
                {order.invoice_reference} →
              </Link>
            </div>
          </section>
          <DeliveryPanel order={order} />
        </>
      ) : tab === 'invoice' ? (
        <InvoicePanel order={order} />
      ) : tab === 'payments' ? (
        <PaymentsPanel order={order} />
      ) : tab === 'documents' ? (
        <DocumentsPanel order={order} />
      ) : tab === 'delivery' ? (
        <DeliveryPanel order={order} />
      ) : (
        <ErrorBox error="This order section does not exist." />
      )}
    </div>
  );
}
