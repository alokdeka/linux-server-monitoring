// API client for communicating with the FastAPI backend
// Based on the design document specifications

import type {
  Server,
  ServerMetrics,
  Alert,
  DashboardSettings,
  LoginCredentials,
  AuthToken,
  User,
} from '../types';
import { handleApiError } from './errorHandler';
import { environment } from '../config/environment';

export interface ServerRegistrationData {
  hostname: string;
  ipAddress: string;
}

export interface AlertFilters {
  serverId?: string;
  severity?: 'warning' | 'critical';
  startDate?: string;
  endDate?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  components: {
    database: string;
    api: string;
  };
}

export interface ApiClient {
  // Server data
  getServers(): Promise<Server[]>;
  getServerMetrics(
    serverId: string,
    timeRange: string
  ): Promise<ServerMetrics[]>;
  registerServer(
    serverData: ServerRegistrationData
  ): Promise<{ apiKey: string; server_id: string; key_id: string }>;
  regenerateServerKey(
    serverId: string,
    description?: string
  ): Promise<{ apiKey: string; keyId: string }>;
  revokeServer(serverId: string): Promise<void>;
  getServerHealth(): Promise<HealthCheckResponse>;

  // Authentication
  login(credentials: LoginCredentials): Promise<AuthToken>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthToken>;
  getCurrentUser(): Promise<User>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  getAlertHistory(filters: AlertFilters): Promise<Alert[]>;

  // Settings
  getSettings(): Promise<DashboardSettings>;
  updateSettings(settings: DashboardSettings): Promise<void>;
}

// Enhanced API client implementation with comprehensive error handling and interceptors
class ApiClientImpl implements ApiClient {
  private baseUrl = environment.apiBaseUrl;
  private requestInterceptors: Array<(config: RequestInit) => RequestInit> = [];
  private responseInterceptors: Array<
    (response: Response) => Response | Promise<Response>
  > = [];

