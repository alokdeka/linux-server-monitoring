// Performance monitoring utilities

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
  details?: Record<string, any>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  timestamp: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  component?: string;
  props?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private errors: ErrorReport[] = [];
  private sessionId: string;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled =
      import.meta.env.PROD || import.meta.env.VITE_ENABLE_MONITORING === 'true';

    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring() {
    // Monitor navigation timing
    this.observeNavigationTiming();

    // Monitor resource loading
    this.observeResourceTiming();

    // Monitor long tasks
    this.observeLongTasks();

    // Monitor layout shifts
    this.observeLayoutShifts();

    // Monitor largest contentful paint
    this.observeLCP();

    // Monitor first input delay
    this.observeFID();

    // Monitor cumulative layout shift
    this.observeCLS();

    // Set up error tracking
    this.setupErrorTracking();

    // Set up unhandled promise rejection tracking
    this.setupUnhandledRejectionTracking();
  }

  private observeNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.recordMetric({
              name: 'navigation',
              duration: navigation.loadEventEnd - navigation.fetchStart,
              timestamp: Date.now(),
              type: 'navigation',
              details: {
                domContentLoaded:
                  navigation.domContentLoadedEventEnd - navigation.fetchStart,
                firstByte: navigation.responseStart - navigation.fetchStart,
                domComplete: navigation.domComplete - navigation.fetchStart,
              },
            });
          }
        }, 0);
      });
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 100) {
              // Only track resources that take more than 100ms
              this.recordMetric({
                name: `resource-${entry.name.split('/').pop() || 'unknown'}`,
                duration: entry.duration,
                timestamp: Date.now(),
                type: 'resource',
                details: {
                  url: entry.name,
                  size: (entry as any).transferSize || 0,
                  type: (entry as any).initiatorType,
                },
              });
            }
          });
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource timing observation not supported');
      }
    }
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric({
              name: 'long-task',
              duration: entry.duration,
              timestamp: Date.now(),
              type: 'measure',
              details: {
                startTime: entry.startTime,
              },
            });
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task observation not supported');
      }
    }
  }

  private observeLayoutShifts() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.hadRecentInput) return; // Ignore shifts caused by user input

            this.recordMetric({
              name: 'layout-shift',
              duration: entry.value,
              timestamp: Date.now(),
              type: 'measure',
              details: {
                sources:
                  entry.sources?.map((source: any) => ({
                    node: source.node?.tagName,
                    previousRect: source.previousRect,
                    currentRect: source.currentRect,
                  })) || [],
              },
            });
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Layout shift observation not supported');
      }
    }
  }

  private observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];

          this.recordMetric({
            name: 'largest-contentful-paint',
            duration: lastEntry.startTime,
            timestamp: Date.now(),
            type: 'measure',
            details: {
              element: (lastEntry as any).element?.tagName,
              url: (lastEntry as any).url,
              size: (lastEntry as any).size,
            },
          });
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observation not supported');
      }
    }
  }

  private observeFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const fidEntry = entry as any; // PerformanceEventTiming
            this.recordMetric({
              name: 'first-input-delay',
              duration: fidEntry.processingStart - entry.startTime,
              timestamp: Date.now(),
              type: 'measure',
              details: {
                eventType: fidEntry.name,
                startTime: entry.startTime,
                processingStart: fidEntry.processingStart,
              },
            });
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observation not supported');
      }
    }
  }

  private observeCLS() {
    let clsValue = 0;
    let clsEntries: any[] = [];

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        // Report CLS when the page is about to be unloaded
        window.addEventListener('beforeunload', () => {
          this.recordMetric({
            name: 'cumulative-layout-shift',
            duration: clsValue,
            timestamp: Date.now(),
            type: 'measure',
            details: {
              entries: clsEntries.length,
            },
          });
        });
      } catch (e) {
        console.warn('CLS observation not supported');
      }
    }
  }

  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      });
    });
  }

  private setupUnhandledRejectionTracking() {
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      });
    });
  }

  // Public methods
  recordMetric(metric: PerformanceMetrics) {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only the last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log important metrics in development
    if (import.meta.env.DEV) {
      console.log('Performance metric:', metric);
    }
  }

  recordError(error: ErrorReport) {
    if (!this.isEnabled) return;

    this.errors.push(error);

    // Keep only the last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    console.error('Error tracked:', error);
  }

  // Custom timing utilities
  startTiming(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        type: 'custom',
      });
    };
  }

  // Mark important events
  mark(name: string, details?: Record<string, any>) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }

    this.recordMetric({
      name,
      duration: 0,
      timestamp: Date.now(),
      type: 'custom',
      details,
    });
  }

  // Measure between two marks
  measure(name: string, startMark: string, endMark?: string) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name, 'measure')[0];

        this.recordMetric({
          name,
          duration: measure.duration,
          timestamp: Date.now(),
          type: 'measure',
        });
      } catch (e) {
        console.warn('Failed to measure performance:', e);
      }
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Get current errors
  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  // Get performance summary
  getSummary() {
    const metrics = this.getMetrics();
    const errors = this.getErrors();

    return {
      sessionId: this.sessionId,
      metricsCount: metrics.length,
      errorsCount: errors.length,
      averageLoadTime:
        metrics
          .filter((m) => m.type === 'navigation')
          .reduce((sum, m) => sum + m.duration, 0) /
        Math.max(1, metrics.filter((m) => m.type === 'navigation').length),
      longTasksCount: metrics.filter((m) => m.name === 'long-task').length,
      layoutShiftsCount: metrics.filter((m) => m.name === 'layout-shift')
        .length,
    };
  }

  // Send metrics to analytics service (implement as needed)
  async sendMetrics(endpoint?: string) {
    if (!endpoint) return;

    try {
      const data = {
        sessionId: this.sessionId,
        metrics: this.getMetrics(),
        errors: this.getErrors(),
        summary: this.getSummary(),
        timestamp: Date.now(),
      };

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Performance metrics sent successfully');
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// React component error boundary integration
export function recordComponentError(
  error: Error,
  _errorInfo: { componentStack: string },
  component?: string,
  props?: Record<string, any>
) {
  performanceMonitor.recordError({
    message: error.message,
    stack: error.stack,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    sessionId: performanceMonitor['sessionId'],
    component,
    props,
  });
}

// Hook for React components to measure render time
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  return {
    recordRenderTime: () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `render-${componentName}`,
        duration: renderTime,
        timestamp: Date.now(),
        type: 'custom',
        details: { component: componentName },
      });
    },
    startTiming: (operationName: string) =>
      performanceMonitor.startTiming(`${componentName}-${operationName}`),
    mark: (eventName: string, details?: Record<string, any>) =>
      performanceMonitor.mark(`${componentName}-${eventName}`, details),
  };
}
