import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import LoginForm from './LoginForm';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        tokenExpiry: null,
      },
    },
  });
};

describe('LoginForm', () => {
  it('renders login form elements', () => {
    const testStore = createTestStore();

    render(
      <Provider store={testStore}>
        <LoginForm />
      </Provider>
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const testStore = createTestStore();

    render(
      <Provider store={testStore}>
        <LoginForm />
      </Provider>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const testStore = createTestStore();

    render(
      <Provider store={testStore}>
        <LoginForm />
      </Provider>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Verify form submission (would need to mock API call)
    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  it('disables submit button when loading', () => {
    const testStore = configureStore({
      reducer: {
        auth: authReducer,
      },
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

    render(
      <Provider store={testStore}>
        <LoginForm />
      </Provider>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
  });
});
