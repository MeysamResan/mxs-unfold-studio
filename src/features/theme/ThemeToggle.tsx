import { Moon, Sun } from 'lucide-react';
import type { Theme } from './use-theme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <span className="theme-toggle-orbit" aria-hidden="true">
        <Sun className="theme-toggle-icon theme-toggle-sun" size={20} strokeWidth={1.5} />
        <Moon className="theme-toggle-icon theme-toggle-moon" size={20} strokeWidth={1.5} />
      </span>
    </button>
  );
}
