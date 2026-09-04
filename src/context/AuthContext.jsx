import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, getTokens, setTokens, clearTokens, API_URL } from '../lib/apiClient.js';
import { useQueryClient } from '@tanstack/react-query';
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
  
  // Only start in loading state if there are existing cached credentials to verify
  const [loading, setLoading] = useState(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem('healnari_tokens'));
      return Boolean(tokens?.accessToken);
    } catch {
      return false;
    }
  });

  const queryClient = useQueryClient();

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
    testPush,
    permissionState: pushPermissionState,
    isSubscribed: isPushSubscribed,
    isSupported: isPushSupported,
    isIos,
    isPwaStandalone,
    loading: pushLoading,
  } = usePushSubscription(user);

  const loadMe = useCallback(async () => {
    try {
      let tokens = getTokens();
      if (!tokens?.accessToken) {
        // iOS Safari PWA Mitigation: localStorage is cleared after 7 days of inactivity.
        // Recover the session from IndexedDB which survives the 7-day purge.
        try {
          const { readTokensFromIndexedDb } = await import('../lib/tokenStore.js');
          const recoveredTokens = await readTokensFromIndexedDb();
          if (recoveredTokens?.accessToken) {
            setTokens(recoveredTokens);
            tokens = recoveredTokens;
          } else {
            setAndCacheUser(null);
            return;
          }
        } catch {
          setAndCacheUser(null);
          return;
        }
      }
      try {
        setAndCacheUser(await apiFetch('/auth/me'));
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          clearTokens();
          setAndCacheUser(null);
        }
        // Network errors are gracefully ignored, keeping the cached session alive
      }
    } catch {
      setAndCacheUser(null);
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
  const signUp = useCallback(async (email, password, role, extra = {}) => {
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
      console.error('Registration failed', error);
      throw error;
    }
  }, [setAndCacheUser]);

  const signIn = useCallback(async (email, password) => {
    const cleanEmail = typeof email === 'string' ? email.trim() : email;
    const cleanPassword = typeof password === 'string' ? password.trim() : password;
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: { email: cleanEmail, password: cleanPassword },
      });
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setAndCacheUser(data.user);
      return { user: data.user };
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  }, [setAndCacheUser]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearTokens();
      setAndCacheUser(null);
      queryClient.clear(); // Abort active queries and wipe cache to prevent 401s after token is gone
    }
  }, [setAndCacheUser, queryClient]);

  /** Optimistic local merge + best-effort persist of the fields `vision` tracks on `profiles`. */
  const updateUser = useCallback(async (updates) => {
    // Optimistically update local state so the UI reflects the edit instantly
    const nextUser = { ...user, ...updates };
    setAndCacheUser(nextUser);

    // Map UI user object back to the backend Profile entity columns
    const patch = {};
    if (updates.name !== undefined) patch.fullName = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.dob !== undefined) patch.dob = updates.dob;
    if (updates.bloodGroup !== undefined) patch.bloodGroup = updates.bloodGroup;
    if (updates.specialty !== undefined) patch.specialty = updates.specialty;
    if (updates.qualifications !== undefined) patch.qualifications = updates.qualifications;
    if (updates.experienceYears !== undefined) patch.experienceYears = Number(updates.experienceYears);
    if (updates.consultationFee !== undefined) patch.consultationFee = Number(updates.consultationFee);
    if (updates.clinicConsultationFee !== undefined) patch.clinicConsultationFee = Number(updates.clinicConsultationFee);
    if (updates.languages !== undefined) patch.languages = updates.languages;
    if (updates.address !== undefined) patch.address = updates.address;
    if (updates.city !== undefined) patch.city = updates.city;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.pincode !== undefined) patch.pincode = updates.pincode;
    if (updates.emergencyContact !== undefined) patch.emergencyContact = updates.emergencyContact;
    if (updates.allergies !== undefined) patch.allergies = updates.allergies;
    if (updates.chronicConditions !== undefined) patch.chronicConditions = updates.chronicConditions;
    if (updates.currency !== undefined) {
      patch.currency = updates.currency.toUpperCase() === 'USD' ? 'USD' : 'INR';
      patch.country = patch.currency === 'USD' ? 'US' : 'IN';
      try {
        localStorage.setItem('healnari_currency', patch.currency);
      } catch {}
    }
    if (updates.country !== undefined) patch.country = updates.country.toUpperCase() === 'US' ? 'US' : 'IN';
    if (updates.emailNotifications !== undefined) patch.emailNotifications = updates.emailNotifications;
    if (updates.smsNotifications !== undefined) patch.smsNotifications = updates.smsNotifications;
    if (Object.keys(patch).length === 0) return;

    try {
      await apiFetch('/auth/me', { method: 'PUT', body: patch });
    } catch (error) {
      console.error('Failed to save profile', error);
      throw error;
    }
  }, [user, setAndCacheUser]);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    await apiFetch('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiFetch('/auth/me/avatar', { method: 'POST', body: formData });
    setAndCacheUser(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
    return data;
  }, [setAndCacheUser]);

  const removeAvatar = useCallback(async () => {
    const data = await apiFetch('/auth/me/avatar', { method: 'DELETE' });
    setAndCacheUser(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
    return data;
  }, [setAndCacheUser]);

  const value = useMemo(() => ({
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
    testPush,
    pushPermissionState,
    isPushSubscribed,
    isPushSupported,
    isIos,
    isPwaStandalone,
    pushLoading,
  }), [
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
    testPush,
    pushPermissionState,
    isPushSubscribed,
    isPushSupported,
    isIos,
    isPwaStandalone,
    pushLoading,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
