import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Mock the API client
vi.mock('../api/client', () => ({
  fetchUserThemes: vi.fn(() => Promise.resolve([])),
}));

describe('ThemeContext', () => {
  let localStorageMock: { [key: string]: string };
  let matchMediaMock: {
    matches: boolean;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
    });

    // Mock matchMedia for system preference
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => matchMediaMock),
      writable: true,
    });

    // Mock document.documentElement methods
    document.documentElement.setAttribute = vi.fn();
    vi.spyOn(document.documentElement.style, 'setProperty');
    vi.spyOn(document.documentElement.style, 'removeProperty');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useTheme hook', () => {
    it('throws error when used outside provider', () => {
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('provides context when used within provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeId).toBeDefined();
      expect(result.current.theme).toBeDefined();
      expect(result.current.setThemeId).toBeDefined();
      expect(result.current.availableThemes).toBeDefined();
      expect(typeof result.current.setThemeId).toBe('function');
    });
  });

  describe('Default theme', () => {
    it('defaults to light theme when no localStorage and system is light', () => {
      matchMediaMock.matches = false;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeId).toBe('light');
      expect(result.current.theme.type).toBe('light');
    });

    it('defaults to dark theme when system preference is dark', () => {
      matchMediaMock.matches = true;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeId).toBe('dark');
      expect(result.current.theme.type).toBe('dark');
    });

    it('uses localStorage value over system preference', () => {
      matchMediaMock.matches = true; // System prefers dark
      localStorageMock['giki-theme'] = 'light'; // But localStorage has light

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeId).toBe('light');
    });

    it('handles backwards-compatible light/dark localStorage values', () => {
      localStorageMock['giki-theme'] = 'dark';

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themeId).toBe('dark');
      expect(result.current.theme.id).toBe('dark');
    });
  });

  describe('setThemeId', () => {
    it('switches to a valid theme', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeId('dracula');
      });

      expect(result.current.themeId).toBe('dracula');
      expect(result.current.theme.id).toBe('dracula');
    });

    it('ignores invalid theme IDs', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });
      const initialId = result.current.themeId;

      act(() => {
        result.current.setThemeId('nonexistent-theme');
      });

      expect(result.current.themeId).toBe(initialId);
    });

    it('can switch between multiple themes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeId('solarized-dark');
      });
      expect(result.current.themeId).toBe('solarized-dark');

      act(() => {
        result.current.setThemeId('catppuccin-mocha');
      });
      expect(result.current.themeId).toBe('catppuccin-mocha');

      act(() => {
        result.current.setThemeId('light');
      });
      expect(result.current.themeId).toBe('light');
    });
  });

  describe('Theme application', () => {
    it('sets CSS custom properties on document element', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--bg-primary',
        expect.any(String)
      );
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--text-primary',
        expect.any(String)
      );
    });

    it('sets data-theme attribute to theme type', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        'data-theme',
        result.current.theme.type
      );
    });

    it('sets data-highlight-theme attribute', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        'data-highlight-theme',
        result.current.theme.highlightTheme
      );
    });

    it('saves theme ID to localStorage', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(localStorage.setItem).toHaveBeenCalledWith('giki-theme', result.current.themeId);
    });
  });

  describe('availableThemes', () => {
    it('includes all 9 built-in themes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.availableThemes.length).toBe(9);
      const ids = result.current.availableThemes.map((t) => t.id);
      expect(ids).toContain('light');
      expect(ids).toContain('dark');
      expect(ids).toContain('dracula');
      expect(ids).toContain('catppuccin-mocha');
    });
  });
});
