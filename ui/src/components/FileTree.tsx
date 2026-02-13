import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TreeNode } from '../api/types';
import { fetchTree } from '../api/client';
import './FileTree.css';

interface FileTreeProps {
  branch?: string;
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  onFileClick: (path: string) => void;
}

function TreeItem({ node, depth, onFileClick }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectory = node.children && node.children.length > 0;

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(node.path);
    }
  };

  const indent = depth * 12;

  return (
    <div className="tree-item">
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
      </div>
      {isDirectory && isExpanded && node.children && (
        <div className="tree-item-children">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ branch }: FileTreeProps) {
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  if (loading) {
    return <div className="file-tree-loading">Loading file tree...</div>;
  }

  if (error) {
    return <div className="file-tree-error">Error: {error}</div>;
  }

  if (!rootNode || !rootNode.children || rootNode.children.length === 0) {
    return <div className="file-tree-empty">No files found</div>;
  }

  return (
    <div className="file-tree">
      {rootNode.children.map((node) => (
        <TreeItem key={node.path} node={node} depth={0} onFileClick={handleFileClick} />
      ))}
    </div>
  );
}
