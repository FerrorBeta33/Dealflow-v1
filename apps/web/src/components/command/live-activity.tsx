import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { date } from '../../../../../shared/domain.js';
import type { CommandActions, SummaryData } from '../../lib/command-types';
import { CommandIcon } from './command-icons';
import { WidgetTitle, WidgetState, type QueryState } from './widget-state';
export function LiveActivity({
  query,
  expanded,
  actions,
}: {
  query: QueryState & { data?: SummaryData };
  expanded: boolean;
  actions: CommandActions;
}) {
  const events = query.data?.events || [];
  return (
    <>
      <WidgetTitle
        title="Live Activity"
        subtitle="Latest recorded milestones · refresh to update"
        icon={<Activity size={20} aria-hidden="true" />}
      />
      <WidgetState
        query={query}
        empty={events.length === 0}
        emptyText="No recorded milestones in this period."
      >
        <ol className="space-y-1">
          {events.slice(0, expanded ? 12 : 5).map((event) => (
            <li key={event.event_id}>
              <Link
                to={event.href}
                className="group flex min-h-16 items-start gap-3 rounded-control p-2 transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-primary">
                  <CommandIcon
                    name={
                      event.event_id.startsWith('document')
                        ? 'documents'
                        : event.event_id.split('-')[0]
                    }
                    size={15}
                  />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm font-medium group-hover:text-primary">
                    {event.title}
                  </strong>
                  <span className="mt-1 block break-words text-xs text-muted-foreground">
                    {event.detail}
                  </span>
                  <time
                    className="mt-1 block text-xs text-muted-foreground"
                    dateTime={event.happened_at}
                  >
                    {date(event.happened_at)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {events.length > 5 && (
          <button
            className="mt-2 min-h-11 px-2 text-xs font-semibold text-primary"
            onClick={() => actions.update({ activity_more: expanded ? '' : 'true' })}
          >
            {expanded ? 'Show fewer events' : `Show ${events.length - 5} more recorded milestones`}
          </button>
        )}
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          {query.data?.activityNote}
        </p>
      </WidgetState>
    </>
  );
}
