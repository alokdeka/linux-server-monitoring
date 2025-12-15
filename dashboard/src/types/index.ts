// Core data types for the dashboard application
// Based on the design document specifications

export interface Server {
  id: string;
  hostname: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  registeredAt: string;
  currentMetrics?: ServerMetrics;
}

export interface ServerMetrics {
  serverId: string;
  timestamp: string;
  cpuUsage: number;
  memory: {
    total: number;
    used: number;
    percentage: number;
  };
  diskUsage: DiskUsage[];
  loadAverage: {
    oneMin: number;
    fiveMin: number;
    fifteenMin: number;
  };
  uptime: number;
  failedServices: FailedService[];
}

export interface DiskUsage {
  device: string;
  mountpoint: string;
  total: number;
  used: number;
  percentage: number;
}

export interface FailedService {
  name: string;
  status: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  serverId: string;
  type: 'cpu' | 'memory' | 'disk' | 'offline';
  severity: 'warning' | 'critical';
  message: string;
  triggeredAt: string;
  resolvedAt?: string;
  acknowledged: boolean;
}

export interface DashboardSettings {
  refreshInterval: number;
  alertThresholds: {
    cpu: number;
    memory: number;
    disk: number;
  };
  notifications: {
    enabled: boolean;
    webhookUrls: string[];
  };
  display: {
    theme: 'light' | 'dark';
    compactMode: boolean;
    chartsEnabled: boolean;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthToken {
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
