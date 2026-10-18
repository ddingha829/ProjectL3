const CACHE = 'l2-test-shell-v7';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/', '/icons/icon-192.png', '/icons/icon-512.png', '/fonts/sebang-gothic-regular.woff2', '/fonts/sebang-gothic-bold.woff2', '/fonts/caveat-wordmark.ttf', '/fonts/sebang-gothic-italic-regular.woff2', '/fonts/sebang-gothic-italic-bold.woff2'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('l2-test-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'L2_CACHE_ASSETS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = event.data.urls.filter(value => { try { const url = new URL(value); return url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/codecs/') || url.pathname.startsWith('/fonts/')); } catch { return false; } });
    const results = await Promise.allSettled(urls.map(url => cache.add(url)));
    if (results.every(result => result.status === 'fulfilled')) event.source?.postMessage({ type: 'L2_CACHE_READY' });
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/share/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(response => { if (response.ok && url.pathname === '/') { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('/', copy))); } return response; }).catch(async () => (await caches.match('/')) || Response.error()));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/codecs/') || /\.(png|jpg|jpeg|webp|svg|woff2|ttf)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match(req)) || Response.error())
    );
  }
});
