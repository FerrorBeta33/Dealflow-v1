import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { mkdir } from 'node:fs/promises';
import { fixture } from '../../api/test/helpers.js';
import { AuthProvider } from './lib/auth';
import { sessionKey } from './lib/api';
import { App } from './app';
let context: Awaited<ReturnType<typeof fixture>>;
let dispose: () => Promise<void>;
const originalFetch = globalThis.fetch;
const clients: QueryClient[] = [];
beforeAll(async () => {
  await mkdir('.data', { recursive: true });
  context = await fixture({
    after: (callback: () => Promise<void>) => {
      dispose = callback;
    },
  });
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) =>
    originalFetch(
      typeof input === 'string' && input.startsWith('/api') ? context.url + input.slice(4) : input,
      init,
    ),
  );
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  sessionStorage.clear();
  localStorage.clear();
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await dispose();
});
function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current workspace URL">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate(-1)}>Previous context</button>
    </>
  );
}
function mount(role: string, entries = ['/']) {
  sessionStorage.setItem(sessionKey, (context.tokens as Record<string, string>)[role]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false } },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={entries}>
        <AuthProvider>
          <App />
          <HistoryControls />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
test('real SQLite KPI drilldown, exact full list and contextual return preserve branch and period', async () => {
  const user = userEvent.setup();
  mount('admin', ['/?branch_id=1&period=7d']);
  const count = context.db
    .prepare("SELECT COUNT(*) AS count FROM vehicles WHERE branch_id=1 AND status='available'")
    .get().count;
  const metric = await screen.findByRole('button', {
    name: new RegExp(`^Available vehicles: ${count}\\.`),
  });
  await user.click(metric);
  const dialog = await screen.findByRole('dialog', { name: 'Available vehicles' });
  await within(dialog).findByText(new RegExp(`^${count} source records`));
  const full = within(dialog).getByRole('link', { name: /Open full filtered list/ });
  expect(full.getAttribute('href')).toContain('cc_branch_id=1');
  expect(full.getAttribute('href')).toContain('cc_from=');
  await user.click(full);
  await screen.findByRole('heading', { level: 1, name: 'Available vehicles' });
  await screen.findByText(new RegExp(`^${count} source records`));
  await user.click(screen.getByRole('link', { name: /Return to Command Center context/ }));
  await screen.findByRole('dialog', { name: 'Available vehicles' });
  expect(screen.getByLabelText('Current workspace URL')).toHaveTextContent('branch_id=1');
  expect(screen.getByLabelText('Current workspace URL')).toHaveTextContent('period=7d');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
}, 20000);
test('an inventory employee can choose a view but never gains sales or approval controls', async () => {
  const user = userEvent.setup();
  mount('inventory', ['/?preset=Executive&order=1']);
  const dialog = await screen.findByRole('dialog', { name: 'Order journey #1' });
  await within(dialog).findByText('Mandatory document gates');
  expect(screen.getByLabelText('Workspace preset')).toHaveValue('Executive');
  expect(screen.queryByRole('link', { name: 'New booking' })).not.toBeInTheDocument();
  expect(within(dialog).queryByRole('link', { name: /Settle payment/ })).not.toBeInTheDocument();
  expect(within(dialog).queryByRole('link', { name: /Review documents/ })).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole('link', { name: /View payments/ }));
  await screen.findByRole('heading', { name: 'Sales order #1' });
  expect(
    screen.queryByRole('button', { name: /Mark paid|Create payment request/ }),
  ).not.toBeInTheDocument();
}, 20000);
test('overview alias and browser history restore URL-owned filters instead of retaining stale scope', async () => {
  const user = userEvent.setup();
  mount('manager', ['/?branch_id=1&period=7d', '/overview?branch_id=2&period=7d']);
  await screen.findByRole('heading', { name: /DealerFlow Command Center/ });
  await waitFor(() => expect(screen.getByLabelText('Filter by branch')).toHaveValue('2'));
  await user.click(screen.getByRole('button', { name: 'Previous context' }));
  await waitFor(() => expect(screen.getByLabelText('Filter by branch')).toHaveValue('1'));
  expect(screen.getByLabelText('Current workspace URL')).toHaveTextContent('period=7d');
  expect(screen.getByLabelText('Filter event period')).toHaveValue('7d');
}, 20000);
test('expired bearer sessions clear private analytics and return to employee login', async () => {
  const client = mount('admin');
  await screen.findByRole('button', { name: /^Available vehicles:/ });
  context.db
    .prepare(
      "UPDATE sessions SET expires_at=0 WHERE employee_id=(SELECT id FROM employees WHERE role='admin')",
    )
    .run();
  await client.invalidateQueries({ queryKey: ['analytics'] });
  await screen.findByRole('heading', { name: 'Employee sign in' });
  expect(
    screen.queryByRole('heading', { name: /DealerFlow Command Center/ }),
  ).not.toBeInTheDocument();
  expect(sessionStorage.getItem(sessionKey)).toBeNull();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
}, 20000);
