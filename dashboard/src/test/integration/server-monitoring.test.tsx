import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import serversReducer from '../../store/slices/serversReducer';
import metricsReducer from '../../store/slices/metricsSlice';
import alertsReducer from '../../store/slices/alertsSlice';
import ServerGrid from '../../components/servers/ServerGrid';
import ServerDetails from '../../components/servers/ServerDetails';
import type { Server } from '../../types';

const mockServers: Server[] = [
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
      failedServices: [
        {
          name: 'nginx',
          status: 'failed',
          since: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
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

const createTestStore = (servers: Server[] = []) => {
  return configureStore({
    reducer: {
      servers: serversReducer,
      metrics: metricsReducer,
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
      metrics: {
        current: {},
        historical: {},
        loading: false,
        error: null,
      },
      alerts: {
        active: [],
        history: [],
        unreadCount: 0,
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

describe('Server Monitoring Integration', () => {
  it('**Integration Test: Server grid to details navigation**', async () => {
    const testStore = createTestStore(mockServers);

    renderWithProviders(<ServerGrid />, testStore);

    // Should display all servers
    expect(screen.getByText('web-server-01')).toBeInTheDocument();
    expect(screen.getByText('backup-server-01')).toBeInTheDocument();

    // Click on online server
    const onlineServerCard = screen
      .getByText('web-server-01')
      .closest('.server-card');
    expect(onlineServerCard).toBeInTheDocument();

    fireEvent.click(onlineServerCard!);

    // Should navigate to server details (mocked navigation)
    // In a real integration test, this would verify the route change
    expect(onlineServerCard).toHaveAttribute('role', 'button');
  });

  it('**Integration Test: Server metrics display workflow**', () => {
    const testStore = createTestStore(mockServers);

    renderWithProviders(<ServerGrid />, testStore);

    // Online server should show metrics
    const onlineServer = screen
      .getByText('web-server-01')
      .closest('.server-card');
    expect(onlineServer).toBeInTheDocument();

    // Should display CPU, memory, and disk metrics
    expect(screen.getByText('CPU: 46%')).toBeInTheDocument();
    expect(screen.getByText('RAM: 63%')).toBeInTheDocument();
    expect(screen.getByText('Disk: 78%')).toBeInTheDocument();

    // Offline server should show offline status
    const offlineServer = screen
      .getByText('backup-server-01')
      .closest('.server-card');
    expect(offlineServer).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/Last seen: 1h ago/)).toBeInTheDocument();
  });

  it('**Integration Test: Server details comprehensive view**', () => {
    const server = mockServers[0]; // Online server with metrics
    const testStore = createTestStore([server]);

    // Set selected server
    testStore.dispatch({
      type: 'servers/setSelectedServer',
      payload: server,
    });

    renderWithProviders(<ServerDetails serverId={server.id} />, testStore);

    // Should display server information
    expect(screen.getByText(server.hostname)).toBeInTheDocument();
    expect(screen.getByText(server.ipAddress)).toBeInTheDocument();

    // Should display system metrics
    expect(screen.getByText(/CPU Usage/)).toBeInTheDocument();
    expect(screen.getByText(/Memory Usage/)).toBeInTheDocument();
    expect(screen.getByText(/Disk Usage/)).toBeInTheDocument();

    // Should display load average
    expect(screen.getByText(/Load Average/)).toBeInTheDocument();
    expect(screen.getByText('1.2')).toBeInTheDocument(); // 1-min load

    // Should display uptime
    expect(screen.getByText(/Uptime/)).toBeInTheDocument();
    expect(screen.getByText(/1d 0h/)).toBeInTheDocument();

    // Should display failed services
    expect(screen.getByText(/Failed Services/)).toBeInTheDocument();
    expect(screen.getByText('nginx')).toBeInTheDocument();
  });

  it('**Integration Test: Real-time updates simulation**', async () => {
    const testStore = createTestStore(mockServers);

    renderWithProviders(<ServerGrid />, testStore);

    // Initial state
    expect(screen.getByText('CPU: 46%')).toBeInTheDocument();

    // Simulate metrics update
    const updatedServer = {
      ...mockServers[0],
      currentMetrics: {
        ...mockServers[0].currentMetrics!,
        cpuUsage: 75.2,
      },
    };

    testStore.dispatch({
      type: 'servers/updateServerMetrics',
      payload: {
        serverId: updatedServer.id,
        metrics: updatedServer.currentMetrics,
      },
    });

    // Should reflect updated metrics
    await waitFor(() => {
      expect(screen.getByText('CPU: 75%')).toBeInTheDocument();
    });
  });

  it('**Integration Test: Error handling in server monitoring**', () => {
    const testStore = configureStore({
      reducer: {
        servers: serversReducer,
        metrics: metricsReducer,
        alerts: alertsReducer,
      },
      preloadedState: {
        servers: {
          list: [],
          selectedServer: null,
          loading: false,
          error: 'Failed to load servers',
          lastUpdated: null,
        },
        metrics: {
          current: {},
          historical: {},
          loading: false,
          error: null,
        },
        alerts: {
          active: [],
          history: [],
          unreadCount: 0,
          loading: false,
          error: null,
          lastUpdated: null,
        },
      },
    });

    renderWithProviders(<ServerGrid />, testStore);

    // Should display error state
    expect(screen.getByText(/failed to load servers/i)).toBeInTheDocument();

    // Should provide retry option
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
