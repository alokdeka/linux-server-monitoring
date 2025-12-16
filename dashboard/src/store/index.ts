import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import authReducer from './slices/authSlice';
import serversReducer from './slices/serversSlice';
import metricsReducer from './slices/metricsSlice';
import alertsReducer from './slices/alertsSlice';
import { websocketMiddleware } from './middleware/websocketMiddleware';

const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    servers: serversReducer,
    metrics: metricsReducer,
    alerts: alertsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(websocketMiddleware),
});

export { store };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
