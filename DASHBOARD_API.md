# Dashboard API Documentation

This document provides comprehensive documentation for the dashboard-specific API endpoints that support the web dashboard interface. These endpoints extend the existing monitoring system with authentication, user management, settings, and enhanced data access capabilities.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Settings Management](#settings-management)
5. [Server Data](#server-data)
6. [Alerts](#alerts)
7. [WebSocket Real-time Updates](#websocket-real-time-updates)
8. [Setup Instructions](#setup-instructions)
9. [Security Features](#security-features)
10. [Integration Guide](#integration-guide)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

## Overview

The dashboard API provides a comprehensive set of endpoints designed specifically for the React-based web dashboard. These endpoints complement the existing monitoring API without requiring any changes to the current system architecture.

### Key Features

- **JWT-based Authentication** with automatic token refresh
- **Real-time Updates** via WebSocket connections
- **Comprehensive User Management** with role-based access
- **Flexible Settings Management** with user preferences
- **Enhanced Data Access** with aggregation and filtering
- **Security-first Design** with rate limiting and validation

### Base URL

All dashboard API endpoints are prefixed with `/api/v1/dashboard/`

**Development**: `http://localhost:8000/api/v1/dashboard/`
**Production**: `https://your-domain.com/api/v1/dashboard/`

## Authentication

The dashboard uses JWT-based authentication with access and refresh tokens.

### POST /api/v1/dashboard/auth/login

Authenticate a user and receive JWT tokens.

**Request Body:**

```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "abc123...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "Administrator",
    "is_admin": true
  }
}
```

### POST /api/v1/dashboard/auth/refresh

Refresh an access token using a refresh token.

**Request Body:**

```json
{
  "refresh_token": "abc123..."
}
```

### POST /api/v1/dashboard/auth/logout

Logout and invalidate all user sessions.

**Headers:**

```
Authorization: Bearer <access_token>
```

### POST /api/v1/dashboard/auth/register

Register a new dashboard user.

**Request Body:**

```json
{
  "username": "newuser",
  "password": "secure-password",
  "email": "user@example.com",
  "full_name": "New User"
}
```

## User Management

### GET /api/v1/dashboard/user/profile

Get current user profile information.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "full_name": "Administrator",
  "is_admin": true,
  "last_login": "2024-12-16T12:00:00Z",
  "login_count": 5,
  "created_at": "2024-12-01T10:00:00Z"
}
```

## Settings Management

### GET /api/v1/dashboard/settings

Get user dashboard settings.

**Response:**

```json
{
  "display": {
    "theme": "light",
    "refresh_interval": 30,
    "compact_mode": false,
    "charts_enabled": true
  },
  "alert_thresholds": {
    "cpu": 80.0,
    "memory": 85.0,
    "disk": 90.0
  },
  "notifications": {
    "enabled": true,
    "webhook_urls": ["https://hooks.slack.com/..."],
    "email_notifications": false
  }
}
```

### PUT /api/v1/dashboard/settings

Update user dashboard settings.

**Request Body:**

```json
{
  "display": {
    "theme": "dark",
    "refresh_interval": 15
  },
  "alert_thresholds": {
    "cpu": 75.0
  }
}
```

### POST /api/v1/dashboard/settings/reset

Reset user settings to defaults.

## Server Data

### GET /api/v1/dashboard/servers

Get overview of all monitored servers with current status.

**Response:**

```json
{
  "servers": [
    {
      "server_id": "web-server-01",
      "hostname": "web01.example.com",
      "ip_address": "192.168.1.10",
      "last_seen": "2024-12-16T12:00:00Z",
      "status": "online",
      "current_metrics": {
        "timestamp": "2024-12-16T12:00:00Z",
        "cpu_usage": 45.2,
        "memory_percentage": 67.8,
        "max_disk_usage": 78.5,
        "load_1min": 1.2,
        "uptime": 86400,
        "failed_services_count": 0
      }
    }
  ],
  "total_count": 1,
  "timestamp": "2024-12-16T12:00:00Z"
}
```

### GET /api/v1/dashboard/servers/{server_id}/metrics

Get historical metrics for a specific server.

**Query Parameters:**

- `start_time`: ISO 8601 timestamp (required)
- `end_time`: ISO 8601 timestamp (required)
- `interval_minutes`: Aggregation interval in minutes (default: 5, max: 60)

**Response:**

```json
{
  "server_id": "web-server-01",
  "start_time": "2024-12-16T10:00:00Z",
  "end_time": "2024-12-16T12:00:00Z",
  "interval_minutes": 5,
  "data_points": 24,
  "metrics": [
    {
      "timestamp": "2024-12-16T10:00:00Z",
      "cpu_usage": 42.1,
      "memory_percentage": 65.3,
      "max_disk_usage": 78.2,
      "load_1min": 1.1,
      "load_5min": 1.0,
      "load_15min": 0.9,
      "failed_services_count": 0,
      "data_points": 1
    }
  ]
}
```

### GET /api/v1/dashboard/servers/{server_id}/summary

Get summary statistics for a specific server.

**Response:**

```json
{
  "server_id": "web-server-01",
  "data_points": 100,
  "time_range": {
    "start": "2024-12-16T10:00:00Z",
    "end": "2024-12-16T12:00:00Z"
  },
  "cpu": {
    "min": 20.1,
    "max": 85.3,
    "avg": 45.7,
    "median": 44.2,
    "std_dev": 12.4
  },
  "memory": {
    "min": 60.2,
    "max": 78.9,
    "avg": 67.8,
    "median": 67.1,
    "std_dev": 4.2
  },
  "latest": {
    "timestamp": "2024-12-16T12:00:00Z",
    "cpu_usage": 45.2,
    "memory_percentage": 67.8,
    "uptime": 86400,
    "failed_services_count": 0
  }
}
```

## Alerts

### GET /api/v1/dashboard/alerts

Get alerts with optional filtering.

**Query Parameters:**

- `active_only`: Return only active alerts (default: true)
- `server_id`: Filter by specific server (optional)

**Response:**

```json
{
  "alerts": [
    {
      "id": 1,
      "server_id": "web-server-01",
      "type": "cpu",
      "severity": "warning",
      "message": "CPU usage exceeded threshold",
      "threshold_value": 80.0,
      "actual_value": 85.3,
      "triggered_at": "2024-12-16T11:30:00Z",
      "resolved_at": null,
      "is_resolved": false
    }
  ],
  "total_count": 1,
  "active_only": true,
  "server_id": null
}
```

## WebSocket Real-time Updates

### WebSocket /ws

Connect to WebSocket for real-time updates.

**Connection:**

```
ws://localhost:8000/ws?token=<access_token>
```

**Message Types:**

1. **metrics_update**: Real-time server metrics

```json
{
  "type": "metrics_update",
  "data": {
    "server_id": "web-server-01",
    "metrics": { ... }
  },
  "timestamp": "2024-12-16T12:00:00Z"
}
```

2. **alert_update**: New alert notifications

```json
{
  "type": "alert_update",
  "data": {
    "id": 2,
    "server_id": "web-server-01",
    "type": "memory",
    "severity": "critical",
    "message": "Memory usage critical"
  },
  "timestamp": "2024-12-16T12:00:00Z"
}
```

3. **server_status_change**: Server status changes

```json
{
  "type": "server_status_change",
  "data": {
    "server_id": "web-server-01",
    "status": "offline",
    "last_seen": "2024-12-16T11:55:00Z"
  },
  "timestamp": "2024-12-16T12:00:00Z"
}
```

## Setup Instructions

### 1. Install Dependencies

Add PyJWT to your requirements:

```bash
pip install "pyjwt>=2.8.0"
```

### 2. Run Database Migration

```bash
alembic upgrade head
```

### 3. Create Admin User

```bash
python server/cli/create_admin.py
```

### 4. Set Environment Variables

```bash
export JWT_SECRET="your-secure-jwt-secret-key"
export ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

### 5. Start Server

```bash
python server/main.py
```

The dashboard API will be available at `http://localhost:8000/api/v1/dashboard/` and WebSocket at `ws://localhost:8000/ws`.

## Security Features

- JWT-based authentication with access and refresh tokens
- Rate limiting on all endpoints
- CORS configuration for dashboard origins
- Secure password hashing with PBKDF2
- Session management with automatic cleanup
- Input validation and sanitization

## Error Handling

### Standard Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials provided",
    "details": {
      "field": "password",
      "reason": "Password does not match"
    },
    "timestamp": "2024-12-16T12:00:00Z",
    "request_id": "req_123456789"
  }
}
```

### HTTP Status Codes

| Status Code | Description           | Common Causes                     |
| ----------- | --------------------- | --------------------------------- |
| `200`       | Success               | Request completed successfully    |
| `201`       | Created               | Resource created successfully     |
| `400`       | Bad Request           | Invalid request parameters        |
| `401`       | Unauthorized          | Missing or invalid authentication |
| `403`       | Forbidden             | Insufficient permissions          |
| `404`       | Not Found             | Resource does not exist           |
| `409`       | Conflict              | Resource already exists           |
| `422`       | Unprocessable Entity  | Validation errors                 |
| `429`       | Too Many Requests     | Rate limit exceeded               |
| `500`       | Internal Server Error | Server-side error                 |
| `503`       | Service Unavailable   | Server temporarily unavailable    |

### Error Codes

#### Authentication Errors

- `AUTHENTICATION_FAILED`: Invalid credentials
- `TOKEN_EXPIRED`: JWT token has expired
- `TOKEN_INVALID`: JWT token is malformed or invalid
- `REFRESH_TOKEN_EXPIRED`: Refresh token has expired
- `ACCOUNT_LOCKED`: User account is locked
- `ACCOUNT_DISABLED`: User account is disabled

#### Authorization Errors

- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `RESOURCE_ACCESS_DENIED`: Access to specific resource denied
- `ADMIN_REQUIRED`: Administrative privileges required

#### Validation Errors

- `VALIDATION_FAILED`: Request validation failed
- `REQUIRED_FIELD_MISSING`: Required field not provided
- `INVALID_FORMAT`: Field format is invalid
- `VALUE_OUT_OF_RANGE`: Numeric value outside allowed range

#### Resource Errors

- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `RESOURCE_ALREADY_EXISTS`: Resource with same identifier exists
- `RESOURCE_CONFLICT`: Resource state conflict

#### Rate Limiting Errors

- `RATE_LIMIT_EXCEEDED`: Too many requests in time window
- `QUOTA_EXCEEDED`: API quota exceeded

### Error Handling Best Practices

#### Client-Side Error Handling

```typescript
// Example error handling in TypeScript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id: string;
}

async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error.response?.status === 401) {
      // Handle authentication error
      await refreshToken();
      return apiCall(); // Retry with new token
    } else if (error.response?.status === 429) {
      // Handle rate limiting
      const retryAfter = error.response.headers["retry-after"];
      await delay(retryAfter * 1000);
      return apiCall(); // Retry after delay
    } else {
      // Handle other errors
      throw new ApiError(error.response.data.error);
    }
  }
}
```

## Rate Limiting

### Rate Limit Configuration

The API implements multiple rate limiting strategies:

#### Global Rate Limits

- **General API**: 1000 requests per hour per IP
- **Authentication**: 10 login attempts per 15 minutes per IP
- **Registration**: 5 registrations per hour per IP
- **Password Reset**: 3 attempts per hour per email

#### User-Specific Rate Limits

- **Authenticated Users**: 5000 requests per hour
- **Admin Users**: 10000 requests per hour
- **WebSocket Connections**: 5 concurrent connections per user

#### Endpoint-Specific Limits

- **Login**: 5 attempts per 15 minutes per IP
- **Refresh Token**: 10 requests per minute per user
- **Settings Update**: 20 requests per minute per user
- **Server Registration**: 10 requests per hour per user

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
Retry-After: 60
```

