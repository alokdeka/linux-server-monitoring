import { NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  alertCount?: number;
}

const Sidebar = ({ isOpen, onToggle, alertCount = 0 }: SidebarProps) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'View system overview and metrics',
    },
    {
      path: '/servers',
      label: 'Servers',
      icon: '🖥️',
      description: 'Monitor server status and performance',
    },
    {
      path: '/alerts',
      label: 'Alerts',
      icon: '🚨',
      description: 'View and manage system alerts',
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      path: '/management',
      label: 'Server Management',
      icon: '⚙️',
      description: 'Register and manage servers',
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: '🔧',
      description: 'Configure dashboard preferences',
    },
  ];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the first focusable element when sidebar opens
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onToggle]);

  // Handle click outside to close on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth <= 767
      ) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const handleOverlayClick = () => {
    onToggle();
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={handleOverlayClick}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        role="navigation"
        aria-label="Main navigation"
        aria-expanded={isOpen}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" aria-hidden="true">
              🖥️
            </div>
            {isOpen && <span>Health Monitor</span>}
          </div>
          <button
            ref={firstFocusableRef}
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={
              isOpen ? 'Collapse navigation menu' : 'Expand navigation menu'
            }
            aria-expanded={isOpen}
            type="button"
          >
            {isOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!isOpen && <div className="nav-section-title">Menu</div>}
            <ul className="nav-list" role="list">
              {menuItems.map((item) => (
                <li key={item.path} className="nav-item" role="listitem">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : ''}`
                    }
                    aria-label={`${item.label} - ${item.description}`}
                    title={!isOpen ? item.label : undefined}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span
                        className="nav-badge"
                        aria-label={`${item.badge} unread alerts`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {!isOpen && (
                      <div className="nav-tooltip" role="tooltip">
                        {item.label}
                        {item.badge && ` (${item.badge})`}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Skip to main content link for screen readers */}
        <a
          href="#main-content"
          className="sr-only"
          onFocus={(e) => e.target.classList.remove('sr-only')}
          onBlur={(e) => e.target.classList.add('sr-only')}
        >
          Skip to main content
        </a>
      </aside>
    </>
  );
};

export default Sidebar;
