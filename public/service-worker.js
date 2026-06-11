const CACHE_NAME = "doriq-v3";

// DO NOT manually cache index.html
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico"
];

// INSTALL
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");

  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// FETCH — NETWORK FIRST (CRITICAL FIX)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // NEVER CACHE API OR EXTERNAL
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("hf.space")
  ) {
    return;
  }

  event.respondWith(
    fetch(req).catch(() => {
      if (req.mode === "navigate") {
        return fetch("/index.html");
      }
    })
  );
});