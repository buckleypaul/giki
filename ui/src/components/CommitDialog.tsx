import { useState } from 'react';
import type { PendingChange } from '../context/PendingChangesContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import { useBranch } from '../context/BranchContext';
import { writeFile, deleteFile, moveFile, commitChanges, fetchTree, fetchStatus } from '../api/client';
import './CreateFileDialog.css';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  changes: PendingChange[];
  onSuccess?: () => void;
}

export default function CommitDialog({ isOpen, onClose, changes, onSuccess }: CommitDialogProps) {
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearChanges } = usePendingChanges();
  const { selectedBranch } = useBranch();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Commit message cannot be empty');
      return;
    }

    if (changes.length === 0) {
      setError('No changes to commit');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      // Execute file operations in order: delete, move, create/modify
      const deletes = changes.filter(c => c.type === 'delete');
      const moves = changes.filter(c => c.type === 'move');
      const writes = changes.filter(c => c.type === 'create' || c.type === 'modify');

      // Delete files first
      for (const change of deletes) {
        await deleteFile(change.path);
      }

      // Move files next
      for (const change of moves) {
        if (change.oldPath) {
          await moveFile(change.oldPath, change.path);
        }
      }

      // Write new/modified files last
      for (const change of writes) {
        if (change.content !== undefined) {
          await writeFile(change.path, change.content);
        }
      }

      // Create git commit
      const result = await commitChanges(message);

      // Clear pending changes
      clearChanges();

      // Re-fetch tree and status to reflect committed changes
      await Promise.all([
        fetchTree(selectedBranch ?? undefined),
        fetchStatus(),
      ]);

      // Success - call callback and close
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setMessage('');
      setError(null);
      onClose();

      console.log('Commit created:', result.hash);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to commit changes: ${errorMessage}`);
      setIsCommitting(false);
    }
  };

  const handleClose = () => {
    if (!isCommitting) {
      setMessage('');
      setError(null);
      onClose();
    }
  };

  const changesSummary = {
    created: changes.filter(c => c.type === 'create').length,
    modified: changes.filter(c => c.type === 'modify').length,
    deleted: changes.filter(c => c.type === 'delete').length,
    moved: changes.filter(c => c.type === 'move').length,
  };

  const totalChanges = changes.length;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Commit Changes</h2>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            {/* Summary of changes */}
            <div className="commit-summary">
              <p className="commit-summary-title">
                {totalChanges} {totalChanges === 1 ? 'file' : 'files'} will be changed:
              </p>
              <ul className="commit-summary-list">
                {changesSummary.created > 0 && (
                  <li className="commit-summary-item commit-summary-created">
                    {changesSummary.created} created
                  </li>
                )}
                {changesSummary.modified > 0 && (
                  <li className="commit-summary-item commit-summary-modified">
                    {changesSummary.modified} modified
                  </li>
                )}
                {changesSummary.deleted > 0 && (
                  <li className="commit-summary-item commit-summary-deleted">
                    {changesSummary.deleted} deleted
                  </li>
                )}
                {changesSummary.moved > 0 && (
                  <li className="commit-summary-item commit-summary-moved">
                    {changesSummary.moved} moved
                  </li>
                )}
              </ul>
            </div>

            {/* Commit message input */}
            <div className="dialog-field">
              <label htmlFor="commit-message" className="dialog-label">
                Commit message
              </label>
              <textarea
                id="commit-message"
                className="dialog-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your changes..."
                rows={4}
                disabled={isCommitting}
                autoFocus
              />
            </div>

            {error && <div className="dialog-error">{error}</div>}
          </div>

          <div className="dialog-buttons">
            <button
              type="button"
              className="dialog-button-secondary"
              onClick={handleClose}
              disabled={isCommitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dialog-button-primary"
              disabled={isCommitting || !message.trim()}
            >
              {isCommitting ? 'Committing...' : 'Commit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
