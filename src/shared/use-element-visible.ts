import { useEffect, useRef, useState } from 'react';

type VisibilityListener = (visible: boolean) => void;
const targets = new Map<Element, Set<VisibilityListener>>();
let viewportObserver: IntersectionObserver | null = null;

function observeVisibility(element: Element, listener: VisibilityListener) {
  // One observer serves the viewer and an arbitrarily large catalog.
  viewportObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const visible =
          entry.isIntersecting &&
          entry.intersectionRect.width > 0 &&
          entry.intersectionRect.height > 0;
        for (const callback of targets.get(entry.target) ?? []) callback(visible);
      }
    },
    { root: null, rootMargin: '0px', threshold: [0, 0.001] },
  );
  let listeners = targets.get(element);
  if (!listeners) {
    listeners = new Set();
    targets.set(element, listeners);
    viewportObserver.observe(element);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      viewportObserver?.unobserve(element);
      targets.delete(element);
    }
    if (targets.size === 0) {
      viewportObserver?.disconnect();
      viewportObserver = null;
    }
  };
}

/** Track actual visible pixels, including clipping by nested scroll areas. */
export function useElementVisible<T extends HTMLElement>({
  once = false,
}: { once?: boolean } = {}) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    let observing = true;
    const unobserve = observeVisibility(element, (inViewport) => {
      if (!observing) return;
      setVisible(inViewport);
      if (once && inViewport) {
        observing = false;
        unobserve();
      }
    });
    return () => {
      if (observing) unobserve();
      observing = false;
    };
  }, [once]);

  return [ref, visible] as const;
}
