import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Server } from '../../types';
import './ServerCard.css';

interface ServerCardProps {
  server: Server;
  onClick?: (server: Server) => void;
}

const ServerCard: React.FC<ServerCardProps> = ({ server, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(server);
    } else {
      navigate(`/servers/${server.id}`);
    }
  };

  const formatUptime = (uptime: number): string => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor((uptime % 3600) / 60)}m`;
  };

  const formatLastSeen = (lastSeen: string): string => {
    const diffMinutes = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const getStatusClass = (status: Server['status']) => {
    switch (status) {
      case 'online': return 'online';
      case 'warning': return 'warning';
      case 'offline': return 'offline';
      default: return 'offline';
    }
  };

  return (
    <div className="server-card" onClick={handleClick}>
      <div className="server-header">
        <div className="server-info">
          <h3>{server.hostname}</h3>
          <span className="server-ip">{server.ipAddress}</span>
        </div>
        <div className={`server-status ${getStatusClass(server.status)}`}>
          {server.status}
        </div>
      </div>

      {server.status === 'offline' ? (
        <div className="server-offline">
          <p>Server Offline</p>
          <span>Last seen {formatLastSeen(server.lastSeen)}</span>
        </div>
      ) : !server.currentMetrics ? (
        <div className="server-loading">
          <p>Loading metrics...</p>
        </div>
      ) : (
        <div className="server-metrics">
          <div className="metric">
            <span>CPU</span>
            <span className="metric-value">{Math.round(server.currentMetrics.cpuUsage)}%</span>
          </div>
          <div className="metric">
            <span>Memory</span>
            <span className="metric-value">{Math.round(server.currentMetrics.memory.percentage)}%</span>
          </div>
          {server.currentMetrics.diskUsage.length > 0 && (
            <div className="metric">
              <span>Disk</span>
              <span className="metric-value">{Math.round(server.currentMetrics.diskUsage[0].percentage)}%</span>
            </div>
          )}
          <div className="metric">
            <span>Uptime</span>
            <span className="metric-value">{formatUptime(server.currentMetrics.uptime)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerCard;