// IMPORTANT: bump SW_VERSION whenever you bump APP_VERSION in script.js.
// The two strings must stay in sync — there is no shared constant because
// sw.js runs in a separate JS context from script.js (no importScripts here).
const SW_VERSION = "20260529.2";
const CACHE_NAME = `fcc-cache-${SW_VERSION}`;

// Use absolute paths tied specifically to your GH Pages repository
const ASSETS = [
  '/fire-buckets/',
  '/fire-buckets/index.html',
  '/fire-buckets/engine.js',
  '/fire-buckets/ui.js',
  '/fire-buckets/today.js',
  '/fire-buckets/plan.js',
  '/fire-buckets/freedom.js',
  '/fire-buckets/stress.js',
  '/fire-buckets/history.js',
  '/fire-buckets/script.js',
  '/fire-buckets/manifest.json',
  '/fire-buckets/icon-192.png',
  '/fire-buckets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// CDN origins serving pinned-version resources (React, Babel, fonts).
// These use cache-first: serve from cache; only fetch if not yet cached.
const CDN_ORIGINS = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

function isCdn(url) {
  return CDN_ORIGINS.some(o => url.hostname.includes(o));
}

// Two-tier caching strategy:
//   CDN resources  — cache-first (pinned versions never change)
//   App files      — network-first (always try fresh, fall back to cache if offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (isCdn(url)) {
    // Cache-first: serve instantly from cache; fetch and store on first miss.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for app files: always try to fetch fresh; fall back to cache if offline.
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() =>
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/fire-buckets/index.html');
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      })
    )
  );
});