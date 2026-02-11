const CACHE_NAME = 'goutguard-v1';
const STATIC_ASSETS = ['/', '/scan', '/database', '/uric-acid', '/settings'];

// Install — pre-cache essential routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for navigation & API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-first for navigation requests (HTML pages) and RSC
  if (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    request.headers.get('RSC') === '1' ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok && request.mode === 'navigate') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for navigation
          if (request.mode === 'navigate') {
            return caches.match(request).then(
              (cached) =>
                cached ||
                caches.match('/') ||
                new Response('Offline — please check your connection.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                })
            );
          }
          // Return offline JSON for API requests
          return new Response(
            JSON.stringify({ error: 'You appear to be offline.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
    )
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'GoutGuard', body: 'Time for your reminder!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'goutguard-notification',
    data: data,
    actions: [],
  };

  // Add actions based on notification type
  if (data.type === 'medication') {
    options.actions = [
      { action: 'taken', title: 'Mark as Taken' },
      { action: 'snooze', title: 'Snooze 10min' },
    ];
  } else if (data.type === 'water') {
    options.actions = [
      { action: 'logged', title: 'Log 8oz' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'taken' && data.medicationId) {
    // Record dose as taken — broadcast to open clients
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'DOSE_TAKEN',
            medicationId: data.medicationId,
            time: data.time,
          });
        });
      })
    );
    return;
  }

  if (action === 'snooze') {
    // Re-show notification after 10 minutes
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration
            .showNotification(data.title || 'GoutGuard Reminder', {
              body: data.body || 'Snoozed reminder',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: 'goutguard-snoozed',
              data: data,
            })
            .then(resolve);
        }, 10 * 60 * 1000);
      })
    );
    return;
  }

  if (action === 'logged') {
    // Log water intake
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'WATER_LOGGED', amount: 8 });
        });
      })
    );
    return;
  }

  // Default: open or focus the app
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const focused = clients.find((c) => 'focus' in c);
        if (focused) {
          return focused.focus();
        }
        return self.clients.openWindow('/');
      })
  );
});

// Background sync for periodic reminder checks
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(
      fetch('/api/push/check-reminders')
        .then((res) => res.json())
        .then((data) => {
          if (data.reminders && data.reminders.length > 0) {
            data.reminders.forEach((reminder) => {
              self.registration.showNotification(
                reminder.title || 'GoutGuard Reminder',
                {
                  body: reminder.body,
                  icon: '/icon-192.png',
                  tag: `reminder-${reminder.id}`,
                  data: reminder,
                }
              );
            });
          }
        })
        .catch(() => {
          // Offline — skip this check
        })
    );
  }
});
