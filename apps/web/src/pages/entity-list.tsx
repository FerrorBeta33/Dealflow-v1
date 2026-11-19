import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { configs } from '../lib/entity-config';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { can } from '../../../../shared/domain.js';
import type { Entity, Page } from '../lib/types';
import { ErrorBox, Loading, PageHeading } from '../components/ui';
import { ListFilters } from '../components/list-filters';
import { RecordTable, linkStyle } from '../components/record-table';
import { CommandRecordPage } from './command-records';
export function EntityList({ entity }: { entity: Entity }) {
  const [params] = useSearchParams();
  const config = configs[entity];
  const { employee } = useAuth();
  const allowed = can(employee?.role, config.action);
  const records = useQuery({
    queryKey: [entity, params.toString()],
    enabled: !params.has('cc_metric'),
    queryFn: () => api<Page>(`/${entity}?${params}`),
  });
  if (params.has('cc_metric')) return <CommandRecordPage entity={entity} />;
  return (
    <div className="space-y-6">
      <PageHeading title={config.title} subtitle={config.subtitle}>
        {allowed ? (
          <Link
            className={
              'inline-flex min-h-12 items-center gap-2 rounded-control bg-primary px-4 font-medium ' +
              'text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring'
            }
            to={`/${entity}/new`}
          >
            <Plus size={18} />
            Add {config.singular}
          </Link>
        ) : entity === 'orders' && can(employee?.role, 'sales') ? (
          <Link className={linkStyle} to="/bookings">
            Create from a confirmed booking →
          </Link>
        ) : null}
      </PageHeading>
      <ListFilters filters={config.filters} />
      <ErrorBox error={records.error} retry={() => void records.refetch()} />
      {records.isPending ? (
        <Loading />
      ) : records.data ? (
        <RecordTable
          entity={entity}
          config={config}
          data={records.data}
          canEdit={allowed && ['models', 'vehicles', 'customers'].includes(entity)}
        />
      ) : null}
    </div>
  );
}
