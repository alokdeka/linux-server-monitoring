import React, { useState, useCallback, useContext, createContext } from 'react';
import Toast from './Toast';
import type { ToastData, ToastType } from './Toast';
import './ToastContainer.css';

interface ToastContextType {
  showToast: (
    type: ToastType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      action?: { label: string; onClick: () => void };
      onClose?: () => void;
    }
  ) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = 'top-right',
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (
      type: ToastType,
      title: string,
      message: string,
      options?: {
        duration?: number;
        action?: { label: string; onClick: () => void };
        onClose?: () => void;
      }
    ): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastData = {
        id,
        type,
        title,
        message,
        duration: options?.duration ?? defaultDuration,
        action: options?.action,
        onClose: options?.onClose,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        // Limit the number of toasts
        return updated.slice(0, maxToasts);
      });

      return id;
    },
    [maxToasts, defaultDuration]
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} position={position} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastData[];
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position,
  onClose,
}) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`toast-container ${position}`}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default ToastContainer;
