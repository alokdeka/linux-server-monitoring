import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './Header';
import './MainContent.css';

interface MainContentProps {
  sidebarOpen: boolean;
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
  onMobileMenuToggle?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const MainContent = ({
  sidebarOpen,
  user,
  onLogout,
  onMobileMenuToggle,
  isLoading = false,
  error = null,
}: MainContentProps) => {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [pageSubtitle, setPageSubtitle] = useState('');

  // Update page title based on current route
  useEffect(() => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        setPageTitle('Dashboard');
        setPageSubtitle('System overview and metrics');
        break;
      case '/servers':
        setPageTitle('Servers');
        setPageSubtitle('Monitor server status and performance');
        break;
      case '/alerts':
        setPageTitle('Alerts');
        setPageSubtitle('View and manage system alerts');
        break;
      case '/management':
        setPageTitle('Server Management');
        setPageSubtitle('Register and manage servers');
        break;
      case '/settings':
        setPageTitle('Settings');
        setPageSubtitle('Configure dashboard preferences');
        break;
      default:
        if (path.startsWith('/servers/')) {
          setPageTitle('Server Details');
          setPageSubtitle('Detailed server metrics and information');
        } else {
          setPageTitle('Dashboard');
          setPageSubtitle('System overview and metrics');
        }
    }
  }, [location.pathname]);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);

    const breadcrumbs = [{ label: 'Home', path: '/dashboard', current: false }];

    if (segments.length > 1) {
      segments.forEach((segment, index) => {
        const isLast = index === segments.length - 1;
        const path = '/' + segments.slice(0, index + 1).join('/');

        let label = segment.charAt(0).toUpperCase() + segment.slice(1);
        if (segment === 'management') label = 'Server Management';

        breadcrumbs.push({
          label,
          path,
          current: isLast,
        });
      });
    } else if (segments[0] && segments[0] !== 'dashboard') {
      breadcrumbs.push({
        label: pageTitle,
        path: location.pathname,
        current: true,
      });
    }

    return breadcrumbs;
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (error) {
    return (
      <main
        className={`main-content ${sidebarOpen ? 'main-content-expanded' : 'main-content-collapsed'}`}
        role="main"
        aria-label="Main content"
      >
        <Header
          user={user}
          onLogout={onLogout}
          onMobileMenuToggle={onMobileMenuToggle}
        />
        <div className="content-wrapper">
          <div className="main-content-error">
            <div className="error-icon" aria-hidden="true">
              ⚠️
            </div>
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button
                className="retry-button"
                onClick={handleRetry}
                type="button"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className={`main-content ${sidebarOpen ? 'main-content-expanded' : 'main-content-collapsed'}`}
      role="main"
      aria-label="Main content"
    >
      <Header
        user={user}
        onLogout={onLogout}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      <div className="main-header">
        <div className="main-header-left">
          <div>
            <h1 className="main-header-title">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="main-header-subtitle">{pageSubtitle}</p>
            )}
          </div>
        </div>
        <div className="main-header-right">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {getBreadcrumbs().map((crumb, index) => (
              <div key={crumb.path} className="breadcrumb-item">
                {index > 0 && (
                  <span className="breadcrumb-separator" aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.current ? (
                  <span className="breadcrumb-current" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <a
                    href={crumb.path}
                    className="breadcrumb-link"
                    aria-label={`Navigate to ${crumb.label}`}
                  >
                    {crumb.label}
                  </a>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="content-wrapper">
        {isLoading ? (
          <div className="main-content-loading">
            <div className="loading-spinner" aria-hidden="true"></div>
            <p className="loading-text">Loading...</p>
          </div>
        ) : (
          <div className="content-container">
            <Outlet />
          </div>
        )}
      </div>
    </main>
  );
};

export default MainContent;
