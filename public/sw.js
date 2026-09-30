/* LabBridge service worker.
 * - 3D models and build assets: cache-first (they're versioned/immutable), so the lab loads instantly after the first visit.
 * - Pages and the API: network-first, falling back to cache for pages when offline. The API is never cached.
 */
const VERSION = 'labbridge-v2';
const MODELS = 'labbridge-models-v2';
const MAX_ASSETS = 150; // build files from old deploys are trimmed, so the cache can't grow forever

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

  // 3D models: serve instantly from cache, refresh in the background (stale-while-revalidate), so an
  // updated model reaches installed users on their next visit
  if (url.pathname.startsWith('/models/') && url.pathname !== '/models/manifest.json') {
    event.respondWith(
      caches.open(MODELS).then(async (cache) => {
        const hit = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        if (hit) {
          event.waitUntil(refresh);
          return hit;
        }
        return refresh;
      })
    );
    return;
  }

  // Build assets are content-hashed (immutable): cache-first, oldest trimmed
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          const keys = await cache.keys();
          if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((k) => cache.delete(k)));
        }
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
