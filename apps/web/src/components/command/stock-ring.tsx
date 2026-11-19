import type { StockData } from '../../lib/command-types';
const strokes: Record<string, string> = {
  available: 'stroke-primary',
  reserved: 'stroke-warning',
  in_transit: 'stroke-info',
  sold: 'stroke-muted-foreground',
};
export function StockRing({
  distribution,
  total,
  open,
}: {
  distribution: StockData['distribution'];
  total: number;
  open: (status: string) => void;
}) {
  return (
    <div className="relative mx-auto w-44">
      <svg
        viewBox="0 0 180 180"
        className="w-full"
        role="group"
        aria-label={`Stock distribution: ${total} VINs. Use the legend or data table to inspect records.`}
      >
        <circle cx="90" cy="90" r="65" fill="none" strokeWidth="20" className="stroke-muted" />
        {distribution.map((item, index) => {
          const length = total ? (item.count / total) * 100 : 0;
          const preceding = distribution.slice(0, index).reduce((sum, entry) => sum + entry.count, 0);
          const position = total ? (preceding / total) * 100 : 0;
          return (
            <circle
              key={item.status}
              cx="90"
              cy="90"
              r="65"
              fill="none"
              pathLength="100"
              strokeWidth="20"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-position}
              transform="rotate(-90 90 90)"
              onClick={() => open(item.status)}
              role="button"
              tabIndex={0}
              aria-label={`${item.status}: ${item.count} VINs. View records.`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open(item.status);
                }
              }}
              className={`${strokes[item.status]} cursor-pointer transition duration-300 hover:opacity-70 focus:outline-2 focus:outline-primary motion-reduce:transition-none`}
            >
              <title>
                {item.status}: {item.count} VINs
              </title>
            </circle>
          );
        })}
        <text x="90" y="88" textAnchor="middle" className="fill-foreground text-3xl font-semibold">
          {total}
        </text>
        <text x="90" y="111" textAnchor="middle" className="fill-muted-foreground text-xs">
          stock VINs
        </text>
      </svg>
    </div>
  );
}
