import { CheckCircle2, Circle } from 'lucide-react';
import type { JourneyData } from '../../lib/command-types';
import { date } from '../../../../../shared/domain.js';
export function JourneyPath({ order }: { order: JourneyData['order'] }) {
  const steps = [
    ['VIN tracked', order.vin, true],
    ['Booking linked', `#${order.booking_id} · ${date(order.booking_at)}`, true],
    ['Order / invoice', order.invoice_reference, true],
    [
      'Payment',
      order.outstanding === 0 ? 'Fully settled' : 'Outstanding balance',
      order.outstanding === 0,
    ],
    [
      'Documents',
      order.identity && order.address ? 'Mandatory documents verified' : 'Identity / address gate',
      Boolean(order.identity && order.address),
    ],
    [
      'Delivery',
      order.delivered_at ? date(order.delivered_at) : 'Not completed',
      order.status === 'delivered',
    ],
  ] as const;
  return (
    <section className="mt-5">
      <h3 className="mb-3 text-sm font-semibold">VIN journey</h3>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map(([label, detail, done]) => (
          <li key={label} className="flex min-w-0 items-start gap-2 border-l-2 border-border pl-3">
            {done ? (
              <CheckCircle2 size={18} className="mt-1 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle size={18} className="mt-1 shrink-0 text-warning" aria-hidden="true" />
            )}
            <span className="min-w-0 text-sm">
              <strong className="block font-medium">{label}</strong>
              <span className="block break-words text-xs text-muted-foreground">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Payment and document checks are independent. Lines indicate linked records, not inferred
        event times.
      </p>
    </section>
  );
}
