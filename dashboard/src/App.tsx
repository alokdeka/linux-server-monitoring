import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect, lazy, Suspense } from 'react';
import type { RootState, AppDispatch } from './store';
import { toggleSidebar } from './store/slices/appSlice';
import { checkAuthState, logoutUser } from './store/slices/authSlice';

// Custom hooks for real-time functionality
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { usePollingFallback } from './hooks/usePollingFallback';

// Layout components (keep these as regular imports since they're used on every page)
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import Footer from './components/layout/Footer';

// Auth components (keep login as regular import for faster initial load)
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';

// Lazy-loaded page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Servers = lazy(() => import('./pages/Servers'));
const Alerts = lazy(() => import('./pages/Alerts'));
const ServerManagement = lazy(() => import('./pages/ServerManagement'));
const Settings = lazy(() => import('./pages/Settings'));

// Lazy-loaded server components
const ServerDetails = lazy(() => import('./components/servers/ServerDetails'));

// Alert components (keep these as regular imports since they're used globally)
import { AlertToastContainer } from './components/alerts';

// Theme components
import { SimpleThemeToggle } from './components/common';

// Error handling and feedback components
import {
  ErrorBoundary,
  RouteErrorBoundary,
  ToastProvider,
  LoadingSpinner,
} from './components/common';

