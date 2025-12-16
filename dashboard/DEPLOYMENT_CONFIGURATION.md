# Dashboard Deployment Configuration Guide

This comprehensive guide covers all aspects of deploying and configuring the Server Monitoring Dashboard in various environments, from development to production.

## 📋 Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Security Configuration](#security-configuration)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

## 🔧 Environment Configuration

### Environment Variables

The dashboard supports comprehensive configuration through environment variables:

#### Core Configuration

| Variable                | Description                | Default                       | Required |
| ----------------------- | -------------------------- | ----------------------------- | -------- |
| `VITE_API_BASE_URL`     | Backend API base URL       | `http://localhost:8000`       | Yes      |
| `VITE_WS_BASE_URL`      | WebSocket base URL         | `ws://localhost:8000`         | Yes      |
| `VITE_APP_TITLE`        | Application title          | `Server Monitoring Dashboard` | No       |
| `VITE_REFRESH_INTERVAL` | Auto-refresh interval (ms) | `30000`                       | No       |
| `VITE_ENABLE_DEBUG`     | Enable debug logging       | `false`                       | No       |

#### Advanced Configuration

| Variable                 | Description                | Default  | Required |
| ------------------------ | -------------------------- | -------- | -------- |
| `VITE_MAX_SERVERS`       | Maximum servers to display | `100`    | No       |
| `VITE_CHART_POINTS`      | Maximum chart data points  | `100`    | No       |
| `VITE_WEBSOCKET_TIMEOUT` | WebSocket timeout (ms)     | `30000`  | No       |
| `VITE_API_TIMEOUT`       | API request timeout (ms)   | `10000`  | No       |
| `VITE_RETRY_ATTEMPTS`    | Failed request retry count | `3`      | No       |
| `VITE_CACHE_DURATION`    | Client cache duration (ms) | `300000` | No       |

#### Feature Flags

| Variable                    | Description                  | Default | Required |
| --------------------------- | ---------------------------- | ------- | -------- |
| `VITE_ENABLE_DARK_MODE`     | Enable dark mode toggle      | `true`  | No       |
| `VITE_ENABLE_NOTIFICATIONS` | Enable browser notifications | `true`  | No       |
| `VITE_ENABLE_OFFLINE_MODE`  | Enable offline functionality | `true`  | No       |
| `VITE_ENABLE_PWA`           | Enable PWA features          | `true`  | No       |
| `VITE_ENABLE_ANALYTICS`     | Enable usage analytics       | `false` | No       |

#### Container Configuration

| Variable                     | Description              | Default | Required |
| ---------------------------- | ------------------------ | ------- | -------- |
| `DASHBOARD_PORT`             | Container port           | `80`    | No       |
| `NGINX_WORKER_PROCESSES`     | Nginx worker processes   | `auto`  | No       |
| `NGINX_WORKER_CONNECTIONS`   | Nginx worker connections | `1024`  | No       |
| `NGINX_CLIENT_MAX_BODY_SIZE` | Max request body size    | `10m`   | No       |

### Configuration Files

#### Development Configuration (.env.development)

```bash
# Development Environment Configuration
NODE_ENV=development

# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000

# Application Settings
VITE_APP_TITLE=Server Monitoring Dashboard (Dev)
VITE_REFRESH_INTERVAL=10000
VITE_ENABLE_DEBUG=true

# Development Features
VITE_ENABLE_HOT_RELOAD=true
VITE_ENABLE_MOCK_API=false
VITE_LOG_LEVEL=debug

# Performance Settings
VITE_MAX_SERVERS=50
VITE_CHART_POINTS=50
```

#### Production Configuration (.env.production)

```bash
# Production Environment Configuration
NODE_ENV=production

# API Configuration
VITE_API_BASE_URL=https://api.monitoring.yourdomain.com
VITE_WS_BASE_URL=wss://api.monitoring.yourdomain.com

# Application Settings
VITE_APP_TITLE=Server Monitoring Dashboard
VITE_REFRESH_INTERVAL=30000
VITE_ENABLE_DEBUG=false

# Security Settings
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
VITE_SECURE_COOKIES=true

# Performance Settings
VITE_MAX_SERVERS=500
VITE_CHART_POINTS=200
VITE_ENABLE_COMPRESSION=true
VITE_ENABLE_CACHING=true

# Monitoring
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

#### Staging Configuration (.env.staging)

```bash
# Staging Environment Configuration
NODE_ENV=staging

