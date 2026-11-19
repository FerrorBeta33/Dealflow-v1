import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { privateFile, downloadBlob } from '../lib/api';
import type { DocumentEntry } from '../lib/types';
import { Button, Dialog, ErrorBox } from './ui';
export function DocumentView({ document }: { document: DocumentEntry }) {
  const [url, setUrl] = useState('');
  const fetchFile = useMutation({
    mutationFn: () => privateFile(`/documents/${document.id}/content`),
    onSuccess: (blob) => setUrl(URL.createObjectURL(blob)),
  });
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return (
    <div>
      <Button variant="secondary" disabled={fetchFile.isPending} onClick={() => fetchFile.mutate()}>
        {fetchFile.isPending ? 'Opening…' : 'View document'}
      </Button>
      <ErrorBox error={fetchFile.error} />
      {url && (
        <Dialog title={document.filename} close={() => setUrl('')}>
          <div className="space-y-4">
            {document.mime === 'application/pdf' ? (
              <iframe
                title={document.filename}
                src={url}
                className="h-96 w-full rounded-control border border-border"
              />
            ) : (
              <img
                src={url}
                alt={`${document.type} document: ${document.filename}`}
                className="max-h-96 w-full rounded-control object-contain"
              />
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (fetchFile.data) downloadBlob(fetchFile.data, document.filename);
              }}
            >
              Download file
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
