import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchServers } from '../store/slices/serversSlice';
import {
  fetchActiveAlerts,
  fetchAlertHistory,
} from '../store/slices/alertsSlice';
import { webSocketClient } from '../services/websocket';
import './Dashboard.css';

const Dashboard = () => {
  const dispatch = useAppDispatch();

  // Get data from Redux store
  const servers = useAppSelector((state) => state.servers.list);
  const serversLoading = useAppSelector((state) => state.servers.loading);
  const serversError = useAppSelector((state) => state.servers.error);

  const activeAlerts = useAppSelector((state) => state.alerts.active);
  const alertHistory = useAppSelector((state) => state.alerts.history);
  const alertsLoading = useAppSelector((state) => state.alerts.loading);
  const alertsError = useAppSelector((state) => state.alerts.error);

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    const totalServers = servers.length;
    const onlineServers = servers.filter(
      (server) => server.status === 'online'
    ).length;
    const warningServers = servers.filter(
      (server) => server.status === 'warning'
    ).length;
    const offlineServers = servers.filter(
      (server) => server.status === 'offline'
    ).length;

    const criticalAlerts = activeAlerts.filter(
      (alert) => alert.severity === 'critical'
    ).length;
    const warningAlerts = activeAlerts.filter(
      (alert) => alert.severity === 'warning'
    ).length;

    // Calculate average CPU usage from servers with current metrics
    const serversWithMetrics = servers.filter(
      (server) => server.currentMetrics
    );
    const avgCpuUsage =
      serversWithMetrics.length > 0
        ? Math.round(
            serversWithMetrics.reduce(
              (sum, server) => sum + (server.currentMetrics?.cpuUsage || 0),
              0
            ) / serversWithMetrics.length
          )
        : 0;

    const uptimePercentage =
      totalServers > 0 ? Math.round((onlineServers / totalServers) * 100) : 0;

    return {
      totalServers,
      onlineServers,
      warningServers,
      offlineServers,
      activeAlertsCount: activeAlerts.length,
      criticalAlerts,
      warningAlerts,
      avgCpuUsage,
      uptimePercentage,
    };
  }, [servers, activeAlerts]);

  // Get recent activity from alert history
  const recentActivity = useMemo(() => {
    interface Activity {
      icon: string;
      title: string;
      time: string;
      type: 'alert' | 'server';
    }

    const activities: Activity[] = [];

    // Add recent alerts as activities
    const recentAlerts = alertHistory.slice(0, 3);
    recentAlerts.forEach((alert) => {
      activities.push({
        icon: alert.severity === 'critical' ? '🚨' : '⚠️',
        title: alert.message,
        time: formatTimeAgo(alert.triggeredAt),
        type: 'alert',
      });
    });

    // Add server status changes
    const recentlySeenServers = servers
      .filter((server) => server.lastSeen)
      .sort(
        (a, b) =>
          new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      )
      .slice(0, 2);

    recentlySeenServers.forEach((server) => {
      activities.push({
        icon:
          server.status === 'online'
            ? '✅'
            : server.status === 'warning'
              ? '⚠️'
              : '❌',
        title: `Server ${server.hostname || server.id} is ${server.status}`,
        time: formatTimeAgo(server.lastSeen),
        type: 'server',
      });
    });

    // Sort by most recent and limit to 5
    return activities.slice(0, 5);
  }, [alertHistory, servers]);

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchServers());
    dispatch(fetchActiveAlerts());
    dispatch(fetchAlertHistory({}));
  }, [dispatch]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    webSocketClient.connect();

    return () => {
      webSocketClient.disconnect();
    };
  }, []);

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  // Loading state
  if (serversLoading && servers.length === 0) {
    return (
      <div className="dashboard-page">
        <div className="loading-state">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">Loading your infrastructure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {(serversError || alertsError) && (
        <div className="error-banner">
          {serversError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              Servers: {serversError}
            </div>
          )}
          {alertsError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              Alerts: {alertsError}
            </div>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">🖥️</div>
            <div className="metric-content">
              <h3>Total Servers</h3>
              <div className="metric-value">{metrics.totalServers}</div>
              <div className="metric-change neutral">
                {metrics.totalServers === 0
                  ? 'No servers registered'
                  : 'Registered servers'}
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <h3>Online Servers</h3>
              <div className="metric-value">{metrics.onlineServers}</div>
              <div
                className={`metric-change ${metrics.uptimePercentage >= 90 ? 'positive' : metrics.uptimePercentage >= 70 ? 'neutral' : 'negative'}`}
              >
                {metrics.totalServers > 0
                  ? `${metrics.uptimePercentage}% uptime`
                  : 'No data'}
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">⚠️</div>
            <div className="metric-content">
              <h3>Active Alerts</h3>
              <div className="metric-value">{metrics.activeAlertsCount}</div>
              <div
                className={`metric-change ${metrics.criticalAlerts > 0 ? 'negative' : metrics.warningAlerts > 0 ? 'neutral' : 'positive'}`}
              >
                {metrics.criticalAlerts > 0
                  ? `${metrics.criticalAlerts} critical`
                  : metrics.warningAlerts > 0
                    ? `${metrics.warningAlerts} warnings`
                    : 'All clear'}
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-content">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <h3>Avg CPU Usage</h3>
              <div className="metric-value">{metrics.avgCpuUsage}%</div>
              <div
                className={`metric-change ${metrics.avgCpuUsage < 70 ? 'positive' : metrics.avgCpuUsage < 85 ? 'neutral' : 'negative'}`}
              >
                {metrics.avgCpuUsage < 70
                  ? 'Normal range'
                  : metrics.avgCpuUsage < 85
                    ? 'Moderate usage'
                    : 'High usage'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <div className="refresh-indicator">
              {(serversLoading || alertsLoading) && (
                <div className="mini-spinner"></div>
              )}
            </div>
          </div>
          <div className="activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-details">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <div className="empty-message">No recent activity</div>
                <div className="empty-description">
                  Activity will appear here as servers report metrics and alerts
                  are generated
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="content-card">
          <h2>System Health</h2>
          <div className="health-overview">
            <div className="health-item">
              <div className="health-label">Network</div>
              <div
                className={`health-status ${metrics.onlineServers === metrics.totalServers && metrics.totalServers > 0 ? 'good' : 'warning'}`}
              >
                {metrics.totalServers === 0
                  ? 'No data'
                  : metrics.onlineServers === metrics.totalServers
                    ? 'Excellent'
                    : 'Issues detected'}
              </div>
            </div>
            <div className="health-item">
              <div className="health-label">Alerts</div>
              <div
                className={`health-status ${metrics.criticalAlerts === 0 ? 'good' : 'critical'}`}
              >
                {metrics.criticalAlerts === 0
                  ? 'All clear'
                  : 'Attention needed'}
              </div>
            </div>
            <div className="health-item">
              <div className="health-label">Performance</div>
              <div
                className={`health-status ${metrics.avgCpuUsage < 70 ? 'good' : metrics.avgCpuUsage < 85 ? 'warning' : 'critical'}`}
              >
                {metrics.avgCpuUsage === 0
                  ? 'No data'
                  : metrics.avgCpuUsage < 70
                    ? 'Good'
                    : metrics.avgCpuUsage < 85
                      ? 'Moderate'
                      : 'High load'}
              </div>
            </div>
            <div className="health-item">
              <div className="health-label">Servers</div>
              <div
                className={`health-status ${metrics.offlineServers === 0 ? 'good' : 'warning'}`}
              >
                {metrics.totalServers === 0
                  ? 'None registered'
                  : metrics.offlineServers === 0
                    ? 'All online'
                    : `${metrics.offlineServers} offline`}
              </div>
            </div>
            <div className="health-item">
              <div className="health-label">Monitoring</div>
              <div className="health-status good">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
