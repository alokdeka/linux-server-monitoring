# 🐳 Docker Build and Deploy Commands

**Manual commands to build and deploy Docker images to a single Docker Hub repository**

## 📋 Prerequisites

- Docker installed and running
- Docker Hub account: `alokdekadev`
- Docker Hub repository: `linux-server-monitoring`
- Docker Hub access token

## 🔑 1. Login to Docker Hub

```bash
docker login
# Enter username: alokdekadev
# Enter password: [your Docker Hub access token]
```

## 🏗️ 2. Build Images (Single Repository with Tags)

### Build Server Image

```bash
docker build -t alokdekadev/linux-server-monitoring:server -f Dockerfile.server .
docker build -t alokdekadev/linux-server-monitoring:latest-server -f Dockerfile.server .
```

### Build Dashboard Image

```bash
docker build -t alokdekadev/linux-server-monitoring:dashboard -f dashboard/Dockerfile ./dashboard
docker build -t alokdekadev/linux-server-monitoring:latest-dashboard -f dashboard/Dockerfile ./dashboard
```

## 🧪 3. Test Images Locally (Optional)

### Test Server Image

```bash
# Start server container
docker run -d --rm -p 8001:8000 alokdekadev/linux-server-monitoring:server

# Test health endpoint
curl http://localhost:8001/api/v1/health

# Stop container
docker stop $(docker ps -q --filter ancestor=alokdekadev/linux-server-monitoring:server)
```

### Test Dashboard Image

```bash
# Start dashboard container
docker run -d --rm -p 8002:80 alokdekadev/linux-server-monitoring:dashboard

# Test dashboard
curl http://localhost:8002/

# Stop container
docker stop $(docker ps -q --filter ancestor=alokdekadev/linux-server-monitoring:dashboard)
```

## 📤 4. Push to Docker Hub

### Push Server Images

```bash
docker push alokdekadev/linux-server-monitoring:server
docker push alokdekadev/linux-server-monitoring:latest-server
```

### Push Dashboard Images

```bash
docker push alokdekadev/linux-server-monitoring:dashboard
docker push alokdekadev/linux-server-monitoring:latest-dashboard
```

## 🌐 5. Build Multi-Platform Images (Recommended)

### Setup Buildx

```bash
# Create buildx builder for multi-platform
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

### Build and Push Server (Multi-Platform)

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t alokdekadev/linux-server-monitoring:server \
  -t alokdekadev/linux-server-monitoring:latest-server \
  -f Dockerfile.server . --push
```

### Build and Push Dashboard (Multi-Platform)

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t alokdekadev/linux-server-monitoring:dashboard \
  -t alokdekadev/linux-server-monitoring:latest-dashboard \
  -f dashboard/Dockerfile ./dashboard --push
```

## 🏷️ 6. Version Tagging (Optional)

### Tag with Specific Version

```bash
# Tag server image
docker tag alokdekadev/linux-server-monitoring:server alokdekadev/linux-server-monitoring:v1.0.0-server

# Tag dashboard image
docker tag alokdekadev/linux-server-monitoring:dashboard alokdekadev/linux-server-monitoring:v1.0.0-dashboard
```

### Push Version Tags

```bash
# Push server version
docker push alokdekadev/linux-server-monitoring:v1.0.0-server

# Push dashboard version
docker push alokdekadev/linux-server-monitoring:v1.0.0-dashboard
```

## 🚀 Complete Build and Push Script

### All-in-One Commands

```bash
# Login
docker login

# Build both images
docker build -t alokdekadev/linux-server-monitoring:server -f Dockerfile.server .
docker build -t alokdekadev/linux-server-monitoring:dashboard -f dashboard/Dockerfile ./dashboard

# Push both images
docker push alokdekadev/linux-server-monitoring:server
docker push alokdekadev/linux-server-monitoring:dashboard

echo "✅ Images pushed to Docker Hub successfully!"
```

### Multi-Platform All-in-One

```bash
# Login and setup buildx
docker login
docker buildx create --name multiarch --use

