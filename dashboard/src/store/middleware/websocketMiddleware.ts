// Redux middleware for WebSocket integration
// Handles real-time updates and connection management

import type { Middleware, AnyAction } from '@reduxjs/toolkit';
import { webSocketClient } from '../../services/websocket';
import { updateCurrentMetrics } from '../slices/metricsSlice';
import { addNewAlert } from '../slices/alertsSlice';
import {
  updateServerStatus,
  updateServerMetrics,
} from '../slices/serversSlice';
import { setConnectionStatus } from '../slices/appSlice';

export const websocketMiddleware: Middleware = (store) => {
  let isInitialized = false;

  const initializeWebSocket = () => {
    if (isInitialized) return;
    isInitialized = true;

    // Set up WebSocket event handlers
    webSocketClient.onMetricsUpdate((metrics) => {
      store.dispatch(
        updateCurrentMetrics({ serverId: metrics.serverId, metrics })
      );
      store.dispatch(
        updateServerMetrics({ serverId: metrics.serverId, metrics })
      );
    });

    webSocketClient.onAlertUpdate((alert) => {
      store.dispatch(addNewAlert(alert));
    });

    webSocketClient.onServerStatusChange((status) => {
      store.dispatch(
        updateServerStatus({ serverId: status.serverId, status: status.status })
      );
    });

    webSocketClient.onConnectionChange((connected) => {
      store.dispatch(
        setConnectionStatus(connected ? 'connected' : 'disconnected')
      );
    });

    // Connect to WebSocket
    webSocketClient.connect();
  };

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    // Initialize WebSocket when user is authenticated
    if ((state as any).auth.isAuthenticated && !isInitialized) {
      initializeWebSocket();
    }

    // Disconnect WebSocket when user logs out
    if (
      (action as AnyAction).type === 'auth/logoutUser/fulfilled' &&
      isInitialized
    ) {
      webSocketClient.disconnect();
      isInitialized = false;
    }

    // Reconnect WebSocket when token is refreshed
    if (
      (action as AnyAction).type === 'auth/refreshToken/fulfilled' &&
      isInitialized
    ) {
      webSocketClient.disconnect();
      setTimeout(() => {
        webSocketClient.connect();
      }, 1000);
    }

    return result;
  };
};
