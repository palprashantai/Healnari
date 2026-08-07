import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const DEMO_PATIENT = {
  role: 'patient',
  name: 'Priya Sharma',
  email: 'priya.sharma@example.com',
  phone: '+91 98765 43210',
  dob: '1996-04-12',
  bloodGroup: 'B+',
  height: '163',
  weight: '64.5',
  city: 'Mumbai',
};

export const DEMO_DOCTOR = {
  role: 'doctor',
  name: 'Dr. Sarah Mitchell',
  email: 'sarah.mitchell@healnari.app',
  phone: '+91 98765 00001',
  specialty: 'Gynaecology & Obstetrics',
  qualification: 'MBBS, MD (OBG)',
  regNo: 'MCI-29402',
  experience: '12 Years',
  clinicName: 'HealNari Women\'s Clinic — Bandra',
  clinicAddress: 'Shop 4, Mehta Plaza, Bandra West, Mumbai — 400050',
  consultFee: 799,
  bio: 'Expert in menstrual irregularities, endometriosis, adolescent gynaecology, and PCOS reversal protocols.',
};

export const DEMO_ADMIN = {
  role: 'admin',
  name: 'System Administrator',
  email: 'admin@healnari.app',
  accessLevel: 'Super Admin',
  region: 'India Operations',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-detect which portal is being accessed
    const isAdmin   = window.location.pathname.startsWith('/admin-dashboard');
    const isDoctor  = window.location.pathname.startsWith('/doctor-dashboard');
    const isPatient = window.location.pathname.startsWith('/patient-dashboard');

    const storedUser = localStorage.getItem('healnari_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // If role doesn't match the URL, swap to the correct demo user
        if (isAdmin && parsed.role !== 'admin') {
          setUser(DEMO_ADMIN);
          localStorage.setItem('healnari_user', JSON.stringify(DEMO_ADMIN));
        } else if (isDoctor && parsed.role !== 'doctor') {
          setUser(DEMO_DOCTOR);
          localStorage.setItem('healnari_user', JSON.stringify(DEMO_DOCTOR));
        } else if (isPatient && parsed.role !== 'patient') {
          setUser(DEMO_PATIENT);
          localStorage.setItem('healnari_user', JSON.stringify(DEMO_PATIENT));
        } else {
          setUser(parsed);
        }
      } catch (e) {
        const demo = isAdmin ? DEMO_ADMIN : isDoctor ? DEMO_DOCTOR : DEMO_PATIENT;
        setUser(demo);
        localStorage.setItem('healnari_user', JSON.stringify(demo));
      }
    } else {
      const demo = isAdmin ? DEMO_ADMIN : isDoctor ? DEMO_DOCTOR : DEMO_PATIENT;
      setUser(demo);
      localStorage.setItem('healnari_user', JSON.stringify(demo));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('healnari_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('healnari_user');
    // Re-set demo user after brief delay to allow redirect then re-login
    setTimeout(() => {
      setUser(DEMO_PATIENT);
      localStorage.setItem('healnari_user', JSON.stringify(DEMO_PATIENT));
    }, 1500);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('healnari_user', JSON.stringify(updated));
  };

  const value = { user, login, logout, updateUser, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
