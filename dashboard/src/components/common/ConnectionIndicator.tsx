// Connection status indicator component
// Shows real-time connection status and update information

import { useSelector } from 'react-redux';
import {
  selectConnectionStatus,
  selectRefreshInterval,
} from '../../store/selectors';
import './ConnectionIndicator.css';

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const ConnectionIndicator = ({
  showDetails = false,
  className = '',
}: ConnectionIndicatorProps) => {
  const connectionStatus = useSelector(selectConnectionStatus);
  const refreshInterval = useSelector(selectRefreshInterval);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'disconnected':
        return '🔴';
      case 'reconnecting':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Real-time updates active';
      case 'disconnected':
        return 'Using polling fallback';
      case 'reconnecting':
        return 'Reconnecting...';
      default:
        return 'Unknown status';
    }
  };

  const getUpdateFrequency = () => {
    if (connectionStatus === 'connected') {
      return 'Live updates';
    } else if (connectionStatus === 'disconnected') {
      return 'Updates every 60s';
    } else {
      return `Updates every ${refreshInterval / 1000}s`;
    }
  };

  return (
    <div className={`connection-indicator ${className}`}>
      <div className="connection-status-compact">
        <span className="status-icon" role="img" aria-label={getStatusText()}>
          {getStatusIcon()}
        </span>
        {showDetails && (
          <div className="connection-details">
            <span className="status-text">{getStatusText()}</span>
            <span className="update-frequency">{getUpdateFrequency()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionIndicator;
