import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { acknowledgeAlert } from '../../store/slices/alertsSlice';
import AlertToast from './AlertToast';
import type { Alert } from '../../types';
import './AlertToastContainer.css';

interface ToastAlert extends Alert {
  toastId: string;
  showTime: number;
}

interface AlertToastContainerProps {
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const AlertToastContainer: React.FC<AlertToastContainerProps> = ({
  maxToasts = 5,
  position = 'top-right',
  autoClose = true,
  autoCloseDelay = 5000,
}) => {
  const dispatch = useAppDispatch();
  const { active: activeAlerts } = useAppSelector(
    (state) => state.alerts || { active: [] }
  );
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [lastAlertCount, setLastAlertCount] = useState(0);

  // Monitor for new alerts and create toasts
  useEffect(() => {
    if (activeAlerts.length > lastAlertCount) {
      // New alerts have been added
      const newAlerts = activeAlerts.slice(lastAlertCount);

      newAlerts.forEach((alert) => {
        // Check if we already have a toast for this alert
        const existingToast = toasts.find((toast) => toast.id === alert.id);
        if (!existingToast) {
          const toastAlert: ToastAlert = {
            ...alert,
            toastId: `toast-${alert.id}-${Date.now()}`,
            showTime: Date.now(),
          };

          setToasts((prev) => {
            const updated = [toastAlert, ...prev];
            // Limit the number of toasts
            return updated.slice(0, maxToasts);
          });
        }
      });
    }

    setLastAlertCount(activeAlerts.length);
  }, [activeAlerts, lastAlertCount, maxToasts, toasts]);

  // Clean up resolved alerts from toasts
  useEffect(() => {
    setToasts((prev) =>
      prev.filter((toast) =>
        activeAlerts.some((alert) => alert.id === toast.id)
      )
    );
  }, [activeAlerts]);

  const handleCloseToast = (toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.toastId !== toastId));
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    dispatch(acknowledgeAlert(alertId));
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`alert-toast-container ${position}`}
      role="region"
      aria-label="Alert notifications"
    >
      {toasts.map((toast) => (
        <AlertToast
          key={toast.toastId}
          alert={toast}
          onClose={() => handleCloseToast(toast.toastId)}
          onAcknowledge={() => handleAcknowledgeAlert(toast.id)}
          autoClose={autoClose}
          autoCloseDelay={autoCloseDelay}
        />
      ))}
    </div>
  );
};

export default AlertToastContainer;
