import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetState } from './components/command/widget-state';
import { VehicleImage } from './components/vehicle-image';
import { Dialog } from './components/ui';
test('widgets distinguish loading, empty, failed refresh and last-successful data without fake zeros', () => {
  const refetch = vi.fn();
  const base = { isPending: false, isFetching: false, error: null, refetch };
  const view = render(
    <WidgetState query={{ ...base, isPending: true }}>
      <p>37 records</p>
    </WidgetState>,
  );
  expect(screen.getByRole('status', { name: 'Loading widget' })).toBeInTheDocument();
  expect(screen.queryByText('37 records')).not.toBeInTheDocument();
  view.rerender(
    <WidgetState query={{ ...base, data: {} }} empty emptyText="No scoped records">
      <p>37 records</p>
    </WidgetState>,
  );
  expect(screen.getByText('No scoped records')).toBeInTheDocument();
  view.rerender(
    <WidgetState query={{ ...base, error: new Error('Network unavailable') }}>
      <p>37 records</p>
    </WidgetState>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
  expect(screen.queryByText('37 records')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(refetch).toHaveBeenCalledTimes(1);
  view.rerender(
    <WidgetState
      query={{
        ...base,
        data: { asOf: '2026-11-19T12:00:00.000Z' },
        error: new Error('Refresh failed'),
      }}
    >
      <p>37 records</p>
    </WidgetState>,
  );
  expect(screen.getByText('37 records')).toBeInTheDocument();
  expect(screen.getByText(/Showing the last successful data/)).toBeInTheDocument();
  expect(screen.getByText(/Last successful load/)).toBeInTheDocument();
});
test('unknown/broken vehicle imagery stays labelled, dimensioned and neutral', () => {
  render(<VehicleImage label="Unverified future model" />);
  const image = screen.getByRole('img', { name: /Representative image/ });
  expect(image).toHaveAttribute('src', '/vehicle-art/neutral.svg');
  expect(image).toHaveAttribute('width', '640');
  expect(image).toHaveAttribute('height', '360');
  expect(image).toHaveAttribute('loading', 'lazy');
  fireEvent.load(image);
  expect(image).toHaveClass('opacity-100');
  fireEvent.error(image);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('Unverified future model')).toBeInTheDocument();
  expect(screen.getByText('Representative image')).toBeInTheDocument();
});
function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Inspect journey</button>
      {open && (
        <Dialog side title="Journey context" close={() => setOpen(false)}>
          <button>View source order</button>
        </Dialog>
      )}
    </>
  );
}
test('side drawers capture focus, close with Escape and restore trigger focus', async () => {
  const user = userEvent.setup();
  render(<DrawerHarness />);
  const trigger = screen.getByRole('button', { name: 'Inspect journey' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Journey context' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
