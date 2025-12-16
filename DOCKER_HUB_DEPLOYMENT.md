# 🐳 Docker Hub Deployment Guide

**Deploy the Linux Server Health Monitoring System using pre-built Docker Hub images!**

This is the fastest way to get the monitoring system running - no building required, just pull and run!

## 🚀 Quick Start (2 Minutes!)

### Step 1: Download Docker Compose File

```bash
# Download the Docker Hub compose file
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml

# Or create the directory and download
mkdir monitoring-system && cd monitoring-system
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml
```

### Step 2: Configure Environment

```bash
# Create environment file
cat > .env << 'EOF'
# Database Configuration
POSTGRES_DB=monitoring
POSTGRES_USER=monitoring_user
POSTGRES_PASSWORD=your_secure_password_here

# Server Configuration
SERVER_PORT=8000
LOG_LEVEL=info

# Dashboard Configuration
DASHBOARD_PORT=3000
DASHBOARD_API_URL=http://localhost:8000
DASHBOARD_WS_URL=ws://localhost:8000
DASHBOARD_TITLE=Server Monitoring Dashboard

# Alert Configuration
ALERT_CPU_THRESHOLD=90.0
ALERT_DISK_THRESHOLD=80.0
ALERT_OFFLINE_TIMEOUT=300

# Rate Limiting
RATE_LIMIT_REQUESTS=300
RATE_LIMIT_WINDOW=60
EOF
```

**Important**: Change `your_secure_password_here` to a strong password!

### Step 3: Start the System

```bash
# Pull and start all services
docker compose up -d

# Check if all services are running
docker compose ps
```

### Step 4: Create Admin User

```bash
# Create your admin user
docker compose exec server python server/cli/create_admin.py
```

### Step 5: Access Your Dashboard

- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

**🎉 That's it!** Your monitoring system is running with pre-built Docker Hub images!

## 📦 Available Docker Images

### Server Image

- **Repository**: `alokdekadev/monitoring-server`
- **Tags**: `latest`, version tags (e.g., `v1.0.0`)
- **Platforms**: `linux/amd64`, `linux/arm64`
- **Size**: ~200MB

```bash
docker pull alokdekadev/monitoring-server:latest
```

### Dashboard Image

- **Repository**: `alokdekadev/monitoring-dashboard`
- **Tags**: `latest`, version tags (e.g., `v1.0.0`)
- **Platforms**: `linux/amd64`, `linux/arm64`
- **Size**: ~50MB

```bash
docker pull alokdekadev/monitoring-dashboard:latest
```

## 🔧 Configuration Options

### Environment Variables

The Docker Hub deployment supports all the same environment variables as the local build:

```bash
# Database Settings
POSTGRES_DB=monitoring
POSTGRES_USER=monitoring_user
POSTGRES_PASSWORD=secure_password

# Server Settings
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
LOG_LEVEL=info

# Dashboard Settings
DASHBOARD_PORT=3000
DASHBOARD_API_URL=http://localhost:8000
DASHBOARD_WS_URL=ws://localhost:8000
DASHBOARD_TITLE=Server Monitoring Dashboard
DASHBOARD_REFRESH_INTERVAL=30000
DASHBOARD_DEBUG=false

# Alert Settings
ALERT_CPU_THRESHOLD=90.0
ALERT_DISK_THRESHOLD=80.0
ALERT_OFFLINE_TIMEOUT=300

# Webhook Settings (optional)
WEBHOOK_URLS=https://hooks.slack.com/your-webhook

# Rate Limiting
RATE_LIMIT_REQUESTS=300
RATE_LIMIT_WINDOW=60
```

### Custom Ports

```bash
# Use different ports
DASHBOARD_PORT=8080
SERVER_PORT=9000
POSTGRES_PORT=5433
```

### Production Configuration

```bash
# Production settings
LOG_LEVEL=warning
DASHBOARD_DEBUG=false
DASHBOARD_REFRESH_INTERVAL=60000
RATE_LIMIT_REQUESTS=1000
```

## 🌐 Remote Server Deployment

### Deploy on a VPS/Cloud Server

```bash
# SSH into your server
ssh user@your-server-ip

# Create deployment directory
mkdir -p ~/monitoring-system
cd ~/monitoring-system

# Download compose file
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml

# Create environment file with your server's IP
cat > .env << EOF
POSTGRES_PASSWORD=your_secure_password
DASHBOARD_API_URL=http://your-server-ip:8000
DASHBOARD_WS_URL=ws://your-server-ip:8000
EOF

# Start services
docker compose up -d

# Create admin user
docker compose exec server python server/cli/create_admin.py
```

