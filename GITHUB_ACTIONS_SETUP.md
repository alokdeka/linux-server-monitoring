# 🚀 GitHub Actions Docker Hub Publishing Setup

This guide will help you set up automated Docker image publishing to Docker Hub using GitHub Actions.

## 📋 Prerequisites

1. **Docker Hub Account**: You need a Docker Hub account (`alokdekadev`)
2. **GitHub Repository**: Your repository with the monitoring system code
3. **Docker Hub Access Token**: For secure authentication

## 🔑 Step 1: Create Docker Hub Access Token

1. **Login to Docker Hub**: Go to https://hub.docker.com/
2. **Go to Account Settings**: Click your username → Account Settings
3. **Security Tab**: Click on "Security" in the left sidebar
4. **New Access Token**: Click "New Access Token"
5. **Configure Token**:
   - **Description**: `GitHub Actions - linux-server-monitoring`
   - **Permissions**: `Read, Write, Delete`
6. **Generate Token**: Click "Generate" and **copy the token** (you won't see it again!)

## 🔧 Step 2: Add GitHub Secrets

1. **Go to your GitHub repository**
2. **Settings Tab**: Click "Settings" in the repository
3. **Secrets and Variables**: Click "Secrets and variables" → "Actions"
4. **Add Repository Secrets**: Click "New repository secret"

Add these two secrets:

### Secret 1: DOCKER_USERNAME

- **Name**: `DOCKER_USERNAME`
- **Value**: `alokdekadev`

### Secret 2: DOCKER_PASSWORD

- **Name**: `DOCKER_PASSWORD`
- **Value**: `[Your Docker Hub Access Token from Step 1]`

## 📁 Step 3: Verify GitHub Actions Workflow

The workflow file is already created at `.github/workflows/docker-publish.yml`. It will:

- ✅ **Trigger on**: Push to main/master branch, new tags, pull requests
- ✅ **Build**: Both server and dashboard images
- ✅ **Multi-platform**: AMD64 and ARM64 architectures
- ✅ **Security**: Vulnerability scanning with Trivy
- ✅ **Caching**: Docker layer caching for faster builds
- ✅ **Tagging**: Automatic version tagging

## 🚀 Step 4: Trigger First Build

### Option A: Push to Main Branch

```bash
# Make any change and push to main/master
git add .
git commit -m "Setup Docker Hub publishing"
git push origin main
```

### Option B: Create a Release Tag

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

## 📊 Step 5: Monitor the Build

1. **Go to Actions Tab**: In your GitHub repository
2. **View Workflow**: Click on "Build and Push Docker Images"
3. **Monitor Progress**: Watch the build logs in real-time

The workflow will:

1. **Build server image** → `alokdekadev/monitoring-server`
2. **Build dashboard image** → `alokdekadev/monitoring-dashboard`
3. **Run security scans** → Check for vulnerabilities
4. **Push to Docker Hub** → Available for public use

## 🐳 Step 6: Verify Docker Hub Images

After successful build, check Docker Hub:

1. **Server Image**: https://hub.docker.com/r/alokdekadev/monitoring-server
2. **Dashboard Image**: https://hub.docker.com/r/alokdekadev/monitoring-dashboard

You should see:

- ✅ **Latest tag** available
- ✅ **Version tags** (if you pushed tags)
- ✅ **Multi-architecture** support (AMD64, ARM64)
- ✅ **Build information** and timestamps

## 🔄 Automatic Publishing Workflow

Once set up, images will be automatically published when you:

### 1. Push to Main Branch

```bash
git push origin main
# → Builds and pushes images with 'latest' tag
```

### 2. Create Release Tags

```bash
git tag v1.1.0
git push origin v1.1.0
# → Builds and pushes images with 'v1.1.0' and 'latest' tags
```

### 3. Version Tagging Examples

```bash
# Semantic versioning
git tag v1.0.0    # → alokdekadev/monitoring-server:v1.0.0
git tag v1.1.0    # → alokdekadev/monitoring-server:v1.1.0
git tag v2.0.0    # → alokdekadev/monitoring-server:v2.0.0

# Always creates 'latest' tag for main branch
```

## 📋 Image Tags Created

The workflow automatically creates these tags:

| Trigger      | Server Image Tags         | Dashboard Image Tags      |
| ------------ | ------------------------- | ------------------------- |
| Push to main | `latest`                  | `latest`                  |
| Tag `v1.0.0` | `v1.0.0`, `1.0`, `latest` | `v1.0.0`, `1.0`, `latest` |
| Tag `v1.1.0` | `v1.1.0`, `1.1`, `latest` | `v1.1.0`, `1.1`, `latest` |
| Pull Request | `pr-123`                  | `pr-123`                  |

## 🔒 Security Features

The workflow includes:

- ✅ **Vulnerability Scanning**: Trivy scans for security issues
- ✅ **Multi-stage Builds**: Minimal production images
- ✅ **No Secrets in Logs**: Secure token handling
- ✅ **SARIF Upload**: Security results in GitHub Security tab

## 🛠️ Troubleshooting

### Build Fails with Authentication Error

```
Error: denied: requested access to the resource is denied
```

**Solution**: Check GitHub secrets are correctly set:

- `DOCKER_USERNAME` = `alokdekadev`
- `DOCKER_PASSWORD` = Your Docker Hub access token

### Build Fails with Permission Error

**Solution**: Ensure Docker Hub access token has `Read, Write, Delete` permissions

### Images Not Appearing on Docker Hub

**Solution**:

1. Check workflow completed successfully
2. Verify you're looking at the correct repositories:
   - `alokdekadev/monitoring-server`
   - `alokdekadev/monitoring-dashboard`

### Multi-platform Build Issues

**Solution**: The workflow uses Docker Buildx for multi-platform builds. If issues occur:

1. Check the build logs in GitHub Actions
2. Temporarily disable ARM64 builds by removing `linux/arm64` from platforms

## 📈 Usage Analytics

Monitor your Docker Hub images:

1. **Docker Hub Analytics**: View pull statistics on Docker Hub
2. **GitHub Insights**: Check Actions usage in repository insights
3. **Badge Updates**: README badges will show current pull counts

## 🎯 Next Steps

After setup:

1. **Update Documentation**: Ensure all docs reference your Docker Hub images
2. **Test Deployment**: Use `docker-compose.hub.yml` to test deployment
3. **Create Releases**: Use GitHub releases for version management
4. **Monitor Usage**: Track image pulls and usage patterns

## 📞 Support

If you encounter issues:

1. **Check GitHub Actions logs** for detailed error messages
2. **Verify Docker Hub permissions** and access tokens
3. **Test local Docker builds** to isolate issues
4. **Review workflow file** for any customization needs

---

**🎉 Once set up, your Docker images will be automatically published to Docker Hub on every push!**

Users can then deploy with:

```bash
curl -sSL https://raw.githubusercontent.com/alokdeka/linux-server-monitoring/main/docker-compose.hub.yml -o docker-compose.yml
docker compose up -d
```
