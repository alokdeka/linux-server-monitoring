import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import appReducer from './store/slices/appSlice';
import authReducer from './store/slices/authSlice';
import serversReducer from './store/slices/serversSlice';
import metricsReducer from './store/slices/metricsSlice';
import alertsReducer from './store/slices/alertsSlice';
import App from './App';

// Create a test store with initial authenticated state
const createTestStore = (isAuthenticated = false) => {
  return configureStore({
    reducer: {
      app: appReducer,
      auth: authReducer,
      servers: serversReducer,
      metrics: metricsReducer,
      alerts: alertsReducer,
    },
    preloadedState: {
      app: {
        initialized: true,
        sidebarOpen: true,
        theme: 'light' as const,
        refreshInterval: 30000,
        connectionStatus: 'connected' as const,
        lastActivity: null,
        notifications: {
          enabled: false,
          permission: 'default' as NotificationPermission,
        },
        settings: null,
        settingsLoading: false,
        settingsError: null,
      },
      auth: {
        user: isAuthenticated
          ? { id: '1', username: 'testuser', email: 'test@example.com' }
          : null,
        token: isAuthenticated ? 'test-token' : null,
        isAuthenticated,
        loading: false,
        error: null,
        tokenExpiry: isAuthenticated
          ? new Date(Date.now() + 3600000).toISOString()
          : null,
      },
      servers: {
        list: [],
        selectedServer: null,
        loading: false,
        error: null,
        lastUpdated: null,
      },
      metrics: {
        current: {},
        historical: {},
        loading: false,
        error: null,
      },
      alerts: {
        active: [],
        history: [],
        unreadCount: 0,
        loading: false,
        error: null,
        lastUpdated: null,
      },
    },
  });
};

describe('App', () => {
  it('shows login form when not authenticated', () => {
    const testStore = createTestStore(false);

    render(
      <Provider store={testStore}>
        <App />
      </Provider>
    );

    expect(screen.getByText('Server Monitor Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sign in to access your monitoring dashboard and manage your infrastructure'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows dashboard when authenticated', () => {
    const testStore = createTestStore(true);

    render(
      <Provider store={testStore}>
        <App />
      </Provider>
    );

    // Should redirect to dashboard and show the dashboard content
    // Note: This test might need adjustment based on the actual dashboard content
    expect(
      screen.queryByText('Server Monitor Dashboard')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sign In' })
    ).not.toBeInTheDocument();
  });
});
