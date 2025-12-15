import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
    },
    {
      path: '/servers',
      label: 'Servers',
      icon: '🖥️',
    },
    {
      path: '/alerts',
      label: 'Alerts',
      icon: '🚨',
    },
    {
      path: '/management',
      label: 'Server Management',
      icon: '⚙️',
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: '🔧',
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      >
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  {isOpen && <span className="nav-label">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
