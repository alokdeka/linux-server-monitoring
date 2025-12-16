import { test, expect } from '@playwright/test';

const mockServers = [
  {
    id: 'server-1',
    hostname: 'web-server-01',
    ipAddress: '192.168.1.100',
    status: 'online',
    lastSeen: new Date().toISOString(),
    registeredAt: '2024-01-01T00:00:00Z',
    currentMetrics: {
      serverId: 'server-1',
      timestamp: new Date().toISOString(),
      cpuUsage: 45.5,
      memory: {
        total: 8000000000,
        used: 5000000000,
        percentage: 62.5,
      },
      diskUsage: [
        {
          device: '/dev/sda1',
          mountpoint: '/',
          total: 100000000000,
          used: 78000000000,
          percentage: 78,
        },
      ],
      loadAverage: {
        oneMin: 1.2,
        fiveMin: 1.1,
        fifteenMin: 1.0,
      },
      uptime: 86400,
      failedServices: [],
    },
  },
  {
    id: 'server-2',
    hostname: 'backup-server-01',
    ipAddress: '192.168.1.103',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    registeredAt: '2024-01-01T00:00:00Z',
  },
];

const mockAlerts = [
  {
    id: 'alert-1',
    serverId: 'server-1',
    type: 'cpu',
    severity: 'warning',
    message: 'High CPU usage detected',
    triggeredAt: new Date().toISOString(),
    acknowledged: false,
  },
];

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
          },
        }),
      });
    });

    // Login first
    await page.goto('/');
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
  });

  test('should display server grid with servers', async ({ page }) => {
    // Mock servers API
    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockServers),
      });
    });

    await page.goto('/dashboard');

    // Should display server cards
    await expect(page.getByText('web-server-01')).toBeVisible();
    await expect(page.getByText('backup-server-01')).toBeVisible();
    await expect(page.getByText('192.168.1.100')).toBeVisible();
    await expect(page.getByText('192.168.1.103')).toBeVisible();

    // Online server should show metrics
    await expect(page.getByText('CPU: 46%')).toBeVisible();
    await expect(page.getByText('RAM: 63%')).toBeVisible();
    await expect(page.getByText('Disk: 78%')).toBeVisible();

    // Offline server should show offline status
    await expect(page.getByText('Offline')).toBeVisible();
  });

  test('should navigate to server details', async ({ page }) => {
    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockServers),
      });
    });

    await page.route('**/api/servers/server-1/metrics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockServers[0].currentMetrics]),
      });
    });

    await page.goto('/dashboard');

    // Click on server card
    await page.getByText('web-server-01').click();

    // Should navigate to server details
    await expect(page).toHaveURL('/servers/server-1');

    // Should show detailed metrics
    await expect(page.getByText('CPU Usage')).toBeVisible();
    await expect(page.getByText('Memory Usage')).toBeVisible();
    await expect(page.getByText('Load Average')).toBeVisible();
  });

  test('should display alerts panel', async ({ page }) => {
    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockServers),
      });
    });

    await page.route('**/api/alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAlerts),
      });
    });

    await page.goto('/alerts');

    // Should display alert
    await expect(page.getByText('High CPU usage detected')).toBeVisible();

    // Should show severity indicator
    const alertElement = page
      .getByText('High CPU usage detected')
      .locator('..');
    await expect(alertElement).toHaveClass(/warning/);
  });

  test('should handle responsive design', async ({ page }) => {
    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockServers),
      });
    });

    await page.goto('/dashboard');

    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.getByText('web-server-01')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('web-server-01')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('web-server-01')).toBeVisible();

    // Should have responsive classes
    const grid = page.locator('.server-grid');
    await expect(grid).toHaveClass(/responsive/);
  });

  test('should handle real-time updates', async ({ page }) => {
    let serverData = [...mockServers];

    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(serverData),
      });
    });

    await page.goto('/dashboard');

    // Initial state
    await expect(page.getByText('CPU: 46%')).toBeVisible();

    // Simulate server update
    serverData[0].currentMetrics!.cpuUsage = 75.2;

    // Mock WebSocket or polling update
    await page.evaluate(() => {
      // Simulate real-time update
      window.dispatchEvent(
        new CustomEvent('server-update', {
          detail: {
            serverId: 'server-1',
            metrics: {
              cpuUsage: 75.2,
            },
          },
        })
      );
    });

    // Should reflect updated metrics (with some tolerance for timing)
    await expect(page.getByText(/CPU: 75%/)).toBeVisible({ timeout: 5000 });
  });

  test('should handle error states', async ({ page }) => {
    // Mock server error
    await page.route('**/api/servers', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard');

    // Should show error state
    await expect(page.getByText(/error loading servers/i)).toBeVisible();

    // Should provide retry option
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});
