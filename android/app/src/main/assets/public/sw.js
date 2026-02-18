const CACHE_NAME = 'kidney-nutrition-v5';
const urlsToCache = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let data = {
    title: 'Medication Reminder',
    body: 'Time to take your medication',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'medication-reminder',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'medication-reminder',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data,
    actions: [
      { action: 'take', title: 'Mark as Taken' },
      { action: 'snooze', title: 'Snooze 10min' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'take') {
    // User marked medication as taken
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Send message to any open windows
        clientList.forEach((client) => {
          client.postMessage({
            type: 'MEDICATION_TAKEN',
            data: event.notification.data
          });
        });
      })
    );
  } else if (event.action === 'snooze') {
    // Snooze for 10 minutes
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification(
            event.notification.title,
            {
              body: event.notification.body + ' (Snoozed)',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: 'medication-reminder-snoozed',
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              data: event.notification.data
            }
          );
          resolve();
        }, 10 * 60 * 1000); // 10 minutes
      })
    );
  } else {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/medications') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/medications');
        }
      })
    );
  }
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY
    }).then((subscription) => {
      // Send new subscription to server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    })
  );
});

// Network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'You are offline. Please check your connection.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    })
  );
});

// Periodic background sync for medication checks (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-medications') {
    event.waitUntil(checkMedicationTimes());
  }
});

async function checkMedicationTimes() {
  // Get medications from IndexedDB or send request to check
  try {
    const response = await fetch('/api/push/check-reminders');
    const data = await response.json();

    if (data.reminders && data.reminders.length > 0) {
      for (const reminder of data.reminders) {
        await self.registration.showNotification(reminder.title, {
          body: reminder.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `medication-${reminder.id}`,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: reminder.data
        });
      }
    }
  } catch (error) {
    console.error('Error checking medications:', error);
  }
}
