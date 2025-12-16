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
  const [regenerating, setRegenerating] = useState<string | null>(null); // serverId being regenerated
  const [revoking, setRevoking] = useState<string | null>(null); // serverId being revoked
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    hostname: '',
    ipAddress: '',
    description: '',
  });

  // Form validation
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

      // Convert servers to API key format for display
      const keyData: ApiKeyInfo[] = serverData.map((server) => ({
        serverId: server.id,
        hostname: server.hostname,
        ipAddress: server.ipAddress,
        apiKey: '••••••••••••••••••••', // Masked for security
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

    // Validate hostname
    if (!formData.hostname.trim()) {
      errors.hostname = 'Server name is required';
      isValid = false;
    } else if (formData.hostname.length < 3) {
      errors.hostname = 'Server name must be at least 3 characters';
      isValid = false;
    }

    // Validate IP address
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
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

    // Clear errors when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRegisterServer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.registerServer({
        hostname: formData.hostname,
        ipAddress: formData.ipAddress,
      });

      // Add new server to the list
      const newApiKey: ApiKeyInfo = {
        serverId: `${formData.hostname}-${Date.now()}`,
        hostname: formData.hostname,
        ipAddress: formData.ipAddress,
        apiKey: response.apiKey,
        registeredAt: new Date().toISOString(),
      };

      setApiKeys((prev) => [newApiKey, ...prev]);
      setSuccess(
        `Server "${formData.hostname}" registered successfully! API Key: ${response.apiKey}`
      );

      // Reset form
      setFormData({ hostname: '', ipAddress: '', description: '' });

      // Reload servers to get updated list
      await loadServers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to register server. Please try again.'
      );
      console.error('Error registering server:', err);
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSuccess('API key copied to clipboard!');
        setTimeout(() => setSuccess(null), 3000);
      })
      .catch(() => {
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
      message: `Are you sure you want to regenerate the API key for "${hostname}"? The old key will be deactivated and any agents using it will need to be updated.`,
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
      const response = await apiClient.regenerateServerKey(
        serverId,
        `Regenerated key for ${hostname}`
      );

      // Update the API key in the list
      setApiKeys((prev) =>
        prev.map((key) =>
          key.serverId === serverId ? { ...key, apiKey: response.apiKey } : key
        )
      );

      setSuccess(
        `API key regenerated successfully for "${hostname}"! New key: ${response.apiKey}`
      );

      // Reload servers to get updated data
      await loadServers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to regenerate API key. Please try again.'
      );
      console.error('Error regenerating API key:', err);
    } finally {
      setRegenerating(null);
    }
  };

  const handleRevokeServer = (serverId: string, hostname: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Revoke Server',
      message: `Are you sure you want to revoke and remove server "${hostname}"? This will permanently delete the server and deactivate its API key. This action cannot be undone.`,
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

      // Remove the server from the lists
      setApiKeys((prev) => prev.filter((key) => key.serverId !== serverId));
      setServers((prev) => prev.filter((server) => server.id !== serverId));

      setSuccess(
        `Server "${hostname}" has been revoked and removed successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to revoke server. Please try again.'
      );
      console.error('Error revoking server:', err);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="server-management-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="server-management-page">
      <div className="page-header">
        <h1>Server Management</h1>
        <p>Register new servers and manage API keys for monitoring agents.</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
          <button className="alert-close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
          <button className="alert-close" onClick={() => setSuccess(null)}>
            ×
          </button>
        </div>
      )}

      <div className="management-content">
        <div className="registration-section">
          <h2>Register New Server</h2>
          <form className="registration-form" onSubmit={handleRegisterServer}>
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
              {formErrors.hostname && (
                <span className="error-text">{formErrors.hostname}</span>
              )}
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
              {formErrors.ipAddress && (
                <span className="error-text">{formErrors.ipAddress}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g., Production web server"
                disabled={registering}
              />
            </div>

            <button
              type="submit"
              className="register-btn"
              disabled={registering}
            >
              {registering ? (
                <>
                  <span className="loading-spinner small"></span>
                  Registering...
                </>
              ) : (
                'Generate API Key'
              )}
            </button>
          </form>
        </div>

        <div className="api-keys-section">
          <h2>Registered Servers ({apiKeys.length})</h2>

          {apiKeys.length === 0 ? (
            <div className="empty-state">
              <p>
                No servers registered yet. Register your first server above to
                get started!
              </p>
            </div>
          ) : (
            <div className="api-key-list">
              {apiKeys.map((keyInfo) => (
                <div key={keyInfo.serverId} className="api-key-item">
                  <div className="key-info">
                    <div className="server-header">
                      <h3>{keyInfo.hostname}</h3>
                      <span
                        className={`server-status status-${servers.find((s) => s.hostname === keyInfo.hostname)?.status || 'unknown'}`}
                      >
                        {servers.find((s) => s.hostname === keyInfo.hostname)
                          ?.status || 'unknown'}
                      </span>
                    </div>
                    <p className="server-ip">{keyInfo.ipAddress}</p>
                    <div className="api-key-display">
                      <code>{keyInfo.apiKey}</code>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(keyInfo.apiKey)}
                        title="Copy API key"
                      >
                        📋
                      </button>
                    </div>
                    <p className="registered-date">
                      Registered:{' '}
                      {new Date(keyInfo.registeredAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="key-actions">
                    <button
                      className="install-btn"
                      onClick={() =>
                        copyToClipboard(getInstallCommand(keyInfo.apiKey))
                      }
                      title="Copy installation command"
                    >
                      Copy Install Command
                    </button>
                    <button
                      className="regenerate-btn"
                      onClick={() =>
                        handleRegenerateKey(keyInfo.serverId, keyInfo.hostname)
                      }
                      disabled={
                        regenerating === keyInfo.serverId ||
                        revoking === keyInfo.serverId
                      }
                      title="Regenerate API key for this server"
                    >
                      {regenerating === keyInfo.serverId ? (
                        <>
                          <span className="loading-spinner small"></span>
                          Regenerating...
                        </>
                      ) : (
                        'Regenerate'
                      )}
                    </button>
                    <button
                      className="revoke-btn"
                      onClick={() =>
                        handleRevokeServer(keyInfo.serverId, keyInfo.hostname)
                      }
                      disabled={
                        regenerating === keyInfo.serverId ||
                        revoking === keyInfo.serverId
                      }
                      title="Revoke and remove this server"
                    >
                      {revoking === keyInfo.serverId ? (
                        <>
                          <span className="loading-spinner small"></span>
                          Revoking...
                        </>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="installation-guide">
          <h2>Installation Instructions</h2>
          <div className="guide-content">
            <p>
              After registering a server, follow these steps to install the
              monitoring agent:
            </p>
            <ol>
              <li>Copy the installation command from the server entry above</li>
              <li>SSH into your target server</li>
              <li>Run the installation command as root or with sudo</li>
              <li>
                The agent will start automatically and begin sending metrics
              </li>
            </ol>
            <div className="note">
              <strong>Note:</strong> Make sure your server can reach the
              monitoring system at the configured URL.
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
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
