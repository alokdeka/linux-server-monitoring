import { useNavigate } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
}

const Header = ({ user, onLogout }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">Server Health Monitor</h1>
        </div>
        <div className="header-right">
          {user && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <button
                className="logout-button"
                onClick={handleLogout}
                aria-label="Logout"
              >
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