# API Configuration
VITE_API_BASE_URL=https://staging-api.monitoring.yourdomain.com
VITE_WS_BASE_URL=wss://staging-api.monitoring.yourdomain.com

# Application Settings
VITE_APP_TITLE=Server Monitoring Dashboard (Staging)
VITE_REFRESH_INTERVAL=15000
VITE_ENABLE_DEBUG=true

# Testing Features
VITE_ENABLE_TEST_DATA=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

## 🐳 Docker Deployment

### Single Container Deployment

#### Basic Docker Run

```bash
# Build the image
docker build -t monitoring-dashboard ./dashboard

# Run with basic configuration
docker run -d \
  --name monitoring-dashboard \
  -p 3000:80 \
  -e VITE_API_BASE_URL=http://your-api-server:8000 \
  -e VITE_WS_BASE_URL=ws://your-api-server:8000 \
  monitoring-dashboard
```

#### Advanced Docker Run

```bash
# Run with comprehensive configuration
docker run -d \
  --name monitoring-dashboard \
  -p 3000:80 \
  --restart unless-stopped \
  --memory="512m" \
  --cpus="0.5" \
  -e VITE_API_BASE_URL=https://api.monitoring.yourdomain.com \
  -e VITE_WS_BASE_URL=wss://api.monitoring.yourdomain.com \
  -e VITE_APP_TITLE="Production Monitoring" \
  -e VITE_REFRESH_INTERVAL=30000 \
  -e VITE_ENABLE_DEBUG=false \
  -e NGINX_WORKER_PROCESSES=2 \
  -e NGINX_WORKER_CONNECTIONS=1024 \
  -v /path/to/logs:/var/log/nginx \
  -v /path/to/ssl:/etc/ssl/certs:ro \
  --health-cmd="curl -f http://localhost/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  monitoring-dashboard
```

### Docker Compose Deployment

#### Basic Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  dashboard:
    build:
      context: ./dashboard
      dockerfile: Dockerfile
    container_name: monitoring_dashboard
    ports:
      - '3000:80'
    environment:
      VITE_API_BASE_URL: http://server:8000
      VITE_WS_BASE_URL: ws://server:8000
      VITE_APP_TITLE: Server Monitoring Dashboard
    depends_on:
      - server
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  dashboard:
    build:
      context: ./dashboard
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: monitoring_dashboard_prod
    ports:
      - '80:80'
      - '443:443'
    environment:
      VITE_API_BASE_URL: https://api.monitoring.yourdomain.com
      VITE_WS_BASE_URL: wss://api.monitoring.yourdomain.com
      VITE_APP_TITLE: Production Server Monitoring
      VITE_REFRESH_INTERVAL: 30000
      VITE_ENABLE_DEBUG: false
      NGINX_WORKER_PROCESSES: auto
      NGINX_WORKER_CONNECTIONS: 2048
    volumes:
      - ./ssl:/etc/ssl/certs:ro
      - ./logs:/var/log/nginx
      - ./nginx-prod.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - server
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'https://localhost/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

  # Optional: Reverse proxy with SSL termination
  nginx-proxy:
    image: nginx:alpine
    container_name: nginx_proxy
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - certbot-data:/var/www/certbot
    depends_on:
      - dashboard
    restart: unless-stopped

  # Optional: SSL certificate management
  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - certbot-data:/var/www/certbot
    command: certonly --webroot --webroot-path=/var/www/certbot --email admin@yourdomain.com --agree-tos --no-eff-email -d monitoring.yourdomain.com

volumes:
  certbot-data:
```

### Multi-Stage Dockerfile

```dockerfile
# Multi-stage production Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit

# Copy source code
COPY . .

# Build arguments
ARG NODE_ENV=production
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy environment script
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Create log directory
RUN mkdir -p /var/log/nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html /var/log/nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Security: Run as non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 🚀 Production Deployment

### Kubernetes Deployment

#### Deployment Configuration

