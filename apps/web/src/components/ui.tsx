import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { Button } from './button';
export { Button };
export { Dialog } from './dialog';
export const control =
  'min-h-12 w-full rounded-control border border-border bg-card px-4 py-2 text-sm text-foreground shadow-control ' +
  'outline-none transition placeholder:text-muted-foreground/80 hover:border-primary/40 ' +
  'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-50';
export const panel = 'rounded-container border border-border bg-card p-6 shadow-surface';
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className || ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className || ''}`} />;
}
export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-2 text-sm font-medium">
        {label}
        {children}
      </label>
      {hint && <span className="text-sm font-normal text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  const style = ['available', 'verified', 'paid', 'delivered', 'sold'].includes(value)
    ? 'border-success/20 text-success bg-success/10'
    : ['cancelled', 'rejected'].includes(value)
      ? 'border-destructive/20 text-destructive bg-destructive/10'
      : ['pending', 'reserved', 'confirmed', 'in_transit'].includes(value)
        ? 'border-warning/20 text-warning bg-warning/10'
        : 'border-info/20 text-info bg-info/10';
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {value.replaceAll('_', ' ')}
    </span>
  );
}
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-control border border-destructive/40 bg-destructive/5 p-4 text-destructive"
    >
      {error instanceof Error ? error.message : String(error)}
      {retry && (
        <Button variant="secondary" className="ml-4" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}
export { PageHeading, Loading } from './page-heading';
