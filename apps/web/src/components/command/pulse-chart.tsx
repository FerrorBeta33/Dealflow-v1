import type { TrendPoint } from '../../lib/command-types';
import { metricNumber } from '../../lib/command-data';
export type SeriesKey = 'bookings' | 'orders' | 'deliveries' | 'payments';
export interface PulseSeries {
  key: SeriesKey;
  metric: string;
  label: string;
  color: string;
}
export const pulseSeries: PulseSeries[] = [
  { key: 'bookings', metric: 'bookingsCreated', label: 'Bookings created', color: 'text-chart-1' },
  { key: 'orders', metric: 'ordersCreated', label: 'Orders created', color: 'text-chart-2' },
  { key: 'deliveries', metric: 'delivered', label: 'Deliveries', color: 'text-chart-4' },
  { key: 'payments', metric: 'collected', label: 'Demo settlements', color: 'text-chart-1' },
];
export function pulseDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${date}T12:00:00.000Z`));
}
export function PulseChart({
  points,
  series,
  cash,
  open,
}: {
  points: TrendPoint[];
  series: PulseSeries[];
  cash: boolean;
  open: (series: PulseSeries, point: TrendPoint) => void;
}) {
  const max = Math.max(1, ...points.flatMap((point) => series.map((item) => point[item.key])));
  const x = (index: number) =>
    points.length === 1 ? 264 : 56 + (index / (points.length - 1)) * 412;
  const y = (value: number) => 150 - (value / max) * 126;
  return (
    <svg
      viewBox="0 0 480 185"
      className="w-full overflow-visible motion-safe:animate-enter"
      role="group"
      aria-label={`${cash ? 'Demo paid settlements in INR' : 'Booking, order and delivery counts'} by recorded bucket. Interactive points and data table open source records.`}
    >
      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line
            x1="56"
            x2="468"
            y1={y(max * fraction)}
            y2={y(max * fraction)}
            className="stroke-border"
            strokeDasharray="3 4"
          />
          <text
            x="48"
            y={y(max * fraction) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-xs"
          >
            {cash
              ? new Intl.NumberFormat('en-IN', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format((max * fraction) / 100)
              : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(max * fraction)}
          </text>
        </g>
      ))}
      {series.map((item) => (
        <g key={item.key} className={item.color}>
          <path
            d={points
              .map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point[item.key])}`)
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <g
              key={point.bucket}
              role="button"
              tabIndex={0}
              aria-label={`${item.label}, ${pulseDate(point.bucket)}: ${metricNumber(point[item.key], cash ? 'paise' : 'count')}. View records.`}
              onClick={() => open(item, point)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open(item, point);
                }
              }}
              className="cursor-pointer focus:outline-2 focus:outline-primary"
            >
              <circle cx={x(index)} cy={y(point[item.key])} r="14" fill="transparent" />
              <circle
                cx={x(index)}
                cy={y(point[item.key])}
                r="4"
                fill="var(--color-card)"
                stroke="currentColor"
                strokeWidth="2"
              />
              <title>
                {item.label} · {pulseDate(point.bucket)} ·{' '}
                {metricNumber(point[item.key], cash ? 'paise' : 'count')}
              </title>
            </g>
          ))}
        </g>
      ))}
      {points.length > 0 && (
        <text x="56" y="178" className="fill-muted-foreground text-xs">
          {pulseDate(points[0].bucket)}
        </text>
      )}
      {points.length > 1 && (
        <text x="468" y="178" textAnchor="end" className="fill-muted-foreground text-xs">
          {pulseDate(points[points.length - 1].bucket)}
        </text>
      )}
    </svg>
  );
}
