import { useState } from 'react';
import { Button, Field, Input, Select } from '../ui';
import { LookupSelect } from '../lookup-select';
import { periodRange } from '../../lib/command-data';
import type { QueryFilters } from '../../lib/command-types';
export function FilterForm({
  params,
  initialPeriod,
  apply,
}: {
  params: URLSearchParams;
  initialPeriod?: string;
  apply: (changes: QueryFilters) => void;
}) {
  const [draft, setDraft] = useState({
    branch_id: params.get('branch_id') || '',
    model_id: params.get('model_id') || '',
    period: initialPeriod || params.get('period') || '30d',
    start: params.get('start') || '',
    end: params.get('end') || '',
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          periodRange(draft.period, draft.start, draft.end);
          apply(draft);
        } catch (problem) {
          setError((problem as Error).message);
        }
      }}
    >
      <p className="text-sm text-muted-foreground">
        Branch/model apply across the workspace. Period applies to recorded events and invoices—not
        current stock, balances or open work.
      </p>
      <Field label="Command Center branch">
        <LookupSelect
          field={{ key: 'branch_id', label: 'Branch', source: 'branches' }}
          value={draft.branch_id}
          onChange={(branch_id) => setDraft({ ...draft, branch_id })}
        />
      </Field>
      <Button variant="secondary" onClick={() => setDraft({ ...draft, branch_id: '' })}>
        All branches
      </Button>
      <Field label="Command Center model">
        <LookupSelect
          field={{ key: 'model_id', label: 'Model', source: 'models' }}
          value={draft.model_id}
          onChange={(model_id) => setDraft({ ...draft, model_id })}
        />
      </Field>
      <Button variant="secondary" onClick={() => setDraft({ ...draft, model_id: '' })}>
        All models
      </Button>
      <Field label="Event period">
        <Select
          value={draft.period}
          onChange={(event) => setDraft({ ...draft, period: event.target.value })}
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom</option>
        </Select>
      </Field>
      {draft.period === 'custom' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From date (IST)">
            <Input
              required
              type="date"
              value={draft.start}
              onChange={(event) => setDraft({ ...draft, start: event.target.value })}
            />
          </Field>
          <Field label="Through date (IST)">
            <Input
              required
              type="date"
              min={draft.start}
              value={draft.end}
              onChange={(event) => setDraft({ ...draft, end: event.target.value })}
            />
          </Field>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit">Apply filters</Button>
    </form>
  );
}
