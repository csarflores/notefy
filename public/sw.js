// Harold service worker — soporte offline básico.
// Solo se cachean assets estáticos; las páginas y datos privados
// siempre van a la red (network-only) con fallback a /offline.

const VERSION = 'v1';
const STATIC_CACHE = `harold-static-${VERSION}`;
const OFFLINE_URL = '/offline';

const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|otf)$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear auth, api ni datos privados
  if (url.pathname.startsWith('/api/')) return;

  // Navegaciones: network-first con fallback a /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((res) => res || Response.error())
      )
    );
    return;
  }

  // Assets estáticos: cache-first
  if (STATIC_PATTERNS.some((re) => re.test(url.pathname))) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
  }
});
