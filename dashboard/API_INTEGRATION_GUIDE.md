# Dashboard API Integration Guide

This guide provides comprehensive information for integrating with the Server Monitoring Dashboard API, including authentication, data handling, real-time updates, and best practices.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Integration](#authentication-integration)
3. [API Client Implementation](#api-client-implementation)
4. [WebSocket Integration](#websocket-integration)
5. [Error Handling](#error-handling)
6. [State Management](#state-management)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategies](#testing-strategies)
9. [Best Practices](#best-practices)

## 🚀 Quick Start

### Basic Setup

```typescript
// api-config.ts
export const API_CONFIG = {
  baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
  wsUrl: process.env.VITE_WS_BASE_URL || 'ws://localhost:8000',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// types.ts
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id: string;
}
```

### Simple API Call

```typescript
// Simple GET request example
async function getServers(): Promise<Server[]> {
  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/v1/dashboard/servers`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.servers;
}
```

## 🔐 Authentication Integration

### JWT Token Management

```typescript
// auth-manager.ts
class AuthManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/api/v1/dashboard/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new AuthError(error.error);
    }

    const authData = await response.json();
    this.setTokens(authData);
    return authData;
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(
      `${API_CONFIG.baseUrl}/api/v1/dashboard/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      }
    );

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const authData = await response.json();
    this.setTokens(authData);
    return authData.access_token;
  }

  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(`${API_CONFIG.baseUrl}/api/v1/dashboard/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }
    this.clearTokens();
  }

  getAccessToken(): string | null {
    if (this.isTokenExpired()) {
      return null;
    }
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null && !this.isTokenExpired();
  }

  private setTokens(authData: AuthResponse): void {
    this.accessToken = authData.access_token;
    this.refreshToken = authData.refresh_token;
    this.tokenExpiry = Date.now() + authData.expires_in * 1000;
    this.saveTokensToStorage();
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.removeTokensFromStorage();
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000; // Refresh 1 minute before expiry
  }

  private saveTokensToStorage(): void {
    if (this.accessToken && this.refreshToken) {
      localStorage.setItem('access_token', this.accessToken);
      localStorage.setItem('refresh_token', this.refreshToken);
      localStorage.setItem('token_expiry', this.tokenExpiry?.toString() || '');
    }
  }

  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    const expiry = localStorage.getItem('token_expiry');
    this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
  }

  private removeTokensFromStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
  }
}

export const authManager = new AuthManager();
```

### Authentication Hook

```typescript
// useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { authManager } from './auth-manager';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      if (authManager.isAuthenticated()) {
        const userProfile = await fetchUserProfile();
        setUser(userProfile);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication check failed'
      );
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const authResponse = await authManager.login(credentials);
      setUser(authResponse.user);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authManager.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    error,
  };
}
```

## 🔌 API Client Implementation

### Comprehensive API Client

```typescript
// api-client.ts
class DashboardApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.retryAttempts = config.retryAttempts;
    this.retryDelay = config.retryDelay;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config = await this.buildRequestConfig(options);

    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return await this.handleResponse<T>(response);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  // Server endpoints
  async getServers(): Promise<Server[]> {
    const response = await this.request<{ servers: Server[] }>(
      '/api/v1/dashboard/servers'
    );
    return response.data.servers;
  }

  async getServerMetrics(
    serverId: string,
    timeRange: TimeRange
  ): Promise<ServerMetrics[]> {
    const params = new URLSearchParams({
      start_time: timeRange.start.toISOString(),
      end_time: timeRange.end.toISOString(),
      interval_minutes: timeRange.interval.toString(),
    });

    const response = await this.request<{ metrics: ServerMetrics[] }>(
      `/api/v1/dashboard/servers/${serverId}/metrics?${params}`
    );
    return response.data.metrics;
  }

  async getServerSummary(serverId: string): Promise<ServerSummary> {
    const response = await this.request<ServerSummary>(
      `/api/v1/dashboard/servers/${serverId}/summary`
    );
    return response.data;
  }

  // Alert endpoints
  async getAlerts(filters: AlertFilters = {}): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (filters.activeOnly !== undefined) {
      params.append('active_only', filters.activeOnly.toString());
    }
    if (filters.serverId) {
      params.append('server_id', filters.serverId);
    }

    const response = await this.request<{ alerts: Alert[] }>(
      `/api/v1/dashboard/alerts?${params}`
    );
    return response.data.alerts;
  }

  // Settings endpoints
  async getSettings(): Promise<DashboardSettings> {
    const response = await this.request<DashboardSettings>(
      '/api/v1/dashboard/settings'
    );
    return response.data;
  }

  async updateSettings(
    settings: Partial<DashboardSettings>
  ): Promise<DashboardSettings> {
    const response = await this.request<DashboardSettings>(
      '/api/v1/dashboard/settings',
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    );
    return response.data;
  }

  async resetSettings(): Promise<DashboardSettings> {
    const response = await this.request<DashboardSettings>(
      '/api/v1/dashboard/settings/reset',
      {
        method: 'POST',
      }
    );
    return response.data;
  }

  // User endpoints
  async getUserProfile(): Promise<User> {
    const response = await this.request<User>('/api/v1/dashboard/user/profile');
    return response.data;
  }

  private async buildRequestConfig(
    options: RequestOptions
  ): Promise<RequestInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = authManager.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return {
      method: options.method || 'GET',
      headers,
      body: options.body,
      ...options,
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (response.status === 401) {
      try {
        await authManager.refreshAccessToken();
        throw new RetryableError('Token refreshed, retry request');
      } catch (error) {
        throw new AuthenticationError('Authentication failed');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }
      );
    }

    return response.json();
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof RetryableError && attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }

        if (error instanceof AuthenticationError || error instanceof ApiError) {
          throw error;
        }

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new DashboardApiClient(API_CONFIG);
```

### React Query Integration

```typescript
// api-queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

