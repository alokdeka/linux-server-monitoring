// Custom hook for automatic refresh functionality
// Implements automatic metrics refresh every 30 seconds as per requirements

import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import {
  selectRefreshInterval,
  selectConnectionStatus,
  selectServersList,
  selectIsAuthenticated,
} from '../store/selectors';
import { fetchCurrentMetrics } from '../store/slices/metricsSlice';
import { refreshServerStatus } from '../store/slices/serversSlice';
import { refreshAlerts } from '../store/slices/alertsSlice';
import { updateLastActivity } from '../store/slices/appSlice';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  onError?: (error: string) => void;
}

export const useAutoRefresh = (options: UseAutoRefreshOptions = {}) => {
  const { enabled = true, onError } = options;
  const dispatch = useDispatch<AppDispatch>();

  const refreshInterval = useSelector(selectRefreshInterval);
  const connectionStatus = useSelector(selectConnectionStatus);
  const servers = useSelector(selectServersList);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const intervalRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  const performRefresh = useCallback(async () => {
    if (!enabled || !isAuthenticated || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      // Update last activity
      dispatch(updateLastActivity());

      // Get current servers from selector (don't use servers from dependency)
      const currentServers = servers;
      const serverIds = currentServers.map((server) => server.id);

      // Perform all refresh operations in parallel
      const refreshPromises = [
        dispatch(refreshServerStatus()).unwrap(),
        serverIds.length > 0
          ? dispatch(fetchCurrentMetrics(serverIds)).unwrap()
          : Promise.resolve(),
        dispatch(refreshAlerts()).unwrap(),
      ];

      await Promise.allSettled(refreshPromises);

      console.log('Auto-refresh completed successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Auto-refresh failed';
      console.error('Auto-refresh error:', errorMessage);
      onError?.(errorMessage);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [enabled, isAuthenticated, dispatch, onError]);

  // Set up automatic refresh interval
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    // Perform initial refresh
    performRefresh();

    // Set up interval for subsequent refreshes
    intervalRef.current = setInterval(performRefresh, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, refreshInterval, performRefresh]);

  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === 'connected' && enabled && isAuthenticated) {
      // Perform immediate refresh when connection is restored
      performRefresh();
    }
  }, [connectionStatus, enabled, isAuthenticated, performRefresh]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    return performRefresh();
  }, [performRefresh]);

  // Check if currently refreshing
  const isRefreshing = isRefreshingRef.current;

  return {
    manualRefresh,
    isRefreshing,
    refreshInterval,
  };
};
