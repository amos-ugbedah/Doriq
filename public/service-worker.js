// service-worker.js (PRODUCTION SAFE VERSION)

const CACHE_NAME = 'doriq-v1';

// Only cache static assets (NOT API calls)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ===============================
// INSTALL
// ===============================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ===============================
// ACTIVATE
// ===============================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ===============================
// FETCH (CRITICAL FIX HERE)
// ===============================
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // ❌ DO NOT CACHE API REQUESTS - Let them go directly to network
  if (
    requestUrl.includes('/api/') ||
    requestUrl.includes('firebase') ||
    requestUrl.includes('auth') ||
    requestUrl.includes('localhost') ||
    requestUrl.includes('hf.space') ||
    requestUrl.startsWith('chrome-extension')
  ) {
    // Bypass service worker completely for API calls
    return fetch(event.request);
  }

  // Only handle GET requests for static assets
  if (event.request.method !== 'GET') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Don't cache non-successful responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }

          // Cache the successful response for future
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // Fallback for offline navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});