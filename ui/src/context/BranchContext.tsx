import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { fetchStatus } from '../api/client';

interface BranchContextType {
  selectedBranch: string | null;
  setSelectedBranch: (branch: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }): ReactElement {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  // Initialize with current branch from API
  useEffect(() => {
    const loadInitialBranch = async () => {
      try {
        const status = await fetchStatus();
        setSelectedBranch(status.branch);
      } catch (error) {
        console.error('Failed to load initial branch:', error);
      }
    };
    loadInitialBranch();
  }, []);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextType {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
