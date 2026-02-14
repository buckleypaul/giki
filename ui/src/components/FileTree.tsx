import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TreeNode } from '../api/types';
import { fetchTree } from '../api/client';
import { usePendingChanges } from '../context/PendingChangesContext';
import './FileTree.css';

interface FileTreeProps {
  branch?: string;
  onDelete?: (path: string) => void;
  onRename?: (path: string, isDirectory: boolean) => void;
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  onFileClick: (path: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (path: string, isDirectory: boolean) => void;
  isDeleted?: boolean;
  isMoved?: boolean;
}

function TreeItem({ node, depth, onFileClick, onDelete, onRename, isDeleted, isMoved }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectory = !!(node.children && node.children.length > 0);

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(node.path);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && !isDirectory) {
      onDelete(node.path);
    }
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRename) {
      onRename(node.path, isDirectory);
    }
  };

  const indent = depth * 12;

  return (
    <div className={`tree-item ${isDeleted ? 'tree-item-deleted' : ''} ${isMoved ? 'tree-item-moved' : ''}`}>
      <div
        className={`tree-item-label ${isDirectory ? 'directory' : 'file'}`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleClick}
      >
        {isDirectory && (
          <span className="tree-item-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!isDirectory && <span className="tree-item-icon">📄</span>}
        <span className="tree-item-name">{node.name}</span>
        {!isDeleted && !isMoved && (
          <div className="tree-item-actions">
            {onRename && (
              <button
                className="tree-item-rename"
                onClick={handleRename}
                title={`Rename ${isDirectory ? 'folder' : 'file'}`}
                aria-label={`Rename ${node.name}`}
              >
                ✎
              </button>
            )}
            {onDelete && !isDirectory && (
              <button
                className="tree-item-delete"
                onClick={handleDelete}
                title="Delete file"
                aria-label={`Delete ${node.name}`}
                >
                ×
              </button>
            )}
          </div>
        )}
      </div>
      {isDirectory && isExpanded && node.children && (
        <div className="tree-item-children">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ branch, onDelete, onRename }: FileTreeProps) {
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { getChanges } = usePendingChanges();

  useEffect(() => {
    const loadTree = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTree(branch);
        setRootNode(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
        console.error('Error loading file tree:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [branch]);

  const handleFileClick = (path: string) => {
    navigate(`/${path}`);
  };

  // Merge pending changes into the tree
  const mergePendingChanges = (nodes: TreeNode[]): TreeNode[] => {
    const pendingChanges = getChanges();
    const deletedPaths = new Set(
      pendingChanges.filter((c) => c.type === 'delete').map((c) => c.path)
    );
    const movedPaths = new Set(
      pendingChanges.filter((c) => c.type === 'move' && c.oldPath).map((c) => c.oldPath!)
    );
    const createdChanges = pendingChanges.filter((c) => c.type === 'create');
    const moveChanges = pendingChanges.filter((c) => c.type === 'move');

    // Filter out deleted files and files that have been moved (from old location)
    let mergedNodes = nodes.filter((node) => !deletedPaths.has(node.path) && !movedPaths.has(node.path));

    // Add created files
    for (const change of createdChanges) {
      const pathParts = change.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';

      // Only add if not already in tree
      const alreadyExists = mergedNodes.some((n) => n.path === change.path);
      if (!alreadyExists) {
        // For simplicity, add to root level
        // In a more sophisticated version, we'd insert into the correct directory
        if (parentPath === '') {
          mergedNodes.push({
            name: fileName,
            path: change.path,
            isDir: false,
          });
        }
      }
    }

    // Add moved files at their new location (root level for simplicity)
    for (const change of moveChanges) {
      const pathParts = change.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';

      // Only add if not already in tree and at root level
      const alreadyExists = mergedNodes.some((n) => n.path === change.path);
      if (!alreadyExists && parentPath === '') {
        mergedNodes.push({
          name: fileName,
          path: change.path,
          isDir: false,
        });
      }
    }

    // Sort: directories first, then files, alphabetically
    mergedNodes.sort((a, b) => {
      const aIsDir = !!a.children && a.children.length > 0;
      const bIsDir = !!b.children && b.children.length > 0;

      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;

      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    return mergedNodes;
  };

  if (loading) {
    return <div className="file-tree-loading">Loading file tree...</div>;
  }

  if (error) {
    return <div className="file-tree-error">Error: {error}</div>;
  }

  if (!rootNode || !rootNode.children || rootNode.children.length === 0) {
    // Check if there are created files to show even when tree is empty
    const createdChanges = getChanges().filter((c) => c.type === 'create');
    if (createdChanges.length === 0) {
      return <div className="file-tree-empty">No files found</div>;
    }
  }

  const mergedChildren = rootNode?.children
    ? mergePendingChanges(rootNode.children)
    : mergePendingChanges([]);

  if (mergedChildren.length === 0) {
    return <div className="file-tree-empty">No files found</div>;
  }

  return (
    <div className="file-tree">
      {mergedChildren.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          onFileClick={handleFileClick}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}
