import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FieldSpec } from '../lib/types';
import { Button, Input, Select } from './ui';
import { LookupSelect } from './lookup-select';
export function ListFilters({ filters }: { filters: FieldSpec[] }) {
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  }, [params]);
  const [text, setText] = useState(params.get('q') || '');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);
  const update = (key: string, value: string) => {
    // Router search-parameter callbacks are not queued like React state updates.
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    latestParams.current = next;
    setParams(next);
  };
  function scheduleUpdate(key: string, value: string) {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => update(key, value), 300);
  }
  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-wrap items-end gap-4 rounded-container border border-border bg-card p-4 shadow-control"
    >
      <label className="grid min-w-48 flex-1 gap-2 text-sm font-medium">
        Search
        <Input
          placeholder="Search records…"
          value={text}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            scheduleUpdate('q', value);
          }}
        />
      </label>
      {filters.map((field) => (
        <label key={field.key} className="grid min-w-32 max-w-64 flex-1 gap-2 text-sm font-medium">
          {field.label}
          {field.source ? (
            <LookupSelect
              field={field}
              value={params.get(field.key) || ''}
              onChange={(value) => update(field.key, value)}
            />
          ) : field.options ? (
            <Select
              value={params.get(field.key) || ''}
              onChange={(event) => update(field.key, event.target.value)}
            >
              <option value="">All</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={drafts[field.key] ?? params.get(field.key) ?? ''}
              placeholder={`All ${field.label.toLowerCase()}s`}
              onChange={(event) => {
                const value = event.target.value;
                setDrafts({ ...drafts, [field.key]: value });
                scheduleUpdate(field.key, value);
              }}
            />
          )}
        </label>
      ))}
      <label className="grid gap-2 text-sm font-medium">
        Sort
        <Select
          value={params.get('sort') || 'newest'}
          onChange={(event) => update('sort', event.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="price">Price: low to high</option>
        </Select>
      </label>
      <Button
        variant="secondary"
        onClick={() => {
          Object.values(timers.current).forEach(clearTimeout);
          setDrafts({});
          setText('');
          setParams({});
        }}
      >
        Clear filters
      </Button>
    </form>
  );
}
