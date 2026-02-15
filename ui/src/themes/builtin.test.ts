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
  it('exports exactly 10 themes', () => {
    expect(builtinThemes).toHaveLength(10);
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

describe('ThemeDefinition interface', () => {
  it('should allow optional fonts property', () => {
    const themeWithFonts: ThemeDefinition = {
      id: 'test',
      name: 'Test',
      author: 'Test',
      type: 'dark',
      highlightTheme: 'monokai',
      colors: {
        'bg-primary': '#000000',
      },
      fonts: {
        'font-family': 'monospace',
      },
    };

    expect(themeWithFonts.fonts).toBeDefined();
    expect(themeWithFonts.fonts?.['font-family']).toBe('monospace');
  });

  it('should work without fonts property', () => {
    const themeWithoutFonts: ThemeDefinition = {
      id: 'test',
      name: 'Test',
      author: 'Test',
      type: 'dark',
      highlightTheme: 'monokai',
      colors: {
        'bg-primary': '#000000',
      },
    };

    expect(themeWithoutFonts.fonts).toBeUndefined();
  });
});

describe('Terminal Dark theme', () => {
  it('should exist in builtin themes', () => {
    const terminalDark = builtinThemes.find((t) => t.id === 'terminal-dark');
    expect(terminalDark).toBeDefined();
  });

  it('should have correct metadata', () => {
    const terminalDark = builtinThemes.find((t) => t.id === 'terminal-dark')!;
    expect(terminalDark.name).toBe('Terminal Dark');
    expect(terminalDark.author).toBe('Giki');
    expect(terminalDark.type).toBe('dark');
    expect(terminalDark.highlightTheme).toBe('monokai');
  });

  it('should have monospace font', () => {
    const terminalDark = builtinThemes.find((t) => t.id === 'terminal-dark')!;
    expect(terminalDark.fonts).toBeDefined();
    expect(terminalDark.fonts?.['font-family']).toContain('Monaco');
    expect(terminalDark.fonts?.['font-family']).toContain('monospace');
  });

  it('should have terminal color palette', () => {
    const terminalDark = builtinThemes.find((t) => t.id === 'terminal-dark')!;
    expect(terminalDark.colors['bg-primary']).toBe('#000000');
    expect(terminalDark.colors['text-primary']).toBe('#ffffff');
    expect(terminalDark.colors['bg-secondary']).toBe('#0a0a0a');
  });
});
