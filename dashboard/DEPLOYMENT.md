# Dashboard Deployment Guide

This document describes how to deploy the Server Monitoring Dashboard using Docker.

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- Access to the monitoring server API

### Environment Variables

The dashboard supports the following environment variables for configuration:

| Variable                | Description                           | Default                       |
| ----------------------- | ------------------------------------- | ----------------------------- |
| `VITE_API_BASE_URL`     | Base URL for the monitoring API       | `http://localhost:8000`       |
| `VITE_WS_BASE_URL`      | WebSocket URL for real-time updates   | `ws://localhost:8000`         |
| `VITE_APP_TITLE`        | Application title shown in browser    | `Server Monitoring Dashboard` |
| `VITE_REFRESH_INTERVAL` | Auto-refresh interval in milliseconds | `30000`                       |
| `VITE_ENABLE_DEBUG`     | Enable debug logging                  | `false`                       |
| `DASHBOARD_PORT`        | Port to expose the dashboard          | `3000`                        |

### Quick Start

1. **Using Docker Compose (Recommended)**

   The dashboard is included in the main `docker-compose.yml`:

   ```bash
   # Start all services including dashboard
   docker-compose up -d

   # Access dashboard at http://localhost:3000
   ```

2. **Standalone Docker Container**

   ```bash
   # Build the dashboard image
   docker build -t monitoring-dashboard ./dashboard

   # Run the container
   docker run -d \
     --name monitoring-dashboard \
     -p 3000:80 \
     -e VITE_API_BASE_URL=http://your-api-server:8000 \
     -e VITE_WS_BASE_URL=ws://your-api-server:8000 \
     monitoring-dashboard
   ```

### Production Configuration

For production deployments, create a `.env` file with your specific configuration:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env
```

Example production configuration:

```env
# Dashboard Configuration
DASHBOARD_PORT=80
DASHBOARD_API_URL=https://api.monitoring.yourdomain.com
DASHBOARD_WS_URL=wss://api.monitoring.yourdomain.com
DASHBOARD_TITLE=Production Server Monitoring
DASHBOARD_REFRESH_INTERVAL=15000
DASHBOARD_DEBUG=false
```

### SSL/TLS Configuration

For HTTPS deployments, you can:

1. **Use a reverse proxy** (recommended):
   - Place nginx, Traefik, or similar in front of the dashboard
   - Handle SSL termination at the proxy level

2. **Modify the nginx configuration**:
   - Update `dashboard/nginx.conf` to include SSL certificates
   - Mount certificate files as volumes

### Health Checks

The dashboard includes health check endpoints:

- **Container health**: `http://localhost:3000/health`
- **Application status**: Check if the dashboard loads correctly

### Monitoring and Logs

View dashboard logs:

```bash
# View logs
docker-compose logs dashboard

# Follow logs
docker-compose logs -f dashboard

# View nginx access logs
docker exec monitoring_dashboard tail -f /var/log/nginx/access.log
```

### Troubleshooting

**Common Issues:**

1. **Dashboard not loading**:
   - Check if the container is running: `docker ps`
   - Verify port mapping: `docker port monitoring_dashboard`
   - Check logs: `docker-compose logs dashboard`

2. **API connection errors**:
   - Verify `VITE_API_BASE_URL` points to the correct server
   - Ensure the API server is accessible from the dashboard container
   - Check network connectivity: `docker network ls`

3. **WebSocket connection issues**:
   - Verify `VITE_WS_BASE_URL` configuration
   - Check if WebSocket endpoints are available on the API server
   - Ensure proxy configuration supports WebSocket upgrades

4. **Environment variables not applied**:
   - Restart the container after changing environment variables
   - Check if the `env-config.js` file is generated correctly
   - Verify the environment script runs during container startup

### Performance Optimization

**Production Optimizations:**

1. **Enable gzip compression** (already configured in nginx.conf)
2. **Set appropriate cache headers** (already configured)
3. **Use CDN** for static assets if needed
4. **Monitor resource usage**:
   ```bash
   docker stats monitoring_dashboard
   ```

### Security Considerations

1. **Network Security**:
   - Use Docker networks to isolate services
   - Don't expose unnecessary ports

2. **Content Security**:
   - The nginx configuration includes security headers
   - Rate limiting is configured for API endpoints

3. **Authentication**:
   - The dashboard relies on the API server for authentication
   - Ensure HTTPS is used in production

### Scaling

For high-availability deployments:

1. **Multiple dashboard instances**:

   ```bash
   docker-compose up -d --scale dashboard=3
   ```

2. **Load balancer**:
   - Use nginx, HAProxy, or cloud load balancer
   - Configure health checks and failover

### Backup and Recovery

**Important files to backup**:

- Environment configuration (`.env`)
- Custom nginx configuration if modified
- SSL certificates if using custom SSL setup

The dashboard itself is stateless and doesn't require data backup.
