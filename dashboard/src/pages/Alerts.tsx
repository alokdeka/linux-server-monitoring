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
    <div className="page">

      <div className="alert-stats">
        <div className="stat-card">
          <div className="stat-icon critical">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{criticalCount}</div>
            <div className="stat-label">Critical Alerts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="m12 17 .01 0"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{warningCount}</div>
            <div className="stat-label">Warning Alerts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{resolvedTodayCount}</div>
            <div className="stat-label">Resolved Today</div>
          </div>
        </div>
      </div>

      <div className="alerts-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Active Alerts</h2>
          </div>
          <AlertPanel
            onAlertClick={handleAlertClick}
            showActions={true}
            maxItems={10}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Alert History</h2>
          </div>
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