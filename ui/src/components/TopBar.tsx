import { useState, useEffect } from 'react';
import { fetchStatus } from '../api/client';
import type { RepoStatus } from '../api/types';
import './TopBar.css';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            <span className="topbar-branch">{status.branch}</span>
            {status.isDirty && <span className="topbar-dirty" title="Uncommitted changes">●</span>}
          </>
        ) : (
          <span className="topbar-loading">Loading...</span>
        )}
      </div>
    </header>
  );
}
