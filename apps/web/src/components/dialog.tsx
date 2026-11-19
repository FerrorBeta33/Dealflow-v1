import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './button';
export function Dialog({
  title,
  children,
  close,
  side = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  side?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')
      ?.focus();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-modal="true"
      onCancel={close}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
      className={
        'fixed w-full max-w-xl overflow-y-auto border border-border bg-card p-6 text-foreground shadow-xl ' +
        'backdrop:bg-foreground/30 motion-safe:animate-enter ' +
        (side
          ? 'inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh rounded-l-container'
          : 'inset-0 m-auto max-h-[90dvh] rounded-container')
      }
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 id="dialog-title" className="text-xl font-semibold">
          {title}
        </h2>
        <Button variant="secondary" aria-label="Close dialog" onClick={close}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}
