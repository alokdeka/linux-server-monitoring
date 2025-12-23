import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { DashboardSettings } from '../../types';
import { apiClient } from '../../services/api';

interface AppState {
  initialized: boolean;
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  refreshInterval: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastActivity: string | null;
  notifications: {
    enabled: boolean;
    permission: NotificationPermission;
  };
  settings: DashboardSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;
}

const initialState: AppState = {
  initialized: true,
  sidebarOpen: true,
  theme: 'light',
  refreshInterval: 300000, // 5 minutes for development testing
  connectionStatus: 'connected',
  lastActivity: null,
  notifications: {
    enabled: false,
    permission: 'default',
  },
  settings: null,
  settingsLoading: false,
  settingsError: null,
};

// Async thunks for settings management
export const loadSettings = createAsyncThunk(
  'app/loadSettings',
  async (_, { rejectWithValue }) => {
    try {
      const settings = await apiClient.getSettings();
      return settings;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to load settings'
      );
    }
  }
);

export const saveSettings = createAsyncThunk(
  'app/saveSettings',
  async (settings: DashboardSettings, { rejectWithValue }) => {
    try {
      await apiClient.updateSettings(settings);
      return settings;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to save settings'
      );
    }
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      if (state.settings) {
        state.settings.display.theme = action.payload;
      }
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
      if (state.settings) {
        state.settings.refreshInterval = action.payload;
      }
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<'connected' | 'disconnected' | 'reconnecting'>
    ) => {
      state.connectionStatus = action.payload;
    },
    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
    setNotificationPermission: (
      state,
      action: PayloadAction<NotificationPermission>
    ) => {
      state.notifications.permission = action.payload;
      state.notifications.enabled = action.payload === 'granted';
    },
    toggleNotifications: (state) => {
      if (state.notifications.permission === 'granted') {
        state.notifications.enabled = !state.notifications.enabled;
      }
    },
    clearSettingsError: (state) => {
      state.settingsError = null;
    },
    resetToDefaults: (state) => {
      state.theme = 'light';
      state.refreshInterval = 30000;
      state.sidebarOpen = true;
      state.settings = {
        refreshInterval: 300000, // 5 minutes for development testing
        alertThresholds: { cpu: 80, memory: 85, disk: 90 },
        notifications: { enabled: true, webhookUrls: [] },
        display: { theme: 'light', compactMode: false, chartsEnabled: true },
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Load settings cases
      .addCase(loadSettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload;
        state.theme = action.payload.display.theme;
        state.refreshInterval = action.payload.refreshInterval;
        state.settingsError = null;
      })
      .addCase(loadSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.payload as string;
      })
      // Save settings cases
      .addCase(saveSettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload;
        state.theme = action.payload.display.theme;
        state.refreshInterval = action.payload.refreshInterval;
        state.settingsError = null;
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.payload as string;
      });
  },
});

export const {
  setInitialized,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setRefreshInterval,
  setConnectionStatus,
  updateLastActivity,
  setNotificationPermission,
  toggleNotifications,
  clearSettingsError,
  resetToDefaults,
} = appSlice.actions;

export default appSlice.reducer;
