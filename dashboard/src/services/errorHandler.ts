// Centralized error handling service
// Provides consistent error handling, logging, and user feedback

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorHandlerService {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;

  /**
   * Handle and report an error
   */
  handleError(
    error: Error | string,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const errorReport: ErrorReport = {
      message: errorMessage,
      stack: errorStack,
      context: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      },
      severity,
    };

    // Add to queue
    this.addToQueue(errorReport);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', errorReport);
    }

    // Send to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(errorReport);
    }
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(
    error: any,
    endpoint: string,
    method: string = 'GET',
    context: Partial<ErrorContext> = {}
  ): string {
    let errorMessage = 'An unexpected error occurred';
    let severity: ErrorReport['severity'] = 'medium';

    if (error?.response) {
      // HTTP error response
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          errorMessage = data?.message || 'Bad request';
          severity = 'low';
          break;
        case 401:
          errorMessage = 'Authentication required';
          severity = 'high';
          break;
        case 403:
          errorMessage = 'Access denied';
          severity = 'high';
          break;
        case 404:
          errorMessage = 'Resource not found';
          severity = 'low';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          severity = 'medium';
          break;
        case 500:
          errorMessage = 'Server error. Please try again.';
          severity = 'high';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable';
          severity = 'high';
          break;
        default:
          errorMessage = data?.message || `HTTP ${status} error`;
          severity = 'medium';
      }
    } else if (error?.request) {
      // Network error
      errorMessage = 'Network error. Please check your connection.';
      severity = 'high';
    } else if (error?.message) {
      // Other error
      errorMessage = error.message;
      severity = 'medium';
    }

    this.handleError(
      error,
      {
        ...context,
        action: `API ${method} ${endpoint}`,
        component: 'API Client',
      },
      severity
    );

    return errorMessage;
  }

  /**
   * Handle form validation errors
   */
  handleValidationError(
    fieldErrors: Record<string, string>,
    formName: string,
    context: Partial<ErrorContext> = {}
  ): void {
    const errorMessage = `Form validation failed: ${Object.keys(fieldErrors).join(', ')}`;

    this.handleError(
      errorMessage,
      {
        ...context,
        action: `Form validation: ${formName}`,
        component: 'Form Validation',
      },
      'low'
    );
  }

  /**
   * Handle component errors (for error boundaries)
   */
  handleComponentError(
    error: Error,
    errorInfo: React.ErrorInfo,
    componentName: string,
    context: Partial<ErrorContext> = {}
  ): void {
    this.handleError(
      error,
      {
        ...context,
        component: componentName,
        action: 'Component render',
      },
      'high'
    );
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (error?.message) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: any): boolean {
    if (error?.response?.status) {
      const status = error.response.status;
      // Retry on server errors and rate limiting
      return status >= 500 || status === 429;
    }

    if (error?.request && !error?.response) {
      // Network errors are retryable
      return true;
    }

    return false;
  }

  /**
   * Get retry delay based on error type
   */
  getRetryDelay(error: any, attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    if (error?.response?.status === 429) {
      // Rate limiting - longer delay
      return Math.min(baseDelay * Math.pow(2, attempt) * 2, maxDelay);
    }

    // Exponential backoff
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  }

  /**
   * Clear error queue
   */
  clearQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorReport['severity'], number>;
    byComponent: Record<string, number>;
  } {
    const stats = {
      total: this.errorQueue.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<ErrorReport['severity'], number>,
      byComponent: {} as Record<string, number>,
    };

    this.errorQueue.forEach((error) => {
      stats.bySeverity[error.severity]++;

      const component = error.context.component || 'Unknown';
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
    });

    return stats;
  }

  private addToQueue(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport);

    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private async sendToErrorService(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real application, you would send this to your error reporting service
      // Examples: Sentry, Bugsnag, LogRocket, etc.

      // For now, we'll just log it
      console.warn(
        'Error report (would be sent to error service):',
        errorReport
      );

      // Example implementation:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService();

// Export convenience functions
export const handleError = errorHandler.handleError.bind(errorHandler);
export const handleApiError = errorHandler.handleApiError.bind(errorHandler);
export const handleValidationError =
  errorHandler.handleValidationError.bind(errorHandler);
export const handleComponentError =
  errorHandler.handleComponentError.bind(errorHandler);
export const getUserFriendlyMessage =
  errorHandler.getUserFriendlyMessage.bind(errorHandler);
export const isRetryableError =
  errorHandler.isRetryableError.bind(errorHandler);
export const getRetryDelay = errorHandler.getRetryDelay.bind(errorHandler);
