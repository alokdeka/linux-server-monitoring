import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ServerCard from './ServerCard';
import type { Server } from '../../types';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockOnlineServer: Server = {
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
};

const mockOfflineServer: Server = {
  id: 'server-2',
  hostname: 'backup-server-01',
  ipAddress: '192.168.1.103',
  status: 'offline',
  lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  registeredAt: '2024-01-01T00:00:00Z',
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ServerCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders online server with metrics correctly', () => {
    renderWithRouter(<ServerCard server={mockOnlineServer} />);

    expect(screen.getByText('web-server-01')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('CPU: 46%')).toBeInTheDocument();
    expect(screen.getByText('RAM: 63%')).toBeInTheDocument();
    expect(screen.getByText('Disk: 78%')).toBeInTheDocument();
    expect(screen.getByText('Uptime: 1d 0h')).toBeInTheDocument();
  });

  it('renders offline server correctly', () => {
    renderWithRouter(<ServerCard server={mockOfflineServer} />);

    expect(screen.getByText('backup-server-01')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.103')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/Last seen: 1h ago/)).toBeInTheDocument();
  });

  it('navigates to server details on click', () => {
    renderWithRouter(<ServerCard server={mockOnlineServer} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/servers/server-1');
  });

  it('calls custom onClick handler when provided', () => {
    const mockOnClick = vi.fn();
    renderWithRouter(
      <ServerCard server={mockOnlineServer} onClick={mockOnClick} />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledWith(mockOnlineServer);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation', () => {
    renderWithRouter(<ServerCard server={mockOnlineServer} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/servers/server-1');
  });

  it('applies correct status class', () => {
    const { rerender } = renderWithRouter(
      <ServerCard server={mockOnlineServer} />
    );

    let statusIndicator = document.querySelector('.server-status');
    expect(statusIndicator).toHaveClass('online');

    const warningServer = { ...mockOnlineServer, status: 'warning' as const };
    rerender(
      <BrowserRouter>
        <ServerCard server={warningServer} />
      </BrowserRouter>
    );

    statusIndicator = document.querySelector('.server-status');
    expect(statusIndicator).toHaveClass('warning');
  });
});
