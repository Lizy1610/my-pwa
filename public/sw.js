const VERSION = 'v4';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const APP_SHELL = [
  '/manifest.json',
  '/logo-glowup.png',
  '/offline.html'
];

// ===== Instalación: precache del App Shell =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ===== Activación: limpia cachés viejas =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Utilidades
const isSameOrigin = (url) => new URL(url, self.location.origin).origin === self.location.origin;

// ===== Fetch: Estrategias por tipo =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(request);
          return cached || caches.match('/offline.html');
        }
      })()
    );
    return;
  }

  if (isSameOrigin(request.url)) {
    if (request.destination === 'script' || request.destination === 'style') {
      event.respondWith(staleWhileRevalidate(request));
      return;
    }
    if (request.destination === 'image' || request.destination === 'font') {
      event.respondWith(cacheFirst(request));
      return;
    }
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// ==== Estrategias ====
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, resp.clone());
    return resp;
  } catch (err) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((resp) => {
      cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => null);
  return cached || networkPromise || fetch(request);
}

// ===== Actualización inmediata bajo demanda (opcional) =====
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
