import React, { useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { acknowledgeAlert, resolveAlert } from '../../store/slices/alertsSlice';
import type { Alert } from '../../types';
import './AlertDetailModal.css';

interface AlertDetailModalProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
}

const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  isOpen,
  onClose,
}) => {
  const dispatch = useAppDispatch();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleAcknowledge = () => {
    if (alert) {
      dispatch(acknowledgeAlert(alert.id));
      onClose();
    }
  };

  const handleResolve = () => {
    if (alert) {
      dispatch(
        resolveAlert({
          alertId: alert.id,
          resolvedAt: new Date().toISOString(),
        })
      );
      onClose();
    }
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

  const getAlertTypeDescription = (type: Alert['type']) => {
    switch (type) {
      case 'cpu':
        return 'CPU Usage Alert';
      case 'memory':
        return 'Memory Usage Alert';
      case 'disk':
        return 'Disk Usage Alert';
      case 'offline':
        return 'Server Offline Alert';
      default:
        return 'System Alert';
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (triggeredAt: string, resolvedAt?: string) => {
    const start = new Date(triggeredAt);
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h ${diffMinutes % 60}m`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  if (!isOpen || !alert) {
    return null;
  }

  return (
    <div
      className="alert-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="alert-modal">
        <div className="alert-modal-header">
          <div className="alert-modal-title-section">
            <div className="alert-icons">
              <span
                className="severity-icon"
                style={{ color: getSeverityColor(alert.severity) }}
              >
                {getSeverityIcon(alert.severity)}
              </span>
              <span className="type-icon">{getAlertTypeIcon(alert.type)}</span>
            </div>
            <div className="alert-title-text">
              <h2 id="alert-modal-title">
                {getAlertTypeDescription(alert.type)}
              </h2>
              <div className="alert-severity-badge">
                <span className={`severity-indicator ${alert.severity}`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="alert-modal-body">
          <div className="alert-section">
            <h3>Alert Message</h3>
            <p className="alert-message">{alert.message}</p>
          </div>

          <div className="alert-details-grid">
            <div className="alert-detail-item">
              <label>Server ID</label>
              <span className="server-id">{alert.serverId}</span>
            </div>

            <div className="alert-detail-item">
              <label>Alert Type</label>
              <span className="alert-type">
                {getAlertTypeIcon(alert.type)} {alert.type.toUpperCase()}
              </span>
            </div>

            <div className="alert-detail-item">
              <label>Severity</label>
              <span className={`severity-value ${alert.severity}`}>
                {getSeverityIcon(alert.severity)} {alert.severity.toUpperCase()}
              </span>
            </div>

            <div className="alert-detail-item">
              <label>Status</label>
              <span
                className={`status-value ${alert.resolvedAt ? 'resolved' : 'active'}`}
              >
                {alert.resolvedAt ? '✅ Resolved' : '🔴 Active'}
              </span>
            </div>

            <div className="alert-detail-item">
              <label>Triggered At</label>
              <span className="timestamp">
                {formatDateTime(alert.triggeredAt)}
              </span>
            </div>

            {alert.resolvedAt && (
              <div className="alert-detail-item">
                <label>Resolved At</label>
                <span className="timestamp">
                  {formatDateTime(alert.resolvedAt)}
                </span>
              </div>
            )}

            <div className="alert-detail-item">
              <label>Duration</label>
              <span className="duration">
                {formatDuration(alert.triggeredAt, alert.resolvedAt)}
                {!alert.resolvedAt && ' (ongoing)'}
              </span>
            </div>

            <div className="alert-detail-item">
              <label>Acknowledged</label>
              <span
                className={`acknowledged-value ${alert.acknowledged ? 'yes' : 'no'}`}
              >
                {alert.acknowledged ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </div>

          <div className="alert-section">
            <h3>Recommended Actions</h3>
            <div className="recommended-actions">
              {alert.type === 'cpu' && (
                <ul>
                  <li>
                    Check running processes with <code>top</code> or{' '}
                    <code>htop</code>
                  </li>
                  <li>Identify CPU-intensive applications</li>
                  <li>Consider scaling resources or optimizing applications</li>
                  <li>Monitor CPU usage trends over time</li>
                </ul>
              )}
              {alert.type === 'memory' && (
                <ul>
                  <li>
                    Check memory usage with <code>free -h</code> or{' '}
                    <code>htop</code>
                  </li>
                  <li>Identify memory-intensive processes</li>
                  <li>Clear unnecessary caches if safe to do so</li>
                  <li>Consider adding more RAM or optimizing applications</li>
                </ul>
              )}
              {alert.type === 'disk' && (
                <ul>
                  <li>
                    Check disk usage with <code>df -h</code>
                  </li>
                  <li>
                    Identify large files and directories with{' '}
                    <code>du -sh</code>
                  </li>
                  <li>Clean up log files and temporary files</li>
                  <li>Consider expanding storage or archiving old data</li>
                </ul>
              )}
              {alert.type === 'offline' && (
                <ul>
                  <li>Check server connectivity and network status</li>
                  <li>Verify monitoring agent is running</li>
                  <li>Check server logs for errors or crashes</li>
                  <li>Restart services if necessary</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="alert-modal-footer">
          {!alert.acknowledged && !alert.resolvedAt && (
            <>
              <button
                className="acknowledge-button"
                onClick={handleAcknowledge}
              >
                <span>✓</span>
                Acknowledge
              </button>
              <button className="resolve-button" onClick={handleResolve}>
                <span>✅</span>
                Mark as Resolved
              </button>
            </>
          )}
          <button className="cancel-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
