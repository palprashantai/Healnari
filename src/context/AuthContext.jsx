import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, getTokens, setTokens, clearTokens } from '../lib/apiClient.js';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getTokens()?.accessToken) {
      setUser(null);
      return;
    }
    try {
      setUser(await apiFetch('/auth/me'));
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadMe().finally(() => setLoading(false));
  }, [loadMe]);

  /** role: 'patient' | 'doctor'. extra: { fullName, specialty?, registrationNo? } */
  const signUp = async (email, password, role, extra = {}) => {
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: { email, password, role, ...extra },
      });
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setUser(data.user);
      return { user: data.user };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', skipAuth: true, body: { email, password } });
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setUser(data.user);
      return { user: data.user };
    } catch (error) {
      return { error };
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  /** Optimistic local merge + best-effort persist of the fields `vision` tracks on `profiles`. */
  const updateUser = async (updates) => {
    setUser(prev => ({ ...prev, ...updates }));

    const patch = {};
    if (updates.name !== undefined) patch.fullName = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.specialty !== undefined) patch.specialty = updates.specialty;
    if (updates.regNo !== undefined) patch.registrationNo = updates.regNo;
    if (Object.keys(patch).length === 0) return;

    try {
      await apiFetch('/auth/me', { method: 'PUT', body: patch });
    } catch (error) {
      console.error('Failed to save profile', error);
    }
  };

  const value = { user, signUp, signIn, logout, updateUser, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
