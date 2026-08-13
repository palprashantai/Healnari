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

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const appointmentId = payload.data?.appointmentId;
  const isIncomingCall = payload.data?.type === 'appointment_called';

  event.waitUntil(
    self.registration.showNotification(payload.title || 'HealNari', {
      body: payload.body || '',
      // Show the caller's actual photo, like a real phone call, falling
      // back to the app logo when there isn't one (or it fails to load).
      icon: payload.data?.callerAvatarUrl || '/brand/logo-icon.jpg',
      badge: '/brand/logo-icon.jpg',
      tag: appointmentId ? `call-${appointmentId}` : `notif-${Date.now()}`,
      requireInteraction: isIncomingCall,
      // Buzz-buzz-pause, like a phone ring, not a flat single-buzz ping.
      vibrate: isIncomingCall ? [300, 150, 300, 150, 300] : [150],
      actions: isIncomingCall
        ? [
            { action: 'accept', title: 'Accept' },
            { action: 'decline', title: 'Decline' },
          ]
        : [],
      data: payload.data || {},
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const appointmentId = event.notification.data?.appointmentId;

  if (event.action === 'decline') {
    // Must actually tell the backend, not just dismiss the notification —
    // otherwise the caller's side keeps ringing until it times out on its
    // own (45s) instead of hanging up immediately, like a real phone call.
    // No app tab needs to be open for this: the access token is mirrored
    // into IndexedDB (see lib/tokenStore.js) specifically so this works.
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
  // The service worker has no access to app state (no localStorage, no
  // React context) to know who's logged in, so the backend tags every
  // call notification with which dashboard the callee belongs on.
  const calleeRole = event.notification.data?.calleeRole;
  const url = !appointmentId
    ? '/'
    : calleeRole === 'doctor'
      ? `/doctor-dashboard/telemedicine?startCall=${appointmentId}`
      : `/patient-dashboard/appointments?joinCall=${appointmentId}`;

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
