import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ThemeDefinition } from '../themes/types';
import { builtinThemes, builtinThemeMap } from '../themes/builtin';
import { fetchUserThemes } from '../api/client';

interface ThemeContextType {
  themeId: string;
  theme: ThemeDefinition;
  setThemeId: (id: string) => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemType(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveThemeId(allThemes: ThemeDefinition[]): string {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem('giki-theme');
  if (stored) {
    // Direct match
    if (allThemes.some((t) => t.id === stored)) return stored;
    // Backwards compat: 'light' and 'dark' are valid built-in IDs
    if (stored === 'light' || stored === 'dark') return stored;
  }

  // System preference match
  const systemType = getSystemType();
  const match = allThemes.find((t) => t.type === systemType);
  if (match) return match.id;

  return 'light';
}

function findTheme(id: string, allThemes: ThemeDefinition[]): ThemeDefinition {
  return allThemes.find((t) => t.id === id) || builtinThemeMap.get('light')!;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [allThemes, setAllThemes] = useState<ThemeDefinition[]>(builtinThemes);
  const [themeId, setThemeIdState] = useState<string>(() => resolveThemeId(builtinThemes));
  const appliedPropsRef = useRef<Set<string>>(new Set());

  // Fetch user themes on mount
  useEffect(() => {
    fetchUserThemes().then((userThemes) => {
      if (userThemes.length === 0) return;
      // Merge: built-in IDs take precedence
      const builtinIds = new Set(builtinThemes.map((t) => t.id));
      const filtered = userThemes.filter((t) => !builtinIds.has(t.id));
      if (filtered.length > 0) {
        setAllThemes([...builtinThemes, ...filtered]);
      }
    });
  }, []);

  const theme = findTheme(themeId, allThemes);

  // Apply theme to DOM
  useEffect(() => {
    const style = document.documentElement.style;
    const newProps = new Set<string>();

    // Set all color properties
    for (const [key, value] of Object.entries(theme.colors)) {
      const prop = `--${key}`;
      style.setProperty(prop, value);
      newProps.add(prop);
    }

    // Clean up properties that were set previously but not in the new theme
    for (const prop of appliedPropsRef.current) {
      if (!newProps.has(prop)) {
        style.removeProperty(prop);
      }
    }

    appliedPropsRef.current = newProps;

    // Set data attributes
    document.documentElement.setAttribute('data-theme', theme.type);
    document.documentElement.setAttribute('data-highlight-theme', theme.highlightTheme);

    // Persist
    localStorage.setItem('giki-theme', theme.id);
  }, [theme]);

  const setThemeId = (id: string) => {
    if (allThemes.some((t) => t.id === id)) {
      setThemeIdState(id);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeId, theme, setThemeId, availableThemes: allThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
