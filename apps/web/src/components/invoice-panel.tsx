import { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import type { Order } from '../lib/types';
import { privateFile, downloadBlob } from '../lib/api';
import { money, date } from '../../../../shared/domain.js';
import { Button, ErrorBox, panel } from './ui';
export function InvoicePanel({ order }: { order: Order }) {
  const [state, setState] = useState({ pending: false, error: '' });
  async function download() {
    setState({ pending: true, error: '' });
    try {
      downloadBlob(
        await privateFile(`/orders/${order.id}/invoice`),
        `${order.invoice_reference}.html`,
      );
      setState({ pending: false, error: '' });
    } catch (error) {
      setState({
        pending: false,
        error: error instanceof Error ? error.message : 'Invoice download failed',
      });
    }
  }
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3 print:hidden">
        <Button variant="secondary" disabled={state.pending} onClick={() => void download()}>
          <Download size={18} />
          {state.pending ? 'Downloading…' : 'Download invoice HTML'}
        </Button>
        <Button onClick={() => window.print()}>
          <Printer size={18} />
          Print / Save as PDF
        </Button>
      </div>
      <ErrorBox error={state.error} />
      <article
        aria-label="Printable invoice"
        className={`${panel} mx-auto max-w-4xl space-y-8 print:border-0 print:bg-card print:text-foreground print:shadow-none`}
      >
        <header className="flex flex-wrap justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="text-xl font-semibold">DealerFlow</p>
            <p className="mt-2 text-sm text-muted-foreground print:text-foreground">
              {order.branch}
              <br />
              {order.branch_address as string}
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Sales invoice</h2>
            <p className="mt-2 font-medium">{order.invoice_reference}</p>
            <p className="mt-2 text-sm text-muted-foreground print:text-foreground">
              {date(order.created_at)}
            </p>
          </div>
        </header>
        <section>
          <h3 className="text-sm text-muted-foreground print:text-foreground">Bill to</h3>
          <p className="mt-2 font-semibold">{order.customer}</p>
          <p className="mt-2">
            {order.phone}
            <br />
            {order.address || 'Address not provided'}
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold">{order.label}</h3>
          <p className="mt-2 text-sm text-muted-foreground print:text-foreground">
            VIN: {order.vin} · Order #{order.id}
          </p>
        </section>
        <dl className="divide-y divide-border">
          {[
            ['Base vehicle price', order.base_price],
            ['Demo extras', order.extras],
            ['Demo tax', order.tax],
            ['Total invoice amount (INR)', order.total],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 py-4 last:text-xl last:font-semibold"
            >
              <dt>{label}</dt>
              <dd className="tabular-nums">{money(Number(value))}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground print:text-foreground">
          Amount captured at sales order creation. Fictional demo invoice — not a regulatory tax
          invoice. No real payment processor or tax engine is connected.
        </p>
      </article>
    </section>
  );
}
