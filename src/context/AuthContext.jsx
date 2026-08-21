import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, getTokens, setTokens, clearTokens, API_URL } from '../lib/apiClient.js';
import { usePushSubscription } from '../hooks/usePushSubscription.js';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('healnari_user')) || null;
    } catch {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(!user);

  const setAndCacheUser = useCallback((updater) => {
    setUser((prev) => {
      const newUser = typeof updater === 'function' ? updater(prev) : updater;
      if (newUser) {
        localStorage.setItem('healnari_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('healnari_user');
      }
      return newUser;
    });
  }, []);

  const {
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    permissionState: pushPermissionState,
    isSubscribed: isPushSubscribed,
    isSupported: isPushSupported,
    isIos,
    isPwaStandalone,
    loading: pushLoading,
  } = usePushSubscription(user);

  const loadMe = useCallback(async () => {
    let tokens = getTokens();
    if (!tokens?.accessToken) {
      // iOS Safari PWA Mitigation: localStorage is cleared after 7 days of inactivity.
      // Recover the session from IndexedDB which survives the 7-day purge.
      const { readTokensFromIndexedDb } = await import('../lib/tokenStore.js');
      const recoveredTokens = await readTokensFromIndexedDb();
      if (recoveredTokens?.accessToken) {
        setTokens(recoveredTokens);
        tokens = recoveredTokens;
      } else {
        setAndCacheUser(null);
        return;
      }
    }
    try {
      setAndCacheUser(await apiFetch('/auth/me'));
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearTokens();
        setAndCacheUser(null);
      }
      // Network errors are gracefully ignored, keeping the cached session alive
    }
  }, [setAndCacheUser]);

  useEffect(() => {
    loadMe().finally(() => setLoading(false));
    
    // Cross-tab synchronization
    const handleStorage = (e) => {
      if (e.key === 'healnari_tokens' && !e.newValue) {
        setAndCacheUser(null);
      } else if (e.key === 'healnari_user' && e.newValue !== e.oldValue) {
        try {
          setUser(JSON.parse(e.newValue) || null);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadMe, setAndCacheUser]);

  /** role: 'patient' | 'doctor'. extra: { fullName, specialty?, registrationNo? } */
  const signUp = async (email, password, role, extra = {}) => {
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: { email, password, role, ...extra },
      });
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setAndCacheUser(data.user);
      return { user: data.user };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', skipAuth: true, body: { email, password } });
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setAndCacheUser(data.user);
      return { user: data.user };
    } catch (error) {
      return { error };
    }
  };

  const logout = () => {
    // Best-effort — a shared/kiosk device shouldn't keep ringing for a user
    // who signed out. The access token is captured now (not read inside the
    // async chain) because clearTokens() below runs before
    // pushManager.getSubscription() resolves.
    if ('serviceWorker' in navigator) {
      const accessToken = getTokens()?.accessToken;
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => {
          if (!subscription) return;
          if (accessToken) {
            fetch(`${API_URL}/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => {});
          }
          subscription.unsubscribe().catch(() => {});
        })
        .catch(() => {});
    }

    clearTokens();
    setAndCacheUser(null);
  };

  /** Optimistic local merge + best-effort persist of the fields `vision` tracks on `profiles`. */
  const updateUser = async (updates) => {
    setAndCacheUser(prev => ({ ...prev, ...updates }));

    const patch = {};
    if (updates.name !== undefined) patch.fullName = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.specialty !== undefined) patch.specialty = updates.specialty;
    if (updates.regNo !== undefined) patch.registrationNo = updates.regNo;
    if (updates.emailNotifications !== undefined) patch.emailNotifications = updates.emailNotifications;
    if (updates.smsNotifications !== undefined) patch.smsNotifications = updates.smsNotifications;
    if (Object.keys(patch).length === 0) return;

    try {
      await apiFetch('/auth/me', { method: 'PUT', body: patch });
    } catch (error) {
      console.error('Failed to save profile', error);
      throw error;
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    await apiFetch('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiFetch('/auth/me/avatar', { method: 'POST', body: formData });
    setAndCacheUser(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
    return data;
  };

  const removeAvatar = async () => {
    const data = await apiFetch('/auth/me/avatar', { method: 'DELETE' });
    setAndCacheUser(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
    return data;
  };

  const value = {
    user,
    signUp,
    signIn,
    logout,
    updateUser,
    updatePassword,
    uploadAvatar,
    removeAvatar,
    loading,
    subscribePush,
    unsubscribePush,
    pushPermissionState,
    isPushSubscribed,
    isPushSupported,
    isIos,
    isPwaStandalone,
    pushLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
