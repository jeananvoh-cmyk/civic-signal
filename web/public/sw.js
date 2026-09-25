// Service Worker for SIGNA-CI Push Notifications

self.addEventListener('push', (event) => {
  let data = { title: 'SIGNA-CI', body: 'Nouvelle notification', icon: '/icons/icon-192.png' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'signa-ci-notification',
    renotify: true,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Cache dynamique pour tuiles cartographiques Leaflet (OpenStreetMap / CartoDB)
const TILE_CACHE = 'signa-tiles-v1';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Caching optimisé des tuiles cartographiques pour résilience réseau
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('basemaps.cartocdn.com')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response('', { status: 408 });
        }
      })
    );
  }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
