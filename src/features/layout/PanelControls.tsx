import { PanelBottom, PanelLeft, PanelRight } from 'lucide-react';

export function PanelControls({
  leftOpen,
  rightOpen,
  bottomOpen,
  onLeft,
  onRight,
  onBottom,
  leftTarget,
  rightTarget,
}: {
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  onLeft: () => void;
  onRight: () => void;
  onBottom: () => void;
  leftTarget?: string;
  rightTarget?: string;
}) {
  const panels = [
    {
      side: 'left',
      Icon: PanelLeft,
      indicator: { x: 4.5, y: 4.5, width: 3, height: 15 },
      open: leftOpen,
      onClick: onLeft,
      label: 'left panel',
      target: leftTarget,
    },
    {
      side: 'bottom',
      Icon: PanelBottom,
      indicator: { x: 4.5, y: 16.5, width: 15, height: 3 },
      open: bottomOpen,
      onClick: onBottom,
      label: 'bottom controller',
      target: 'viewer-controls',
    },
    {
      side: 'right',
      Icon: PanelRight,
      indicator: { x: 16.5, y: 4.5, width: 3, height: 15 },
      open: rightOpen,
      onClick: onRight,
      label: 'right panel',
      target: rightTarget,
    },
  ] as const;
  return (
    <div className="panel-controls" role="group" aria-label="Panel visibility">
      {panels.map(({ side, Icon, indicator, open, onClick, label, target }) => (
        <button
          key={side}
          type="button"
          className={`icon-button panel-toggle ${open ? 'is-open' : ''}`}
          aria-label={`${open ? 'Hide' : 'Show'} ${label}`}
          title={`${open ? 'Hide' : 'Show'} ${label}`}
          aria-expanded={open}
          aria-controls={target}
          onClick={onClick}
        >
          <Icon className="panel-glyph" size={20} strokeWidth={1.5} aria-hidden="true">
            <rect className="panel-glyph-indicator" {...indicator} rx={0.75} stroke="none" />
          </Icon>
        </button>
      ))}
    </div>
  );
}
