const CACHE_NAME = 'quote-cache-v20260208-1';// 수정할 때마다 꼭 변경

const SCOPE_URL = self.registration.scope;          // https://.../boxqoute/
const BASE = new URL(SCOPE_URL).pathname;           // /boxqoute/
const U = (p) => new URL(p, SCOPE_URL).toString();  // scope 기준 절대 URL

const CORE = [
  U('./'),
  U('index.html'),
  U('styles.css'),
  U('app.js'),
  U('manifest.webmanifest'),
  U('assets/icons/icon-192.png'),
  U('assets/icons/icon-512.png')
];

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 페이지 진입(HTML)은 network-first: 구버전 고착으로 인한 백지/먹통 방지
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        await cache.put(U('index.html'), fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(U('index.html')))
          || (await cache.match(U('./')))
          || Response.error();
      }
    })());
    return;
  }

  // 정적 자원은 cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    const res = await fetch(req);
    if (res.ok) await cache.put(req, res.clone());
    return res;
  })());
});

