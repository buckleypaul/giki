# Folder Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add rename/move functionality for folders in the sidebar, using a single pending change that calls `git mv` on commit.

**Architecture:** Extend existing file editing pattern to support folders. Add `move-folder` pending change type, show edit button for folders in FileTree, enhance RenameDialog to handle folders, and add backend support for moving folders via `git mv`.

**Tech Stack:** React + TypeScript (frontend), Go + go-git (backend), Vitest (frontend tests), Go testing (backend tests)

---

## Task 1: Add move-folder pending change type (Frontend Types)

**Files:**
- Modify: `ui/src/context/PendingChangesContext.tsx:4-9`

**Step 1: Write failing test for move-folder type**

Create `ui/src/context/PendingChangesContext.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PendingChangesProvider, usePendingChanges } from './PendingChangesContext';

describe('PendingChangesContext', () => {
  it('should handle move-folder pending change', () => {
    const { result } = renderHook(() => usePendingChanges(), {
      wrapper: PendingChangesProvider,
    });

    act(() => {
      result.current.addChange({
        type: 'move-folder',
        path: 'new-folder',
        oldPath: 'old-folder',
      });
    });

    const changes = result.current.getChanges();
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('move-folder');
    expect(changes[0].path).toBe('new-folder');
    expect(changes[0].oldPath).toBe('old-folder');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd ui && npm test PendingChangesContext.test.tsx`
Expected: FAIL with type error on 'move-folder'

**Step 3: Add move-folder to PendingChange type**

In `ui/src/context/PendingChangesContext.tsx`, update type on line 5:

```typescript
export type PendingChange = {
  type: 'create' | 'modify' | 'delete' | 'move' | 'move-folder';
  path: string;
  oldPath?: string;
  content?: string;
};
```

**Step 4: Run test to verify it passes**

Run: `cd ui && npm test PendingChangesContext.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add ui/src/context/PendingChangesContext.tsx ui/src/context/PendingChangesContext.test.tsx
git commit -m "feat: add move-folder pending change type

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update FileTree to show rename button for folders

**Files:**
- Modify: `ui/src/components/FileTree.tsx:45,66`
- Modify: `ui/src/components/FileTree.test.tsx` (add test)

**Step 1: Write failing test for folder rename button**

Add to `ui/src/components/FileTree.test.tsx`:

```typescript
it('should show rename button for folders', () => {
  const mockOnRename = vi.fn();
  const folderNode: TreeNode = {
    name: 'docs',
    path: 'docs',
    isDir: true,
    children: [
      { name: 'readme.md', path: 'docs/readme.md', isDir: false },
    ],
  };

  render(<TreeItem
    node={folderNode}
    depth={0}
    onFileClick={vi.fn()}
    onRename={mockOnRename}
  />);

  const renameButton = screen.queryByLabelText('Rename docs');
  expect(renameButton).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd ui && npm test FileTree.test.tsx`
Expected: FAIL - rename button not found for folder

**Step 3: Remove !isDirectory check for rename button**

In `ui/src/components/FileTree.tsx`:

Line 45 - Remove the `&& !isDirectory` condition:
```typescript
const handleRename = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (onRename) {  // Remove !isDirectory check
    onRename(node.path);
  }
};
```

Line 66 - Update the condition to show rename for both files and folders, but keep delete only for files:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `cd ui && npm test FileTree.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add ui/src/components/FileTree.tsx ui/src/components/FileTree.test.tsx
git commit -m "feat: show rename button for folders in FileTree

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Pass isDirectory flag to onRename callback

**Files:**
- Modify: `ui/src/components/FileTree.tsx:11,19,43-47`
- Modify: `ui/src/components/Sidebar.tsx:65-68`

**Step 1: Write failing test for isDirectory flag**

Add to `ui/src/components/FileTree.test.tsx`:

```typescript
it('should call onRename with isDirectory flag', () => {
  const mockOnRename = vi.fn();
  const folderNode: TreeNode = {
    name: 'docs',
    path: 'docs',
    isDir: true,
    children: [],
  };

  render(<TreeItem
    node={folderNode}
    depth={0}
    onFileClick={vi.fn()}
    onRename={mockOnRename}
  />);

  const renameButton = screen.getByLabelText('Rename docs');
  fireEvent.click(renameButton);

  expect(mockOnRename).toHaveBeenCalledWith('docs', true);
});
```

**Step 2: Run test to verify it fails**

Run: `cd ui && npm test FileTree.test.tsx`
Expected: FAIL - onRename called with wrong arguments

**Step 3: Update FileTree to pass isDirectory flag**

In `ui/src/components/FileTree.tsx`:

Update FileTreeProps (line 11):
```typescript
interface FileTreeProps {
  branch?: string;
  onDelete?: (path: string) => void;
  onRename?: (path: string, isDirectory: boolean) => void;
}
```

Update TreeItemProps (line 19):
```typescript
interface TreeItemProps {
  node: TreeNode;
  depth: number;
  onFileClick: (path: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (path: string, isDirectory: boolean) => void;
  isDeleted?: boolean;
  isMoved?: boolean;
}
```

Update handleRename (line 43):
```typescript
const handleRename = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (onRename) {
    onRename(node.path, isDirectory);
  }
};
```

**Step 4: Update Sidebar to accept isDirectory parameter**

In `ui/src/components/Sidebar.tsx`, update handleRename (line 65):

```typescript
const handleRename = (path: string, isDirectory: boolean) => {
  setFileToRename(path);
  setIsFolderRename(isDirectory);
  setShowRenameDialog(true);
};
```

Add state for tracking folder rename (after line 23):
```typescript
const [isFolderRename, setIsFolderRename] = useState(false);
```

Pass isFolder to RenameDialog (line 110):
```typescript
<RenameDialog
  isOpen={showRenameDialog}
  currentPath={fileToRename}
  isFolder={isFolderRename}
  onClose={() => {
    setShowRenameDialog(false);
    setFileToRename(null);
    setIsFolderRename(false);
  }}
  existingPaths={existingPaths}
/>
```

**Step 5: Run test to verify it passes**

Run: `cd ui && npm test FileTree.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add ui/src/components/FileTree.tsx ui/src/components/Sidebar.tsx ui/src/components/FileTree.test.tsx
git commit -m "feat: pass isDirectory flag to onRename callback

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Enhance RenameDialog to support folders

**Files:**
- Modify: `ui/src/components/RenameDialog.tsx:6,13,91,67-71`
- Modify: `ui/src/components/RenameDialog.test.tsx` (add tests)

**Step 1: Write failing test for folder rename**

Create `ui/src/components/RenameDialog.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RenameDialog from './RenameDialog';
import { PendingChangesProvider } from '../context/PendingChangesContext';

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <PendingChangesProvider>
        {ui}
      </PendingChangesProvider>
    </BrowserRouter>
  );
};

