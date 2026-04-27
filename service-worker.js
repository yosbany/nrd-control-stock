// Service Worker for PWA
const CACHE_NAME = 'nrd-control-stock-v1-' + Date.now();
const getBasePath = () => {
  const path = self.location.pathname;
  return path.substring(0, path.lastIndexOf('/') + 1);
};
const BASE_PATH = getBasePath();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('nrd-control-stock-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  if (event.request.url.includes('service-worker.js')) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.url.includes('firebasejs') || event.request.url.includes('gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.url.includes('.html') || event.request.url.includes('.js') || event.request.url.includes('.css')) {
    if (event.request.url.includes('?v=') || event.request.url.includes('&v=')) {
      event.respondWith(
        fetch(event.request)
          .then((response) => response)
          .catch(() => {
            return caches.match(event.request.url.split('?')[0]).then((c) => {
              if (c) return c;
              if (event.request.mode === 'navigate') {
                return caches.match(BASE_PATH + 'index.html');
              }
            });
          })
      );
      return;
    }
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => response)
        .catch(() => {
          return caches.match(event.request).then((c) => {
            if (c) return c;
            if (event.request.mode === 'navigate') {
              return caches.match(BASE_PATH + 'index.html');
            }
          });
        })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const r = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, r)).catch(() => {});
        }
        return response;
      });
    })
  );
});
