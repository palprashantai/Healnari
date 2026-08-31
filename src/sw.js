import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim, setConfig } from 'workbox-core';

// Disable workbox debug logs in development
setConfig({ debug: false });
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { readTokensFromIndexedDb } from './lib/tokenStore.js';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Auto-update service worker lifecycle
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

/**
 * Handle incoming Web Push events.
 * Uses service-worker persistent notifications for reliable cross-platform support (Android + iOS PWA).
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'HealNari Notification',
      body: event.data.text(),
    };
  }

  const notifData = payload.data || {};
  const appointmentId = notifData.appointmentId;
  const notifType = notifData.type;
  const isIncomingCall = notifType === 'appointment_called';
  const isUrgentLab = notifType === 'urgent_lab_result';
  const isReminder =
    notifType === 'medication_reminder' ||
    notifType === 'cycle_reminder' ||
    notifType === 'prescription_refill_due' ||
    notifType === 'period_prediction' ||
    notifType === 'fertility_window';

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
      { action: 'view_report', title: '🌸 Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  const notificationOptions = {
    body: payload.body || '',
    icon: notifData.callerAvatarUrl || '/brand/logo-icon.jpg',
    badge: '/brand/logo-icon.jpg',
    image: notifData.imageUrl || undefined,
    tag: appointmentId ? `call-${appointmentId}` : `notif-${notifData.id || notifType || Date.now()}`,
    renotify: true,
    requireInteraction: isIncomingCall || isUrgentLab,
    timestamp: notifData.timestamp || Date.now(),
    vibrate: vibratePattern,
    actions: actions,
    data: notifData,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'HealNari Care', notificationOptions)
  );
});

/**
 * Handle notification clicks & action button triggers with intentional deep linking.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const appointmentId = notifData.appointmentId;
  const reportId = notifData.reportId || notifData.labReportId || notifData.labId;
  const calleeRole = notifData.calleeRole;
  const notifType = notifData.type;
  const targetPath = notifData.path || notifData.url;

  if (event.action === 'decline') {
    if (appointmentId) {
      event.waitUntil(
        readTokensFromIndexedDb().then((tokens) => {
          if (!tokens?.accessToken) return undefined;
          return fetch(`${API_URL}/appointments/${appointmentId}/decline-call`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          }).catch(() => {});
        })
      );
    }
    return;
  }

  if (event.action === 'dismiss') {
    return;
  }

  // Resolve deep link based on context and role
  let url = '/';
  if (targetPath) {
    url = targetPath;
  } else if (isAppointmentType(notifType) || appointmentId) {
    if (isIncomingCallType(notifType)) {
      url = calleeRole === 'doctor'
        ? `/doctor-dashboard/telemedicine?startCall=${appointmentId}`
        : `/patient-dashboard/appointments?joinCall=${appointmentId}`;
    } else {
      url = calleeRole === 'doctor' ? '/doctor-dashboard/appointments' : '/patient-dashboard/appointments';
    }
  } else if (isPrescriptionType(notifType)) {
    url = calleeRole === 'doctor' ? '/doctor-dashboard/prescriptions' : '/patient-dashboard/prescriptions';
  } else if (isLabReportType(notifType) || reportId) {
    url = calleeRole === 'doctor'
      ? `/doctor-dashboard/reports${reportId ? `?reportId=${reportId}` : ''}`
      : '/patient-dashboard/records';
  } else if (isCycleOrTrackingType(notifType)) {
    url = notifType === 'fertility_window' ? '/patient-dashboard/fertility' : '/patient-dashboard/tracking';
  } else if (isBillingType(notifType)) {
    url = calleeRole === 'doctor' ? '/doctor-dashboard/billing' : '/patient-dashboard/billing';
  } else if (isAdminType(notifType)) {
    url = '/admin-dashboard';
  } else {
    url = calleeRole === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        return existing
          .focus()
          .then(() => existing.navigate(url))
          .catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    })
  );
});

function isAppointmentType(type) {
  return [
    'appointment_called',
    'appointment_requested',
    'appointment_approved',
    'appointment_cancelled',
    'appointment_reminder',
    'appointment_delayed',
    'follow_up_recommended',
  ].includes(type);
}

function isIncomingCallType(type) {
  return type === 'appointment_called';
}

function isPrescriptionType(type) {
  return [
    'prescription_issued',
    'prescription_refill_due',
    'refill_requested',
    'medication_reminder',
  ].includes(type);
}

function isLabReportType(type) {
  return [
    'lab_report_requested',
    'lab_report_uploaded',
    'lab_report_reviewed',
    'lab_report_pending',
    'urgent_lab_result',
  ].includes(type);
}

function isCycleOrTrackingType(type) {
  return [
    'period_prediction',
    'fertility_window',
    'cycle_reminder',
    'lifestyle_daily_reminder',
  ].includes(type);
}

function isBillingType(type) {
  return [
    'payment_success',
    'payment_received',
    'payment_refund_processed',
    'care_plan_renewal_due',
  ].includes(type);
}

function isAdminType(type) {
  return [
    'admin_daily_revenue_summary',
    'admin_kyc_escalation',
    'admin_message',
  ].includes(type);
}
