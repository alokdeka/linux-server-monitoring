#!/bin/bash

# Linux Server Health Monitoring Agent Installation Script
# Usage: curl -sSL https://your-server/install-agent.sh | bash -s -- --api-key="your-key" --server-url="http://your-server:8000"

set -e

# Default configuration
AGENT_USER="monitoring"
AGENT_GROUP="monitoring"
INSTALL_DIR="/opt/monitoring-agent"
CONFIG_DIR="/etc/monitoring-agent"
LOG_DIR="/var/log/monitoring-agent"
DATA_DIR="/var/lib/monitoring-agent"
SERVICE_FILE="monitoring-agent.service"

# Installation parameters (will be set by command line arguments)
API_KEY=""
SERVER_URL=""
AGENT_DOWNLOAD_URL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
parse_arguments() {
    echo "DEBUG: Received $# arguments: $@" >&2
    while [[ $# -gt 0 ]]; do
        echo "DEBUG: Processing argument: '$1'" >&2
        case $1 in
            --api-key=*)
                API_KEY="${1#*=}"
                echo "DEBUG: Set API_KEY to: '$API_KEY'" >&2
                shift
                ;;
            --api-key)
                API_KEY="$2"
                echo "DEBUG: Set API_KEY to: '$API_KEY'" >&2
                shift 2
                ;;
            --server-url=*)
                SERVER_URL="${1#*=}"
                echo "DEBUG: Set SERVER_URL to: '$SERVER_URL'" >&2
                shift
                ;;
            --server-url)
                SERVER_URL="$2"
                echo "DEBUG: Set SERVER_URL to: '$SERVER_URL'" >&2
                shift 2
                ;;
            --agent-url=*)
                AGENT_DOWNLOAD_URL="${1#*=}"
                shift
                ;;
            --agent-url)
                AGENT_DOWNLOAD_URL="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Validate required parameters
    if [[ -z "$API_KEY" ]]; then
        log_error "API key is required. Use --api-key parameter."
        exit 1
    fi
    
    if [[ -z "$SERVER_URL" ]]; then
        log_error "Server URL is required. Use --server-url parameter."
        exit 1
    fi
    
    # Set default agent download URL if not provided
    if [[ -z "$AGENT_DOWNLOAD_URL" ]]; then
        # Try multiple sources for the agent binary
        GITHUB_RELEASE_URL="https://github.com/alokdeka/linux-server-monitoring/releases/latest/download/monitoring-agent"
        AGENT_DOWNLOAD_URL="$GITHUB_RELEASE_URL"
        
        # Alternative: Use server's static endpoint as fallback
        # AGENT_DOWNLOAD_URL="${SERVER_URL}/static/monitoring-agent"
    fi
}

