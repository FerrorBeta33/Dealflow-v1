import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAnalytics } from '../../lib/command-data';
import type { CommandRecord, QueryFilters } from '../../lib/command-types';
import { Input, ErrorBox } from '../ui';
export function CommandSearch({ filters }: { filters: QueryFilters }) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const query = useAnalytics<{ items: CommandRecord[]; scope: string }>(
    'search',
    { ...filters, q: debounced },
    Boolean(debounced),
  );
  const groups = ['vehicles', 'models', 'bookings', 'orders', 'customers'];
  return (
    <div
      className="relative w-full sm:w-72"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}
    >
      <label className="relative block">
        <span className="sr-only">Quick search</span>
        <Search
          aria-hidden="true"
          size={16}
          className="absolute left-3 top-4 text-muted-foreground"
        />
        <Input
          value={text}
          maxLength={100}
          className="pl-10"
          placeholder="VIN, invoice, customer…"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          aria-expanded={open && Boolean(text)}
          aria-controls="command-search-results"
        />
      </label>
      {open && text && (
        <section
          id="command-search-results"
          aria-label="Quick search results"
          className="absolute right-0 top-full z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-container border border-border bg-card p-3 shadow-xl"
        >
          <p className="mb-2 text-xs text-muted-foreground">
            VINs · models · bookings · orders/invoices · customers
          </p>
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
          {(text.trim() !== debounced || query.isFetching) && (
            <p role="status" className="p-3 text-sm">
              Searching…
            </p>
          )}
          {query.data && !query.isFetching && !query.data.items.length && (
            <p className="p-3 text-sm text-muted-foreground">No matching accessible records.</p>
          )}
          {groups.map((entity) => {
            const items = query.data?.items.filter((item) => item.entity === entity) || [];
            return items.length ? (
              <div key={entity} className="mb-2">
                <h3 className="px-2 text-xs font-semibold capitalize text-muted-foreground">
                  {entity}
                </h3>
                <ul>
                  {items.map((item) => (
                    <li key={`${entity}-${item.id}`}>
                      <Link
                        to={item.href}
                        className="block min-h-12 rounded-control p-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span className="block font-medium">{item.reference}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.label}
                          {item.branch ? ` · ${item.branch}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })}
          <p className="text-xs text-muted-foreground">
            Authorized records only · maximum 20 results
          </p>
        </section>
      )}
    </div>
  );
}
