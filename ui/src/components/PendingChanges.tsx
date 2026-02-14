import { useState } from 'react';
import { usePendingChanges, type PendingChange } from '../context/PendingChangesContext';
import CommitDialog from './CommitDialog';
import './PendingChanges.css';

interface PendingChangesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PendingChanges({ isOpen, onClose }: PendingChangesProps) {
  const { getChanges, removeChange } = usePendingChanges();
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const changes = getChanges();

  if (!isOpen) return null;

  // Group changes by type
  const grouped = {
    created: changes.filter(c => c.type === 'create'),
    modified: changes.filter(c => c.type === 'modify'),
    deleted: changes.filter(c => c.type === 'delete'),
    moved: changes.filter(c => c.type === 'move' || c.type === 'move-folder'),
  };

  const handleDiscard = (path: string) => {
    removeChange(path);
  };

  const handleCommit = () => {
    setShowCommitDialog(true);
  };

  const handleCommitSuccess = () => {
    setShowCommitDialog(false);
    onClose();
  };

  return (
    <>
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog-content pending-changes-content" onClick={(e) => e.stopPropagation()}>
          <div className="pending-changes-header">
            <h2>Pending Changes ({changes.length})</h2>
          </div>

          {changes.length === 0 ? (
            <div className="pending-changes-empty">
              <p>No pending changes</p>
            </div>
          ) : (
            <div className="pending-changes-body">
              {/* Created Files */}
              {grouped.created.length > 0 && (
                <div className="change-group">
                  <h3 className="change-group-title">
                    <span className="change-badge change-badge-created">Created</span>
                    <span className="change-count">({grouped.created.length})</span>
                  </h3>
                  <div className="change-list">
                    {grouped.created.map((change) => (
                      <ChangeItem key={change.path} change={change} onDiscard={handleDiscard} />
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Files */}
              {grouped.modified.length > 0 && (
                <div className="change-group">
                  <h3 className="change-group-title">
                    <span className="change-badge change-badge-modified">Modified</span>
                    <span className="change-count">({grouped.modified.length})</span>
                  </h3>
                  <div className="change-list">
                    {grouped.modified.map((change) => (
                      <ChangeItem key={change.path} change={change} onDiscard={handleDiscard} />
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Files */}
              {grouped.deleted.length > 0 && (
                <div className="change-group">
                  <h3 className="change-group-title">
                    <span className="change-badge change-badge-deleted">Deleted</span>
                    <span className="change-count">({grouped.deleted.length})</span>
                  </h3>
                  <div className="change-list">
                    {grouped.deleted.map((change) => (
                      <ChangeItem key={change.path} change={change} onDiscard={handleDiscard} />
                    ))}
                  </div>
                </div>
              )}

              {/* Moved Files */}
              {grouped.moved.length > 0 && (
                <div className="change-group">
                  <h3 className="change-group-title">
                    <span className="change-badge change-badge-moved">Moved</span>
                    <span className="change-count">({grouped.moved.length})</span>
                  </h3>
                  <div className="change-list">
                    {grouped.moved.map((change) => (
                      <ChangeItem key={change.path} change={change} onDiscard={handleDiscard} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pending-changes-footer">
            <button className="dialog-button-secondary" onClick={onClose}>
              Close
            </button>
            <button
              className="dialog-button-primary"
              onClick={handleCommit}
              disabled={changes.length === 0}
            >
              Commit...
            </button>
          </div>
        </div>
      </div>

      <CommitDialog
        isOpen={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        changes={changes}
        onSuccess={handleCommitSuccess}
      />
    </>
  );
}

interface ChangeItemProps {
  change: PendingChange;
  onDiscard: (path: string) => void;
}

function ChangeItem({ change, onDiscard }: ChangeItemProps) {
  const getDiffInfo = () => {
    if (change.type === 'move' || change.type === 'move-folder') {
      return (
        <div className="change-diff">
          <span className="change-path-old">{change.oldPath}</span>
          <span className="change-arrow">→</span>
          <span className="change-path-new">{change.path}</span>
        </div>
      );
    }

    if (change.type === 'delete') {
      return <div className="change-diff change-diff-deleted">{change.path}</div>;
    }

    if (change.type === 'create' || change.type === 'modify') {
      return (
        <div className="change-diff">
          <div className="change-path">{change.path}</div>
          {change.type === 'create' && (
            <div className="change-stats">
              <span className="change-stat-add">+{change.content?.split('\n').length || 0} lines</span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="change-item">
      <div className="change-item-content">{getDiffInfo()}</div>
      <button
        className="change-discard-button"
        onClick={() => onDiscard(change.path)}
        title="Discard this change"
      >
        ×
      </button>
    </div>
  );
}
