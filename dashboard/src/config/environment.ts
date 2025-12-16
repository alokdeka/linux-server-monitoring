// Environment configuration utility for runtime environment variables
// This handles both build-time Vite environment variables and runtime Docker environment variables

interface EnvironmentConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  appTitle: string;
  refreshInterval: number;
  enableDebug: boolean;
}

// Runtime environment variables injected by Docker
declare global {
  interface Window {
    ENV?: {
      VITE_API_BASE_URL?: string;
      VITE_WS_BASE_URL?: string;
      VITE_APP_TITLE?: string;
      VITE_REFRESH_INTERVAL?: string;
      VITE_ENABLE_DEBUG?: string;
    };
  }
}

// Get environment variable with fallback
function getEnvVar(key: string, defaultValue: string): string {
  // First try runtime environment (Docker)
  if (window.ENV && window.ENV[key as keyof typeof window.ENV]) {
    return window.ENV[key as keyof typeof window.ENV] as string;
  }

  // Then try build-time environment (Vite)
  const viteValue = import.meta.env[key];
  if (viteValue !== undefined) {
    return viteValue;
  }

  // Finally use default
  return defaultValue;
}

// Create environment configuration
export const environment: EnvironmentConfig = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8000'),
  wsBaseUrl: getEnvVar('VITE_WS_BASE_URL', 'ws://localhost:8000'),
  appTitle: getEnvVar('VITE_APP_TITLE', 'Server Monitoring Dashboard'),
  refreshInterval: parseInt(getEnvVar('VITE_REFRESH_INTERVAL', '30000'), 10),
  enableDebug: getEnvVar('VITE_ENABLE_DEBUG', 'false') === 'true',
};

// Validate configuration
if (environment.refreshInterval < 1000) {
  console.warn('Refresh interval too low, setting to minimum 1000ms');
  environment.refreshInterval = 1000;
}

if (environment.enableDebug) {
  console.log('Environment configuration:', environment);
}

export default environment;