  constructor() {
    // Add default request interceptor for authentication
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    });

    // Add default response interceptor for token refresh
    this.addResponseInterceptor(async (response) => {
      if (response.status === 401) {
        // Try to refresh token
        try {
          const refreshResponse = await this.refreshTokenInternal();
          if (refreshResponse) {
            // Retry the original request with new token
            const originalRequest = response.url;
            const retryResponse = await fetch(originalRequest, {
              ...response,
              headers: {
                ...response.headers,
                Authorization: `Bearer ${refreshResponse.token}`,
              },
            });
            return retryResponse;
          }
        } catch (error) {
          // Refresh failed, clear auth state
          this.clearAuthState();
          throw new Error('Authentication required');
        }
      }
      return response;
    });
  }

  // Interceptor management
  addRequestInterceptor(
    interceptor: (config: RequestInit) => RequestInit
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): void {
    this.responseInterceptors.push(interceptor);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = options.method || 'GET';

    let config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    try {
      let response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint, method);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error(
          'Network error. Please check your connection.'
        );
        handleApiError(networkError, endpoint, method);
        throw networkError;
      }
      throw error;
    }
  }

  private async handleErrorResponse(
    response: Response,
    endpoint: string,
    method: string = 'GET'
  ): Promise<never> {
    let errorMessage = `HTTP ${response.status}`;
    let errorData: any = null;

    try {
      errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      // Response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    // Create error object for the error handler
    const error = {
      response: {
        status: response.status,
        data: errorData,
      },
      message: errorMessage,
    };

    // Use centralized error handler
    const userFriendlyMessage = handleApiError(error, endpoint, method);

    // Handle specific error cases
    switch (response.status) {
      case 401:
        this.clearAuthState();
        throw new Error('Authentication required');
      case 403:
        throw new Error('Access forbidden');
      case 404:
        throw new Error('Resource not found');
      case 422:
        // Handle validation errors gracefully - often means no data available
        if (endpoint.includes('/metrics')) {
          throw new Error('No metrics data available for this server');
        }
        throw new Error('Invalid request data');
      case 429:
        throw new Error('Too many requests. Please try again later.');
      case 500:
        throw new Error('Internal server error. Please try again later.');
      case 503:
        throw new Error('Service temporarily unavailable');
      default:
        throw new Error(userFriendlyMessage);
    }
  }

  private clearAuthState(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
  }

  private async refreshTokenInternal(): Promise<AuthToken | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(
        `${this.baseUrl}/api/v1/dashboard/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const authToken = {
        token: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      };

      // Update localStorage
      localStorage.setItem('authToken', authToken.token);
      localStorage.setItem('tokenExpiry', authToken.expiresAt);

      return authToken;
    } catch {
      return null;
    }
  }

  async getServers(): Promise<Server[]> {
    // Get all registered servers from the database
    const response = await this.request<{
      servers: Array<{
        id: number;
        server_id: string;
        hostname: string | null;
        ip_address: string | null;
        registered_at: string;
        last_seen: string;
        is_active: boolean;
      }>;
    }>('/api/v1/dashboard/servers');

    // Transform database response to frontend Server interface
    return response.servers.map((server) => ({
      id: server.server_id,
      hostname: server.hostname || server.server_id,
      ipAddress: server.ip_address || 'Unknown',
      status: this.determineServerStatus(server.last_seen, server.is_active),
      lastSeen: server.last_seen,
      registeredAt: server.registered_at,
    }));
  }

  async getServerMetrics(
    serverId: string,
    timeRange: string
  ): Promise<ServerMetrics[]> {
    try {
      // Convert timeRange to start_time and end_time
      const now = new Date();
      const endTime = now.toISOString();
      let startTime: string;

      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          break;
        case '6h':
          startTime = new Date(
            now.getTime() - 6 * 60 * 60 * 1000
          ).toISOString();
          break;
        case '24h':
          startTime = new Date(
            now.getTime() - 24 * 60 * 60 * 1000
          ).toISOString();
          break;
        case '7d':
          startTime = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
          ).toISOString();
          break;
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // Default to 1h
      }

      const params = new URLSearchParams({
        start_time: startTime,
        end_time: endTime,
        interval_minutes: '5',
      });

      const response = await this.request<{
        server_id: string;
        start_time: string;
        end_time: string;
        interval_minutes: number;
        data_points: number;
        metrics: Array<{
          id: number;
          server_id: string;
          timestamp: string;
          cpu_usage: number;
          memory_total: number;
          memory_used: number;
          memory_percentage: number;
          disk_usage: Array<{
            device?: string;
            mountpoint: string;
            total: number;
            used: number;
            percentage: number;
          }>;
          load_1min: number;
          load_5min: number;
          load_15min: number;
          uptime: number;
          failed_services: Array<{
            name: string;
            status: string;
            since?: string;
          }>;
        }>;
      }>(`/api/v1/dashboard/servers/${serverId}/metrics?${params.toString()}`);

      // If no metrics available, return empty array
      if (!response.metrics || response.metrics.length === 0) {
        return [];
      }

      // Transform database response to frontend ServerMetrics interface
      return response.metrics.map((metric) => ({
        serverId: metric.server_id,
        timestamp: metric.timestamp,
        cpuUsage: metric.cpu_usage,
        memory: {
          total: metric.memory_total,
          used: metric.memory_used,
          percentage: metric.memory_percentage,
        },
        diskUsage: metric.disk_usage.map((disk) => ({
          device: disk.device || disk.mountpoint,
          mountpoint: disk.mountpoint,
          total: disk.total,
          used: disk.used,
          percentage: disk.percentage,
        })),
        loadAverage: {
          oneMin: metric.load_1min,
          fiveMin: metric.load_5min,
          fifteenMin: metric.load_15min,
        },
        uptime: metric.uptime,
        failedServices: metric.failed_services.map((service) => ({
          name: service.name,
          status: service.status,
          timestamp: service.since || metric.timestamp,
        })),
      }));
    } catch (error) {
      // If metrics are not available (422 error or other issues), return empty array
      // This allows the UI to handle servers that are registered but not actively monitored
      if (
        error instanceof Error &&
        error.message.includes('No metrics data available')
      ) {
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  async registerServer(
    serverData: ServerRegistrationData
  ): Promise<{ apiKey: string; server_id: string; key_id: string }> {
    const response = await this.request<{
      status: string;
      message: string;
      server_id: string;
      api_key: string;
      key_id: string;
      registered_at: string;
    }>('/api/v1/dashboard/management/servers/register', {
      method: 'POST',
      body: JSON.stringify({
        hostname: serverData.hostname,
        ip_address: serverData.ipAddress,
        // Don't send server_id - let the backend generate it
      }),
    });

    return {
      apiKey: response.api_key,
      server_id: response.server_id,
      key_id: response.key_id,
    };
  }

  async regenerateServerKey(
    serverId: string,
    description?: string
  ): Promise<{ apiKey: string; keyId: string }> {
    const response = await this.request<{
      message: string;
      server_id: string;
      api_key: string;
      key_id: string;
      regenerated_at: string;
      previous_keys_deactivated: number;
    }>(`/api/v1/dashboard/management/servers/${serverId}/regenerate-key`, {
      method: 'POST',
      body: JSON.stringify({
        description:
          description || `Regenerated API key for server ${serverId}`,
      }),
    });

    return { apiKey: response.api_key, keyId: response.key_id };
  }

  async revokeServer(serverId: string): Promise<void> {
    await this.request(`/api/v1/dashboard/management/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  async getServerHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/api/v1/health');
  }

  private determineServerStatus(
    lastSeen: string,
    isActive: boolean
  ): 'online' | 'offline' | 'warning' {
    if (!isActive) return 'offline';

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

    if (diffMinutes > 10) return 'offline';
    if (diffMinutes > 5) return 'warning';
    return 'online';
  }

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user: User;
    }>('/api/v1/dashboard/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    return {
      token: response.access_token,
      expiresAt: new Date(
        Date.now() + response.expires_in * 1000
      ).toISOString(),
    };
  }

  async logout(): Promise<void> {
    await this.request('/api/v1/dashboard/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<AuthToken> {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>('/api/v1/dashboard/auth/refresh', {
      method: 'POST',
    });

    return {
      token: response.access_token,
      expiresAt: new Date(
        Date.now() + response.expires_in * 1000
      ).toISOString(),
    };
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/v1/dashboard/user/profile');
  }

  async getAlerts(): Promise<Alert[]> {
    const response = await this.request<{
      alerts: Array<{
        id: number;
        server_id: string;
        alert_type: string;
        severity: string;
        message: string;
        threshold_value: number | null;
        actual_value: number | null;
        triggered_at: string;
        resolved_at: string | null;
        is_resolved: boolean;
      }>;
    }>('/api/v1/dashboard/alerts');

    return response.alerts.map((alert) => ({
      id: alert.id.toString(),
      serverId: alert.server_id,
      type: alert.alert_type as 'cpu' | 'memory' | 'disk' | 'offline',
      severity: alert.severity as 'warning' | 'critical',
      message: alert.message,
      triggeredAt: alert.triggered_at,
      resolvedAt: alert.resolved_at || undefined,
      acknowledged: alert.is_resolved,
    }));
  }

  async getAlertHistory(filters: AlertFilters): Promise<Alert[]> {
    const queryParams = new URLSearchParams();
    if (filters.serverId) queryParams.append('server_id', filters.serverId);
    if (filters.severity) queryParams.append('severity', filters.severity);
    if (filters.startDate) queryParams.append('start_date', filters.startDate);
    if (filters.endDate) queryParams.append('end_date', filters.endDate);

    const response = await this.request<{
      alerts: Array<{
        id: number;
        server_id: string;
        alert_type: string;
        severity: string;
        message: string;
        threshold_value: number | null;
        actual_value: number | null;
        triggered_at: string;
        resolved_at: string | null;
        is_resolved: boolean;
      }>;
    }>(`/api/v1/dashboard/alerts/history?${queryParams.toString()}`);

    return response.alerts.map((alert) => ({
      id: alert.id.toString(),
      serverId: alert.server_id,
      type: alert.alert_type as 'cpu' | 'memory' | 'disk' | 'offline',
      severity: alert.severity as 'warning' | 'critical',
      message: alert.message,
      triggeredAt: alert.triggered_at,
      resolvedAt: alert.resolved_at || undefined,
      acknowledged: alert.is_resolved,
    }));
  }

  async getSettings(): Promise<DashboardSettings> {
    try {
      const response = await this.request<{
        settings: {
          refresh_interval: number;
          alert_thresholds: {
            cpu: number;
            memory: number;
            disk: number;
          };
          notifications: {
            enabled: boolean;
            webhook_urls: string[];
          };
          display: {
            theme: string;
            compact_mode: boolean;
            charts_enabled: boolean;
          };
        };
      }>('/api/v1/dashboard/settings');

      return {
        refreshInterval: response.settings.refresh_interval,
        alertThresholds: response.settings.alert_thresholds,
        notifications: {
          enabled: response.settings.notifications.enabled,
          webhookUrls: response.settings.notifications.webhook_urls || [],
        },
        display: {
          theme: response.settings.display.theme as 'light' | 'dark',
          compactMode: response.settings.display.compact_mode,
          chartsEnabled: response.settings.display.charts_enabled,
        },
      };
    } catch (error) {
      // Return default settings if endpoint doesn't exist yet
      return {
        refreshInterval: 30000,
        alertThresholds: { cpu: 80, memory: 85, disk: 90 },
        notifications: { enabled: true, webhookUrls: [] },
        display: { theme: 'light', compactMode: false, chartsEnabled: true },
      };
    }
  }

  async updateSettings(settings: DashboardSettings): Promise<void> {
    await this.request('/api/v1/dashboard/settings', {
      method: 'PUT',
      body: JSON.stringify({
        refresh_interval: settings.refreshInterval,
        alert_thresholds: settings.alertThresholds,
        notifications: {
          enabled: settings.notifications.enabled,
          webhook_urls: settings.notifications.webhookUrls,
        },
        display: {
          theme: settings.display.theme,
          compact_mode: settings.display.compactMode,
          charts_enabled: settings.display.chartsEnabled,
        },
      }),
    });
  }
}

export const apiClient = new ApiClientImpl();
