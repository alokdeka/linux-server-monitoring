// Custom hook for managing connection status and WebSocket integration
// Provides connection status indicators and retry mechanisms

import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import {
  selectConnectionStatus,
  selectIsAuthenticated,
} from '../store/selectors';
import { setConnectionStatus } from '../store/slices/appSlice';
import { webSocketClient } from '../services/websocket';

interface UseConnectionStatusOptions {
  onConnectionChange?: (connected: boolean) => void;
  enableNotifications?: boolean;
}

export const useConnectionStatus = (
  options: UseConnectionStatusOptions = {}
) => {
  const { onConnectionChange, enableNotifications = false } = options;
  const dispatch = useDispatch<AppDispatch>();

  const connectionStatus = useSelector(selectConnectionStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Handle connection status changes
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      const newStatus = connected ? 'connected' : 'disconnected';
      dispatch(setConnectionStatus(newStatus));
      onConnectionChange?.(connected);

      // Show browser notification if enabled and permission granted
      if (
        enableNotifications &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        if (!connected) {
          new Notification('Connection Lost', {
            body: 'Lost connection to server. Attempting to reconnect...',
            icon: '/favicon.ico',
            tag: 'connection-status',
          });
        } else {
          new Notification('Connection Restored', {
            body: 'Successfully reconnected to server.',
            icon: '/favicon.ico',
            tag: 'connection-status',
          });
        }
      }
    },
    [dispatch, onConnectionChange, enableNotifications]
  );

  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Set up connection status listener
    webSocketClient.onConnectionChange(handleConnectionChange);

    // Connect if not already connected
    if (!webSocketClient.isConnected()) {
      webSocketClient.connect();
    }

    return () => {
      // Clean up connection listener
      webSocketClient.removeConnectionCallback(handleConnectionChange);
    };
  }, [isAuthenticated, handleConnectionChange]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated && webSocketClient.isConnected()) {
      webSocketClient.disconnect();
      dispatch(setConnectionStatus('disconnected'));
    }
  }, [isAuthenticated, dispatch]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (isAuthenticated) {
      dispatch(setConnectionStatus('reconnecting'));
      webSocketClient.disconnect();
      setTimeout(() => {
        webSocketClient.connect();
      }, 1000);
    }
  }, [isAuthenticated, dispatch]);

  // Get detailed connection state
  const getConnectionState = useCallback(() => {
    return webSocketClient.getConnectionState();
  }, []);

  // Check if WebSocket is connected
  const isConnected = useCallback(() => {
    return webSocketClient.isConnected();
  }, []);

  return {
    connectionStatus,
    reconnect,
    getConnectionState,
    isConnected,
  };
};
