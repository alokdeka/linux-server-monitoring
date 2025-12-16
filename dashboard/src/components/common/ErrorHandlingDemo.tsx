import React, { useState } from 'react';
import {
  ErrorBoundary,
  ErrorState,
  LoadingSpinner,
  RetryButton,
  FormField,
  useToast,
} from './index';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiWithRetry } from '../../hooks/useApiWithRetry';

// Demo component to showcase error handling features
const ErrorHandlingDemo: React.FC = () => {
  const { showToast } = useToast();
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form validation demo
  const [formState, formActions] = useFormValidation(
    { email: '', message: '' },
    {
      fields: {
        email: {
          rules: {
            required: true,
            email: true,
          },
          validateOnChange: true,
          validateOnBlur: true,
        },
        message: {
          rules: {
            required: true,
            minLength: 10,
            maxLength: 500,
          },
          validateOnChange: true,
          validateOnBlur: true,
        },
      },
    }
  );

  // API with retry demo
  const mockApiCall = async () => {
    // Simulate random failure
    if (Math.random() < 0.7) {
      throw new Error('Simulated API failure');
    }
    return { success: true };
  };

  const [apiState, apiActions] = useApiWithRetry(mockApiCall, {
    maxRetries: 2,
    showToastOnError: true,
    showToastOnSuccess: true,
    successMessage: 'API call succeeded!',
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formActions.validateForm()) {
      showToast('success', 'Form Valid', 'All form fields are valid!');
    } else {
      showToast('error', 'Form Invalid', 'Please fix the form errors.');
    }
  };

  const triggerError = () => {
    throw new Error('Intentional error for testing');
  };

  const simulateLoading = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    showToast('info', 'Loading Complete', 'Simulated loading finished.');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Error Handling & User Feedback Demo</h1>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Toast Notifications */}
        <section>
          <h2>Toast Notifications</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() =>
                showToast(
                  'success',
                  'Success!',
                  'Operation completed successfully.'
                )
              }
            >
              Success Toast
            </button>
            <button
              onClick={() =>
                showToast('error', 'Error!', 'Something went wrong.')
              }
            >
              Error Toast
            </button>
            <button
              onClick={() =>
                showToast('warning', 'Warning!', 'Please be careful.')
              }
            >
              Warning Toast
            </button>
            <button
              onClick={() =>
                showToast('info', 'Info', 'Here is some information.')
              }
            >
              Info Toast
            </button>
          </div>
        </section>

        {/* Loading States */}
        <section>
          <h2>Loading States</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={simulateLoading} disabled={loading}>
              {loading ? 'Loading...' : 'Simulate Loading'}
            </button>
            {loading && <LoadingSpinner size="medium" />}
          </div>
        </section>

        {/* Error States */}
        <section>
          <h2>Error States</h2>
          <div
            style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}
          >
            <button onClick={() => setShowError(!showError)}>
              {showError ? 'Hide' : 'Show'} Error State
            </button>
            {showError && (
              <ErrorState
                title="Demo Error"
                message="This is a demonstration of the error state component."
                error="Simulated error for testing purposes"
                onRetry={() => {
                  setShowError(false);
                  showToast('info', 'Retry', 'Error state was dismissed.');
                }}
              />
            )}
          </div>
        </section>

        {/* API with Retry */}
        <section>
          <h2>API with Retry</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => apiActions.execute()}
              disabled={apiState.loading}
            >
              {apiState.loading
                ? 'Calling API...'
                : 'Call API (70% failure rate)'}
            </button>
            {apiState.error && (
              <RetryButton onRetry={apiActions.retry}>
                Retry API Call
              </RetryButton>
            )}
          </div>
          {apiState.error && (
            <div style={{ color: 'red', marginTop: '0.5rem' }}>
              Error: {apiState.error} (Retry count: {apiState.retryCount})
            </div>
          )}
        </section>

        {/* Form Validation */}
        <section>
          <h2>Form Validation</h2>
          <form onSubmit={handleFormSubmit} style={{ maxWidth: '400px' }}>
            <FormField
              label="Email"
              type="email"
              value={formState.values.email}
              onChange={(e) => formActions.setValue('email', e.target.value)}
              onBlur={() => formActions.setTouched('email', true)}
              error={formState.errors.email}
              touched={formState.touched.email}
              required
              helpText="Enter a valid email address"
            />

            <FormField
              label="Message"
              type="text"
              value={formState.values.message}
              onChange={(e) => formActions.setValue('message', e.target.value)}
              onBlur={() => formActions.setTouched('message', true)}
              error={formState.errors.message}
              touched={formState.touched.message}
              required
              helpText="Message must be between 10 and 500 characters"
            />

            <button type="submit" disabled={!formState.isValid}>
              Submit Form
            </button>
          </form>
        </section>

        {/* Error Boundary */}
        <section>
          <h2>Error Boundary</h2>
          <ErrorBoundary>
            <button onClick={triggerError}>Trigger Component Error</button>
          </ErrorBoundary>
        </section>
      </div>
    </div>
  );
};

export default ErrorHandlingDemo;
