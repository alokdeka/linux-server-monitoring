import { render } from '@testing-library/react';
import {
  renderWithProviders,
  createMockServer,
  createMockAlert,
} from '../test-utils';
import ServerCard from '../../components/servers/ServerCard';
import AlertPanel from '../../components/alerts/AlertPanel';
import LoginForm from '../../components/auth/LoginForm';

// Note: This is a basic visual regression test setup
// In a real project, you would use tools like:
// - @storybook/test-runner with Chromatic
// - Percy with @percy/playwright
// - Applitools Eyes
// - BackstopJS

describe('Visual Regression Tests', () => {
  describe('ServerCard Component', () => {
    it('should render online server card consistently', () => {
      const onlineServer = createMockServer({
        status: 'online',
        hostname: 'web-server-01',
        ipAddress: '192.168.1.100',
      });

      const { container } = renderWithProviders(
        <ServerCard server={onlineServer} />
      );

      // Take snapshot (in real implementation, this would be a visual diff)
      expect(container.firstChild).toMatchSnapshot('online-server-card');
    });

    it('should render offline server card consistently', () => {
      const offlineServer = createMockServer({
        status: 'offline',
        hostname: 'backup-server-01',
        ipAddress: '192.168.1.103',
        currentMetrics: undefined,
      });

      const { container } = renderWithProviders(
        <ServerCard server={offlineServer} />
      );

      expect(container.firstChild).toMatchSnapshot('offline-server-card');
    });

    it('should render warning server card consistently', () => {
      const warningServer = createMockServer({
        status: 'warning',
        hostname: 'warning-server-01',
        currentMetrics: {
          ...createMockServer().currentMetrics!,
          cpuUsage: 85.2,
          memory: {
            ...createMockServer().currentMetrics!.memory,
            percentage: 90.1,
          },
        },
      });

      const { container } = renderWithProviders(
        <ServerCard server={warningServer} />
      );

      expect(container.firstChild).toMatchSnapshot('warning-server-card');
    });
  });

  describe('AlertPanel Component', () => {
    it('should render empty alert panel consistently', () => {
      const { container } = renderWithProviders(<AlertPanel />);

      expect(container.firstChild).toMatchSnapshot('empty-alert-panel');
    });

    it('should render alert panel with alerts consistently', () => {
      const alerts = [
        createMockAlert({
          id: 'alert-1',
          severity: 'warning',
          message: 'High CPU usage detected',
        }),
        createMockAlert({
          id: 'alert-2',
          severity: 'critical',
          message: 'Memory usage critical',
        }),
      ];

      const { container } = renderWithProviders(<AlertPanel />, {
        preloadedState: {
          alerts: {
            active: alerts,
            history: [],
            unreadCount: 2,
            loading: false,
            error: null,
            lastUpdated: null,
          },
        },
      });

      expect(container.firstChild).toMatchSnapshot('alert-panel-with-alerts');
    });
  });

  describe('LoginForm Component', () => {
    it('should render login form consistently', () => {
      const { container } = renderWithProviders(<LoginForm />);

      expect(container.firstChild).toMatchSnapshot('login-form');
    });

    it('should render login form with error consistently', () => {
      const { container } = renderWithProviders(<LoginForm />, {
        preloadedState: {
          auth: {
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: 'Invalid credentials',
            tokenExpiry: null,
          },
        },
      });

      expect(container.firstChild).toMatchSnapshot('login-form-with-error');
    });

    it('should render login form loading state consistently', () => {
      const { container } = renderWithProviders(<LoginForm />, {
        preloadedState: {
          auth: {
            user: null,
            token: null,
            isAuthenticated: false,
            loading: true,
            error: null,
            tokenExpiry: null,
          },
        },
      });

      expect(container.firstChild).toMatchSnapshot('login-form-loading');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should render components consistently across different viewport sizes', () => {
      const server = createMockServer();

      // Desktop view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { container: desktopContainer } = renderWithProviders(
        <ServerCard server={server} />
      );

      expect(desktopContainer.firstChild).toMatchSnapshot(
        'server-card-desktop'
      );

      // Tablet view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { container: tabletContainer } = renderWithProviders(
        <ServerCard server={server} />
      );

      expect(tabletContainer.firstChild).toMatchSnapshot('server-card-tablet');

      // Mobile view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container: mobileContainer } = renderWithProviders(
        <ServerCard server={server} />
      );

      expect(mobileContainer.firstChild).toMatchSnapshot('server-card-mobile');
    });
  });

  describe('Theme Consistency Tests', () => {
    it('should render components consistently in light theme', () => {
      const server = createMockServer();

      const { container } = renderWithProviders(
        <ServerCard server={server} />,
        {
          preloadedState: {
            app: {
              initialized: true,
              sidebarOpen: true,
              theme: 'light',
              refreshInterval: 30000,
              connectionStatus: 'connected',
              lastActivity: null,
              notifications: {
                enabled: false,
                permission: 'default' as NotificationPermission,
              },
              settings: null,
              settingsLoading: false,
              settingsError: null,
            },
          },
        }
      );

      expect(container.firstChild).toMatchSnapshot('server-card-light-theme');
    });

    it('should render components consistently in dark theme', () => {
      const server = createMockServer();

      const { container } = renderWithProviders(
        <ServerCard server={server} />,
        {
          preloadedState: {
            app: {
              initialized: true,
              sidebarOpen: true,
              theme: 'dark',
              refreshInterval: 30000,
              connectionStatus: 'connected',
              lastActivity: null,
              notifications: {
                enabled: false,
                permission: 'default' as NotificationPermission,
              },
              settings: null,
              settingsLoading: false,
              settingsError: null,
            },
          },
        }
      );

      expect(container.firstChild).toMatchSnapshot('server-card-dark-theme');
    });
  });
});
