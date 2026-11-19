import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { configs } from '../lib/entity-config';
import { api } from '../lib/api';
import type { Entity, Entry } from '../lib/types';
import { useAuth } from '../lib/auth';
import { can } from '../../../../shared/domain.js';
import { ErrorBox, Loading, PageHeading, panel } from '../components/ui';
import { EntityForm } from '../components/entity-form';
import { linkStyle } from '../components/record-table';
export function EntityEdit({ entity }: { entity: Entity }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const config = configs[entity];
  const record = useQuery({
    queryKey: [entity, id],
    queryFn: () => api<Entry>(`/${entity}/${id}`),
    enabled: !!id,
  });
  if (!can(employee?.role, config.action))
    return <ErrorBox error="Your role cannot add or edit these records." />;
  if (id && record.isPending) return <Loading />;
  if (record.error) return <ErrorBox error={record.error} retry={() => void record.refetch()} />;
  return (
    <div className="space-y-6">
      <Link to={`/${entity}`} className={linkStyle}>
        ← Back to {config.title.toLowerCase()}
      </Link>
      <PageHeading
        title={`${id ? 'Edit' : 'Add'} ${config.singular}`}
        subtitle={
          id
            ? 'Controlled edits preserve committed orders and reservations.'
            : 'Required fields are marked *. Changes are saved to the dealership database.'
        }
      />
      <div className={panel}>
        <EntityForm
          key={`${entity}-${id || 'new'}`}
          entity={entity}
          initial={record.data}
          cancel={() => navigate(`/${entity}`)}
          done={(item) =>
            navigate(`/${entity}/${item.id}`, {
              state: { message: `${config.singular} saved successfully.` },
            })
          }
        />
      </div>
    </div>
  );
}
