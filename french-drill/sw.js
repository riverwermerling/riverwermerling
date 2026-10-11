// Offline cache + Web Push handler.
const CACHE = 'french-drill-v1';
const SHELL = [
  './', 'index.html', 'styles.css', 'config.js', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/store.js', 'js/ui.js', 'js/session.js', 'js/blitz.js', 'js/srs.js', 'js/check.js',
  'js/conjugate.js', 'js/verbs.js', 'js/vocab.js', 'js/lessons.js', 'js/sync.js', 'js/push.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for the app shell and the supabase-js CDN module; never cache Supabase API calls.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cdn = url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !cdn) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
      return hit || net;
    })
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data?.text() };
  }
  const title = data.title || 'Time for your French 🇫🇷';
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || 'Your cards are waiting.',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'french-drill-reminder',
        renotify: true,
        data: { url: data.url || './#/review' },
      }),
      data.badge != null && self.navigator.setAppBadge ? self.navigator.setAppBadge(data.badge).catch(() => {}) : null,
    ])
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || './#/review';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate?.(new URL(target, self.registration.scope).href);
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
