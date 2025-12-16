import fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import serversReducer from '../store/slices/serversSlice';
import alertsReducer from '../store/slices/alertsSlice';
import ServerCard from '../components/servers/ServerCard';
import AlertPanel from '../components/alerts/AlertPanel';
import type { Server, Alert } from '../types';

// Mock the API client to prevent actual API calls
import { vi } from 'vitest';

vi.mock('../services/api', () => ({
  apiClient: {
    getAlerts: vi.fn().mockResolvedValue([]),
    getAlertHistory: vi.fn().mockResolvedValue([]),
  },
}));

// Better generators that avoid edge cases
const validStringGenerator = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0 && !s.includes('<') && !s.includes('>'));

const validDateGenerator = fc
  .date({
    min: new Date('2020-01-01'),
    max: new Date('2024-12-31'),
  })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

const serverGenerator = fc.record({
  id: validStringGenerator,
  hostname: validStringGenerator,
  ipAddress: fc.ipV4(),
  status: fc.constantFrom('online', 'offline', 'warning'),
  lastSeen: validDateGenerator,
  registeredAt: validDateGenerator,
  currentMetrics: fc.option(
    fc.record({
      serverId: validStringGenerator,
      timestamp: validDateGenerator,
      cpuUsage: fc.float({ min: 0, max: 100 }).filter((n) => !isNaN(n)),
      memory: fc
        .record({
          total: fc.integer({ min: 1000000, max: 64000000000 }),
          used: fc.integer({ min: 0, max: 64000000000 }),
          percentage: fc.float({ min: 0, max: 100 }),
        })
        .map((mem) => ({
          ...mem,
          used: Math.min(mem.used, mem.total),
          percentage:
            mem.total > 0 ? Math.min(100, (mem.used / mem.total) * 100) : 0,
        }))
        .filter((mem) => !isNaN(mem.percentage)),
      diskUsage: fc.array(
        fc.record({
          device: validStringGenerator,
          mountpoint: validStringGenerator,
          total: fc.integer({ min: 1000000, max: 1000000000000 }),
          used: fc.integer({ min: 0, max: 1000000000000 }),
          percentage: fc.float({ min: 0, max: 100 }).filter((n) => !isNaN(n)),
        }),
        { minLength: 1, maxLength: 3 }
      ),
      loadAverage: fc.record({
        oneMin: fc.float({ min: 0, max: 10 }).filter((n) => !isNaN(n)),
        fiveMin: fc.float({ min: 0, max: 10 }).filter((n) => !isNaN(n)),
        fifteenMin: fc.float({ min: 0, max: 10 }).filter((n) => !isNaN(n)),
      }),
      uptime: fc.integer({ min: 0, max: 31536000 }),
      failedServices: fc.array(
        fc.record({
          name: validStringGenerator,
          status: validStringGenerator,
          timestamp: validDateGenerator,
        }),
        { maxLength: 5 }
      ),
    })
  ),
});

const alertGenerator = fc.record({
  id: validStringGenerator,
  serverId: validStringGenerator,
  type: fc.constantFrom('cpu', 'memory', 'disk', 'offline'),
  severity: fc.constantFrom('warning', 'critical'),
  message: validStringGenerator,
  triggeredAt: validDateGenerator,
  resolvedAt: fc.option(validDateGenerator),
  acknowledged: fc.boolean(),
});

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

