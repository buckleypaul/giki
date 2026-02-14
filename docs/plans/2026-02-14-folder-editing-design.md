# Folder Editing Design

**Date:** 2026-02-14
**Feature:** Add rename/move functionality for folders in the sidebar

## Overview

This feature extends the existing file editing system to support renaming and moving folders. Users will see an edit button (✎) next to folders in the sidebar, just like files currently have. Clicking it opens a dialog to rename/move the folder, which creates a pending change that's applied on commit.

## Architecture

### System Integration
The folder editing feature extends the existing file editing system with minimal changes. It leverages the current pending changes architecture where all modifications are held in React context until explicitly committed.

### New Pending Change Type
Add a `move-folder` type alongside the existing `move`, `create`, `modify`, and `delete` types:

```typescript
{
  type: 'move-folder',
  path: string,      // new folder path
  oldPath: string,   // current folder path
}
```

### Responsibilities

**Frontend:**
- Detect folder vs file in FileTree
- Show edit button for both files and folders
- Create `move-folder` pending change when renaming folders
- Display folder moves in pending changes list

**Backend:**
- When committing, execute `git mv <oldPath> <newPath>` for folder moves
- Git handles recursive file moves automatically

### Key Design Principle
Reuse existing components (RenameDialog, FileTree) with type-awareness rather than creating separate code paths.

## Component Changes

### FileTree.tsx
- Remove the `!isDirectory` condition on line 45 (in `handleRename`) so rename is allowed for folders
- Keep `!isDirectory` check on line 38 (in `handleDelete`) - only adding rename for folders, not delete
- Remove the `!isDirectory` condition on line 66 that hides the rename button for folders
- Pass `isDirectory` flag to the `onRename` callback so Sidebar knows what type is being renamed

### RenameDialog.tsx
- Add an `isFolder` prop to detect if renaming a folder
- When `isFolder` is true:
  - Change dialog title from "Rename / Move File" to "Rename / Move Folder"
  - Create `move-folder` pending change instead of `move`
- All validation stays the same (no "..", no conflicts, etc.)

### Sidebar.tsx
- Update `handleRename` to accept both path and a boolean indicating if it's a folder
- Pass `isFolder` state to RenameDialog

## Data Flow

### User Interaction Flow
1. User clicks edit button (✎) next to a folder in the sidebar
2. FileTree calls `onRename(folderPath, true)` - passing `isDirectory: true`
3. Sidebar opens RenameDialog with `isFolder={true}` and `currentPath={folderPath}`
4. RenameDialog shows "Rename / Move Folder" title
5. User enters new path (e.g., changing `docs/` to `documentation/`)
6. On submit, RenameDialog creates a pending change:
   ```js
   addChange({
     type: 'move-folder',
     path: 'documentation',
     oldPath: 'docs',
   })
   ```
7. Pending change is stored in React context (not applied to disk yet)
8. Dialog closes, folder remains visible in tree at old location until commit

### Commit Flow
1. User clicks "Commit Changes" (existing functionality)
2. Backend processes pending changes in order
3. When it encounters a `move-folder` change, it executes: `git mv docs/ documentation/`
4. Git recursively moves all files in the folder
5. Commit is created with all changes

### Visual Feedback
- Folder shows in tree with visual indicator (similar to how moved files currently show)
- Pending changes panel displays "Move folder: docs/ → documentation/"

## Validation & Error Handling

### Validation Rules (in RenameDialog)
- **Empty path:** Show error "Folder path is required"
- **Path traversal:** Reject paths containing ".."
- **Same path:** Show error "New path is the same as current path"
- **Existing path:** Check if a folder already exists at the new path, show error "A folder already exists at this path"
- **Self-nesting:** Prevent moving a folder into itself (e.g., `docs/` → `docs/archive/`)

### Error Handling
- All validation happens client-side before creating the pending change
- Backend errors during commit (e.g., git mv fails) are handled by existing commit error flow
- Invalid folder moves are caught in the dialog, not at commit time

### Edge Cases
- **Empty folders:** Allowed (git will move the folder structure even if empty via .gitkeep)
- **Nested folders:** Handled automatically by git mv
- **Conflicting pending changes:** If there's already a pending change affecting files in the folder, show warning or prevent the move

## Testing Strategy

### Frontend Component Tests

**FileTree.test.tsx:**
- Test that rename button appears for folders (not just files)
- Test that delete button does NOT appear for folders
- Test that clicking rename on a folder calls `onRename(path, true)`

**RenameDialog.test.tsx:**
- Test dialog title shows "Rename / Move Folder" when `isFolder={true}`
- Test dialog title shows "Rename / Move File" when `isFolder={false}`
- Test that renaming a folder creates a `move-folder` pending change
- Test that renaming a file creates a `move` pending change
- Test self-nesting validation (can't move `docs/` to `docs/archive/`)

**Sidebar.test.tsx:**
- Test that clicking rename on a folder opens dialog with `isFolder={true}`

### Backend Integration Tests
- Test that committing a `move-folder` pending change executes `git mv`
- Test that all files in the folder are moved correctly
- Test that nested folders are handled properly
- Test error handling when git mv fails

### Manual Testing
- Rename a folder with files
- Rename an empty folder
- Rename a nested folder
- Verify pending changes display correctly
- Verify commit applies the move

## Implementation Notes

- The feature reuses existing RenameDialog component with type-awareness
- No new dialogs or major UI components needed
- Backend change is minimal: add support for `move-folder` type in commit handler
- Git handles all the complexity of recursive moves automatically
