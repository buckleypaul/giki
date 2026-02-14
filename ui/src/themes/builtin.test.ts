import { describe, it, expect } from 'vitest';
import { builtinThemes, builtinThemeMap } from './builtin';
import type { ThemeDefinition } from './types';

const REQUIRED_COLOR_KEYS = [
  // Core properties from themes.css
  'bg-primary',
  'bg-secondary',
  'bg-tertiary',
  'bg-hover',
  'bg-active',
  'text-primary',
  'text-secondary',
  'text-tertiary',
  'text-inverse',
  'border-color',
  'border-color-light',
  'accent-color',
  'accent-hover',
  'accent-active',
  'color-success',
  'color-warning',
  'color-error',
  'color-info',
  'code-bg',
  'code-border',
  'code-text',
  'link-color',
  'link-hover',
  'link-visited',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'overlay-bg',
  // Additional properties used in component CSS
  'hover-bg',
  'error-color',
  'primary-color',
  'primary-hover',
  'table-header-bg',
  'table-alt-bg',
  'spinner-track',
  'spinner-color',
  'link-color-alpha',
];

describe('built-in themes', () => {
  it('exports exactly 9 themes', () => {
    expect(builtinThemes).toHaveLength(9);
  });

  it('has unique IDs', () => {
    const ids = builtinThemes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builtinThemeMap contains all themes', () => {
    expect(builtinThemeMap.size).toBe(builtinThemes.length);
    for (const theme of builtinThemes) {
      expect(builtinThemeMap.get(theme.id)).toBe(theme);
    }
  });

  it.each(builtinThemes.map((t) => [t.id, t] as [string, ThemeDefinition]))(
    '%s has required fields',
    (_id, theme) => {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.author).toBeTruthy();
      expect(['light', 'dark']).toContain(theme.type);
      expect(theme.highlightTheme).toBeTruthy();
      expect(typeof theme.colors).toBe('object');
    }
  );

  it.each(builtinThemes.map((t) => [t.id, t] as [string, ThemeDefinition]))(
    '%s defines all required CSS properties',
    (_id, theme) => {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(theme.colors[key], `missing color key: ${key}`).toBeDefined();
        expect(theme.colors[key], `empty color key: ${key}`).not.toBe('');
      }
    }
  );

  it('includes light and dark base themes', () => {
    expect(builtinThemeMap.has('light')).toBe(true);
    expect(builtinThemeMap.has('dark')).toBe(true);
  });
});
