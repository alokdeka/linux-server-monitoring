import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './RetryButton.css';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  showRetryCount?: boolean;
}

const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  disabled = false,
  className = '',
  children = 'Retry',
  maxRetries = 3,
  retryDelay = 1000,
  showRetryCount = true,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (isRetrying || disabled || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    setLastError(null);

    try {
      // Add delay for better UX
      if (retryCount > 0 && retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      await onRetry();
      setRetryCount(0); // Reset on success
    } catch (error) {
      setRetryCount((prev) => prev + 1);
      setLastError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const isMaxRetriesReached = retryCount >= maxRetries;
  const buttonDisabled = disabled || isRetrying || isMaxRetriesReached;

  return (
    <div className={`retry-button-container ${className}`}>
      <button
        className={`retry-button ${isRetrying ? 'retrying' : ''} ${
          isMaxRetriesReached ? 'max-retries' : ''
        }`}
        onClick={handleRetry}
        disabled={buttonDisabled}
        type="button"
      >
        {isRetrying ? (
          <>
            <LoadingSpinner size="small" />
            <span>Retrying...</span>
          </>
        ) : isMaxRetriesReached ? (
          'Max retries reached'
        ) : (
          <>
            {children}
            {showRetryCount && retryCount > 0 && (
              <span className="retry-count">
                ({retryCount}/{maxRetries})
              </span>
            )}
          </>
        )}
      </button>

      {lastError && (
        <div className="retry-error" role="alert">
          {lastError}
        </div>
      )}

      {isMaxRetriesReached && (
        <div className="retry-help">
          <p>Unable to complete the operation after {maxRetries} attempts.</p>
          <button
            className="reset-retry-button"
            onClick={() => {
              setRetryCount(0);
              setLastError(null);
            }}
            type="button"
          >
            Reset and try again
          </button>
        </div>
      )}
    </div>
  );
};

export default RetryButton;
