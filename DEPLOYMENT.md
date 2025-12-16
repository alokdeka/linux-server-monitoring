# 🚀 Complete Installation Guide

**Never installed a monitoring system before? No problem!** This guide will walk you through everything step by step.

## 🎯 What You'll Get

After following this guide, you'll have:

- ✅ A beautiful web dashboard to monitor all your servers
- ✅ Automatic alerts when servers have problems
- ✅ Real-time charts showing server performance
- ✅ Email/Slack notifications when things go wrong

## 📋 Before You Start

### What You Need:

- **A computer or server** to run the monitoring system (can be one of your existing servers)
- **Basic command line knowledge** (we'll show you every command)
- **10 minutes of your time**

### System Requirements:

- **Operating System**: Linux (Ubuntu, CentOS, etc.) or macOS/Windows with Docker
- **Memory**: At least 2GB RAM
- **Storage**: At least 10GB free space
- **Network**: Internet connection

## 🐳 Method 1: Super Easy Docker Installation (Recommended)

**Why Docker?** It's like installing an app - everything is packaged and ready to go!

### Step 1: Install Docker (if you don't have it)

**On Ubuntu/Debian:**

```bash
# Update your system
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Log out and back in, then test
docker --version
```

**On CentOS/RHEL:**

```bash
# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker --version
```

**On macOS/Windows:**

- Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
- Install and start it

### Step 2: Get the Monitoring System

```bash
# Download the code
git clone git@github.com:alokdeka/linux-server-monitoring.git
cd linux-server-monitoring

# If you don't have git, download the ZIP file from GitHub and extract it
```

### Step 3: Configure Your Settings

```bash
# Copy the example configuration
cp .env.example .env

# Edit the configuration file
nano .env
```

**Edit these important settings in the .env file:**

```bash
# Change this to a strong password!
POSTGRES_PASSWORD=your_super_secure_password_here

# Change this if you want to use a different port
DASHBOARD_PORT=3000

# Add your email for notifications (optional)
ADMIN_EMAIL=your-email@example.com
```

**Save the file:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Start Everything

```bash
# Start all services (this might take a few minutes the first time)
docker-compose up -d

# Check if everything is running
docker-compose ps
```

You should see something like:

```
       Name                     Command               State           Ports
--------------------------------------------------------------------------------
monitoring_dashboard_1   nginx -g daemon off;             Up      0.0.0.0:3000->80/tcp
monitoring_postgres_1    docker-entrypoint.sh postgres   Up      5432/tcp
monitoring_server_1      python server/main.py           Up      0.0.0.0:8000->8000/tcp
```

### Step 5: Access Your Dashboard

1. **Open your web browser**
2. **Go to:** `http://localhost:3000` (or `http://your-server-ip:3000` if on a remote server)
3. **Login with:**
   - Username: `admin`
   - Password: `admin`

**🔒 IMPORTANT:** Change the default password immediately!

- Click your name in the top right
- Go to "Settings"
- Change your password

### Step 6: Test Everything Works

1. **Check the dashboard loads** - You should see charts and server information
2. **Check the API works** - Run this command:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```
   You should get a response like: `{"status":"healthy"}`

**🎉 Congratulations!** Your monitoring system is now running!

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

## 📡 Adding Servers to Monitor

Now that your monitoring system is running, let's add your first server!

### Step 1: Generate an API Key

1. **Go to your dashboard** (`http://localhost:3000`)
2. **Click "Server Management"** in the sidebar
3. **Fill in the form:**
   - Server Name: `my-web-server` (or whatever you want to call it)
   - IP Address: `192.168.1.100` (your server's IP)
   - Description: `My main web server`
4. **Click "Generate API Key"**
5. **Copy the installation command** that appears

### Step 2: Install the Agent on Your Server

**The Easy Way (Recommended):**

1. **SSH into your server:**

   ```bash
   ssh username@your-server-ip
   ```

2. **Run the installation command** (the one you copied from the dashboard):
   ```bash
   # This will look something like:
   curl -sSL http://your-monitoring-server:8000/install-agent.sh | sudo bash -s -- --api-key=abc123...
   ```

**The Manual Way (If you prefer to see what's happening):**

1. **Download the installer:**

   ```bash
   wget http://your-monitoring-server:8000/install-agent.sh
   chmod +x install-agent.sh
   ```

2. **Run the installer:**

   ```bash
   sudo ./install-agent.sh
   ```

3. **Configure the agent:**

   ```bash
   sudo nano /etc/monitoring-agent/config.yaml
   ```

   **Add your settings:**

   ```yaml
   # Your monitoring server URL
   server_url: "http://your-monitoring-server:8000"

   # How often to collect metrics (in seconds)
   collection_interval: 60

   # Server identification
   server_id: "my-web-server"
   ```

4. **Set your API key:**

   ```bash
   sudo nano /etc/monitoring-agent/environment
   ```

   **Add this line:**

   ```bash
   MONITORING_API_KEY=your_api_key_here
   ```

5. **Start the agent:**
   ```bash
   sudo systemctl enable monitoring-agent
   sudo systemctl start monitoring-agent
   ```

### Step 3: Verify It's Working

1. **Check the agent status:**

   ```bash
   sudo systemctl status monitoring-agent
   ```

   You should see: `Active: active (running)`

2. **Check the logs:**

   ```bash
   sudo journalctl -u monitoring-agent -f
   ```

   You should see messages like: `Metrics sent successfully`

3. **Check your dashboard:**
   - Go back to your dashboard
   - Click "Servers" in the sidebar
   - You should see your server listed with a green "Online" status

**🎉 Success!** Your server is now being monitored!

### Troubleshooting Agent Installation

**Problem: Agent won't start**

```bash
# Check what's wrong
sudo journalctl -u monitoring-agent --no-pager

# Common fixes:
# 1. Check the API key is correct
sudo nano /etc/monitoring-agent/environment

# 2. Check the server URL is reachable
curl http://your-monitoring-server:8000/api/v1/health

# 3. Restart the agent
sudo systemctl restart monitoring-agent
```

**Problem: Can't connect to monitoring server**

```bash
# Test network connection
ping your-monitoring-server-ip

# Test API endpoint
curl http://your-monitoring-server:8000/api/v1/health

# Check firewall (if needed)
sudo ufw allow 8000/tcp
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

## 🔧 Troubleshooting Guide

**Having problems? Don't worry! Here are solutions to common issues.**

### 🚨 Dashboard Won't Load

**Problem:** Can't access `http://localhost:3000`

**Solutions:**

```bash
# 1. Check if services are running
docker-compose ps

# 2. If not running, start them
docker-compose up -d

# 3. Check for errors
docker-compose logs dashboard

# 4. Try a different port (edit .env file)
DASHBOARD_PORT=3001
docker-compose up -d
```

### 🔌 Can't Connect to API

**Problem:** Dashboard loads but shows "Connection Error"

**Solutions:**

```bash
# 1. Test the API directly
curl http://localhost:8000/api/v1/health

# 2. Check server logs
docker-compose logs server

# 3. Restart the server
docker-compose restart server

# 4. Check firewall settings
sudo ufw status
sudo ufw allow 8000/tcp
```

### 💾 Database Issues

**Problem:** "Database connection failed" errors

**Solutions:**

```bash
# 1. Check if database is running
docker-compose ps postgres

# 2. Check database logs
docker-compose logs postgres

# 3. Reset the database (WARNING: This deletes all data!)
docker-compose down
docker volume rm monitoring_postgres_data
docker-compose up -d

# 4. Check disk space
df -h
```

### 🤖 Agent Won't Connect

**Problem:** Server shows as "Offline" in dashboard

**Solutions:**

```bash
# On the server with the agent:

# 1. Check agent status
sudo systemctl status monitoring-agent

# 2. Check agent logs
sudo journalctl -u monitoring-agent -f

# 3. Test connection to monitoring server
curl http://your-monitoring-server:8000/api/v1/health

# 4. Check API key
sudo cat /etc/monitoring-agent/environment

# 5. Restart agent
sudo systemctl restart monitoring-agent
```

### 🔑 Login Problems

**Problem:** Can't login to dashboard

**Solutions:**

```bash
# 1. Reset admin password
docker-compose exec server python -c "
from server.auth.manager import AuthManager
auth = AuthManager()
auth.create_user('admin', 'newpassword123', 'admin@example.com', is_admin=True)
print('Admin password reset to: newpassword123')
"

# 2. Check if user exists
docker-compose exec postgres psql -U monitoring_user -d monitoring -c "SELECT username FROM dashboard_users;"
```

### 📊 No Data Showing

**Problem:** Dashboard loads but no server data appears

**Solutions:**

```bash
# 1. Check if agents are sending data
docker-compose logs server | grep "metrics received"

# 2. Check database for data
docker-compose exec postgres psql -U monitoring_user -d monitoring -c "SELECT COUNT(*) FROM metrics;"

# 3. Check agent configuration
sudo cat /etc/monitoring-agent/config.yaml

# 4. Manually test agent
sudo /opt/monitoring-agent/agent --test
```

### 🐌 Dashboard is Slow

**Problem:** Dashboard takes forever to load

**Solutions:**

```bash
# 1. Check system resources
docker stats

# 2. Clean up old data (keeps last 30 days)
docker-compose exec postgres psql -U monitoring_user -d monitoring -c "
DELETE FROM metrics WHERE timestamp < NOW() - INTERVAL '30 days';
DELETE FROM alerts WHERE triggered_at < NOW() - INTERVAL '30 days';
"

# 3. Increase refresh interval (in dashboard settings)
# Go to Settings > Display > Refresh Interval > 60 seconds

# 4. Add more memory to Docker
# Edit docker-compose.yml and add:
# mem_limit: 2g
```

### 🔥 Emergency Recovery

**Problem:** Everything is broken, need to start fresh

**Complete Reset (WARNING: Deletes all data!):**

```bash
# Stop everything
docker-compose down

# Remove all data
docker volume prune -f
docker system prune -f

# Start fresh
docker-compose up -d

# Wait 2 minutes, then check
docker-compose ps
curl http://localhost:8000/api/v1/health
```

### 📞 Getting Help

**Still stuck? Here's how to get help:**

1. **Check the logs first:**

   ```bash
   # Server logs
   docker-compose logs server

   # Agent logs (on monitored server)
   sudo journalctl -u monitoring-agent -n 50
   ```

2. **Gather system info:**

   ```bash
   # System resources
   free -h
   df -h
   docker --version
   docker-compose --version
   ```

3. **Create a GitHub issue** with:

   - What you were trying to do
   - What error message you got
   - Your system info (from step 2)
   - Relevant log entries (from step 1)

4. **Common solutions that fix 90% of problems:**
   - Restart everything: `docker-compose restart`
   - Check disk space: `df -h`
   - Check if ports are available: `netstat -tulpn | grep :3000`
   - Update to latest version: `git pull && docker-compose pull && docker-compose up -d`

**💡 Pro Tip:** Most problems are caused by:

- Running out of disk space
- Firewall blocking connections
- Wrong API keys or URLs
- Services not starting properly

Check these first before diving deeper!

## 🎉 You're Done! What's Next?

**Congratulations!** You now have a complete server monitoring system running. Here's what to do next:

### ✅ Immediate Next Steps (First 10 Minutes)

1. **🔒 Secure Your Installation**

   ```bash
   # Change default admin password
   # Go to dashboard > Click your name > Settings > Change Password
   ```

2. **📧 Set Up Notifications**

   ```bash
   # In dashboard: Settings > Notifications
   # Add your Slack webhook or email for alerts
   ```

3. **⚙️ Adjust Alert Thresholds**

   ```bash
   # In dashboard: Settings > Alert Thresholds
   # Set CPU: 80%, Memory: 85%, Disk: 90% (or whatever makes sense for you)
   ```

4. **📱 Bookmark the Dashboard**
   ```bash
   # Add http://your-server:3000 to your bookmarks
   # Consider adding to your phone's home screen
   ```

### 🚀 Next Week Goals

1. **📊 Monitor Trends**

   - Check the dashboard daily for the first week
   - Look for patterns in CPU/memory usage
   - Identify which servers are busiest

2. **🔧 Fine-tune Settings**

   - Adjust alert thresholds based on what you learn
   - Add more servers to monitoring
   - Set up additional notification channels

3. **📈 Plan Improvements**
   - Identify servers that might need more resources
   - Plan maintenance windows for high-usage periods
   - Consider adding more monitoring agents

### 💡 Pro Tips for Success

**🎯 Start Small:**

- Monitor your most critical servers first
- Add 2-3 servers initially, then expand
- Don't overwhelm yourself with too many alerts

**📊 Learn Your Baselines:**

- Every server is different
- Some servers naturally run at 60% CPU (that's normal for them)
- Watch for sudden changes, not just high numbers

**🚨 Alert Fatigue Prevention:**

- Start with higher thresholds (80-90%)
- Lower them gradually as you get comfortable
- Too many alerts = you'll start ignoring them

**📱 Mobile-Friendly:**

- The dashboard works great on phones
- Check it during your morning coffee
- Set up push notifications for critical alerts

### 🆘 When Things Go Wrong

**🔴 Red Server Alert:**

1. Don't panic!
2. Click on the server to see details
3. Check what metric is high (CPU, memory, disk)
4. SSH into the server to investigate
5. Common fixes: restart services, clear logs, add resources

**🟡 Yellow Warning:**

- Usually means "keep an eye on this"
- Not urgent, but worth investigating
- Often resolves itself

**💤 Gray Offline:**

- Server stopped reporting
- Could be network issue, server reboot, or agent problem
- Check if you can SSH to the server

### 🎓 Learning Resources

**📚 Understanding Server Metrics:**

- **CPU %**: How busy the processor is (0-100%)
- **Memory %**: How much RAM is being used
- **Disk %**: How full the storage is
- **Load Average**: How many tasks are waiting (lower is better)

**🔍 What's Normal:**

- **CPU**: 0-30% idle, 30-70% normal, 70%+ busy
- **Memory**: 50-80% is usually fine (Linux uses RAM efficiently)
- **Disk**: Under 80% is good, over 90% needs attention

**⚡ Quick Wins:**

- Clean up old log files: `sudo journalctl --vacuum-time=7d`
- Remove old packages: `sudo apt autoremove`
- Check what's using CPU: `top` or `htop`
- Check disk usage: `df -h` and `du -sh /*`

### 🤝 Community & Support

**💬 Join the Community:**

- Star the GitHub repository
- Join discussions for tips and tricks
- Share your setup and learn from others

**🐛 Found a Bug?**

- Check the GitHub issues first
- Create a detailed bug report
- Include logs and system information

**💡 Feature Ideas?**

- Suggest improvements on GitHub
- Vote on existing feature requests
- Consider contributing code if you're a developer

---

## 🎊 Welcome to Stress-Free Server Monitoring!

You now have:

- ✅ **24/7 monitoring** of all your servers
- ✅ **Instant alerts** when problems occur
- ✅ **Beautiful dashboard** to check anytime
- ✅ **Historical data** to spot trends
- ✅ **Mobile access** from anywhere

**Sleep better knowing your servers are watched!** 😴

---

_Need help? Check our [Troubleshooting Guide](#-troubleshooting-guide) above or create an issue on GitHub._
