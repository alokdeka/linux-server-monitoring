import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { Server } from '../../types';
import { apiClient, type ServerRegistrationData } from '../../services/api';

interface ServersState {
  list: Server[];
  selectedServer: Server | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: ServersState = {
  list: [],
  selectedServer: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks for server operations
export const fetchServers = createAsyncThunk(
  'servers/fetchServers',
  async (_, { rejectWithValue }) => {
    try {
      const servers = await apiClient.getServers();
      return servers;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch servers'
      );
    }
  }
);

export const registerServer = createAsyncThunk(
  'servers/registerServer',
  async (serverData: ServerRegistrationData, { rejectWithValue }) => {
    try {
      const result = await apiClient.registerServer(serverData);
      // Refresh servers list after registration
      const servers = await apiClient.getServers();
      return { apiKey: result.apiKey, servers };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to register server'
      );
    }
  }
);

export const refreshServerStatus = createAsyncThunk(
  'servers/refreshServerStatus',
  async (_, { rejectWithValue }) => {
    try {
      const servers = await apiClient.getServers();
      return servers;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : 'Failed to refresh server status'
      );
    }
  }
);

const serversSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedServer: (state, action: PayloadAction<Server | null>) => {
      state.selectedServer = action.payload;
    },
    updateServerStatus: (
      state,
      action: PayloadAction<{
        serverId: string;
        status: 'online' | 'offline' | 'warning';
      }>
    ) => {
      const server = state.list.find((s) => s.id === action.payload.serverId);
      if (server) {
        server.status = action.payload.status;
        server.lastSeen = new Date().toISOString();
      }
    },
    updateServerMetrics: (
      state,
      action: PayloadAction<{ serverId: string; metrics: any }>
    ) => {
      const server = state.list.find((s) => s.id === action.payload.serverId);
      if (server) {
        server.currentMetrics = action.payload.metrics;
        server.lastSeen = new Date().toISOString();
        server.status = 'online';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch servers cases
      .addCase(fetchServers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchServers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Register server cases
      .addCase(registerServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerServer.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.servers;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(registerServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Refresh server status cases
      .addCase(refreshServerStatus.pending, (state) => {
        // Don't set loading for background refresh
        state.error = null;
      })
      .addCase(refreshServerStatus.fulfilled, (state, action) => {
        state.list = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(refreshServerStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setSelectedServer,
  updateServerStatus,
  updateServerMetrics,
} = serversSlice.actions;

export default serversSlice.reducer;
