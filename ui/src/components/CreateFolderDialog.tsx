import { useState } from 'react';
import { usePendingChanges } from '../context/PendingChangesContext';
import './CreateFileDialog.css';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingPaths: string[];
}

export default function CreateFolderDialog({
  isOpen,
  onClose,
  existingPaths,
}: CreateFolderDialogProps) {
  const [folderPath, setFolderPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { addChange } = usePendingChanges();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedPath = folderPath.trim();
    if (!trimmedPath) {
      setError('Folder path is required');
      return;
    }

    // Check for invalid characters
    if (trimmedPath.includes('..')) {
      setError('Folder path cannot contain ".."');
      return;
    }

    // Normalize path
    let normalizedPath = trimmedPath.startsWith('/') ? trimmedPath.slice(1) : trimmedPath;
    // Remove trailing slash if present
    normalizedPath = normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;

    // Check if any file already exists with this path prefix
    const conflicts = existingPaths.some((path) => path.startsWith(normalizedPath + '/'));
    if (conflicts) {
      setError('A folder with this path already exists');
      return;
    }

    // Create a .gitkeep file in the directory to make it visible
    // This follows git convention where empty directories aren't tracked
    const gitkeepPath = `${normalizedPath}/.gitkeep`;

    // Check if .gitkeep already exists
    if (existingPaths.includes(gitkeepPath)) {
      setError('A folder with this path already exists');
      return;
    }

    // Add create pending change for .gitkeep file
    addChange({
      type: 'create',
      path: gitkeepPath,
      content: '',
    });

    // Reset and close
    setFolderPath('');
    setError(null);
    onClose();
  };

  const handleCancel = () => {
    setFolderPath('');
    setError(null);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Create New Folder</h2>
        <form onSubmit={handleSubmit}>
          <div className="dialog-field">
            <label htmlFor="folder-path">Folder path:</label>
            <input
              type="text"
              id="folder-path"
              className="dialog-input"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g., docs/guides"
              autoFocus
            />
            {error && <div className="dialog-error">{error}</div>}
          </div>
          <p className="dialog-warning">
            Note: Git doesn't track empty directories, so a .gitkeep file will be created.
          </p>
          <div className="dialog-actions">
            <button type="button" className="dialog-button dialog-button-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="dialog-button dialog-button-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
