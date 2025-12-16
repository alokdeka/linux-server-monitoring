import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchServers } from '../store/slices/serversSlice';
import {
  fetchActiveAlerts,
  fetchAlertHistory,
} from '../store/slices/alertsSlice';
import { webSocketClient } from '../services/websocket';
import './Dashboard.css';
import './DashboardCards.css';

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

  // Calculate metrics from real data with fallback values
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

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Get recent activity from available data
  const recentActivity = useMemo(() => {
    interface Activity {
      icon: string;
      title: string;
      time: string;
      type: 'alert' | 'server';
    }

    const activities: Activity[] = [];

    // Add recent active alerts
    const recentAlerts = activeAlerts.slice(0, 3);
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
      .slice(0, 3);

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
  }, [activeAlerts, servers]);

  // Load data on component mount with rate limiting
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        // Only fetch servers if we don't have data and aren't loading
        if (servers.length === 0 && !serversLoading && mounted) {
          await dispatch(fetchServers()).unwrap();
        }
        
        // Only fetch alerts if we don't have data and aren't loading
        if (activeAlerts.length === 0 && !alertsLoading && mounted) {
          await dispatch(fetchActiveAlerts()).unwrap();
        }
        
        // Skip alert history for now to prevent rate limiting
        // dispatch(fetchAlertHistory({}));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    webSocketClient.connect();

    return () => {
      webSocketClient.disconnect();
    };
  }, []);

  // Loading state - only show if we're loading and have no data
  if (serversLoading && servers.length === 0 && !serversError) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Dashboard</h2>
          <p>Gathering your infrastructure data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {(serversLoading || alertsLoading) && (
        <div className="sync-indicator">
          <div className="sync-dot"></div>
          <span>Syncing</span>
        </div>
      )}

      {/* Error Alert */}
      {(serversError || alertsError) && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div>
            <h3>Connection Issues</h3>
            <p>
              {serversError && `Servers: ${serversError}`}
              {alertsError && ` Alerts: ${alertsError}`}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboardStatsGrid">
        <div className="dashboardStatCard">
          <div className="dashboardStatHeader">
            <div className="dashboardStatIcon dashboardStatIconServers">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="4" rx="1"/>
                <rect x="2" y="9" width="20" height="4" rx="1"/>
                <rect x="2" y="15" width="20" height="4" rx="1"/>
                <line x1="6" y1="5" x2="6.01" y2="5"/>
                <line x1="6" y1="11" x2="6.01" y2="11"/>
                <line x1="6" y1="17" x2="6.01" y2="17"/>
              </svg>
            </div>
            <div className="dashboardStatInfo">
              <h3>Total Servers</h3>
              <span>Infrastructure nodes</span>
            </div>
          </div>
          <div className="dashboardStatValue">{metrics.totalServers}</div>
          <div className="dashboardStatFooter">
            <span className={`dashboardBadge ${metrics.totalServers > 0 ? 'dashboardBadgeSuccess' : 'dashboardBadgeNeutral'}`}>
              {metrics.totalServers === 0 ? 'No servers' : 'Active monitoring'}
            </span>
          </div>
        </div>

        <div className="dashboardStatCard">
          <div className="dashboardStatHeader">
            <div className="dashboardStatIcon dashboardStatIconUptime">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
              </svg>
            </div>
            <div className="dashboardStatInfo">
              <h3>System Uptime</h3>
              <span>Online servers</span>
            </div>
          </div>
          <div className="dashboardStatValue">
            {metrics.onlineServers}<span className="dashboardStatUnit">/{metrics.totalServers}</span>
          </div>
          <div className="dashboardStatFooter">
            <div className="dashboardProgressBar">
              <div 
                className="dashboardProgressFill" 
                style={{ width: `${metrics.uptimePercentage}%` }}
              ></div>
            </div>
            <span className={`dashboardBadge ${metrics.uptimePercentage >= 90 ? 'dashboardBadgeSuccess' : metrics.uptimePercentage >= 70 ? 'dashboardBadgeWarning' : 'dashboardBadgeError'}`}>
              {metrics.uptimePercentage}% uptime
            </span>
          </div>
        </div>

        <div className="dashboardStatCard">
          <div className="dashboardStatHeader">
            <div className="dashboardStatIcon dashboardStatIconAlerts">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <path d="m12 17 .01 0"/>
              </svg>
            </div>
            <div className="dashboardStatInfo">
              <h3>Active Alerts</h3>
              <span>Requires attention</span>
            </div>
          </div>
          <div className="dashboardStatValue">{metrics.activeAlertsCount}</div>
          <div className="dashboardStatFooter">
            {metrics.criticalAlerts > 0 && (
              <span className="dashboardAlertCount dashboardAlertCountCritical">{metrics.criticalAlerts} critical</span>
            )}
            {metrics.warningAlerts > 0 && (
              <span className="dashboardAlertCount dashboardAlertCountWarning">{metrics.warningAlerts} warnings</span>
            )}
            {metrics.activeAlertsCount === 0 && (
              <span className="dashboardBadge dashboardBadgeSuccess">All systems normal</span>
            )}
          </div>
        </div>

        <div className="dashboardStatCard">
          <div className="dashboardStatHeader">
            <div className="dashboardStatIcon dashboardStatIconPerformance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="16" height="16" x="4" y="4" rx="2"/>
                <rect width="6" height="6" x="9" y="9" rx="1"/>
                <path d="m15 2 5 5"/>
                <path d="m9 22 5-5"/>
                <path d="m4 15 5-5"/>
                <path d="m20 9-5 5"/>
              </svg>
            </div>
            <div className="dashboardStatInfo">
              <h3>CPU Usage</h3>
              <span>Average load</span>
            </div>
          </div>
          <div className="dashboardStatValue">{metrics.avgCpuUsage}<span className="dashboardStatUnit">%</span></div>
          <div className="dashboardStatFooter">
            <div className="dashboardUsageBar">
              <div 
                className={`dashboardUsageFill ${metrics.avgCpuUsage < 70 ? 'dashboardUsageFillLow' : metrics.avgCpuUsage < 85 ? 'dashboardUsageFillMedium' : 'dashboardUsageFillHigh'}`}
                style={{ width: `${metrics.avgCpuUsage}%` }}
              ></div>
            </div>
            <span className={`dashboardBadge ${metrics.avgCpuUsage < 70 ? 'dashboardBadgeSuccess' : metrics.avgCpuUsage < 85 ? 'dashboardBadgeWarning' : 'dashboardBadgeError'}`}>
              {metrics.avgCpuUsage < 70 ? 'Optimal' : metrics.avgCpuUsage < 85 ? 'Moderate' : 'High load'}
            </span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Activity Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2>Recent Activity</h2>
            {(serversLoading || alertsLoading) && (
              <div className="loading-dots">
                <div></div>
                <div></div>
                <div></div>
              </div>
            )}
          </div>
          <div className="activity-feed">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-timeline">
                    <div className={`timeline-dot ${activity.type}`}></div>
                    {index < recentActivity.length - 1 && <div className="timeline-line"></div>}
                  </div>
                  <div className="activity-content">
                    <div className="activity-message">{activity.title}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                </svg>
                <h3>No recent activity</h3>
                <p>Activity will appear here as servers report metrics and alerts are generated</p>
              </div>
            )}
          </div>
        </div>

        {/* Health Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2>System Health</h2>
          </div>
          <div className="health-grid">
            <div className="health-item">
              <span className="health-label">Network</span>
              <div className={`health-status ${metrics.onlineServers === metrics.totalServers && metrics.totalServers > 0 ? 'healthy' : 'warning'}`}>
                <div className="status-dot"></div>
                <span>
                  {metrics.totalServers === 0
                    ? 'No data'
                    : metrics.onlineServers === metrics.totalServers
                      ? 'Excellent'
                      : 'Issues detected'}
                </span>
              </div>
            </div>
            
            <div className="health-item">
              <span className="health-label">Alerts</span>
              <div className={`health-status ${metrics.criticalAlerts === 0 ? 'healthy' : 'critical'}`}>
                <div className="status-dot"></div>
                <span>{metrics.criticalAlerts === 0 ? 'All clear' : 'Attention needed'}</span>
              </div>
            </div>
            
            <div className="health-item">
              <span className="health-label">Performance</span>
              <div className={`health-status ${metrics.avgCpuUsage < 70 ? 'healthy' : metrics.avgCpuUsage < 85 ? 'warning' : 'critical'}`}>
                <div className="status-dot"></div>
                <span>
                  {metrics.avgCpuUsage === 0
                    ? 'No data'
                    : metrics.avgCpuUsage < 70
                      ? 'Good'
                      : metrics.avgCpuUsage < 85
                        ? 'Moderate'
                        : 'High load'}
                </span>
              </div>
            </div>
            
            <div className="health-item">
              <span className="health-label">Servers</span>
              <div className={`health-status ${metrics.offlineServers === 0 ? 'healthy' : 'warning'}`}>
                <div className="status-dot"></div>
                <span>
                  {metrics.totalServers === 0
                    ? 'None registered'
                    : metrics.offlineServers === 0
                      ? 'All online'
                      : `${metrics.offlineServers} offline`}
                </span>
              </div>
            </div>
            
            <div className="health-item">
              <span className="health-label">Monitoring</span>
              <div className="health-status healthy">
                <div className="status-dot"></div>
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;