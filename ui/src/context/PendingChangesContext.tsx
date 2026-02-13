import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type PendingChange = {
  type: 'create' | 'modify' | 'delete' | 'move';
  path: string;
  oldPath?: string;
  content?: string;
};

interface PendingChangesContextType {
  addChange: (change: PendingChange) => void;
  removeChange: (path: string) => void;
  getChanges: () => PendingChange[];
  clearChanges: () => void;
  getModifiedContent: (path: string) => string | null;
}

const PendingChangesContext = createContext<PendingChangesContextType | undefined>(undefined);

export function PendingChangesProvider({ children }: { children: ReactNode }) {
  const [changes, setChanges] = useState<PendingChange[]>([]);

  const addChange = (change: PendingChange) => {
    setChanges((prev) => {
      // Remove any existing change for this path (update in-place)
      const filtered = prev.filter((c) => c.path !== change.path);
      return [...filtered, change];
    });
  };

  const removeChange = (path: string) => {
    setChanges((prev) => prev.filter((c) => c.path !== path));
  };

  const getChanges = () => {
    return changes;
  };

  const clearChanges = () => {
    setChanges([]);
  };

  const getModifiedContent = (path: string): string | null => {
    const change = changes.find((c) => c.path === path && c.type === 'modify');
    return change?.content ?? null;
  };

  return (
    <PendingChangesContext.Provider
      value={{
        addChange,
        removeChange,
        getChanges,
        clearChanges,
        getModifiedContent,
      }}
    >
      {children}
    </PendingChangesContext.Provider>
  );
}

export function usePendingChanges() {
  const context = useContext(PendingChangesContext);
  if (context === undefined) {
    throw new Error('usePendingChanges must be used within a PendingChangesProvider');
  }
  return context;
}
