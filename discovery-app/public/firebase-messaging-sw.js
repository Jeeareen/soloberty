// Background Service Worker for Firebase Cloud Messaging & Web Push
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept all push events directly (works for both FCM JSON payloads and DevTools plain-text pushes)
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        notification: {
          title: 'New message on Soloberty',
          body: event.data.text(),
        },
      };
    }
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'New message on Soloberty';
  const body = notification.body || data.body || 'You received a new message.';
  const icon = notification.icon || data.icon || '/Soloberty.svg';
  const url = data.url || payload.fcmOptions?.link || '/chat';

  const options = {
    body,
    icon,
    badge: '/Soloberty.svg',
    data: { url },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click event opens the conversation directly
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/chat') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
