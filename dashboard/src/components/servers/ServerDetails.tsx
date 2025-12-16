import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchServerMetrics } from '../../store/slices/metricsSlice';
import { fetchServers } from '../../store/slices/serversSlice';
import MetricsChart from './MetricsChart';
import type { ServerMetrics, FailedService } from '../../types';
import './ServerDetails.css';

export type TimeRange = '1h' | '6h' | '24h' | '7d';

const ServerDetails: React.FC = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');
  const [isLoading, setIsLoading] = useState(true);

  const { list: servers, loading: serversLoading } = useSelector(
    (state: RootState) => state.servers
  );
  const { historical, loading: metricsLoading } = useSelector(
    (state: RootState) => state.metrics
  );

  const server = servers.find((s) => s.id === serverId);
  const serverMetrics = serverId ? historical[serverId] || [] : [];

  useEffect(() => {
    if (!serverId) {
      navigate('/servers');
      return;
    }

    // Fetch servers if not already loaded
    if (servers.length === 0 && !serversLoading) {
      dispatch(fetchServers());
    }

    // Fetch metrics for the selected time range
    dispatch(fetchServerMetrics({ serverId, timeRange: selectedTimeRange }));
  }, [
    dispatch,
    serverId,
    selectedTimeRange,
    servers.length,
    serversLoading,
    navigate,
  ]);

  useEffect(() => {
    setIsLoading(serversLoading || metricsLoading);
  }, [serversLoading, metricsLoading]);

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setSelectedTimeRange(timeRange);
  };

  const handleBackClick = () => {
    navigate('/servers');
  };

  const formatUptime = (uptime: number): string => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    if (days > 0) {
      return `${days} days, ${hours} hours`;
    } else if (hours > 0) {
      return `${hours} hours, ${minutes} minutes`;
    } else {
      return `${minutes} minutes`;
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'online':
        return 'status-indicator online';
      case 'warning':
        return 'status-indicator warning';
      case 'offline':
        return 'status-indicator offline';
      default:
        return 'status-indicator offline';
    }
  };

  const renderFailedServices = (failedServices: FailedService[]) => {
    if (failedServices.length === 0) {
      return (
        <div className="no-failed-services">
          <p>✅ All services are running normally</p>
        </div>
      );
    }

    return (
      <div className="failed-services-list">
        {failedServices.map((service, index) => (
          <div key={`${service.name}-${index}`} className="failed-service-item">
            <div className="service-info">
              <span className="service-name">{service.name}</span>
              <span className="service-status">{service.status}</span>
            </div>
            <div className="service-timestamp">
              Since: {new Date(service.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSystemInfo = (metrics: ServerMetrics) => {
    const { loadAverage, memory, uptime } = metrics;
    const primaryDisk =
      metrics.diskUsage.find((disk) => disk.mountpoint === '/') ||
      metrics.diskUsage[0];

    return (
      <div className="system-info-grid">
        <div className="info-card">
          <h4>Load Average</h4>
          <div className="load-values">
            <span>1m: {loadAverage.oneMin.toFixed(2)}</span>
            <span>5m: {loadAverage.fiveMin.toFixed(2)}</span>
            <span>15m: {loadAverage.fifteenMin.toFixed(2)}</span>
          </div>
        </div>

        <div className="info-card">
          <h4>Memory</h4>
          <div className="memory-info">
            <div>Total: {formatBytes(memory.total)}</div>
            <div>Used: {formatBytes(memory.used)}</div>
            <div>Usage: {Math.round(memory.percentage)}%</div>
          </div>
        </div>

        <div className="info-card">
          <h4>Uptime</h4>
          <div className="uptime-info">{formatUptime(uptime)}</div>
        </div>

        {primaryDisk && (
          <div className="info-card">
            <h4>Primary Disk ({primaryDisk.mountpoint})</h4>
            <div className="disk-info">
              <div>Total: {formatBytes(primaryDisk.total)}</div>
              <div>Used: {formatBytes(primaryDisk.used)}</div>
              <div>Usage: {Math.round(primaryDisk.percentage)}%</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading && !server) {
    return (
      <div className="server-details loading">
        <div className="loading-spinner">Loading server details...</div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="server-details error">
        <div className="error-message">
          <h2>Server Not Found</h2>
          <p>The requested server could not be found.</p>
          <button onClick={handleBackClick} className="back-button">
            Back to Servers
          </button>
        </div>
      </div>
    );
  }

  const latestMetrics =
    serverMetrics.length > 0 ? serverMetrics[serverMetrics.length - 1] : null;

  return (
    <div className="server-details">
      <div className="server-details-header">
        <button onClick={handleBackClick} className="back-button">
          ← Back to Servers
        </button>
        <div className="server-title">
          <h1>{server.hostname}</h1>
          <div className="server-meta">
            <span className={getStatusClass(server.status)}></span>
            <span className="server-ip">{server.ipAddress}</span>
            <span className="last-seen">
              Last seen: {new Date(server.lastSeen).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="time-range-selector">
        <h3>Time Range</h3>
        <div className="time-range-buttons">
          {(['1h', '6h', '24h', '7d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              className={`time-range-button ${
                selectedTimeRange === range ? 'active' : ''
              }`}
              onClick={() => handleTimeRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {serverMetrics.length > 0 ? (
        <>
          <div className="metrics-charts">
            <div className="chart-container">
              <MetricsChart
                data={serverMetrics}
                metricType="cpu"
                height={250}
              />
            </div>
            <div className="chart-container">
              <MetricsChart
                data={serverMetrics}
                metricType="memory"
                height={250}
              />
            </div>
            <div className="chart-container">
              <MetricsChart
                data={serverMetrics}
                metricType="disk"
                height={250}
              />
            </div>
          </div>

          {latestMetrics && (
            <>
              <div className="system-information">
                <h3>System Information</h3>
                {renderSystemInfo(latestMetrics)}
              </div>

              <div className="failed-services">
                <h3>Service Status</h3>
                {renderFailedServices(latestMetrics.failedServices)}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="no-metrics">
          <h3>No Metrics Available</h3>
          <p>
            No metrics data is available for this server in the selected time
            range.
            {server.status === 'offline' &&
              ' The server appears to be offline.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ServerDetails;
