import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { ThemeDefinition } from '../themes/types';
import './ThemeSelector.css';

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  const colors = [
    theme.colors['bg-primary'],
    theme.colors['bg-secondary'],
    theme.colors['accent-color'],
    theme.colors['text-primary'],
  ];

  return (
    <span className="theme-selector-swatch" aria-hidden="true">
      {colors.map((color, i) => (
        <span
          key={i}
          className="theme-selector-swatch-color"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export function ThemeSelector() {
  const { themeId, theme, setThemeId, availableThemes } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="theme-selector">
      <button
        className="theme-selector-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="theme-list"
      >
        <span className="theme-selector-label">Appearance</span>
        <span className="theme-selector-current">
          {theme.name}
          <span className={`theme-selector-chevron ${expanded ? 'expanded' : ''}`}>
            ▾
          </span>
        </span>
      </button>

      {expanded && (
        <ul id="theme-list" className="theme-selector-list" role="listbox" aria-label="Select theme">
          {availableThemes.map((t) => (
            <li key={t.id}>
              <button
                className={`theme-selector-item ${t.id === themeId ? 'active' : ''}`}
                onClick={() => setThemeId(t.id)}
                role="option"
                aria-selected={t.id === themeId}
              >
                <ThemeSwatch theme={t} />
                <span className="theme-selector-name">{t.name}</span>
                {t.id === themeId && (
                  <span className="theme-selector-check" aria-label="Active theme">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
