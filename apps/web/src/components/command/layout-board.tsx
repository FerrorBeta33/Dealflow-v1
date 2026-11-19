import { useState, type ReactNode } from 'react';
import { ArrowUp, ArrowDown, Eye, EyeOff, GripVertical } from 'lucide-react';
import type { LayoutController } from '../../lib/command-layout';
import { Button, Select } from '../ui';
export const panelNames: Record<string, string> = {
  journey: 'VIN journey',
  actions: 'Action Center',
  stock: 'Stock Intelligence',
  pulse: 'Sales & Cash Pulse',
  branches: 'Branch Performance',
  activity: 'Live Activity',
  models: 'Model Spotlight',
};
const spanClass: Record<number, string> = {
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
};
export function LayoutBoard({
  layout,
  render,
}: {
  layout: LayoutController;
  render: (id: string) => ReactNode;
}) {
  const [dragging, setDragging] = useState('');
  return (
    <>
      {layout.editing && (
        <p className="rounded-control border border-primary/20 bg-accent p-3 text-sm text-primary">
          Layout edit mode · desktop drag or labelled move buttons · widths stack on mobile · Save
          to keep changes
        </p>
      )}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {layout.widgets.map((widget, index) =>
          !widget.visible && !layout.editing ? null : (
            <article
              key={widget.id}
              aria-label={`${panelNames[widget.id]} panel`}
              draggable={layout.editing}
              onDragStart={(event) => {
                setDragging(widget.id);
                event.dataTransfer.setData('text/plain', widget.id);
              }}
              onDragOver={(event) => {
                if (layout.editing) event.preventDefault();
              }}
              onDrop={(event) => {
                if (layout.editing) {
                  event.preventDefault();
                  layout.move(event.dataTransfer.getData('text/plain'), widget.id);
                  setDragging('');
                }
              }}
              onDragEnd={() => setDragging('')}
              className={
                'min-w-0 rounded-container border bg-card p-4 shadow-surface transition duration-200 motion-reduce:transition-none ' +
                (spanClass[widget.span] || spanClass[6]) +
                (dragging === widget.id ? ' border-primary opacity-60' : ' border-border')
              }
            >
              {layout.editing && (
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
                  <GripVertical size={18} className="text-muted-foreground" aria-hidden="true" />
                  <strong className="mr-auto text-xs">{panelNames[widget.id]}</strong>
                  <Button
                    variant="secondary"
                    aria-label={`Move ${panelNames[widget.id]} up`}
                    disabled={index === 0}
                    onClick={() => layout.move(widget.id, layout.widgets[index - 1].id)}
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={`Move ${panelNames[widget.id]} down`}
                    disabled={index === layout.widgets.length - 1}
                    onClick={() => layout.move(widget.id, layout.widgets[index + 1].id)}
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </Button>
                  <Select
                    className="max-w-32"
                    aria-label={`Width of ${panelNames[widget.id]}`}
                    value={widget.span}
                    onChange={(event) =>
                      layout.patch(widget.id, { span: Number(event.target.value) })
                    }
                  >
                    <option value={4}>Compact</option>
                    <option value={6}>Half</option>
                    <option value={8}>Wide</option>
                    <option value={12}>Full</option>
                  </Select>
                  <Button
                    variant="secondary"
                    aria-label={`${widget.visible ? 'Hide' : 'Show'} ${panelNames[widget.id]}`}
                    onClick={() => layout.patch(widget.id, { visible: !widget.visible })}
                  >
                    {widget.visible ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </Button>
                </div>
              )}
              {widget.visible ? (
                render(widget.id)
              ) : (
                <p className="py-6 text-sm text-muted-foreground">
                  {panelNames[widget.id]} hidden in this personal layout.
                </p>
              )}
            </article>
          ),
        )}
      </div>
      {!layout.editing && layout.widgets.every((widget) => !widget.visible) && (
        <Button variant="secondary" onClick={layout.customize}>
          Restore hidden panels
        </Button>
      )}
    </>
  );
}
