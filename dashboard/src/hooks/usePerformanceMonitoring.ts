import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor } from '../utils/performance';

interface PerformanceHookOptions {
  componentName: string;
  trackRenders?: boolean;
  trackEffects?: boolean;
  trackUserInteractions?: boolean;
}

/**
 * Hook for monitoring React component performance
 */
export function usePerformanceMonitoring(options: PerformanceHookOptions) {
  const {
    componentName,
    trackRenders = true,
    trackEffects = true,
    trackUserInteractions = true,
  } = options;

  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const effectCount = useRef<number>(0);

  // Track component mount
  useEffect(() => {
    mountTime.current = performance.now();
    performanceMonitor.mark(`${componentName}-mount`);

    return () => {
      // Track component unmount
      performanceMonitor.mark(`${componentName}-unmount`);
      performanceMonitor.measure(
        `${componentName}-lifetime`,
        `${componentName}-mount`,
        `${componentName}-unmount`
      );
    };
  }, [componentName]);

  // Track renders
  useEffect(() => {
    if (trackRenders) {
      renderCount.current += 1;
      const renderEndTime = performance.now();

      if (renderStartTime.current > 0) {
        const renderDuration = renderEndTime - renderStartTime.current;
        performanceMonitor.recordMetric({
          name: `${componentName}-render`,
          duration: renderDuration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            renderCount: renderCount.current,
            component: componentName,
          },
        });
      }
    }
  });

  // Track effects
  useEffect(() => {
    if (trackEffects) {
      effectCount.current += 1;
      performanceMonitor.mark(`${componentName}-effect-${effectCount.current}`);
    }
  });

  // Start render timing
  if (trackRenders) {
    renderStartTime.current = performance.now();
  }

  // Utility functions for manual tracking
  const trackOperation = useCallback(
    (operationName: string) => {
      return performanceMonitor.startTiming(
        `${componentName}-${operationName}`
      );
    },
    [componentName]
  );

  const trackUserInteraction = useCallback(
    (interactionType: string, details?: Record<string, any>) => {
      if (trackUserInteractions) {
        performanceMonitor.mark(`${componentName}-${interactionType}`, details);
      }
    },
    [componentName, trackUserInteractions]
  );

  const trackAsyncOperation = useCallback(
    async <T>(
      operationName: string,
      operation: () => Promise<T>
    ): Promise<T> => {
      const endTiming = trackOperation(operationName);
      try {
        const result = await operation();
        endTiming();
        return result;
      } catch (error) {
        endTiming();
        throw error;
      }
    },
    [trackOperation]
  );

  return {
    trackOperation,
    trackUserInteraction,
    trackAsyncOperation,
    renderCount: renderCount.current,
    effectCount: effectCount.current,
  };
}

/**
 * Hook for tracking API call performance
 */
export function useApiPerformanceTracking() {
  const trackApiCall = useCallback(
    async <T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> => {
      const startTime = performance.now();
      performanceMonitor.mark(`api-${endpoint}-start`);

      try {
        const result = await apiCall();
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceMonitor.recordMetric({
          name: `api-${endpoint}`,
          duration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            endpoint,
            success: true,
          },
        });

        performanceMonitor.mark(`api-${endpoint}-success`);
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceMonitor.recordMetric({
          name: `api-${endpoint}-error`,
          duration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            endpoint,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        performanceMonitor.mark(`api-${endpoint}-error`);
        throw error;
      }
    },
    []
  );

  return { trackApiCall };
}

/**
 * Hook for tracking route changes and navigation performance
 */
export function useNavigationPerformanceTracking() {
  const trackNavigation = useCallback((from: string, to: string) => {
    const startTime = performance.now();
    performanceMonitor.mark(`navigation-${to}-start`);

    // Return a function to call when navigation is complete
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      performanceMonitor.recordMetric({
        name: `navigation-${to}`,
        duration,
        timestamp: Date.now(),
        type: 'custom',
        details: {
          from,
          to,
        },
      });

      performanceMonitor.mark(`navigation-${to}-complete`);
    };
  }, []);

  return { trackNavigation };
}

/**
 * Hook for tracking form performance
 */
export function useFormPerformanceTracking(formName: string) {
  const trackFormSubmission = useCallback(
    async <T>(submitHandler: () => Promise<T>): Promise<T> => {
      const startTime = performance.now();
      performanceMonitor.mark(`form-${formName}-submit-start`);

      try {
        const result = await submitHandler();
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceMonitor.recordMetric({
          name: `form-${formName}-submit`,
          duration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            formName,
            success: true,
          },
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceMonitor.recordMetric({
          name: `form-${formName}-submit-error`,
          duration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            formName,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    },
    [formName]
  );

  const trackFieldInteraction = useCallback(
    (fieldName: string, interactionType: 'focus' | 'blur' | 'change') => {
      performanceMonitor.mark(
        `form-${formName}-${fieldName}-${interactionType}`
      );
    },
    [formName]
  );

  return {
    trackFormSubmission,
    trackFieldInteraction,
  };
}

/**
 * Hook for tracking data loading performance
 */
export function useDataLoadingPerformanceTracking() {
  const trackDataLoading = useCallback(
    async <T>(
      dataType: string,
      loadingFunction: () => Promise<T>
    ): Promise<T> => {
      const startTime = performance.now();
      performanceMonitor.mark(`data-${dataType}-load-start`);

      try {
        const result = await loadingFunction();
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceMonitor.recordMetric({
          name: `data-${dataType}-load`,
          duration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            dataType,
            success: true,
          },
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        performanceMonitor.recordMetric({
          name: `data-${dataType}-load-error`,
          duration,
          timestamp: Date.now(),
          type: 'custom',
          details: {
            dataType,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    },
    []
  );

  return { trackDataLoading };
}
