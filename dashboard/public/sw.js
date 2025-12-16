// Service Worker for offline functionality and caching
const CACHE_NAME = 'dashboard-v1';
const STATIC_CACHE_NAME = 'dashboard-static-v1';
const DYNAMIC_CACHE_NAME = 'dashboard-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // Add other static assets as needed
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/servers$/,
  /^\/api\/servers\/[^\/]+$/,
  /^\/api\/alerts$/,
  /^\/api\/settings$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME
            ) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'document') {
    // HTML documents - network first, cache fallback
    event.respondWith(networkFirstStrategy(request, STATIC_CACHE_NAME));
  } else if (isStaticAsset(request)) {
    // Static assets - cache first, network fallback
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
  } else if (isApiRequest(request)) {
    // API requests - network first with limited cache
    event.respondWith(
      networkFirstWithTimeoutStrategy(request, DYNAMIC_CACHE_NAME)
    );
  } else {
    // Other requests - network first
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
  }
});

// Strategy: Network first, cache fallback
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for HTML documents
    if (request.destination === 'document') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Offline - Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>You're offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
        </html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    throw error;
  }
}

// Strategy: Cache first, network fallback
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch from network', error);
    throw error;
  }
}

// Strategy: Network first with timeout for API requests
async function networkFirstWithTimeoutStrategy(
  request,
  cacheName,
  timeout = 3000
) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const networkResponse = await fetch(request, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Only cache GET requests for API data
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    console.log(
      'Service Worker: API request failed or timed out, trying cache'
    );
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Add a header to indicate this is cached data
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }

    throw error;
  }
}

// Helper functions
function isStaticAsset(request) {
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.url.includes('/assets/')
  );
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith('/api/') ||
    API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))
  );
}

// Background sync for failed requests (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      console.log('Service Worker: Background sync triggered');
      event.waitUntil(handleBackgroundSync());
    }
  });
}

async function handleBackgroundSync() {
  // Handle any queued requests when connection is restored
  console.log('Service Worker: Handling background sync');
  // Implementation would depend on specific requirements
}

// Push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('Service Worker: Push notification received', data);

    const options = {
      body: data.body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      data: data.data,
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  event.notification.close();

  if (event.action) {
    // Handle specific action
    console.log('Service Worker: Notification action clicked', event.action);
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow('/'));
  }
});
