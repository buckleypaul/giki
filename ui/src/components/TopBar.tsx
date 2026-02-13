import { useState, useEffect } from 'react';
import { fetchStatus } from '../api/client';
import type { RepoStatus } from '../api/types';
import { usePendingChanges } from '../context/PendingChangesContext';
import { BranchSelector } from './BranchSelector';
import './TopBar.css';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getChanges } = usePendingChanges();

  const pendingChangesCount = getChanges().length;

  useEffect(() => {
    fetchStatus()
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <header className="topbar">
      <button className="topbar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        ☰
      </button>
      <div className="topbar-content">
        {error ? (
          <span className="topbar-error">Error: {error}</span>
        ) : status ? (
          <>
            <span className="topbar-source" title={status.source}>
              {status.source.split('/').pop() || status.source}
            </span>
            <span className="topbar-separator">•</span>
            <BranchSelector />
            {status.isDirty && <span className="topbar-dirty" title="Uncommitted changes">●</span>}
            {pendingChangesCount > 0 && (
              <span className="topbar-pending-badge" title={`${pendingChangesCount} pending change${pendingChangesCount === 1 ? '' : 's'}`}>
                {pendingChangesCount}
              </span>
            )}
          </>
        ) : (
          <span className="topbar-loading">Loading...</span>
        )}
      </div>
    </header>
  );
}