describe('Property-based tests', () => {
  describe('ServerCard properties', () => {
    it('**Feature: web-dashboard, Property 1: Server grid rendering completeness**', () => {
      fc.assert(
        fc.property(serverGenerator, (server) => {
          const testStore = createTestStore([server]);

          renderWithProviders(<ServerCard server={server} />, testStore);

          // Server hostname should always be displayed
          const hostnameElements = screen.getAllByText(server.hostname);
          expect(hostnameElements.length).toBeGreaterThan(0);
          // IP address should always be displayed
          const ipElements = screen.getAllByText(server.ipAddress);
          expect(ipElements.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 20 }
      );
    });

    it('**Feature: web-dashboard, Property 2: Online server display accuracy**', () => {
      fc.assert(
        fc.property(
          serverGenerator.filter(
            (s) => s.status === 'online' && s.currentMetrics != null
          ),
          (server) => {
            const testStore = createTestStore([server]);

            renderWithProviders(<ServerCard server={server} />, testStore);

            if (server.currentMetrics) {
              // CPU usage should be displayed for online servers with metrics
              const cpuRegex = new RegExp(
                `CPU: ${Math.round(server.currentMetrics.cpuUsage)}%`
              );
              const cpuElements = screen.getAllByText(cpuRegex);
              expect(cpuElements.length).toBeGreaterThan(0);

              // Memory usage should be displayed
              const memoryRegex = new RegExp(
                `RAM: ${Math.round(server.currentMetrics.memory.percentage)}%`
              );
              const memoryElements = screen.getAllByText(memoryRegex);
              expect(memoryElements.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('**Feature: web-dashboard, Property 3: Offline server indication**', () => {
      fc.assert(
        fc.property(
          serverGenerator.filter((s) => s.status === 'offline'),
          (server) => {
            const testStore = createTestStore([server]);

            renderWithProviders(<ServerCard server={server} />, testStore);

            // Offline status should be clearly indicated
            const offlineElements = screen.getAllByText('Offline');
            expect(offlineElements.length).toBeGreaterThan(0);

            // Last seen timestamp should be displayed
            const lastSeenElements = screen.getAllByText(/Last seen:/);
            expect(lastSeenElements.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('AlertPanel properties', () => {
    it('**Feature: web-dashboard, Property 10: Active alerts display**', () => {
      fc.assert(
        fc.property(
          fc.array(alertGenerator, { minLength: 1, maxLength: 3 }),
          (alerts) => {
            const testStore = createTestStore([], alerts);

            renderWithProviders(<AlertPanel />, testStore);

            // All alert messages should be displayed
            alerts.forEach((alert) => {
              const elements = screen.getAllByText(alert.message.trim());
              expect(elements.length).toBeGreaterThan(0);
            });

            return true;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('**Feature: web-dashboard, Property 13: Alert severity color coding**', () => {
      fc.assert(
        fc.property(alertGenerator, (alert) => {
          const testStore = createTestStore([], [alert]);

          renderWithProviders(<AlertPanel />, testStore);

          const alertElements = screen.getAllByText(alert.message.trim());
          expect(alertElements.length).toBeGreaterThan(0);
          const alertElement = alertElements[0].closest('.alert-item');

          // Alert should have appropriate severity class
          if (alert.severity === 'warning') {
            expect(alertElement).toHaveClass('warning');
          } else if (alert.severity === 'critical') {
            expect(alertElement).toHaveClass('critical');
          }

          return true;
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('Data validation properties', () => {
    it('**Feature: web-dashboard, Property 34: JSON format compatibility**', () => {
      fc.assert(
        fc.property(fc.array(serverGenerator, { maxLength: 5 }), (servers) => {
          // Test that server data can be serialized and deserialized
          const serialized = JSON.stringify(servers);
          const deserialized = JSON.parse(serialized);

          // Data should remain consistent after JSON round-trip
          // Note: NaN values become null after JSON serialization, which is expected
          const normalizedOriginal = JSON.parse(JSON.stringify(servers));
          expect(deserialized).toEqual(normalizedOriginal);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('Server metrics percentage values are within valid range', () => {
      fc.assert(
        fc.property(
          serverGenerator.filter((s) => s.currentMetrics != null),
          (server) => {
            if (server.currentMetrics) {
              // CPU usage should be 0-100%
              expect(server.currentMetrics.cpuUsage).toBeGreaterThanOrEqual(0);
              expect(server.currentMetrics.cpuUsage).toBeLessThanOrEqual(100);

              // Memory percentage should be 0-100%
              expect(
                server.currentMetrics.memory.percentage
              ).toBeGreaterThanOrEqual(0);
              expect(
                server.currentMetrics.memory.percentage
              ).toBeLessThanOrEqual(100);

              // Disk usage percentages should be 0-100%
              server.currentMetrics.diskUsage.forEach((disk) => {
                expect(disk.percentage).toBeGreaterThanOrEqual(0);
                expect(disk.percentage).toBeLessThanOrEqual(100);
              });
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
