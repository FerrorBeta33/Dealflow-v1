import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { configs } from '../lib/entity-config';
import type { Entity, Entry } from '../lib/types';
import { can } from '../../../../shared/domain.js';
import { ErrorBox, Loading, PageHeading, panel } from '../components/ui';
import { linkStyle } from '../components/record-table';
import { WorkflowAction } from '../components/workflow-action';
import { EntityFacts } from '../components/entity-facts';
export function EntityDetail({ entity }: { entity: Entity }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { employee } = useAuth();
  const record = useQuery({
    queryKey: [entity, id],
    queryFn: () => api<Entry>(`/${entity}/${id}`),
  });
  if (record.isPending) return <Loading />;
  if (!record.data) return <ErrorBox error={record.error} retry={() => void record.refetch()} />;
  const item = record.data;
  const config = configs[entity];
  const editable =
    can(employee?.role, config.action) &&
    ['models', 'vehicles', 'customers'].includes(entity) &&
    (entity !== 'vehicles' || ['available', 'in_transit'].includes(String(item.status)));
  return (
    <div className="space-y-6">
      <Link className={linkStyle} to={`/${entity}`}>
        ← {config.title}
      </Link>
      <PageHeading
        title={String(item.label || item.name || `Booking #${id}`)}
        subtitle={`Saved ${config.singular} · #${id}`}
      >
        {editable && (
          <Link className={linkStyle} to={`/${entity}/${id}/edit`}>
            Edit {config.singular}
          </Link>
        )}
      </PageHeading>
      {location.state?.message && (
        <p role="status" className="text-success">
          {String(location.state.message)}
        </p>
      )}
      <ErrorBox error={record.error} retry={() => void record.refetch()} />
      <EntityFacts entity={entity} config={config} item={item} />
      {entity === 'customers' && (
        <section className={`${panel} flex flex-wrap gap-6`}>
          <Link className={linkStyle} to={`/bookings?customer_id=${id}`}>
            View customer bookings →
          </Link>
          <Link className={linkStyle} to={`/orders?customer_id=${id}`}>
            View customer orders →
          </Link>
          {can(employee?.role, 'sales') && (
            <Link className={linkStyle} to="/bookings/new">
              Add booking →
            </Link>
          )}
        </section>
      )}
      {entity === 'vehicles' && item.status === 'available' && can(employee?.role, 'sales') && (
        <Link className={linkStyle} to="/bookings/new">
          Reserve this vehicle in a new booking →
        </Link>
      )}
      {entity === 'bookings' && (
        <section className={`${panel} flex flex-wrap gap-4`}>
          {item.order_id ? (
            <Link className={linkStyle} to={`/orders/${item.order_id}`}>
              View sales order →
            </Link>
          ) : item.status === 'confirmed' && can(employee?.role, 'sales') ? (
            <>
              <WorkflowAction
                title="Create sales order"
                path={`/bookings/${id}/convert`}
                fields={[
                  { key: 'extras', label: 'Demo extras (₹)', type: 'money', optional: true },
                  { key: 'tax', label: 'Demo tax (₹)', type: 'money', optional: true },
                ]}
                onSuccess={(order) => navigate(`/orders/${order.id}`)}
              >
                <p className="text-muted-foreground">
                  The backend captures the catalog price plus these explicit amounts. The invoice
                  amount is fixed once created.
                </p>
              </WorkflowAction>
              <WorkflowAction title="Cancel booking" danger path={`/bookings/${id}/cancel`}>
                <p>
                  Cancel booking #{id} and release VIN {String(item.vin)} back to available
                  inventory?
                </p>
              </WorkflowAction>
            </>
          ) : (
            <p className="text-muted-foreground">
              This booking has no available actions for your role or current status.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
