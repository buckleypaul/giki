import { useState, useEffect } from 'react';
import { useBranch } from '../context/BranchContext';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import PendingChanges from './PendingChanges';
import { SearchPanel } from './SearchPanel';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPendingChanges, setShowPendingChanges] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { selectedBranch } = useBranch();

  // Close sidebar by default on narrow viewports
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut for search: Cmd+K (Mac) or Ctrl+K (Win/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="layout">
      <TopBar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenPendingChanges={() => setShowPendingChanges(true)}
      />
      <div className="layout-main">
        <Sidebar isOpen={sidebarOpen} branch={selectedBranch ?? undefined} />
        <ContentArea branch={selectedBranch ?? undefined} />
      </div>
      <PendingChanges
        isOpen={showPendingChanges}
        onClose={() => setShowPendingChanges(false)}
      />
      <SearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
