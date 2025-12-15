import './Footer.css';

interface FooterProps {
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  lastUpdate?: Date;
}

const Footer = ({
  connectionStatus = 'connected',
  lastUpdate,
}: FooterProps) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#10b981'; // green
      case 'disconnected':
        return '#ef4444'; // red
      case 'connecting':
        return '#f59e0b'; // yellow
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Unknown';
    }
  };

  const formatLastUpdate = (date: Date) => {
    return date.toLocaleTimeString();
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="connection-status">
            <div
              className="status-indicator"
              style={{ backgroundColor: getStatusColor() }}
              aria-label={`Connection status: ${getStatusText()}`}
            />
            <span className="status-text">{getStatusText()}</span>
          </div>
        </div>

        <div className="footer-center">
          {lastUpdate && (
            <span className="last-update">
              Last updated: {formatLastUpdate(lastUpdate)}
            </span>
          )}
        </div>

        <div className="footer-right">
          <span className="footer-info">Server Health Monitor v1.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