describe('RenameDialog', () => {
  it('should show "Rename / Move Folder" title when isFolder is true', () => {
    renderWithContext(
      <RenameDialog
        isOpen={true}
        currentPath="docs"
        isFolder={true}
        onClose={vi.fn()}
        existingPaths={[]}
      />
    );

    expect(screen.getByText('Rename / Move Folder')).toBeInTheDocument();
  });

  it('should show "Rename / Move File" title when isFolder is false', () => {
    renderWithContext(
      <RenameDialog
        isOpen={true}
        currentPath="readme.md"
        isFolder={false}
        onClose={vi.fn()}
        existingPaths={[]}
      />
    );

    expect(screen.getByText('Rename / Move File')).toBeInTheDocument();
  });

  it('should create move-folder pending change for folders', () => {
    const mockOnClose = vi.fn();
    const { container } = renderWithContext(
      <RenameDialog
        isOpen={true}
        currentPath="docs"
        isFolder={true}
        onClose={mockOnClose}
        existingPaths={[]}
      />
    );

    const input = screen.getByLabelText('New path:');
    fireEvent.change(input, { target: { value: 'documentation' } });

    const submitButton = screen.getByText('Rename');
    fireEvent.click(submitButton);

    // Check that pending change was created (we'll need to export usePendingChanges or check via other means)
    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd ui && npm test RenameDialog.test.tsx`
Expected: FAIL - isFolder prop doesn't exist, wrong title shown

**Step 3: Add isFolder prop to RenameDialog**

In `ui/src/components/RenameDialog.tsx`:

Update interface (line 6):
```typescript
interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string | null;
  isFolder?: boolean;
  existingPaths: string[];
}
```

Update component signature (line 13):
```typescript
export default function RenameDialog({
  isOpen,
  onClose,
  currentPath,
  isFolder = false,
  existingPaths,
}: RenameDialogProps) {
```

Update dialog title (line 91):
```typescript
<h2 className="dialog-title">
  {isFolder ? 'Rename / Move Folder' : 'Rename / Move File'}
</h2>
```

Update pending change creation (line 66-71):
```typescript
// Add move or move-folder pending change
addChange({
  type: isFolder ? 'move-folder' : 'move',
  path: normalizedNew,
  oldPath: normalizedCurrent,
});
```

**Step 4: Add validation for self-nesting folders**

In `ui/src/components/RenameDialog.tsx`, after the "same path" check (around line 54), add:

```typescript
// For folders, prevent moving into itself (self-nesting)
if (isFolder && normalizedNew.startsWith(normalizedCurrent + '/')) {
  setError('Cannot move a folder into itself');
  return;
}
```

**Step 5: Run test to verify it passes**

Run: `cd ui && npm test RenameDialog.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add ui/src/components/RenameDialog.tsx ui/src/components/RenameDialog.test.tsx
git commit -m "feat: enhance RenameDialog to support folder renaming

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add backend MoveFolder function

**Files:**
- Modify: `internal/git/provider.go` (add interface method)
- Modify: `internal/git/local.go` (add implementation)
- Create: `internal/git/local_movefolder_test.go`

**Step 1: Write failing test for MoveFolder**

Create `internal/git/local_movefolder_test.go`:

```go
package git

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMoveFolder(t *testing.T) {
	// Setup test repo
	repoPath, cleanup := setupTestRepo(t)
	defer cleanup()

	provider, err := NewLocalProvider(repoPath, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// Create a folder with some files
	oldFolderPath := filepath.Join(repoPath, "docs")
	if err := os.MkdirAll(oldFolderPath, 0755); err != nil {
		t.Fatalf("failed to create test folder: %v", err)
	}

	testFile := filepath.Join(oldFolderPath, "readme.md")
	if err := os.WriteFile(testFile, []byte("# Docs"), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	// Move the folder
	err = provider.MoveFolder("docs", "documentation")
	if err != nil {
		t.Fatalf("MoveFolder failed: %v", err)
	}

	// Verify old folder doesn't exist
	if _, err := os.Stat(oldFolderPath); !os.IsNotExist(err) {
		t.Error("old folder still exists")
	}

	// Verify new folder exists
	newFolderPath := filepath.Join(repoPath, "documentation")
	if _, err := os.Stat(newFolderPath); err != nil {
		t.Errorf("new folder doesn't exist: %v", err)
	}

	// Verify file was moved
	movedFile := filepath.Join(newFolderPath, "readme.md")
	if _, err := os.Stat(movedFile); err != nil {
		t.Errorf("file wasn't moved: %v", err)
	}
}

func TestMoveFolder_SourceNotFound(t *testing.T) {
	repoPath, cleanup := setupTestRepo(t)
	defer cleanup()

	provider, err := NewLocalProvider(repoPath, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	err = provider.MoveFolder("nonexistent", "new")
	if err == nil {
		t.Error("expected error for nonexistent source")
	}
}

func TestMoveFolder_DestinationExists(t *testing.T) {
	repoPath, cleanup := setupTestRepo(t)
	defer cleanup()

	provider, err := NewLocalProvider(repoPath, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// Create both folders
	os.MkdirAll(filepath.Join(repoPath, "docs"), 0755)
	os.MkdirAll(filepath.Join(repoPath, "documentation"), 0755)

	err = provider.MoveFolder("docs", "documentation")
	if err == nil {
		t.Error("expected error when destination exists")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/git -run TestMoveFolder -v`
Expected: FAIL - MoveFolder method doesn't exist

**Step 3: Add MoveFolder to GitProvider interface**

In `internal/git/provider.go`, add after MoveFile method:

```go
// MoveFolder moves/renames a folder from oldPath to newPath.
// This operation moves all files within the folder recursively.
MoveFolder(oldPath, newPath string) error
```

**Step 4: Implement MoveFolder in LocalProvider**

In `internal/git/local.go`, add after MoveFile function:

```go
// MoveFolder moves/renames a folder from oldPath to newPath.
// Uses os.Rename which works for directories and all their contents.
func (p *LocalProvider) MoveFolder(oldPath, newPath string) error {
	// Normalize paths: strip leading/trailing slashes, convert to forward slashes
	oldPath = strings.Trim(oldPath, "/")
	oldPath = filepath.ToSlash(oldPath)
	newPath = strings.Trim(newPath, "/")
	newPath = filepath.ToSlash(newPath)

	// Validate paths are not empty
	if oldPath == "" || newPath == "" {
		return fmt.Errorf("paths cannot be empty")
	}

	// Security: validate paths don't escape repository root
	if strings.Contains(oldPath, "..") || strings.Contains(newPath, "..") {
		return fmt.Errorf("invalid path: cannot contain '..'")
	}

	// Prevent self-nesting (moving folder into itself)
	if strings.HasPrefix(newPath, oldPath+"/") {
		return fmt.Errorf("cannot move folder into itself")
	}

	// Convert to OS-specific path separators
	oldFullPath := filepath.Join(p.path, filepath.FromSlash(oldPath))
	newFullPath := filepath.Join(p.path, filepath.FromSlash(newPath))

	// Check if old folder exists and is a directory
	info, err := os.Stat(oldFullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("source folder not found")
		}
		return fmt.Errorf("failed to stat source folder: %w", err)
	}

	if !info.IsDir() {
		return fmt.Errorf("source path is not a directory")
	}

	// Check if new path already exists
	if _, err := os.Stat(newFullPath); err == nil {
		return fmt.Errorf("destination folder already exists")
	}

	// Create parent directories for new path if they don't exist
	dir := filepath.Dir(newFullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create parent directories: %w", err)
	}

	// Move/rename the folder (os.Rename works for directories)
	if err := os.Rename(oldFullPath, newFullPath); err != nil {
		return fmt.Errorf("failed to move folder: %w", err)
	}

	return nil
}
```

**Step 5: Run test to verify it passes**

Run: `go test ./internal/git -run TestMoveFolder -v`
Expected: PASS

**Step 6: Commit**

```bash
git add internal/git/provider.go internal/git/local.go internal/git/local_movefolder_test.go
git commit -m "feat: add MoveFolder to GitProvider

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add /api/move-folder endpoint

**Files:**
- Create: `internal/server/handler_movefolder.go`
- Create: `internal/server/handler_movefolder_test.go`
- Modify: `internal/server/server.go` (register route)

**Step 1: Write failing test for move-folder handler**

Create `internal/server/handler_movefolder_test.go`:

```go
package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/buckleypaul/giki/internal/git"
)

func TestHandleMoveFolder(t *testing.T) {
	// Setup test repo
	repoPath, cleanup := setupTestRepo(t)
	defer cleanup()

	// Create test folder with file
	folderPath := filepath.Join(repoPath, "docs")
	if err := os.MkdirAll(folderPath, 0755); err != nil {
		t.Fatalf("failed to create folder: %v", err)
	}
	testFile := filepath.Join(folderPath, "readme.md")
	if err := os.WriteFile(testFile, []byte("# Docs"), 0644); err != nil {
		t.Fatalf("failed to create file: %v", err)
	}

	// Create server
	provider, err := git.NewLocalProvider(repoPath, "")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	srv := NewServer(provider, repoPath, "", false)

	// Create request
	reqBody := MoveFolderRequest{
		OldPath: "docs",
		NewPath: "documentation",
	}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/move-folder", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Call handler
	srv.handleMoveFolder(w, req)

	// Check response
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp SuccessResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !resp.Success {
		t.Error("expected success=true")
	}

	// Verify folder was moved
	newPath := filepath.Join(repoPath, "documentation")
	if _, err := os.Stat(newPath); err != nil {
		t.Errorf("folder wasn't moved: %v", err)
	}
}

func TestHandleMoveFolder_InvalidRequest(t *testing.T) {
	repoPath, cleanup := setupTestRepo(t)
	defer cleanup()

	provider, _ := git.NewLocalProvider(repoPath, "")
	srv := NewServer(provider, repoPath, "", false)

	req := httptest.NewRequest(http.MethodPost, "/api/move-folder", bytes.NewReader([]byte("invalid")))
	w := httptest.NewRecorder()

	srv.handleMoveFolder(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestHandleMoveFolder_EmptyPaths(t *testing.T) {
	repoPath, cleanup := setupTestRepo(t)
	defer cleanup()

	provider, _ := git.NewLocalProvider(repoPath, "")
	srv := NewServer(provider, repoPath, "", false)

	reqBody := MoveFolderRequest{OldPath: "", NewPath: "new"}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/move-folder", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	srv.handleMoveFolder(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/server -run TestHandleMoveFolder -v`
Expected: FAIL - handleMoveFolder doesn't exist

**Step 3: Create handler implementation**

Create `internal/server/handler_movefolder.go`:

```go
package server

import (
	"encoding/json"
	"net/http"
)

// MoveFolderRequest represents the JSON payload for POST /api/move-folder
type MoveFolderRequest struct {
	OldPath string `json:"oldPath"`
	NewPath string `json:"newPath"`
}

// handleMoveFolder handles POST /api/move-folder requests.
// Moves/renames a folder from oldPath to newPath.
func (s *Server) handleMoveFolder(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req MoveFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	// Validate paths are not empty
	if req.OldPath == "" || req.NewPath == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "paths cannot be empty"})
		return
	}

	// Move folder
	if err := s.provider.MoveFolder(req.OldPath, req.NewPath); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/server -run TestHandleMoveFolder -v`
Expected: PASS

**Step 5: Register route in server.go**

In `internal/server/server.go`, add route after the `/api/move` route:

```go
mux.HandleFunc("POST /api/move-folder", s.handleMoveFolder)
```

**Step 6: Run all server tests**

Run: `go test ./internal/server -v`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add internal/server/handler_movefolder.go internal/server/handler_movefolder_test.go internal/server/server.go
git commit -m "feat: add /api/move-folder endpoint

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add moveFolderAPI client function

**Files:**
- Modify: `ui/src/api/client.ts` (add moveFolder function)

**Step 1: Add moveFolder function to client.ts**

In `ui/src/api/client.ts`, add after the `moveFile` function (around line 127):

```typescript
/**
 * Moves or renames a folder
 * @param oldPath - Current folder path
 * @param newPath - New folder path
 */
export async function moveFolder(oldPath: string, newPath: string): Promise<void> {
  const response = await fetch('/api/move-folder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPath, newPath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to move folder: ${error.error || response.statusText}`);
  }
}
```

**Step 2: Test manually (integration test)**

Run dev servers and test folder move:
```bash
# Terminal 1
make frontend-dev

# Terminal 2
make dev

# Browser: Create a folder, add files, rename it
```

**Step 3: Commit**

```bash
git add ui/src/api/client.ts
git commit -m "feat: add moveFolder API client function

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update CommitDialog to handle move-folder changes

**Files:**
- Modify: `ui/src/components/CommitDialog.tsx:43,51-56,106-107`

**Step 1: Write failing test for move-folder in CommitDialog**

Add to `ui/src/components/CommitDialog.test.tsx`:

```typescript
it('should process move-folder changes', async () => {
  const mockChanges: PendingChange[] = [
    { type: 'move-folder', path: 'documentation', oldPath: 'docs' },
  ];

  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  renderWithContext(
    <CommitDialog
      isOpen={true}
      onClose={mockOnClose}
      changes={mockChanges}
      onSuccess={mockOnSuccess}
    />
  );

  const messageInput = screen.getByPlaceholderText('Describe your changes...');
  fireEvent.change(messageInput, { target: { value: 'Rename docs folder' } });

  const commitButton = screen.getByText('Commit');
  fireEvent.click(commitButton);

  await waitFor(() => {
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  // Verify moveFolder was called
  expect(api.moveFolder).toHaveBeenCalledWith('docs', 'documentation');
});
```

**Step 2: Run test to verify it fails**

Run: `cd ui && npm test CommitDialog.test.tsx`
Expected: FAIL - move-folder changes not processed

**Step 3: Import moveFolder in CommitDialog**

In `ui/src/components/CommitDialog.tsx`, update import (line 5):

```typescript
import { writeFile, deleteFile, moveFile, moveFolder, commitChanges, fetchTree, fetchStatus } from '../api/client';
```

**Step 4: Update change filtering to include move-folder**

In `ui/src/components/CommitDialog.tsx`, update line 43:

```typescript
// Execute file operations in order: delete, move, move-folder, create/modify
const deletes = changes.filter(c => c.type === 'delete');
const moves = changes.filter(c => c.type === 'move');
const folderMoves = changes.filter(c => c.type === 'move-folder');
const writes = changes.filter(c => c.type === 'create' || c.type === 'modify');
```

**Step 5: Process folder moves**

Add after file moves (around line 56):

```typescript
// Move folders next
for (const change of folderMoves) {
  if (change.oldPath) {
    await moveFolder(change.oldPath, change.path);
  }
}
```

**Step 6: Update changes summary to show folder moves**

Update changesSummary (line 103):

```typescript
const changesSummary = {
  created: changes.filter(c => c.type === 'create').length,
  modified: changes.filter(c => c.type === 'modify').length,
  deleted: changes.filter(c => c.type === 'delete').length,
  moved: changes.filter(c => c.type === 'move').length,
  foldersMoved: changes.filter(c => c.type === 'move-folder').length,
};
```

Add display for folder moves in the summary list (after line 143):

```typescript
{changesSummary.foldersMoved > 0 && (
  <li className="commit-summary-item commit-summary-moved">
    {changesSummary.foldersMoved} {changesSummary.foldersMoved === 1 ? 'folder' : 'folders'} moved
  </li>
)}
```

**Step 7: Run test to verify it passes**

Run: `cd ui && npm test CommitDialog.test.tsx`
Expected: PASS

**Step 8: Commit**

```bash
git add ui/src/components/CommitDialog.tsx ui/src/components/CommitDialog.test.tsx
git commit -m "feat: handle move-folder changes in CommitDialog

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Manual End-to-End Testing

**Files:**
- None (manual testing)

**Step 1: Start dev servers**

```bash
# Terminal 1
make frontend-dev

# Terminal 2
make dev
```

**Step 2: Test folder creation and renaming**

1. Open browser to http://localhost:5173
2. Click "+ Folder" button
3. Enter "docs" as folder path
4. Click Create
5. Verify "docs" folder appears in sidebar
6. Click edit button (✎) next to "docs" folder
7. Verify dialog shows "Rename / Move Folder" title
8. Enter "documentation" as new path
9. Click Rename
10. Verify folder shows as "documentation" in sidebar (or pending state)

**Step 3: Test folder move with files**

1. Create a file "docs/readme.md" with some content
2. Click edit (✎) next to "docs" folder
3. Rename to "guides"
4. Verify pending changes shows "Move folder: docs/ → guides/"
5. Click "Commit Changes"
6. Enter commit message "Reorganize folders"
7. Click Commit
8. Verify folder is renamed in sidebar
9. Verify file is at "guides/readme.md"

**Step 4: Test validation**

1. Create folder "temp"
2. Try to rename "temp" to "temp/archive"
3. Verify error: "Cannot move a folder into itself"
4. Create another folder "backup"
5. Try to rename "temp" to "backup"
6. Verify error: "A folder already exists at this path"

**Step 5: Test git history**

```bash
git log --oneline -5
git show HEAD  # Should show folder rename
```

**Step 6: Document results**

All tests passed, ready to commit final integration.

**Step 7: Commit if any fixes were needed**

```bash
# If any bugs were fixed during testing:
git add .
git commit -m "fix: address issues found in E2E testing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update documentation

**Files:**
- Modify: `CLAUDE.md` (document folder editing feature)

**Step 1: Add folder editing to features list**

In `CLAUDE.md`, add to the API endpoints section or features section:

```markdown
### Folder Operations

Users can rename/move folders via the edit button (✎) in the sidebar:
- Click edit next to a folder name
- Enter new path (can move to different parent directory)
- Creates a `move-folder` pending change
- On commit, executes `git mv` to move folder and all contents
- Validates against self-nesting and existing paths
```

**Step 2: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: add folder editing to CLAUDE.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan implements folder editing in 10 granular tasks:

1. **Task 1:** Add `move-folder` pending change type (frontend types)
2. **Task 2:** Show rename button for folders in FileTree
3. **Task 3:** Pass `isDirectory` flag to onRename callback
4. **Task 4:** Enhance RenameDialog to support folders
5. **Task 5:** Add backend `MoveFolder` function
6. **Task 6:** Add `/api/move-folder` endpoint
7. **Task 7:** Add `moveFolder` API client function
8. **Task 8:** Update CommitDialog to handle `move-folder` changes
9. **Task 9:** Manual end-to-end testing
10. **Task 10:** Update documentation

Each task follows TDD: write failing test, implement minimal code, verify passing test, commit. The implementation reuses existing patterns (RenameDialog, pending changes, git mv) and maintains consistency with the current architecture.
