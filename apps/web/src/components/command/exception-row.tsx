import { Link } from 'react-router-dom';
import { can, money } from '../../../../../shared/domain.js';
import type { ExceptionRecord } from '../../lib/command-types';
import { Badge } from '../ui';
import { CommandIcon } from './command-icons';
import { drillStyle } from './widget-state';
function actionHandoff(item: ExceptionRecord, role: string) {
  if (item.type === 'aging') return { label: 'Inspect inventory', href: item.href };
  if (item.type === 'ready')
    return {
      label: can(role, 'approve') ? 'Complete delivery' : 'View readiness',
      href: item.href + '/delivery',
    };
  if ((item.outstanding || 0) > 0)
    return {
      label:
        item.pending > 0 && can(role, 'approve')
          ? 'Settle payment'
          : can(role, 'sales') && item.pending < (item.outstanding || 0)
            ? 'Request payment'
            : 'View payments',
      href: item.href + '/payments',
    };
  return {
    label: can(role, 'approve')
      ? 'Review documents'
      : can(role, 'sales')
        ? 'Upload documents'
        : 'View documents',
    href: item.href + '/documents',
  };
}
export function ExceptionRow({
  item,
  role,
  open,
}: {
  item: ExceptionRecord;
  role: string;
  open: () => void;
}) {
  const handoff = actionHandoff(item, role);
  const missing = [!item.identity ? 'identity' : '', !item.address ? 'address' : '']
    .filter(Boolean)
    .join(' + ');
  const financialNote =
    (item.outstanding || 0) > 0 ? `${money(item.outstanding || 0)} outstanding. ` : '';
  const documentNote = missing ? `Verify ${missing}.` : '';
  const icon =
    item.type === 'ready'
      ? 'ready'
      : item.type === 'documents'
        ? 'documents'
        : item.type === 'aging'
          ? 'aging'
          : 'payment';
  return (
    <li className="border-b border-border py-3 last:border-0">
      <div className="flex items-start gap-3">
        <span
          className={
            'mt-1 grid size-8 shrink-0 place-items-center rounded-full ' +
            (item.type === 'ready' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')
          }
        >
          <CommandIcon name={icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {item.order_id ? (
              <button
                onClick={open}
                className={
                  'min-h-11 rounded text-left text-sm font-semibold hover:text-primary ' +
                  'focus-visible:outline-2 focus-visible:outline-ring'
                }
              >
                Order #{item.order_id}{' '}
                <span className="font-normal text-muted-foreground">· {item.customer}</span>
              </button>
            ) : (
              <Link className={drillStyle} to={item.href}>
                {item.vin}
              </Link>
            )}
            <Badge value={item.type} />
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {item.branch} · {item.vin}
          </p>
          <p className="mt-2 text-sm">
            {item.type === 'ready'
              ? 'Financial and mandatory document gates satisfied.'
              : item.type === 'aging'
                ? 'Available VIN · record age, not days-on-lot.'
                : `${financialNote}${documentNote}`}
          </p>
          {item.pending > 0 && (
            <p className="mt-1 text-xs text-warning">
              {money(item.pending)} awaiting manager settlement
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {item.age_days}d since {item.type === 'aging' ? 'record' : 'order'} creation
            </span>
            <Link className={drillStyle} to={handoff.href}>
              {handoff.label} →
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
