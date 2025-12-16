import './Alerts.css';

const Alerts = () => {
  return (
    <div className="alerts-page">
      <div className="page-header">
        <h1>Alerts</h1>
        <p>Monitor and manage system alerts and notifications.</p>
      </div>

      <div className="alerts-content">
        <div className="active-alerts">
          <h2>Active Alerts</h2>
          <div className="alert-list">
            <div className="alert-item critical">
              <div className="alert-icon">🚨</div>
              <div className="alert-details">
                <h3>High CPU Usage</h3>
                <p>web-server-01 - CPU usage at 95%</p>
                <span className="alert-time">2 minutes ago</span>
              </div>
            </div>

            <div className="alert-item warning">
              <div className="alert-icon">⚠️</div>
              <div className="alert-details">
                <h3>Memory Usage High</h3>
                <p>db-server-01 - Memory usage at 87%</p>
                <span className="alert-time">15 minutes ago</span>
              </div>
            </div>

            <div className="alert-item warning">
              <div className="alert-icon">💾</div>
              <div className="alert-details">
                <h3>Disk Space Low</h3>
                <p>api-server-01 - Disk usage at 92%</p>
                <span className="alert-time">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>

        <div className="alert-summary">
          <h2>Alert Summary</h2>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-value critical">3</div>
              <div className="stat-label">Critical</div>
            </div>
            <div className="stat-item">
              <div className="stat-value warning">7</div>
              <div className="stat-label">Warning</div>
            </div>
            <div className="stat-item">
              <div className="stat-value resolved">24</div>
              <div className="stat-label">Resolved Today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
