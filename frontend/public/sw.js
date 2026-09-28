// Smart Medibox Mobile Service Worker for Push & System Notification Bar Alerts

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push events from mobile OS
self.addEventListener('push', (event) => {
  let data = { title: 'Smart Medibox Alert', message: 'New dosage notification received.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.message = event.data.text();
    }
  }

  const title = data.title || 'Smart Medibox Alert';
  const options = {
    body: data.message || data.body || 'Check your medication schedule.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [300, 100, 300, 100, 300], // Mobile vibration pattern
    tag: data.id || 'medibox-notif',
    renotify: true,
    data: { url: '/notifications' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle click on system notification bar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/notifications') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
