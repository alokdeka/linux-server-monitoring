import React, { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { ServerGrid } from '../components/servers';
import './Dashboard.css'; // For shared page header styles
import './Servers.css';

const Servers: React.FC = () => {
  const servers = useAppSelector((state) => state.servers.list);

  // Calculate server statistics
  const serverStats = useMemo(() => {
    const total = servers.length;
    const online = servers.filter(
      (server) => server.status === 'online'
    ).length;
    const warning = servers.filter(
      (server) => server.status === 'warning'
    ).length;
    const offline = servers.filter(
      (server) => server.status === 'offline'
    ).length;

    return { total, online, warning, offline };
  }, [servers]);

  return (
    <div className="servers-page">
      {/* Page Header */}
      <div className="dashboard-page-header">
        <div className="dashboard-header-content">
          <h1>Servers</h1>
          <p>Monitor and manage your server infrastructure</p>
        </div>
        <div className="dashboard-header-stats">
          <div className="dashboard-stat-item">
            <span className="dashboard-stat-label">Total Servers</span>
            <span className="dashboard-stat-value">{serverStats.total}</span>
          </div>
          <div className="dashboard-stat-item">
            <span className="dashboard-stat-label">Online</span>
            <span className="dashboard-stat-value dashboard-online">
              {serverStats.online}
            </span>
          </div>
          <div className="dashboard-stat-item">
            <span className="dashboard-stat-label">Issues</span>
            <span
              className={`dashboard-stat-value ${serverStats.warning + serverStats.offline > 0 ? 'dashboard-warning' : 'dashboard-online'}`}
            >
              {serverStats.warning + serverStats.offline}
            </span>
          </div>
        </div>
      </div>

      <div className="servers-content">
        <ServerGrid />
      </div>
    </div>
  );
};

export default Servers;
