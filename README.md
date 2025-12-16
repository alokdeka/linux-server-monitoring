# 🖥️ Linux Server Health Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)

**Monitor all your Linux servers from one beautiful dashboard!**

A complete, easy-to-use monitoring solution that watches your servers 24/7 and alerts you when something goes wrong. Perfect for beginners and professionals alike.

![Dashboard Preview](https://via.placeholder.com/800x400/1a202c/ffffff?text=Dashboard+Preview+Coming+Soon)

> 🚀 **Quick Start**: Get monitoring running in 5 minutes with Docker!

## 📋 Table of Contents

- [What Does This Do?](#-what-does-this-do)
- [Key Features](#-key-features)
- [Quick Start](#-quick-start-5-minutes-setup)
- [Local Development Setup](#-local-development-setup-without-docker)
- [How It Works](#-how-it-works-simple-explanation)
- [Screenshots](#-screenshots)
- [System Requirements](#-system-requirements)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Support](#-support)
- [Roadmap](#-roadmap)

## 🎯 What Does This Do?

Imagine you have multiple Linux servers (web servers, databases, etc.) and you want to:

- ✅ **See if they're running** - Know instantly if a server goes down
- ✅ **Monitor performance** - Track CPU, memory, and disk usage in real-time
- ✅ **Get alerts** - Receive notifications when something needs attention
- ✅ **View everything in one place** - Beautiful web dashboard accessible from anywhere

**This system does exactly that!** It's like having a personal assistant watching all your servers.

## ✨ Key Features

| Feature                     | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| 🔄 **Real-time Monitoring** | Live metrics updated every 30 seconds                  |
| 📊 **Beautiful Dashboard**  | Modern React-based web interface                       |
| 🚨 **Smart Alerts**         | Configurable thresholds with Slack/email notifications |
| 🐳 **Easy Deployment**      | One-command Docker setup                               |
| 🔒 **Secure**               | JWT authentication with role-based access              |
| 📱 **Mobile Friendly**      | Responsive design works on all devices                 |
| 🔧 **Lightweight Agents**   | Minimal resource usage (50MB RAM)                      |
| 📈 **Historical Data**      | Track trends and performance over time                 |

## Project Structure

```
├── agent/                  # Agent components (runs on monitored servers)
│   ├── metrics/           # System metrics collection
│   ├── config/            # Configuration management
│   └── transport/         # HTTP communication with server
├── server/                # Central server components
│   ├── api/              # FastAPI endpoints
│   ├── database/         # PostgreSQL operations
│   ├── auth/             # Authentication and security
│   └── alerts/           # Alerting engine
├── shared/               # Shared models and interfaces
│   ├── models.py         # Data models
│   └── interfaces.py     # Component interfaces
├── tests/                # Test suite
│   ├── test_agent/       # Agent component tests
│   ├── test_server/      # Server component tests
│   └── test_shared/      # Shared component tests
├── requirements.txt      # Python dependencies
├── pyproject.toml       # Modern Python packaging configuration
└── README.md            # This file
```

## 💻 Local Development Setup (Without Docker)

**For developers who want to run the system locally for development and testing.**

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm
- **PostgreSQL 12+** (local installation)
- **Git** for version control

### Step 1: Clone and Setup Repository

```bash
# Clone the repository
git clone git@github.com:alokdeka/linux-server-monitoring.git
cd linux-server-monitoring

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 2: Database Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE monitoring;
CREATE USER monitoring_user WITH PASSWORD 'monitoring_pass';
GRANT ALL PRIVILEGES ON DATABASE monitoring TO monitoring_user;
ALTER USER monitoring_user CREATEDB;
\q
EOF
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit local environment file
nano .env.local
```

**Configure `.env.local` for local development:**

```bash
# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://monitoring_user:monitoring_pass@localhost:5432/monitoring
POSTGRES_DB=monitoring
POSTGRES_USER=monitoring_user
POSTGRES_PASSWORD=monitoring_pass

# Server Configuration
SERVER_HOST=127.0.0.1
SERVER_PORT=8000
LOG_LEVEL=debug

# Alert Configuration
ALERT_CPU_THRESHOLD=90.0
ALERT_DISK_THRESHOLD=80.0
ALERT_OFFLINE_TIMEOUT=300

# Development Settings
TESTING=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=60
```

### Step 4: Database Migration

```bash
# Run database migrations
export $(cat .env.local | xargs)
alembic upgrade head

# Verify database setup
python -c "
from server.database.connection import get_db_session
from sqlalchemy import text
with get_db_session() as db:
    result = db.execute(text('SELECT 1'))
    print('Database connection successful!')
"
```

### Step 5: Start the Backend Server

```bash
# Activate virtual environment
source venv/bin/activate

# Set environment variables
export $(cat .env.local | xargs)

# Start the FastAPI server
python -m server.main

# Or with auto-reload for development
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

The server will be available at: `http://localhost:8000`

### Step 6: Setup and Start the Dashboard

```bash
# Navigate to dashboard directory
cd dashboard

# Install Node.js dependencies
npm install

# Create local environment file
cp .env.example .env.local

# Configure dashboard environment
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_TITLE=Server Monitoring Dashboard (Dev)
VITE_REFRESH_INTERVAL=30000
VITE_ENABLE_DEBUG=true
EOF

# Start development server
npm run dev
```

The dashboard will be available at: `http://localhost:3000`

### Step 7: Create Admin User

```bash
# In the main project directory
python server/cli/create_admin.py
```

### Step 8: Verify Local Setup

```bash
# Test API health
curl http://localhost:8000/api/v1/health

# Test dashboard
open http://localhost:3000  # macOS
# Or visit http://localhost:3000 in your browser
```

### Development Workflow

#### Backend Development

```bash
# Run with auto-reload
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000

# Run tests
pytest

# Run tests with coverage
pytest --cov=server --cov-report=html

# Format code
black server/ shared/
flake8 server/ shared/

# Type checking
mypy server/ shared/
```

#### Frontend Development

```bash
cd dashboard

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Lint and format
npm run lint
npm run format
```

#### Database Development

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Reset database (development only)
alembic downgrade base
alembic upgrade head
```

### Development Tools and Scripts

#### Useful Development Commands

```bash
# Start all services for development
./scripts/dev-start.sh  # If you create this script

# Reset development environment
./scripts/dev-reset.sh  # If you create this script

# Run full test suite
./scripts/test-all.sh   # If you create this script
```

#### Create Development Scripts

```bash
# Create scripts directory
mkdir -p scripts

# Development start script
cat > scripts/dev-start.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting development environment..."

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export $(cat .env.local | xargs)

# Start backend in background
echo "Starting backend server..."
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Start frontend in background
echo "Starting frontend server..."
cd dashboard
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait
EOF

chmod +x scripts/dev-start.sh
```

### Testing Framework

The project uses comprehensive testing:

- **pytest** for unit testing
- **Hypothesis** for property-based testing (minimum 100 iterations per test)
- **httpx** for API testing
- **Jest** for frontend testing

#### Running Tests

```bash
# Backend tests
pytest                              # All tests
pytest tests/test_server/          # Server tests only
pytest tests/test_agent/           # Agent tests only
pytest -v tests/ -k "property"     # Property-based tests
pytest --cov=server                # With coverage

# Frontend tests
cd dashboard
npm test                           # Interactive test runner
npm run test:ci                    # CI mode
npm run test:coverage              # With coverage
```

### Debugging

#### Backend Debugging

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with debugger
python -m pdb -m server.main

# Use VS Code debugger with launch.json:
{
  "name": "FastAPI Server",
  "type": "python",
  "request": "launch",
  "module": "server.main",
  "env": {
    "LOG_LEVEL": "debug"
  }
}
```

#### Frontend Debugging

```bash
# Enable debug mode
export VITE_ENABLE_DEBUG=true

# Use browser dev tools
# React DevTools extension recommended
```

### Common Development Issues

#### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Reset database connection
sudo systemctl restart postgresql

# Check database exists
sudo -u postgres psql -l | grep monitoring
```

#### Port Conflicts

```bash
# Check what's using ports
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :3000

# Kill processes using ports
sudo fuser -k 8000/tcp
sudo fuser -k 3000/tcp
```

#### Environment Issues

```bash
# Verify environment variables
env | grep -E "(DATABASE_URL|SERVER_PORT|LOG_LEVEL)"

# Reload environment
export $(cat .env.local | xargs)
```

### IDE Setup

#### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["dashboard"]
}
```

#### PyCharm Configuration

1. **Set Python interpreter** to `./venv/bin/python`
2. **Mark directories**:
   - `server` as Sources Root
   - `tests` as Test Sources Root
3. **Configure run configurations** for FastAPI server
4. **Enable pytest** as test runner

### Performance Optimization for Development

```bash
# Use faster database for development
# In .env.local, consider using SQLite for faster startup:
# DATABASE_URL=sqlite:///./monitoring_dev.db

# Reduce log verbosity in production testing
LOG_LEVEL=warning

# Use development-optimized settings
DASHBOARD_REFRESH_INTERVAL=60000  # Slower refresh for development
```

This comprehensive local development setup allows developers to:

- ✅ **Run the complete stack locally** without Docker
- ✅ **Develop with hot reload** for both backend and frontend
- ✅ **Debug effectively** with proper tooling
- ✅ **Test thoroughly** with comprehensive test suites
- ✅ **Maintain code quality** with linting and formatting tools

## 📚 Documentation

### Core Documentation

- **[Complete Docker Deployment Guide](DOCKER_DEPLOYMENT.md)** - 🐳 **Comprehensive Docker setup and production guide**
- **[Dashboard User Guide](dashboard/USER_GUIDE.md)** - Complete user guide with feature explanations
- **[Dashboard API Documentation](DASHBOARD_API.md)** - Comprehensive API reference
- **[Deployment Guide](DEPLOYMENT.md)** - Manual installation and production deployment instructions

### Developer Documentation

- **[Dashboard README](dashboard/README.md)** - Dashboard development setup and overview
- **[Contributing Guide](dashboard/CONTRIBUTING.md)** - Development contribution guidelines
- **[API Integration Guide](dashboard/API_INTEGRATION_GUIDE.md)** - Complete API integration reference
- **[Deployment Configuration](dashboard/DEPLOYMENT_CONFIGURATION.md)** - Advanced deployment configurations

### Quick Links

- **[🐳 Docker Deployment Guide](DOCKER_DEPLOYMENT.md)** - Complete Docker setup and production guide
- **[Getting Started](dashboard/README.md#quick-start)** - Set up the dashboard in minutes
- **[API Endpoints](DASHBOARD_API.md#authentication)** - Available API endpoints
- **[Troubleshooting](dashboard/USER_GUIDE.md#troubleshooting)** - Common issues and solutions

## 🚀 Quick Start (5 Minutes Setup!)

### Option 1: Super Easy Docker Setup (Recommended for Beginners)

**Step 1: Get the code**

```bash
git clone git@github.com:alokdeka/linux-server-monitoring.git
cd linux-server-monitoring
```

**Step 2: Configure (just copy and edit one file)**

```bash
cp .env.example .env
# Edit .env with your preferred password (use any text editor)
nano .env
```

**Important**: Change the `POSTGRES_PASSWORD` to a secure password!

**Step 3: Start everything**

```bash
# Start all services (server, dashboard, database)
docker compose up -d

# Check if all services are running
docker compose ps
```

**Step 4: Create admin user**

```bash
# Create your admin user for the dashboard
docker compose exec server python server/cli/create_admin.py
```

Follow the prompts to set up your admin username, email, and password.

**Step 5: Verify everything is working**

```bash
# Test API health
curl http://localhost:8000/api/v1/health
# Should return: {"status":"healthy"}

# Check service status
docker compose ps
# All services should show "Up" and "healthy"
```

**Step 6: Open your dashboard**

- Go to: `http://localhost:3000` in your web browser
- Login with the credentials you just created

**Step 7: Add your first server**

- Click "Server Management" in the dashboard
- Click "Register New Server"
- Fill in server details and click "Generate API Key"
- Copy the installation command (it looks like this):
  ```bash
  curl -sSL http://your-server:8000/install-agent.sh | bash -s -- \
    --api-key="your-unique-api-key" \
    --server-url="http://localhost:8000"
  ```
- Run this command **on the server you want to monitor** (as root/sudo)
- The server will appear in your dashboard within 1-2 minutes!

**That's it! 🎉** Your monitoring system is running!

> 📖 **Need more details?** Check our [Complete Docker Deployment Guide](DOCKER_DEPLOYMENT.md) for advanced configuration, troubleshooting, and production setup.

### Option 2: Local Development Setup (For Developers)

**Want to develop or customize the system?** See our [Local Development Setup](#-local-development-setup-without-docker) section below for running everything locally without Docker.

### Option 3: Manual Production Setup

Follow our detailed [Installation Guide](DEPLOYMENT.md#manual-installation) for step-by-step manual production installation.

## 📸 Screenshots

<details>
<summary>Click to see dashboard screenshots</summary>

### Main Dashboard

![Main Dashboard](https://via.placeholder.com/800x500/1a202c/ffffff?text=Main+Dashboard+Screenshot)

### Server Details

![Server Details](https://via.placeholder.com/800x500/1a202c/ffffff?text=Server+Details+Screenshot)

### Alert Management

![Alert Management](https://via.placeholder.com/800x500/1a202c/ffffff?text=Alert+Management+Screenshot)

</details>

## 🤔 What Does That Installation Command Do?

The `curl` command does several things automatically:

1. **📥 Downloads** a smart installation script from your monitoring server
2. **🔐 Authenticates** using your unique API key
3. **⚙️ Installs** the monitoring agent on your server
4. **🚀 Starts** monitoring immediately

**It's completely safe** - the script:

- ✅ Creates a dedicated user (not root) to run the agent
- ✅ Sets up proper file permissions and security
- ✅ Configures automatic startup on server reboot
- ✅ Tests the connection before finishing

**Think of it like installing a security camera** - one command and your server is being watched!

## 🏗 How It Works (Simple Explanation)

Think of it like a security system for your servers:

### 1. 👀 **Monitoring Agents** (The Watchers)

- Small programs that run on each server you want to monitor
- They check CPU, memory, disk space every minute
- Send reports back to the central system
- **Like having a security guard on each server**

### 2. 🏢 **Central Server** (The Control Center)

- Receives all the reports from your servers
- Stores the data in a database
- Sends alerts when something is wrong
- **Like a security control room**

### 3. 📱 **Web Dashboard** (Your View)

- Beautiful website where you see everything
- Real-time charts and graphs
- Get notifications on your phone/email
- **Like the security monitors you can check from anywhere**

```
Your Servers → Agents → Central Server → Dashboard → You
    ↓           ↓          ↓            ↓         ↓
  Running    Watching   Collecting   Showing   Seeing
  Services   & Sending   & Storing   & Alerting Everything
```

## 🔧 System Requirements

### Server Requirements

- **OS**: Linux (Ubuntu 18.04+, CentOS 7+, or similar)
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 10GB minimum, 50GB recommended for historical data
- **Network**: HTTP/HTTPS access for API communication

### Agent Requirements

- **OS**: Linux with systemd support
- **Memory**: 50MB RAM
- **Storage**: 100MB disk space
- **Network**: Outbound HTTP/HTTPS access to server

### Dashboard Requirements

- **Browser**: Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Network**: Access to server API endpoints
- **JavaScript**: Enabled for full functionality

## 🔒 Security Features

- **JWT-based Authentication** with automatic token refresh
- **Role-based Access Control** for administrative functions
- **API Rate Limiting** to prevent abuse
- **HTTPS Enforcement** for secure communication
- **Input Validation** and sanitization
- **Security Headers** (CSP, HSTS, etc.)
- **Secure Token Storage** with automatic cleanup

## 📊 Monitoring Capabilities

### System Metrics

- **CPU Usage**: Real-time and historical CPU utilization
- **Memory Usage**: RAM and swap usage monitoring
- **Disk Usage**: Filesystem usage and I/O statistics
- **Load Average**: System load monitoring (1min, 5min, 15min)
- **Uptime**: Server uptime tracking
- **Network**: Network interface statistics

### Service Monitoring

- **Systemd Services**: Failed service detection and reporting
- **Process Monitoring**: Critical process health checks
- **Service Dependencies**: Service relationship tracking

### Alerting

- **Threshold-based Alerts**: CPU, memory, disk usage alerts
- **Service Failure Alerts**: Immediate notification of service failures
- **Server Offline Alerts**: Detection of unresponsive servers
- **Custom Webhooks**: Integration with Slack, email, and other systems

## 🚀 Getting Started

### Quick Deployment with Docker (Recommended)

1. **Clone the repository**:

   ```bash
   git clone git@github.com:alokdeka/linux-server-monitoring.git
   cd linux-server-monitoring
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your settings (especially POSTGRES_PASSWORD)
   nano .env
   ```

3. **Start all services**:

   ```bash
   docker compose up -d
   ```

4. **Create admin user**:

   ```bash
   docker compose exec server python server/cli/create_admin.py
   ```

5. **Access the dashboard**:

   - Open http://localhost:3000 in your browser
   - Login with the credentials you created

6. **Install agents on servers**:
   ```bash
   # Get installation command from dashboard "Server Management" page
   curl -sSL http://your-server:8000/install-agent.sh | bash -s -- \
     --api-key="your-api-key" --server-url="http://localhost:8000"
   ```

> 📖 **For detailed Docker setup, troubleshooting, and production configuration, see our [Complete Docker Deployment Guide](DOCKER_DEPLOYMENT.md)**

### Local Development Setup

For developers who want to run locally without Docker:

- **[Complete Local Development Guide](#-local-development-setup-without-docker)** - Full setup with PostgreSQL, Python, and Node.js
- **[Development Workflow](#development-workflow)** - Backend and frontend development processes
- **[Testing Framework](#testing-framework)** - Running tests and debugging

### Manual Installation

For detailed manual installation instructions, see:

- **[Server Setup](DEPLOYMENT.md#manual-installation)**
- **[Agent Installation](DEPLOYMENT.md#agent-deployment)**
- **[Dashboard Setup](dashboard/DEPLOYMENT.md)**

### Docker Deployment Features

Our Docker deployment includes:

- ✅ **Complete stack**: PostgreSQL database, FastAPI server, React dashboard
- ✅ **WebSocket support**: Real-time updates with proper WebSocket libraries
- ✅ **Optimized rate limiting**: 300 requests/minute for dashboard usage
- ✅ **Health checks**: Automatic service health monitoring
- ✅ **Data persistence**: PostgreSQL data stored in Docker volumes
- ✅ **Production ready**: Resource limits, logging, and security configurations

### Admin User Management

#### Creating the First Admin User

After setting up the server, you need to create an admin user to access the dashboard:

```bash
# Navigate to the project directory
cd linux-server-monitoring

# Run the admin creation script
python server/cli/create_admin.py
```

The script will prompt you for:

- **Username**: Your admin username
- **Email**: Your email address (optional)
- **Full Name**: Your full name (optional)
- **Password**: Secure password (minimum 8 characters)

**Example:**

```bash
$ python server/cli/create_admin.py
Creating admin user for the dashboard...
==================================================
Enter admin username: admin
Enter admin email (optional): admin@example.com
Enter full name (optional): System Administrator
Enter admin password: [hidden]
Confirm admin password: [hidden]

Admin user 'admin' created successfully!
User ID: 1
Email: admin@example.com
Full Name: System Administrator
```

#### Important Notes

- **First Time Setup**: You must create an admin user before you can access the dashboard
- **Secure Passwords**: Use a strong password with at least 8 characters
- **Multiple Admins**: You can create multiple admin users by running the script again
- **Password Requirements**: Passwords must be at least 8 characters long

## 🤝 Contributing

We welcome contributions! Please see our documentation:

- **[Contributing Guide](dashboard/CONTRIBUTING.md)** - Development workflow and standards
- **[API Integration Guide](dashboard/API_INTEGRATION_GUIDE.md)** - API development reference
- **[Architecture Guidelines](dashboard/CONTRIBUTING.md#architecture-guidelines)** - System design principles

### Development Workflow

1. **Fork the repository** and create a feature branch
2. **Follow coding standards** enforced by linting tools
3. **Write comprehensive tests** for new functionality
4. **Update documentation** for user-facing changes
5. **Submit a pull request** with clear description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📊 Live Demo

_Live demo coming soon! For now, follow the Quick Start guide to set up your own instance in 5 minutes._

## 🆘 Support

### Getting Help

- 📖 **Documentation** - Check the comprehensive guides in this repository
- � **Troubleoshooting** - See [User Guide](dashboard/USER_GUIDE.md#troubleshooting) for common solutions
- � **Contact** - Reach out to [@alokdeka](https://github.com/alokdeka) directly on GitHub
- � **Code Issoues** - Fork the repo and submit a pull request with fixes

> **📝 Note**: Issues and Discussions will be enabled soon for better community support!

### Community

- ⭐ **Star this repo** if you find it useful!
- 🍴 **Fork and contribute** - We welcome pull requests
- 📢 **Share your setup** - Show us how you're using it
- 💡 **Suggest features** - Contact the maintainer with ideas

### Quick Help

**Common Issues:**

- **Can't access dashboard?** → Check if Docker containers are running: `docker-compose ps`
- **No admin user exists?** → Run `python server/cli/create_admin.py` to create one
- **Forgot admin password?** → Create a new admin user with the same script
- **Agent won't connect?** → Verify API key and server URL in agent config
- **High resource usage?** → Check monitoring interval settings in configuration
- **Authentication issues?** → Ensure admin user exists and credentials are correct

**Need immediate help?** Contact [@alokdeka](https://github.com/alokdeka) on GitHub with:

- Your setup details (Docker/manual installation)
- Error messages or logs
- What you were trying to do when the issue occurred

## 🎯 Roadmap

### Current Features ✅

- Real-time server monitoring
- Web dashboard interface
- Alert management system
- Docker deployment support
- Comprehensive documentation

### Upcoming Features 🚧

- Mobile application
- Advanced analytics and reporting
- Multi-tenant support
- Enhanced security features
- Cloud provider integrations

### Future Enhancements 🔮

- Machine learning-based anomaly detection
- Automated remediation actions
- Advanced visualization options
- Third-party integrations
- Performance optimization tools

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=alokdeka/linux-server-monitoring&type=Date)](https://star-history.com/#alokdeka/linux-server-monitoring&Date)

## 🙏 Acknowledgments

- Built with ❤️ using [FastAPI](https://fastapi.tiangolo.com/), [React](https://reactjs.org/), and [PostgreSQL](https://www.postgresql.org/)
- Inspired by modern monitoring solutions like Grafana and Prometheus
- Thanks to all contributors and the open-source community

---

<div align="center">

**Ready to get started?**

[![Get Started](https://img.shields.io/badge/Get%20Started-blue?style=for-the-badge&logo=rocket)](DEPLOYMENT.md) [![View Docs](https://img.shields.io/badge/View%20Docs-green?style=for-the-badge&logo=book)](dashboard/README.md)

**Made with ❤️ by [Alok Deka](https://github.com/alokdeka)**

</div>
