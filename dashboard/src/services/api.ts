// API client for communicating with the FastAPI backend
// Based on the design document specifications

import type {
  Server,
  ServerMetrics,
  Alert,
  DashboardSettings,
  LoginCredentials,
  AuthToken,
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

  // Alerts
  getAlerts(): Promise<Alert[]>;
  getAlertHistory(filters: AlertFilters): Promise<Alert[]>;

  // Settings
  getSettings(): Promise<DashboardSettings>;
  updateSettings(settings: DashboardSettings): Promise<void>;
}

// Basic API client implementation (to be expanded in later tasks)
class ApiClientImpl implements ApiClient {
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

  async login(): Promise<AuthToken> {
    // Implementation will be added in later tasks
    return { token: '', expiresAt: '' };
  }

  async logout(): Promise<void> {
    // Implementation will be added in later tasks
  }

  async refreshToken(): Promise<AuthToken> {
    // Implementation will be added in later tasks
    return { token: '', expiresAt: '' };
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
