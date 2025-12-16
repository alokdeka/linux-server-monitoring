# 📊 Server Monitoring Dashboard

**Your beautiful, easy-to-use web interface for monitoring all your servers!**

This is the web dashboard where you'll spend most of your time. It shows you everything about your servers in real-time with beautiful charts and instant alerts.

## 🎯 What You Can Do

- 👀 **See all your servers at a glance** - Green = good, Red = needs attention
- 📈 **View real-time charts** - CPU, memory, disk usage updating every 30 seconds
- 🚨 **Get instant alerts** - Know immediately when something goes wrong
- ⚙️ **Manage everything** - Add servers, change settings, configure alerts
- 📱 **Use on any device** - Works perfectly on desktop, tablet, and phone

## 🚀 Features

### Core Monitoring

- **Real-time server monitoring** with automatic 30-second refresh intervals
- **Interactive metrics visualization** using Recharts with historical data
- **Comprehensive server grid** displaying all monitored servers at a glance
- **Detailed server views** with CPU, memory, disk usage, and system information
- **Failed services tracking** with timestamps and status indicators

### Alert Management

- **Real-time alert notifications** with WebSocket integration
- **Alert history and filtering** with comprehensive search capabilities
- **Severity-based color coding** (warning, critical) for quick identification
- **Alert detail modals** with full context and resolution tracking

### User Experience

- **Responsive design** optimized for desktop, tablet, and mobile devices
- **Dark and light themes** with user preference persistence
- **Touch-friendly navigation** for mobile and tablet users
- **Accessibility compliance** with WCAG guidelines
- **Offline mode support** with service worker caching

### Security & Authentication

- **JWT-based authentication** with automatic token refresh
- **Session management** with secure logout and timeout handling
- **Role-based access control** for administrative functions
- **Rate limiting** and security headers for protection

### Management Features

- **Server registration interface** with API key generation
- **Settings and configuration** with customizable alert thresholds
- **Notification management** with webhook URL configuration
- **User profile management** with preference persistence

## 🚀 Quick Setup for Developers

**Want to customize the dashboard or contribute? Here's how to get started!**

### What You Need

