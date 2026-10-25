// Firebase Cloud Messaging Background Service Worker
// Automatically loaded by Firebase Messaging SDK in the background
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parse config from registration query params to avoid hardcoding keys in repository
const params = new URLSearchParams(self.location.search);
const apiKey = params.get('apiKey');
const projectId = params.get('projectId');
const messagingSenderId = params.get('messagingSenderId');
const appId = params.get('appId');

if (apiKey && projectId) {
  firebase.initializeApp({
    apiKey,
    projectId,
    messagingSenderId,
    appId,
  });
}

const messaging = firebase.messaging();

// Handle background push messages received when tabs are closed
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New message on Soloberty';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You received a new message.',
    icon: payload.data?.icon || '/Soloberty.svg',
    badge: '/Soloberty.svg',
    data: {
      url: payload.data?.url || '/chat',
    },
    vibrate: [100, 50, 100],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
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
