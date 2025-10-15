const VERSION = 'v11';
const STATIC_CACHE = `glowup-static-${VERSION}`;
const DYNAMIC_CACHE = `glowup-dynamic-${VERSION}`;

const BACKEND_URL =
  self.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://my-pwa-production-e81a.up.railway.app';

const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/logo-glowup.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install', VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate', VERSION);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, DYNAMIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    if (req.destination === 'script' || req.destination === 'style') {
      event.respondWith(staleWhileRevalidate(req));
      return;
    }
    if (req.destination === 'image' || req.destination === 'font') {
      event.respondWith(cacheFirst(req));
      return;
    }
  }

  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return Response.error();
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => { cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return cached || network || fetch(request);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('glowup-db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const os = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        os.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPending() {
  const db = await openDB();
  const tx = db.transaction('entries', 'readonly');
  const store = tx.objectStore('entries');
  const all = await new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
  db.close();
  return all.filter((it) => it && it.synced === false);
}

async function markSynced(ids) {
  if (!ids.length) return;
  const db = await openDB();
  const tx = db.transaction('entries', 'readwrite');
  const store = tx.objectStore('entries');
  await Promise.all(
    ids.map(
      (id) =>
        new Promise((res, rej) => {
          const g = store.get(id);
          g.onsuccess = () => {
            const obj = g.result;
            if (!obj) return res();
            obj.synced = true;
            const p = store.put(obj);
            p.onsuccess = () => res();
            p.onerror = () => rej(p.error);
          };
          g.onerror = () => rej(g.error);
        })
    )
  );
  db.close();
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entries') {
    console.log('[SW] sync-entries fired');
    event.waitUntil(syncPendingEntries());
  }
});

self.addEventListener('message', (e) => {
  if (e.data === 'TRY_SYNC') {
    self.registration.sync?.register('sync-entries');
  }
});

async function syncPendingEntries() {
  const pending = await getPending();
  if (!pending.length) return;

  const okIds = [];
  for (const item of pending) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [ { id: item.id, text: item.text, createdAt: item.createdAt } ] }),
      });
      if (resp.ok) {
        okIds.push(item.id);
      }
    } catch (err) {

    }
  }

  if (okIds.length) {
    await markSynced(okIds);
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientsArr.forEach((c) => c.postMessage({ type: 'SYNC_DONE', ids: okIds }));
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  const title = data.title || 'GlowUp';
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.openWindow(url));
});
