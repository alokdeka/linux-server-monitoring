#!/bin/bash
set -e

echo "🛑 Stopping development environment..."

# Stop PostgreSQL container
echo "Stopping PostgreSQL container..."
docker compose -f docker-compose.dev.yml stop

# Kill any running backend/frontend processes
pkill -f "uvicorn server.main:app" || true
pkill -f "npm run dev" || true

echo "✅ Development environment stopped!"