- **Node.js 18 or newer** - [Download here](https://nodejs.org/)
- **Basic knowledge of React** (helpful but not required)

### Super Quick Start

1. **Get the code:**

   ```bash
   git clone https://github.com/your-username/linux-server-monitoring.git
   cd linux-server-monitoring/dashboard
   ```

2. **Install everything:**

   ```bash
   npm install
   ```

3. **Configure it:**

   ```bash
   cp .env.example .env
   ```

   **Edit .env file:**

   ```bash
   # Where your monitoring server is running
   VITE_API_BASE_URL=http://localhost:8000
   VITE_WS_BASE_URL=ws://localhost:8000

   # Dashboard title (change to whatever you want)
   VITE_APP_TITLE=My Server Monitor
   ```

4. **Start developing:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Go to `http://localhost:5173` and start coding!

**🎉 That's it!** The dashboard will automatically reload when you make changes.

## 📖 How to Use the Dashboard (User Guide)

### 🏠 Dashboard Home Page

**What you see:** Overview of all your servers with key metrics

- **Green servers** = Everything is good ✅
- **Yellow servers** = Warning - check soon ⚠️
- **Red servers** = Critical - needs immediate attention 🚨
- **Gray servers** = Offline or not responding 💤

**Key numbers at the top:**

- **Total Servers** - How many servers you're monitoring
- **Online Servers** - How many are currently running
- **Active Alerts** - How many problems need attention
- **Average CPU** - Overall CPU usage across all servers

### 🖥️ Servers Page

**What you see:** Detailed list of all your servers

**For each server you can see:**

- **Status** (Online/Offline/Warning)
- **CPU Usage** - How busy the processor is
- **Memory Usage** - How much RAM is being used
- **Disk Usage** - How full the hard drives are
- **Last Seen** - When it last reported in

**Click on any server** to see detailed charts and history!

### 🚨 Alerts Page

**What you see:** All current and past alerts

**Alert types:**

- **🔴 Critical** - Server is down or has serious problems
- **🟡 Warning** - Server is having minor issues
- **🟢 Resolved** - Problem was fixed

**What to do with alerts:**

1. **Click on an alert** to see details
2. **Check what caused it** (high CPU, full disk, etc.)
3. **Fix the problem** on your server
4. **Mark as resolved** when done

### ⚙️ Server Management Page

**What you see:** Tools to add new servers

**To add a new server:**

1. **Enter server details** (name, IP address, description)
2. **Click "Generate API Key"**
3. **Copy the installation command**
4. **Run the command on your server**
5. **Wait a few minutes** - your server will appear in the dashboard!

### 🔧 Settings Page

**What you see:** Customize how the dashboard works

**Important settings:**

- **Alert Thresholds** - When to send alerts (CPU > 80%, Memory > 85%, etc.)
- **Refresh Interval** - How often to update (default: 30 seconds)
- **Notifications** - Add Slack/email webhooks for alerts
- **Theme** - Switch between light and dark mode

### 💡 Pro Tips

**🔍 Quick Health Check:**

- Green dashboard = All good!
- Any red/yellow = Check the Alerts page

**📊 Reading Charts:**

- **Spikes** = Temporary high usage (usually okay)
- **Sustained high levels** = Potential problem
- **Flat lines at 0** = Server might be offline

**🚨 Alert Best Practices:**

- **Don't ignore warnings** - They often become critical
- **Set reasonable thresholds** - Too sensitive = too many alerts
- **Check trends** - Is usage gradually increasing?

**⚡ Performance Tips:**

- **Use the mobile app** - Dashboard works great on phones
- **Bookmark important servers** - Click on them frequently
- **Set up notifications** - Get alerts via Slack/email

### Development Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run dev:host         # Start dev server accessible from network

# Building
npm run build            # Production build
npm run build:docker     # Docker-optimized build
npm run preview          # Preview production build locally

# Testing
npm run test             # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI for interactive testing
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:property    # Run property-based tests only
npm run test:e2e         # Run end-to-end tests with Playwright
npm run test:all         # Run complete test suite

# Code Quality
npm run lint             # Check code with ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Performance & Analysis
npm run perf:audit       # Run Lighthouse performance audit
npm run size:check       # Check bundle size
npm run security:audit   # Run security audit
```

## 📁 Project Structure

```
dashboard/
├── public/                    # Static assets
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   └── env-config.js         # Runtime environment config
├── src/
│   ├── components/           # React components
│   │   ├── alerts/          # Alert-related components
│   │   ├── auth/            # Authentication components
│   │   ├── common/          # Shared/common components
│   │   ├── layout/          # Layout components
│   │   └── servers/         # Server monitoring components
│   ├── hooks/               # Custom React hooks
│   │   ├── useAutoRefresh.ts    # Auto-refresh functionality
│   │   ├── useConnectionStatus.ts # Connection monitoring
│   │   └── useTokenRefresh.ts   # JWT token management
│   ├── pages/               # Page components
│   │   ├── Dashboard.tsx    # Main dashboard page
│   │   ├── Servers.tsx      # Server list page
│   │   ├── Alerts.tsx       # Alert management page
│   │   └── Settings.tsx     # Configuration page
│   ├── services/            # External service integrations
│   │   ├── api.ts          # REST API client
│   │   ├── websocket.ts    # WebSocket client
│   │   └── errorHandler.ts # Error handling utilities
│   ├── store/               # Redux state management
│   │   ├── slices/         # Redux slices
│   │   ├── middleware/     # Custom middleware
│   │   └── selectors.ts    # State selectors
│   ├── styles/              # Styling and themes
│   │   ├── theme.ts        # Theme configuration
│   │   ├── GlobalStyles.ts # Global styles
│   │   └── responsive.css  # Responsive design utilities
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── performance.ts  # Performance monitoring
│   │   └── accessibility.ts # Accessibility helpers
│   └── test/                # Test files and utilities
│       ├── integration/    # Integration tests
│       ├── e2e/           # End-to-end tests
│       ├── performance/   # Performance tests
│       └── property-tests.test.tsx # Property-based tests
├── Dockerfile              # Docker container configuration
├── nginx.conf              # Nginx configuration for production
├── playwright.config.ts    # Playwright E2E test configuration
├── vite.config.ts         # Vite build configuration
└── package.json           # Dependencies and scripts
```

## 🧪 Testing Strategy

The dashboard implements a comprehensive testing approach:

### Unit Tests

- **Component testing** with React Testing Library
- **Hook testing** for custom React hooks
- **Utility function testing** for business logic
- **State management testing** for Redux slices

### Integration Tests

- **Authentication flow testing** (login, logout, token refresh)
- **Server monitoring workflow testing** (registration, monitoring, alerts)
- **Real-time update testing** (WebSocket integration)

### Property-Based Tests

- **Universal property verification** using fast-check
- **Input validation testing** across component boundaries
- **State consistency testing** for complex interactions
- **API response handling** with generated test data

### End-to-End Tests

- **Complete user journeys** from login to data visualization
- **Cross-browser compatibility** testing
- **Responsive design validation** across device sizes
- **Performance testing** with large datasets

### Running Tests

```bash
# Quick test run
npm run test

# Comprehensive testing
npm run test:all

# Interactive testing
npm run test:ui

# Performance testing
npm run test:performance

# Visual regression testing
npm run test:visual
```

## 🔧 Technology Stack

### Core Technologies

- **React 19** - Modern UI framework with concurrent features
- **TypeScript 5.9** - Type safety and developer experience
- **Vite 7** - Fast build tool and development server
- **Redux Toolkit** - Predictable state management

### UI & Styling

- **Styled Components** - CSS-in-JS with theme support
- **Recharts** - Interactive data visualization
- **React Router** - Client-side routing
- **CSS Grid & Flexbox** - Modern layout techniques

### Testing & Quality

- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **fast-check** - Property-based testing library
- **Playwright** - End-to-end testing framework
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting

### Development Tools

- **TypeScript ESLint** - TypeScript-aware linting
- **Vite Bundle Analyzer** - Bundle size analysis
- **Lighthouse** - Performance auditing
- **Docker** - Containerization support

## 🔌 API Integration

The dashboard integrates seamlessly with the existing FastAPI backend:

### REST API Endpoints

- **Authentication**: `/api/v1/dashboard/auth/*`
- **Server Data**: `/api/v1/dashboard/servers/*`
- **Alerts**: `/api/v1/dashboard/alerts/*`
- **Settings**: `/api/v1/dashboard/settings/*`
- **User Management**: `/api/v1/dashboard/user/*`

### WebSocket Integration

- **Real-time metrics**: Live server performance data
- **Alert notifications**: Immediate alert delivery
- **Status updates**: Server online/offline changes
- **Connection management**: Automatic reconnection with fallback

### API Client Features

- **Automatic token refresh** for seamless authentication
- **Request/response interceptors** for error handling
- **Retry mechanisms** with exponential backoff
- **Type-safe API calls** with TypeScript interfaces
- **Caching strategies** for improved performance

## 🎨 Theming & Customization

### Theme System

The dashboard supports comprehensive theming:

```typescript
// Light and dark theme support
const themes = {
  light: {
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#ffffff',
      surface: '#f8fafc',
    },
  },
  dark: {
    colors: {
      primary: '#3b82f6',
      secondary: '#94a3b8',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      background: '#0f172a',
      surface: '#1e293b',
    },
  },
};
```

### Responsive Design

- **Mobile-first approach** with progressive enhancement
- **Flexible grid system** adapting to screen sizes
- **Touch-friendly interactions** for mobile devices
- **Optimized typography** for readability across devices

## 🚀 Performance Optimization

### Build Optimizations

- **Code splitting** with dynamic imports
- **Tree shaking** for minimal bundle size
- **Asset optimization** with Vite's built-in features
- **Service worker** for offline functionality

### Runtime Optimizations

- **React.memo** for component memoization
- **useMemo/useCallback** for expensive computations
- **Virtual scrolling** for large data sets
- **Debounced API calls** to reduce server load

### Monitoring

- **Performance monitoring** with built-in metrics
- **Error tracking** with comprehensive logging
- **Bundle analysis** for size optimization
- **Lighthouse audits** for performance validation

## 🔒 Security Features

### Authentication & Authorization

- **JWT token management** with secure storage
- **Automatic token refresh** to maintain sessions
- **Role-based access control** for administrative features
- **Session timeout** with user notification

### Security Headers

- **Content Security Policy** (CSP) implementation
- **X-Frame-Options** for clickjacking protection
- **X-Content-Type-Options** to prevent MIME sniffing
- **Referrer Policy** for privacy protection

### Data Protection

- **Input validation** on all user inputs
- **XSS protection** through React's built-in escaping
- **CSRF protection** via token-based authentication
- **Secure communication** with HTTPS enforcement

## 🐛 Troubleshooting

### Common Development Issues

**1. API Connection Errors**

```bash
# Check if the backend server is running
curl http://localhost:8000/api/v1/health

# Verify environment variables
echo $VITE_API_BASE_URL
```

**2. Build Failures**

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
npm run dev -- --force
```

**3. Test Failures**

```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific test file
npm run test -- src/components/ServerCard.test.tsx
```

**4. Performance Issues**

```bash
# Analyze bundle size
npm run build:analyze

# Run performance audit
npm run perf:audit
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variable
VITE_ENABLE_DEBUG=true npm run dev
```

## 📚 Additional Resources

### Documentation

- [API Documentation](../DASHBOARD_API.md) - Complete API reference
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [User Guide](./USER_GUIDE.md) - End-user documentation
- [Contributing Guide](./CONTRIBUTING.md) - Development contribution guidelines

### External Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code style and conventions
- Testing requirements
- Pull request process
- Issue reporting guidelines

### Development Workflow

1. **Fork the repository** and create a feature branch
2. **Follow the code style** enforced by ESLint and Prettier
3. **Write tests** for new features and bug fixes
4. **Ensure all tests pass** before submitting changes
5. **Update documentation** for user-facing changes
6. **Submit a pull request** with a clear description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: Check the docs folder for detailed guides
- **Email**: support@yourproject.com