// Query keys
export const queryKeys = {
  servers: ['servers'] as const,
  server: (id: string) => ['servers', id] as const,
  serverMetrics: (id: string, timeRange: TimeRange) =>
    ['servers', id, 'metrics', timeRange] as const,
  alerts: (filters: AlertFilters) => ['alerts', filters] as const,
  settings: ['settings'] as const,
  userProfile: ['user', 'profile'] as const,
};

// Server queries
export function useServers() {
  return useQuery({
    queryKey: queryKeys.servers,
    queryFn: () => apiClient.getServers(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000,
  });
}

export function useServerMetrics(serverId: string, timeRange: TimeRange) {
  return useQuery({
    queryKey: queryKeys.serverMetrics(serverId, timeRange),
    queryFn: () => apiClient.getServerMetrics(serverId, timeRange),
    enabled: !!serverId,
    staleTime: 60000, // 1 minute
  });
}

// Alert queries
export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: queryKeys.alerts(filters),
    queryFn: () => apiClient.getAlerts(filters),
    staleTime: 15000, // 15 seconds
    refetchInterval: 15000,
  });
}

// Settings queries and mutations
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiClient.getSettings(),
    staleTime: 300000, // 5 minutes
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<DashboardSettings>) =>
      apiClient.updateSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings, data);
    },
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.resetSettings(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings, data);
    },
  });
}

// User profile query
export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: () => apiClient.getUserProfile(),
    staleTime: 600000, // 10 minutes
  });
}
```

## 🔄 WebSocket Integration

### WebSocket Client

```typescript
// websocket-client.ts
class DashboardWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers = new Map<string, Set<(data: any) => void>>();

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${API_CONFIG.wsUrl}/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        this.stopHeartbeat();
        console.log('WebSocket disconnected:', event.code, event.reason);

        if (event.code !== 1000) {
          // Not a normal closure
          this.attemptReconnect(token);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  subscribe(messageType: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      });
    }
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect(token).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new DashboardWebSocketClient();
```

### WebSocket React Hook

```typescript
// useWebSocket.ts
import { useEffect, useCallback, useRef } from 'react';
import { wsClient } from './websocket-client';
import { authManager } from './auth-manager';

export function useWebSocket() {
  const isConnectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (isConnectedRef.current) return;

    const token = authManager.getAccessToken();
    if (!token) {
      console.warn('No access token available for WebSocket connection');
      return;
    }

    try {
      await wsClient.connect(token);
      isConnectedRef.current = true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    isConnectedRef.current = false;
  }, []);

  useEffect(() => {
    if (authManager.isAuthenticated()) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected: () => wsClient.isConnected(),
    subscribe: wsClient.subscribe.bind(wsClient),
  };
}

