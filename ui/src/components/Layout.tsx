import { useState, useEffect } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  return (
    <div className="layout">
      <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="layout-main">
        <Sidebar isOpen={sidebarOpen} />
        <ContentArea />
      </div>
    </div>
  );
}
