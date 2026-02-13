import { Link } from 'react-router-dom';
import type { TreeNode } from '../api/types';
import './DirectoryListing.css';

interface DirectoryListingProps {
  path: string;
  children: TreeNode[];
}

export function DirectoryListing({ path, children }: DirectoryListingProps) {
  // Sort: directories first, then files, both alphabetically
  const sorted = [...children].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const displayPath = path === '' ? '/' : `/${path}`;

  return (
    <div className="directory-listing">
      <h1>Directory: {displayPath}</h1>
      <p className="directory-listing-description">
        This directory does not contain a README.md file.
      </p>

      <ul className="directory-listing-items">
        {sorted.map((node) => (
          <li key={node.path} className="directory-listing-item">
            <Link
              to={`/${node.path}`}
              className={node.isDir ? 'directory-link' : 'file-link'}
            >
              {node.isDir ? '📁' : '📄'} {node.name}
              {node.isDir && '/'}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
