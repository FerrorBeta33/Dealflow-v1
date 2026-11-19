import { ArrowRight, GitBranch } from 'lucide-react';
import { stages } from '../../../../../shared/command-center.js';
import type { CommandActions, SummaryData } from '../../lib/command-types';
import { CommandIcon } from './command-icons';
import { WidgetState, WidgetTitle, type QueryState } from './widget-state';
export function JourneyPanel({
  query,
  actions,
  selected,
}: {
  query: QueryState & { data?: SummaryData };
  actions: CommandActions;
  selected: string;
}) {
  const values = new Map(query.data?.metrics.map((metric) => [metric.id, metric]));
  return (
    <>
      <WidgetTitle
        title="VIN → delivery"
        subtitle="Connected execution · select a stage to inspect records"
        icon={<GitBranch size={20} aria-hidden="true" />}
      />
      <WidgetState query={query}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage, index) => (
            <div key={stage.metric} className="relative min-w-0">
              <button
                onClick={() => actions.openMetric(stage.metric)}
                aria-pressed={selected === stage.metric}
                className={
                  'group flex min-h-36 w-full flex-col items-center justify-center rounded-container border px-2 py-4 text-center transition duration-200 ' +
                  'hover:border-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ' +
                  (selected === stage.metric
                    ? 'border-primary bg-accent'
                    : 'border-border bg-background/50')
                }
              >
                <span className="mb-3 grid size-10 place-items-center rounded-full border border-primary/20 bg-card text-primary shadow-control">
                  <CommandIcon name={stage.icon} size={19} />
                </span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {values.get(stage.metric)?.value ?? '—'}
                </span>
                <span className="mt-1 text-xs font-semibold">{stage.title}</span>
                <span className="mt-1 text-xs text-muted-foreground">{stage.subtitle}</span>
              </button>
              {index < stages.length - 1 && (
                <span
                  className="pointer-events-none absolute -right-4 top-1/2 z-10 hidden w-4 items-center text-primary/50 xl:flex"
                  aria-hidden="true"
                >
                  <ArrowRight size={16} />
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          {[
            ['paymentBlocked', 'payment blocked'],
            ['documentBlocked', 'paid · docs blocked'],
            ['ready', 'ready for handover'],
          ].map(([metric, text]) => (
            <button
              key={metric}
              onClick={() => actions.openMetric(metric)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <CommandIcon name={metric} size={14} />
              {values.get(metric)?.value ?? '—'} {text}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Stage dimensions overlap, not a conversion funnel. Paid and verified are independent.
          Current work is a snapshot; delivered uses the selected period.
        </p>
      </WidgetState>
    </>
  );
}
