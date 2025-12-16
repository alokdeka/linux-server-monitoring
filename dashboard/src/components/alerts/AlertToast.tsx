import React, { useEffect, useState } from 'react';
import type { Alert } from '../../types';
import './AlertToast.css';

interface AlertToastProps {
  alert: Alert;
  onClose: () => void;
  onAcknowledge?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const AlertToast: React.FC<AlertToastProps> = ({
  alert,
  onClose,
  onAcknowledge,
  autoClose = true,
  autoCloseDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match CSS animation duration
  };

  const handleAcknowledge = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAcknowledge) {
      onAcknowledge();
    }
    handleClose();
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getAlertTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'cpu':
        return '🔥';
      case 'memory':
        return '💾';
      case 'disk':
        return '💿';
      case 'offline':
        return '🔌';
      default:
        return '📊';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      className={`alert-toast ${alert.severity} ${
        isVisible ? 'visible' : ''
      } ${isClosing ? 'closing' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-content">
        <div className="toast-icons">
          <span className="severity-icon" title={`${alert.severity} alert`}>
            {getSeverityIcon(alert.severity)}
          </span>
          <span className="type-icon" title={`${alert.type} alert`}>
            {getAlertTypeIcon(alert.type)}
          </span>
        </div>

        <div className="toast-body">
          <div className="toast-header">
            <span className="toast-title">
              {alert.severity === 'critical'
                ? 'Critical Alert'
                : 'Warning Alert'}
            </span>
            <span className="toast-time">
              {formatTimeAgo(alert.triggeredAt)}
            </span>
          </div>

          <div className="toast-message">{alert.message}</div>

          <div className="toast-server">
            <span className="server-label">Server:</span>
            <span className="server-name">{alert.serverId}</span>
          </div>
        </div>

        <div className="toast-actions">
          {onAcknowledge && (
            <button
              className="acknowledge-button"
              onClick={handleAcknowledge}
              title="Acknowledge alert"
              aria-label="Acknowledge alert"
            >
              ✓
            </button>
          )}
          <button
            className="close-button"
            onClick={handleClose}
            title="Close notification"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>

      {autoClose && (
        <div
          className="toast-progress"
          style={{
            animationDuration: `${autoCloseDelay}ms`,
          }}
        />
      )}
    </div>
  );
};

export default AlertToast;
