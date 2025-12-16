import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ConnectionIndicator from '../common/ConnectionIndicator';
import './Header.css';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
  onMobileMenuToggle?: () => void;
}

const Header = ({ user, onLogout, onMobileMenuToggle }: HeaderProps) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  const handleMobileMenuToggle = () => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle();
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Removed unused function - connection status is now handled by ConnectionIndicator

  return (
    <header className="header" role="banner">
      <div className="header-content">
        <div className="header-left">
          {isMobile && (
            <button
              className="mobile-menu-button"
              onClick={handleMobileMenuToggle}
              aria-label="Toggle navigation menu"
              aria-expanded="false"
              type="button"
            >
              ☰
            </button>
          )}
          <h1 className="header-title">Server Health Monitor</h1>
        </div>
        <div className="header-right">
          <ConnectionIndicator
            showDetails={!isMobile}
            className="header-connection"
          />
          {user && (
            <div
              className="user-info"
              role="group"
              aria-label="User information"
            >
              <div className="user-avatar" aria-hidden="true" title={user.name}>
                {getUserInitials(user.name)}
              </div>
              <span className="user-name">{user.name}</span>
              <button
                className="logout-button"
                onClick={handleLogout}
                aria-label={`Logout ${user.name}`}
                type="button"
              >
                <span className="sr-only">Logout</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
