# Monitoring Agent Build Guide

This guide will help you build and deploy the monitoring agent to GitHub Releases.

## Quick Start

### Option 1: Automatic Build with GitHub Actions (Recommended)

1. **Push your code to GitHub**:

   ```bash
   git add .
   git commit -m "Add monitoring agent"
   git push origin main
   ```

2. **Create a release tag**:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **GitHub Actions will automatically**:
   - Build the agent binary
   - Create a GitHub release
   - Upload the binary as `monitoring-agent`

### Option 2: Manual Build

1. **Build the agent locally**:

   ```bash
   ./build-agent.sh
   ```

2. **Upload to GitHub Releases**:
   - Go to: https://github.com/alokdeka/linux-server-monitoring/releases
   - Click "Create a new release"
   - Tag version: `v1.0.0`
   - Upload `dist/monitoring-agent` file
   - Publish release

## What the Agent Does

The monitoring agent:

- ✅ Collects CPU, memory, disk usage
- ✅ Monitors system load and uptime
- ✅ Tracks failed systemd services
- ✅ Sends data to your monitoring server
- ✅ Runs as a systemd service
- ✅ Auto-registers with the server

## Installation Command

Once uploaded to GitHub Releases, users can install with:

```bash
curl -sSL http://localhost:8000/install-agent.sh | bash -s -- \
  --api-key="YOUR_API_KEY_FROM_DASHBOARD" \
  --server-url="http://localhost:8000"
```

## Testing the Build

After building, test locally:

```bash
# Create a test config
sudo mkdir -p /etc/monitoring-agent
sudo tee /etc/monitoring-agent/config.yaml << EOF
server:
  url: "http://localhost:8000"
  api_key: "test-key"
  timeout: 30

metrics:
  collection_interval: 60
  services:
    enabled: true

logging:
  level: INFO
  file: "/tmp/agent.log"

agent:
  hostname: "test-server"
EOF

# Test the agent
./dist/monitoring-agent
```

## File Structure

```
agent/
├── main.py              # Main agent code
├── requirements.txt     # Python dependencies
build-agent.sh           # Build script
.github/workflows/
└── build-agent.yml      # GitHub Actions workflow
```

## Dependencies

The agent requires:

- Python 3.7+
- requests (HTTP client)
- psutil (system metrics)
- PyYAML (configuration)

## Build Requirements

For building:

- Python 3.7+
- pip
- PyInstaller (installed automatically)

## Troubleshooting

### Build Issues

1. **Python not found**: Install Python 3.7+
2. **Permission denied**: Run `chmod +x build-agent.sh`
3. **Missing dependencies**: Run `pip install -r agent/requirements.txt`

### Runtime Issues

1. **Config not found**: Ensure `/etc/monitoring-agent/config.yaml` exists
2. **Permission denied**: Run agent as root or monitoring user
3. **Connection refused**: Check server URL and API key

## Next Steps

1. **Build the agent** using one of the methods above
2. **Test the installation** on a test server
3. **Deploy to production** servers using the install command
4. **Monitor the dashboard** to see incoming metrics

The install script will automatically download from:

```
https://github.com/alokdeka/linux-server-monitoring/releases/latest/download/monitoring-agent
```
