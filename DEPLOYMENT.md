# Deployment Guide

This guide covers deploying the Linux Server Health Monitoring System in various environments.

## Docker Compose Deployment (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM and 10GB disk space
- Network access between agents and server

### Quick Start

1. **Clone and prepare the repository:**

   ```bash
   git clone <repository-url>
   cd linux-server-monitoring
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start the services:**

   ```bash
   docker-compose up -d
   ```

4. **Verify deployment:**

   ```bash
   # Check service status
   docker-compose ps

   # Check server health
   curl http://localhost:8000/api/v1/health

   # View logs
   docker-compose logs -f server
   ```

### Configuration

Edit the `.env` file to customize your deployment:

```bash
# Database settings
POSTGRES_DB=monitoring
POSTGRES_USER=monitoring_user
POSTGRES_PASSWORD=your_secure_password

# Server settings
SERVER_PORT=8000
ALERT_CPU_THRESHOLD=90.0
ALERT_DISK_THRESHOLD=80.0

# Webhook notifications (optional)
WEBHOOK_URLS=https://hooks.slack.com/your-webhook-url
```

### SSL/TLS Configuration

For production deployments, add a reverse proxy (nginx/traefik) with SSL:

```yaml
# Add to docker-compose.yml
nginx:
  image: nginx:alpine
  ports:
    - "443:443"
    - "80:80"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
    - ./ssl:/etc/ssl/certs
  depends_on:
    - server
```

## Agent Deployment

### Binary Installation (Recommended)

1. **Download the agent binary:**

   ```bash
   # Build from source or download pre-built binary
   wget https://releases.example.com/monitoring-agent-linux-amd64
   mv monitoring-agent-linux-amd64 agent
   chmod +x agent
   ```

2. **Run the installation script:**

   ```bash
   sudo ./install-agent.sh
   ```

3. **Configure the agent:**

   ```bash
   sudo nano /etc/monitoring-agent/config.yaml
   ```

   Update the server URL and API key:

   ```yaml
   server:
     url: "https://your-monitoring-server.com"
     api_key: "your_api_key_here"
   ```

4. **Start the agent:**
   ```bash
   sudo systemctl enable monitoring-agent
   sudo systemctl start monitoring-agent
   sudo systemctl status monitoring-agent
   ```

### Manual Installation

If you prefer manual installation:

1. **Create user and directories:**

   ```bash
   sudo useradd --system --home /opt/monitoring-agent monitoring
   sudo mkdir -p /opt/monitoring-agent /etc/monitoring-agent /var/log/monitoring-agent
   ```

2. **Install binary and configuration:**

   ```bash
   sudo cp agent /opt/monitoring-agent/
   sudo cp agent_config.yaml /etc/monitoring-agent/config.yaml
   sudo chown -R monitoring:monitoring /opt/monitoring-agent /var/log/monitoring-agent
   ```

3. **Install systemd service:**
   ```bash
   sudo cp monitoring-agent.service /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

## Production Considerations

### Security

1. **Use strong passwords and API keys**
2. **Enable SSL/TLS for all communications**
3. **Configure firewall rules:**

   ```bash
   # Allow only necessary ports
   sudo ufw allow 8000/tcp  # Server API
   sudo ufw enable
   ```

4. **Regular security updates:**

   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade

   # Update monitoring components
   docker-compose pull
   docker-compose up -d
   ```

### Monitoring and Maintenance

1. **Monitor server logs:**

   ```bash
   docker-compose logs -f server
   journalctl -u monitoring-agent -f
   ```

2. **Database backups:**

   ```bash
   # Backup PostgreSQL data
   docker-compose exec postgres pg_dump -U monitoring_user monitoring > backup.sql
   ```

3. **Health checks:**

   ```bash
   # Server health
   curl -f http://localhost:8000/api/v1/health

   # Agent status
   systemctl status monitoring-agent
   ```

### Scaling

For larger deployments:

1. **Use external PostgreSQL database**
2. **Deploy multiple server instances behind a load balancer**
3. **Implement centralized logging (ELK stack)**
4. **Use container orchestration (Kubernetes)**

## Troubleshooting

### Common Issues

1. **Agent cannot connect to server:**

   - Check network connectivity
   - Verify API key configuration
   - Check server logs for authentication errors

2. **Database connection issues:**

   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database exists

3. **High resource usage:**
   - Adjust collection intervals
   - Monitor database size
   - Check for failed services causing excessive logging

### Log Locations

- **Server logs:** `docker-compose logs server`
- **Agent logs:** `/var/log/monitoring-agent/agent.log` or `journalctl -u monitoring-agent`
- **Database logs:** `docker-compose logs postgres`

### Getting Help

1. Check the logs for error messages
2. Verify configuration files
3. Test network connectivity
4. Review system requirements
5. Consult the project documentation or issue tracker
