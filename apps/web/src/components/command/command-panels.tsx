import type { CommandActions, QueryFilters, StockData, SummaryData } from '../../lib/command-types';
import type { QueryState } from './widget-state';
import { JourneyPanel } from './journey-panel';
import { ActionCenter } from './action-center';
import { StockIntelligence } from './stock-intelligence';
import { ModelSpotlight } from './model-spotlight';
import { SalesPulse } from './sales-pulse';
import { BranchPerformance } from './branch-performance';
import { LiveActivity } from './live-activity';
export function CommandPanel({
  id,
  summary,
  stock,
  filters,
  params,
  actions,
}: {
  id: string;
  summary: QueryState & { data?: SummaryData };
  stock: QueryState & { data?: StockData };
  filters: QueryFilters;
  params: URLSearchParams;
  actions: CommandActions;
}) {
  switch (id) {
    case 'journey':
      return (
        <JourneyPanel query={summary} actions={actions} selected={params.get('metric') || ''} />
      );
    case 'actions':
      return <ActionCenter filters={filters} params={params} actions={actions} />;
    case 'stock':
      return (
        <StockIntelligence
          query={stock}
          actions={actions}
          status={params.get('stock_status') || ''}
        />
      );
    case 'models':
      return <ModelSpotlight query={stock} actions={actions} />;
    case 'pulse':
      return <SalesPulse filters={filters} params={params} actions={actions} summary={summary} />;
    case 'branches':
      return <BranchPerformance query={summary} params={params} actions={actions} />;
    case 'activity':
      return (
        <LiveActivity
          query={summary}
          expanded={params.get('activity_more') === 'true'}
          actions={actions}
        />
      );
    default:
      return null;
  }
}
