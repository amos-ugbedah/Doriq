const CACHE_NAME = "doriq-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

// ==============================
// INSTALL
// ==============================
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        console.error("[SW] Cache install failed:", err);
      }
    })
  );

  self.skipWaiting();
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// ==============================
// FETCH
// ==============================
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") {
    return;
  }

  const url = new URL(req.url);

  // Never cache API requests
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("hf.space") ||
    url.hostname.includes("localhost")
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200
          ) {
            return networkResponse;
          }

          const clone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });

          return networkResponse;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
    })
  );
});