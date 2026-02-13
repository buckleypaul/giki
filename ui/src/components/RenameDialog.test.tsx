import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RenameDialog from './RenameDialog';
import { PendingChangesProvider } from '../context/PendingChangesContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <PendingChangesProvider>{ui}</PendingChangesProvider>
    </BrowserRouter>
  );
}

describe('RenameDialog', () => {
  const mockOnClose = vi.fn();
  const existingPaths = ['README.md', 'docs/guide.md', 'src/index.ts'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <RenameDialog
        isOpen={false}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    expect(screen.queryByText('Rename / Move File')).not.toBeInTheDocument();
  });

  it('does not render when currentPath is null', () => {
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath={null}
        existingPaths={existingPaths}
      />
    );

    expect(screen.queryByText('Rename / Move File')).not.toBeInTheDocument();
  });

  it('renders dialog with pre-filled current path', () => {
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    expect(screen.getByText('Rename / Move File')).toBeInTheDocument();
    expect(screen.getByLabelText('New path:')).toHaveValue('README.md');
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows error when new path is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('New path:');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByText('File path is required')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when new path contains ".."', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('New path:');
    await user.clear(input);
    await user.type(input, '../etc/passwd');
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByText('File path cannot contain ".."')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when trying to rename to same path', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    // Input is already pre-filled with current path
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByText('New path is the same as current path')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error when new path already exists', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('New path:');
    await user.clear(input);
    await user.type(input, 'docs/guide.md'); // Already exists
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(screen.getByText('A file already exists at this path')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const overlay = screen.getByText('Rename / Move File').closest('.dialog-overlay');
    await user.click(overlay!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside dialog content', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const dialogContent = screen.getByText('Rename / Move File').closest('.dialog-content');
    await user.click(dialogContent!);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('successfully renames file and navigates to new path', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('New path:');
    await user.clear(input);
    await user.type(input, 'NEW_README.md');
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(mockNavigate).toHaveBeenCalledWith('/NEW_README.md');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('normalizes paths by removing leading slash', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RenameDialog
        isOpen={true}
        onClose={mockOnClose}
        currentPath="README.md"
        existingPaths={existingPaths}
      />
    );

    const input = screen.getByLabelText('New path:');
    await user.clear(input);
    await user.type(input, '/NEW_README.md'); // Leading slash
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    // Should navigate without leading slash
    expect(mockNavigate).toHaveBeenCalledWith('/NEW_README.md');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
