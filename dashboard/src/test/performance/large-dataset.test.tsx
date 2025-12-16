import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { performance } from 'perf_hooks';
import serversReducer from '../../store/slices/serversSlice';
import alertsReducer from '../../store/slices/alertsSlice';
import ServerGrid from '../../components/servers/ServerGrid';
import AlertPanel from '../../components/alerts/AlertPanel';
import type { Server, Alert } from '../../types';

// Generate large datasets for performance testing
const generateServers = (count: number): Server[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `server-${i}`,
    hostname: `server-${i.toString().padStart(3, '0')}`,
    ipAddress: `192.168.${Math.floor(i / 254)}.${(i % 254) + 1}`,
    status:
      Math.random() > 0.8
        ? 'offline'
        : Math.random() > 0.9
          ? 'warning'
          : 'online',
    lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    registeredAt: new Date(
      Date.now() - Math.random() * 86400000 * 30
    ).toISOString(),
    currentMetrics:
      Math.random() > 0.2
        ? {
            serverId: `server-${i}`,
            timestamp: new Date().toISOString(),
            cpuUsage: Math.random() * 100,
            memory: {
              total: 8000000000 + Math.random() * 56000000000,
              used: Math.random() * 8000000000,
              percentage: Math.random() * 100,
            },
            diskUsage: [
              {
                device: '/dev/sda1',
                mountpoint: '/',
                total: 100000000000 + Math.random() * 900000000000,
                used: Math.random() * 100000000000,
                percentage: Math.random() * 100,
              },
            ],
            loadAverage: {
              oneMin: Math.random() * 5,
              fiveMin: Math.random() * 5,
              fifteenMin: Math.random() * 5,
            },
            uptime: Math.random() * 31536000,
            failedServices:
              Math.random() > 0.8
                ? [
                    {
                      name: `service-${i}`,
                      status: 'failed',
                      since: new Date(
                        Date.now() - Math.random() * 3600000
                      ).toISOString(),
                    },
                  ]
                : [],
          }
        : undefined,
  }));
};

const generateAlerts = (count: number): Alert[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `alert-${i}`,
    serverId: `server-${Math.floor(Math.random() * 100)}`,
    type: ['cpu', 'memory', 'disk', 'offline'][
      Math.floor(Math.random() * 4)
    ] as any,
    severity: Math.random() > 0.5 ? 'warning' : 'critical',
    message: `Alert message ${i}: ${['High CPU usage', 'Memory exhausted', 'Disk full', 'Server offline'][Math.floor(Math.random() * 4)]}`,
    triggeredAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    resolvedAt:
      Math.random() > 0.7
        ? new Date(Date.now() - Math.random() * 3600000).toISOString()
        : undefined,
    acknowledged: Math.random() > 0.5,
  }));
};

const createTestStore = (servers: Server[] = [], alerts: Alert[] = []) => {
  return configureStore({
    reducer: {
      servers: serversReducer,
      alerts: alertsReducer,
    },
    preloadedState: {
      servers: {
        list: servers,
        selectedServer: null,
        loading: false,
        error: null,
        lastUpdated: null,
      },
      alerts: {
        active: alerts,
        history: [],
        unreadCount: alerts.filter((a) => !a.acknowledged).length,
        loading: false,
        error: null,
        lastUpdated: null,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement, store: any) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('Performance Tests', () => {
  it('should render 100 servers within acceptable time', () => {
    const servers = generateServers(100);
    const testStore = createTestStore(servers);

    const startTime = performance.now();

    renderWithProviders(<ServerGrid />, testStore);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 500ms
    expect(renderTime).toBeLessThan(500);

    // Should display all servers
    expect(screen.getByText('server-000')).toBeInTheDocument();
    expect(screen.getByText('server-099')).toBeInTheDocument();
  });

  it('should render 500 servers within acceptable time', () => {
    const servers = generateServers(500);
    const testStore = createTestStore(servers);

    const startTime = performance.now();

    renderWithProviders(<ServerGrid />, testStore);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 1 second for large dataset
    expect(renderTime).toBeLessThan(1000);

    // Should display servers (check first and last)
    expect(screen.getByText('server-000')).toBeInTheDocument();
    expect(screen.getByText('server-499')).toBeInTheDocument();
  });

  it('should handle 200 alerts efficiently', () => {
    const alerts = generateAlerts(200);
    const testStore = createTestStore([], alerts);

    const startTime = performance.now();

    renderWithProviders(<AlertPanel />, testStore);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 300ms
    expect(renderTime).toBeLessThan(300);

    // Should display alerts
    expect(screen.getByText(/Alert message 0:/)).toBeInTheDocument();
  });

  it('should handle frequent updates without performance degradation', () => {
    const servers = generateServers(50);
    const testStore = createTestStore(servers);

    const { rerender } = renderWithProviders(<ServerGrid />, testStore);

    const updateTimes: number[] = [];

    // Simulate 10 rapid updates
    for (let i = 0; i < 10; i++) {
      const updatedServers = servers.map((server) => ({
        ...server,
        currentMetrics: server.currentMetrics
          ? {
              ...server.currentMetrics,
              cpuUsage: Math.random() * 100,
              timestamp: new Date().toISOString(),
            }
          : undefined,
      }));

      const updatedStore = createTestStore(updatedServers);

      const startTime = performance.now();

      rerender(
        <Provider store={updatedStore}>
          <BrowserRouter>
            <ServerGrid />
          </BrowserRouter>
        </Provider>
      );

      const endTime = performance.now();
      updateTimes.push(endTime - startTime);
    }

    // Average update time should be reasonable
    const averageUpdateTime =
      updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
    expect(averageUpdateTime).toBeLessThan(100);

    // No update should take more than 200ms
    updateTimes.forEach((time) => {
      expect(time).toBeLessThan(200);
    });
  });

  it('should maintain performance with mixed online/offline servers', () => {
    // Generate servers with mixed states
    const servers = generateServers(200).map((server, i) => ({
      ...server,
      status: i % 3 === 0 ? 'offline' : i % 5 === 0 ? 'warning' : 'online',
      currentMetrics: i % 3 === 0 ? undefined : server.currentMetrics, // Offline servers have no metrics
    }));

    const testStore = createTestStore(servers);

    const startTime = performance.now();

    renderWithProviders(<ServerGrid />, testStore);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should handle mixed states efficiently
    expect(renderTime).toBeLessThan(800);

    // Should display both online and offline servers
    expect(screen.getAllByText(/server-/)).toHaveLength(200);
    expect(screen.getAllByText('Offline').length).toBeGreaterThan(0);
  });

  it('should handle memory efficiently with large datasets', () => {
    const servers = generateServers(1000);
    const alerts = generateAlerts(500);
    const testStore = createTestStore(servers, alerts);

    // Monitor memory usage (basic check)
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    renderWithProviders(<ServerGrid />, testStore);

    const afterRenderMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = afterRenderMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB for this test)
    if (initialMemory > 0) {
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }

    // Should still render correctly
    expect(screen.getByText('server-000')).toBeInTheDocument();
  });
});
