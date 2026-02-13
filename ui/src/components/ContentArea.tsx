import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchFile, fetchTree } from '../api/client';
import type { TreeNode } from '../api/types';
import { FileViewer } from './FileViewer';
import { DirectoryListing } from './DirectoryListing';
import { NotFound } from './NotFound';
import './ContentArea.css';

interface ContentAreaProps {
  branch?: string;
}

export default function ContentArea({ branch }: ContentAreaProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState<'loading' | 'file' | 'directory' | 'notfound' | 'empty'>('loading');
  const [dirChildren, setDirChildren] = useState<TreeNode[]>([]);

  // Get the path from the URL, removing leading slash
  const urlPath = location.pathname.slice(1);

  useEffect(() => {
    async function loadContent() {
      setContent('loading');

      // Root path - try to load README.md
      if (urlPath === '') {
        try {
          await fetchFile('README.md', branch);
          setContent('file');
          return;
        } catch {
          // No README.md, show empty state
          setContent('empty');
          return;
        }
      }

      // Try to load as a file first
      try {
        await fetchFile(urlPath, branch);
        setContent('file');
        return;
      } catch (fileError) {
        // File doesn't exist, try to treat as directory
        try {
          const tree = await fetchTree(branch);

          // Find the node in the tree
          const node = findNodeByPath(tree, urlPath);

          if (node && node.isDir) {
            // It's a directory - try to load its README.md
            const readmePath = urlPath.endsWith('/')
              ? `${urlPath}README.md`
              : `${urlPath}/README.md`;

            try {
              await fetchFile(readmePath, branch);
              // Redirect to the README.md file
              navigate(`/${readmePath}`, { replace: true });
              return;
            } catch {
              // No README, show directory listing
              setDirChildren(node.children || []);
              setContent('directory');
              return;
            }
          }
        } catch (treeError) {
          console.error('Error loading tree:', treeError);
        }

        // Neither file nor directory found
        setContent('notfound');
      }
    }

    loadContent();
  }, [urlPath, branch, navigate]);

  // Scroll to anchor if present in URL
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1); // Remove '#'
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash, content]);

  if (content === 'loading') {
    return (
      <main className="content-area">
        <div className="content-area-state">
          <div className="content-area-spinner" />
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (content === 'empty') {
    return (
      <main className="content-area">
        <div className="content-area-state">
          <h1>Welcome</h1>
          <p>This repository does not contain a README.md file.</p>
          <p>Select a file from the sidebar to view it.</p>
        </div>
      </main>
    );
  }

  if (content === 'notfound') {
    return (
      <main className="content-area">
        <NotFound path={`/${urlPath}`} />
      </main>
    );
  }

  if (content === 'directory') {
    return (
      <main className="content-area">
        <DirectoryListing path={urlPath} children={dirChildren} />
      </main>
    );
  }

  // content === 'file'
  const filePath = urlPath === '' ? 'README.md' : urlPath;

  return (
    <main className="content-area">
      <FileViewer filePath={filePath} branch={branch} />
    </main>
  );
}

/**
 * Recursively searches the tree for a node with the given path
 */
function findNodeByPath(tree: TreeNode, path: string): TreeNode | null {
  // Normalize path (remove trailing slash for comparison)
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;

  if (tree.path === normalizedPath) {
    return tree;
  }

  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeByPath(child, normalizedPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}
