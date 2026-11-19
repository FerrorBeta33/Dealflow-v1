import type { ReactNode } from 'react';
import { drillStyle } from './widget-state';
export function ChartData({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <details className="mt-3 border-t border-border pt-1">
      <summary className={`${drillStyle} cursor-pointer text-xs`}>View chart data</summary>
      <div className="overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
        <table className="w-full text-left text-xs">
          <caption className="mb-3 text-left text-muted-foreground">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className="px-2 py-2 font-medium text-muted-foreground"
                  key={column}
                  scope="col"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                {row.cells.map((cell, index) => (
                  <td key={columns[index]} className="px-2 py-2 tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
