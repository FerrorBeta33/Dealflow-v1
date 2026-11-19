import type { TrendData, TrendPoint } from '../../lib/command-types';
import { metricNumber } from '../../lib/command-data';
import { pulseDate, type PulseSeries } from './pulse-chart';
import { ChartData } from './chart-data';
export function PulseTable({
  data,
  series,
  cash,
  open,
}: {
  data: TrendData;
  series: PulseSeries[];
  cash: boolean;
  open: (item: PulseSeries, point: TrendPoint) => void;
}) {
  return (
    <ChartData
      caption={`${cash ? 'Demo settlements in INR' : 'Recorded event counts'} by ${data.bucket} (IST)`}
      columns={['Bucket', ...series.map((item) => item.label), 'Source records']}
      rows={data.points.map((point) => ({
        key: point.bucket,
        cells: [
          pulseDate(point.bucket),
          ...series.map((item) => metricNumber(point[item.key], cash ? 'paise' : 'count')),
          <div className="flex flex-wrap gap-2">
            {series.map((item) => (
              <button
                key={item.key}
                className="min-h-11 text-primary"
                onClick={() => open(item, point)}
              >
                {item.label} →
              </button>
            ))}
          </div>,
        ],
      }))}
    />
  );
}
