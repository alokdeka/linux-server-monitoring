#!/bin/bash

# Test script to verify environment variable injection works correctly

echo "Testing environment variable injection..."

# Set test environment variables
export VITE_API_BASE_URL="https://api.example.com"
export VITE_WS_BASE_URL="wss://api.example.com"
export VITE_APP_TITLE="Test Dashboard"
export VITE_REFRESH_INTERVAL="15000"
export VITE_ENABLE_DEBUG="true"

# Run the environment script
./env.sh

echo ""
echo "Generated env-config.js:"
cat /tmp/env-config.js 2>/dev/null || echo "File not found (expected in Docker container)"

echo ""
echo "Environment variables set:"
echo "VITE_API_BASE_URL: $VITE_API_BASE_URL"
echo "VITE_WS_BASE_URL: $VITE_WS_BASE_URL"
echo "VITE_APP_TITLE: $VITE_APP_TITLE"
echo "VITE_REFRESH_INTERVAL: $VITE_REFRESH_INTERVAL"
echo "VITE_ENABLE_DEBUG: $VITE_ENABLE_DEBUG"