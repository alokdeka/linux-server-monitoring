import { useState, useCallback } from 'react';
import { useToast } from '../components/common';

interface UseApiWithRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToastOnError?: boolean;
  showToastOnSuccess?: boolean;
  successMessage?: string;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retryCount: number;
}

interface ApiActions<T> {
  execute: (...args: any[]) => Promise<T>;
  retry: () => Promise<T>;
  reset: () => void;
}

export const useApiWithRetry = <T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiWithRetryOptions = {}
): [ApiState<T>, ApiActions<T>] => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToastOnError = true,
    showToastOnSuccess = false,
    successMessage = 'Operation completed successfully',
  } = options;

  const { showToast } = useToast();

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const [lastArgs, setLastArgs] = useState<any[]>([]);

  const executeWithRetry = useCallback(
    async (args: any[], currentRetry = 0): Promise<T> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        retryCount: currentRetry,
      }));

      try {
        // Add delay for retries
        if (currentRetry > 0 && retryDelay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * currentRetry)
          );
        }

        const result = await apiFunction(...args);

        setState((prev) => ({
          ...prev,
          data: result,
          loading: false,
          error: null,
          retryCount: 0,
        }));

        if (showToastOnSuccess) {
          showToast('success', 'Success', successMessage);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';

        if (currentRetry < maxRetries) {
          // Retry the operation
          return executeWithRetry(args, currentRetry + 1);
        } else {
          // Max retries reached
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorMessage,
            retryCount: currentRetry,
          }));

          if (showToastOnError) {
            showToast(
              'error',
              'Operation Failed',
              `${errorMessage}${maxRetries > 0 ? ` (after ${maxRetries} retries)` : ''}`,
              {
                duration: 7000,
                action: {
                  label: 'Retry',
                  onClick: () => executeWithRetry(args, 0),
                },
              }
            );
          }

          throw error;
        }
      }
    },
    [
      apiFunction,
      maxRetries,
      retryDelay,
      showToastOnError,
      showToastOnSuccess,
      successMessage,
      showToast,
    ]
  );

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setLastArgs(args);
      return executeWithRetry(args, 0);
    },
    [executeWithRetry]
  );

  const retry = useCallback(async (): Promise<T> => {
    if (lastArgs.length === 0) {
      throw new Error('No previous operation to retry');
    }
    return executeWithRetry(lastArgs, 0);
  }, [executeWithRetry, lastArgs]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
    });
    setLastArgs([]);
  }, []);

  return [
    state,
    {
      execute,
      retry,
      reset,
    },
  ];
};
