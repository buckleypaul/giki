import { useState, useEffect } from 'react';
import { fetchStatus } from '../api/client';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [branch, setBranch] = useState<string | undefined>(undefined);

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

  // Fetch current branch
  useEffect(() => {
    fetchStatus()
      .then((status) => setBranch(status.branch))
      .catch((err) => console.error('Error fetching status:', err));
  }, []);

  return (
    <div className="layout">
      <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="layout-main">
        <Sidebar isOpen={sidebarOpen} branch={branch} />
        <ContentArea branch={branch} />
      </div>
    </div>
  );
}
