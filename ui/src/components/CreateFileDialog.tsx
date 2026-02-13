import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingChanges } from '../context/PendingChangesContext';
import './CreateFileDialog.css';

interface CreateFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingPaths: string[];
}

export default function CreateFileDialog({
  isOpen,
  onClose,
  existingPaths,
}: CreateFileDialogProps) {
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { addChange } = usePendingChanges();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedPath = filePath.trim();
    if (!trimmedPath) {
      setError('File path is required');
      return;
    }

    // Check for invalid characters
    if (trimmedPath.includes('..')) {
      setError('File path cannot contain ".."');
      return;
    }

    // Check if path already exists
    const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath.slice(1) : trimmedPath;
    if (existingPaths.includes(normalizedPath)) {
      setError('File already exists');
      return;
    }

    // Add create pending change with empty content
    addChange({
      type: 'create',
      path: normalizedPath,
      content: '',
    });

    // Navigate to editor for new file
    navigate(`/${normalizedPath}`);

    // Reset and close
    setFilePath('');
    setError(null);
    onClose();
  };

  const handleCancel = () => {
    setFilePath('');
    setError(null);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Create New File</h2>
        <form onSubmit={handleSubmit}>
          <div className="dialog-field">
            <label htmlFor="file-path">File path:</label>
            <input
              type="text"
              id="file-path"
              className="dialog-input"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g., docs/guide.md"
              autoFocus
            />
            {error && <div className="dialog-error">{error}</div>}
          </div>
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
