import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import appReducer from '../store/slices/appSlice';
import authReducer from '../store/slices/authSlice';
import serversReducer from '../store/slices/serversSlice';
import metricsReducer from '../store/slices/metricsSlice';
import alertsReducer from '../store/slices/alertsSlice';
import type { RootState } from '../store';

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: PreloadedState<RootState>;
  store?: ReturnType<typeof setupStore>;
}

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  return configureStore({
    reducer: {
      app: appReducer,
      auth: authReducer,
      servers: serversReducer,
      metrics: metricsReducer,
      alerts: alertsReducer,
    },
    preloadedState,
  });
};

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    );
  }

  // Return an object with the store and all of RTL's query functions
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Mock data generators for consistent testing
export const createMockServer = (overrides = {}) => ({
  id: 'server-1',
  hostname: 'test-server',
  ipAddress: '192.168.1.100',
  status: 'online' as const,
  lastSeen: new Date().toISOString(),
  registeredAt: '2024-01-01T00:00:00Z',
  currentMetrics: {
    serverId: 'server-1',
    timestamp: new Date().toISOString(),
    cpuUsage: 45.5,
    memory: {
      total: 8000000000,
      used: 5000000000,
      percentage: 62.5,
    },
    diskUsage: [
      {
        device: '/dev/sda1',
        mountpoint: '/',
        total: 100000000000,
        used: 78000000000,
        percentage: 78,
      },
    ],
    loadAverage: {
      oneMin: 1.2,
      fiveMin: 1.1,
      fifteenMin: 1.0,
    },
    uptime: 86400,
    failedServices: [],
  },
  ...overrides,
});

export const createMockAlert = (overrides = {}) => ({
  id: 'alert-1',
  serverId: 'server-1',
  type: 'cpu' as const,
  severity: 'warning' as const,
  message: 'Test alert message',
  triggeredAt: new Date().toISOString(),
  acknowledged: false,
  ...overrides,
});

export const createMockAuthState = (isAuthenticated = true) => ({
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
});

// Re-export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
