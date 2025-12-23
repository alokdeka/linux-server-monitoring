#!/bin/bash
# Helper script to safely load environment variables from .env.local

if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
    echo "Environment variables loaded from .env.local"
else
    echo "Warning: .env.local file not found"
fi