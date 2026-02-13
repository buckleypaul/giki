import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CreateFileDialog from './CreateFileDialog';
import { PendingChangesProvider } from '../context/PendingChangesContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <PendingChangesProvider>{ui}</PendingChangesProvider>
    </BrowserRouter>
  );
};

describe('CreateFileDialog', () => {
  it('does not render when isOpen is false', () => {
    const { container} = renderWithProviders(
      <CreateFileDialog isOpen={false} onClose={() => {}} existingPaths={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when isOpen is true', () => {
    renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={() => {}} existingPaths={[]} />
    );
    expect(screen.getByRole('heading', { name: /create new file/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/file path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('shows error when path is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={() => {}} existingPaths={[]} />
    );

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    expect(screen.getByText(/file path is required/i)).toBeInTheDocument();
  });

  it('shows error when path contains ".."', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={() => {}} existingPaths={[]} />
    );

    const input = screen.getByLabelText(/file path/i);
    await user.type(input, '../test.md');

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    expect(screen.getByText(/file path cannot contain "\.\."/i)).toBeInTheDocument();
  });

  it('shows error when file already exists', async () => {
    const user = userEvent.setup();
    const existingPaths = ['README.md', 'docs/guide.md'];

    renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={() => {}} existingPaths={existingPaths} />
    );

    const input = screen.getByLabelText(/file path/i);
    await user.type(input, 'README.md');

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    expect(screen.getByText(/file already exists/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={onClose} existingPaths={[]} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={onClose} existingPaths={[]} />
    );

    const overlay = container.querySelector('.dialog-overlay');
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      await user.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not close when clicking inside dialog content', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={onClose} existingPaths={[]} />
    );

    const dialogContent = screen.getByRole('heading', { name: /create new file/i }).closest('.dialog-content');
    expect(dialogContent).toBeInTheDocument();

    if (dialogContent) {
      await user.click(dialogContent);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('resets form when dialog is closed and reopened', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = renderWithProviders(
      <CreateFileDialog isOpen={true} onClose={onClose} existingPaths={[]} />
    );

    const input = screen.getByLabelText(/file path/i);
    await user.type(input, 'test.md');

    // Close dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Reopen dialog
    rerender(
      <BrowserRouter>
        <PendingChangesProvider>
          <CreateFileDialog isOpen={false} onClose={onClose} existingPaths={[]} />
        </PendingChangesProvider>
      </BrowserRouter>
    );

    rerender(
      <BrowserRouter>
        <PendingChangesProvider>
          <CreateFileDialog isOpen={true} onClose={onClose} existingPaths={[]} />
        </PendingChangesProvider>
      </BrowserRouter>
    );

    // Input should be empty
    const newInput = screen.getByLabelText(/file path/i);
    expect(newInput).toHaveValue('');
  });
});
