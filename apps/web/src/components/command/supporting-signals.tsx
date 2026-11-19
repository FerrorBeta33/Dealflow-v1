import { metricNumber } from '../../lib/command-data';
import type { CommandActions, SummaryData } from '../../lib/command-types';
import { WidgetState, drillStyle, type QueryState } from './widget-state';
export function SupportingSignals({
  query,
  actions,
}: {
  query: QueryState & { data?: SummaryData };
  actions: CommandActions;
}) {
  return (
    <details className="mt-3 border-t border-border pt-1">
      <summary className={`${drillStyle} cursor-pointer text-xs`}>
        Invoice & delivery context
      </summary>
      <WidgetState query={query}>
        <div className="grid gap-3 sm:grid-cols-3">
          {query.data?.metrics
            .filter((metric) => ['invoiced', 'delivered', 'cycle'].includes(metric.id))
            .map((metric) => (
              <button
                key={metric.id}
                onClick={() => actions.openMetric(metric.id)}
                className="rounded-control border border-border bg-background p-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="block text-xs text-muted-foreground">{metric.label}</span>
                <strong className="mt-2 block break-words text-base font-semibold tabular-nums">
                  {metricNumber(metric.value, metric.unit)}
                </strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {metric.unit === 'paise' ? 'INR' : metric.unit} · Period
                </span>
                <span className="mt-2 block text-xs font-medium text-primary">
                  Calculation & records →
                </span>
              </button>
            ))}
        </div>
      </WidgetState>
    </details>
  );
}
