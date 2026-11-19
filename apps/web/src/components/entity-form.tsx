import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, save } from '../lib/api';
import { configs } from '../lib/entity-config';
import type { Entity, Entry, FieldSpec } from '../lib/types';
import { Button, ErrorBox, Field, Input, Select } from './ui';
import { LookupSelect } from './lookup-select';

export function EntityForm({
  entity,
  initial,
  done,
  cancel,
}: {
  entity: Entity;
  initial?: Entry;
  done: (item: Entry) => void;
  cancel: () => void;
}) {
  const config = configs[entity];
  const client = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      config.fields.map((field) => [
        field.key,
        initial?.[field.key] == null
          ? ''
          : String(field.type === 'money' ? Number(initial[field.key]) / 100 : initial[field.key]),
      ]),
    ),
  );
  const [validation, setValidation] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      save<Entry>(`/${entity}${initial ? `/${initial.id}` : ''}`, body, initial ? 'PATCH' : 'POST'),
    onSuccess: (item) => {
      void client.invalidateQueries();
      done(item);
    },
  });
  const fieldError = (field: FieldSpec) =>
    validation[field.key] ||
    (mutation.error instanceof ApiError ? mutation.error.fields?.[field.key]?.[0] : undefined);
  function validate(field: FieldSpec) {
    const value = values[field.key] || '';
    if (!value && !field.optional) return 'This field is required';
    if (field.type === 'money' && Number(value) <= 0) return 'Enter a price greater than zero';
    if (field.key === 'phone' && !/^\+?[0-9]{10,15}$/.test(value))
      return 'Enter 10–15 phone digits';
    if (field.key === 'vin' && !/^[A-HJ-NPR-Z0-9]{17}$/.test(value.toUpperCase()))
      return 'Enter a valid 17-character VIN';
    return '';
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = Object.fromEntries(
      config.fields.map((field) => [field.key, validate(field)]).filter(([, error]) => error),
    );
    setValidation(errors);
    if (Object.keys(errors).length) return;
    const body = Object.fromEntries(
      config.fields.map((field) => [
        field.key,
        field.type === 'money'
          ? Math.round(Number(values[field.key]) * 100)
          : field.source
            ? Number(values[field.key])
            : values[field.key] || '',
      ]),
    );
    mutation.mutate(body);
  }
  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <ErrorBox error={mutation.error} />
      {Object.keys(validation).length > 0 && (
        <p role="alert" className="text-destructive">
          Correct the highlighted fields to continue.
        </p>
      )}
      {config.fields.map((field) => (
        <Field
          key={field.key}
          label={`${field.label}${field.optional ? ' (optional)' : ' *'}`}
          error={fieldError(field)}
          hint={field.hint}
        >
          {field.source ? (
            <LookupSelect
              field={field}
              required={!field.optional}
              availableOnly={entity === 'bookings'}
              value={values[field.key] || ''}
              onChange={(value) => setValues({ ...values, [field.key]: value })}
            />
          ) : field.options ? (
            <Select
              value={values[field.key]}
              required={!field.optional}
              onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              name={field.key}
              value={values[field.key]}
              required={!field.optional}
              type={field.type === 'money' ? 'number' : field.type || 'text'}
              min={field.type === 'money' ? '0.01' : undefined}
              step={field.type === 'money' ? '0.01' : undefined}
              maxLength={field.key === 'address' ? 600 : 160}
              autoComplete={
                field.key === 'name'
                  ? 'name'
                  : field.type === 'tel'
                    ? 'tel'
                    : field.type === 'email'
                      ? 'email'
                      : 'off'
              }
              onBlur={() => setValidation({ ...validation, [field.key]: validate(field) })}
              onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
            />
          )}
        </Field>
      ))}
      <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6">
        <Button variant="secondary" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : initial ? 'Save changes' : `Add ${config.singular}`}
        </Button>
      </div>
    </form>
  );
}