// Specific hooks for different message types
export function useServerMetricsUpdates(
  onUpdate: (metrics: ServerMetrics) => void
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe('metrics_update', onUpdate);
  }, [subscribe, onUpdate]);
}

export function useAlertUpdates(onAlert: (alert: Alert) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe('alert_update', onAlert);
  }, [subscribe, onAlert]);
}

export function useServerStatusUpdates(
  onStatusChange: (status: ServerStatus) => void
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe('server_status_change', onStatusChange);
  }, [subscribe, onStatusChange]);
}
```

## 🚨 Error Handling

### Error Classes

```typescript
// errors.ts
export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly timestamp: string;
  public readonly requestId: string;

  constructor(errorData: ApiErrorData) {
    super(errorData.message);
    this.name = 'ApiError';
    this.code = errorData.code;
    this.details = errorData.details;
    this.timestamp = errorData.timestamp;
    this.requestId = errorData.request_id;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super({
      code: 'AUTHENTICATION_FAILED',
      message,
      timestamp: new Date().toISOString(),
      request_id: 'unknown',
    });
    this.name = 'AuthenticationError';
  }
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### Error Handler Hook

```typescript
// useErrorHandler.ts
import { useCallback } from 'react';
import { useNotifications } from './useNotifications';

export function useErrorHandler() {
  const { showError } = useNotifications();

  const handleError = useCallback(
    (error: Error, context?: string) => {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);

      if (error instanceof AuthenticationError) {
        showError('Authentication failed. Please log in again.');
        // Redirect to login
        window.location.href = '/login';
      } else if (error instanceof ApiError) {
        showError(`API Error: ${error.message}`);
      } else if (error instanceof NetworkError) {
        showError('Network error. Please check your connection.');
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    },
    [showError]
  );

  return { handleError };
}
```

### Global Error Boundary

