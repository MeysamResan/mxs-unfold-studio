import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const storageKey = 'unfold-studio-theme';

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Privacy settings may disable storage; the current session still supports themes.
  }
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f3f3f3' : '#080808');
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Theme changes remain available without persistent storage.
    }
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === storageKey && (event.newValue === 'dark' || event.newValue === 'light')) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
