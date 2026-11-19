import { ListChecks } from 'lucide-react';
import { exceptionTypes } from '../../../../../shared/command-center.js';
import { useAnalytics } from '../../lib/command-data';
import { useAuth } from '../../lib/auth';
import type { CommandActions, ExceptionData, QueryFilters } from '../../lib/command-types';
import { Select } from '../ui';
import { WidgetTitle, WidgetState, PageControls } from './widget-state';
import { ExceptionRow } from './exception-row';
export function ActionCenter({
  filters,
  params,
  actions,
}: {
  filters: QueryFilters;
  params: URLSearchParams;
  actions: CommandActions;
}) {
  const { employee } = useAuth();
  const query = useAnalytics<ExceptionData>('exceptions', {
    ...filters,
    type: params.get('attention') || 'all',
    page: params.get('action_page') || '1',
    limit: '4',
    sort: params.get('action_sort') || 'priority',
  });
  return (
    <>
      <WidgetTitle
        title="Action Center"
        subtitle="Ready work → money → documents → record age"
        icon={<ListChecks size={20} aria-hidden="true" />}
      />
      <div className="mb-2 flex flex-wrap gap-2">
        <Select
          aria-label="Attention type"
          className="min-w-32 flex-1"
          value={params.get('attention') || 'all'}
          onChange={(event) => actions.update({ attention: event.target.value, action_page: '' })}
        >
          {exceptionTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All attention' : type === 'pending' ? 'Awaiting settlement' : type}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Attention sorting"
          className="min-w-32 flex-1"
          value={params.get('action_sort') || 'priority'}
          onChange={(event) => actions.update({ action_sort: event.target.value, action_page: '' })}
        >
          <option value="priority">Priority</option>
          <option value="outstanding">Outstanding ₹</option>
          <option value="age">Oldest first</option>
        </Select>
      </div>
      <WidgetState
        query={query}
        empty={query.data?.total === 0}
        emptyText="No urgent actions found in this scope."
      >
        <ul>
          {query.data?.items.map((item) => (
            <ExceptionRow
              key={item.id}
              item={item}
              role={employee?.role || ''}
              open={() => item.order_id && actions.openJourney(item.order_id)}
            />
          ))}
        </ul>
        {query.data && query.data.pages > 1 && (
          <PageControls
            {...query.data}
            onChange={(page) => actions.update({ action_page: String(page) })}
          />
        )}
      </WidgetState>
    </>
  );
}
