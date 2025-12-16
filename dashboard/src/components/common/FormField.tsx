import React, { forwardRef } from 'react';
import './FormField.css';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  helpText?: string;
  required?: boolean;
  loading?: boolean;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      touched,
      helpText,
      required,
      loading,
      className = '',
      id,
      ...inputProps
    },
    ref
  ) => {
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = touched && error;

    return (
      <div className={`form-field ${hasError ? 'has-error' : ''} ${className}`}>
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required && (
            <span className="required-indicator" aria-label="required">
              *
            </span>
          )}
        </label>

        <div className="form-input-container">
          <input
            ref={ref}
            id={fieldId}
            className={`form-input ${hasError ? 'error' : ''} ${loading ? 'loading' : ''}`}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError
                ? `${fieldId}-error`
                : helpText
                  ? `${fieldId}-help`
                  : undefined
            }
            disabled={loading || inputProps.disabled}
            {...inputProps}
          />

          {loading && (
            <div className="form-input-loading">
              <div className="loading-spinner-small" />
            </div>
          )}
        </div>

        {hasError && (
          <div
            id={`${fieldId}-error`}
            className="form-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {helpText && !hasError && (
          <div id={`${fieldId}-help`} className="form-help">
            {helpText}
          </div>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;
