import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateFolderDialog from './CreateFolderDialog';
import { PendingChangesProvider, usePendingChanges } from '../context/PendingChangesContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <PendingChangesProvider>{ui}</PendingChangesProvider>
    </BrowserRouter>
  );
}

describe('CreateFolderDialog', () => {
  const mockOnClose = vi.fn();
  const existingPaths = ['README.md', 'docs/guide.md', 'docs/.gitkeep'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <CreateFolderDialog
        isOpen={false}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
  });

  it('renders dialog when isOpen is true', () => {
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    expect(screen.getByText('Create New Folder')).toBeInTheDocument();
    expect(screen.getByLabelText('Folder path:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., docs/guides')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows gitkeep explanation message', () => {
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    expect(screen.getByText(/Git doesn't track empty directories/)).toBeInTheDocument();
    expect(screen.getByText(/.gitkeep file will be created/)).toBeInTheDocument();
  });

  it('shows error when folder path is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Folder path is required')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when folder path contains ".."', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('Folder path:');
    await user.type(input, '../etc');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Folder path cannot contain ".."')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when folder already exists (via .gitkeep)', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('Folder path:');
    await user.type(input, 'docs'); // docs/.gitkeep exists
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('A folder with this path already exists')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    const overlay = screen.getByText('Create New Folder').closest('.dialog-overlay');
    await user.click(overlay!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside dialog content', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    const dialogContent = screen.getByText('Create New Folder').closest('.dialog-content');
    await user.click(dialogContent!);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('creates .gitkeep file for new folder', async () => {
    const user = userEvent.setup();

    function TestComponent() {
      const { getChanges } = usePendingChanges();
      const changes = getChanges();

      return (
        <>
          <CreateFolderDialog
            isOpen={true}
            onClose={mockOnClose}
            existingPaths={existingPaths}
          />
          <div data-testid="changes">{JSON.stringify(changes)}</div>
        </>
      );
    }

    renderWithProviders(<TestComponent />);

    const input = screen.getByLabelText('Folder path:');
    await user.type(input, 'new-folder');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const changesElement = screen.getByTestId('changes');
    const changes = JSON.parse(changesElement.textContent || '[]');

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      type: 'create',
      path: 'new-folder/.gitkeep',
      content: '',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('normalizes folder path by removing leading and trailing slashes', async () => {
    const user = userEvent.setup();

    function TestComponent() {
      const { getChanges } = usePendingChanges();
      const changes = getChanges();

      return (
        <>
          <CreateFolderDialog
            isOpen={true}
            onClose={mockOnClose}
            existingPaths={existingPaths}
          />
          <div data-testid="changes">{JSON.stringify(changes)}</div>
        </>
      );
    }

    renderWithProviders(<TestComponent />);

    const input = screen.getByLabelText('Folder path:');
    await user.type(input, '/new-folder/'); // Leading and trailing slashes
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const changesElement = screen.getByTestId('changes');
    const changes = JSON.parse(changesElement.textContent || '[]');

    expect(changes[0].path).toBe('new-folder/.gitkeep');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when dialog closes and reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <CreateFolderDialog
        isOpen={true}
        onClose={mockOnClose}
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('Folder path:');
    await user.type(input, 'test-folder');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Close and reopen
    rerender(
      <BrowserRouter>
        <PendingChangesProvider>
          <CreateFolderDialog
            isOpen={false}
            onClose={mockOnClose}
            existingPaths={existingPaths}
          />
        </PendingChangesProvider>
      </BrowserRouter>
    );

    rerender(
      <BrowserRouter>
        <PendingChangesProvider>
          <CreateFolderDialog
            isOpen={true}
            onClose={mockOnClose}
            existingPaths={existingPaths}
          />
        </PendingChangesProvider>
      </BrowserRouter>
    );

    const newInput = screen.getByLabelText('Folder path:');
    expect(newInput).toHaveValue('');
  });
});
