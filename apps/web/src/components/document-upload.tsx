import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { save, downloadBlob } from '../lib/api';
import { documentTypes } from '../../../../shared/domain.js';
import { demoDocument } from '../../../../shared/demo-document.js';
import { Button, ErrorBox, Field, Input, Select, panel } from './ui';
export function DocumentUpload({ orderId }: { orderId: number }) {
  const client = useQueryClient();
  const [type, setType] = useState('identity');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState('');
  const [success, setSuccess] = useState('');
  const mutation = useMutation({
    mutationFn: (body: FormData) => save(`/orders/${orderId}/documents`, body),
    onSuccess: () => {
      setSuccess('Document uploaded. A manager can now review it.');
      void client.invalidateQueries();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess('');
    if (
      !file ||
      file.size > 4194304 ||
      !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
    ) {
      setValidation('Choose a PDF, JPEG or PNG no larger than 4 MB.');
      return;
    }
    setValidation('');
    const form = new FormData();
    form.set('type', type);
    form.set('file', file);
    mutation.mutate(form);
  }
  return (
    <section className={`${panel} space-y-6`}>
      <div>
        <h3 className="text-lg font-semibold">Add document</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          PDF / JPEG / PNG · max 4 MB. A new upload replaces the current review for its category.
        </p>
      </div>
      <form noValidate onSubmit={submit} className="max-w-xl space-y-4">
        <ErrorBox error={mutation.error || validation} />
        {success && (
          <p role="status" className="text-success">
            {success}
          </p>
        )}
        <Field label="Document category *">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            {documentTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </Field>
        <Field label="File *">
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setSuccess('');
            }}
          />
        </Field>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Uploading…' : 'Upload document'}
        </Button>
      </form>
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer py-3 font-medium">
          Need fictional documents for this demo?
        </summary>
        <p className="my-3">
          Download these clearly marked sample PDFs, then choose them in the upload control.
        </p>
        <div className="flex flex-wrap gap-3">
          {['identity', 'address'].map((item) => (
            <Button
              key={item}
              variant="secondary"
              onClick={() =>
                downloadBlob(
                  new Blob([demoDocument(item)], { type: 'application/pdf' }),
                  `fictional-${item}.pdf`,
                )
              }
            >
              Download sample {item}
            </Button>
          ))}
        </div>
      </details>
    </section>
  );
}
