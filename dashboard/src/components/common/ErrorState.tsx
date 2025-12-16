import React from 'react';
import RetryButton from './RetryButton';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => Promise<void> | void;
  showRetry?: boolean;
  className?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  error,
  onRetry,
  showRetry = true,
  className = '',
  icon,
  actions,
}) => {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className={`error-state ${className}`} role="alert">
      <div className="error-state-content">
        <div className="error-state-icon">{icon || '⚠️'}</div>

        <div className="error-state-text">
          <h3 className="error-state-title">{title}</h3>
          <p className="error-state-message">{message}</p>

          {errorMessage && (
            <details className="error-state-details">
              <summary>Error details</summary>
              <pre className="error-state-error">{errorMessage}</pre>
            </details>
          )}
        </div>

        <div className="error-state-actions">
          {showRetry && onRetry && (
            <RetryButton onRetry={onRetry} className="error-retry-button">
              Try Again
            </RetryButton>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
