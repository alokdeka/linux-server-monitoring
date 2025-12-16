import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from './store';
import { toggleSidebar } from './store/slices/appSlice';

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
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state: RootState) => state.app);

  // Mock authentication state - will be replaced with real auth in task 3
  const isAuthenticated = true;
  const user = isAuthenticated
    ? { name: 'Admin User', email: 'admin@example.com' }
    : undefined;

  const handleSidebarToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleLogout = () => {
    // Logout logic will be implemented in task 3
    console.log('Logout clicked');
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
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <div className="app-layout">
                  <div className="app-body">
                    <Sidebar
                      isOpen={sidebarOpen}
                      onToggle={handleSidebarToggle}
                    />
                    <MainContent
                      sidebarOpen={sidebarOpen}
                      user={user}
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
