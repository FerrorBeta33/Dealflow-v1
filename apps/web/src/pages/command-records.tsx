import { Link, useSearchParams } from 'react-router-dom';
import { metricDefinitions } from '../../../../shared/command-center.js';
import type { Entity } from '../lib/types';
import { Input, Button, PageHeading, panel } from '../components/ui';
import { RecordExplorer } from '../components/command/record-explorer';
import { drillStyle } from '../components/command/widget-state';
export function CommandRecordPage({ entity }: { entity: Entity }) {
  const [params, setParams] = useSearchParams();
  const metric = params.get('cc_metric') || '';
  const definition = metricDefinitions.find((item) => item.id === metric);
  const filters = Object.fromEntries(
    ['branch_id', 'model_id', 'status', 'from', 'to'].map((key) => [
      key,
      params.get(`cc_${key}`) || '',
    ]),
  );
  filters.q = params.get('q') || '';
  const requestedReturn = params.get('cc_return') || '/';
  const returnTo = /^\/(?:overview)?(?:\?|$)/.test(requestedReturn) ? requestedReturn : '/';
  const change = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(key, value);
      if (key !== 'cc_page') next.delete('cc_page');
      return next;
    });
  return (
    <div className="space-y-4">
      <Link to={returnTo} className={drillStyle}>
        ← Return to Command Center context
      </Link>
      <PageHeading
        title={definition?.label || 'Analytics records'}
        subtitle="Exact metric source records; backend filters and pagination remain in the URL."
      />
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          change('q', String(new FormData(event.currentTarget).get('q') || '').trim());
        }}
      >
        <label className="min-w-48 flex-1">
          <span className="sr-only">Search metric VIN, model or record ID</span>
          <Input
            key={filters.q}
            name="q"
            maxLength={100}
            defaultValue={filters.q}
            placeholder="VIN, model or record ID…"
          />
        </label>
        <Button type="submit">Search records</Button>
      </form>
      <section className={panel}>
        <RecordExplorer
          metric={metric}
          filters={filters}
          page={params.get('cc_page') || '1'}
          onPage={(page) => change('cc_page', String(page))}
        />
      </section>
      <Link className={drillStyle} to={`/${entity}`}>
        Open unfiltered operational list →
      </Link>
    </div>
  );
}
