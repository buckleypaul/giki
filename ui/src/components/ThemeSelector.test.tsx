import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from './ThemeSelector';
import { builtinThemes } from '../themes/builtin';

const mockSetThemeId = vi.fn();

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    themeId: 'light',
    theme: builtinThemes[0],
    setThemeId: mockSetThemeId,
    availableThemes: builtinThemes,
  }),
}));

describe('ThemeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with current theme name', () => {
    render(<ThemeSelector />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('is collapsed by default', () => {
    render(<ThemeSelector />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('Appearance'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('collapses when header is clicked again', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('Appearance'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Appearance'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('lists all available themes when expanded', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('Appearance'));

    const listItems = document.querySelectorAll('.theme-selector-name');
    const names = Array.from(listItems).map((el) => el.textContent);
    for (const theme of builtinThemes) {
      expect(names).toContain(theme.name);
    }
  });

  it('shows checkmark for active theme', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('Appearance'));

    expect(screen.getByLabelText('Active theme')).toBeInTheDocument();
  });

  it('calls setThemeId when a theme is clicked', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('Appearance'));
    fireEvent.click(screen.getByText('Dracula'));

    expect(mockSetThemeId).toHaveBeenCalledWith('dracula');
  });

  it('renders color swatches for each theme', () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByText('Appearance'));

    const swatches = document.querySelectorAll('.theme-selector-swatch');
    expect(swatches.length).toBe(builtinThemes.length);
  });

  it('has correct aria-expanded attribute', () => {
    render(<ThemeSelector />);
    const header = screen.getByRole('button', { name: /appearance/i });

    expect(header).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });
});
