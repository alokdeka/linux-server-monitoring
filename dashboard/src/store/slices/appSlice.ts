import { createSlice } from '@reduxjs/toolkit';

interface AppState {
  initialized: boolean;
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  refreshInterval: number;
}

const initialState: AppState = {
  initialized: true,
  sidebarOpen: true,
  theme: 'light',
  refreshInterval: 30000, // 30 seconds
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setInitialized: (state, action) => {
      state.initialized = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setRefreshInterval: (state, action) => {
      state.refreshInterval = action.payload;
    },
  },
});

export const {
  setInitialized,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setRefreshInterval,
} = appSlice.actions;
export default appSlice.reducer;
