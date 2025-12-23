import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import type { Server } from '../types';
import ConfirmationModal from '../components/common/ConfirmationModal';
import './Dashboard.css'; // For shared page header styles
import './ServerManagement.css';

interface ApiKeyInfo {
  serverId: string;
  hostname: string;
  ipAddress: string;
  apiKey: string;
  registeredAt: string;
  isNewlyGenerated?: boolean; // Track if this is a newly generated key
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
    loadServers(); // Initial load - no need to preserve keys
  }, []);

  const loadServers = async (preserveNewKeys = false) => {
    try {
      setLoading(true);
      const serverData = await apiClient.getServers();
      setServers(serverData);

      if (preserveNewKeys) {
        // When preserving new keys, only update servers that don't have newly generated keys
        setApiKeys((prevKeys) => {
          const newKeyData = serverData.map((server) => ({
            serverId: server.id,
            hostname: server.hostname,
            ipAddress: server.ipAddress,
            apiKey: '••••••••••••••••••••', // Mask existing keys for security
            registeredAt: server.registeredAt,
            isNewlyGenerated: false, // These are existing keys, so mask them
          }));

          // Preserve any newly generated keys
          const preservedKeys = prevKeys.filter((key) => key.isNewlyGenerated);

          // Merge: keep newly generated keys, add/update others with masked keys
          const mergedKeys = [...preservedKeys];
          newKeyData.forEach((newKey) => {
            const existingNewKey = preservedKeys.find(
              (pk) =>
                pk.hostname === newKey.hostname &&
                pk.ipAddress === newKey.ipAddress
            );
            if (!existingNewKey) {
              mergedKeys.push(newKey);
            }
          });

          return mergedKeys;
        });
      } else {
        // Normal load - mask all keys
        const keyData: ApiKeyInfo[] = serverData.map((server) => ({
          serverId: server.id,
          hostname: server.hostname,
          ipAddress: server.ipAddress,
          apiKey: '••••••••••••••••••••', // Mask existing keys for security
          registeredAt: server.registeredAt,
          isNewlyGenerated: false, // These are existing keys, so mask them
        }));
        setApiKeys(keyData);
      }
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

    // More flexible IP validation - accepts IPv4 addresses and localhost
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$|^127\.0\.0\.1$/;

    if (!formData.ipAddress.trim()) {
      errors.ipAddress = 'IP address is required';
      isValid = false;
    } else if (!ipRegex.test(formData.ipAddress.trim())) {
      errors.ipAddress =
        'Please enter a valid IP address (e.g., 192.168.1.100, localhost, or 127.0.0.1)';
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
        serverId: response.server_id, // Use the real server ID from the API response
        hostname: formData.hostname,
        ipAddress: formData.ipAddress,
        apiKey: response.apiKey,
        registeredAt: new Date().toISOString(),
        isNewlyGenerated: true, // Mark as newly generated so we show the real key
      };

      setApiKeys((prev) => [newApiKey, ...prev]);
      setSuccess(`Server "${formData.hostname}" registered successfully!`);
      setFormData({ hostname: '', ipAddress: '', description: '' });
      // Don't reload servers - we already have the new data
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
    // Check if the text contains masked characters
    if (text.includes('••••')) {
      setError('Cannot copy masked API key. Please regenerate the key first.');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setSuccess('Copied to clipboard!');
          setTimeout(() => setSuccess(null), 3000);
        })
        .catch((err) => {
          console.error('Clipboard API failed:', err);
          // Fallback to manual copy
          fallbackCopyToClipboard(text);
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to copy to clipboard. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      setError('Failed to copy to clipboard. Please copy manually.');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const getInstallCommand = (apiKey: string) => {
    // Get the network IP from environment variable or use current host
    const networkIP = import.meta.env.VITE_NETWORK_IP;
    const currentHost = window.location.hostname;

    // Use network IP if available and we're on localhost, otherwise use current host
    let serverHost = currentHost;
    if (
      networkIP &&
      (currentHost === 'localhost' || currentHost === '127.0.0.1')
    ) {
      serverHost = networkIP;
    }

    const serverUrl = `http://${serverHost}:8000`;
    return `curl -sSL ${serverUrl}/install-agent.sh | bash -s -- --api-key="${apiKey}" --server-url="${serverUrl}"`;
  };

  const getRemoteInstallCommand = (apiKey: string) => {
    // For remote servers, use GitHub for the install script
    // Replace YOUR_PUBLIC_IP with your actual public IP (e.g., 49.37.103.229) or ngrok URL
    return `curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/master/install-agent.sh | bash -s -- --api-key="${apiKey}" --server-url="http://YOUR_PUBLIC_IP:8000"`;
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
      const response = await apiClient.regenerateServerKey(
        serverId,
        `Regenerated key for ${hostname}`
      );
      setApiKeys((prev) =>
        prev.map((key) =>
          key.serverId === serverId
            ? { ...key, apiKey: response.apiKey, isNewlyGenerated: true }
            : key
        )
      );
      setSuccess(`API key regenerated successfully for "${hostname}"!`);
      // Don't reload servers - we already updated the key in state
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
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Servers</h2>
          <p>Gathering server management data...</p>
        </div>
      </div>
    );
  }

  const managementStats = {
    totalServers: servers.length,
    activeServers: servers.filter((server) => server.isActive).length,
    totalApiKeys: apiKeys.length,
  };

  return (
    <div className="server-management-page">
      {/* Page Header */}
      <div className="dashboard-page-header">
        <div className="dashboard-header-content">
          <h1>Server Management</h1>
          <p>Register new servers and manage API keys</p>
        </div>
        <div className="dashboard-header-stats">
          <div className="dashboard-stat-item">
            <span className="dashboard-stat-label">Registered</span>
            <span className="dashboard-stat-value">
              {managementStats.totalServers}
            </span>
          </div>
          <div className="dashboard-stat-item">
            <span className="dashboard-stat-label">Active</span>
            <span className="dashboard-stat-value dashboard-online">
              {managementStats.activeServers}
            </span>
          </div>
          <div className="dashboard-stat-item">
            <span className="dashboard-stat-label">API Keys</span>
            <span className="dashboard-stat-value">
              {managementStats.totalApiKeys}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
          <button className="alert-close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">✅</div>
          <div>
            <h3>Success</h3>
            <p>{success}</p>
          </div>
          <button className="alert-close" onClick={() => setSuccess(null)}>
            ×
          </button>
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
              <small className="form-help">
                💡 This is the IP address of the server you want to monitor
                (where you'll install the agent)
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={registering}
            >
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="4" rx="1" />
                <rect x="2" y="9" width="20" height="4" rx="1" />
                <rect x="2" y="15" width="20" height="4" rx="1" />
                <line x1="6" y1="5" x2="6.01" y2="5" />
                <line x1="6" y1="11" x2="6.01" y2="11" />
                <line x1="6" y1="17" x2="6.01" y2="17" />
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
                      <span
                        className={`status-badge ${servers.find((s) => s.hostname === keyInfo.hostname)?.status || 'unknown'}`}
                      >
                        {servers.find((s) => s.hostname === keyInfo.hostname)
                          ?.status || 'unknown'}
                      </span>
                    </div>
                    <p className="server-ip">{keyInfo.ipAddress}</p>
                    <div className="api-key-display">
                      <code>{keyInfo.apiKey}</code>
                      <button
                        className="btn-icon"
                        onClick={() => copyToClipboard(keyInfo.apiKey)}
                        title="Copy API key"
                        disabled={
                          !keyInfo.isNewlyGenerated &&
                          keyInfo.apiKey.includes('••••')
                        }
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                          />
                          <path d="m4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                    {!keyInfo.isNewlyGenerated &&
                      keyInfo.apiKey.includes('••••') && (
                        <p className="key-note">
                          <small>
                            🔒 API key is hidden for security. Regenerate to see
                            the new key.
                          </small>
                        </p>
                      )}
                    <p className="registered-date">
                      Registered:{' '}
                      {new Date(keyInfo.registeredAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="server-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        copyToClipboard(getInstallCommand(keyInfo.apiKey))
                      }
                      title="Copy installation command for local network"
                      disabled={
                        !keyInfo.isNewlyGenerated &&
                        keyInfo.apiKey.includes('••••')
                      }
                    >
                      {!keyInfo.isNewlyGenerated &&
                      keyInfo.apiKey.includes('••••')
                        ? 'Regenerate Key First'
                        : 'Copy Local Install'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        copyToClipboard(getRemoteInstallCommand(keyInfo.apiKey))
                      }
                      title="Copy installation command for remote servers"
                      disabled={
                        !keyInfo.isNewlyGenerated &&
                        keyInfo.apiKey.includes('••••')
                      }
                    >
                      {!keyInfo.isNewlyGenerated &&
                      keyInfo.apiKey.includes('••••')
                        ? 'Regenerate Key First'
                        : 'Copy Remote Install'}
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={() =>
                        handleRegenerateKey(keyInfo.serverId, keyInfo.hostname)
                      }
                      disabled={
                        regenerating === keyInfo.serverId ||
                        revoking === keyInfo.serverId
                      }
                    >
                      {regenerating === keyInfo.serverId
                        ? 'Regenerating...'
                        : 'Regenerate'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        handleRevokeServer(keyInfo.serverId, keyInfo.hostname)
                      }
                      disabled={
                        regenerating === keyInfo.serverId ||
                        revoking === keyInfo.serverId
                      }
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
