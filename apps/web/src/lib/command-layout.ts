import { useState } from 'react';
import { commandPanels } from '../../../../shared/command-center.js';
export type Preset = 'Executive' | 'Operations' | 'Inventory';
export type PanelId = (typeof commandPanels)[number];
export interface PanelSetting {
  id: PanelId;
  span: number;
  visible: boolean;
}
const spans = [4, 6, 8, 12];
const orders: Record<Preset, [PanelId, number][]> = {
  Executive: [
    ['journey', 8],
    ['actions', 4],
    ['stock', 6],
    ['pulse', 6],
    ['branches', 8],
    ['activity', 4],
    ['models', 12],
  ],
  Operations: [
    ['actions', 4],
    ['journey', 8],
    ['stock', 8],
    ['models', 4],
    ['branches', 8],
    ['activity', 4],
    ['pulse', 12],
  ],
  Inventory: [
    ['stock', 8],
    ['models', 4],
    ['journey', 8],
    ['actions', 4],
    ['branches', 8],
    ['pulse', 4],
    ['activity', 12],
  ],
};
export const rolePreset = (role: string): Preset =>
  role === 'inventory' ? 'Inventory' : role === 'admin' ? 'Executive' : 'Operations';
export const layoutKey = (employee: number, role: string, preset: Preset) =>
  `dealerflow.layout.v1:${employee}:${role}:${preset}`;
export const defaultLayout = (preset: Preset): PanelSetting[] =>
  orders[preset].map(([id, span]) => ({ id, span, visible: true }));
export function validateLayout(
  value: unknown,
): value is { version: number; widgets: PanelSetting[] } {
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('widgets' in value) ||
    !Array.isArray(value.widgets)
  )
    return false;
  return (
    value.widgets.length === commandPanels.length &&
    new Set(value.widgets.map((widget) => widget?.id)).size === commandPanels.length &&
    value.widgets.every(
      (widget) =>
        widget &&
        commandPanels.includes(widget.id) &&
        spans.includes(widget.span) &&
        typeof widget.visible === 'boolean',
    )
  );
}
export function loadLayout(key: string, preset: Preset) {
  try {
    const text = localStorage.getItem(key);
    if (!text) return { widgets: defaultLayout(preset), error: '' };
    const value: unknown = JSON.parse(text);
    if (!validateLayout(value))
      return {
        widgets: defaultLayout(preset),
        error: 'Saved layout is outdated or invalid. Default restored; save to replace it.',
      };
    return { widgets: value.widgets, error: '' };
  } catch (error) {
    console.warn('Personal layout could not be read', error);
    return {
      widgets: defaultLayout(preset),
      error: 'Personal storage is unavailable. Defaults remain usable.',
    };
  }
}
export function movePanel(widgets: PanelSetting[], id: string, target: string) {
  const from = widgets.findIndex((widget) => widget.id === id);
  const to = widgets.findIndex((widget) => widget.id === target);
  if (from < 0 || to < 0) return widgets;
  const next = [...widgets];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function usePersonalLayout(employee: number, role: string, preset: Preset) {
  const key = layoutKey(employee, role, preset);
  const [initial] = useState(() => loadLayout(key, preset));
  const [saved, setSaved] = useState(initial.widgets);
  const [draft, setDraft] = useState(initial.widgets);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(initial.error);
  const patch = (id: string, change: Partial<PanelSetting>) =>
    setDraft((items) => items.map((item) => (item.id === id ? { ...item, ...change } : item)));
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, widgets: draft }));
      setSaved(draft);
      setEditing(false);
      setMessage('Personal layout saved for this employee, role and preset.');
    } catch (error) {
      console.warn('Personal layout could not be saved', error);
      setMessage(
        'Could not save personal layout. Storage may be full or blocked; draft is still available.',
      );
    }
  };
  return {
    widgets: editing ? draft : saved,
    editing,
    message,
    patch,
    save,
    customize: () => {
      setDraft(saved);
      setEditing(true);
      setMessage('Edit mode: drag, move, resize or hide panels. Business data is unaffected.');
    },
    cancel: () => {
      setDraft(saved);
      setEditing(false);
      setMessage('Layout changes cancelled.');
    },
    reset: () => {
      setDraft(defaultLayout(preset));
      setEditing(true);
      setMessage('Default layout restored in draft. Save or cancel.');
    },
    move: (id: string, target: string) => setDraft((items) => movePanel(items, id, target)),
  };
}
export type LayoutController = ReturnType<typeof usePersonalLayout>;
