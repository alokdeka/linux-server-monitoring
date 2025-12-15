import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">
          Monitor your server infrastructure in real-time with comprehensive
          metrics and alerts.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">🖥️</div>
            <div className="metric-content">
              <h3>Total Servers</h3>
              <div className="metric-value">12</div>
              <div className="metric-change positive">+2 this week</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <h3>Online Servers</h3>
              <div className="metric-value">11</div>
              <div className="metric-change positive">91.7% uptime</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">⚠️</div>
            <div className="metric-content">
              <h3>Active Alerts</h3>
              <div className="metric-value">3</div>
              <div className="metric-change negative">2 critical</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <h3>Avg CPU Usage</h3>
              <div className="metric-value">67%</div>
              <div className="metric-change neutral">Normal range</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">🔄</div>
              <div className="activity-details">
                <div className="activity-title">Server web-01 restarted</div>
                <div className="activity-time">2 minutes ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">⚠️</div>
              <div className="activity-details">
                <div className="activity-title">
                  High memory usage on db-server
                </div>
                <div className="activity-time">15 minutes ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">✅</div>
              <div className="activity-details">
                <div className="activity-title">All systems operational</div>
                <div className="activity-time">1 hour ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">🔧</div>
              <div className="activity-details">
                <div className="activity-title">
                  Maintenance completed on api-server
                </div>
                <div className="activity-time">3 hours ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">📈</div>
              <div className="activity-details">
                <div className="activity-title">
                  Performance optimization deployed
                </div>
                <div className="activity-time">6 hours ago</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2>System Health</h2>
          <div className="health-overview">
            <div className="health-item">
              <div className="health-label">Network</div>
              <div className="health-status good">Excellent</div>
            </div>
            <div className="health-item">
              <div className="health-label">Storage</div>
              <div className="health-status warning">Moderate</div>
            </div>
            <div className="health-item">
              <div className="health-label">Performance</div>
              <div className="health-status good">Good</div>
            </div>
            <div className="health-item">
              <div className="health-label">Security</div>
              <div className="health-status good">Secure</div>
            </div>
            <div className="health-item">
              <div className="health-label">Backup</div>
              <div className="health-status good">Up to date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
