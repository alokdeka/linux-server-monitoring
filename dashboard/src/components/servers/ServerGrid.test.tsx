import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import serversReducer from '../../store/slices/serversSlice';
import ServerGrid from './ServerGrid';
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

const createTestStore = (servers: Server[] = [], loading = false) => {
  return configureStore({
    reducer: {
      servers: serversReducer,
    },
    preloadedState: {
      servers: {
        list: servers,
        selectedServer: null,
        loading,
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

describe('ServerGrid', () => {
  it('renders empty state when no servers', () => {
    const testStore = createTestStore([]);

    renderWithProviders(<ServerGrid />, testStore);

    expect(screen.getByText(/no servers registered/i)).toBeInTheDocument();
  });

  it('displays all servers in grid layout', () => {
    const testStore = createTestStore(mockServers);

    renderWithProviders(<ServerGrid />, testStore);

    expect(screen.getByText('web-server-01')).toBeInTheDocument();
    expect(screen.getByText('backup-server-01')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.103')).toBeInTheDocument();
  });

  it('shows loading state with skeleton cards', () => {
    const testStore = createTestStore([], true);

    renderWithProviders(<ServerGrid />, testStore);

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.skeleton-card');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays correct server status indicators', () => {
    const testStore = createTestStore(mockServers);

    renderWithProviders(<ServerGrid />, testStore);

    const onlineServer = screen
      .getByText('web-server-01')
      .closest('.server-card');
    const offlineServer = screen
      .getByText('backup-server-01')
      .closest('.server-card');

    expect(onlineServer?.querySelector('.server-status')).toHaveClass('online');
    expect(offlineServer?.querySelector('.server-status')).toHaveClass(
      'offline'
    );
  });

  it('handles responsive grid layout', () => {
    const testStore = createTestStore(mockServers);

    renderWithProviders(<ServerGrid />, testStore);

    const grid = document.querySelector('.server-grid');
    expect(grid).toHaveClass('responsive-grid');
  });
});
