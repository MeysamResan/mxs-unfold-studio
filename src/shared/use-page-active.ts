import { useEffect, useState } from 'react';

export function usePageActive(): boolean {
  const [active, setActive] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return active;
}
