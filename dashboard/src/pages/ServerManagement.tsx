import './ServerManagement.css';

const ServerManagement = () => {
  return (
    <div className="server-management-page">
      <div className="page-header">
        <h1>Server Management</h1>
        <p>Register new servers and manage API keys for monitoring agents.</p>
      </div>

      <div className="management-content">
        <div className="registration-section">
          <h2>Register New Server</h2>
          <div className="registration-form">
            <div className="form-group">
              <label>Server Name</label>
              <input type="text" placeholder="e.g., web-server-02" />
            </div>
            <div className="form-group">
              <label>IP Address</label>
              <input type="text" placeholder="e.g., 192.168.1.104" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" placeholder="e.g., Production web server" />
            </div>
            <button className="register-btn">Generate API Key</button>
          </div>
        </div>

        <div className="api-keys-section">
          <h2>API Keys</h2>
          <div className="api-key-list">
            <div className="api-key-item">
              <div className="key-info">
                <h3>web-server-01</h3>
                <p>192.168.1.100</p>
                <code>sk_live_abc123def456ghi789</code>
              </div>
              <div className="key-actions">
                <button className="regenerate-btn">Regenerate</button>
                <button className="revoke-btn">Revoke</button>
              </div>
            </div>

            <div className="api-key-item">
              <div className="key-info">
                <h3>db-server-01</h3>
                <p>192.168.1.101</p>
                <code>sk_live_xyz789uvw456rst123</code>
              </div>
              <div className="key-actions">
                <button className="regenerate-btn">Regenerate</button>
                <button className="revoke-btn">Revoke</button>
              </div>
            </div>

            <div className="api-key-item">
              <div className="key-info">
                <h3>api-server-01</h3>
                <p>192.168.1.102</p>
                <code>sk_live_mno456pqr789stu012</code>
              </div>
              <div className="key-actions">
                <button className="regenerate-btn">Regenerate</button>
                <button className="revoke-btn">Revoke</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerManagement;
