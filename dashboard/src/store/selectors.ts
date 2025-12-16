// Memoized selectors to avoid unnecessary re-renders
// Optimizes performance for real-time updates

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';

// App selectors
export const selectApp = (state: RootState) => state.app || {};
export const selectConnectionStatus = createSelector(
  [selectApp],
  (app) => app.connectionStatus || 'disconnected'
);
export const selectRefreshInterval = createSelector(
  [selectApp],
  (app) => app.refreshInterval || 30000
);

// Auth selectors
export const selectAuth = (state: RootState) => state.auth || {};
export const selectIsAuthenticated = createSelector(
  [selectAuth],
  (auth) => auth.isAuthenticated || false
);

// Servers selectors
export const selectServers = (state: RootState) => state.servers || {};
export const selectServersList = createSelector(
  [selectServers],
  (servers) => servers.list || []
);

// Metrics selectors
export const selectMetrics = (state: RootState) => state.metrics || {};
export const selectCurrentMetrics = createSelector(
  [selectMetrics],
  (metrics) => metrics.current || {}
);

// Alerts selectors
export const selectAlerts = (state: RootState) => state.alerts || {};
export const selectActiveAlerts = createSelector(
  [selectAlerts],
  (alerts) => alerts.active || []
);
export const selectUnreadCount = createSelector(
  [selectAlerts],
  (alerts) => alerts.unreadCount || 0
);
