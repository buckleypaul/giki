export interface ThemeDefinition {
  id: string;
  name: string;
  author: string;
  type: 'light' | 'dark';
  highlightTheme: string;
  colors: Record<string, string>;
  fonts?: Record<string, string>;
}
