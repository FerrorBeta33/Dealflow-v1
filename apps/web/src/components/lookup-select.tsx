import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Entry, FieldSpec, Page } from '../lib/types';
import { ErrorBox, Input, Select } from './ui';
export function LookupSelect({
  field,
  value,
  onChange,
  required = false,
  availableOnly = false,
}: {
  field: FieldSpec;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  availableOnly?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = new URLSearchParams({ limit: '100', q: debouncedSearch });
  if (availableOnly && field.source === 'vehicles') query.set('status', 'available');
  const records = useQuery({
    queryKey: ['lookup', field.source, debouncedSearch, availableOnly],
    queryFn: () => api<Page>(`/${field.source}${field.source === 'branches' ? '' : `?${query}`}`),
  });
  const selected = useQuery({
    queryKey: ['lookup-item', field.source, value],
    enabled: !!value && field.source !== 'branches',
    queryFn: () => api<Entry>(`/${field.source}/${value}`),
  });
  const items = records.data?.items || [];
  const allItems =
    selected.data && !items.some((item) => String(item.id) === value)
      ? [selected.data, ...items]
      : items;
  return (
    <span className="grid gap-2">
      {field.source !== 'branches' && (
        <Input
          aria-label={`Search ${field.label.toLowerCase()} options`}
          placeholder={`Search ${field.label.toLowerCase()}…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      <Select
        aria-label={field.label}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={records.isPending}
      >
        <option value="">
          {records.isPending ? 'Loading options…' : `Select ${field.label.toLowerCase()}`}
        </option>
        {allItems.map((item) => (
          <option key={item.id} value={item.id}>
            {String(item.label || item.name || item.id)}
            {item.vin ? ` · ${item.vin}` : ''}
            {item.phone ? ` · ${item.phone}` : ''}
            {item.branch ? ` · ${item.branch}` : ''}
          </option>
        ))}
      </Select>
      {records.data && records.data.total > 100 && (
        <span className="text-sm text-muted-foreground">
          Showing 100 results. Search to find more.
        </span>
      )}
      <ErrorBox error={records.error} retry={() => void records.refetch()} />
    </span>
  );
}
