import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import type { RootState, AppDispatch } from '../../store';
import {
  loginUser,
  clearError,
  fetchCurrentUser,
} from '../../store/slices/authSlice';
import type { LoginCredentials } from '../../types';
import './LoginForm.css';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Redirect if already authenticated
  if (isAuthenticated) {
    const state = location.state as LocationState;
    const from = state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!credentials.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!credentials.password) {
      errors.password = 'Password is required';
    } else if (credentials.password.length < 3) {
      errors.password = 'Password must be at least 3 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clear any previous errors
    dispatch(clearError());

    try {
      await dispatch(loginUser(credentials)).unwrap();
      // Fetch user info after successful login
      await dispatch(fetchCurrentUser()).unwrap();
    } catch (error) {
      // Error is handled by the Redux slice
      console.error('Login failed:', error);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Clear auth error when user starts typing
    if (error) {
      dispatch(clearError());
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-form-card">
        <div className="login-form-header">
          <h1>Server Monitor Dashboard</h1>
          <p>Sign in to access your monitoring dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={validationErrors.username ? 'error' : ''}
              disabled={loading}
              autoComplete="username"
              placeholder="Enter your username"
            />
            {validationErrors.username && (
              <span className="error-message">{validationErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={validationErrors.password ? 'error' : ''}
              disabled={loading}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            {validationErrors.password && (
              <span className="error-message">{validationErrors.password}</span>
            )}
          </div>

          {error && (
            <div className="auth-error">
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-form-footer">
          <p>Access your server monitoring dashboard with your credentials</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
