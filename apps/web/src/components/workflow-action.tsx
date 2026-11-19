import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, save } from '../lib/api';
import type { Entry, FieldSpec } from '../lib/types';
import { Button, Dialog, ErrorBox, Field, Input, Select } from './ui';
interface Props {
  title: string;
  path: string;
  method?: string;
  fields?: FieldSpec[];
  children?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSuccess?: (item: Entry) => void;
}
export function WorkflowAction(props: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <div>
      <Button
        variant={props.danger ? 'danger' : 'secondary'}
        disabled={props.disabled}
        onClick={() => {
          setMessage('');
          setOpen(true);
        }}
      >
        {props.title}
      </Button>
      {message && (
        <p role="status" className="mt-2 text-sm text-success">
          {message}
        </p>
      )}
      {open && (
        <ActionDialog
          {...props}
          close={() => setOpen(false)}
          onSuccess={(item) => {
            setOpen(false);
            setMessage(`${props.title} completed.`);
            props.onSuccess?.(item);
          }}
        />
      )}
    </div>
  );
}
function ActionDialog({
  title,
  path,
  method = 'POST',
  fields = [],
  children,
  danger,
  close,
  onSuccess,
}: Props & { close: () => void }) {
  const client = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const action = useMutation({
    mutationFn: (body: unknown) => save<Entry>(path, body, method),
    onSuccess: (item) => {
      void client.invalidateQueries();
      onSuccess?.(item);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.type === 'money'
          ? Math.round(Number(values[field.key] || 0) * 100)
          : values[field.key] || '',
      ]),
    );
    action.mutate(body);
  }
  return (
    <Dialog title={title} close={close}>
      <form onSubmit={submit} className="space-y-6">
        {children}
        <ErrorBox error={action.error} />
        {fields.map((field) => (
          <Field
            key={field.key}
            label={`${field.label}${field.optional ? ' (optional)' : ' *'}`}
            error={
              action.error instanceof ApiError ? action.error.fields?.[field.key]?.[0] : undefined
            }
          >
            {field.options ? (
              <Select
                required={!field.optional}
                value={values[field.key] || ''}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              >
                <option value="">Select…</option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            ) : (
              <Input
                type={field.type === 'money' ? 'number' : 'text'}
                min="0"
                step={field.type === 'money' ? '0.01' : undefined}
                required={!field.optional}
                value={values[field.key] || ''}
                maxLength={field.type === 'money' ? undefined : 500}
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              />
            )}
          </Field>
        ))}
        <div className="flex justify-between gap-3">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={action.isPending}>
            {action.isPending ? 'Saving…' : title}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