import './App.css';
import { ThemeProvider } from './styles/ThemeProvider';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { sidebarOpen, connectionStatus } = useSelector(
    (state: RootState) => state.app
  );
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize real-time functionality
  const { manualRefresh } = useAutoRefresh({
    enabled: isAuthenticated,
    onError: (error) => {
      console.error('Auto-refresh error:', error);
    },
  });

  const { reconnect } = useConnectionStatus({
    enableNotifications: true,
    onConnectionChange: (connected) => {
      if (connected) {
        console.log('WebSocket connection established');
        // Perform immediate refresh when connection is restored
        manualRefresh();
      } else {
        console.log('WebSocket connection lost');
      }
    },
  });

  // Set up polling fallback for when WebSocket is disconnected
  usePollingFallback({
    enabled: isAuthenticated,
    pollingInterval: 60000, // 60 seconds - slower than normal refresh
    onError: (error) => {
      console.error('Polling fallback error:', error);
    },
  });

  // Check authentication state on app load
  useEffect(() => {
    dispatch(checkAuthState());
  }, [dispatch]);

  // Handle mobile menu toggle
  const handleSidebarToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleMobileMenuToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, the auth state will be cleared
    }
  };

  return (
    <ThemeProvider defaultTheme="dark">
      <ErrorBoundary>
        <ToastProvider maxToasts={3} position="top-right">
          <Router>
            <div className="app">
              {/* Skip to content link for accessibility */}
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <Routes>
                {/* Login route - no layout */}
                <Route path="/login" element={<Login />} />

                {/* Protected routes with layout */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <RouteErrorBoundary>
                        <div className="app-layout">
                          <div className="app-body">
                            <Sidebar
                              isOpen={sidebarOpen}
                              onToggle={handleSidebarToggle}
                            />
                            <MainContent
                              sidebarOpen={sidebarOpen}
                              user={
                                user
                                  ? { name: user.username, email: user.email }
                                  : undefined
                              }
                              onLogout={handleLogout}
                              onMobileMenuToggle={handleMobileMenuToggle}
                            />
                          </div>
                          <Footer
                            connectionStatus={connectionStatus}
                            lastUpdate={new Date()}
                            onReconnect={reconnect}
                          />
                          {/* Alert toast notifications */}
                          <AlertToastContainer
                            maxToasts={5}
                            position="top-right"
                            autoClose={true}
                            autoCloseDelay={5000}
                          />
                        </div>
                      </RouteErrorBoundary>
                    </ProtectedRoute>
                  }
                >
                  {/* Nested routes */}
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route
                    path="dashboard"
                    element={
                      <RouteErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Dashboard />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="servers"
                    element={
                      <RouteErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Servers />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="servers/:serverId"
                    element={
                      <RouteErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ServerDetails />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="alerts"
                    element={
                      <RouteErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Alerts />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="management"
                    element={
                      <RouteErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          <ServerManagement />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <RouteErrorBoundary>
                        <Suspense fallback={<LoadingSpinner />}>
                          <Settings />
                        </Suspense>
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="theme-demo"
                    element={
                      <RouteErrorBoundary>
                        <div
                          style={{
                            padding: '2rem',
                            maxWidth: '800px',
                            margin: '0 auto',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '2rem',
                            }}
                          >
                            <h1 style={{ margin: 0 }}>Theme System Demo</h1>
                            <SimpleThemeToggle showLabel />
                          </div>

                          <div style={{ marginBottom: '2rem' }}>
                            <h2>Features Implemented</h2>
                            <ul>
                              <li>✅ CSS-in-JS solution (styled-components)</li>
                              <li>✅ Light and dark theme configurations</li>
                              <li>
                                ✅ Consistent color palette and typography
                                system
                              </li>
                              <li>
                                ✅ Responsive design utilities and breakpoints
                              </li>
                              <li>
                                ✅ Animations and transitions for better UX
                              </li>
                            </ul>
                          </div>

                          <div style={{ marginBottom: '2rem' }}>
                            <h2>Theme Toggle</h2>
                            <p>
                              Use the toggle above to switch between light and
                              dark themes. The theme preference is saved to
                              localStorage.
                            </p>
                          </div>

                          <div style={{ marginBottom: '2rem' }}>
                            <h2>Color Palette</h2>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'repeat(auto-fit, minmax(120px, 1fr))',
                                gap: '1rem',
                                marginBottom: '1rem',
                              }}
                            >
                              <div
                                style={{
                                  backgroundColor: 'var(--color-primary)',
                                  color: 'white',
                                  padding: '1rem',
                                  borderRadius: '0.5rem',
                                  textAlign: 'center',
                                  fontWeight: '500',
                                }}
                              >
                                Primary
                              </div>
                              <div
                                style={{
                                  backgroundColor: 'var(--color-success)',
                                  color: 'white',
                                  padding: '1rem',
                                  borderRadius: '0.5rem',
                                  textAlign: 'center',
                                  fontWeight: '500',
                                }}
                              >
                                Success
                              </div>
                              <div
                                style={{
                                  backgroundColor: 'var(--color-warning)',
                                  color: 'white',
                                  padding: '1rem',
                                  borderRadius: '0.5rem',
                                  textAlign: 'center',
                                  fontWeight: '500',
                                }}
                              >
                                Warning
                              </div>
                              <div
                                style={{
                                  backgroundColor: 'var(--color-error)',
                                  color: 'white',
                                  padding: '1rem',
                                  borderRadius: '0.5rem',
                                  textAlign: 'center',
                                  fontWeight: '500',
                                }}
                              >
                                Error
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: '0.5rem',
                              padding: '1.5rem',
                              marginBottom: '2rem',
                            }}
                          >
                            <h3 style={{ marginTop: 0 }}>Quick Start</h3>
                            <p>
                              The theme system is already integrated into the
                              application. You can:
                            </p>
                            <ul>
                              <li>
                                Use CSS custom properties like{' '}
                                <code>var(--bg-primary)</code>
                              </li>
                              <li>
                                Import and use styled-components from{' '}
                                <code>src/styles/styled.ts</code>
                              </li>
                              <li>
                                Access theme values through the{' '}
                                <code>useTheme</code> hook
                              </li>
                              <li>
                                Use the <code>SimpleThemeToggle</code> component
                                for theme switching
                              </li>
                            </ul>
                          </div>
                        </div>
                      </RouteErrorBoundary>
                    }
                  />
                </Route>
              </Routes>
            </div>
          </Router>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
