import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Order, Page, PaymentEntry } from '../lib/types';
import { can, money, date, paymentStatuses } from '../../../../shared/domain.js';
import { Badge, ErrorBox, Loading, panel } from './ui';
import { WorkflowAction } from './workflow-action';
import { ListFilters } from './list-filters';
import { Pagination } from './record-table';
export function PaymentsPanel({ order }: { order: Order }) {
  const { employee } = useAuth();
  const [params] = useSearchParams();
  const query = useQuery({
    queryKey: ['payments', order.id, params.toString()],
    queryFn: () => api<Page<PaymentEntry>>(`/orders/${order.id}/payments?${params}`),
  });
  return (
    <section className="space-y-6 print:hidden">
      <div className={`${panel} flex flex-wrap items-start justify-between gap-6`}>
        <div>
          <h2 className="text-xl font-semibold">Payment requests</h2>
          <p className="mt-2 text-muted-foreground">
            Manual demo settlement. No actual funds are collected.
          </p>
          <dl className="mt-4 flex flex-wrap gap-6">
            {[
              ['Settled', order.readiness.paid],
              ['Pending', order.readiness.pending],
              ['Outstanding', order.readiness.outstanding],
              ['Can request', order.readiness.requestable],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-2 font-semibold tabular-nums">{money(Number(value))}</dd>
              </div>
            ))}
          </dl>
        </div>
        {can(employee?.role, 'sales') && order.status === 'open' && (
          <WorkflowAction
            title="Add payment request"
            path={`/orders/${order.id}/payments`}
            disabled={order.readiness.requestable <= 0}
            fields={[
              { key: 'amount', label: 'Amount (₹)', type: 'money' },
              { key: 'note', label: 'Payment note', optional: true },
            ]}
          >
            <p>
              Maximum request: {money(order.readiness.requestable)}. Pending requests reserve part
              of the total; they are not settled payments.
            </p>
          </WorkflowAction>
        )}
      </div>
      <ListFilters filters={[{ key: 'status', label: 'Status', options: paymentStatuses }]} />
      <ErrorBox error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="space-y-4">
              {!query.data.items.length && (
                <p className={panel}>No payment requests match. Add a request or clear filters.</p>
              )}
              {query.data.items.map((payment) => (
                <article
                  key={payment.id}
                  className={`${panel} flex flex-wrap items-center justify-between gap-4`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">
                        Request #{payment.id} · {money(payment.amount)}
                      </h3>
                      <Badge value={payment.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {payment.note || 'No payment note'} · {date(payment.created_at)}
                    </p>
                  </div>
                  {payment.status === 'pending' && order.status === 'open' && (
                    <div className="flex flex-wrap gap-3">
                      {can(employee?.role, 'approve') && (
                        <WorkflowAction
                          title={`Mark #${payment.id} paid`}
                          path={`/payments/${payment.id}/settle`}
                        >
                          <p>
                            Confirm manual receipt of {money(payment.amount)}? A settled request
                            cannot be settled or cancelled again.
                          </p>
                        </WorkflowAction>
                      )}
                      {can(employee?.role, 'sales') && (
                        <WorkflowAction
                          title={`Cancel request #${payment.id}`}
                          danger
                          path={`/payments/${payment.id}/cancel`}
                        >
                          <p>
                            Cancel this pending request for {money(payment.amount)}? Settled
                            payments are not affected.
                          </p>
                        </WorkflowAction>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <Pagination data={query.data} />
          </>
        )
      )}
    </section>
  );
}
