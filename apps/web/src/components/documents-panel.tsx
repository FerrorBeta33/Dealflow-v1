import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { DocumentEntry, Order, Page } from '../lib/types';
import { can, date, documentTypes, reviewStatuses } from '../../../../shared/domain.js';
import { Badge, ErrorBox, Loading, panel } from './ui';
import { WorkflowAction } from './workflow-action';
import { ListFilters } from './list-filters';
import { Pagination } from './record-table';
import { DocumentUpload } from './document-upload';
import { DocumentView } from './document-view';
export function DocumentsPanel({ order }: { order: Order }) {
  const [params] = useSearchParams();
  const { employee } = useAuth();
  const query = useQuery({
    queryKey: ['documents', order.id, params.toString()],
    queryFn: () => api<Page<DocumentEntry>>(`/orders/${order.id}/documents?${params}`),
  });
  return (
    <section className="space-y-6 print:hidden">
      <div>
        <h2 className="text-xl font-semibold">Order documents</h2>
        <p className="mt-2 text-muted-foreground">
          Verified identity and address are required for delivery. Insurance and registration are
          optional.
        </p>
      </div>
      {order.status === 'delivered' ? (
        <p className={panel}>Delivered order: uploads and review decisions are locked.</p>
      ) : (
        can(employee?.role, 'sales') && <DocumentUpload orderId={order.id} />
      )}
      <ListFilters
        filters={[
          { key: 'type', label: 'Category', options: documentTypes },
          { key: 'status', label: 'Review status', options: reviewStatuses },
        ]}
      />
      <ErrorBox error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <div className="space-y-4">
              {!query.data.items.length && (
                <p className={panel}>No documents match. Upload a file or clear filters.</p>
              )}
              {query.data.items.map((document) => (
                <article key={document.id} className={`${panel} space-y-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="break-all font-semibold capitalize">
                        {document.type} · {document.filename}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Uploaded {date(document.created_at)}
                        {document.reviewed_at ? ` · Reviewed ${date(document.reviewed_at)}` : ''}
                      </p>
                    </div>
                    <Badge value={document.status} />
                  </div>
                  {document.note && (
                    <p className="text-sm text-muted-foreground">Review: {document.note}</p>
                  )}
                  <div className="flex flex-wrap items-start gap-3">
                    <DocumentView document={document} />
                    {can(employee?.role, 'approve') &&
                      order.status === 'open' &&
                      document.status !== 'rejected' && (
                        <WorkflowAction
                          title={`Review ${document.type} #${document.id}`}
                          path={`/documents/${document.id}/review`}
                          method="PATCH"
                          fields={[
                            { key: 'status', label: 'Decision', options: ['verified', 'rejected'] },
                            { key: 'note', label: 'Review note', optional: true },
                          ]}
                        >
                          <p>
                            Inspect the file before verifying. Only the latest upload can satisfy
                            delivery requirements.
                          </p>
                        </WorkflowAction>
                      )}
                    {can(employee?.role, 'approve') &&
                      order.status === 'open' &&
                      document.status === 'rejected' &&
                      document.note !== 'Superseded by a newer upload' && (
                        <WorkflowAction
                          title={`Re-review ${document.type} #${document.id}`}
                          path={`/documents/${document.id}/review`}
                          method="PATCH"
                          fields={[
                            { key: 'status', label: 'Decision', options: ['verified', 'rejected'] },
                            { key: 'note', label: 'Review note', optional: true },
                          ]}
                        />
                      )}
                  </div>
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
