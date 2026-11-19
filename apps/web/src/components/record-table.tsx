import { Link, useSearchParams } from 'react-router-dom';
import type { EntityConfig, Page } from '../lib/types';
import { money, date } from '../../../../shared/domain.js';
import { Badge, Button } from './ui';
import { VehicleImage } from './vehicle-image';
export const linkStyle =
  'inline-flex min-h-12 items-center font-medium text-primary underline-offset-4 hover:underline ' +
  'focus-visible:outline-2 focus-visible:outline-ring';
export function Pagination({ data }: { data: Page }) {
  const [params, setParams] = useSearchParams();
  function go(page: number) {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    setParams(next);
  }
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <span>
        Showing {data.total ? (data.page - 1) * data.limit + 1 : 0}–
        {Math.min(data.page * data.limit, data.total)} of {data.total}
      </span>
      <div className="flex items-center gap-4">
        <Button variant="secondary" disabled={data.page <= 1} onClick={() => go(data.page - 1)}>
          Previous
        </Button>
        <span aria-current="page">
          Page {data.page} of {data.pages}
        </span>
        <Button
          variant="secondary"
          disabled={data.page >= data.pages}
          onClick={() => go(data.page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
export function RecordTable({
  data,
  config,
  entity,
  canEdit,
}: {
  data: Page;
  config: EntityConfig;
  entity: string;
  canEdit: boolean;
}) {
  if (!data.items.length)
    return (
      <div className="rounded-container border border-dashed border-border bg-card p-8 text-center">
        <p>No {config.title.toLowerCase()} found. Add a record or clear your filters.</p>
      </div>
    );
  return (
    <>
      <div
        role="region"
        aria-label={`${config.title} table, scrollable`}
        tabIndex={0}
        className="overflow-x-auto rounded-container border border-border bg-card shadow-surface"
      >
        <table className="w-full whitespace-nowrap text-left text-sm">
          <caption className="sr-only">
            {config.title}. Vehicle artwork is representative, not exact model or VIN condition
            imagery.
          </caption>
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {config.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`p-4 font-semibold ${column.format === 'money' ? 'text-right' : ''}`}
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="p-4">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-border transition-colors hover:bg-accent/40"
              >
                {config.columns.map((column) => (
                  <td
                    key={column.key}
                    className={`p-4 ${column.format === 'money' ? 'text-right tabular-nums' : ''}`}
                  >
                    {column.key === 'label' ? (
                      <div className="flex items-center gap-3">
                        <VehicleImage label={String(item.label)} compact />
                        <span>{String(item.label)}</span>
                      </div>
                    ) : column.format === 'status' ? (
                      <Badge value={String(item[column.key])} />
                    ) : column.format === 'money' ? (
                      money(Number(item[column.key]))
                    ) : column.format === 'date' ? (
                      date(String(item[column.key]))
                    ) : (
                      String(item[column.key] || '—')
                    )}
                  </td>
                ))}
                <td className="p-4">
                  <div className="flex gap-4">
                    <Link className={linkStyle} to={`/${entity}/${item.id}`}>
                      View
                      <span className="sr-only"> {String(item.label || item.name || item.id)}</span>
                    </Link>
                    {canEdit &&
                      (entity !== 'vehicles' ||
                        ['available', 'in_transit'].includes(String(item.status))) && (
                        <Link className={linkStyle} to={`/${entity}/${item.id}/edit`}>
                          Edit
                          <span className="sr-only">
                            {' '}
                            {String(item.label || item.name || item.id)}
                          </span>
                        </Link>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination data={data} />
    </>
  );
}
