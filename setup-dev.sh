#!/bin/bash

# Linux Server Health Monitoring System - Development Setup Script
# This script sets up a local development environment without Docker

set -e

echo "🚀 Setting up Linux Server Health Monitoring System for local development..."
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on supported OS
check_os() {
    print_status "Checking operating system..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "macOS detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        print_error "This script supports Linux and macOS only"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_success "Python $PYTHON_VERSION found"
    else
        print_error "Python 3 is required but not installed"
        print_error "Please install Python 3.8+ and try again"
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION found"
    else
        print_error "Node.js is required but not installed"
        print_error "Please install Node.js 18+ and try again"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION found"
    else
        print_error "npm is required but not installed"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version | cut -d' ' -f3)
        print_success "PostgreSQL $PSQL_VERSION found"
    else
        print_warning "PostgreSQL not found"
        print_status "Installing PostgreSQL..."
        install_postgresql
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        print_success "Git found"
    else
        print_error "Git is required but not installed"
        exit 1
    fi
}

# Install PostgreSQL
install_postgresql() {
    if [[ "$OS" == "linux" ]]; then
        if command -v apt &> /dev/null; then
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
        elif command -v yum &> /dev/null; then
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
        else
            print_error "Unsupported package manager. Please install PostgreSQL manually."
            exit 1
        fi
        
        # Start PostgreSQL service
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install postgresql
            brew services start postgresql
        else
            print_error "Homebrew not found. Please install PostgreSQL manually."
            exit 1
        fi
    fi
    
    print_success "PostgreSQL installed and started"
}

# Setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python virtual environment..."
    
    # Create virtual environment
    python3 -m venv venv
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    print_success "Python environment setup complete"
}

# Setup database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE monitoring;
CREATE USER monitoring_user WITH PASSWORD 'monitoring_pass';
GRANT ALL PRIVILEGES ON DATABASE monitoring TO monitoring_user;
ALTER USER monitoring_user CREATEDB;
\q
EOF
    
    print_success "Database setup complete"
}

# Setup environment configuration
setup_environment() {
    print_status "Setting up environment configuration..."
    
    # Create local environment file
    cat > .env.local << EOF
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

# Webhook Configuration (optional)
WEBHOOK_URLS=
EOF
    
    print_success "Environment configuration created"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Activate virtual environment and set environment
    source venv/bin/activate
    export $(cat .env.local | xargs)
    
    # Run migrations
    alembic upgrade head
    
    print_success "Database migrations complete"
}

# Setup dashboard
setup_dashboard() {
    print_status "Setting up dashboard..."
    
    cd dashboard
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Create dashboard environment file
    cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_TITLE=Server Monitoring Dashboard (Dev)
VITE_REFRESH_INTERVAL=30000
VITE_ENABLE_DEBUG=true
EOF
    
    cd ..
    print_success "Dashboard setup complete"
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    mkdir -p scripts
    
    # Create start script
    cat > scripts/dev-start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting development environment..."

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "Starting PostgreSQL..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi
fi

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export $(cat .env.local | xargs)

# Start backend in background
echo "Starting backend server on http://localhost:8000..."
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Start frontend in background
echo "Starting frontend server on http://localhost:3000..."
cd dashboard
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development environment started!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API Server: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
EOF

    # Create test script
    cat > scripts/test-all.sh << 'EOF'
#!/bin/bash
set -e

echo "🧪 Running all tests..."

# Activate virtual environment
source venv/bin/activate

# Set test environment
export $(cat .env.local | xargs)
export TESTING=true

# Run backend tests
echo "Running backend tests..."
pytest --cov=server --cov-report=term-missing

# Run frontend tests
echo "Running frontend tests..."
cd dashboard
npm run test:ci
cd ..

echo "✅ All tests completed!"
EOF

    # Create reset script
    cat > scripts/dev-reset.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Resetting development environment..."

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export $(cat .env.local | xargs)

# Reset database
echo "Resetting database..."
alembic downgrade base
alembic upgrade head

echo "✅ Development environment reset complete!"
EOF

    # Make scripts executable
    chmod +x scripts/dev-start.sh
    chmod +x scripts/test-all.sh
    chmod +x scripts/dev-reset.sh
    
    print_success "Development scripts created"
}

# Create admin user
create_admin_user() {
    print_status "Creating admin user..."
    
    # Activate virtual environment and set environment
    source venv/bin/activate
    export $(cat .env.local | xargs)
    
    echo ""
    echo "Please create an admin user for the dashboard:"
    python server/cli/create_admin.py
    
    print_success "Admin user created"
}

# Verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Test database connection
    source venv/bin/activate
    export $(cat .env.local | xargs)
    
    python -c "
from server.database.connection import get_db_session
from sqlalchemy import text
try:
    with get_db_session() as db:
        result = db.execute(text('SELECT 1'))
        print('✅ Database connection successful!')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"
    
    print_success "Setup verification complete"
}

# Main setup function
main() {
    echo ""
    print_status "Starting development environment setup..."
    echo ""
    
    check_os
    check_prerequisites
    setup_python_env
    setup_database
    setup_environment
    run_migrations
    setup_dashboard
    create_dev_scripts
    create_admin_user
    verify_setup
    
    echo ""
    echo "🎉 Development environment setup complete!"
    echo "=================================================================="
    echo ""
    echo "📋 Next steps:"
    echo "1. Start the development environment:"
    echo "   ./scripts/dev-start.sh"
    echo ""
    echo "2. Open your browser and go to:"
    echo "   📊 Dashboard: http://localhost:3000"
    echo "   🔧 API Docs: http://localhost:8000/docs"
    echo ""
    echo "3. Useful commands:"
    echo "   ./scripts/test-all.sh     # Run all tests"
    echo "   ./scripts/dev-reset.sh    # Reset database"
    echo ""
    echo "📖 For more information, see the README.md file"
    echo ""
    print_success "Happy coding! 🚀"
}

# Run main function
main "$@"