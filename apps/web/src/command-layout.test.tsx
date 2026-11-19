import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  defaultLayout,
  layoutKey,
  loadLayout,
  movePanel,
  rolePreset,
  usePersonalLayout,
  validateLayout,
} from './lib/command-layout';
import { LayoutBoard } from './components/command/layout-board';
import { LayoutToolbar } from './components/command/layout-toolbar';
function Workspace({ employee = 1, role = 'admin' }: { employee?: number; role?: string }) {
  const layout = usePersonalLayout(employee, role, 'Executive');
  return (
    <>
      <LayoutToolbar layout={layout} preset="Executive" changePreset={() => undefined} />
      <output aria-label="Layout message">{layout.message}</output>
      <LayoutBoard layout={layout} render={(id) => <p>{id} data panel</p>} />
    </>
  );
}
beforeEach(() => localStorage.clear());
test('layout validation rejects corrupted/versioned/duplicate/unapproved widgets and preserves defaults', () => {
  const widgets = defaultLayout('Executive');
  expect(validateLayout({ version: 1, widgets })).toBe(true);
  expect(validateLayout({ version: 2, widgets })).toBe(false);
  expect(validateLayout({ version: 1, widgets: [...widgets, widgets[0]] })).toBe(false);
  expect(
    validateLayout({ version: 1, widgets: widgets.map((item) => ({ ...item, id: 'unknown' })) }),
  ).toBe(false);
  expect(
    validateLayout({ version: 1, widgets: widgets.map((item) => ({ ...item, span: 999 })) }),
  ).toBe(false);
  const key = layoutKey(1, 'admin', 'Executive');
  localStorage.setItem(key, JSON.stringify({ version: 0, widgets }));
  expect(loadLayout(key, 'Executive').widgets).toEqual(widgets);
  expect(loadLayout(key, 'Executive').error).toContain('invalid');
  const moved = movePanel(widgets, 'actions', 'journey');
  expect(moved[0].id).toBe('actions');
  expect(widgets[0].id).toBe('journey');
  expect(movePanel(widgets, 'untrusted', 'journey')).toBe(widgets);
});
test('accessible move/resize/hide, cancel, save/reload/reset are personal and never mutate business APIs', () => {
  const request = vi.spyOn(globalThis, 'fetch');
  const view = render(<Workspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move Action Center up' }));
  fireEvent.change(screen.getByLabelText('Width of Action Center'), { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: 'Hide VIN journey' }));
  expect(screen.queryByText('journey data panel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByText('journey data panel')).toBeInTheDocument();
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move Action Center up' }));
  fireEvent.change(screen.getByLabelText('Width of Action Center'), { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: 'Hide VIN journey' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  const saved = JSON.parse(localStorage.getItem(layoutKey(1, 'admin', 'Executive')) || '{}');
  expect(saved.widgets[0]).toEqual({ id: 'actions', span: 6, visible: true });
  expect(saved.widgets.find((item: { id: string }) => item.id === 'journey').visible).toBe(false);
  expect(Object.keys(saved).sort()).toEqual(['version', 'widgets']);
  view.unmount();
  const restored = render(<Workspace />);
  expect(screen.queryByText('journey data panel')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByText('journey data panel')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
  restored.unmount();
  const isolated = render(<Workspace employee={2} role="inventory" />);
  expect(screen.getByText('journey data panel')).toBeInTheDocument();
  expect(localStorage.getItem(layoutKey(2, 'inventory', 'Executive'))).toBeNull();
  expect(request).not.toHaveBeenCalled();
  expect(rolePreset('inventory')).toBe('Inventory');
  expect(rolePreset('sales')).toBe('Operations');
  isolated.unmount();
  request.mockRestore();
});
test('blocked personal storage reports an error without crashing or falsely claiming save', () => {
  const view = render(<Workspace />);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
    expect(screen.getByLabelText('Layout message')).toHaveTextContent('Could not save');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  } finally {
    write.mockRestore();
    warning.mockRestore();
    view.unmount();
  }
});
