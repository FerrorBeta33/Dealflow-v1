import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { Entry } from '../../lib/types';
import type { CommandActions } from '../../lib/command-types';
import { Button, Dialog, Select } from '../ui';
import { FilterForm } from './filter-form';
export function CommandFilters({
  params,
  actions,
}: {
  params: URLSearchParams;
  actions: CommandActions;
}) {
  const [drawer, setDrawer] = useState({ open: false, period: '' });
  const branches = useQuery({
    queryKey: ['branches'],
    queryFn: ({ signal }) => api<{ items: Entry[] }>('/branches', { signal }),
  });
  const change = (values: Record<string, string>) =>
    actions.update({ ...values, metric: '', order: '', drill_from: '', drill_to: '' });
  const branch = branches.data?.items.find((item) => String(item.id) === params.get('branch_id'));
  return (
    <section aria-label="Workspace filters" className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden items-center gap-3 md:flex">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Branch
            <Select
              className="max-w-52"
              aria-label="Filter by branch"
              value={params.get('branch_id') || ''}
              onChange={(event) => change({ branch_id: event.target.value })}
            >
              <option value="">All branches</option>
              {branches.data?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {String(item.name)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Events
            <Select
              className="max-w-40"
              aria-label="Filter event period"
              value={params.get('period') || '30d'}
              onChange={(event) =>
                event.target.value === 'custom'
                  ? setDrawer({ open: true, period: 'custom' })
                  : change({ period: event.target.value })
              }
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </Select>
          </label>
        </div>
        <Button variant="secondary" onClick={() => setDrawer({ open: true, period: '' })}>
          <Filter size={16} aria-hidden="true" />
          Filters
        </Button>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          {String(branch?.name || 'All branches')}
        </span>
        {params.get('model_id') && (
          <Button
            variant="secondary"
            aria-label="Clear model filter"
            onClick={() => change({ model_id: '' })}
          >
            Model #{params.get('model_id')} <X size={14} aria-hidden="true" />
          </Button>
        )}
        {(params.get('branch_id') || params.get('period') || params.get('model_id')) && (
          <button
            className="min-h-11 px-2 text-xs text-primary"
            onClick={() => change({ branch_id: '', model_id: '', period: '', start: '', end: '' })}
          >
            Clear filters
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Branch/model scope the workspace · Period affects event metrics only · Stock and open work
        are snapshots · Times: IST
      </p>
      {branches.error && (
        <p role="alert" className="text-sm text-destructive">
          Branch options unavailable.{' '}
          <button onClick={() => void branches.refetch()}>Retry branches</button>
        </p>
      )}
      {drawer.open && (
        <Dialog side title="Workspace filters" close={() => setDrawer({ open: false, period: '' })}>
          <FilterForm
            params={params}
            initialPeriod={drawer.period}
            apply={(changes) => {
              change(changes);
              setDrawer({ open: false, period: '' });
            }}
          />
        </Dialog>
      )}
    </section>
  );
}
