import './Servers.css';

const Servers = () => {
  return (
    <div className="servers-page">
      <div className="page-header">
        <h1>Servers</h1>
        <p>
          Manage and monitor all your servers from this centralized dashboard.
        </p>
      </div>

      <div className="servers-grid">
        <div className="server-card">
          <div className="server-status online"></div>
          <div className="server-info">
            <h3>web-server-01</h3>
            <p>192.168.1.100</p>
            <div className="server-metrics">
              <span>CPU: 45%</span>
              <span>RAM: 62%</span>
              <span>Disk: 78%</span>
            </div>
          </div>
        </div>

        <div className="server-card">
          <div className="server-status online"></div>
          <div className="server-info">
            <h3>db-server-01</h3>
            <p>192.168.1.101</p>
            <div className="server-metrics">
              <span>CPU: 23%</span>
              <span>RAM: 84%</span>
              <span>Disk: 45%</span>
            </div>
          </div>
        </div>

        <div className="server-card">
          <div className="server-status warning"></div>
          <div className="server-info">
            <h3>api-server-01</h3>
            <p>192.168.1.102</p>
            <div className="server-metrics">
              <span>CPU: 89%</span>
              <span>RAM: 76%</span>
              <span>Disk: 34%</span>
            </div>
          </div>
        </div>

        <div className="server-card">
          <div className="server-status offline"></div>
          <div className="server-info">
            <h3>backup-server-01</h3>
            <p>192.168.1.103</p>
            <div className="server-metrics">
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Servers;
