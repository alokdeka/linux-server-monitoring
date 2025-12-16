import { useState } from 'react';
import {
  AlertPanel,
  AlertHistory,
  AlertDetailModal,
} from '../components/alerts';
import { useAppSelector } from '../store/hooks';
import type { Alert } from '../types';
import './Alerts.css';

const Alerts = () => {
  const { active: activeAlerts, history: alertHistory } = useAppSelector(
    (state) => state.alerts
  );
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAlert(null);
  };

  // Calculate summary stats
  const criticalCount = activeAlerts.filter(
    (alert) => alert.severity === 'critical'
  ).length;
  const warningCount = activeAlerts.filter(
    (alert) => alert.severity === 'warning'
  ).length;
  const resolvedTodayCount = alertHistory.filter((alert) => {
    if (!alert.resolvedAt) return false;
    const today = new Date();
    const resolvedDate = new Date(alert.resolvedAt);
    return resolvedDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="alerts-page">
      <div className="page-header">
        <h1>Alerts</h1>
        <p>Monitor and manage system alerts and notifications.</p>
      </div>

      <div className="alerts-content">
        <div className="alerts-overview">
          <div className="alert-summary">
            <h2>Alert Summary</h2>
            <div className="summary-stats">
              <div className="stat-item">
                <div className="stat-value critical">{criticalCount}</div>
                <div className="stat-label">Critical</div>
              </div>
              <div className="stat-item">
                <div className="stat-value warning">{warningCount}</div>
                <div className="stat-label">Warning</div>
              </div>
              <div className="stat-item">
                <div className="stat-value resolved">{resolvedTodayCount}</div>
                <div className="stat-label">Resolved Today</div>
              </div>
            </div>
          </div>

          <div className="active-alerts-panel">
            <AlertPanel
              onAlertClick={handleAlertClick}
              showActions={true}
              maxItems={5}
            />
          </div>
        </div>

        <div className="alert-history-section">
          <AlertHistory onAlertClick={handleAlertClick} />
        </div>
      </div>

      <AlertDetailModal
        alert={selectedAlert}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Alerts;
