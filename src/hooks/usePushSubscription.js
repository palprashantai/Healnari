import { useEffect, useRef } from 'react';
import { apiFetch } from '../lib/apiClient.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Registers this browser for Web Push once a user is logged in, so incoming
 * call/notification alerts can reach them even when the tab is closed or
 * backgrounded. Best-effort throughout — permission denial, an unsupported
 * browser, or a network hiccup just means push silently doesn't work; the
 * in-app Socket.IO notification path (NotificationsContext) is unaffected.
 *
 * Keyed off `user.id` rather than the whole `user` object so an unrelated
 * profile update doesn't re-trigger a subscribe, but switching accounts on
 * the same browser (logout -> different login) does.
 */
export function usePushSubscription(user) {
  const subscribedForRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      // Logged out — AuthContext.logout() tears down the browser's push
      // subscription, so forget we'd already subscribed: a re-login (even
      // as the same user, same tab) must be allowed to subscribe again.
      subscribedForRef.current = null;
      return;
    }
    if (subscribedForRef.current === user.id) return;
    if (!VAPID_PUBLIC_KEY || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    subscribedForRef.current = user.id;

    (async () => {
      try {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        } else if (Notification.permission !== 'granted') {
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // Backend DTO only accepts { endpoint, keys } — the global
        // ValidationPipe rejects unknown properties (forbidNonWhitelisted),
        // so strip toJSON()'s extra `expirationTime` before sending.
        const { endpoint, keys } = subscription.toJSON();
        await apiFetch('/push-subscriptions', { method: 'POST', body: { endpoint, keys } });
      } catch {
        // Never block app usage over a push registration failure.
      }
    })();
  }, [user?.id]);
}

export default usePushSubscription;
