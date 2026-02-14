import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPanel } from './SearchPanel';
import { BrowserRouter } from 'react-router-dom';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client');

const mockSearch = vi.mocked(apiClient.search);

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithRouter(
      <SearchPanel isOpen={false} onClose={() => {}} />
    );
    expect(container.querySelector('.search-panel-overlay')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText(/Search filenames/i)).toBeInTheDocument();
  });

  it('renders search input and toggle buttons', () => {
    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByPlaceholderText(/Search filenames/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filename/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /content/i })).toBeInTheDocument();
  });

  it('shows filename as active by default', () => {
    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const filenameBtn = screen.getByRole('button', { name: /filename/i });
    const contentBtn = screen.getByRole('button', { name: /content/i });

    expect(filenameBtn).toHaveClass('active');
    expect(contentBtn).not.toHaveClass('active');
  });

  it('switches to content search when content button clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const contentBtn = screen.getByRole('button', { name: /content/i });
    await user.click(contentBtn);

    expect(contentBtn).toHaveClass('active');
    expect(screen.getByPlaceholderText(/Search file content/i)).toBeInTheDocument();
  });

  it('debounces search requests (300ms)', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([{ path: 'test.md' }]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);

    // Type quickly
    await user.type(input, 'test');

    // Should not call immediately
    expect(mockSearch).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 }
    );
  });

  it('calls search API with filename type', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([{ path: 'setup.md' }]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.type(input, 'setup');

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('setup', 'filename');
    });
  });

  it('calls search API with content type', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([
      {
        path: 'README.md',
        lineNumber: 5,
        context: ['Line before', 'Match line', 'Line after'],
        matchText: 'install',
      },
    ]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    // Switch to content search
    const contentBtn = screen.getByRole('button', { name: /content/i });
    await user.click(contentBtn);

    const input = screen.getByPlaceholderText(/Search file content/i);
    await user.type(input, 'install');

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('install', 'content');
    });
  });

  it('displays filename search results', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([{ path: 'docs/setup.md' }, { path: 'src/setup.go' }]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.type(input, 'setup');

    await waitFor(() => {
      expect(screen.getByText('docs/setup.md')).toBeInTheDocument();
      expect(screen.getByText('src/setup.go')).toBeInTheDocument();
    });
  });

  it('displays content search results with line numbers and context', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([
      {
        path: 'README.md',
        lineNumber: 5,
        context: ['Before line', 'Matched install line', 'After line'],
        matchText: 'install',
      },
    ]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    // Switch to content search
    const contentBtn = screen.getByRole('button', { name: /content/i });
    await user.click(contentBtn);

    const input = screen.getByPlaceholderText(/Search file content/i);
    await user.type(input, 'install');

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText(':5')).toBeInTheDocument();
      expect(screen.getByText('Matched install line')).toBeInTheDocument();
    });
  });

  it('shows "No results found" when search returns empty array', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.type(input, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('shows loading state during search', async () => {
    const user = userEvent.setup();
    // Create a promise that we can control
    let resolveSearch: (value: any) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    mockSearch.mockReturnValue(searchPromise as any);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    // Resolve the search
    resolveSearch!([]);
  });

  it('shows error message on search failure', async () => {
    const user = userEvent.setup();
    mockSearch.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('closes panel when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<SearchPanel isOpen={true} onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('closes panel when clicking overlay', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<SearchPanel isOpen={true} onClose={onClose} />);

    const overlay = screen.getByRole('button', { name: /filename/i }).closest('.search-panel-overlay');
    await user.click(overlay as HTMLElement);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside panel', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<SearchPanel isOpen={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.click(input);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('limits results to 50 items', async () => {
    const user = userEvent.setup();
    // Create 100 mock results
    const manyResults = Array.from({ length: 100 }, (_, i) => ({ path: `file${i}.md` }));
    mockSearch.mockResolvedValue(manyResults);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i);
    await user.type(input, 'file');

    await waitFor(() => {
      const results = screen.getAllByRole('listitem');
      expect(results.length).toBe(50);
    });
  });

  it('shows hint message when query is empty', () => {
    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    expect(screen.getByText(/Type to search filenames/i)).toBeInTheDocument();
  });

  it('clears results when query is cleared', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue([{ path: 'test.md' }]);

    renderWithRouter(<SearchPanel isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Search filenames/i) as HTMLInputElement;

    // Type and wait for results
    await user.type(input, 'test');
    await waitFor(() => {
      expect(screen.getByText('test.md')).toBeInTheDocument();
    });

    // Clear input
    await user.clear(input);

    await waitFor(() => {
      expect(screen.queryByText('test.md')).not.toBeInTheDocument();
      expect(screen.getByText(/Type to search filenames/i)).toBeInTheDocument();
    });
  });
});
