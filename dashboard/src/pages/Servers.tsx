import React from 'react';
import { useAppSelector } from '../store/hooks';
import { ServerGrid } from '../components/servers';
import './Servers.css';

const Servers: React.FC = () => {
  const servers = useAppSelector((state) => state.servers.list);
  const activeAlerts = useAppSelector((state) => state.alerts.active);

  const totalServers = servers.length;
  const onlineServers = servers.filter(server => server.status === 'online').length;
  const alertCount = activeAlerts.length;

  return (
    <div className="servers-page">
      <div className="servers-header">
        <div className="header-content">
          <h1>Server Infrastructure</h1>
          <p>Monitor and manage your server fleet in real-time</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Total Servers</span>
            <span className="stat-value">{totalServers}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Online</span>
            <span className="stat-value online">{onlineServers}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Alerts</span>
            <span className="stat-value warning">{alertCount}</span>
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