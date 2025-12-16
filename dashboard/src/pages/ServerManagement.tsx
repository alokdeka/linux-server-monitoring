import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import type { Server } from '../types';
import ConfirmationModal from '../components/common/ConfirmationModal';
import './ServerManagement.css';

interface ApiKeyInfo {
  serverId: string;
  hostname: string;
  ipAddress: string;
  apiKey: string;
  registeredAt: string;
}

const ServerManagement = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const [formData, setFormData] = useState({
    hostname: '',
    ipAddress: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState({
    hostname: '',
    ipAddress: '',
  });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const serverData = await apiClient.getServers();
      setServers(serverData);

      const keyData: ApiKeyInfo[] = serverData.map((server) => ({
        serverId: server.id,
        hostname: server.hostname,
        ipAddress: server.ipAddress,
        apiKey: '••••••••••••••••••••',
        registeredAt: server.registeredAt,
      }));
      setApiKeys(keyData);
    } catch (err) {
      setError('Failed to load servers. Please try again.');
      console.error('Error loading servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors = { hostname: '', ipAddress: '' };
    let isValid = true;

    if (!formData.hostname.trim()) {
      errors.hostname = 'Server name is required';
      isValid = false;
    } else if (formData.hostname.length < 3) {
      errors.hostname = 'Server name must be at least 3 characters';
      isValid = false;
    }

    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!formData.ipAddress.trim()) {
      errors.ipAddress = 'IP address is required';
      isValid = false;
    } else if (!ipRegex.test(formData.ipAddress)) {
      errors.ipAddress = 'Please enter a valid IP address';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRegisterServer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.registerServer({
        hostname: formData.hostname,
        ipAddress: formData.ipAddress,
      });

      const newApiKey: ApiKeyInfo = {
        serverId: `${formData.hostname}-${Date.now()}`,
        hostname: formData.hostname,
        ipAddress: formData.ipAddress,
        apiKey: response.apiKey,
        registeredAt: new Date().toISOString(),
      };

      setApiKeys((prev) => [newApiKey, ...prev]);
      setSuccess(`Server "${formData.hostname}" registered successfully!`);
      setFormData({ hostname: '', ipAddress: '', description: '' });
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register server. Please try again.');
      console.error('Error registering server:', err);
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(null), 3000);
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const getInstallCommand = (apiKey: string) => {
    return `curl -sSL https://your-server/install-agent.sh | bash -s -- --api-key="${apiKey}" --server-url="http://localhost:8000"`;
  };

  const handleRegenerateKey = (serverId: string, hostname: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Regenerate API Key',
      message: `Are you sure you want to regenerate the API key for "${hostname}"? The old key will be deactivated.`,
      type: 'warning',
      confirmText: 'Regenerate Key',
      onConfirm: () => performRegenerateKey(serverId, hostname),
    });
  };

  const performRegenerateKey = async (serverId: string, hostname: string) => {
    setModalConfig(null);
    setRegenerating(serverId);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.regenerateServerKey(serverId, `Regenerated key for ${hostname}`);
      setApiKeys((prev) => prev.map((key) => key.serverId === serverId ? { ...key, apiKey: response.apiKey } : key));
      setSuccess(`API key regenerated successfully for "${hostname}"!`);
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key. Please try again.');
      console.error('Error regenerating API key:', err);
    } finally {
      setRegenerating(null);
    }
  };

  const handleRevokeServer = (serverId: string, hostname: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Revoke Server',
      message: `Are you sure you want to revoke and remove server "${hostname}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Revoke Server',
      onConfirm: () => performRevokeServer(serverId, hostname),
    });
  };

  const performRevokeServer = async (serverId: string, hostname: string) => {
    setModalConfig(null);
    setRevoking(serverId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.revokeServer(serverId);
      setApiKeys((prev) => prev.filter((key) => key.serverId !== serverId));
      setServers((prev) => prev.filter((server) => server.id !== serverId));
      setSuccess(`Server "${hostname}" has been revoked and removed successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke server. Please try again.');
      console.error('Error revoking server:', err);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Servers</h2>
          <p>Gathering server management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">✅</div>
          <div>
            <h3>Success</h3>
            <p>{success}</p>
          </div>
          <button className="alert-close" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="management-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Register New Server</h2>
          </div>
          <form className="server-form" onSubmit={handleRegisterServer}>
            <div className="form-group">
              <label htmlFor="hostname">Server Name *</label>
              <input
                type="text"
                id="hostname"
                name="hostname"
                value={formData.hostname}
                onChange={handleInputChange}
                placeholder="e.g., web-server-02"
                className={formErrors.hostname ? 'error' : ''}
                disabled={registering}
              />
              {formErrors.hostname && <span className="error-text">{formErrors.hostname}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="ipAddress">IP Address *</label>
              <input
                type="text"
                id="ipAddress"
                name="ipAddress"
                value={formData.ipAddress}
                onChange={handleInputChange}
                placeholder="e.g., 192.168.1.104"
                className={formErrors.ipAddress ? 'error' : ''}
                disabled={registering}
              />
              {formErrors.ipAddress && <span className="error-text">{formErrors.ipAddress}</span>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={registering}>
              {registering ? (
                <>
                  <div className="loading-spinner small"></div>
                  Registering...
                </>
              ) : (
                'Generate API Key'
              )}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Registered Servers ({apiKeys.length})</h2>
          </div>
          
          {apiKeys.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="4" rx="1"/>
                <rect x="2" y="9" width="20" height="4" rx="1"/>
                <rect x="2" y="15" width="20" height="4" rx="1"/>
                <line x1="6" y1="5" x2="6.01" y2="5"/>
                <line x1="6" y1="11" x2="6.01" y2="11"/>
                <line x1="6" y1="17" x2="6.01" y2="17"/>
              </svg>
              <h3>No servers registered</h3>
              <p>Register your first server to get started with monitoring</p>
            </div>
          ) : (
            <div className="server-list">
              {apiKeys.map((keyInfo) => (
                <div key={keyInfo.serverId} className="server-item">
                  <div className="server-info">
                    <div className="server-header">
                      <h3>{keyInfo.hostname}</h3>
                      <span className={`status-badge ${servers.find((s) => s.hostname === keyInfo.hostname)?.status || 'unknown'}`}>
                        {servers.find((s) => s.hostname === keyInfo.hostname)?.status || 'unknown'}
                      </span>
                    </div>
                    <p className="server-ip">{keyInfo.ipAddress}</p>
                    <div className="api-key-display">
                      <code>{keyInfo.apiKey}</code>
                      <button className="btn-icon" onClick={() => copyToClipboard(keyInfo.apiKey)} title="Copy API key">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                          <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                      </button>
                    </div>
                    <p className="registered-date">
                      Registered: {new Date(keyInfo.registeredAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="server-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard(getInstallCommand(keyInfo.apiKey))}
                      title="Copy installation command"
                    >
                      Copy Install Command
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={() => handleRegenerateKey(keyInfo.serverId, keyInfo.hostname)}
                      disabled={regenerating === keyInfo.serverId || revoking === keyInfo.serverId}
                    >
                      {regenerating === keyInfo.serverId ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRevokeServer(keyInfo.serverId, keyInfo.hostname)}
                      disabled={regenerating === keyInfo.serverId || revoking === keyInfo.serverId}
                    >
                      {revoking === keyInfo.serverId ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalConfig && (
        <ConfirmationModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          confirmText={modalConfig.confirmText}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
          isLoading={regenerating !== null || revoking !== null}
        />
      )}
    </div>
  );
};

export default ServerManagement;