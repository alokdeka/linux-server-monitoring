import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import appReducer from '../store/slices/appSlice';
import authReducer from '../store/slices/authSlice';
import serversReducer from '../store/slices/serversSlice';
import metricsReducer from '../store/slices/metricsSlice';
import alertsReducer from '../store/slices/alertsSlice';
import { useAutoRefresh } from './useAutoRefresh';

const createTestStore = () => {
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
        theme: 'light',
        refreshInterval: 30000,
        connectionStatus: 'connected',
        lastActivity: null,
        notifications: { enabled: false, permission: 'default' as NotificationPermission },
        settings: null,
        settingsLoading: false,
        settingsError: null,
      },
      auth: {
        user: { id: '1', username: 'test', email: 'test@example.com' },
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        tokenExpiry: new Date(Date.now() + 3600000).toISOString(),
      },
      servers: { list: [], selectedServer: null, loading: false, error: null, lastUpdated: null },
      metrics: { current: {}, historical: {}, loading: false, error: null },
      alerts: { active: [], history: [], unreadCount: 0, loading: false, error: null, lastUpdated: null },
    },
  });
};

describe('useAutoRefresh', () => {
  it('initializes with correct refresh interval', () => {
    const testStore = createTestStore();
    
    const { result } = renderHook(() => useAutoRefresh(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(result.current.refreshInterval).toBe(30000);
  });

  it('provides manual refresh function', () => {
    const testStore = createTestStore();
    
    const { result } = renderHook(() => useAutoRefresh(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(typeof result.current.manualRefresh).toBe('function');
  });

  it('handles disabled state', () => {
    const testStore = createTestStore();
    
    const { result } = renderHook(() => useAutoRefresh({ enabled: false }), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(result.current.refreshInterval).toBe(30000);
    expect(typeof result.current.manualRefresh).toBe('function');
  });

  it('cleans up on unmount', () => {
    const testStore = createTestStore();
    
    const { unmount } = renderHook(() => useAutoRefresh(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});