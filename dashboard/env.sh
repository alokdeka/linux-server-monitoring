#!/bin/sh

# Generate runtime environment configuration
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:8000}",
  VITE_WS_BASE_URL: "${VITE_WS_BASE_URL:-ws://localhost:8000}",
  VITE_APP_TITLE: "${VITE_APP_TITLE:-Server Monitoring Dashboard}",
  VITE_REFRESH_INTERVAL: "${VITE_REFRESH_INTERVAL:-30000}",
  VITE_ENABLE_DEBUG: "${VITE_ENABLE_DEBUG:-false}"
};
EOF

echo "Environment configuration generated:"
cat /usr/share/nginx/html/env-config.js