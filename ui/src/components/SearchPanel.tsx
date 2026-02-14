import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { search as apiSearch } from '../api/client';
import type { SearchResult } from '../api/types';
import './SearchPanel.css';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'filename' | 'content'>('filename');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounce search (300ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const searchResults = await apiSearch(query, searchType);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchType]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleResultClick = (result: SearchResult) => {
    // Navigate to file
    const path = result.path;
    const hash = result.lineNumber ? `L${result.lineNumber}` : '';
    navigate(`/${path}${hash ? `#${hash}` : ''}`);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-panel-overlay" onClick={handleOverlayClick}>
      <div className="search-panel">
        <div className="search-panel-header">
          <input
            ref={inputRef}
            type="text"
            className="search-panel-input"
            placeholder={`Search ${searchType === 'filename' ? 'filenames' : 'file content'}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search-panel-toggle">
            <button
              className={`search-toggle-btn ${searchType === 'filename' ? 'active' : ''}`}
              onClick={() => setSearchType('filename')}
            >
              Filename
            </button>
            <button
              className={`search-toggle-btn ${searchType === 'content' ? 'active' : ''}`}
              onClick={() => setSearchType('content')}
            >
              Content
            </button>
          </div>
        </div>

        <div className="search-panel-results">
          {loading && <div className="search-panel-loading">Searching...</div>}

          {error && <div className="search-panel-error">{error}</div>}

          {!loading && !error && results.length === 0 && query.trim() && (
            <div className="search-panel-empty">No results found</div>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="search-results-list">
              {results.slice(0, 50).map((result, index) => (
                <li
                  key={`${result.path}-${result.lineNumber || index}`}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  {searchType === 'filename' ? (
                    <div className="search-result-filename">
                      <span className="search-result-path">{result.path}</span>
                    </div>
                  ) : (
                    <div className="search-result-content">
                      <div className="search-result-header">
                        <span className="search-result-path">{result.path}</span>
                        {result.lineNumber && (
                          <span className="search-result-line">:{result.lineNumber}</span>
                        )}
                      </div>
                      {result.context && (
                        <div className="search-result-context">
                          {result.context.map((line, i) => (
                            <div key={i} className="search-context-line">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && !query.trim() && (
            <div className="search-panel-hint">
              Type to search {searchType === 'filename' ? 'filenames' : 'file content'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