```typescript
// ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 🏪 State Management

### Redux Store Setup

```typescript
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './slices/authSlice';
import { serversSlice } from './slices/serversSlice';
import { alertsSlice } from './slices/alertsSlice';
import { settingsSlice } from './slices/settingsSlice';
import { websocketMiddleware } from './middleware/websocketMiddleware';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    servers: serversSlice.reducer,
    alerts: alertsSlice.reducer,
    settings: settingsSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['websocket/connect', 'websocket/disconnect'],
      },
    }).concat(websocketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Server Slice

```typescript
// slices/serversSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../api/api-client';

interface ServersState {
  servers: Server[];
  selectedServer: Server | null;
  metrics: Record<string, ServerMetrics[]>;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: ServersState = {
  servers: [],
  selectedServer: null,
  metrics: {},
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchServers = createAsyncThunk(
  'servers/fetchServers',
  async (_, { rejectWithValue }) => {
    try {
      const servers = await apiClient.getServers();
      return servers;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch servers'
      );
    }
  }
);

export const fetchServerMetrics = createAsyncThunk(
  'servers/fetchServerMetrics',
  async (
    { serverId, timeRange }: { serverId: string; timeRange: TimeRange },
    { rejectWithValue }
  ) => {
    try {
      const metrics = await apiClient.getServerMetrics(serverId, timeRange);
      return { serverId, metrics };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch metrics'
      );
    }
  }
);

export const serversSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    selectServer: (state, action: PayloadAction<Server>) => {
      state.selectedServer = action.payload;
    },
    clearSelectedServer: (state) => {
      state.selectedServer = null;
    },
    updateServerMetrics: (
      state,
      action: PayloadAction<{ serverId: string; metrics: ServerMetrics }>
    ) => {
      const { serverId, metrics } = action.payload;
      const server = state.servers.find((s) => s.id === serverId);
      if (server) {
        server.currentMetrics = metrics;
      }
    },
    updateServerStatus: (
      state,
      action: PayloadAction<{ serverId: string; status: ServerStatus }>
    ) => {
      const { serverId, status } = action.payload;
      const server = state.servers.find((s) => s.id === serverId);
      if (server) {
        server.status = status.status;
        server.lastSeen = status.last_seen;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServers.fulfilled, (state, action) => {
        state.loading = false;
        state.servers = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchServers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchServerMetrics.fulfilled, (state, action) => {
        const { serverId, metrics } = action.payload;
        state.metrics[serverId] = metrics;
      });
  },
});

export const {
  selectServer,
  clearSelectedServer,
  updateServerMetrics,
  updateServerStatus,
} = serversSlice.actions;
```

## ⚡ Performance Optimization

### Request Caching

```typescript
// cache-manager.ts
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 300000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export const cacheManager = new CacheManager();
```

### Request Deduplication

```typescript
// request-deduplicator.ts
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();
```

## 🧪 Testing Strategies

### API Client Testing

```typescript
// api-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './api-client';
import { authManager } from './auth-manager';

// Mock fetch
global.fetch = vi.fn();

describe('DashboardApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authManager, 'getAccessToken').mockReturnValue('mock-token');
  });

  it('should fetch servers successfully', async () => {
    const mockServers = [
      { id: '1', hostname: 'server1', status: 'online' },
      { id: '2', hostname: 'server2', status: 'offline' },
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { servers: mockServers } }),
    });

    const servers = await apiClient.getServers();

    expect(servers).toEqual(mockServers);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/dashboard/servers'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
  });

  it('should handle authentication errors', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid token',
        },
      }),
    });

    vi.spyOn(authManager, 'refreshAccessToken').mockResolvedValueOnce(
      'new-token'
    );

    await expect(apiClient.getServers()).rejects.toThrow(
      'Token refreshed, retry request'
    );
  });
});
```

### WebSocket Testing

```typescript
// websocket-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wsClient } from './websocket-client';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

global.WebSocket = MockWebSocket as any;

describe('DashboardWebSocketClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should connect successfully', async () => {
    await expect(wsClient.connect('mock-token')).resolves.toBeUndefined();
    expect(wsClient.isConnected()).toBe(true);
  });

  it('should handle message subscriptions', async () => {
    await wsClient.connect('mock-token');

    const handler = vi.fn();
    const unsubscribe = wsClient.subscribe('metrics_update', handler);

    // Simulate message
    const mockMessage = {
      type: 'metrics_update',
      data: { serverId: '1', metrics: {} },
    };

    // Trigger message handler
    (wsClient as any).handleMessage(mockMessage);

    expect(handler).toHaveBeenCalledWith(mockMessage.data);

    unsubscribe();
    (wsClient as any).handleMessage(mockMessage);

    // Handler should not be called after unsubscribe
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

## 📋 Best Practices

### API Integration Best Practices

1. **Authentication Management**
   - Always handle token expiration gracefully
   - Implement automatic token refresh
   - Store tokens securely (avoid localStorage for sensitive data)
   - Clear tokens on logout

2. **Error Handling**
   - Use consistent error handling patterns
   - Provide meaningful error messages to users
   - Log errors for debugging
   - Implement retry mechanisms for transient failures

3. **Performance Optimization**
   - Cache API responses when appropriate
   - Implement request deduplication
   - Use pagination for large datasets
   - Optimize WebSocket message handling

4. **Security**
   - Validate all user inputs
   - Use HTTPS in production
   - Implement proper CORS configuration
   - Follow security headers best practices

5. **Testing**
   - Mock external dependencies
   - Test error scenarios
   - Use property-based testing for complex logic
   - Implement integration tests for critical flows

### Code Organization

```
src/
├── api/
│   ├── client.ts          # Main API client
│   ├── auth.ts           # Authentication logic
│   ├── websocket.ts      # WebSocket client
│   ├── queries.ts        # React Query hooks
│   └── types.ts          # API type definitions
├── hooks/
│   ├── useAuth.ts        # Authentication hook
│   ├── useWebSocket.ts   # WebSocket hook
│   └── useErrorHandler.ts # Error handling hook
├── store/
│   ├── index.ts          # Store configuration
│   ├── slices/           # Redux slices
│   └── middleware/       # Custom middleware
└── utils/
    ├── cache.ts          # Caching utilities
    ├── errors.ts         # Error classes
    └── constants.ts      # API constants
```

This comprehensive integration guide provides everything needed to successfully integrate with the Dashboard API, from basic setup to advanced patterns and best practices.
