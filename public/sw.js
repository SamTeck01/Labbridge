/* LabBridge service worker.
 * - 3D models and build assets: cache-first (they're versioned/immutable), so the lab loads instantly after the first visit.
 * - Pages and the API: network-first, falling back to cache for pages when offline. The API is never cached.
 */
const VERSION = 'labbridge-v1';
const MODELS = 'labbridge-models-v1';

self.addEventListener('install', (event) => {
  // Warm the model cache in the background using the model manifest
  event.waitUntil(
    caches.open(MODELS).then(async (cache) => {
      try {
        const res = await fetch('/models/manifest.json', { cache: 'no-cache' });
        const { models = [] } = await res.json();
        await cache.addAll(['/models/manifest.json', ...models.map((m) => `/models/${m}.glb`)]);
      } catch (e) {
        /* offline during install: models get cached on first use instead */
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![VERSION, MODELS].includes(k)).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  const cacheFirst = url.pathname.startsWith('/models/') || url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
  if (cacheFirst && url.pathname !== '/models/manifest.json') {
    const bucket = url.pathname.startsWith('/models/') ? MODELS : VERSION;
    event.respondWith(
      caches.open(bucket).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Network-first for pages and the model manifest (so new models are picked up)
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || url.pathname === '/models/manifest.json')) {
          const copy = res.clone();
          caches.open(url.pathname === '/models/manifest.json' ? MODELS : VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
