import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

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

    // Mock document.documentElement.setAttribute
    document.documentElement.setAttribute = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useTheme hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
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

      expect(result.current.theme).toBeDefined();
      expect(result.current.toggleTheme).toBeDefined();
      expect(typeof result.current.toggleTheme).toBe('function');
    });
  });

  describe('Default theme', () => {
    it('defaults to light theme when no localStorage and system is light', () => {
      matchMediaMock.matches = false;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
    });

    it('defaults to dark theme when system preference is dark', () => {
      matchMediaMock.matches = true;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('dark');
    });

    it('uses localStorage value over system preference', () => {
      matchMediaMock.matches = true; // System prefers dark
      localStorageMock['giki-theme'] = 'light'; // But localStorage has light

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      matchMediaMock.matches = false; // Start with light

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('toggles from dark to light', () => {
      matchMediaMock.matches = true; // Start with dark

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });

    it('can toggle multiple times', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      const initialTheme = result.current.theme;

      act(() => {
        result.current.toggleTheme();
      });

      const afterFirstToggle = result.current.theme;
      expect(afterFirstToggle).not.toBe(initialTheme);

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe(initialTheme);
    });
  });

  describe('Persistence', () => {
    it('saves theme to localStorage when changed', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('giki-theme', result.current.theme);
    });

    it('sets data-theme attribute on html element when theme changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
        'data-theme',
        result.current.theme
      );
    });
  });
});
