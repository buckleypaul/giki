import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { PendingChangesProvider, usePendingChanges } from '../context/PendingChangesContext';
import { BranchProvider } from '../context/BranchContext';
import PendingChanges from './PendingChanges';
import type { PendingChange } from '../context/PendingChangesContext';
import React from 'react';

// Mock API client
vi.mock('../api/client', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  moveFile: vi.fn().mockResolvedValue(undefined),
  commitChanges: vi.fn().mockResolvedValue({ hash: 'abc123' }),
  fetchTree: vi.fn().mockResolvedValue({ name: 'root', path: '/', isDirectory: true, children: [] }),
  fetchStatus: vi.fn().mockResolvedValue({ source: '/test/repo', branch: 'main', isDirty: false }),
  fetchBranches: vi.fn().mockResolvedValue([{ name: 'main', isDefault: true }]),
}));

// Wrapper component that pre-populates changes
function TestWrapper({ children, initialChanges = [] }: { children: React.ReactNode; initialChanges?: PendingChange[] }) {
  return (
    <BrowserRouter>
      <BranchProvider>
        <PendingChangesProvider>
          <ChangesSetter changes={initialChanges} />
          {children}
        </PendingChangesProvider>
      </BranchProvider>
    </BrowserRouter>
  );
}

// Helper component to set initial changes
function ChangesSetter({ changes }: { changes: PendingChange[] }) {
  const { addChange } = usePendingChanges();

  React.useEffect(() => {
    changes.forEach(addChange);
  }, []); // Only run once on mount

  return null;
}

function renderWithProviders(ui: React.ReactElement, initialChanges: PendingChange[] = []) {
  return render(<TestWrapper initialChanges={initialChanges}>{ui}</TestWrapper>);
}

describe('PendingChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <PendingChanges isOpen={false} onClose={vi.fn()} />
    );
    expect(container.querySelector('.dialog-overlay')).not.toBeInTheDocument();
  });

  it('renders modal with title when open', () => {
    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByRole('heading', { name: /Pending Changes/i })).toBeInTheDocument();
  });

  it('closes on close button click', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={handleClose} />
    );

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('closes on overlay click', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { container } = renderWithProviders(
      <PendingChanges isOpen={true} onClose={handleClose} />
    );

    const overlay = container.querySelector('.dialog-overlay')!;
    await user.click(overlay);

    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking inside dialog content', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { container } = renderWithProviders(
      <PendingChanges isOpen={true} onClose={handleClose} />
    );

    const dialogContent = container.querySelector('.dialog-content')!;
    await user.click(dialogContent);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('shows "No pending changes" when no changes', () => {
    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('No pending changes')).toBeInTheDocument();
  });

  it('shows count of pending changes in title', () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'new-file.md', content: 'test' },
      { type: 'modify', path: 'existing.md', content: 'updated' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    expect(screen.getByRole('heading', { name: /Pending Changes \(2\)/i })).toBeInTheDocument();
  });

  it('groups changes by type (created)', () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'file1.md', content: 'test1' },
      { type: 'create', path: 'file2.md', content: 'test2' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    const createdBadge = screen.getByText('Created');
    expect(createdBadge).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('groups changes by type (modified)', () => {
    const changes: PendingChange[] = [
      { type: 'modify', path: 'file1.md', content: 'updated1' },
      { type: 'modify', path: 'file2.md', content: 'updated2' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    const modifiedBadge = screen.getByText('Modified');
    expect(modifiedBadge).toBeInTheDocument();
  });

  it('groups changes by type (deleted)', () => {
    const changes: PendingChange[] = [
      { type: 'delete', path: 'file1.md' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    const deletedBadge = screen.getByText('Deleted');
    expect(deletedBadge).toBeInTheDocument();
  });

  it('groups changes by type (moved)', () => {
    const changes: PendingChange[] = [
      { type: 'move', path: 'new-path.md', oldPath: 'old-path.md' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    const movedBadge = screen.getByText('Moved');
    expect(movedBadge).toBeInTheDocument();
  });

  it('shows file path for created files', () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'docs/guide.md', content: 'test' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    expect(screen.getByText('docs/guide.md')).toBeInTheDocument();
  });

  it('shows old and new paths for moved files', () => {
    const changes: PendingChange[] = [
      { type: 'move', path: 'docs/new.md', oldPath: 'docs/old.md' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    expect(screen.getByText('docs/old.md')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('docs/new.md')).toBeInTheDocument();
  });

  it('shows discard button for each change', () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'file1.md', content: 'test' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    const discardButton = screen.getByTitle('Discard this change');
    expect(discardButton).toBeInTheDocument();
  });

  it('opens commit dialog when commit button is clicked', async () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'file1.md', content: 'test' },
    ];

    const user = userEvent.setup();
    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    const commitButton = screen.getByRole('button', { name: /Commit\.\.\./i });
    await user.click(commitButton);

    // Commit dialog should open
    expect(screen.getByRole('heading', { name: /Commit Changes/i })).toBeInTheDocument();
  });

  it('disables commit button when no changes', () => {
    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />
    );

    const commitButton = screen.getByRole('button', { name: /Commit\.\.\./i });
    expect(commitButton).toBeDisabled();
  });

  it('shows move-folder changes in moved group', () => {
    const changes: PendingChange[] = [
      { type: 'move-folder', path: 'docs/get-started', oldPath: 'docs/getting-started' },
    ];

    renderWithProviders(
      <PendingChanges isOpen={true} onClose={vi.fn()} />,
      changes
    );

    // Should be grouped under "Moved"
    const movedBadge = screen.getByText('Moved');
    expect(movedBadge).toBeInTheDocument();

    // Should show old → new paths
    expect(screen.getByText('docs/getting-started')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
    expect(screen.getByText('docs/get-started')).toBeInTheDocument();
  });
});