### Access from External Networks

Update your environment file:

```bash
# For external access
DASHBOARD_API_URL=http://your-domain.com:8000
DASHBOARD_WS_URL=ws://your-domain.com:8000

# Or with custom ports
DASHBOARD_PORT=80
SERVER_PORT=8000
DASHBOARD_API_URL=http://your-domain.com:8000
DASHBOARD_WS_URL=ws://your-domain.com:8000
```

## 🔒 Production Security

### SSL/TLS with Reverse Proxy

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Firewall Configuration

```bash
# Configure UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# For development (allow direct access)
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
```

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check service health
docker compose ps
curl -f http://localhost:8000/api/v1/health

# View logs
docker compose logs -f server
docker compose logs -f dashboard
```

### Updates

```bash
# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# Clean up old images
docker image prune -f
```

### Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U monitoring_user monitoring > backup.sql

# Backup volumes
docker run --rm -v monitoring_postgres_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/postgres_backup.tar.gz -C /data .
```

## 🔧 Troubleshooting

### Common Issues

**Images not pulling:**

```bash
# Check Docker Hub connectivity
docker pull hello-world

# Pull images manually
docker pull alokdekadev/monitoring-server:latest
docker pull alokdekadev/monitoring-dashboard:latest
```

**Services not starting:**

```bash
# Check logs
docker compose logs server
docker compose logs dashboard

# Restart services
docker compose restart
```

**Can't access dashboard:**

```bash
# Check if services are running
docker compose ps

# Test API directly
curl http://localhost:8000/api/v1/health

# Check firewall
sudo ufw status
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Increase resources if needed
# Edit docker-compose.yml and add:
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
```

## 🚀 Scaling

### Multiple Dashboard Instances

```bash
# Scale dashboard
docker compose up -d --scale dashboard=3

# Use load balancer (nginx, HAProxy, etc.)
```

### External Database

```bash
# Use external PostgreSQL
# Remove postgres service from docker-compose.yml
# Update DATABASE_URL in .env:
DATABASE_URL=postgresql://user:pass@external-db:5432/monitoring
```

## 📋 Complete Example

Here's a complete production deployment example:

```bash
# 1. Create deployment directory
mkdir -p ~/monitoring-production
cd ~/monitoring-production

# 2. Download compose file
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml

# 3. Create production environment
cat > .env << 'EOF'
# Database
POSTGRES_DB=monitoring
POSTGRES_USER=monitoring_user
POSTGRES_PASSWORD=SuperSecurePassword123!

# Server
SERVER_PORT=8000
LOG_LEVEL=warning

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_API_URL=https://monitoring.yourdomain.com
DASHBOARD_WS_URL=wss://monitoring.yourdomain.com
DASHBOARD_TITLE=Production Server Monitoring
DASHBOARD_REFRESH_INTERVAL=60000
DASHBOARD_DEBUG=false

# Alerts
ALERT_CPU_THRESHOLD=85.0
ALERT_DISK_THRESHOLD=90.0
ALERT_OFFLINE_TIMEOUT=300

# Webhooks
WEBHOOK_URLS=https://hooks.slack.com/your-webhook-url

# Rate Limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60
EOF

# 4. Start services
docker compose up -d

# 5. Create admin user
docker compose exec server python server/cli/create_admin.py

# 6. Verify deployment
curl -f http://localhost:8000/api/v1/health
```

## 🎯 Advantages of Docker Hub Deployment

✅ **No Build Time** - Images are pre-built and optimized
✅ **Faster Deployment** - Just pull and run
✅ **Multi-Architecture** - Works on AMD64 and ARM64
✅ **Automatic Updates** - Pull latest images anytime
✅ **Smaller Download** - Optimized image layers
✅ **Production Ready** - Images are tested and secure
✅ **Easy Scaling** - Standard Docker deployment patterns

## 🔗 Links

- **Docker Hub Server**: https://hub.docker.com/r/alokdekadev/monitoring-server
- **Docker Hub Dashboard**: https://hub.docker.com/r/alokdekadev/monitoring-dashboard
- **GitHub Repository**: https://github.com/alokdeka/linux-server-monitoring
- **Documentation**: https://github.com/alokdeka/linux-server-monitoring/blob/main/README.md

---

**Ready to monitor your servers?** 🚀

```bash
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml && docker compose up -d
```
