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

  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;
      } else if (Notification.permission !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const { endpoint, keys } = subscription.toJSON();
      await apiFetch('/push-subscriptions', { method: 'POST', body: { endpoint, keys } });
      subscribedForRef.current = user?.id;
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!user?.id) {
      subscribedForRef.current = null;
      return;
    }
    if (subscribedForRef.current === user.id) return;
    if (!VAPID_PUBLIC_KEY || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // iOS Fix: Auto-subscribing on load is blocked without a user gesture.
    // We only auto-subscribe if permission was *already* granted previously.
    if (Notification.permission === 'granted') {
      subscribe();
    }
  }, [user?.id]);

  return { subscribe };
}

export default usePushSubscription;
