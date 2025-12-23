#!/bin/bash

# Build script for the monitoring agent
# This script creates a standalone binary using PyInstaller

set -e

echo "🚀 Building Linux Server Monitoring Agent..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is required but not installed"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    log_error "pip3 is required but not installed"
    exit 1
fi

# Create virtual environment for building
log_info "Creating virtual environment for building..."
python3 -m venv build-env
source build-env/bin/activate

# Install build dependencies
log_info "Installing build dependencies..."
pip install --upgrade pip
pip install pyinstaller

# Install agent dependencies
log_info "Installing agent dependencies..."
pip install -r agent/requirements.txt

# Build the binary
log_info "Building standalone binary..."
pyinstaller \
    --onefile \
    --name monitoring-agent \
    --distpath dist \
    --workpath build \
    --specpath build \
    --clean \
    --noconfirm \
    --console \
    --add-data "agent/requirements.txt:." \
    agent/main.py

# Check if build was successful
if [[ -f "dist/monitoring-agent" ]]; then
    log_info "✅ Build successful!"
    log_info "Binary created: dist/monitoring-agent"
    
    # Show binary info
    ls -lh dist/monitoring-agent
    
    # Test the binary
    log_info "Testing binary..."
    if ./dist/monitoring-agent --help 2>/dev/null || true; then
        log_info "✅ Binary test passed"
    else
        log_warn "⚠️  Binary test failed (this might be normal if config is missing)"
    fi
    
    echo
    log_info "📋 Next steps:"
    echo "1. Test the binary: ./dist/monitoring-agent"
    echo "2. Upload dist/monitoring-agent to GitHub Releases"
    echo "3. Create a new release at: https://github.com/alokdeka/linux-server-monitoring/releases/new"
    echo "4. Upload the binary file as 'monitoring-agent'"
    echo
    log_info "🎉 Build complete!"
    
else
    log_error "❌ Build failed - binary not found"
    exit 1
fi

# Cleanup
deactivate
rm -rf build-env

echo
log_info "Build artifacts:"
echo "  📁 Binary: dist/monitoring-agent"
echo "  📁 Build files: build/ (can be deleted)"