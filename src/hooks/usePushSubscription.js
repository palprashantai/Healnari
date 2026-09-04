import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, getTokens } from '../lib/apiClient.js';

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

function arrayBufferToBase64(buffer) {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
  const inFlightRef = useRef(false);

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
  const subscribe = useCallback(async (options = {}) => {
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

    if (inFlightRef.current) {
      return { success: false, reason: 'in_flight' };
    }

    inFlightRef.current = true;
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
        inFlightRef.current = false;
        return { success: false, reason: currentPerm === 'denied' ? 'denied' : 'dismissed' };
      }

      const registration = await getRegistrationSafely();
      if (!registration || !registration.pushManager) {
        setLoading(false);
        inFlightRef.current = false;
        return { success: false, reason: 'sw_not_ready', error: new Error('Service Worker push manager not ready.') };
      }

      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const subJson = subscription.toJSON();
        if (!subJson?.keys?.p256dh || !subJson?.keys?.auth) {
          await subscription.unsubscribe().catch(() => {});
          subscription = null;
        }
      }

      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        } catch (subErr) {
          // If existing subscription had mismatched applicationServerKey, unsubscribe and retry
          const existing = await registration.pushManager.getSubscription().catch(() => null);
          if (existing) {
            await existing.unsubscribe().catch(() => {});
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          } else {
            throw subErr;
          }
        }
      }

      const subJson = subscription.toJSON();
      const p256dh =
        subJson?.keys?.p256dh ||
        (subscription.getKey ? arrayBufferToBase64(subscription.getKey('p256dh')) : '');
      const auth =
        subJson?.keys?.auth ||
        (subscription.getKey ? arrayBufferToBase64(subscription.getKey('auth')) : '');

      if (!subscription.endpoint || !p256dh || !auth) {
        throw new Error('Device push encryption keys could not be generated.');
      }

      const platform = detectPlatform();
      const userAgent = navigator.userAgent;

      // Ensure user is authenticated before sending endpoint to backend
      const tokens = getTokens();
      if (!tokens?.accessToken) {
        setLoading(false);
        inFlightRef.current = false;
        return { success: false, reason: 'unauthenticated' };
      }

      // Session cache check: prevent repeating identical network registrations during rapid navigation
      const syncKey = `healnari_push_synced_${user?.id}`;
      const endpointHash = subscription.endpoint.slice(-24);
      const lastSynced = sessionStorage.getItem(syncKey);

      if (!options?.force && lastSynced === endpointHash) {
        subscribedForRef.current = user?.id;
        setIsSubscribed(true);
        setLoading(false);
        inFlightRef.current = false;
        return { success: true, cached: true };
      }

      try {
        await apiFetch('/push-subscriptions', {
          method: 'POST',
          body: {
            endpoint: subscription.endpoint,
            keys: { p256dh, auth },
            platform,
            userAgent,
          },
        });
        sessionStorage.setItem(syncKey, endpointHash);
      } catch (postErr) {
        if (postErr?.status === 401) {
          subscribedForRef.current = user?.id;
          setIsSubscribed(false);
          setLoading(false);
          inFlightRef.current = false;
          return { success: false, reason: 'unauthorized' };
        }
        // Resilient fallback for backend versions with strict DTO whitelisting
        if (postErr?.message?.includes('should not exist') || postErr?.status === 400) {
          await apiFetch('/push-subscriptions', {
            method: 'POST',
            body: {
              endpoint: subscription.endpoint,
              keys: { p256dh, auth },
            },
          });
          sessionStorage.setItem(syncKey, endpointHash);
        } else {
          throw postErr;
        }
      }

      subscribedForRef.current = user?.id;
      setIsSubscribed(true);
      setLoading(false);
      inFlightRef.current = false;
      return { success: true };
    } catch (err) {
      console.warn('Push subscription failed:', err);
      setIsSubscribed(false);
      setLoading(false);
      inFlightRef.current = false;
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

      if (user?.id) {
        sessionStorage.removeItem(`healnari_push_synced_${user.id}`);
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
  }, [user?.id]);

  /**
   * Dispatches a test lockscreen push notification to this device via backend.
   */
  const testPush = useCallback(async () => {
    try {
      const tokens = getTokens();
      if (!tokens?.accessToken) {
        return { success: false, message: 'Please log in to test push notifications.' };
      }
      const res = await apiFetch('/push-subscriptions/test', { method: 'POST' });
      return { success: true, data: res };
    } catch (err) {
      return { success: false, message: err?.message || 'Failed to dispatch test notification.' };
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
    testPush,
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
