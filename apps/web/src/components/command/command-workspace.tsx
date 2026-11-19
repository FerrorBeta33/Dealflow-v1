import { useAnalytics, useCommandFilters } from '../../lib/command-data';
import { usePersonalLayout, type Preset } from '../../lib/command-layout';
import type { Employee } from '../../lib/types';
import type { StockData, SummaryData } from '../../lib/command-types';
import { ErrorBox } from '../ui';
import { CommandHeader } from './command-header';
import { CommandFilters } from './command-filters';
import { KpiStrip } from './kpi-strip';
import { LayoutBoard } from './layout-board';
import { CommandPanel } from './command-panels';
import { CommandDrawers } from './command-drawers';
export function CommandWorkspace({
  employee,
  preset,
  context,
}: {
  employee: Employee;
  preset: Preset;
  context: ReturnType<typeof useCommandFilters>;
}) {
  const { filters, params, actions, error } = context;
  const layout = usePersonalLayout(employee.id, employee.role, preset);
  const summary = useAnalytics<SummaryData>('summary', filters);
  const compactModels = layout.widgets.find((widget) => widget.id === 'models')?.span === 4;
  const stock = useAnalytics<StockData>(
    'stock',
    {
      ...filters,
      status: params.get('stock_status') || '',
      page: params.get('model_page') || '1',
      limit: compactModels ? '2' : '4',
    },
    layout.widgets.some((widget) => widget.visible && ['stock', 'models'].includes(widget.id)),
  );
  const scope = `${filters.branch_id ? `Branch #${filters.branch_id}` : 'All branches'} · ${filters.model_id ? `Model #${filters.model_id}` : 'All models'}`;
  return (
    <div className="space-y-4">
      <CommandHeader
        employee={employee}
        filters={filters}
        query={summary}
        preset={preset}
        layout={layout}
        actions={actions}
      />
      <CommandFilters params={params} actions={actions} />
      <ErrorBox error={error} />
      {!error && (
        <>
          <KpiStrip
            query={summary}
            actions={actions}
            scope={scope}
            inventoryFirst={employee.role === 'inventory'}
          />
          <LayoutBoard
            layout={layout}
            render={(id) => (
              <CommandPanel
                id={id}
                summary={summary}
                stock={stock}
                filters={filters}
                params={params}
                actions={actions}
              />
            )}
          />
          <CommandDrawers params={params} filters={filters} actions={actions} />
        </>
      )}
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Fictional dealership operations · backend-calculated state · demo manual settlements, not
        audited bank receipts · layout presets never change permissions
      </p>
    </div>
  );
}
