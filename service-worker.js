/* Quote Service Worker (safe) */
const SW_VERSION = '20260209-1';
const CACHE_NAME = `quote-cache-${SW_VERSION}`;

// 최소 캐시(파일명 다르면 줄여도 됨)
const CORE = [
  './',
  './index.html',
  './app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    } catch (e) {
      console.warn('[SW] install cache failed', e);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => k.startsWith('quote-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      );
    } catch (e) {
      console.warn('[SW] activate cleanup failed', e);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 네비게이션은 절대 망가뜨리지 않기
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return fetch(req);
    }
  })());
});
