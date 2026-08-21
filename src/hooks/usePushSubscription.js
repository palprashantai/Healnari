import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array(0);
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

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && window.navigator.standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

/**
 * Safely resolves the active Service Worker registration with a timeout to avoid hangs on mobile.
 */
async function getRegistrationSafely() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3500));
    const reg = await Promise.race([readyPromise, timeoutPromise]);
    if (reg) return reg;
    return await navigator.serviceWorker.getRegistration();
  } catch {
    return null;
  }
}

/**
 * Dual Promise/Callback permission requester for compatibility across iOS, Android Chrome, and WebViews.
 */
async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await new Promise((resolve) => {
      let resolved = false;
      const done = (perm) => {
        if (!resolved) {
          resolved = true;
          resolve(perm);
        }
      };

      try {
        const p = Notification.requestPermission((status) => done(status));
        if (p && typeof p.then === 'function') {
          p.then(done).catch(() => done(Notification.permission || 'denied'));
        }
      } catch {
        done(Notification.permission || 'denied');
      }
    });
  } catch {
    return Notification.permission || 'denied';
  }
}

/**
 * Manages Web Push subscription lifecycle for HealNari.
 * Supports iOS PWA Home Screen web apps (iOS 16.4+), Android Chrome/PWAs, and Desktop browsers.
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

  const isIos = isIosDevice();
  const isPwaStandalone = isStandaloneMode();

  // iOS Safari requires PWA Home Screen install (standalone) for PushManager
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    ('Notification' in window || (isIos && isPwaStandalone)) &&
    ('PushManager' in window || (isIos && isPwaStandalone)) &&
    !!VAPID_PUBLIC_KEY;

  // Check active subscription status on mount or user change
  const refreshStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      setIsSubscribed(false);
      return;
    }

    setPermissionState(Notification.permission);

    try {
      const registration = await getRegistrationSafely();
      if (!registration || !registration.pushManager) {
        setIsSubscribed(false);
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, user?.id]);

  /**
   * Subscribes the device to Web Push with pre-permission handling.
   * Prompts user for browser permission only when explicitly invoked by user gesture.
   */
  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY is not configured.');
      return { success: false, reason: 'unconfigured' };
    }

    if (isIos && !isPwaStandalone) {
      return { success: false, reason: 'ios_requires_pwa' };
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, reason: 'unsupported' };
    }

    setLoading(true);
    try {
      let currentPerm = Notification.permission;
      if (currentPerm === 'default') {
        currentPerm = await requestNotificationPermission();
        setPermissionState(currentPerm);
      }

      if (currentPerm !== 'granted') {
        setIsSubscribed(false);
        setLoading(false);
        return { success: false, reason: currentPerm === 'denied' ? 'denied' : 'dismissed' };
      }

      const registration = await getRegistrationSafely();
      if (!registration || !registration.pushManager) {
        setLoading(false);
        return { success: false, reason: 'sw_not_ready' };
      }

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
  }, [isIos, isPwaStandalone, user?.id]);

  /**
   * Unsubscribes the current device cleanly from Web Push and backend registry.
   */
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await getRegistrationSafely();
      if (registration && registration.pushManager) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await apiFetch(`/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
            method: 'DELETE',
          }).catch(() => {});

          await subscription.unsubscribe().catch(() => {});
        }
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
  }, []);

  // If permission was already granted in a previous session, verify device registration
  useEffect(() => {
    if (!user?.id || !isSupported) {
      subscribedForRef.current = null;
      return;
    }
    if (subscribedForRef.current === user.id) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      subscribe().catch(() => {});
    }
  }, [user?.id, isSupported, subscribe]);

  return {
    subscribe,
    unsubscribe,
    permissionState,
    isSubscribed,
    isSupported,
    isIos,
    isPwaStandalone,
    loading,
    refreshStatus,
  };
}

export default usePushSubscription;