# Build and push both images (multi-platform)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t alokdekadev/linux-server-monitoring:server \
  -t alokdekadev/linux-server-monitoring:latest-server \
  -f Dockerfile.server . --push

docker buildx build --platform linux/amd64,linux/arm64 \
  -t alokdekadev/linux-server-monitoring:dashboard \
  -t alokdekadev/linux-server-monitoring:latest-dashboard \
  -f dashboard/Dockerfile ./dashboard --push

echo "✅ Multi-platform images pushed to Docker Hub successfully!"
```

## 📊 7. Verify Deployment

### Check Images on Docker Hub

- **Repository**: https://hub.docker.com/r/alokdekadev/linux-server-monitoring
- **Server Tags**: `server`, `latest-server`, `v1.0.0-server`
- **Dashboard Tags**: `dashboard`, `latest-dashboard`, `v1.0.0-dashboard`

### Available Tags Structure

```
alokdekadev/linux-server-monitoring:
├── server              # Latest server image
├── latest-server       # Alias for server
├── dashboard           # Latest dashboard image
├── latest-dashboard    # Alias for dashboard
├── v1.0.0-server      # Version tagged server
├── v1.0.0-dashboard   # Version tagged dashboard
├── main-server        # Main branch server (via GitHub Actions)
└── main-dashboard     # Main branch dashboard (via GitHub Actions)
```

### Test Pull and Run

```bash
# Pull images
docker pull alokdekadev/linux-server-monitoring:server
docker pull alokdekadev/linux-server-monitoring:dashboard

# Test with docker-compose
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml
echo "POSTGRES_PASSWORD=test123" > .env
docker compose up -d
```

## 🔄 8. Automated GitHub Actions Setup

### GitHub Secrets Required

Add these secrets to your GitHub repository:

- **Name**: `DOCKER_USERNAME`
- **Value**: `alokdekadev`

- **Name**: `DOCKER_PASSWORD`
- **Value**: `[Your Docker Hub Access Token]`

### Trigger Automated Build

```bash
# Push to main branch (builds main-server and main-dashboard tags)
git add .
git commit -m "Update Docker images"
git push origin main

# Create version tag (builds v1.0.0-server and v1.0.0-dashboard tags)
git tag v1.0.0
git push origin v1.0.0
```

## 🚀 User Deployment Commands

Once images are published, users can deploy with:

### Quick Start

```bash
# Download compose file
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml

# Create environment
echo "POSTGRES_PASSWORD=secure_password_here" > .env

# Deploy
docker compose up -d

# Create admin user
docker compose exec server python server/cli/create_admin.py
```

### Access Points

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🛠️ Troubleshooting

### Build Issues

```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker build --no-cache -t alokdekadev/linux-server-monitoring:server -f Dockerfile.server .
```

### Push Issues

```bash
# Re-login to Docker Hub
docker logout
docker login

# Check image exists locally
docker images | grep alokdekadev
```

### Multi-Platform Issues

```bash
# Remove and recreate buildx builder
docker buildx rm multiarch
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

## 📈 Single Repository Benefits

✅ **Organized**: All components in one repository
✅ **Simplified**: Single repository to manage
✅ **Clear Tagging**: Component identification via tags
✅ **Version Control**: Easy version management
✅ **Cost Effective**: Single repository limits
✅ **Easy Discovery**: Users find everything in one place

## 📊 Image Information

### Expected Image Sizes

- **Server Image**: ~200-300MB
- **Dashboard Image**: ~50-100MB

### Supported Platforms

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple Silicon, Raspberry Pi 4+)

### Tag Naming Convention

- `server` - Latest server component
- `dashboard` - Latest dashboard component
- `v1.0.0-server` - Version tagged server
- `v1.0.0-dashboard` - Version tagged dashboard
- `latest-server` - Alias for server
- `latest-dashboard` - Alias for dashboard

---

**🎉 Your Docker images are now in a single repository with clear tagging!**

Repository: `alokdekadev/linux-server-monitoring`

Users can deploy with:

```bash
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml && docker compose up -d
```
