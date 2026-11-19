import { LayoutGrid, Save, RotateCcw, X } from 'lucide-react';
import type { LayoutController, Preset } from '../../lib/command-layout';
import { Button, Select } from '../ui';
export function LayoutToolbar({
  layout,
  preset,
  changePreset,
}: {
  layout: LayoutController;
  preset: Preset;
  changePreset: (preset: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="workspace-preset">
        Workspace preset
      </label>
      <Select
        id="workspace-preset"
        className="max-w-40"
        value={preset}
        disabled={layout.editing}
        onChange={(event) => changePreset(event.target.value)}
      >
        {[
          ['Executive', 'Executive Pulse'],
          ['Operations', 'Operations Flow'],
          ['Inventory', 'Inventory Focus'],
        ].map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {layout.editing ? (
        <>
          <Button onClick={layout.save}>
            <Save size={16} aria-hidden="true" />
            Save layout
          </Button>
          <Button variant="secondary" onClick={layout.cancel}>
            <X size={16} aria-hidden="true" />
            Cancel
          </Button>
          <Button variant="secondary" onClick={layout.reset}>
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </Button>
        </>
      ) : (
        <Button variant="secondary" onClick={layout.customize}>
          <LayoutGrid size={16} aria-hidden="true" />
          Customize
        </Button>
      )}
    </div>
  );
}
