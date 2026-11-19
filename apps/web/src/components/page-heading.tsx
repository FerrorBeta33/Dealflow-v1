import type { ReactNode } from 'react';
export function Loading() {
  return (
    <div role="status" aria-label="Loading records" className="space-y-3">
      {['a', 'b', 'c', 'd'].map((key) => (
        <div
          key={key}
          className="h-12 animate-pulse rounded-control bg-muted motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-balance font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-pretty text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </header>
  );
}
