import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { ReactNode } from 'react';
import type { RootState } from '../../store';
import { useTokenRefresh } from '../../hooks/useTokenRefresh';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );

  // Set up automatic token refresh
  useTokenRefresh();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <div>Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
