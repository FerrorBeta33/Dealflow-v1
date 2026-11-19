import type { ReactNode } from 'react';
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import { Button, ErrorBox } from '../ui';

export interface QueryState {
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => unknown;
  data?: unknown;
}
export function WidgetState({
  query,
  children,
  empty,
  emptyText = 'No records match this scope.',
}: {
  query: QueryState;
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  const asOf =
    query.data &&
    typeof query.data === 'object' &&
    'asOf' in query.data &&
    typeof query.data.asOf === 'string'
      ? query.data.asOf
      : '';
  return (
    <>
      {query.isFetching && !query.isPending && (
        <p role="status" className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw size={12} aria-hidden="true" /> Refreshing · previous data remains visible
        </p>
      )}
      <ErrorBox error={query.error} retry={() => void query.refetch()} />
      {query.error && query.data && (
        <p className="my-2 text-xs text-warning">
          Refresh failed. Showing the last successful data.
        </p>
      )}
      {query.isPending ? (
        <div role="status" aria-label="Loading widget" className="space-y-3 py-4">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-8 rounded-control bg-muted motion-safe:animate-pulse" />
          ))}
        </div>
      ) : query.data ? (
        empty ? (
          <p className="flex min-h-32 items-center justify-center gap-3 p-4 text-sm text-muted-foreground">
            <BarChart3 size={22} aria-hidden="true" /> {emptyText}
          </p>
        ) : (
          children
        )
      ) : !query.error ? (
        <p className="flex items-center gap-2 py-6 text-sm text-warning">
          <AlertCircle size={18} aria-hidden="true" /> Data unavailable for this scope.
        </p>
      ) : null}
      {asOf && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last successful load{' '}
          {new Date(asOf).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </p>
      )}
    </>
  );
}
export function WidgetTitle({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control border border-primary/10 bg-accent text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </header>
  );
}
export function PageControls({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Analytics pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
    >
      <span className="text-xs text-muted-foreground">
        Page {page} of {pages} · {total} records
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
export const drillStyle =
  'inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-semibold text-primary ' +
  'transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring';
