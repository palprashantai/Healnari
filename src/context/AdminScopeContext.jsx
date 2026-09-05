import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient.js';

const AdminScopeContext = createContext(null);

export const GLOBAL_SCOPE = {
  type: 'global',
  id: 'ALL',
  label: 'All Enterprise Facilities (Global)',
  icon: 'fa-building-circle-check',
};

export const CLINICAL_SPECIALTIES = [
  { id: 'GYNAECOLOGIST', label: 'Gynaecology & Obstetrics', icon: 'fa-stethoscope' },
  { id: 'ENDOCRINOLOGIST', label: 'PCOS & Endocrinology', icon: 'fa-dna' },
  { id: 'DERMATOLOGIST', label: 'Dermatology & Trichology', icon: 'fa-spa' },
  { id: 'DIETITIAN', label: 'Clinical Nutrition & Dietetics', icon: 'fa-apple-whole' },
  { id: 'FERTILITY_EXPERT', label: 'Fertility & Reproductive Health', icon: 'fa-baby' },
  { id: 'YOGA_THERAPIST', label: 'Mind-Body & Yoga Therapy', icon: 'fa-person-praying' },
];

export const REGIONAL_FACILITIES = [
  { id: 'IN', label: 'India Telehealth Network (INR ₹)', icon: 'fa-flag', flag: '🇮🇳' },
  { id: 'US', label: 'US & Global Cross-Border (USD $)', icon: 'fa-globe', flag: '🇺🇸' },
];

export function AdminScopeProvider({ children }) {
  const [scope, setScopeState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('healnari_admin_scope');
      return saved ? JSON.parse(saved) : GLOBAL_SCOPE;
    } catch {
      return GLOBAL_SCOPE;
    }
  });

  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);

  const fetchClinics = useCallback(async () => {
    setLoadingClinics(true);
    try {
      const data = await apiFetch('/admin/clinics');
      if (Array.isArray(data)) {
        setClinics(data);
      }
    } catch (err) {
      console.warn('Failed to load real clinics in AdminScopeProvider:', err.message);
    } finally {
      setLoadingClinics(false);
    }
  }, []);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  const setScope = useCallback((newScope) => {
    const next = newScope || GLOBAL_SCOPE;
    setScopeState(next);
    try {
      sessionStorage.setItem('healnari_admin_scope', JSON.stringify(next));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('admin-scope-changed', { detail: next }));
  }, []);

  const resetScope = useCallback(() => {
    setScope(GLOBAL_SCOPE);
  }, [setScope]);

  return (
    <AdminScopeContext.Provider
      value={{
        scope,
        setScope,
        resetScope,
        clinics,
        loadingClinics,
        refreshClinics: fetchClinics,
        specialties: CLINICAL_SPECIALTIES,
        regions: REGIONAL_FACILITIES,
      }}
    >
      {children}
    </AdminScopeContext.Provider>
  );
}

export function useAdminScope() {
  const ctx = useContext(AdminScopeContext);
  if (!ctx) {
    return {
      scope: GLOBAL_SCOPE,
      setScope: () => {},
      resetScope: () => {},
      clinics: [],
      loadingClinics: false,
      refreshClinics: () => {},
      specialties: CLINICAL_SPECIALTIES,
      regions: REGIONAL_FACILITIES,
    };
  }
  return ctx;
}
