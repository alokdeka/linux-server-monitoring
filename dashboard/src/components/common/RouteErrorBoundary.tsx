import React from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallbackRoute?: string;
}

const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  children,
  fallbackRoute = '/dashboard',
}) => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log route-specific error
    console.error('Route error occurred:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      route: window.location.pathname,
    });

    // Could send to error reporting service here
    // errorReportingService.captureException(error, { extra: errorInfo });
  };

  const routeErrorFallback = (
    <div className="error-boundary">
      <div className="error-boundary-content">
        <div className="error-icon">🚧</div>
        <h2>Page Error</h2>
        <p>
          This page encountered an error and couldn't load properly. You can try
          going back or return to the dashboard.
        </p>
        <div className="error-actions">
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload Page
          </button>
          <button
            className="refresh-button"
            onClick={() => navigate(fallbackRoute)}
            type="button"
          >
            Go to Dashboard
          </button>
          <button
            className="refresh-button"
            onClick={() => navigate(-1)}
            type="button"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={routeErrorFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;
