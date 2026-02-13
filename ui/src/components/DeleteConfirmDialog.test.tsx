import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { PendingChangesProvider, usePendingChanges } from '../context/PendingChangesContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <PendingChangesProvider>{ui}</PendingChangesProvider>
    </BrowserRouter>
  );
};

describe('DeleteConfirmDialog', () => {
  it('does not render when isOpen is false', () => {
    const { container } = renderWithProviders(
      <DeleteConfirmDialog isOpen={false} filePath="test.md" onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when filePath is null', () => {
    const { container } = renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath={null} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when isOpen is true and filePath is provided', () => {
    renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath="test.md" onClose={() => {}} />
    );
    expect(screen.getByRole('heading', { name: /delete file/i })).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText('test.md')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('displays the correct file path', () => {
    renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath="docs/guide.md" onClose={() => {}} />
    );
    expect(screen.getByText('docs/guide.md')).toBeInTheDocument();
  });

  it('shows warning about pending change', () => {
    renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath="test.md" onClose={() => {}} />
    );
    expect(screen.getByText(/this change will be pending until you commit/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath="test.md" onClose={onClose} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath="test.md" onClose={onClose} />
    );

    const overlay = container.querySelector('.dialog-overlay');
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      await user.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('adds delete pending change when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    // Create a wrapper component to access pending changes
    function TestWrapper() {
      const { getChanges } = usePendingChanges();
      const changes = getChanges();

      return (
        <div>
          <DeleteConfirmDialog isOpen={true} filePath="test.md" onClose={onClose} />
          <div data-testid="changes-count">{changes.length}</div>
          {changes.length > 0 && (
            <div data-testid="change-type">{changes[0].type}</div>
          )}
          {changes.length > 0 && (
            <div data-testid="change-path">{changes[0].path}</div>
          )}
        </div>
      );
    }

    renderWithProviders(<TestWrapper />);

    // Initially no changes
    expect(screen.getByTestId('changes-count')).toHaveTextContent('0');

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Should have added a delete change
    expect(screen.getByTestId('changes-count')).toHaveTextContent('1');
    expect(screen.getByTestId('change-type')).toHaveTextContent('delete');
    expect(screen.getByTestId('change-path')).toHaveTextContent('test.md');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside dialog content', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <DeleteConfirmDialog isOpen={true} filePath="test.md" onClose={onClose} />
    );

    const dialogContent = screen.getByRole('heading', { name: /delete file/i }).closest('.dialog-content');
    expect(dialogContent).toBeInTheDocument();

    if (dialogContent) {
      await user.click(dialogContent);
      expect(onClose).not.toHaveBeenCalled();
    }
  });
});
