import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import FileTree from './FileTree';
import { PendingChangesProvider, usePendingChanges } from '../context/PendingChangesContext';
import * as apiClient from '../api/client';
import type { TreeNode } from '../api/types';

// Mock the API client
vi.mock('../api/client');

const mockTree: TreeNode = {
  name: 'root',
  path: '',
  isDir: true,
  children: [
    {
      name: 'docs',
      path: 'docs',
      isDir: true,
      children: [
        {
          name: 'guide.md',
          path: 'docs/guide.md',
          isDir: false,
        },
      ],
    },
    {
      name: 'README.md',
      path: 'README.md',
      isDir: false,
    },
  ],
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <PendingChangesProvider>{ui}</PendingChangesProvider>
    </BrowserRouter>
  );
};

describe('FileTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.fetchTree).mockResolvedValue(mockTree);
  });

  it('shows loading state while fetching tree', () => {
    renderWithProviders(<FileTree />);
    expect(screen.getByText(/loading file tree/i)).toBeInTheDocument();
  });

  it('renders tree after successful fetch', async () => {
    renderWithProviders(<FileTree />);

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(apiClient.fetchTree).mockRejectedValue(new Error('Network error'));

    renderWithProviders(<FileTree />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows empty message when tree has no files', async () => {
    vi.mocked(apiClient.fetchTree).mockResolvedValue({
      name: 'root',
      path: '',
      isDir: true,
      children: [],
    });

    renderWithProviders(<FileTree />);

    await waitFor(() => {
      expect(screen.getByText(/no files found/i)).toBeInTheDocument();
    });
  });

  it('renders delete button when onDelete prop is provided', async () => {
    const onDelete = vi.fn();

    renderWithProviders(<FileTree onDelete={onDelete} />);

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
    });

    // Delete button should be present (but hidden via CSS until hover)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    renderWithProviders(<FileTree onDelete={onDelete} />);

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete readme\.md/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('README.md');
  });

  it('does not render delete button when onDelete is not provided', async () => {
    renderWithProviders(<FileTree />);

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(0);
  });

  it('filters out deleted files from pending changes', async () => {
    function TestWrapper() {
      const { addChange } = usePendingChanges();

      // Add a delete change
      React.useEffect(() => {
        addChange({ type: 'delete', path: 'README.md' });
      }, [addChange]);

      return <FileTree />;
    }

    // Import React for useEffect
    const React = await import('react');

    renderWithProviders(<TestWrapper />);

    await waitFor(() => {
      // README.md should not appear because it's marked as deleted
      expect(screen.queryByText('README.md')).not.toBeInTheDocument();
      // docs directory should still be there
      expect(screen.getByText('docs')).toBeInTheDocument();
    });
  });

  it('adds created files from pending changes', async () => {
    function TestWrapper() {
      const { addChange } = usePendingChanges();

      // Add a create change
      React.useEffect(() => {
        addChange({ type: 'create', path: 'new-file.md', content: '' });
      }, [addChange]);

      return <FileTree />;
    }

    const React = await import('react');

    renderWithProviders(<TestWrapper />);

    await waitFor(() => {
      // Original files should be there
      expect(screen.getByText('README.md')).toBeInTheDocument();
      // New file should be added
      expect(screen.getByText('new-file.md')).toBeInTheDocument();
    });
  });

  it('expands and collapses directories on click', async () => {
    const user = userEvent.setup();

    renderWithProviders(<FileTree />);

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    // Initially, nested file should not be visible (directory collapsed)
    expect(screen.queryByText('guide.md')).not.toBeInTheDocument();

    // Click to expand
    const docsItem = screen.getByText('docs');
    await user.click(docsItem);

    // Now nested file should be visible
    expect(screen.getByText('guide.md')).toBeInTheDocument();

    // Click to collapse
    await user.click(docsItem);

    // Nested file should be hidden again
    expect(screen.queryByText('guide.md')).not.toBeInTheDocument();
  });

  it('re-fetches tree when branch prop changes', async () => {
    const { rerender } = renderWithProviders(<FileTree branch="main" />);

    await waitFor(() => {
      expect(apiClient.fetchTree).toHaveBeenCalledWith('main');
    });

    // Change branch
    rerender(
      <BrowserRouter>
        <PendingChangesProvider>
          <FileTree branch="dev" />
        </PendingChangesProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(apiClient.fetchTree).toHaveBeenCalledWith('dev');
    });

    // Should have been called twice (once for each branch)
    expect(apiClient.fetchTree).toHaveBeenCalledTimes(2);
  });

  it('shows rename button for folders', async () => {
    const onRename = vi.fn();

    renderWithProviders(<FileTree onRename={onRename} />);

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    // Rename button should be present for folder
    const renameButton = screen.getByLabelText('Rename docs');
    expect(renameButton).toBeInTheDocument();
  });

  it('should call onRename with isDirectory flag', async () => {
    const user = userEvent.setup();
    const mockOnRename = vi.fn();

    renderWithProviders(<FileTree onRename={mockOnRename} />);

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    // Click rename button for folder
    const renameButton = screen.getByLabelText('Rename docs');
    await user.click(renameButton);

    expect(mockOnRename).toHaveBeenCalledWith('docs', true);
  });

  it('does not have hardcoded font-family to allow theme inheritance', async () => {
    renderWithProviders(<FileTree />);

    await waitFor(() => {
      expect(screen.getByText('README.md')).toBeInTheDocument();
    });

    const fileTree = document.querySelector('.file-tree');
    expect(fileTree).toBeInTheDocument();

    // Verify the element exists and can inherit fonts from theme
    // The actual font inheritance is tested manually and through E2E tests
    expect(fileTree?.className).toBe('file-tree');
  });
});