```yaml
# k8s/dashboard-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-dashboard
  labels:
    app: monitoring-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monitoring-dashboard
  template:
    metadata:
      labels:
        app: monitoring-dashboard
    spec:
      containers:
        - name: dashboard
          image: monitoring-dashboard:latest
          ports:
            - containerPort: 80
          env:
            - name: VITE_API_BASE_URL
              valueFrom:
                configMapKeyRef:
                  name: dashboard-config
                  key: api-base-url
            - name: VITE_WS_BASE_URL
              valueFrom:
                configMapKeyRef:
                  name: dashboard-config
                  key: ws-base-url
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
      volumes:
        - name: nginx-config
          configMap:
            name: nginx-config
```

#### Service Configuration

```yaml
# k8s/dashboard-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: monitoring-dashboard-service
spec:
  selector:
    app: monitoring-dashboard
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

#### Ingress Configuration

```yaml
# k8s/dashboard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-dashboard-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/proxy-read-timeout: '3600'
    nginx.ingress.kubernetes.io/proxy-send-timeout: '3600'
spec:
  tls:
    - hosts:
        - monitoring.yourdomain.com
      secretName: monitoring-dashboard-tls
  rules:
    - host: monitoring.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: monitoring-dashboard-service
                port:
                  number: 80
```

#### ConfigMap

```yaml
# k8s/dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-config
data:
  api-base-url: 'https://api.monitoring.yourdomain.com'
  ws-base-url: 'wss://api.monitoring.yourdomain.com'
  app-title: 'Production Server Monitoring'
  refresh-interval: '30000'
  enable-debug: 'false'
