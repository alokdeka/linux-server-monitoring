import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertsReducer from '../../store/slices/alertsSlice';
import AlertPanel from './AlertPanel';
import type { Alert } from '../../types';

const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    serverId: 'server-1',
    type: 'cpu',
    severity: 'warning',
    message: 'High CPU usage detected',
    triggeredAt: new Date().toISOString(),
    acknowledged: false,
  },
  {
    id: 'alert-2',
    serverId: 'server-2',
    type: 'memory',
    severity: 'critical',
    message: 'Memory usage critical',
    triggeredAt: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: true,
  },
];

const createTestStore = (alerts: Alert[] = []) => {
  return configureStore({
    reducer: {
      alerts: alertsReducer,
    },
    preloadedState: {
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

describe('AlertPanel', () => {
  it('renders empty state when no alerts', () => {
    const testStore = createTestStore([]);

    render(
      <Provider store={testStore}>
        <AlertPanel />
      </Provider>
    );

    expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
  });

  it('displays active alerts correctly', () => {
    const testStore = createTestStore(mockAlerts);

    render(
      <Provider store={testStore}>
        <AlertPanel />
      </Provider>
    );

    expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
    expect(screen.getByText('Memory usage critical')).toBeInTheDocument();
  });

  it('shows correct severity indicators', () => {
    const testStore = createTestStore(mockAlerts);

    render(
      <Provider store={testStore}>
        <AlertPanel />
      </Provider>
    );

    const warningAlert = screen
      .getByText('High CPU usage detected')
      .closest('.alert-item');
    const criticalAlert = screen
      .getByText('Memory usage critical')
      .closest('.alert-item');

    expect(warningAlert).toHaveClass('warning');
    expect(criticalAlert).toHaveClass('critical');
  });

  it('displays unread count correctly', () => {
    const testStore = createTestStore(mockAlerts);

    render(
      <Provider store={testStore}>
        <AlertPanel />
      </Provider>
    );

    expect(screen.getByText('1')).toBeInTheDocument(); // Unread count badge
  });

  it('shows loading state', () => {
    const testStore = configureStore({
      reducer: {
        alerts: alertsReducer,
      },
      preloadedState: {
        alerts: {
          active: [],
          history: [],
          unreadCount: 0,
          loading: true,
          error: null,
          lastUpdated: null,
        },
      },
    });

    render(
      <Provider store={testStore}>
        <AlertPanel />
      </Provider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
