// Custom hook for polling fallback when WebSocket is disconnected
// Implements fallback to polling mechanism as per requirements

import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import {
  selectConnectionStatus,
  selectServersList,
  selectIsAuthenticated,
} from '../store/selectors';
import { fetchCurrentMetrics } from '../store/slices/metricsSlice';
import { refreshServerStatus } from '../store/slices/serversSlice';
import { refreshAlerts } from '../store/slices/alertsSlice';

interface UsePollingFallbackOptions {
  enabled?: boolean;
  pollingInterval?: number; // Default to 60 seconds for fallback
  onError?: (error: string) => void;
}

export const usePollingFallback = (options: UsePollingFallbackOptions = {}) => {
  const {
    enabled = true,
    pollingInterval = 60000, // 60 seconds - slower than WebSocket updates
    onError,
  } = options;

  const dispatch = useDispatch<AppDispatch>();

  const connectionStatus = useSelector(selectConnectionStatus);
  const servers = useSelector(selectServersList);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  const performPollingUpdate = useCallback(async () => {
    if (!enabled || !isAuthenticated || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    try {
      // Get server IDs for metrics refresh
      const serverIds = servers.map((server) => server.id);

      // Perform polling updates - similar to auto-refresh but for fallback
      const pollingPromises = [
        dispatch(refreshServerStatus()).unwrap(),
        serverIds.length > 0
          ? dispatch(fetchCurrentMetrics(serverIds)).unwrap()
          : Promise.resolve(),
        dispatch(refreshAlerts()).unwrap(),
      ];

      await Promise.allSettled(pollingPromises);

      console.log('Polling fallback update completed');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Polling fallback failed';
      console.error('Polling fallback error:', errorMessage);
      onError?.(errorMessage);
    } finally {
      isPollingRef.current = false;
    }
  }, [enabled, isAuthenticated, servers, dispatch, onError]);

  // Set up polling when WebSocket is disconnected
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    // Only start polling when WebSocket is disconnected
    if (connectionStatus === 'disconnected') {
      console.log('WebSocket disconnected, starting polling fallback');

      // Start immediate polling
      performPollingUpdate();

      // Set up polling interval
      pollingIntervalRef.current = setInterval(
        performPollingUpdate,
        pollingInterval
      );
    } else {
      // Stop polling when WebSocket is connected
      if (pollingIntervalRef.current) {
        console.log('WebSocket connected, stopping polling fallback');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [
    enabled,
    isAuthenticated,
    connectionStatus,
    pollingInterval,
    performPollingUpdate,
  ]);

  // Manual polling trigger
  const triggerPolling = useCallback(() => {
    return performPollingUpdate();
  }, [performPollingUpdate]);

  // Check if currently polling
  const isPolling =
    connectionStatus === 'disconnected' && pollingIntervalRef.current !== null;

  return {
    triggerPolling,
    isPolling,
    pollingInterval,
  };
};