# Show help message
show_help() {
    cat << EOF
Linux Server Health Monitoring Agent Installation Script

Usage: $0 --api-key=KEY --server-url=URL [OPTIONS]

Required Parameters:
  --api-key KEY        API key for authentication with the monitoring server
  --server-url URL     URL of the monitoring server (e.g., http://localhost:8000)

Optional Parameters:
  --agent-url URL      Custom URL to download the agent binary
  -h, --help          Show this help message

Examples:
  # Install with API key and server URL
  $0 --api-key="your-api-key-here" --server-url="http://localhost:8000"
  
  # Install via curl (recommended)
  curl -sSL https://your-server/install-agent.sh | bash -s -- --api-key="your-key" --server-url="http://your-server:8000"
  
  # With custom agent binary URL
  curl -sSL https://your-server/install-agent.sh | bash -s -- --api-key="your-key" --server-url="http://your-server:8000" --agent-url="https://github.com/user/repo/releases/latest/download/monitoring-agent"

EOF
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        log_info "Please run with sudo: sudo $0 $*"
        exit 1
    fi
}

# Create monitoring user and group
create_user() {
    log_info "Creating monitoring user and group..."
    
    if ! getent group "$AGENT_GROUP" > /dev/null 2>&1; then
        groupadd --system "$AGENT_GROUP"
        log_info "Created group: $AGENT_GROUP"
    else
        log_info "Group $AGENT_GROUP already exists"
    fi
    
    if ! getent passwd "$AGENT_USER" > /dev/null 2>&1; then
        useradd --system --gid "$AGENT_GROUP" --home-dir "$INSTALL_DIR" \
                --shell /bin/false --comment "Monitoring Agent" "$AGENT_USER"
        log_info "Created user: $AGENT_USER"
    else
        log_info "User $AGENT_USER already exists"
    fi
}

# Create directories
create_directories() {
    log_info "Creating directories..."
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    
    # Set ownership and permissions
    chown -R "$AGENT_USER:$AGENT_GROUP" "$INSTALL_DIR"
    chown -R "$AGENT_USER:$AGENT_GROUP" "$LOG_DIR"
    chown -R "$AGENT_USER:$AGENT_GROUP" "$DATA_DIR"
    chown -R root:root "$CONFIG_DIR"
    
    chmod 755 "$INSTALL_DIR"
    chmod 755 "$CONFIG_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "$DATA_DIR"
    chmod 644 "$CONFIG_DIR"/*
}

# Download and install agent binary
install_binary() {
    log_info "Downloading and installing agent binary..."
    
    # Try to download the agent binary from multiple sources
    DOWNLOAD_SUCCESS=false
    
    if command -v curl >/dev/null 2>&1; then
        # Try GitHub releases first
        log_info "Trying to download from GitHub releases..."
        if curl -sSL -f "$AGENT_DOWNLOAD_URL" -o "$INSTALL_DIR/monitoring-agent" 2>/dev/null; then
            log_info "✅ Agent binary downloaded from GitHub releases"
            DOWNLOAD_SUCCESS=true
        else
            log_warn "❌ Failed to download from GitHub releases"
            
            # Try server endpoint as fallback
            SERVER_AGENT_URL="${SERVER_URL}/static/monitoring-agent"
            log_info "Trying to download from server: $SERVER_AGENT_URL"
            if curl -sSL -f "$SERVER_AGENT_URL" -o "$INSTALL_DIR/monitoring-agent" 2>/dev/null; then
                log_info "✅ Agent binary downloaded from server"
                DOWNLOAD_SUCCESS=true
            else
                log_warn "❌ Failed to download from server"
            fi
        fi
    fi
    
    # If download failed, check for local file
    if [[ "$DOWNLOAD_SUCCESS" = false ]]; then
        if [[ -f "monitoring-agent" ]]; then
            log_info "📁 Using local agent binary"
            cp monitoring-agent "$INSTALL_DIR/"
            DOWNLOAD_SUCCESS=true
        elif [[ -f "agent" ]]; then
            log_info "📁 Using local agent binary (legacy name)"
            cp agent "$INSTALL_DIR/monitoring-agent"
            DOWNLOAD_SUCCESS=true
        else
            log_error "❌ No agent binary available"
            log_error "   Please ensure one of the following:"
            log_error "   1. Upload agent binary to GitHub releases"
            log_error "   2. Host agent binary on your server at /static/monitoring-agent"
            log_error "   3. Place agent binary file in current directory"
            log_error "   4. Specify custom URL with --agent-url parameter"
            exit 1
        fi
    fi
    
    # Set permissions
    chown "$AGENT_USER:$AGENT_GROUP" "$INSTALL_DIR/monitoring-agent"
    chmod 755 "$INSTALL_DIR/monitoring-agent"
    
    log_info "✅ Agent binary installed to $INSTALL_DIR/monitoring-agent"
}

# Install configuration
install_config() {
    log_info "Installing configuration..."
    
    # Create configuration file with provided parameters
    cat > "$CONFIG_DIR/config.yaml" << EOF
# Monitoring Agent Configuration
# Generated automatically by installation script

# Server connection settings
server:
  url: "$SERVER_URL"
  api_key: "$API_KEY"
  timeout: 30
  retry_attempts: 3
  retry_delay: 5

# Metrics collection settings
metrics:
  collection_interval: 60  # seconds
  batch_size: 10
  
  # System metrics to collect
  system:
    cpu: true
    memory: true
    disk: true
    load: true
    uptime: true
    network: true
  
  # Service monitoring
  services:
    enabled: true
    check_failed: true

# Logging settings
logging:
  level: INFO
  file: "$LOG_DIR/agent.log"
  max_size: 10MB
  max_files: 5

# Agent identification
agent:
  hostname: "$(hostname)"
  tags: []
EOF
    
    chown root:root "$CONFIG_DIR/config.yaml"
    chmod 644 "$CONFIG_DIR/config.yaml"
    log_info "Configuration installed to $CONFIG_DIR/config.yaml"
    
    # Create environment file with API key
    cat > "$CONFIG_DIR/environment" << EOF
# Environment variables for monitoring agent
MONITORING_API_KEY="$API_KEY"
MONITORING_CONFIG_FILE="$CONFIG_DIR/config.yaml"
MONITORING_LOG_LEVEL=INFO
MONITORING_SERVER_URL="$SERVER_URL"
EOF
    
    chown root:root "$CONFIG_DIR/environment"
    chmod 600 "$CONFIG_DIR/environment"  # Restrict access due to API key
    log_info "Environment file created at $CONFIG_DIR/environment"
}

# Install systemd service
install_service() {
    log_info "Installing systemd service..."
    
    if [[ ! -f "$SERVICE_FILE" ]]; then
        log_error "Service file $SERVICE_FILE not found."
        exit 1
    fi
    
    cp "$SERVICE_FILE" "/etc/systemd/system/"
    systemctl daemon-reload
    
    log_info "Systemd service installed"
}

# Test connection to server
test_connection() {
    log_info "Testing connection to monitoring server..."
    
    if command -v curl >/dev/null 2>&1; then
        if curl -sSL -f --connect-timeout 10 "$SERVER_URL/health" >/dev/null 2>&1; then
            log_info "✅ Successfully connected to monitoring server"
        else
            log_warn "⚠️  Could not connect to monitoring server at $SERVER_URL"
            log_warn "   The agent will retry connections automatically when started"
        fi
    else
        log_info "Skipping connection test (curl not available)"
    fi
}

# Start and enable the service
start_service() {
    log_info "Starting monitoring agent service..."
    
    # Enable the service to start on boot
    systemctl enable monitoring-agent
    log_info "Service enabled for automatic startup"
    
    # Start the service
    if systemctl start monitoring-agent; then
        log_info "✅ Monitoring agent service started successfully"
        
        # Wait a moment and check status
        sleep 2
        if systemctl is-active --quiet monitoring-agent; then
            log_info "✅ Service is running properly"
        else
            log_warn "⚠️  Service may have issues. Check logs with: journalctl -u monitoring-agent"
        fi
    else
        log_error "❌ Failed to start monitoring agent service"
        log_info "Check logs with: journalctl -u monitoring-agent"
        exit 1
    fi
}

# Main installation function
main() {
    log_info "🚀 Starting Linux Server Health Monitoring Agent installation..."
    echo
    
    # Parse command line arguments first
    parse_arguments "$@"
    
    log_info "Configuration:"
    log_info "  Server URL: $SERVER_URL"
    log_info "  API Key: ${API_KEY:0:8}..." # Show only first 8 characters
    echo
    
    check_root
    test_connection
    create_user
    create_directories
    install_binary
    install_config
    install_service
    start_service
    
    echo
    log_info "🎉 Installation completed successfully!"
    echo
    log_info "📋 Service Management Commands:"
    echo "  • Check status:    systemctl status monitoring-agent"
    echo "  • View logs:       journalctl -u monitoring-agent -f"
    echo "  • Stop service:    systemctl stop monitoring-agent"
    echo "  • Start service:   systemctl start monitoring-agent"
    echo "  • Restart service: systemctl restart monitoring-agent"
    echo
    log_info "📁 Important Files:"
    echo "  • Configuration:   $CONFIG_DIR/config.yaml"
    echo "  • Environment:     $CONFIG_DIR/environment"
    echo "  • Logs:           $LOG_DIR/agent.log"
    echo "  • Binary:         $INSTALL_DIR/agent"
    echo
    log_info "✅ Your server is now being monitored!"
    log_info "   Check your dashboard at: $SERVER_URL"
}

# Run main function with all arguments
main "$@"