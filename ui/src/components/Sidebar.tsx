import { useState, useEffect } from 'react';
import FileTree from './FileTree';
import CreateFileDialog from './CreateFileDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import RenameDialog from './RenameDialog';
import CreateFolderDialog from './CreateFolderDialog';
import { fetchTree } from '../api/client';
import type { TreeNode } from '../api/types';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  branch?: string;
}

export default function Sidebar({ isOpen, branch }: SidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [existingPaths, setExistingPaths] = useState<string[]>([]);

  // Fetch tree to get existing paths for validation
  useEffect(() => {
    const loadPaths = async () => {
      try {
        const data = await fetchTree(branch);
        const paths = extractAllPaths(data);
        setExistingPaths(paths);
      } catch (err) {
        console.error('Error loading paths:', err);
      }
    };

    loadPaths();
  }, [branch]);

  // Helper to extract all file paths from tree
  const extractAllPaths = (node: TreeNode): string[] => {
    const paths: string[] = [];

    if (node.children) {
      for (const child of node.children) {
        if (child.children) {
          // Directory - recurse
          paths.push(...extractAllPaths(child));
        } else {
          // File
          paths.push(child.path);
        }
      }
    }

    return paths;
  };

  const handleDelete = (path: string) => {
    setFileToDelete(path);
    setShowDeleteDialog(true);
  };

  const handleRename = (path: string) => {
    setFileToRename(path);
    setShowRenameDialog(true);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Files</h2>
          <div className="sidebar-buttons">
            <button
              className="sidebar-button"
              onClick={() => setShowCreateDialog(true)}
              title="Create new file"
            >
              + File
            </button>
            <button
              className="sidebar-button"
              onClick={() => setShowCreateFolderDialog(true)}
              title="Create new folder"
            >
              + Folder
            </button>
          </div>
        </div>
        <FileTree branch={branch} onDelete={handleDelete} onRename={handleRename} />
      </div>

      <CreateFileDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        existingPaths={existingPaths}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        filePath={fileToDelete}
        onClose={() => {
          setShowDeleteDialog(false);
          setFileToDelete(null);
        }}
      />

      <RenameDialog
        isOpen={showRenameDialog}
        currentPath={fileToRename}
        onClose={() => {
          setShowRenameDialog(false);
          setFileToRename(null);
        }}
        existingPaths={existingPaths}
      />

      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        existingPaths={existingPaths}
      />
    </aside>
  );
}
