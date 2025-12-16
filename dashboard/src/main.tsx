import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { registerServiceWorker, promptForUpdate } from './utils/serviceWorker';
import { initializeAccessibility } from './utils/accessibility';
import { performanceMonitor } from './utils/performance';
import './index.css';
import App from './App.tsx';

// Initialize performance monitoring
performanceMonitor.mark('app-start');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
  initializeAccessibility();
  performanceMonitor.mark('accessibility-initialized');
});

// Register service worker for offline functionality
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => {
      console.log('App is ready for offline use');
      performanceMonitor.mark('service-worker-ready');
    },
    onUpdate: (registration) => {
      console.log('New app version available');
      promptForUpdate(registration);
    },
    onOfflineReady: () => {
      console.log('App is ready to work offline');
    },
    onError: (error) => {
      console.error('Service worker registration failed:', error);
    },
  });
}

// Mark app initialization complete
window.addEventListener('load', () => {
  performanceMonitor.mark('app-loaded');
  performanceMonitor.measure('app-initialization', 'app-start', 'app-loaded');
});
