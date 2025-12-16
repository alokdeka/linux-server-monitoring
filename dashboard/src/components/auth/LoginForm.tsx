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
import { useFormValidation } from '../../hooks/useFormValidation';
import { FormField, useToast, SimpleThemeToggle } from '../common';
import './LoginForm.css';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const { showToast } = useToast();
  const { loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const [formState, formActions] = useFormValidation<LoginCredentials>(
    { username: '', password: '' },
    {
      fields: {
        username: {
          rules: {
            required: true,
            minLength: 2,
          },
          validateOnChange: true,
          validateOnBlur: true,
          debounceMs: 300,
        },
        password: {
          rules: {
            required: true,
            minLength: 3,
          },
          validateOnChange: true,
          validateOnBlur: true,
          debounceMs: 300,
        },
      },
    }
  );

  // Redirect if already authenticated
  if (isAuthenticated) {
    const state = location.state as LocationState;
    const from = state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formActions.validateForm()) {
      showToast(
        'error',
        'Validation Error',
        'Please fix the form errors before submitting.'
      );
      return;
    }

    // Clear any previous errors
    dispatch(clearError());
    formActions.setSubmitting(true);

    try {
      await dispatch(loginUser(formState.values)).unwrap();
      // Fetch user info after successful login
      await dispatch(fetchCurrentUser()).unwrap();
      showToast(
        'success',
        'Welcome!',
        'Successfully logged in to the dashboard.'
      );
    } catch (error) {
      // Error is handled by the Redux slice
      console.error('Login failed:', error);
      showToast(
        'error',
        'Login Failed',
        error instanceof Error ? error.message : 'Authentication failed'
      );
    } finally {
      formActions.setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    formActions.setValue(field, value);

    // Clear auth error when user starts typing
    if (error) {
      dispatch(clearError());
    }
  };

  return (
    <div className="login-form-container">
      {/* Theme toggle in top-right corner */}
      <div className="login-theme-toggle">
        <SimpleThemeToggle />
      </div>

      <div className="login-form-card">
        <div className="login-form-header">
          <h1>Server Monitor Dashboard</h1>
          <p>
            Sign in to access your monitoring dashboard and manage your
            infrastructure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <FormField
            label="Username"
            type="text"
            value={formState.values.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            onBlur={() => formActions.setTouched('username', true)}
            error={formState.errors.username}
            touched={formState.touched.username}
            required
            disabled={loading || formState.isSubmitting}
            autoComplete="username"
            placeholder="Enter your username"
            loading={loading}
          />

          <FormField
            label="Password"
            type="password"
            value={formState.values.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={() => formActions.setTouched('password', true)}
            error={formState.errors.password}
            touched={formState.touched.password}
            required
            disabled={loading || formState.isSubmitting}
            autoComplete="current-password"
            placeholder="Enter your password"
            loading={loading}
          />

          {error && (
            <div className="auth-error">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading || formState.isSubmitting || !formState.isValid}
          >
            {loading || formState.isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-form-footer">
          <p>🔒 Secure access to your server monitoring dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
