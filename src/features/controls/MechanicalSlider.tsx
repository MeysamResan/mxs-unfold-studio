import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { SeparationDetents } from './separation-detents';

const RANGE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

export function MechanicalSlider({
  value,
  onChange,
  onInteractionStart,
  onDetent,
}: {
  value: number;
  onChange: (value: number) => void;
  onInteractionStart?: () => void;
  onDetent?: (value: number) => void;
}) {
  const id = useId();
  const detents = useRef(new SeparationDetents(value));
  const interacting = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    detents.current.sync(value);
  }, [value]);

  const beginInteraction = () => {
    if (interacting.current) return;
    interacting.current = true;
    setIsInteracting(true);
    detents.current.sync(value);
    onInteractionStart?.();
  };
  const endInteraction = () => {
    interacting.current = false;
    setIsInteracting(false);
  };

  return (
    <div className="separation-control" data-interacting={isInteracting || undefined}>
      <label htmlFor={id} className="separation-heading">
        <span>Separation</span>
        <output htmlFor={id} className="separation-readout">
          <span>{Math.round(value)}</span>
          <small>%</small>
        </output>
      </label>
      <div
        className="mechanical-range"
        style={{ '--range-progress': `${value}%` } as CSSProperties}
      >
        <div className="mechanical-track" aria-hidden="true">
          <div className="mechanical-rail">
            <div className="mechanical-fill" />
          </div>
          <div className="mechanical-thumb">
            <span />
          </div>
        </div>
        <div className="mechanical-scale" aria-hidden="true">
          {Array.from({ length: 21 }, (_, index) => (
            <i
              key={index}
              className={index % 5 === 0 ? 'major' : undefined}
              data-passed={value >= index * 5 || undefined}
              style={
                {
                  '--tick-proximity': Math.max(0, 1 - Math.abs(value - index * 5) / 18) ** 2,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <input
          id={id}
          className="mechanical-range-input"
          aria-label="Separation"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            beginInteraction();
          }}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          onLostPointerCapture={endInteraction}
          onBlur={endInteraction}
          onKeyDown={(event) => {
            if (RANGE_KEYS.has(event.key)) beginInteraction();
          }}
          onKeyUp={endInteraction}
          onChange={(event) => {
            const next = Number(event.target.value);
            beginInteraction();
            onChange(next);
            if (detents.current.advance(next, performance.now())) onDetent?.(next);
          }}
          aria-valuetext={`${Math.round(value)} percent separated`}
        />
      </div>
    </div>
  );
}
