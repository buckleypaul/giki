import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { fetchBranches } from '../api/client';
import type { BranchInfo } from '../api/types';
import { useBranch } from '../context/BranchContext';
import './BranchSelector.css';

export function BranchSelector(): ReactElement {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedBranch, setSelectedBranch } = useBranch();

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await fetchBranches();
        setBranches(data);
      } catch (error) {
        console.error('Failed to load branches:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBranches();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBranch(event.target.value);
  };

  if (loading) {
    return <div className="branch-selector-loading">Loading branches...</div>;
  }

  return (
    <select
      className="branch-selector"
      value={selectedBranch || ''}
      onChange={handleChange}
      aria-label="Select branch"
    >
      {branches.map((branch) => (
        <option key={branch.name} value={branch.name}>
          {branch.name} {branch.isDefault ? '(default)' : ''}
        </option>
      ))}
    </select>
  );
}
