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
      // Navigate to server details page
      navigate(`/servers/${server.id}`);
    }
  };

  const formatUptime = (uptime: number): string => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatLastSeen = (lastSeen: string): string => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getStatusClass = (status: Server['status']): string => {
    switch (status) {
      case 'online':
        return 'server-status online';
      case 'warning':
        return 'server-status warning';
      case 'offline':
        return 'server-status offline';
      default:
        return 'server-status offline';
    }
  };

  const renderMetrics = () => {
    if (server.status === 'offline') {
      return (
        <div className="server-metrics">
          <span className="metric offline">Offline</span>
          <span className="metric last-seen">
            Last seen: {formatLastSeen(server.lastSeen)}
          </span>
        </div>
      );
    }

    if (!server.currentMetrics) {
      return (
        <div className="server-metrics">
          <span className="metric loading">Loading metrics...</span>
        </div>
      );
    }

    const { cpuUsage, memory, diskUsage, uptime } = server.currentMetrics;
    const primaryDisk =
      diskUsage.find((disk) => disk.mountpoint === '/') || diskUsage[0];

    return (
      <div className="server-metrics">
        <span className="metric cpu">CPU: {Math.round(cpuUsage)}%</span>
        <span className="metric memory">
          RAM: {Math.round(memory.percentage)}%
        </span>
        {primaryDisk && (
          <span className="metric disk">
            Disk: {Math.round(primaryDisk.percentage)}%
          </span>
        )}
        <span className="metric uptime">Uptime: {formatUptime(uptime)}</span>
      </div>
    );
  };

  return (
    <div
      className="server-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={getStatusClass(server.status)}></div>
      <div className="server-info">
        <h3>{server.hostname}</h3>
        <p className="server-ip">{server.ipAddress}</p>
        {renderMetrics()}
      </div>
    </div>
  );
};

export default ServerCard;
