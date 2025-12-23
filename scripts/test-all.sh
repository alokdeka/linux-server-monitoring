#!/bin/bash
set -e

echo "🧪 Running all tests..."

# Activate virtual environment
source venv/bin/activate

# Set test environment (filter out comments and empty lines)
set -a
source .env.local
set +a
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