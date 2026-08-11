import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

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
      icon: '/brand/logo-icon.jpg',
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

  if (event.action === 'decline') return; // just dismiss — no need to open/focus the app

  const appointmentId = event.notification.data?.appointmentId;
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
