import { Activity } from 'lucide-react';
import { bucketRange, useAnalytics } from '../../lib/command-data';
import type {
  CommandActions,
  QueryFilters,
  TrendData,
  TrendPoint,
  SummaryData,
} from '../../lib/command-types';
import { Button, Select } from '../ui';
import { WidgetState, WidgetTitle, type QueryState } from './widget-state';
import { SupportingSignals } from './supporting-signals';
import { PulseTable } from './pulse-table';
import { PulseChart, pulseSeries, type PulseSeries } from './pulse-chart';
export function SalesPulse({
  filters,
  params,
  actions,
  summary,
}: {
  filters: QueryFilters;
  params: URLSearchParams;
  actions: CommandActions;
  summary: QueryState & { data?: SummaryData };
}) {
  const cash = params.get('pulse_view') === 'cash';
  const hidden = (params.get('pulse_hidden') || '').split(',');
  const available = pulseSeries.filter((item) =>
    cash ? item.key === 'payments' : item.key !== 'payments',
  );
  const series = available.filter((item) => !hidden.includes(item.key));
  const query = useAnalytics<TrendData>('trends', {
    ...filters,
    bucket: params.get('pulse_bucket') || 'day',
  });
  const open = (item: PulseSeries, point: TrendPoint) =>
    actions.openMetric(
      item.metric,
      bucketRange(point.bucket, query.data?.bucket || 'day', filters),
    );
  return (
    <>
      <WidgetTitle
        title="Sales & Cash Pulse"
        subtitle={
          cash
            ? 'INR · paid settlement date · compact axis'
            : 'Count of recorded creation / delivery events'
        }
        icon={<Activity size={20} aria-hidden="true" />}
      >
        <Select
          className="max-w-32"
          aria-label="Pulse bucket"
          value={params.get('pulse_bucket') || 'day'}
          onChange={(event) => actions.update({ pulse_bucket: event.target.value })}
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
        </Select>
      </WidgetTitle>
      <div className="mb-3 flex gap-2">
        <Button
          variant={cash ? 'secondary' : 'primary'}
          aria-pressed={!cash}
          onClick={() => actions.update({ pulse_view: 'volume', pulse_hidden: '' })}
        >
          Volume
        </Button>
        <Button
          variant={cash ? 'primary' : 'secondary'}
          aria-pressed={cash}
          onClick={() => actions.update({ pulse_view: 'cash', pulse_hidden: '' })}
        >
          Demo collections
        </Button>
      </div>
      <WidgetState
        query={query}
        empty={query.data?.points.length === 0}
        emptyText="No recorded events in this period. Broaden the event range."
      >
        {query.data && (
          <>
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Chart legend">
              {available.map((item) => (
                <button
                  key={item.key}
                  aria-pressed={!hidden.includes(item.key)}
                  disabled={!hidden.includes(item.key) && series.length === 1}
                  onClick={() =>
                    actions.update({
                      pulse_hidden: hidden.includes(item.key)
                        ? hidden.filter((key) => key !== item.key).join(',')
                        : [...hidden, item.key].filter(Boolean).join(','),
                    })
                  }
                  className={
                    'inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-2 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ' +
                    (hidden.includes(item.key) ? 'opacity-50' : '')
                  }
                >
                  <span
                    className={`size-2 rounded-full bg-current ${item.color}`}
                    aria-hidden="true"
                  />
                  {item.label}
                </button>
              ))}
            </div>
            <PulseChart points={query.data.points} series={series} cash={cash} open={open} />
            <p
              className={
                'mt-2 text-xs leading-relaxed ' +
                (query.data.historyAvailable ? 'text-muted-foreground' : 'text-warning')
              }
            >
              {query.data.note}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              No conversion-rate claim. Weekly buckets include only events inside the selected
              period. Select a point or source-record link to inspect.
            </p>
            <PulseTable data={query.data} series={series} cash={cash} open={open} />
          </>
        )}
      </WidgetState>
      <SupportingSignals query={summary} actions={actions} />
    </>
  );
}
