import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { LookupSelect } from './components/lookup-select';
import { ListFilters } from './components/list-filters';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current filters">{location.search}</output>;
}

test('lookup search waits 300ms, coalesces keystrokes and cancels pending work on unmount', async () => {
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ items: [], total: 0, page: 1, pages: 1, limit: 100 })),
    );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <LookupSelect
        field={{ key: 'model_id', label: 'Model', source: 'models' }}
        value=""
        onChange={() => undefined}
      />
    </QueryClientProvider>,
  );
  try {
    await waitFor(() => expect(screen.getByRole('combobox')).toBeEnabled());
    expect(request).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    const search = screen.getByLabelText('Search model options');
    for (const value of ['T', 'Ta', 'Tat', 'Tata']) fireEvent.change(search, { target: { value } });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(request).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(request).toHaveBeenCalledTimes(2);
    expect(String(request.mock.calls[1][0])).toContain('q=Tata');
    fireEvent.change(search, { target: { value: 'Toyota' } });
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(request).toHaveBeenCalledTimes(2);
  } finally {
    view.unmount();
    client.clear();
    vi.useRealTimers();
    request.mockRestore();
  }
});

test('list text filters debounce independently and Clear cancels every queued update', async () => {
  const view = render(
    <MemoryRouter initialEntries={['/models?q=old&brand=Old&page=2']}>
      <ListFilters filters={[{ key: 'brand', label: 'Brand' }]} />
      <LocationProbe />
    </MemoryRouter>,
  );
  vi.useFakeTimers();
  try {
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Nexon' } });
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Tata' } });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(screen.getByLabelText('Current filters')).toHaveTextContent('q=old&brand=Old&page=2');
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByLabelText('Current filters')).toHaveTextContent('q=Nexon&brand=Tata');
    expect(screen.getByLabelText('Current filters')).not.toHaveTextContent('page=');
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Hyundai' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Creta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByLabelText('Current filters')).toBeEmptyDOMElement();
    expect(screen.getByLabelText('Brand')).toHaveValue('');
    expect(screen.getByLabelText('Search')).toHaveValue('');
  } finally {
    view.unmount();
    vi.useRealTimers();
  }
});
