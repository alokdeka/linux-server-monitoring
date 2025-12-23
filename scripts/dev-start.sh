#!/bin/bash
set -e

echo "🚀 Starting development environment..."

# Start PostgreSQL container if not running
if ! docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "Starting PostgreSQL container..."
    docker compose -f docker-compose.dev.yml up -d
    sleep 5
fi

# Activate virtual environment
source venv/bin/activate

# Set environment variables (filter out comments and empty lines)
set -a
source .env.local
set +a

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
echo "🗄️ PostgreSQL: localhost:5432"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose -f docker-compose.dev.yml stop; exit 0" INT
wait