```

### Cloud Platform Deployments

#### AWS ECS Deployment

```json
{
  "family": "monitoring-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "dashboard",
      "image": "your-account.dkr.ecr.region.amazonaws.com/monitoring-dashboard:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "VITE_API_BASE_URL",
          "value": "https://api.monitoring.yourdomain.com"
        },
        {
          "name": "VITE_WS_BASE_URL",
          "value": "wss://api.monitoring.yourdomain.com"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/monitoring-dashboard",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Google Cloud Run Deployment

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: monitoring-dashboard
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '10'
        run.googleapis.com/cpu-throttling: 'false'
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
        - image: gcr.io/your-project/monitoring-dashboard:latest
          ports:
            - containerPort: 80
          env:
            - name: VITE_API_BASE_URL
              value: 'https://api.monitoring.yourdomain.com'
            - name: VITE_WS_BASE_URL
              value: 'wss://api.monitoring.yourdomain.com'
          resources:
            limits:
              cpu: '1'
              memory: '512Mi'
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
```

## 🔒 Security Configuration

### SSL/TLS Configuration

#### Nginx SSL Configuration

```nginx
# nginx-ssl.conf
server {
    listen 80;
    server_name monitoring.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monitoring.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/monitoring.yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/monitoring.yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss:; font-src 'self';" always;

    # Application configuration
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API proxy
    location /api/ {
        proxy_pass https://api.monitoring.yourdomain.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass https://api.monitoring.yourdomain.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Content Security Policy

```html
<!-- Enhanced CSP for production -->
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' wss: https:;
  font-src 'self';
  object-src 'none';
  media-src 'self';
  frame-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
"
/>
```

### Environment Security

```bash
# Production environment security
export NODE_ENV=production
export VITE_ENABLE_DEBUG=false
export VITE_ENABLE_DEVTOOLS=false
export VITE_SECURE_COOKIES=true
export VITE_ENABLE_CSP=true
export VITE_ENABLE_HSTS=true
export VITE_SESSION_TIMEOUT=3600
```

## ⚡ Performance Optimization

### Build Optimization

#### Vite Configuration

```typescript
// vite.config.ts - Production optimized
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          charts: ['recharts'],
          router: ['react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
```

### Nginx Performance Optimization

```nginx
# nginx-performance.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 100;
    types_hash_max_size 2048;
    server_tokens off;

    # Buffer settings
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Brotli compression (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript;

    # Cache settings
    open_file_cache max=200000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;

    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        # Connection limits
        limit_conn conn_limit_per_ip 20;

        # Static assets with aggressive caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
            try_files $uri =404;
        }

        # HTML files with no caching
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
        }

        # API proxy with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### Container Resource Optimization

```yaml
# docker-compose.performance.yml
version: '3.8'

services:
  dashboard:
    build:
      context: ./dashboard
      dockerfile: Dockerfile
    container_name: monitoring_dashboard
    ports:
      - '3000:80'
    environment:
      NGINX_WORKER_PROCESSES: auto
      NGINX_WORKER_CONNECTIONS: 2048
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Prometheus Metrics

```nginx
# nginx-metrics.conf - Add metrics endpoint
location /metrics {
    access_log off;
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;

    content_by_lua_block {
        local prometheus = require "resty.prometheus"
        prometheus:collect()
    }
}
```

#### Health Check Endpoint

```javascript
// public/health.js - Enhanced health check
window.healthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: process.env.VITE_APP_VERSION || 'unknown',
  environment: process.env.NODE_ENV || 'development',
  api: {
    baseUrl: window.ENV?.VITE_API_BASE_URL || 'unknown',
    wsUrl: window.ENV?.VITE_WS_BASE_URL || 'unknown',
  },
  features: {
    darkMode: window.ENV?.VITE_ENABLE_DARK_MODE === 'true',
    notifications: window.ENV?.VITE_ENABLE_NOTIFICATIONS === 'true',
    pwa: window.ENV?.VITE_ENABLE_PWA === 'true',
  },
};
```

### Logging Configuration

#### Structured Logging

```nginx
# nginx-logging.conf
http {
    log_format json_combined escape=json
    '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent",'
        '"http_x_forwarded_for":"$http_x_forwarded_for"'
    '}';

    access_log /var/log/nginx/access.log json_combined;
    error_log /var/log/nginx/error.log warn;
}
```

#### Log Rotation

```bash
# /etc/logrotate.d/nginx-dashboard
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

## 💾 Backup & Recovery

### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh - Backup dashboard configuration

BACKUP_DIR="/backup/dashboard"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="dashboard_config_${DATE}.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    .env* \
    nginx.conf \
    docker-compose*.yml \
    k8s/ \
    ssl/ \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs

echo "Configuration backup created: $BACKUP_DIR/$BACKUP_FILE"

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "dashboard_config_*.tar.gz" -mtime +30 -delete
```

### Disaster Recovery

```bash
#!/bin/bash
# restore-config.sh - Restore dashboard configuration

BACKUP_FILE=$1
RESTORE_DIR="/tmp/dashboard_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Extract backup
mkdir -p $RESTORE_DIR
tar -xzf $BACKUP_FILE -C $RESTORE_DIR

# Restore configuration
cp $RESTORE_DIR/.env* ./
cp $RESTORE_DIR/nginx.conf ./
cp $RESTORE_DIR/docker-compose*.yml ./
cp -r $RESTORE_DIR/k8s/ ./
cp -r $RESTORE_DIR/ssl/ ./

echo "Configuration restored from: $BACKUP_FILE"
echo "Please review configuration files before restarting services"
```

## 🔧 Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Debug container startup
docker logs monitoring_dashboard

# Check container health
docker inspect monitoring_dashboard | grep -A 10 Health

# Test health endpoint
curl -f http://localhost:3000/health
```

#### Performance Issues

```bash
# Monitor container resources
docker stats monitoring_dashboard

# Check nginx status
docker exec monitoring_dashboard nginx -t
docker exec monitoring_dashboard nginx -s reload

# Analyze bundle size
npm run build:analyze
```

#### SSL/TLS Issues

```bash
# Test SSL configuration
openssl s_client -connect monitoring.yourdomain.com:443 -servername monitoring.yourdomain.com

# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Verify certificate chain
curl -I https://monitoring.yourdomain.com
```

### Debug Mode

```bash
# Enable debug mode
docker run -d \
  --name monitoring-dashboard-debug \
  -p 3000:80 \
  -e VITE_ENABLE_DEBUG=true \
  -e VITE_LOG_LEVEL=debug \
  monitoring-dashboard

# View debug logs
docker logs -f monitoring-dashboard-debug
```

### Performance Monitoring

```bash
# Monitor application performance
lighthouse http://localhost:3000 --output=html --output-path=./performance-report.html

# Check bundle size
npm run size:check

# Security audit
npm run security:audit
```

---

This comprehensive deployment configuration guide covers all aspects of deploying the Server Monitoring Dashboard from development to production environments. Follow the appropriate sections based on your deployment needs and infrastructure requirements.
