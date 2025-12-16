/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      // Enable tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
              return 'redux-vendor';
            }
            if (id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            if (id.includes('styled-components')) {
              return 'styled-vendor';
            }
            if (id.includes('fast-check')) {
              return 'testing-vendor';
            }
            return 'vendor';
          }

          // Feature-based chunks
          if (id.includes('/pages/')) {
            return 'pages';
          }
          if (id.includes('/components/servers/')) {
            return 'servers';
          }
          if (id.includes('/components/alerts/')) {
            return 'alerts';
          }
          if (id.includes('/components/auth/')) {
            return 'auth';
          }
          if (id.includes('/store/')) {
            return 'store';
          }
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          if (!assetInfo.names || assetInfo.names.length === 0) {
            return `assets/[name]-[hash][extname]`;
          }
          const name = assetInfo.names[0];
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  // Preview server configuration
  preview: {
    port: 3000,
    host: true,
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },

  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
