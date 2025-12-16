import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  loadSettings,
  saveSettings,
  resetToDefaults,
  clearSettingsError,
} from '../store/slices/appSlice';
import type { DashboardSettings } from '../types';
import './Settings.css';

interface ValidationErrors {
  cpu?: string;
  memory?: string;
  disk?: string;
  refreshInterval?: string;
  webhookUrls?: string[];
}

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, settingsLoading, settingsError } = useSelector(
    (state: RootState) => state.app
  );

  const [activeTab, setActiveTab] = useState<
    'alerts' | 'notifications' | 'display'
  >('alerts');
  const [localSettings, setLocalSettings] = useState<DashboardSettings | null>(
    null
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  // Load settings on component mount
  useEffect(() => {
    dispatch(loadSettings());
  }, [dispatch]);

  // Update local settings when Redux settings change
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasUnsavedChanges(false);
    }
  }, [settings]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearSettingsError());
    };
  }, [dispatch]);

  const validateSettings = (
    settingsToValidate: DashboardSettings
  ): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Validate alert thresholds
    if (
      settingsToValidate.alertThresholds.cpu < 1 ||
      settingsToValidate.alertThresholds.cpu > 100
    ) {
      errors.cpu = 'CPU threshold must be between 1 and 100';
    }
    if (
      settingsToValidate.alertThresholds.memory < 1 ||
      settingsToValidate.alertThresholds.memory > 100
    ) {
      errors.memory = 'Memory threshold must be between 1 and 100';
    }
    if (
      settingsToValidate.alertThresholds.disk < 1 ||
      settingsToValidate.alertThresholds.disk > 100
    ) {
      errors.disk = 'Disk threshold must be between 1 and 100';
    }

    // Validate refresh interval
    if (
      settingsToValidate.refreshInterval < 5000 ||
      settingsToValidate.refreshInterval > 300000
    ) {
      errors.refreshInterval =
        'Refresh interval must be between 5 and 300 seconds';
    }

    // Validate webhook URLs
    const webhookErrors: string[] = [];
    settingsToValidate.notifications.webhookUrls.forEach((url, index) => {
      try {
        new URL(url);
        if (!url.startsWith('https://')) {
          webhookErrors[index] = 'Webhook URL must use HTTPS';
        }
      } catch {
        webhookErrors[index] = 'Invalid URL format';
      }
    });
    if (webhookErrors.length > 0) {
      errors.webhookUrls = webhookErrors;
    }

    return errors;
  };

  const updateLocalSettings = (updates: Partial<DashboardSettings>) => {
    if (!localSettings) return;

    const newSettings = {
      ...localSettings,
      ...updates,
      alertThresholds: {
        ...localSettings.alertThresholds,
        ...(updates.alertThresholds || {}),
      },
      notifications: {
        ...localSettings.notifications,
        ...(updates.notifications || {}),
      },
      display: {
        ...localSettings.display,
        ...(updates.display || {}),
      },
    };

    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);

    // Validate on change
    const errors = validateSettings(newSettings);
    setValidationErrors(errors);
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;

    const errors = validateSettings(localSettings);
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        await dispatch(saveSettings(localSettings)).unwrap();
        setHasUnsavedChanges(false);
      } catch (error) {
        // Error is handled by Redux state
      }
    }
  };

  const handleResetSettings = () => {
    setShowResetConfirmation(true);
  };

  const confirmReset = () => {
    dispatch(resetToDefaults());
    setShowResetConfirmation(false);
    setValidationErrors({});
    setHasUnsavedChanges(false);
  };

  const addWebhookUrl = () => {
    if (!localSettings || !newWebhookUrl.trim()) return;

    try {
      new URL(newWebhookUrl);
      if (!newWebhookUrl.startsWith('https://')) {
        setValidationErrors({
          ...validationErrors,
          webhookUrls: [
            ...(validationErrors.webhookUrls || []),
            'Webhook URL must use HTTPS',
          ],
        });
        return;
      }

      updateLocalSettings({
        notifications: {
          ...localSettings.notifications,
          webhookUrls: [
            ...localSettings.notifications.webhookUrls,
            newWebhookUrl,
          ],
        },
      });
      setNewWebhookUrl('');
    } catch {
      setValidationErrors({
        ...validationErrors,
        webhookUrls: [
          ...(validationErrors.webhookUrls || []),
          'Invalid URL format',
        ],
      });
    }
  };

  const removeWebhookUrl = (index: number) => {
    if (!localSettings) return;

    const newUrls = localSettings.notifications.webhookUrls.filter(
      (_, i) => i !== index
    );
    updateLocalSettings({
      notifications: {
        ...localSettings.notifications,
        webhookUrls: newUrls,
      },
    });
  };

  if (!localSettings) {
    return (
      <div className="settings-page">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Configure dashboard preferences and system settings.</p>
        </div>
        <div className="loading-state">
          {settingsLoading ? 'Loading settings...' : 'Failed to load settings'}
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure dashboard preferences and system settings.</p>
        {settingsError && <div className="error-message">{settingsError}</div>}
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alert Thresholds
        </button>
        <button
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`tab-button ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          Display
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'alerts' && (
          <div className="settings-section">
            <h2>Alert Thresholds</h2>
            <p className="section-description">
              Configure when alerts are triggered based on system resource
              usage.
            </p>
            <div className="settings-form">
              <div className="form-group">
                <label>CPU Usage Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localSettings.alertThresholds.cpu}
                  onChange={(e) =>
                    updateLocalSettings({
                      alertThresholds: {
                        ...localSettings.alertThresholds,
                        cpu: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className={validationErrors.cpu ? 'error' : ''}
                />
                {validationErrors.cpu && (
                  <span className="error-text">{validationErrors.cpu}</span>
                )}
              </div>
              <div className="form-group">
                <label>Memory Usage Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localSettings.alertThresholds.memory}
                  onChange={(e) =>
                    updateLocalSettings({
                      alertThresholds: {
                        ...localSettings.alertThresholds,
                        memory: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className={validationErrors.memory ? 'error' : ''}
                />
                {validationErrors.memory && (
                  <span className="error-text">{validationErrors.memory}</span>
                )}
              </div>
              <div className="form-group">
                <label>Disk Usage Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localSettings.alertThresholds.disk}
                  onChange={(e) =>
                    updateLocalSettings({
                      alertThresholds: {
                        ...localSettings.alertThresholds,
                        disk: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className={validationErrors.disk ? 'error' : ''}
                />
                {validationErrors.disk && (
                  <span className="error-text">{validationErrors.disk}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h2>Notification Settings</h2>
            <p className="section-description">
              Configure how and where you receive alert notifications.
            </p>
            <div className="settings-form">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={localSettings.notifications.enabled}
                    onChange={(e) =>
                      updateLocalSettings({
                        notifications: {
                          ...localSettings.notifications,
                          enabled: e.target.checked,
                        },
                      })
                    }
                  />
                  Enable Notifications
                </label>
              </div>
              <div className="form-group">
                <label>Refresh Interval (seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={localSettings.refreshInterval / 1000}
                  onChange={(e) =>
                    updateLocalSettings({
                      refreshInterval: (parseInt(e.target.value) || 30) * 1000,
                    })
                  }
                  className={validationErrors.refreshInterval ? 'error' : ''}
                />
                {validationErrors.refreshInterval && (
                  <span className="error-text">
                    {validationErrors.refreshInterval}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>Webhook URLs</label>
                <div className="webhook-list">
                  {localSettings.notifications.webhookUrls.map((url, index) => (
                    <div key={index} className="webhook-item">
                      <span className="webhook-url">{url}</span>
                      <button
                        type="button"
                        className="remove-webhook"
                        onClick={() => removeWebhookUrl(index)}
                      >
                        Remove
                      </button>
                      {validationErrors.webhookUrls?.[index] && (
                        <span className="error-text">
                          {validationErrors.webhookUrls[index]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="add-webhook">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/..."
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWebhookUrl()}
                  />
                  <button type="button" onClick={addWebhookUrl}>
                    Add Webhook
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="settings-section">
            <h2>Display Preferences</h2>
            <p className="section-description">
              Customize the appearance and behavior of the dashboard interface.
            </p>
            <div className="settings-form">
              <div className="form-group">
                <label>Theme</label>
                <select
                  value={localSettings.display.theme}
                  onChange={(e) =>
                    updateLocalSettings({
                      display: {
                        ...localSettings.display,
                        theme: e.target.value as 'light' | 'dark',
                      },
                    })
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={localSettings.display.compactMode}
                    onChange={(e) =>
                      updateLocalSettings({
                        display: {
                          ...localSettings.display,
                          compactMode: e.target.checked,
                        },
                      })
                    }
                  />
                  Compact View Mode
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={localSettings.display.chartsEnabled}
                    onChange={(e) =>
                      updateLocalSettings({
                        display: {
                          ...localSettings.display,
                          chartsEnabled: e.target.checked,
                        },
                      })
                    }
                  />
                  Enable Charts
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-actions">
        <button
          className="save-btn"
          onClick={handleSaveSettings}
          disabled={
            settingsLoading ||
            Object.keys(validationErrors).length > 0 ||
            !hasUnsavedChanges
          }
        >
          {settingsLoading ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          className="reset-btn"
          onClick={handleResetSettings}
          disabled={settingsLoading}
        >
          Reset to Defaults
        </button>
      </div>

      {showResetConfirmation && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <h3>Reset Settings</h3>
            <p>
              Are you sure you want to reset all settings to their default
              values? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={confirmReset}>
                Yes, Reset
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowResetConfirmation(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
