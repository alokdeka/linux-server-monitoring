# Linux Server Health Monitoring System

A lightweight, secure Linux server health monitoring system with an agent-based architecture.

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

## Development Setup

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Run tests:

   ```bash
   pytest
   ```

3. Run property-based tests:
   ```bash
   pytest -v tests/ -k "property"
   ```

## Testing Framework

The project uses:

- **pytest** for unit testing
- **Hypothesis** for property-based testing (minimum 100 iterations per test)
- **httpx** for API testing

Property-based tests are tagged with comments referencing specific correctness properties from the design document.

## 📚 Documentation

### Core Documentation

- **[Dashboard User Guide](dashboard/USER_GUIDE.md)** - Complete user guide with feature explanations
- **[Dashboard API Documentation](DASHBOARD_API.md)** - Comprehensive API reference
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions

### Developer Documentation

- **[Dashboard README](dashboard/README.md)** - Dashboard development setup and overview
- **[Contributing Guide](dashboard/CONTRIBUTING.md)** - Development contribution guidelines
- **[API Integration Guide](dashboard/API_INTEGRATION_GUIDE.md)** - Complete API integration reference
- **[Deployment Configuration](dashboard/DEPLOYMENT_CONFIGURATION.md)** - Advanced deployment configurations

### Quick Links

- **[Getting Started](dashboard/README.md#quick-start)** - Set up the dashboard in minutes
- **[API Endpoints](DASHBOARD_API.md#authentication)** - Available API endpoints
- **[Docker Deployment](dashboard/DEPLOYMENT.md#docker-deployment)** - Container deployment guide
- **[Troubleshooting](dashboard/USER_GUIDE.md#troubleshooting)** - Common issues and solutions

## 🚀 Quick Start

### For Users

1. **Access the Dashboard**: Navigate to your dashboard URL
2. **Login**: Use your credentials to access the monitoring interface
3. **Monitor Servers**: View real-time server metrics and alerts
4. **Manage Settings**: Customize thresholds and notification preferences

### For Developers

1. **Setup Development Environment**: Follow the [Dashboard README](dashboard/README.md)
2. **API Integration**: Use the [API Integration Guide](dashboard/API_INTEGRATION_GUIDE.md)
3. **Deployment**: Follow the [Deployment Configuration Guide](dashboard/DEPLOYMENT_CONFIGURATION.md)
4. **Contributing**: Read the [Contributing Guide](dashboard/CONTRIBUTING.md)

## 🏗 Architecture Overview

The system consists of three main components:

### 1. **Monitoring Agents** (Python)

- Collect system metrics from Linux servers
- Send data to central server via HTTP API
- Lightweight and secure with minimal dependencies

### 2. **Central Server** (FastAPI + PostgreSQL)

- Receives and stores metrics from agents
- Provides REST API for dashboard
- Handles authentication and user management
- Manages alerts and notifications

### 3. **Web Dashboard** (React + TypeScript)

- Modern responsive web interface
- Real-time metrics visualization
- Alert management and notifications
- User authentication and settings

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

### Quick Deployment with Docker

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd linux-server-monitoring
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start all services**:

   ```bash
   docker-compose up -d
   ```

4. **Access the dashboard**:

   - Open http://localhost:3000 in your browser
   - Login with default credentials (see setup documentation)

5. **Install agents on servers**:
   ```bash
   # On each server to monitor
   curl -sSL https://your-server/install-agent.sh | bash
   ```

### Manual Installation

For detailed manual installation instructions, see:

- **[Server Setup](DEPLOYMENT.md#manual-installation)**
- **[Agent Installation](DEPLOYMENT.md#agent-deployment)**
- **[Dashboard Setup](dashboard/DEPLOYMENT.md)**

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

## 🆘 Support

### Getting Help

- **Documentation**: Check the comprehensive guides in the `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues) for bug reports
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions) for questions
- **Community**: Join our community for tips and best practices

### Professional Support

For enterprise deployments and professional support:

- **Email**: support@yourproject.com
- **Documentation**: Enterprise deployment guides available
- **Training**: Custom training and onboarding available

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

---

**Ready to get started?** Check out our [Quick Start Guide](dashboard/README.md#quick-start) or dive into the [User Guide](dashboard/USER_GUIDE.md) for detailed instructions.
