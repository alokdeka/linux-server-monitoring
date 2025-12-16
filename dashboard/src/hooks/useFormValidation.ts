import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: T) => string | null;
  email?: boolean;
  url?: boolean;
}

export interface FieldConfig<T = any> {
  rules?: ValidationRule<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export type FormConfig<T extends Record<string, any>> = {
  fields: {
    [K in keyof T]: FieldConfig<T[K]>;
  };
  validateOnSubmit?: boolean;
};

export type ValidationErrors<T extends Record<string, any>> = {
  [K in keyof T]?: string;
};

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: ValidationErrors<T>;
  touched: { [K in keyof T]?: boolean };
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface FormActions<T extends Record<string, any>> {
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  setError: <K extends keyof T>(field: K, error: string | null) => void;
  setErrors: (errors: ValidationErrors<T>) => void;
  setTouched: <K extends keyof T>(field: K, touched: boolean) => void;
  validateField: <K extends keyof T>(field: K) => string | null;
  validateForm: () => boolean;
  reset: (values?: T) => void;
  setSubmitting: (submitting: boolean) => void;
}

const validateValue = <T>(
  value: T,
  rules: ValidationRule<T>
): string | null => {
  if (
    rules.required &&
    (value === null || value === undefined || value === '')
  ) {
    return 'This field is required';
  }

  if (value === null || value === undefined || value === '') {
    return null; // Skip other validations for empty values
  }

  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }

    if (rules.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return 'Invalid email address';
      }
    }

    if (rules.url) {
      try {
        new URL(value);
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return 'URL must start with http:// or https://';
        }
      } catch {
        return 'Invalid URL format';
      }
    }
  }

  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return `Must be at least ${rules.min}`;
    }

    if (rules.max !== undefined && value > rules.max) {
      return `Must be no more than ${rules.max}`;
    }
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
};

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  config: FormConfig<T>
): [FormState<T>, FormActions<T>] => {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<ValidationErrors<T>>({});
  const [touched, setTouchedState] = useState<{ [K in keyof T]?: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Debounce timers for validation
  const [debounceTimers, setDebounceTimers] = useState<{
    [key: string]: NodeJS.Timeout;
  }>({});

  const validateField = useCallback(
    <K extends keyof T>(field: K): string | null => {
      const fieldConfig = config.fields[field];
      if (!fieldConfig?.rules) return null;

      return validateValue(values[field], fieldConfig.rules);
    },
    [values, config.fields]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors<T> = {};
    let isValid = true;

    for (const field in config.fields) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrorsState(newErrors);
    return isValid;
  }, [config.fields, validateField]);

  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);

      const fieldConfig = config.fields[field];
      if (fieldConfig?.validateOnChange) {
        const debounceMs = fieldConfig.debounceMs || 300;

        // Clear existing timer
        if (debounceTimers[field as string]) {
          clearTimeout(debounceTimers[field as string]);
        }

        // Set new timer
        const timer = setTimeout(() => {
          const error = validateValue(value, fieldConfig.rules || {});
          setErrorsState((prev) => ({ ...prev, [field]: error }));
        }, debounceMs);

        setDebounceTimers((prev) => ({ ...prev, [field as string]: timer }));
      }
    },
    [config.fields, debounceTimers]
  );

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
    setIsDirty(true);
  }, []);

  const setError = useCallback(
    <K extends keyof T>(field: K, error: string | null) => {
      setErrorsState((prev) => ({ ...prev, [field]: error }));
    },
    []
  );

  const setErrors = useCallback((newErrors: ValidationErrors<T>) => {
    setErrorsState(newErrors);
  }, []);

  const setTouched = useCallback(
    <K extends keyof T>(field: K, touchedValue: boolean) => {
      setTouchedState((prev) => ({ ...prev, [field]: touchedValue }));

      // Validate on blur if configured
      if (touchedValue) {
        const fieldConfig = config.fields[field];
        if (fieldConfig?.validateOnBlur) {
          const error = validateField(field);
          setErrorsState((prev) => ({ ...prev, [field]: error }));
        }
      }
    },
    [config.fields, validateField]
  );

  const reset = useCallback(
    (resetValues?: T) => {
      const newValues = resetValues || initialValues;
      setValuesState(newValues);
      setErrorsState({});
      setTouchedState({});
      setIsSubmitting(false);
      setIsDirty(false);

      // Clear all debounce timers
      Object.values(debounceTimers).forEach(clearTimeout);
      setDebounceTimers({});
    },
    [initialValues, debounceTimers]
  );

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  // Calculate if form is valid
  const isValid =
    Object.keys(errors).length === 0 ||
    Object.values(errors).every((error) => !error);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(clearTimeout);
    };
  }, [debounceTimers]);

  const formState: FormState<T> = {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
  };

  const formActions: FormActions<T> = {
    setValue,
    setValues,
    setError,
    setErrors,
    setTouched,
    validateField,
    validateForm,
    reset,
    setSubmitting,
  };

  return [formState, formActions];
};
