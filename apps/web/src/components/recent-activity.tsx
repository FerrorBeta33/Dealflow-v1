import { date } from '../../../../shared/domain.js';
import { panel } from './ui';
export interface ActivityEvent {
  title: string;
  detail: string;
  happened_at: string;
}
export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <section className={panel}>
      <h2 className="text-xl font-semibold tracking-tight">Recent activity</h2>
      <p className="mt-2 text-sm text-muted-foreground">Latest persisted workflow milestones</p>
      <ol className="mt-6 divide-y divide-border">
        {events.map((event) => (
          <li
            key={`${event.happened_at}-${event.detail}-${event.title}`}
            className="relative py-4 pl-5 before:absolute before:top-6 before:left-0 before:size-2 before:rounded-full before:bg-primary/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium capitalize">{event.title}</p>
              <time className="text-xs text-muted-foreground">{date(event.happened_at)}</time>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
          </li>
        ))}
      </ol>
      {!events.length && <p>No activity yet. Create a booking to get started.</p>}
    </section>
  );
}
