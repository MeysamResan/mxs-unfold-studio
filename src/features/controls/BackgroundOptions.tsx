import { useEffect, useState } from 'react';

const storageKey = 'unfold-studio-background';
const presets = [
  ['Black', '#080808'],
  ['Charcoal', '#202020'],
  ['Gray', '#555555'],
  ['Light gray', '#e8e8e8'],
  ['Dark red', '#7d0000'],
] as const;

export function useStudioBackground() {
  const [background, setBackground] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (background) localStorage.setItem(storageKey, background);
      else localStorage.removeItem(storageKey);
    } catch {
      /* A private browser can still change the current background. */
    }
  }, [background]);
  return [background, setBackground] as const;
}

export function BackgroundOptions({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="background-options">
      <div className="background-presets" role="group" aria-label="Studio background presets">
        <button
          className={value === null ? 'is-selected' : ''}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          <span className="background-swatch theme-swatch" />
          Theme default
        </button>
        {presets.map(([name, color]) => (
          <button
            key={name}
            className={value === color ? 'is-selected' : ''}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
          >
            <span className="background-swatch" style={{ background: color }} />
            {name}
          </button>
        ))}
      </div>
      <label className="background-custom">
        <span>Custom color</span>
        <input
          type="color"
          aria-label="Custom background color"
          value={value ?? '#080808'}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{value ?? 'Theme default'}</span>
      </label>
    </div>
  );
}
