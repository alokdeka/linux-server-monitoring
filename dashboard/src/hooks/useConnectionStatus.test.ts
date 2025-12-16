import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import appReducer from '../store/slices/appSlice';
import authReducer from '../store/slices/authSlice';
import serversReducer from '../store/slices/serversSlice';
import metricsReducer from '../store/slices/metricsSlice';
import alertsReducer from '../store/slices/alertsSlice';
import { useConnectionStatus } from './useConnectionStatus';

// Mock WebSocket client
vi.mock('../services/websocket', () => ({
  webSocketClient: {
    onConnectionChange: vi.fn(),
    isConnected: vi.fn(() => true),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeConnectionCallback: vi.fn(),
    getConnectionState: vi.fn(() => ({ connected: true, reconnecting: false })),
  },
}));

const createTestStore = (isAuthenticated = true) => {
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
        user: isAuthenticated ? { id: '1', username: 'test', email: 'test@example.com' } : null,
        token: isAuthenticated ? 'test-token' : null,
        isAuthenticated,
        loading: false,
        error: null,
        tokenExpiry: isAuthenticated ? new Date(Date.now() + 3600000).toISOString() : null,
      },
      servers: { list: [], selectedServer: null, loading: false, error: null, lastUpdated: null },
      metrics: { current: {}, historical: {}, loading: false, error: null },
      alerts: { active: [], history: [], unreadCount: 0, loading: false, error: null, lastUpdated: null },
    },
  });
};

describe('useConnectionStatus', () => {
  it('returns connection status from store', () => {
    const testStore = createTestStore();
    
    const { result } = renderHook(() => useConnectionStatus(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(result.current.connectionStatus).toBe('connected');
  });

  it('provides reconnect function', () => {
    const testStore = createTestStore();
    
    const { result } = renderHook(() => useConnectionStatus(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(typeof result.current.reconnect).toBe('function');
  });

  it('provides connection state function', () => {
    const testStore = createTestStore();
    
    const { result } = renderHook(() => useConnectionStatus(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(typeof result.current.getConnectionState).toBe('function');
    expect(typeof result.current.isConnected).toBe('function');
  });

  it('handles unauthenticated state', () => {
    const testStore = createTestStore(false);
    
    const { result } = renderHook(() => useConnectionStatus(), {
      wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    });

    expect(result.current.connectionStatus).toBe('connected');
  });
});