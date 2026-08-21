import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { readTokensFromIndexedDb } from './lib/tokenStore.js';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// `generateSW` mode injects these automatically for registerType:'autoUpdate';
// a custom `injectManifest` service worker (this file) has to do it itself.
// Without them the new SW sits in "waiting" forever behind the old one (an
// installed/standalone PWA never closes all its tabs to let it through),
// so it keeps serving a stale cached shell alongside newly-built, differently
// hashed JS/CSS chunks — the exact "sometimes errors, sometimes hangs" bug.
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache the underlying font files with a cache-first strategy for 1 year.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365,
        maxEntries: 30,
      }),
    ],
  })
);

// Cache FontAwesome CDN stylesheets and webfonts
registerRoute(
  ({ url }) => url.origin === 'https://cdnjs.cloudflare.com',
  new StaleWhileRevalidate({
    cacheName: 'fontawesome-cdn',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 20,
      }),
    ],
  })
);

// Cache static brand assets and images
registerRoute(
  ({ request, url }) => request.destination === 'image' || url.pathname.startsWith('/brand/'),
  new StaleWhileRevalidate({
    cacheName: 'healnari-images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 60,
      }),
    ],
  })
);

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const appointmentId = payload.data?.appointmentId;
  const notifType = payload.data?.type;
  const isIncomingCall = notifType === 'appointment_called';
  const isUrgentLab = notifType === 'urgent_lab_result';
  const isReminder = notifType === 'medication_reminder' || notifType === 'cycle_reminder';

  // Custom vibration pattern: ring for calls, double-urgent for labs, gentle tap for reminders
  let vibratePattern = [150];
  if (isIncomingCall) {
    vibratePattern = [300, 150, 300, 150, 300];
  } else if (isUrgentLab) {
    vibratePattern = [200, 100, 200, 100, 400];
  } else if (isReminder) {
    vibratePattern = [80, 50, 80];
  }

  let actions = [];
  if (isIncomingCall) {
    actions = [
      { action: 'accept', title: '📞 Join Video Call' },
      { action: 'decline', title: '✕ Decline' },
    ];
  } else if (isUrgentLab) {
    actions = [
      { action: 'view_report', title: '📋 Review Lab Alert' },
      { action: 'dismiss', title: 'Acknowledge' },
    ];
  } else if (isReminder) {
    actions = [
      { action: 'view_report', title: '🌸 Log Now' },
      { action: 'dismiss', title: 'Remind in 1 hr' },
    ];
  }

  const notificationOptions = {
    body: payload.body || '',
    // Show caller/doctor avatar or high-res brand icon
    icon: payload.data?.callerAvatarUrl || '/brand/logo-icon.jpg',
    badge: '/brand/logo-icon.jpg',
    // Rich media attachment for clinical or promo push if present
    image: payload.data?.imageUrl || undefined,
    tag: appointmentId ? `call-${appointmentId}` : `notif-${payload.data?.id || Date.now()}`,
    renotify: isIncomingCall || isUrgentLab,
    requireInteraction: isIncomingCall || isUrgentLab,
    timestamp: payload.data?.timestamp || Date.now(),
    vibrate: vibratePattern,
    actions: actions,
    data: payload.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'HealNari Care', notificationOptions),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const appointmentId = event.notification.data?.appointmentId;
  const reportId = event.notification.data?.reportId;
  const calleeRole = event.notification.data?.calleeRole;
  const targetPath = event.notification.data?.path;

  if (event.action === 'decline') {
    if (appointmentId) {
      event.waitUntil(
        readTokensFromIndexedDb().then((tokens) => {
          if (!tokens?.accessToken) return undefined;
          return fetch(`${API_URL}/appointments/${appointmentId}/decline-call`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          }).catch(() => {});
        }),
      );
    }
    return;
  }

  if (event.action === 'dismiss') {
    return;
  }

  let url = '/';
  if (targetPath) {
    url = targetPath;
  } else if (appointmentId) {
    url = calleeRole === 'doctor'
      ? `/doctor-dashboard/telemedicine?startCall=${appointmentId}`
      : `/patient-dashboard/appointments?joinCall=${appointmentId}`;
  } else if (reportId) {
    url = calleeRole === 'doctor'
      ? `/doctor-dashboard/reports?reportId=${reportId}`
      : `/patient-dashboard/records`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        return existing.focus().then(() => existing.navigate(url)).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
