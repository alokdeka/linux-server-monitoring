import './Settings.css';

const Settings = () => {
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure dashboard preferences and system settings.</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Alert Thresholds</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>CPU Usage Warning (%)</label>
              <input type="number" defaultValue="80" />
            </div>
            <div className="form-group">
              <label>CPU Usage Critical (%)</label>
              <input type="number" defaultValue="90" />
            </div>
            <div className="form-group">
              <label>Memory Usage Warning (%)</label>
              <input type="number" defaultValue="85" />
            </div>
            <div className="form-group">
              <label>Memory Usage Critical (%)</label>
              <input type="number" defaultValue="95" />
            </div>
            <div className="form-group">
              <label>Disk Usage Warning (%)</label>
              <input type="number" defaultValue="80" />
            </div>
            <div className="form-group">
              <label>Disk Usage Critical (%)</label>
              <input type="number" defaultValue="90" />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>
                <input type="checkbox" defaultChecked />
                Enable Email Notifications
              </label>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" defaultValue="admin@example.com" />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" defaultChecked />
                Enable Webhook Notifications
              </label>
            </div>
            <div className="form-group">
              <label>Webhook URL</label>
              <input type="url" placeholder="https://hooks.slack.com/..." />
            </div>
            <div className="form-group">
              <label>Refresh Interval (seconds)</label>
              <input type="number" defaultValue="30" />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Display Preferences</h2>
          <div className="settings-form">
            <div className="form-group">
              <label>
                <input type="checkbox" defaultChecked />
                Show Server Status Icons
              </label>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" defaultChecked />
                Enable Animations
              </label>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" />
                Compact View Mode
              </label>
            </div>
            <div className="form-group">
              <label>Date Format</label>
              <select defaultValue="relative">
                <option value="relative">Relative (2 minutes ago)</option>
                <option value="absolute">Absolute (14:30:25)</option>
                <option value="iso">ISO (2023-12-16T14:30:25Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="save-btn">Save Settings</button>
        <button className="reset-btn">Reset to Defaults</button>
      </div>
    </div>
  );
};

export default Settings;
