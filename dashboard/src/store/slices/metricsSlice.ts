import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { ServerMetrics } from '../../types';
import { apiClient } from '../../services/api';

interface MetricsState {
  current: Record<string, ServerMetrics>;
  historical: Record<string, ServerMetrics[]>;
  loading: boolean;
  error: string | null;
}

const initialState: MetricsState = {
  current: {},
  historical: {},
  loading: false,
  error: null,
};

// Async thunks for metrics operations
export const fetchServerMetrics = createAsyncThunk(
  'metrics/fetchServerMetrics',
  async (
    { serverId, timeRange }: { serverId: string; timeRange: string },
    { rejectWithValue }
  ) => {
    try {
      const metrics = await apiClient.getServerMetrics(serverId, timeRange);
      return { serverId, timeRange, metrics };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : 'Failed to fetch server metrics'
      );
    }
  }
);

export const fetchCurrentMetrics = createAsyncThunk(
  'metrics/fetchCurrentMetrics',
  async (serverIds: string[], { rejectWithValue }) => {
    try {
      const metricsPromises = serverIds.map(async (serverId) => {
        try {
          const metrics = await apiClient.getServerMetrics(serverId, '1h');
          return { serverId, metrics: metrics[metrics.length - 1] }; // Get latest metrics
        } catch (error) {
          // Silently handle servers without metrics data
          if (
            error instanceof Error &&
            error.message.includes('No metrics data available')
          ) {
            return { serverId, metrics: null };
          }
          throw error; // Re-throw unexpected errors
        }
      });

      const results = await Promise.allSettled(metricsPromises);
      const currentMetrics: Record<string, ServerMetrics> = {};

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.metrics) {
          currentMetrics[serverIds[index]] = result.value.metrics;
        }
      });

      return currentMetrics;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : 'Failed to fetch current metrics'
      );
    }
  }
);

const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateCurrentMetrics: (
      state,
      action: PayloadAction<{ serverId: string; metrics: ServerMetrics }>
    ) => {
      const { serverId, metrics } = action.payload;
      state.current[serverId] = metrics;
    },
    clearMetricsForServer: (state, action: PayloadAction<string>) => {
      const serverId = action.payload;
      delete state.current[serverId];
      delete state.historical[serverId];
    },
    clearAllMetrics: (state) => {
      state.current = {};
      state.historical = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch server metrics cases
      .addCase(fetchServerMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServerMetrics.fulfilled, (state, action) => {
        state.loading = false;
        const { serverId, metrics } = action.payload;

        // Store historical data by serverId
        state.historical[serverId] = metrics;

        // Update current metrics with the latest data point
        if (metrics.length > 0) {
          state.current[serverId] = metrics[metrics.length - 1];
        }

        state.error = null;
      })
      .addCase(fetchServerMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch current metrics cases
      .addCase(fetchCurrentMetrics.pending, (state) => {
        // Don't set loading for background current metrics refresh
        state.error = null;
      })
      .addCase(fetchCurrentMetrics.fulfilled, (state, action) => {
        state.current = { ...state.current, ...action.payload };
        state.error = null;
      })
      .addCase(fetchCurrentMetrics.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  updateCurrentMetrics,
  clearMetricsForServer,
  clearAllMetrics,
} = metricsSlice.actions;

export default metricsSlice.reducer;
