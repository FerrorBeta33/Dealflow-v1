import { Link } from 'react-router-dom';
import { CircleCheck, Circle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { Order } from '../lib/types';
import { can, money, date } from '../../../../shared/domain.js';
import { panel } from './ui';
import { linkStyle } from './record-table';
import { WorkflowAction } from './workflow-action';
export function DeliveryPanel({ order }: { order: Order }) {
  const { employee } = useAuth();
  const gates = [
    {
      label: `Balance settled · ${money(order.outstanding)} outstanding`,
      pass: order.outstanding === 0,
      path: 'payments',
    },
    { label: 'Identity document verified', pass: order.readiness.identity, path: 'documents' },
    { label: 'Address document verified', pass: order.readiness.address, path: 'documents' },
  ];
  const ready = gates.every((gate) => gate.pass);
  return (
    <section className={`${panel} space-y-6 print:hidden`}>
      <div>
        <h2 className="text-xl font-semibold">Delivery readiness</h2>
        <p className="mt-2 text-muted-foreground">
          Payment and mandatory document gates must all be satisfied.
        </p>
      </div>
      <ul className="space-y-3">
        {gates.map((gate) => (
          <li key={gate.label} className="flex items-center gap-3">
            {gate.pass ? (
              <CircleCheck className="shrink-0 text-success" size={20} />
            ) : (
              <Circle className="shrink-0 text-warning" size={20} />
            )}
            <Link className={linkStyle} to={`/orders/${order.id}/${gate.path}`}>
              {gate.pass ? 'Complete' : 'Required'} · {gate.label}
            </Link>
          </li>
        ))}
      </ul>
      {order.status === 'delivered' ? (
        <p role="status" className="rounded-control bg-success/10 p-4 text-success">
          Delivered on {date(order.delivered_at)}. The VIN is sold and all document changes are
          locked.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {ready
              ? 'All gates passed. A branch manager or admin can complete delivery.'
              : 'Complete the outstanding steps above to unlock delivery.'}
          </p>
          {can(employee?.role, 'approve') ? (
            <WorkflowAction
              title="Complete delivery"
              path={`/orders/${order.id}/deliver`}
              disabled={!ready}
            >
              <p>
                Complete delivery of VIN {order.vin} to {order.customer}? This marks the vehicle
                sold and permanently freezes this order’s documents.
              </p>
            </WorkflowAction>
          ) : (
            <p className="text-sm text-muted-foreground">
              Delivery completion requires a branch manager or admin.
            </p>
          )}
        </>
      )}
    </section>
  );
}
