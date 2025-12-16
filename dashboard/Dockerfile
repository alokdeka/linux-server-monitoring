# Simple Dockerfile for dashboard (development mode)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment variables for Docker
ENV VITE_API_BASE_URL=http://localhost:8000
ENV VITE_WS_BASE_URL=ws://localhost:8000
ENV VITE_APP_TITLE="Server Monitoring Dashboard"
ENV VITE_REFRESH_INTERVAL=30000
ENV VITE_ENABLE_DEBUG=false

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]