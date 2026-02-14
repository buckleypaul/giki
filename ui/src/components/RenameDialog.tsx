import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingChanges } from '../context/PendingChangesContext';
import './CreateFileDialog.css';

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string | null;
  existingPaths: string[];
  isFolder?: boolean;
}

export default function RenameDialog({
  isOpen,
  onClose,
  currentPath,
  existingPaths,
  isFolder = false,
}: RenameDialogProps) {
  const [newPath, setNewPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { addChange } = usePendingChanges();
  const navigate = useNavigate();

  // Initialize with current path when dialog opens
  useEffect(() => {
    if (isOpen && currentPath) {
      setNewPath(currentPath);
    }
  }, [isOpen, currentPath]);

  if (!isOpen || !currentPath) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedPath = newPath.trim();
    if (!trimmedPath) {
      setError('File path is required');
      return;
    }

    // Check for invalid characters
    if (trimmedPath.includes('..')) {
      setError('File path cannot contain ".."');
      return;
    }

    // Normalize paths
    const normalizedNew = trimmedPath.startsWith('/') ? trimmedPath.slice(1) : trimmedPath;
    const normalizedCurrent = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;

    // Check if trying to rename to same path
    if (normalizedNew === normalizedCurrent) {
      setError('New path is the same as current path');
      return;
    }

    // For folders, prevent moving into itself (self-nesting)
    if (isFolder && normalizedNew.startsWith(normalizedCurrent + '/')) {
      setError('Cannot move a folder into itself');
      return;
    }

    // Check if new path already exists
    if (existingPaths.includes(normalizedNew)) {
      setError('A file already exists at this path');
      return;
    }

    // Add move pending change
    addChange({
      type: isFolder ? 'move-folder' : 'move',
      path: normalizedNew,
      oldPath: normalizedCurrent,
    });

    // For folders, don't navigate (folders aren't viewable content and haven't been moved yet)
    // For files, navigate to the new path
    // TODO: File navigation may also fail if the file doesn't exist at new path yet (pending change)
    // Consider not navigating for files either, or enhancing pending changes to support moves
    if (!isFolder) {
      navigate(`/${normalizedNew}`);
    }

    // Reset and close
    setNewPath('');
    setError(null);
    onClose();
  };

  const handleCancel = () => {
    setNewPath('');
    setError(null);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{isFolder ? 'Rename / Move Folder' : 'Rename / Move File'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="dialog-field">
            <label htmlFor="new-path">New path:</label>
            <input
              type="text"
              id="new-path"
              className="dialog-input"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="e.g., docs/guide.md"
              autoFocus
            />
            {error && <div className="dialog-error">{error}</div>}
          </div>
          <p className="dialog-warning">
            This will create a pending move operation. Changes won't be applied until you commit.
          </p>
          <div className="dialog-actions">
            <button type="button" className="dialog-button dialog-button-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="dialog-button dialog-button-primary">
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
