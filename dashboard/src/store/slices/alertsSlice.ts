import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { Alert } from '../../types';
import { apiClient, type AlertFilters } from '../../services/api';

interface AlertsState {
  active: Alert[];
  history: Alert[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: AlertsState = {
  active: [],
  history: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks for alert operations
export const fetchActiveAlerts = createAsyncThunk(
  'alerts/fetchActiveAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const alerts = await apiClient.getAlerts();
      return alerts;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch active alerts'
      );
    }
  }
);

export const fetchAlertHistory = createAsyncThunk(
  'alerts/fetchAlertHistory',
  async (filters: AlertFilters, { rejectWithValue }) => {
    try {
      const alerts = await apiClient.getAlertHistory(filters);
      return alerts;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch alert history'
      );
    }
  }
);

export const refreshAlerts = createAsyncThunk(
  'alerts/refreshAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const [activeAlerts, historyAlerts] = await Promise.all([
        apiClient.getAlerts(),
        apiClient.getAlertHistory({}),
      ]);
      return { active: activeAlerts, history: historyAlerts };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to refresh alerts'
      );
    }
  }
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNewAlert: (state, action: PayloadAction<Alert>) => {
      const newAlert = action.payload;

      // Add to active alerts if not resolved
      if (!newAlert.acknowledged && !newAlert.resolvedAt) {
        state.active.unshift(newAlert);
        state.unreadCount += 1;
      }

      // Add to history
      state.history.unshift(newAlert);

      // Sort by triggered date (newest first)
      state.active.sort(
        (a, b) =>
          new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      );
      state.history.sort(
        (a, b) =>
          new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      );
    },
    acknowledgeAlert: (state, action: PayloadAction<string>) => {
      const alertId = action.payload;

      // Update in active alerts
      const activeAlert = state.active.find((alert) => alert.id === alertId);
      if (activeAlert) {
        activeAlert.acknowledged = true;
        // Remove from active alerts
        state.active = state.active.filter((alert) => alert.id !== alertId);
      }

      // Update in history
      const historyAlert = state.history.find((alert) => alert.id === alertId);
      if (historyAlert) {
        historyAlert.acknowledged = true;
      }

      // Decrease unread count
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    resolveAlert: (
      state,
      action: PayloadAction<{ alertId: string; resolvedAt: string }>
    ) => {
      const { alertId, resolvedAt } = action.payload;

      // Update in active alerts
      const activeAlert = state.active.find((alert) => alert.id === alertId);
      if (activeAlert) {
        activeAlert.resolvedAt = resolvedAt;
        activeAlert.acknowledged = true;
        // Remove from active alerts
        state.active = state.active.filter((alert) => alert.id !== alertId);
      }

      // Update in history
      const historyAlert = state.history.find((alert) => alert.id === alertId);
      if (historyAlert) {
        historyAlert.resolvedAt = resolvedAt;
        historyAlert.acknowledged = true;
      }

      // Decrease unread count
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    markAllAlertsAsRead: (state) => {
      state.unreadCount = 0;
      state.active.forEach((alert) => {
        alert.acknowledged = true;
      });
    },
    clearAlerts: (state) => {
      state.active = [];
      state.history = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch active alerts cases
      .addCase(fetchActiveAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.active = action.payload.filter(
          (alert) => !alert.acknowledged && !alert.resolvedAt
        );
        state.unreadCount = state.active.length;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchActiveAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch alert history cases
      .addCase(fetchAlertHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
        state.error = null;
      })
      .addCase(fetchAlertHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Refresh alerts cases
      .addCase(refreshAlerts.pending, (state) => {
        // Don't set loading for background refresh
        state.error = null;
      })
      .addCase(refreshAlerts.fulfilled, (state, action) => {
        state.active = action.payload.active.filter(
          (alert) => !alert.acknowledged && !alert.resolvedAt
        );
        state.history = action.payload.history;
        state.unreadCount = state.active.length;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(refreshAlerts.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  addNewAlert,
  acknowledgeAlert,
  resolveAlert,
  markAllAlertsAsRead,
  clearAlerts,
} = alertsSlice.actions;

export default alertsSlice.reducer;