### Rate Limit Response

When rate limits are exceeded:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 1000,
      "window": 3600,
      "reset_at": "2024-12-16T13:00:00Z"
    },
    "timestamp": "2024-12-16T12:00:00Z",
    "request_id": "req_123456789"
  }
}
```

## Integration Guide

### Frontend Integration

#### API Client Setup

```typescript
// api-client.ts
class DashboardApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error);
    }

    return response.json();
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token;

    return response;
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    this.accessToken = response.access_token;
  }
}
```

#### WebSocket Integration

```typescript
// websocket-client.ts
class DashboardWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): void {
    const wsUrl = `${WS_BASE_URL}/ws?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.attemptReconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      setTimeout(() => {
        this.connect(token);
      }, delay);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "metrics_update":
        this.onMetricsUpdate?.(message.data);
        break;
      case "alert_update":
        this.onAlertUpdate?.(message.data);
        break;
      case "server_status_change":
        this.onServerStatusChange?.(message.data);
        break;
    }
  }

  onMetricsUpdate?: (data: ServerMetrics) => void;
  onAlertUpdate?: (data: Alert) => void;
  onServerStatusChange?: (data: ServerStatus) => void;
}
```

### Backend Integration

#### Database Schema Extensions

The dashboard API adds the following tables to the existing schema:

```sql
-- Dashboard users table
CREATE TABLE dashboard_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard settings table
CREATE TABLE dashboard_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES dashboard_users(id) ON DELETE CASCADE,
    settings_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard sessions table
CREATE TABLE dashboard_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES dashboard_users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_dashboard_users_username ON dashboard_users(username);
CREATE INDEX idx_dashboard_users_email ON dashboard_users(email);
CREATE INDEX idx_dashboard_settings_user_id ON dashboard_settings(user_id);
CREATE INDEX idx_dashboard_sessions_user_id ON dashboard_sessions(user_id);
CREATE INDEX idx_dashboard_sessions_token ON dashboard_sessions(refresh_token);
```

## Integration with Existing System

The dashboard API is designed to work alongside the existing monitoring API without any changes to the current system:

### Compatibility Features

- **Database Schema**: Uses the same database with additional dashboard-specific tables
- **Existing Data**: Leverages existing metrics and alert data without modification
- **Agent Compatibility**: Maintains full compatibility with existing agent endpoints
- **API Coexistence**: Dashboard and monitoring APIs run side-by-side
- **Data Aggregation**: Provides enhanced data aggregation and analysis capabilities

### Migration Strategy

1. **Phase 1**: Deploy dashboard API alongside existing system
2. **Phase 2**: Migrate users to dashboard authentication
3. **Phase 3**: Gradually adopt enhanced features
4. **Phase 4**: Optional deprecation of legacy interfaces

### Backward Compatibility

- All existing monitoring endpoints remain unchanged
- Agent configurations require no modifications
- Historical data remains accessible
- Existing integrations continue to work
