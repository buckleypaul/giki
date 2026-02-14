import { describe, it, expect } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PendingChangesProvider, usePendingChanges } from './PendingChangesContext';
import type { PendingChange } from './PendingChangesContext';

describe('PendingChangesContext', () => {
  describe('usePendingChanges hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => usePendingChanges());
      }).toThrow('usePendingChanges must be used within a PendingChangesProvider');

      console.error = originalError;
    });

    it('provides context when used within provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      expect(result.current.addChange).toBeDefined();
      expect(result.current.removeChange).toBeDefined();
      expect(result.current.getChanges).toBeDefined();
      expect(result.current.clearChanges).toBeDefined();
      expect(result.current.getModifiedContent).toBeDefined();
    });
  });

  describe('addChange', () => {
    it('adds a new change to the list', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const change: PendingChange = {
        type: 'modify',
        path: 'README.md',
        content: 'New content',
      };

      act(() => {
        result.current.addChange(change);
      });

      expect(result.current.getChanges()).toHaveLength(1);
      expect(result.current.getChanges()[0]).toEqual(change);
    });

    it('adds multiple changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const change1: PendingChange = {
        type: 'modify',
        path: 'README.md',
        content: 'New content',
      };

      const change2: PendingChange = {
        type: 'create',
        path: 'docs/guide.md',
        content: 'Guide content',
      };

      act(() => {
        result.current.addChange(change1);
        result.current.addChange(change2);
      });

      expect(result.current.getChanges()).toHaveLength(2);
    });

    it('replaces existing change for same path', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const change1: PendingChange = {
        type: 'modify',
        path: 'README.md',
        content: 'First content',
      };

      const change2: PendingChange = {
        type: 'modify',
        path: 'README.md',
        content: 'Second content',
      };

      act(() => {
        result.current.addChange(change1);
        result.current.addChange(change2);
      });

      // Should only have one change for README.md with updated content
      expect(result.current.getChanges()).toHaveLength(1);
      expect(result.current.getChanges()[0].content).toBe('Second content');
    });

    it('supports all change types', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const modifyChange: PendingChange = {
        type: 'modify',
        path: 'file1.md',
        content: 'Modified',
      };

      const createChange: PendingChange = {
        type: 'create',
        path: 'file2.md',
        content: 'Created',
      };

      const deleteChange: PendingChange = {
        type: 'delete',
        path: 'file3.md',
      };

      const moveChange: PendingChange = {
        type: 'move',
        path: 'new/file4.md',
        oldPath: 'old/file4.md',
      };

      const moveFolderChange: PendingChange = {
        type: 'move-folder',
        path: 'new-folder',
        oldPath: 'old-folder',
      };

      act(() => {
        result.current.addChange(modifyChange);
        result.current.addChange(createChange);
        result.current.addChange(deleteChange);
        result.current.addChange(moveChange);
        result.current.addChange(moveFolderChange);
      });

      const changes = result.current.getChanges();
      expect(changes).toHaveLength(5);
      expect(changes.find((c) => c.type === 'modify')).toBeDefined();
      expect(changes.find((c) => c.type === 'create')).toBeDefined();
      expect(changes.find((c) => c.type === 'delete')).toBeDefined();
      expect(changes.find((c) => c.type === 'move')).toBeDefined();
      expect(changes.find((c) => c.type === 'move-folder')).toBeDefined();
    });

    it('should handle move-folder pending change', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

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

  describe('removeChange', () => {
    it('removes a change by path', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const change: PendingChange = {
        type: 'modify',
        path: 'README.md',
        content: 'Content',
      };

      act(() => {
        result.current.addChange(change);
        result.current.removeChange('README.md');
      });

      expect(result.current.getChanges()).toHaveLength(0);
    });

    it('does not affect other changes when removing one', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const change1: PendingChange = {
        type: 'modify',
        path: 'file1.md',
        content: 'Content 1',
      };

      const change2: PendingChange = {
        type: 'modify',
        path: 'file2.md',
        content: 'Content 2',
      };

      act(() => {
        result.current.addChange(change1);
        result.current.addChange(change2);
        result.current.removeChange('file1.md');
      });

      const changes = result.current.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].path).toBe('file2.md');
    });

    it('handles removing non-existent path gracefully', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      act(() => {
        result.current.removeChange('nonexistent.md');
      });

      expect(result.current.getChanges()).toHaveLength(0);
    });
  });

  describe('getChanges', () => {
    it('returns empty array initially', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      expect(result.current.getChanges()).toEqual([]);
    });

    it('returns all pending changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const changes: PendingChange[] = [
        { type: 'modify', path: 'file1.md', content: 'Content 1' },
        { type: 'create', path: 'file2.md', content: 'Content 2' },
        { type: 'delete', path: 'file3.md' },
      ];

      act(() => {
        changes.forEach((change) => result.current.addChange(change));
      });

      expect(result.current.getChanges()).toHaveLength(3);
    });
  });

  describe('clearChanges', () => {
    it('removes all pending changes', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const changes: PendingChange[] = [
        { type: 'modify', path: 'file1.md', content: 'Content 1' },
        { type: 'create', path: 'file2.md', content: 'Content 2' },
        { type: 'delete', path: 'file3.md' },
      ];

      act(() => {
        changes.forEach((change) => result.current.addChange(change));
        result.current.clearChanges();
      });

      expect(result.current.getChanges()).toEqual([]);
    });

    it('handles clearing when already empty', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      act(() => {
        result.current.clearChanges();
      });

      expect(result.current.getChanges()).toEqual([]);
    });
  });

  describe('getModifiedContent', () => {
    it('returns content for modified file', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const change: PendingChange = {
        type: 'modify',
        path: 'README.md',
        content: 'Modified content',
      };

      act(() => {
        result.current.addChange(change);
      });

      expect(result.current.getModifiedContent('README.md')).toBe('Modified content');
    });

    it('returns null for unmodified file', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      expect(result.current.getModifiedContent('README.md')).toBeNull();
    });

    it('returns null for non-modify change types', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      const createChange: PendingChange = {
        type: 'create',
        path: 'new.md',
        content: 'New content',
      };

      const deleteChange: PendingChange = {
        type: 'delete',
        path: 'deleted.md',
      };

      act(() => {
        result.current.addChange(createChange);
        result.current.addChange(deleteChange);
      });

      // getModifiedContent only returns content for 'modify' type
      expect(result.current.getModifiedContent('new.md')).toBeNull();
      expect(result.current.getModifiedContent('deleted.md')).toBeNull();
    });

    it('handles path that does not exist', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <PendingChangesProvider>{children}</PendingChangesProvider>
      );

      const { result } = renderHook(() => usePendingChanges(), { wrapper });

      expect(result.current.getModifiedContent('nonexistent.md')).toBeNull();
    });
  });

  describe('Component integration', () => {
    it('renders children correctly', () => {
      render(
        <PendingChangesProvider>
          <div>Test content</div>
        </PendingChangesProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('allows multiple consumers to access the same state', () => {
      function Consumer1() {
        const { getChanges } = usePendingChanges();
        return <div>Count: {getChanges().length}</div>;
      }

      function Consumer2() {
        const { addChange } = usePendingChanges();
        return (
          <button
            onClick={() =>
              addChange({ type: 'modify', path: 'test.md', content: 'Content' })
            }
          >
            Add
          </button>
        );
      }

      render(
        <PendingChangesProvider>
          <Consumer1 />
          <Consumer2 />
        </PendingChangesProvider>
      );

      expect(screen.getByText('Count: 0')).toBeInTheDocument();

      const button = screen.getByText('Add');
      act(() => {
        button.click();
      });

      expect(screen.getByText('Count: 1')).toBeInTheDocument();
    });
  });
});
