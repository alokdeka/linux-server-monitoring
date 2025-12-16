// Custom hook for optimistic UI updates with error handling
// Implements optimistic updates that rollback on failure

import { useCallback, useRef } from 'react';

interface OptimisticUpdate<T> {
  id: string;
  optimisticAction: () => void;
  rollbackAction: () => void;
  serverAction: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export const useOptimisticUpdates = () => {
  const pendingUpdatesRef = useRef<Map<string, () => void>>(new Map());

  const performOptimisticUpdate = useCallback(
    async <T>(update: OptimisticUpdate<T>): Promise<T | null> => {
      const {
        id,
        optimisticAction,
        rollbackAction,
        serverAction,
        onSuccess,
        onError,
      } = update;

      try {
        // Apply optimistic update immediately
        optimisticAction();

        // Store rollback action in case we need it
        pendingUpdatesRef.current.set(id, rollbackAction);

        // Perform server action
        const result = await serverAction();

        // Remove from pending updates on success
        pendingUpdatesRef.current.delete(id);

        // Call success callback if provided
        onSuccess?.(result);

        return result;
      } catch (error) {
        // Rollback optimistic update on failure
        const rollback = pendingUpdatesRef.current.get(id);
        if (rollback) {
          rollback();
          pendingUpdatesRef.current.delete(id);
        }

        const errorObj =
          error instanceof Error ? error : new Error('Unknown error');

        // Call error callback if provided
        onError?.(errorObj);

        console.error(`Optimistic update ${id} failed:`, errorObj);

        return null;
      }
    },
    []
  );

  // Rollback all pending updates (useful for connection loss)
  const rollbackAllUpdates = useCallback(() => {
    pendingUpdatesRef.current.forEach((rollback, id) => {
      try {
        rollback();
        console.log(`Rolled back optimistic update: ${id}`);
      } catch (error) {
        console.error(`Failed to rollback update ${id}:`, error);
      }
    });
    pendingUpdatesRef.current.clear();
  }, []);

  // Get count of pending updates
  const getPendingUpdateCount = useCallback(() => {
    return pendingUpdatesRef.current.size;
  }, []);

  // Check if a specific update is pending
  const isUpdatePending = useCallback((id: string) => {
    return pendingUpdatesRef.current.has(id);
  }, []);

  return {
    performOptimisticUpdate,
    rollbackAllUpdates,
    getPendingUpdateCount,
    isUpdatePending,
  };
};
