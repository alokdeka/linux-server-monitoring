import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import type { RootState, AppDispatch } from './store';
import { toggleSidebar } from './store/slices/appSlice';
import { checkAuthState, logoutUser } from './store/slices/authSlice';

// Layout components
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import Footer from './components/layout/Footer';

// Auth components
import ProtectedRoute from './components/auth/ProtectedRoute';

// Page components
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Alerts from './pages/Alerts';
import ServerManagement from './pages/ServerManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';

import './App.css';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { sidebarOpen } = useSelector((state: RootState) => state.app);
  const { user } = useSelector((state: RootState) => state.auth);

  // Check authentication state on app load
  useEffect(() => {
    dispatch(checkAuthState());
  }, [dispatch]);

  const handleSidebarToggle = () => {
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
    <Router>
      <div className="app">
        <Routes>
          {/* Login route - no layout */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
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
                    />
                  </div>
                  <Footer
                    connectionStatus="connected"
                    lastUpdate={new Date()}
                  />
                </div>
              </ProtectedRoute>
            }
          >
            {/* Nested routes */}
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="servers" element={<Servers />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="management" element={<ServerManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
