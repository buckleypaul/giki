import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-content">
        <h2 className="sidebar-title">Files</h2>
        {/* File tree will be added in Step 11 */}
        <p className="sidebar-placeholder">File tree coming soon...</p>
      </div>
    </aside>
  );
}
