import FileTree from './FileTree';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  branch?: string;
}

export default function Sidebar({ isOpen, branch }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-content">
        <h2 className="sidebar-title">Files</h2>
        <FileTree branch={branch} />
      </div>
    </aside>
  );
}
