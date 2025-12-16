// WebSocket client for real-time updates
// Based on the design document specifications

import type { ServerMetrics, Alert } from '../types';
import { environment } from '../config/environment';

export interface ServerStatus {
  serverId: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
}

export interface WebSocketClient {
  connect(): void;
  disconnect(): void;
  onMetricsUpdate(callback: (metrics: ServerMetrics) => void): void;
  onAlertUpdate(callback: (alert: Alert) => void): void;
  onServerStatusChange(callback: (status: ServerStatus) => void): void;
}

type WebSocketEventType =
  | 'metrics_update'
  | 'alert_update'
  | 'server_status_change'
  | 'connection_established'
  | 'pong'
  | 'subscription_confirmed'
  | 'error';

interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp: string;
}

class WebSocketClientImpl implements WebSocketClient {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: number | null = null;
  private isConnecting = false;
  private isManuallyDisconnected = false;

  // Event callbacks
  private metricsCallbacks: Array<(metrics: ServerMetrics) => void> = [];
  private alertCallbacks: Array<(alert: Alert) => void> = [];
  private statusCallbacks: Array<(status: ServerStatus) => void> = [];
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  constructor() {
    this.baseUrl = this.getWebSocketUrl();
  }

  private getWebSocketUrl(): string {
    // Use environment configuration for WebSocket URL
    return `${environment.wsBaseUrl}/ws`;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isManuallyDisconnected = false;
    this.isConnecting = true;

    try {
      const token = localStorage.getItem('authToken');
      const wsUrl = token ? `${this.baseUrl}?token=${token}` : this.baseUrl;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionCallbacks(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.notifyConnectionCallbacks(false);

        // Attempt to reconnect unless manually disconnected
        if (
          !this.isManuallyDisconnected &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.notifyConnectionCallbacks(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.notifyConnectionCallbacks(false);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.notifyConnectionCallbacks(false);
  }

  private scheduleReconnect(): void {
    if (this.isManuallyDisconnected || this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'metrics_update':
        this.metricsCallbacks.forEach((callback) => {
          try {
            callback(message.data as ServerMetrics);
          } catch (error) {
            console.error('Error in metrics callback:', error);
          }
        });
        break;

      case 'alert_update':
        this.alertCallbacks.forEach((callback) => {
          try {
            callback(message.data as Alert);
          } catch (error) {
            console.error('Error in alert callback:', error);
          }
        });
        break;

      case 'server_status_change':
        this.statusCallbacks.forEach((callback) => {
          try {
            callback(message.data as ServerStatus);
          } catch (error) {
            console.error('Error in status callback:', error);
          }
        });
        break;

      case 'connection_established':
        console.log('WebSocket connection established:', message.data);
        break;

      case 'pong':
        console.log('WebSocket pong received');
        break;

      case 'subscription_confirmed':
        console.log('WebSocket subscription confirmed:', message.data);
        break;

      case 'error':
        console.error('WebSocket error message:', message.data);
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  onMetricsUpdate(callback: (metrics: ServerMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  onAlertUpdate(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }

  onServerStatusChange(callback: (status: ServerStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback);
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  // Remove callbacks
  removeMetricsCallback(callback: (metrics: ServerMetrics) => void): void {
    const index = this.metricsCallbacks.indexOf(callback);
    if (index > -1) {
      this.metricsCallbacks.splice(index, 1);
    }
  }

  removeAlertCallback(callback: (alert: Alert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  removeStatusCallback(callback: (status: ServerStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  removeConnectionCallback(callback: (connected: boolean) => void): void {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState():
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'reconnecting' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    if (this.reconnectTimer) return 'reconnecting';
    return 'disconnected';
  }
}

// Create singleton instance
export const webSocketClient = new WebSocketClientImpl();
