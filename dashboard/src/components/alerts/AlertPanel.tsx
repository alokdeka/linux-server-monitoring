import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchActiveAlerts,
  acknowledgeAlert,
} from '../../store/slices/alertsSlice';
import type { Alert } from '../../types';
import './AlertPanel.css';

interface AlertPanelProps {
  onAlertClick?: (alert: Alert) => void;
  showActions?: boolean;
  maxItems?: number;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
  onAlertClick,
  showActions = true,
  maxItems,
}) => {
  const dispatch = useAppDispatch();
  const {
    active: alerts,
    loading,
    error,
    unreadCount,
  } = useAppSelector((state) => state.alerts);

  useEffect(() => {
    dispatch(fetchActiveAlerts());
  }, [dispatch]);

  const handleAcknowledgeAlert = (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(acknowledgeAlert(alertId));
  };

  const handleAlertClick = (alert: Alert) => {
    if (onAlertClick) {
      onAlertClick(alert);
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  if (loading && alerts.length === 0) {
    return (
      <div className="alert-panel">
        <div className="alert-panel-header">
          <h3>Active Alerts</h3>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-panel">
        <div className="alert-panel-header">
          <h3>Active Alerts</h3>
        </div>
        <div className="alert-error">
          <p>Failed to load alerts: {error}</p>
          <button
            onClick={() => dispatch(fetchActiveAlerts())}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-panel">
      <div className="alert-panel-header">
        <h3>Active Alerts</h3>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </div>

      {displayAlerts.length === 0 ? (
        <div className="no-alerts">
          <div className="no-alerts-icon">✅</div>
          <p>No active alerts</p>
          <span className="no-alerts-subtitle">
            All systems are running normally
          </span>
        </div>
      ) : (
        <div className="alert-list">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-item ${alert.severity} ${
                !alert.acknowledged ? 'unread' : ''
              }`}
              onClick={() => handleAlertClick(alert)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleAlertClick(alert);
                }
              }}
            >
              <div className="alert-icons">
                <span
                  className="severity-icon"
                  title={`${alert.severity} alert`}
                >
                  {getSeverityIcon(alert.severity)}
                </span>
                <span className="type-icon" title={`${alert.type} alert`}>
                  {getAlertTypeIcon(alert.type)}
                </span>
              </div>

              <div className="alert-content">
                <div className="alert-message">{alert.message}</div>
                <div className="alert-meta">
                  <span className="alert-server">Server: {alert.serverId}</span>
                  <span className="alert-time">
                    {formatTimeAgo(alert.triggeredAt)}
                  </span>
                </div>
              </div>

              {showActions && (
                <div className="alert-actions">
                  {!alert.acknowledged && (
                    <button
                      className="acknowledge-button"
                      onClick={(e) => handleAcknowledgeAlert(alert.id, e)}
                      title="Acknowledge alert"
                      aria-label="Acknowledge alert"
                    >
                      ✓
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {maxItems && alerts.length > maxItems && (
        <div className="alert-panel-footer">
          <span className="more-alerts">
            +{alerts.length - maxItems} more alerts
          </span>
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
