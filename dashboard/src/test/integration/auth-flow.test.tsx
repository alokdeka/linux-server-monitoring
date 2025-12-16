import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import appReducer from '../../store/slices/appSlice';
import authReducer from '../../store/slices/authSlice';
import serversReducer from '../../store/slices/serversSlice';
import metricsReducer from '../../store/slices/metricsSlice';
import alertsReducer from '../../store/slices/alertsSlice';
import App from '../../App';

// Mock API calls
vi.mock('../../services/api', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    login: vi.fn().mockResolvedValue({
      access_token: 'test-token',
      token_type: 'bearer',
      expires_in: 3600,
    }),
    getServers: vi.fn().mockResolvedValue([]),
    getAlerts: vi.fn().mockResolvedValue([]),
    setAuthToken: vi.fn(),
  })),
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      app: appReducer,
      auth: authReducer,
      servers: serversReducer,
      metrics: metricsReducer,
      alerts: alertsReducer,
    },
  });
};

const renderApp = (store: any) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );
};

describe('Authentication Flow Integration', () => {
  it('**Integration Test: Complete authentication workflow**', async () => {
    const testStore = createTestStore();

    renderApp(testStore);

    // Should show login form initially
    expect(screen.getByText('Server Monitor Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Fill in login form
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Should redirect to dashboard after successful login
    await waitFor(
      () => {
        expect(
          screen.queryByText('Server Monitor Dashboard')
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify authentication state
    const state = testStore.getState();
    expect(state.auth.isAuthenticated).toBe(true);
    expect(state.auth.token).toBe('test-token');
  });

  it('**Integration Test: Authentication error handling**', async () => {
    // Mock failed login
    const mockApiClient = {
      login: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
      setAuthToken: vi.fn(),
    };

    vi.doMock('../../services/api', () => ({
      ApiClient: vi.fn().mockImplementation(() => mockApiClient),
    }));

    const testStore = createTestStore();
    renderApp(testStore);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Should remain on login page
    expect(screen.getByText('Server Monitor Dashboard')).toBeInTheDocument();

    // Verify authentication state remains false
    const state = testStore.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.token).toBeNull();
  });

  it('**Integration Test: Session expiry and logout**', async () => {
    const testStore = createTestStore();

    // Set initial authenticated state
    testStore.dispatch({
      type: 'auth/loginSuccess',
      payload: {
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
        token: 'test-token',
        tokenExpiry: new Date(Date.now() + 3600000).toISOString(),
      },
    });

    renderApp(testStore);

    // Should show dashboard (not login form)
    expect(
      screen.queryByText('Server Monitor Dashboard')
    ).not.toBeInTheDocument();

    // Simulate logout
    testStore.dispatch({ type: 'auth/logout' });

    // Should redirect back to login
    await waitFor(() => {
      expect(screen.getByText('Server Monitor Dashboard')).toBeInTheDocument();
    });

    // Verify authentication state is cleared
    const state = testStore.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.token).toBeNull();
    expect(state.auth.user).toBeNull();
  });
});
