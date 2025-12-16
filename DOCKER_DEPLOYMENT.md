# 🐳 Complete Docker Deployment Guide

**The easiest way to deploy the Linux Server Health Monitoring System!**

This guide will walk you through deploying the complete monitoring system using Docker, including the server, dashboard, and database components.

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start-5-minutes)
- [Detailed Setup](#-detailed-setup)
- [Configuration](#-configuration)
- [Admin User Setup](#-admin-user-setup)
- [Adding Servers to Monitor](#-adding-servers-to-monitor)
- [Production Configuration](#-production-configuration)
- [Troubleshooting](#-troubleshooting)
- [Maintenance](#-maintenance)
- [Security](#-security)

## 🎯 Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows with WSL2
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 20GB free space minimum (50GB recommended for production)
- **Network**: Internet connection for downloading Docker images

### Required Software

1. **Docker Engine** (20.10.0 or later)
2. **Docker Compose** (2.0.0 or later)

### Installing Docker

**Ubuntu/Debian:**

```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Log out and back in, then verify
docker --version
docker compose version
```

**CentOS/RHEL/Rocky Linux:**

```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

**macOS:**

```bash
# Install Docker Desktop from https://docker.com/products/docker-desktop
# Or using Homebrew:
brew install --cask docker

# Start Docker Desktop and verify
docker --version
docker compose version
```

**Windows:**

- Install Docker Desktop from [docker.com](https://docker.com/products/docker-desktop)
- Enable WSL2 integration
- Verify installation in PowerShell or WSL2 terminal

## 🚀 Quick Start (5 Minutes)

### Step 1: Get the Code

```bash
# Clone the repository
git clone git@github.com:alokdeka/linux-server-monitoring.git
cd linux-server-monitoring

# Or download ZIP and extract
wget https://github.com/alokdeka/linux-server-monitoring/archive/main.zip
unzip main.zip
cd linux-server-monitoring-main
```

### Step 2: Configure Environment

```bash
# Copy the example configuration
cp .env.example .env

# Edit configuration (use your preferred editor)
nano .env
```

**Minimal required changes in `.env`:**

```bash
# Change to a secure password
POSTGRES_PASSWORD=your_super_secure_password_here

# Optional: Change ports if needed
DASHBOARD_PORT=3000
SERVER_PORT=8000
```

### Step 3: Start All Services

```bash
# Start all services in background
docker compose up -d

# Check if all services are running
docker compose ps
```

You should see output like:

```
NAME                   IMAGE                COMMAND                  SERVICE     CREATED         STATUS
monitoring_dashboard   node:20-alpine       "docker-entrypoint.s…"   dashboard   2 minutes ago   Up 2 minutes (healthy)
monitoring_postgres    postgres:15-alpine   "docker-entrypoint.s…"   postgres    2 minutes ago   Up 2 minutes (healthy)
monitoring_server      healthd-server       "python -m server.ma…"   server      2 minutes ago   Up 2 minutes (healthy)
```

### Step 4: Create Admin User

```bash
# Create your first admin user
docker compose exec server python server/cli/create_admin.py
```

Follow the prompts:

```
Creating admin user for the dashboard...
==================================================
Enter admin username: admin
Enter admin email (optional): admin@yourdomain.com
Enter full name (optional): System Administrator
Enter admin password: [your secure password]
Confirm admin password: [your secure password]

Admin user 'admin' created successfully!
```

### Step 5: Access Dashboard

1. **Open your browser** and go to: `http://localhost:3000`
2. **Login** with the credentials you just created
3. **Verify everything works** - you should see the dashboard interface

### Step 6: Test the System

```bash
# Test API health
curl http://localhost:8000/api/v1/health

# Should return: {"status":"healthy","timestamp":"..."}
```

**🎉 Congratulations!** Your monitoring system is now running!

## 🔧 Detailed Setup

### Understanding the Architecture

The Docker deployment includes three main services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │     Server      │    │   PostgreSQL    │
│   (React App)   │◄──►│   (FastAPI)     │◄──►│   (Database)    │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Details

#### 1. PostgreSQL Database (`postgres`)

- **Image**: `postgres:15-alpine`
- **Purpose**: Stores all monitoring data, alerts, and user information
- **Data**: Persisted in Docker volume `postgres_data`
- **Health Check**: Automatic PostgreSQL readiness check

#### 2. FastAPI Server (`server`)

- **Image**: Built from `Dockerfile.server`
- **Purpose**: API backend, data processing, alert management
- **Dependencies**: Waits for PostgreSQL to be healthy
- **Features**: JWT authentication, WebSocket support, rate limiting

#### 3. React Dashboard (`dashboard`)

- **Image**: `node:20-alpine` (development mode)
- **Purpose**: Web interface for monitoring and management
- **Features**: Real-time updates, responsive design, modern UI

### Network Configuration

All services communicate through a dedicated Docker network:

- **Network Name**: `monitoring_network`
- **Type**: Bridge network
- **Internal Communication**: Services can reach each other by service name
- **External Access**: Only dashboard (3000) and server (8000) are exposed

## ⚙️ Configuration

### Environment Variables

The system uses a comprehensive `.env` file for configuration:

```bash
# Database Configuration
POSTGRES_DB=monitoring                    # Database name
POSTGRES_USER=monitoring_user            # Database username
POSTGRES_PASSWORD=monitoring_pass        # Database password (CHANGE THIS!)
POSTGRES_PORT=5432                      # Database port

# Server Configuration
SERVER_HOST=0.0.0.0                     # Server bind address
SERVER_PORT=8000                        # Server port
LOG_LEVEL=info                          # Logging level (debug, info, warning, error)

# Alert Configuration
ALERT_CPU_THRESHOLD=90.0                # CPU alert threshold (%)
ALERT_DISK_THRESHOLD=80.0               # Disk alert threshold (%)
ALERT_OFFLINE_TIMEOUT=300               # Offline timeout (seconds)

# Webhook Configuration
WEBHOOK_URLS=                           # Comma-separated webhook URLs

# Rate Limiting Configuration
RATE_LIMIT_REQUESTS=1000                # Requests per window
RATE_LIMIT_WINDOW=60                    # Window size (seconds)

# Dashboard Configuration
DASHBOARD_PORT=3000                     # Dashboard port
DASHBOARD_API_URL=http://localhost:8000 # API URL for dashboard
DASHBOARD_WS_URL=ws://localhost:8000    # WebSocket URL
DASHBOARD_TITLE=Server Monitoring Dashboard
DASHBOARD_REFRESH_INTERVAL=30000        # Auto-refresh interval (ms)
DASHBOARD_DEBUG=false                   # Enable debug mode
```

### Advanced Configuration

#### Custom Ports

If you need to use different ports:

```bash
# In .env file
DASHBOARD_PORT=8080
SERVER_PORT=9000
POSTGRES_PORT=5433

# Restart services
docker compose down
docker compose up -d
```

#### External Database

To use an external PostgreSQL database:

```bash
# In .env file
DATABASE_URL=postgresql://user:password@external-db-host:5432/monitoring

# Comment out or remove the postgres service from docker-compose.yml
# Update server service to remove postgres dependency
```

#### SSL/TLS Configuration

For production with SSL:

1. **Create nginx configuration:**

```bash
# Create nginx.conf
cat > nginx.conf << 'EOF'
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://dashboard:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://server:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://server:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
```

2. **Add nginx service to docker-compose.yml:**

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "443:443"
    - "80:80"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
    - ./ssl-certs:/etc/ssl/certs
    - ./ssl-private:/etc/ssl/private
  depends_on:
    - server
    - dashboard
  networks:
    - monitoring_network
```

## 👤 Admin User Setup

### Creating Admin Users

The system requires at least one admin user to access the dashboard:

```bash
# Interactive admin creation
docker compose exec server python server/cli/create_admin.py

# Non-interactive (for automation)
docker compose exec server python server/cli/create_admin.py \
  --username admin \
  --email admin@example.com \
  --password "SecurePassword123" \
  --full-name "System Administrator"
```

### Managing Admin Users

```bash
# List existing users
docker compose exec postgres psql -U monitoring_user -d monitoring \
  -c "SELECT id, username, email, full_name, created_at FROM dashboard_users;"

# Reset user password (requires recreating user)
docker compose exec server python server/cli/create_admin.py
# Use same username to update existing user
```

### User Roles and Permissions

Currently, all users created via the admin script have full administrative access:

- View all servers and metrics
- Manage server registrations
- Configure alert settings
- Access all dashboard features

## 📡 Adding Servers to Monitor

### Step 1: Register Server in Dashboard

1. **Access the dashboard** at `http://localhost:3000`
2. **Navigate to "Server Management"**
3. **Click "Register New Server"**
4. **Fill in server details:**
   - **Server Name**: `web-server-01` (descriptive name)
   - **IP Address**: `192.168.1.100` (server's IP)
   - **Description**: `Main web server` (optional)
5. **Click "Generate API Key"**
6. **Copy the installation command** that appears

### Step 2: Install Agent on Target Server

The dashboard provides a ready-to-use installation command:

```bash
# Example command (yours will have a unique API key)
curl -sSL http://your-monitoring-server:8000/install-agent.sh | bash -s -- \
  --api-key="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz" \
  --server-url="http://your-monitoring-server:8000"
```

**What this command does:**

1. Downloads the installation script from your monitoring server
2. Installs the monitoring agent binary
3. Configures the agent with your API key and server URL
4. Sets up systemd service for automatic startup
5. Starts monitoring immediately

### Step 3: Verify Agent Installation

**On the monitored server:**

```bash
# Check agent status
sudo systemctl status monitoring-agent

# View agent logs
sudo journalctl -u monitoring-agent -f

# Test agent connectivity
sudo /opt/monitoring-agent/agent --test-connection
```

**In the dashboard:**

- The server should appear in the "Servers" page within 1-2 minutes
- Status should show as "Online" with a green indicator
- Metrics should start appearing in real-time charts

### Bulk Server Registration

For multiple servers, you can automate the process:

```bash
# Create a script for bulk registration
cat > register_servers.sh << 'EOF'
#!/bin/bash

SERVERS=(
  "web-01:192.168.1.10:Main web server"
  "db-01:192.168.1.20:Primary database"
  "cache-01:192.168.1.30:Redis cache server"
)

for server in "${SERVERS[@]}"; do
  IFS=':' read -r name ip desc <<< "$server"
  echo "Registering $name ($ip)..."

  # Use API to register server (requires authentication token)
  curl -X POST http://localhost:8000/api/v1/dashboard/management/servers/register \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"hostname\": \"$name\",
      \"ip_address\": \"$ip\",
      \"description\": \"$desc\"
    }"
done
EOF

chmod +x register_servers.sh
```

## 🏭 Production Configuration

### Resource Allocation

For production deployments, configure resource limits:

```yaml
# Add to docker-compose.yml services
services:
  server:
    # ... existing configuration
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"
        reservations:
          memory: 1G
          cpus: "0.5"
    restart: unless-stopped

  dashboard:
    # ... existing configuration
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
        reservations:
          memory: 256M
          cpus: "0.25"
    restart: unless-stopped

  postgres:
    # ... existing configuration
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "2.0"
        reservations:
          memory: 2G
          cpus: "1.0"
    restart: unless-stopped
```

### Data Persistence and Backups

#### Database Backups

```bash
# Create backup script
cat > backup_database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/monitoring-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/monitoring_backup_$DATE.sql"

mkdir -p "$BACKUP_DIR"

# Create database backup
docker compose exec postgres pg_dump -U monitoring_user monitoring > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
EOF

chmod +x backup_database.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup_database.sh" | crontab -
```

#### Volume Management

```bash
# List Docker volumes
docker volume ls

# Backup volume data
docker run --rm -v monitoring_postgres_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres_data_backup.tar.gz -C /data .

# Restore volume data
docker run --rm -v monitoring_postgres_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/postgres_data_backup.tar.gz -C /data
```

### Monitoring and Logging

#### Log Management

```bash
# Configure log rotation in docker-compose.yml
services:
  server:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

# View logs
docker compose logs -f server
docker compose logs -f dashboard
docker compose logs -f postgres

# Export logs for analysis
docker compose logs server > server_logs.txt
```

#### Health Monitoring

```bash
# Check service health
docker compose ps
docker compose exec server curl -f http://localhost:8000/api/v1/health
docker compose exec postgres pg_isready -U monitoring_user

# Monitor resource usage
docker stats

# Set up external monitoring
curl -f http://your-server:8000/api/v1/health || echo "Server down!" | mail -s "Alert" admin@example.com
```

### Security Hardening

#### Network Security

```bash
# Create custom network with restricted access
docker network create --driver bridge --subnet=172.20.0.0/16 monitoring_secure

# Update docker-compose.yml to use custom network
networks:
  monitoring_network:
    external: true
    name: monitoring_secure
```

#### Firewall Configuration

```bash
# Configure UFW (Ubuntu Firewall)
sudo ufw enable
sudo ufw allow 22/tcp          # SSH
sudo ufw allow 3000/tcp        # Dashboard
sudo ufw allow 8000/tcp        # API Server
sudo ufw deny 5432/tcp         # Block direct database access

# For production, consider using a reverse proxy
sudo ufw deny 3000/tcp         # Block direct dashboard access
sudo ufw deny 8000/tcp         # Block direct API access
sudo ufw allow 80/tcp          # HTTP
sudo ufw allow 443/tcp         # HTTPS
```

#### SSL/TLS Certificates

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Configure auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Services Won't Start

**Problem**: `docker compose up -d` fails

**Solutions**:

```bash
# Check Docker daemon
sudo systemctl status docker
sudo systemctl start docker

# Check for port conflicts
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :5432

# Check Docker Compose file syntax
docker compose config

# View detailed error messages
docker compose up --no-deps server
```

#### Database Connection Issues

**Problem**: Server can't connect to database

**Solutions**:

```bash
# Check database status
docker compose ps postgres
docker compose logs postgres

# Test database connectivity
docker compose exec postgres psql -U monitoring_user -d monitoring -c "SELECT 1;"

# Reset database (WARNING: Deletes all data)
docker compose down
docker volume rm monitoring_postgres_data
docker compose up -d
```

#### Dashboard Not Loading

**Problem**: Dashboard shows blank page or errors

**Solutions**:

```bash
# Check dashboard logs
docker compose logs dashboard

# Verify API connectivity from dashboard container
docker compose exec dashboard curl http://server:8000/api/v1/health

# Check environment variables
docker compose exec dashboard env | grep VITE

# Restart dashboard service
docker compose restart dashboard
```

#### Agent Connection Issues

**Problem**: Agents can't connect to server

**Solutions**:

```bash
# Test API endpoint accessibility
curl http://your-server:8000/api/v1/health

# Check server logs for connection attempts
docker compose logs server | grep -i agent

# Verify firewall settings
sudo ufw status
sudo iptables -L

# Test from agent server
curl -X POST http://your-server:8000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test","ip_address":"1.2.3.4"}'
```

#### High Resource Usage

**Problem**: Docker containers using too much CPU/memory

**Solutions**:

```bash
# Monitor resource usage
docker stats

# Check for resource limits
docker compose config | grep -A 5 resources

# Optimize PostgreSQL settings
# Add to docker-compose.yml postgres service:
environment:
  - POSTGRES_SHARED_BUFFERS=256MB
  - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
  - POSTGRES_MAINTENANCE_WORK_MEM=64MB

# Clean up old data
docker compose exec postgres psql -U monitoring_user -d monitoring -c "
DELETE FROM metrics WHERE timestamp < NOW() - INTERVAL '30 days';
VACUUM ANALYZE;
"
```

#### WebSocket Connection Failures

**Problem**: Real-time updates not working

**Solutions**:

```bash
# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:8000/ws

# Check server logs for WebSocket errors
docker compose logs server | grep -i websocket

# Verify WebSocket libraries are installed
docker compose exec server python -c "import websockets; print('WebSocket support OK')"

# Test with authentication token
# (Get token from dashboard network tab in browser dev tools)
```

### Performance Optimization

#### Database Performance

```bash
# Optimize PostgreSQL configuration
cat > postgres_custom.conf << 'EOF'
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Connection settings
max_connections = 100
shared_preload_libraries = 'pg_stat_statements'
EOF

# Add to docker-compose.yml postgres service:
volumes:
  - ./postgres_custom.conf:/etc/postgresql/postgresql.conf
command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

#### Application Performance

```bash
# Enable production optimizations in .env
LOG_LEVEL=warning
DASHBOARD_DEBUG=false
DASHBOARD_REFRESH_INTERVAL=60000

# Use production build for dashboard
# Modify docker-compose.yml dashboard service:
command: sh -c "npm run build && npm run preview -- --host 0.0.0.0"
```

### Debugging Tools

#### Container Debugging

```bash
# Access container shell
docker compose exec server bash
docker compose exec dashboard sh
docker compose exec postgres bash

# Check container processes
docker compose exec server ps aux
docker compose top server

# Monitor container logs in real-time
docker compose logs -f --tail=100 server

# Check container networking
docker compose exec server netstat -tulpn
docker network inspect monitoring_monitoring_network
```

#### Application Debugging

```bash
# Enable debug logging
# In .env file:
LOG_LEVEL=debug
DASHBOARD_DEBUG=true

# Check API endpoints manually
curl -v http://localhost:8000/api/v1/health
curl -v http://localhost:8000/docs

# Test database queries
docker compose exec postgres psql -U monitoring_user -d monitoring -c "
SELECT COUNT(*) as total_metrics FROM metrics;
SELECT COUNT(*) as total_servers FROM servers;
SELECT COUNT(*) as total_alerts FROM alerts;
"
```

## 🔄 Maintenance

### Regular Maintenance Tasks

#### Daily Tasks

```bash
# Check service health
docker compose ps
curl -f http://localhost:8000/api/v1/health

# Monitor resource usage
docker stats --no-stream

# Check logs for errors
docker compose logs --since=24h server | grep -i error
```

#### Weekly Tasks

```bash
# Update Docker images
docker compose pull
docker compose up -d

# Clean up old data (keep 30 days)
docker compose exec postgres psql -U monitoring_user -d monitoring -c "
DELETE FROM metrics WHERE timestamp < NOW() - INTERVAL '30 days';
DELETE FROM alerts WHERE triggered_at < NOW() - INTERVAL '30 days';
VACUUM ANALYZE;
"

# Backup database
./backup_database.sh
```

#### Monthly Tasks

```bash
# System updates
sudo apt update && sudo apt upgrade

# Docker system cleanup
docker system prune -f
docker volume prune -f

# Review and rotate logs
docker compose logs server > monthly_server_logs.txt
docker compose logs dashboard > monthly_dashboard_logs.txt

# Security audit
docker scout cves monitoring_server
docker scout cves monitoring_dashboard
```

### Scaling and Upgrades

#### Horizontal Scaling

```bash
# Scale dashboard instances
docker compose up -d --scale dashboard=3

# Add load balancer (nginx example)
cat > nginx_lb.conf << 'EOF'
upstream dashboard {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://dashboard;
    }
}
EOF
```

#### Version Updates

```bash
# Backup before updating
./backup_database.sh

# Pull latest images
docker compose pull

# Update with zero downtime
docker compose up -d --no-deps server
docker compose up -d --no-deps dashboard

# Verify update
curl http://localhost:8000/api/v1/health
```

### Disaster Recovery

#### Complete System Recovery

```bash
# 1. Restore from backup
docker compose down
docker volume rm monitoring_postgres_data
docker volume create monitoring_postgres_data

# 2. Restore database
docker run --rm -v monitoring_postgres_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/postgres_data_backup.tar.gz -C /data

# 3. Start services
docker compose up -d

# 4. Verify recovery
curl http://localhost:8000/api/v1/health
```

## 🔒 Security

### Security Best Practices

#### Authentication and Authorization

```bash
# Use strong passwords
# Minimum 12 characters with mixed case, numbers, and symbols

# Regular password rotation
docker compose exec server python server/cli/create_admin.py
# Update existing user with new password

# API key management
# Rotate API keys regularly through dashboard
# Monitor API key usage in server logs
```

#### Network Security

```bash
# Restrict network access
# Use Docker networks to isolate services
# Configure firewall rules
# Use reverse proxy for SSL termination

# Monitor network traffic
docker compose exec server netstat -tulpn
ss -tulpn | grep -E ':(3000|8000|5432)'
```

#### Data Protection

```bash
# Encrypt data at rest
# Use encrypted Docker volumes
# Enable PostgreSQL SSL

# Encrypt data in transit
# Use HTTPS/WSS for all communications
# Configure proper SSL certificates

# Regular security updates
docker compose pull
sudo apt update && sudo apt upgrade
```

#### Audit and Monitoring

```bash
# Enable audit logging
# Monitor authentication attempts
# Track API usage patterns
# Set up intrusion detection

# Regular security scans
docker scout cves
nmap -sV localhost
```

---

## 🎉 Conclusion

You now have a complete, production-ready monitoring system running in Docker! The system provides:

- ✅ **Real-time monitoring** of all your servers
- ✅ **Beautiful web dashboard** accessible from anywhere
- ✅ **Automated alerts** when issues occur
- ✅ **Secure authentication** and API access
- ✅ **Scalable architecture** ready for growth

### Next Steps

1. **Add your servers** using the dashboard interface
2. **Configure alerts** for your specific thresholds
3. **Set up notifications** (Slack, email, webhooks)
4. **Monitor and optimize** based on your usage patterns

### Getting Help

- 📖 **Documentation**: Check the comprehensive guides in this repository
- 🐛 **Issues**: Report bugs or request features on GitHub
- 💬 **Support**: Contact [@alokdeka](https://github.com/alokdeka) for assistance

**Happy monitoring!** 🚀
