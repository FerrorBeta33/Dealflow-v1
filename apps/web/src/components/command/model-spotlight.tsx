import { Link } from 'react-router-dom';
import { CarFront } from 'lucide-react';
import { money } from '../../../../../shared/domain.js';
import type { CommandActions, StockData } from '../../lib/command-types';
import { VehicleImage } from '../vehicle-image';
import {
  WidgetState,
  WidgetTitle,
  PageControls,
  type QueryState,
  drillStyle,
} from './widget-state';
export function ModelSpotlight({
  query,
  actions,
}: {
  query: QueryState & { data?: StockData };
  actions: CommandActions;
}) {
  return (
    <div className="@container">
      <WidgetTitle
        title="Model Spotlight"
        subtitle="Catalog-backed availability · representative artwork"
        icon={<CarFront size={20} aria-hidden="true" />}
      />
      <WidgetState
        query={query}
        empty={query.data?.models.total === 0}
        emptyText="No models match this scope."
      >
        <div className="grid gap-3 @md:grid-cols-2 @4xl:grid-cols-4">
          {query.data?.models.items.map((model) => (
            <article
              key={model.id}
              className="min-w-0 rounded-container border border-border bg-background/40 p-3 transition hover:border-primary/40"
            >
              <Link
                to={`/models/${model.id}`}
                className="block rounded-control focus-visible:outline-2 focus-visible:outline-ring"
              >
                <VehicleImage label={model.label} />
                <h3 className="mt-3 text-sm font-semibold">
                  {model.brand} {model.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{model.variant}</p>
              </Link>
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {money(model.base_price)}{' '}
                <span className="font-normal text-muted-foreground">base</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  disabled={model.available === 0}
                  onClick={() => actions.openStock('available', model.id)}
                  className="min-h-11 rounded-full border border-success/20 bg-success/5 px-3 text-xs font-medium text-success hover:bg-success/10 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {model.available} available
                </button>
                <button
                  disabled={model.reserved === 0}
                  onClick={() => actions.openStock('reserved', model.id)}
                  className="min-h-11 rounded-full border border-warning/20 bg-warning/5 px-3 text-xs font-medium text-warning hover:bg-warning/10 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {model.reserved} reserved
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {model.branches || 'No units in selected stock scope'}
              </p>
              <Link to={`/models/${model.id}`} className={drillStyle}>
                Model & stock →
              </Link>
            </article>
          ))}
        </div>
        {query.data && (
          <PageControls
            {...query.data.models}
            onChange={(page) => actions.update({ model_page: String(page) })}
          />
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Model counts inherit stock status selection. Illustrations are original generic demo
          assets—not verified model photography or VIN condition evidence.
        </p>
      </WidgetState>
      <Link to="/models" className={drillStyle}>
        Open model catalog & search →
      </Link>
    </div>
  );
}
