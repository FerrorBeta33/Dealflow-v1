import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { mkdir } from 'node:fs/promises';
import { fixture } from '../../api/test/helpers.js';
import { Buffer } from 'node:buffer';
import { demoDocument } from '../../../shared/demo-document.js';
import { AuthProvider } from './lib/auth';
import { App } from './app';
let context: Awaited<ReturnType<typeof fixture>>;
const originalFetch = globalThis.fetch;
let dispose: () => Promise<void>;
beforeAll(async () => {
  await mkdir('.data', { recursive: true });
  context = await fixture({
    after: (callback: () => Promise<void>) => {
      dispose = callback;
    },
  });
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === 'string' && input.startsWith('/api') ? context.url + input.slice(4) : input;
    if (init?.body instanceof FormData) {
      // jsdom File is not Node's Blob. Encode the browser form on this test transport only.
      const boundary = 'dealerflow-ui-test-boundary';
      const parts: Buffer[] = [];
      for (const [key, value] of init.body.entries()) {
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"` +
              (typeof value === 'string' ? '' : `; filename="${value.name}"`) +
              '\r\n' +
              (typeof value === 'string' ? '' : `Content-Type: ${value.type}\r\n`) +
              '\r\n',
          ),
        );
        if (typeof value === 'string') parts.push(Buffer.from(value));
        else
          parts.push(
            Buffer.from(
              await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = reject;
                reader.readAsArrayBuffer(value);
              }),
            ),
          );
        parts.push(Buffer.from('\r\n'));
      }
      parts.push(Buffer.from(`--${boundary}--\r\n`));
      const headers = new Headers(init.headers);
      headers.set('Content-Type', `multipart/form-data; boundary=${boundary}`);
      return originalFetch(url, {
        ...init,
        headers: Object.fromEntries(headers.entries()),
        body: Buffer.concat(parts),
      });
    }
    return originalFetch(url, init);
  });
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await dispose();
});
test('FR-01–15 React journey: login → add vehicle/customer → booking → order → invoice → payment → documents → delivery', async () => {
  const user = userEvent.setup();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await user.type(await screen.findByLabelText('Email *'), 'admin@dealerflow.demo');
  await user.type(screen.getByLabelText('Password *'), context.password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'Dealership overview' })).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Vehicle inventory' }));
  await user.click(await screen.findByRole('link', { name: 'Add vehicle' }));
  await screen.findByRole('option', { name: /Tata Nexon/ });
  const modelSelect = screen.getByRole('combobox', { name: 'Model' });
  const modelOption = within(modelSelect)
    .getAllByRole('option')
    .find((option) => option.textContent?.includes('Tata Nexon')) as HTMLOptionElement;
  await user.selectOptions(modelSelect, modelOption.value);
  await user.type(screen.getByLabelText(/VIN \*/), 'MAT12345678901234');
  await screen.findByRole('option', { name: 'Mumbai Central' });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Branch' }), '1');
  await user.type(screen.getByLabelText('Color *'), 'Journey Blue');
  await user.selectOptions(screen.getByRole('combobox', { name: /Status/ }), 'available');
  await user.click(screen.getByRole('button', { name: 'Add vehicle' }));
  expect(await screen.findByText('vehicle saved successfully.')).toBeVisible();
  expect(screen.getByText('MAT12345678901234')).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Customers' }));
  await user.click(await screen.findByRole('link', { name: 'Add customer' }));
  await user.type(screen.getByLabelText('Full name *'), 'UI Journey Customer');
  await user.type(screen.getByLabelText('Phone *'), '9876501234');
  await user.type(screen.getByLabelText('Email (optional)'), 'journey@example.com');
  await user.type(screen.getByLabelText('Address (optional)'), '42 Fictional Road, Mumbai');
  await user.click(screen.getByRole('button', { name: 'Add customer' }));
  expect(await screen.findByText('customer saved successfully.')).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Bookings' }));
  await user.click(await screen.findByRole('link', { name: 'Add booking' }));
  await screen.findByRole('option', { name: /UI Journey Customer/ });
  const customerSelect = screen.getByRole('combobox', { name: 'Customer' });
  const customerOption = within(customerSelect)
    .getAllByRole('option')
    .find((option) => option.textContent?.includes('UI Journey Customer')) as HTMLOptionElement;
  await user.selectOptions(customerSelect, customerOption.value);
  await screen.findByRole('option', { name: /MAT12345678901234/ });
  const vinSelect = screen.getByRole('combobox', { name: 'Available VIN' });
  const vinOption = within(vinSelect)
    .getAllByRole('option')
    .find((option) => option.textContent?.includes('MAT12345678901234')) as HTMLOptionElement;
  await user.selectOptions(vinSelect, vinOption.value);
  await user.click(screen.getByRole('button', { name: 'Add booking' }));
  await user.click(await screen.findByRole('button', { name: 'Create sales order' }));
  let dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Demo extras (₹) (optional)'), '1000');
  await user.type(within(dialog).getByLabelText('Demo tax (₹) (optional)'), '2000');
  await user.click(within(dialog).getByRole('button', { name: 'Create sales order' }));
  expect(await screen.findByRole('heading', { name: /Sales order #/ })).toBeVisible();
  await user.click(screen.getByRole('link', { name: /^invoice$/i }));
  expect(await screen.findByRole('article', { name: 'Printable invoice' })).toHaveTextContent(
    'UI Journey Customer',
  );
  const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
  await user.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));
  expect(print).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('link', { name: /^payments$/i }));
  await user.click(await screen.findByRole('button', { name: 'Add payment request' }));
  dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Amount (₹) *'), '1453000');
  await user.click(within(dialog).getByRole('button', { name: 'Add payment request' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.click(await screen.findByRole('button', { name: /Mark #\d+ paid/ }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /Mark #\d+ paid/ }),
  );
  expect(await screen.findByText('paid', { exact: true })).toBeVisible();
  await user.click(screen.getByRole('link', { name: /^documents$/i }));
  const upload = await screen.findByLabelText('File *');
  const sample = new File([demoDocument('identity')], 'fictional-identity.pdf', {
    type: 'application/pdf',
  });
  await user.upload(upload, sample);
  expect((screen.getByLabelText('File *') as HTMLInputElement).files).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Upload document' }));
  await waitFor(() => {
    const error = screen.queryByRole('alert');
    if (error) throw new Error(error.textContent || 'Upload failed');
    expect(screen.getByText('Document uploaded. A manager can now review it.')).toBeVisible();
  });
  await user.click(await screen.findByRole('button', { name: /Review identity #/ }));
  await user.selectOptions(
    within(screen.getByRole('dialog')).getByLabelText('Decision *'),
    'verified',
  );
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /Review identity #/ }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText('Document category *'), 'address');
  await user.upload(
    screen.getByLabelText('File *'),
    new File([demoDocument('address')], 'fictional-address.pdf', { type: 'application/pdf' }),
  );
  expect((screen.getByLabelText('File *') as HTMLInputElement).files).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Upload document' }));
  await user.click(await screen.findByRole('button', { name: /Review address #/ }));
  await user.selectOptions(
    within(screen.getByRole('dialog')).getByLabelText('Decision *'),
    'verified',
  );
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: /Review address #/ }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.click(screen.getByRole('link', { name: /^delivery$/i }));
  const complete = await screen.findByRole('button', { name: 'Complete delivery' });
  await waitFor(() => expect(complete).toBeEnabled());
  await user.click(complete);
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Complete delivery',
    }),
  );
  expect(await screen.findByText(/Delivered on/)).toBeVisible();
  expect(
    await context.db.prepare('SELECT status FROM vehicles WHERE vin = ?').get('MAT12345678901234'),
  ).toEqual({ status: 'sold' });
  print.mockRestore();
}, 60000);
test('Customer search/view/edit and pending-payment cancellation are usable through React', async () => {
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/customers?q=Priya']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const customerRow = await screen.findByRole('row', { name: /Priya Nair/ });
  await user.click(within(customerRow).getByRole('link', { name: /View/ }));
  await user.click(await screen.findByRole('link', { name: 'Edit customer' }));
  const name = await screen.findByLabelText('Full name *');
  await user.clear(name);
  await user.type(name, 'Priya Menon');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('heading', { name: 'Priya Menon' })).toBeVisible();
  expect(await context.db.prepare('SELECT name FROM customers WHERE id = 2').get()).toEqual({
    name: 'Priya Menon',
  });
  await user.click(screen.getByRole('link', { name: 'Sales orders' }));
  const orderRow = await screen.findByRole('row', { name: /Mahindra XUV700/ });
  await user.click(within(orderRow).getByRole('link', { name: /View/ }));
  await user.click(await screen.findByRole('link', { name: /^payments$/i }));
  await user.click(await screen.findByRole('button', { name: 'Cancel request #2' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel request #2' }),
  );
  expect(await screen.findByText('cancelled', { exact: true })).toBeVisible();
  expect(
    await context.db.prepare('SELECT status FROM payment_requests WHERE id = 1').get(),
  ).toEqual({
    status: 'paid',
  });
  expect((await context.api('/orders/1/documents', { token: '' })).status).toBe(401);
});
