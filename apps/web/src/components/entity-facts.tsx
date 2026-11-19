import type { Entity, EntityConfig, Entry } from '../lib/types';
import { money, date } from '../../../../shared/domain.js';
import { Badge, panel } from './ui';
import { VehicleImage } from './vehicle-image';
export function EntityFacts({
  entity,
  config,
  item,
}: {
  entity: Entity;
  config: EntityConfig;
  item: Entry;
}) {
  const illustrated = ['models', 'vehicles', 'bookings'].includes(entity);
  return (
    <section className={panel}>
      {illustrated && (
        <div className="mb-6 max-w-xs">
          <VehicleImage
            label={String(item.label || `${item.brand} ${item.name} · ${item.variant}`)}
            priority
          />
        </div>
      )}
      <dl className="grid gap-6 sm:grid-cols-2">
        {config.fields.map((field) => (
          <div key={field.key}>
            <dt className="text-sm text-muted-foreground">{field.label}</dt>
            <dd className="mt-2 break-words font-medium">
              {field.key === 'status' ? (
                <Badge value={String(item.status)} />
              ) : field.type === 'money' ? (
                money(Number(item[field.key]))
              ) : (
                String(
                  field.key === 'model_id'
                    ? item.label
                    : field.key === 'branch_id'
                      ? item.branch
                      : field.key === 'customer_id'
                        ? item.customer
                        : field.key === 'vehicle_id'
                          ? item.vin
                          : item[field.key] || 'Not provided',
                )
              )}
            </dd>
          </div>
        ))}
        {item.created_at ? (
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="mt-2">{date(String(item.created_at))}</dd>
          </div>
        ) : null}
        {entity === 'bookings' && (
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="mt-2">
              <Badge value={String(item.status)} />
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
