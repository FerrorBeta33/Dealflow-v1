import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { can } from '../../../../../shared/domain.js';
import type { Employee } from '../../lib/types';
import type { CommandActions, QueryFilters, SummaryData } from '../../lib/command-types';
import type { LayoutController, Preset } from '../../lib/command-layout';
import { Button } from '../ui';
import { CommandSearch } from './command-search';
import { LayoutToolbar } from './layout-toolbar';
import { type QueryState, drillStyle } from './widget-state';
export function CommandHeader({
  employee,
  filters,
  query,
  preset,
  layout,
  actions,
}: {
  employee: Employee;
  filters: QueryFilters;
  query: QueryState & { data?: SummaryData };
  preset: Preset;
  layout: LayoutController;
  actions: CommandActions;
}) {
  const client = useQueryClient();
  const updating = useIsFetching({ queryKey: ['analytics'] }) > 0;
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            DealerFlow <span className="text-primary">Command Center</span>
          </h1>
          <h2 className="mt-1 text-sm font-normal text-muted-foreground">Dealership overview</h2>
        </div>
        <CommandSearch filters={filters} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LayoutToolbar
          layout={layout}
          preset={preset}
          changePreset={(value) => actions.update({ preset: value })}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={updating}
            onClick={() => void client.invalidateQueries({ queryKey: ['analytics'] })}
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={updating ? 'motion-safe:animate-spin' : ''}
            />
            {updating ? 'Updating' : 'Refresh'}
          </Button>
          {can(employee.role, 'sales') && (
            <Link
              className={`${drillStyle} bg-primary px-4 text-primary-foreground hover:bg-primary/90`}
              to="/bookings/new"
            >
              <Plus size={16} aria-hidden="true" />
              New booking
            </Link>
          )}
        </div>
      </div>
      <p
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${query.error ? 'bg-warning' : 'bg-success'}`} />
          {query.data
            ? `Last successful summary ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(query.data.asOf))} IST`
            : 'Waiting for committed records'}
        </span>
        <span>Refresh for latest · no automatic polling</span>
        <span className="capitalize">
          {employee.role} access · {preset} view
        </span>
      </p>
      {layout.message && (
        <p role="status" className="text-xs text-primary">
          {layout.message}
        </p>
      )}
    </header>
  );
}
