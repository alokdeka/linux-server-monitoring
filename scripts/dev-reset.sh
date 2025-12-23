#!/bin/bash
set -e

echo "🔄 Resetting development environment..."

# Activate virtual environment
source venv/bin/activate

# Set environment variables (filter out comments and empty lines)
set -a
source .env.local
set +a

# Reset database
echo "Resetting database..."
alembic downgrade base
alembic upgrade head

# Restart PostgreSQL container to ensure clean state
echo "Restarting PostgreSQL container..."
docker compose -f docker-compose.dev.yml restart postgres
sleep 5

echo "✅ Development environment reset complete!"