import { useNavigate } from 'react-router-dom';
import { usePendingChanges } from '../context/PendingChangesContext';
import './CreateFileDialog.css'; // Reuse dialog styles

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  filePath: string | null;
  onClose: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  filePath,
  onClose,
}: DeleteConfirmDialogProps) {
  const { addChange } = usePendingChanges();
  const navigate = useNavigate();

  if (!isOpen || !filePath) return null;

  const handleConfirm = () => {
    // Add delete pending change
    addChange({
      type: 'delete',
      path: filePath,
    });

    // Navigate to root
    navigate('/');

    // Close dialog
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Delete File</h2>
        <p className="dialog-message">
          Are you sure you want to delete <code>{filePath}</code>?
        </p>
        <p className="dialog-warning">
          This change will be pending until you commit.
        </p>
        <div className="dialog-actions">
          <button type="button" className="dialog-button dialog-button-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="dialog-button dialog-button-danger" onClick={handleConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
