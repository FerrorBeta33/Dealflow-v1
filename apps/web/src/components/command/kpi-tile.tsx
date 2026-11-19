import { Info, ArrowUpRight } from 'lucide-react';
import type { Metric } from '../../lib/command-types';
import { metricNumber } from '../../lib/command-data';
import { CommandIcon } from './command-icons';
export function KpiTile({
  metric,
  asOf,
  scope,
  open,
}: {
  metric: Metric;
  asOf: string;
  scope: string;
  open: () => void;
}) {
  return (
    <article className="relative min-w-0 rounded-container border border-border bg-card p-4 shadow-control transition hover:border-primary/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-control bg-accent text-primary">
          <CommandIcon name={metric.id} size={17} />
        </span>
        <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          {metric.label}
        </span>
        <details className="group relative">
          <summary
            aria-label={`How calculated: ${metric.label}`}
            className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-control text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Info size={16} aria-hidden="true" />
          </summary>
          <div className="absolute right-0 top-full z-20 w-64 max-w-screen rounded-control border border-border bg-card p-4 text-xs leading-relaxed shadow-xl">
            <p className="mb-2 font-semibold">How calculated</p>
            <p>{metric.formula}</p>
            <p className="mt-2">
              {metric.basis} · {scope} · {metric.records} records
            </p>
            <p className="mt-2">
              Refreshed {new Date(asOf).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
              IST
            </p>
            <p className="mt-2 text-muted-foreground">{metric.comparisonNote}</p>
          </div>
        </details>
      </div>
      <button
        onClick={open}
        aria-label={`${metric.label}: ${metricNumber(metric.value, metric.unit)}. View source records.`}
        className="group block w-full rounded-control text-left focus-visible:outline-2 focus-visible:outline-ring"
      >
        <strong
          key={metric.value}
          className="flex items-center justify-between gap-1 break-words text-xl font-semibold tracking-tight tabular-nums motion-safe:animate-enter 2xl:text-2xl"
        >
          {metricNumber(metric.value, metric.unit)}
          <ArrowUpRight size={14} className="shrink-0 text-primary" aria-hidden="true" />
        </strong>
        <span className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span
            className={`size-1.5 rounded-full ${metric.id === 'ready' ? 'bg-success' : 'bg-primary'}`}
          />
          {metric.unit === 'paise' ? 'INR' : metric.unit} ·{' '}
          {metric.basis === 'Snapshot now' ? 'Now' : 'Period'}
        </span>
      </button>
    </article>
  );
}
