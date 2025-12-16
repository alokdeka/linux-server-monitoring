import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(toast.id);
      toast.onClose?.();
    }, 300); // Match CSS animation duration
  };

  const handleAction = () => {
    toast.action?.onClick();
    handleClose();
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`toast toast-${toast.type} ${isVisible ? 'visible' : ''} ${
        isClosing ? 'closing' : ''
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-content">
        <div className="toast-icon">
          <span role="img" aria-label={toast.type}>
            {getIcon(toast.type)}
          </span>
        </div>

        <div className="toast-body">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
        </div>

        <div className="toast-actions">
          {toast.action && (
            <button
              className="toast-action-button"
              onClick={handleAction}
              type="button"
            >
              {toast.action.label}
            </button>
          )}
          <button
            className="toast-close-button"
            onClick={handleClose}
            type="button"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>

      {toast.duration && toast.duration > 0 && (
        <div
          className="toast-progress"
          style={{
            animationDuration: `${toast.duration}ms`,
          }}
        />
      )}
    </div>
  );
};

export default Toast;
