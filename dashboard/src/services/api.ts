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

export interface ApiClient {
  // Server data
  getServers(): Promise<Server[]>;
  getServerMetrics(
    serverId: string,
    timeRange: string
  ): Promise<ServerMetrics[]>;
  registerServer(
    serverData: ServerRegistrationData
  ): Promise<{ apiKey: string }>;

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

// Basic API client implementation (to be expanded in later tasks)
class ApiClientImpl implements ApiClient {
  private baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('user');
        throw new Error('Authentication required');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getServers(): Promise<Server[]> {
    // Implementation will be added in later tasks
    return [];
  }

  async getServerMetrics(): Promise<ServerMetrics[]> {
    // Implementation will be added in later tasks
    return [];
  }

  async registerServer(): Promise<{ apiKey: string }> {
    // Implementation will be added in later tasks
    return { apiKey: '' };
  }

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const response = await this.request<{
      access_token: string;
      expires_at: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    return {
      token: response.access_token,
      expiresAt: response.expires_at,
    };
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<AuthToken> {
    const response = await this.request<{
      access_token: string;
      expires_at: string;
    }>('/auth/refresh', {
      method: 'POST',
    });

    return {
      token: response.access_token,
      expiresAt: response.expires_at,
    };
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getAlerts(): Promise<Alert[]> {
    // Implementation will be added in later tasks
    return [];
  }

  async getAlertHistory(): Promise<Alert[]> {
    // Implementation will be added in later tasks
    return [];
  }

  async getSettings(): Promise<DashboardSettings> {
    // Implementation will be added in later tasks
    return {
      refreshInterval: 30000,
      alertThresholds: { cpu: 80, memory: 85, disk: 90 },
      notifications: { enabled: true, webhookUrls: [] },
      display: { theme: 'light', compactMode: false, chartsEnabled: true },
    };
  }

  async updateSettings(): Promise<void> {
    // Implementation will be added in later tasks
  }
}

export const apiClient = new ApiClientImpl();
