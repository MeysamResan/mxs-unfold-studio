import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  id?: string;
  style?: CSSProperties;
  fill?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

type ScrollGeometry = {
  maximum: number;
  travel: number;
};

/** Native vertical scrolling with a draggable overlay that never reserves layout space. */
export function ScrollArea({
  children,
  className,
  viewportClassName,
  contentClassName,
  id,
  style,
  fill = false,
  'aria-label': label,
  'aria-labelledby': labelledBy,
}: ScrollAreaProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const geometryRef = useRef<ScrollGeometry>({ maximum: 0, travel: 0 });
  const dragRef = useRef<{ pointerId: number; startY: number; startScroll: number } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!root || !viewport || !content || !track || !thumb) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const trackHeight = track.clientHeight;
      const height = Math.min(
        trackHeight,
        Math.max(28, (viewport.clientHeight / Math.max(1, viewport.scrollHeight)) * trackHeight),
      );
      const travel = Math.max(0, trackHeight - height);
      const position = maximum > 0 ? (Math.max(0, viewport.scrollTop) / maximum) * travel : 0;
      geometryRef.current = { maximum, travel };
      root.dataset.overflow = maximum > 1 && travel > 0 ? 'true' : 'false';
      thumb.style.height = `${height}px`;
      thumb.style.transform = `translateY(${Math.min(travel, position)}px)`;
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(viewport);
    observer.observe(content);
    observer.observe(track);
    viewport.addEventListener('scroll', scheduleUpdate, { passive: true });
    // Transformed entrances affect scroll extents without changing observed layout sizes.
    viewport.addEventListener('animationend', scheduleUpdate);
    viewport.addEventListener('animationcancel', scheduleUpdate);
    viewport.addEventListener('transitionend', scheduleUpdate);
    update();

    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', scheduleUpdate);
      viewport.removeEventListener('animationend', scheduleUpdate);
      viewport.removeEventListener('animationcancel', scheduleUpdate);
      viewport.removeEventListener('transitionend', scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
      const pointerId = dragRef.current?.pointerId;
      if (pointerId !== undefined && thumb.hasPointerCapture(pointerId)) {
        thumb.releasePointerCapture(pointerId);
      }
      dragRef.current = null;
    };
  }, []);

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (rootRef.current) rootRef.current.dataset.dragging = 'false';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={rootRef}
      id={id}
      className={['scroll-area', fill && 'scroll-area-fill', className].filter(Boolean).join(' ')}
      style={style}
      data-overflow="false"
    >
      <div
        ref={viewportRef}
        className={['scroll-area-viewport', viewportClassName].filter(Boolean).join(' ')}
        tabIndex={0}
        role={label || labelledBy ? 'region' : undefined}
        aria-label={label}
        aria-labelledby={labelledBy}
      >
        <div
          ref={contentRef}
          className={['scroll-area-content', contentClassName].filter(Boolean).join(' ')}
        >
          {children}
        </div>
      </div>
      <div ref={trackRef} className="scroll-area-track" aria-hidden="true">
        <div
          ref={thumbRef}
          className="scroll-area-thumb"
          onPointerDown={(event) => {
            if (event.button !== 0 || !viewportRef.current || !geometryRef.current.travel) return;
            event.preventDefault();
            dragRef.current = {
              pointerId: event.pointerId,
              startY: event.clientY,
              startScroll: viewportRef.current.scrollTop,
            };
            if (rootRef.current) rootRef.current.dataset.dragging = 'true';
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            const viewport = viewportRef.current;
            const { maximum, travel } = geometryRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !viewport || travel <= 0) return;
            viewport.scrollTop =
              drag.startScroll + ((event.clientY - drag.startY) / travel) * maximum;
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      </div>
    </div>
  );
}
