import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { PendingChangesProvider } from '../context/PendingChangesContext';
import { BranchProvider } from '../context/BranchContext';
import CommitDialog from './CommitDialog';
import type { PendingChange } from '../context/PendingChangesContext';
import * as apiClient from '../api/client';

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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <BranchProvider>
        <PendingChangesProvider>
          {ui}
        </PendingChangesProvider>
      </BranchProvider>
    </BrowserRouter>
  );
}

describe('CommitDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <CommitDialog isOpen={false} onClose={vi.fn()} changes={[]} />
    );
    expect(container.querySelector('.dialog-overlay')).not.toBeInTheDocument();
  });

  it('renders with commit message input field', () => {
    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={[]} />
    );
    expect(screen.getByLabelText(/Commit message/i)).toBeInTheDocument();
  });

  it('shows summary of changes count', () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'file1.md', content: 'test' },
      { type: 'modify', path: 'file2.md', content: 'updated' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    expect(screen.getByText(/2 files will be changed/i)).toBeInTheDocument();
  });

  it('shows breakdown by change type', () => {
    const changes: PendingChange[] = [
      { type: 'create', path: 'file1.md', content: 'test' },
      { type: 'modify', path: 'file2.md', content: 'updated' },
      { type: 'delete', path: 'file3.md' },
      { type: 'move', path: 'new.md', oldPath: 'old.md' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    expect(screen.getByText('1 created')).toBeInTheDocument();
    expect(screen.getByText('1 modified')).toBeInTheDocument();
    expect(screen.getByText('1 deleted')).toBeInTheDocument();
    expect(screen.getByText('1 moved')).toBeInTheDocument();
  });

  it('closes on cancel button click', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={handleClose} changes={[]} />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('closes on overlay click', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { container } = renderWithProviders(
      <CommitDialog isOpen={true} onClose={handleClose} changes={[]} />
    );

    const overlay = container.querySelector('.dialog-overlay')!;
    await user.click(overlay);

    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('does not close when clicking inside dialog content', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { container } = renderWithProviders(
      <CommitDialog isOpen={true} onClose={handleClose} changes={[]} />
    );

    const dialogContent = container.querySelector('.dialog-content')!;
    await user.click(dialogContent);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('disables commit button when message is empty', () => {
    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={[{ type: 'create', path: 'file.md', content: 'test' }]} />
    );

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    expect(commitButton).toBeDisabled();
  });

  it('enables commit button when message is filled', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={[{ type: 'create', path: 'file.md', content: 'test' }]} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Add new file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    expect(commitButton).toBeEnabled();
  });

  it('calls delete API for delete changes', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'delete', path: 'file1.md' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Delete file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(apiClient.deleteFile).toHaveBeenCalledWith('file1.md');
    });
  });

  it('calls move API for move changes', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'move', path: 'new.md', oldPath: 'old.md' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Move file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(apiClient.moveFile).toHaveBeenCalledWith('old.md', 'new.md');
    });
  });

  it('calls write API for create changes', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'create', path: 'file.md', content: 'test content' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Add file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(apiClient.writeFile).toHaveBeenCalledWith('file.md', 'test content');
    });
  });

  it('calls write API for modify changes', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'modify', path: 'file.md', content: 'updated content' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Update file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(apiClient.writeFile).toHaveBeenCalledWith('file.md', 'updated content');
    });
  });

  it('calls commit API after applying all changes', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'create', path: 'file.md', content: 'test' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Add file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(apiClient.commitChanges).toHaveBeenCalledWith('Add file');
    });
  });

  it('calls onSuccess callback after successful commit', async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const changes: PendingChange[] = [
      { type: 'create', path: 'file.md', content: 'test' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} onSuccess={handleSuccess} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Add file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledOnce();
    });
  });

  it('shows error message on commit failure', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'create', path: 'file.md', content: 'test' },
    ];

    // Mock commit failure
    vi.mocked(apiClient.commitChanges).mockRejectedValueOnce(new Error('Commit failed'));

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i);
    await user.type(messageInput, 'Add file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(screen.getByText(/Failed to commit changes: Commit failed/i)).toBeInTheDocument();
    });
  });

  it('resets form after successful commit', async () => {
    const user = userEvent.setup();
    const changes: PendingChange[] = [
      { type: 'create', path: 'file.md', content: 'test' },
    ];

    renderWithProviders(
      <CommitDialog isOpen={true} onClose={vi.fn()} changes={changes} />
    );

    const messageInput = screen.getByLabelText(/Commit message/i) as HTMLTextAreaElement;
    await user.type(messageInput, 'Add file');

    const commitButton = screen.getByRole('button', { name: /Commit/i });
    await user.click(commitButton);

    await vi.waitFor(() => {
      expect(messageInput.value).toBe('');
    });
  });
});
