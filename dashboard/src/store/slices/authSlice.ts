import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { User, LoginCredentials } from '../../types';
import { apiClient } from '../../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  tokenExpiry: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('authToken'),
  isAuthenticated: false,
  loading: false,
  error: null,
  tokenExpiry: localStorage.getItem('tokenExpiry'),
};

// Async thunks for authentication actions
export const checkAuthState = createAsyncThunk(
  'auth/checkAuthState',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      const userStr = localStorage.getItem('user');

      if (token && tokenExpiry) {
        const expiryDate = new Date(tokenExpiry);
        const now = new Date();

        if (expiryDate > now) {
          let user = null;
          if (userStr) {
            try {
              user = JSON.parse(userStr);
            } catch {
              localStorage.removeItem('user');
            }
          }

          return {
            token,
            tokenExpiry,
            user,
            isAuthenticated: true,
          };
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('tokenExpiry');
          localStorage.removeItem('user');
          throw new Error('Token expired');
        }
      } else {
        throw new Error('No authentication token found');
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Authentication check failed'
      );
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const authToken = await apiClient.login(credentials);

      // Store token in localStorage
      localStorage.setItem('authToken', authToken.token);
      localStorage.setItem('tokenExpiry', authToken.expiresAt);

      return authToken;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Login failed'
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.logout();

      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('user');

      return null;
    } catch (error) {
      // Even if logout fails on server, clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('user');

      return rejectWithValue(
        error instanceof Error ? error.message : 'Logout failed'
      );
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const authToken = await apiClient.refreshToken();

      // Update localStorage
      localStorage.setItem('authToken', authToken.token);
      localStorage.setItem('tokenExpiry', authToken.expiresAt);

      return authToken;
    } catch (error) {
      // Clear invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('user');

      return rejectWithValue(
        error instanceof Error ? error.message : 'Token refresh failed'
      );
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await apiClient.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch user'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },

  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.tokenExpiry = action.payload.expiresAt;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        state.tokenExpiry = null;
        state.user = null;
      })
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.tokenExpiry = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        // Still clear auth state even if server logout failed
        state.user = null;
        state.token = null;
        state.tokenExpiry = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Refresh token cases
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.tokenExpiry = action.payload.expiresAt;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        state.tokenExpiry = null;
        state.user = null;
      })
      // Fetch current user cases
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Check auth state cases
      .addCase(checkAuthState.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthState.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.tokenExpiry = action.payload.tokenExpiry;
        state.user = action.payload.user;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.error = null;
      })
      .addCase(checkAuthState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        state.tokenExpiry = null;
        state.user = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
