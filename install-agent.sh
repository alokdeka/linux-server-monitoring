#!/bin/bash

# Linux Server Health Monitoring Agent Installation Script

set -e

# Configuration
AGENT_USER="monitoring"
AGENT_GROUP="monitoring"
INSTALL_DIR="/opt/monitoring-agent"
CONFIG_DIR="/etc/monitoring-agent"
LOG_DIR="/var/log/monitoring-agent"
DATA_DIR="/var/lib/monitoring-agent"
SERVICE_FILE="monitoring-agent.service"

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
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

# Install agent binary
install_binary() {
    log_info "Installing agent binary..."
    
    if [[ ! -f "agent" ]]; then
        log_error "Agent binary not found. Please ensure 'agent' file is in the current directory."
        exit 1
    fi
    
    cp agent "$INSTALL_DIR/"
    chown "$AGENT_USER:$AGENT_GROUP" "$INSTALL_DIR/agent"
    chmod 755 "$INSTALL_DIR/agent"
    
    log_info "Agent binary installed to $INSTALL_DIR/agent"
}

# Install configuration
install_config() {
    log_info "Installing configuration..."
    
    if [[ -f "agent_config.yaml" ]]; then
        cp agent_config.yaml "$CONFIG_DIR/config.yaml"
        chown root:root "$CONFIG_DIR/config.yaml"
        chmod 644 "$CONFIG_DIR/config.yaml"
        log_info "Configuration installed to $CONFIG_DIR/config.yaml"
    else
        log_warn "No configuration file found. Please create $CONFIG_DIR/config.yaml manually."
    fi
    
    # Create environment file template
    cat > "$CONFIG_DIR/environment" << EOF
# Environment variables for monitoring agent
# Uncomment and set values as needed

# MONITORING_API_KEY=your_api_key_here
# MONITORING_CONFIG_FILE=/etc/monitoring-agent/config.yaml
# MONITORING_LOG_LEVEL=INFO
EOF
    
    chown root:root "$CONFIG_DIR/environment"
    chmod 644 "$CONFIG_DIR/environment"
    log_info "Environment template created at $CONFIG_DIR/environment"
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

# Main installation function
main() {
    log_info "Starting Linux Server Health Monitoring Agent installation..."
    
    check_root
    create_user
    create_directories
    install_binary
    install_config
    install_service
    
    log_info "Installation completed successfully!"
    echo
    log_info "Next steps:"
    echo "1. Edit configuration: $CONFIG_DIR/config.yaml"
    echo "2. Set API key in: $CONFIG_DIR/environment"
    echo "3. Enable service: systemctl enable monitoring-agent"
    echo "4. Start service: systemctl start monitoring-agent"
    echo "5. Check status: systemctl status monitoring-agent"
    echo "6. View logs: journalctl -u monitoring-agent -f"
}

# Run main function
main "$@"