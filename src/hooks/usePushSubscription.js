import { useState, useEffect, useRef, useCallback } from 'react';
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

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(ua)) return 'macos';
  if (/Win/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  return 'web';
}

/**
 * Manages Web Push subscription lifecycle for HealNari.
 * Supports standards-based Web Push, iOS PWA Home Screen web apps (iOS 16.4+),
 * Android PWAs, and Desktop browsers.
 */
export function usePushSubscription(user) {
  const [permissionState, setPermissionState] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const subscribedForRef = useRef(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY;

  // Check active subscription status on mount or user change
  const refreshStatus = useCallback(async () => {
    if (!isSupported) {
      setPermissionState('unsupported');
      setIsSubscribed(false);
      return;
    }

    setPermissionState(Notification.permission);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  }, [isSupported]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, user?.id]);

  /**
   * Subscribes the device to Web Push with pre-permission handling.
   * Prompts user for browser permission only when explicitly invoked by user gesture.
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) return { success: false, reason: 'unsupported' };

    setLoading(true);
    try {
      let currentPerm = Notification.permission;
      if (currentPerm === 'default') {
        currentPerm = await Notification.requestPermission();
        setPermissionState(currentPerm);
      }

      if (currentPerm !== 'granted') {
        setIsSubscribed(false);
        setLoading(false);
        return { success: false, reason: currentPerm === 'denied' ? 'denied' : 'dismissed' };
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
      const platform = detectPlatform();
      const userAgent = navigator.userAgent;

      await apiFetch('/push-subscriptions', {
        method: 'POST',
        body: { endpoint, keys, platform, userAgent },
      });

      subscribedForRef.current = user?.id;
      setIsSubscribed(true);
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.warn('Push subscription failed:', err);
      setIsSubscribed(false);
      setLoading(false);
      return { success: false, reason: 'error', error: err };
    }
  }, [isSupported, user?.id]);

  /**
   * Unsubscribes the current device cleanly from Web Push and backend registry.
   */
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await apiFetch(`/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
        }).catch(() => {});

        await subscription.unsubscribe().catch(() => {});
      }

      subscribedForRef.current = null;
      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.warn('Push unsubscription failed:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  // If permission was already granted in a previous session, ensure device registration is up to date
  useEffect(() => {
    if (!user?.id || !isSupported) {
      subscribedForRef.current = null;
      return;
    }
    if (subscribedForRef.current === user.id) return;

    if (Notification.permission === 'granted') {
      subscribe();
    }
  }, [user?.id, isSupported, subscribe]);

  return {
    subscribe,
    unsubscribe,
    permissionState,
    isSubscribed,
    isSupported,
    loading,
    refreshStatus,
  };
}

export default usePushSubscription;
