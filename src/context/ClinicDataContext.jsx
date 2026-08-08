import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { apiFetch } from '../lib/apiClient.js';

const ClinicDataContext = createContext(null);

export function useClinicData() {
  return useContext(ClinicDataContext);
}

export function ClinicDataProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [cycleLogs, setCycleLogs] = useState({});
  const [kycVerified, setKycVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Adapts backend patient format to frontend expectations
  const adaptPatient = (data) => {
    if (!data || !data.profile) return null;
    const { profile, record, prescriptions = [], lab_reports = [], clinical_notes = [], payments = [] } = data;
    
    // map backend meds to frontend expected shape
    const meds = prescriptions.map(p => ({
      id: p.id,
      name: p.medicine_name,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      instructions: p.instructions,
      prescribedOn: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
      refillsLeft: p.refills_left || 0,
      validTill: p.valid_till || '',
      refillRequested: p.refill_requested || false
    }));

    return {
      id: profile.id, // using UUID string instead of number
      name: profile.full_name || 'Unknown',
      phone: profile.phone || '',
      email: profile.email || '',
      diagnosis: record?.chronic_conditions?.[0] || 'Pending',
      address: '',
      age: record?.dob ? Math.floor((new Date() - new Date(record.dob)) / 31557600000) : '—',
      blood: record?.blood_group || '—',
      mrn: record?.mrn || `MRN-${profile.id.slice(0, 4)}`,
      dob: record?.dob || '',
      since: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '',
      visits: 0,
      lastVisit: null,
      nextVisit: null,
      status: 'active',
      alert: record?.chronic_conditions?.length ? record.chronic_conditions[0] : null,
      height: record?.height_cm || '—',
      weight: record?.weight_kg || '—',
      bmi: '—', bp: '—', pulse: '—', spo2: '—', temp: '—', bloodSugar: '—',
      allergies: record?.allergies || [],
      meds,
      reports: lab_reports.map(r => ({ id: r.id, testName: r.test_name, date: new Date(r.created_at).toLocaleDateString(), results: r.results, urgent: r.is_urgent })),
      consultations: [],
      medicalHistory: { chronicConditions: record?.chronic_conditions || [], surgeries: [], familyHistory: [], lifestyle: '' },
      clinicalNotes: clinical_notes,
      payments: payments,
    };
  };

  const adaptAppointment = (a) => ({
    id: a.id,
    patientName: a.patientName || 'Unknown',
    doctorName: a.doctorName || 'Unknown',
    patientId: a.patient_id,
    doctorId: a.doctor_id,
    type: a.type === 'video' ? 'Video Consult' : 'Clinic Visit',
    date: a.scheduled_date,
    time: a.scheduled_time,
    status: a.status, // Requested, Upcoming, Waiting, In Progress, Done, Cancelled
    reason: a.reason || 'Follow-up'
  });

  const fetchData = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setAppointments([]);
      setLoading(false);
      return;
    }

    try {
      if (user.role === 'doctor') {
        const pts = await apiFetch('/patients');
        setPatients(pts.map(adaptPatient).filter(Boolean));
      } else {
        const me = await apiFetch('/patients/me');
        if (me) setPatients([adaptPatient(me)]);
        
        const logs = await apiFetch('/patients/me/cycle-logs');
        const logMap = {};
        logs.forEach(l => {
          logMap[l.log_date] = { phase: l.phase, flow: l.flow, cramps: l.cramps, mood: l.mood, symptoms: l.symptoms };
        });
        setCycleLogs(logMap);
      }

      const apts = await apiFetch('/appointments');
      setAppointments(apts.map(adaptAppointment));
    } catch (err) {
      console.error('Failed to fetch clinic data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  /* ── Patients ──────────────────────────────────────────────── */
  const updatePatient = async (updated) => {
    // Optimistic
    setPatients(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    try {
      const res = await apiFetch(`/patients/${updated.id}`, {
        method: 'PUT',
        body: { name: updated.name, phone: updated.phone, dob: updated.dob, bloodGroup: updated.blood, allergies: updated.allergies }
      });
      // Sync back
      setPatients(prev => prev.map(p => (p.id === updated.id ? adaptPatient(res) : p)));
    } catch (err) {
      console.error(err);
      fetchData(); // rollback on error
    }
  };

  const addPatient = async ({ name, phone = '', email = '', blood = '—' }) => {
    try {
      const res = await apiFetch('/patients', {
        method: 'POST',
        body: { name, phone, email, bloodGroup: blood === '—' ? null : blood }
      });
      const newPatient = adaptPatient(res);
      setPatients(prev => [...prev, newPatient]);
      return newPatient;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const addRx = async (patientId, med) => {
    try {
      const res = await apiFetch('/records/prescriptions', {
        method: 'POST',
        body: {
          patientId,
          medName: med.name,
          dosage: med.dosage,
          schedule: med.frequency,
          duration: med.duration,
          instructions: med.instructions
        }
      });
      fetchData(); // Reload patients to get the new prescription
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleRefillAction = async (patientId, medId, action) => {
    // Optimistic update
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        meds: p.meds.map(m => {
          if (m.id !== medId) return m;
          if (action === 'approve') return { ...m, refillRequested: false, refillsLeft: m.refillsLeft + 1 };
          return { ...m, refillRequested: false };
        }),
      };
    }));

    try {
      await apiFetch(`/records/prescriptions/${medId}/refill`, {
        method: 'PUT',
        body: { action }
      });
    } catch (err) {
      console.error(err);
      fetchData(); // Rollback on error
    }
  };

  const approveRefill = (patientId, medId) => handleRefillAction(patientId, medId, 'approve');
  const rejectRefill = (patientId, medId) => handleRefillAction(patientId, medId, 'reject');

  const refillRequests = useMemo(() => {
    const out = [];
    patients.forEach(p => {
      p.meds.forEach(m => {
        if (m.refillRequested) out.push({ patientId: p.id, patient: p.name, med: m });
      });
    });
    return out;
  }, [patients]);

  /* ── Appointments ──────────────────────────────────────────── */
  const addAppointment = async (partial) => {
    try {
      const aptParams = {
        doctorId: partial.doctorId || user.id,
        type: partial.type === 'Video Consult' ? 'video' : 'clinic',
        scheduledDate: partial.date,
        scheduledTime: partial.time,
        reason: partial.reason || ''
      };
      const res = await apiFetch('/appointments', { method: 'POST', body: aptParams });
      const newApt = adaptAppointment(res);
      setAppointments(prev => [...prev, newApt]);
      return newApt;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateAppointmentStatus = async (id, status) => {
    setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    try {
      await apiFetch(`/appointments/${id}/status`, { method: 'PUT', body: { status } });
    } catch (err) {
      console.error(err);
      fetchData(); // Rollback
    }
  };

  const cancelAppointment = (id) => updateAppointmentStatus(id, 'Cancelled');
  const approveRequest = (id) => updateAppointmentStatus(id, 'Upcoming');
  const rejectRequest = (id) => updateAppointmentStatus(id, 'Cancelled');

  const callNextForDoctor = async (doctorName) => {
    try {
      const res = await apiFetch('/appointments/call-next', { method: 'POST' });
      setAppointments(res.map(adaptAppointment));
    } catch (err) {
      console.error(err);
    }
  };

  /* ── Cycle logs ────────────────────────────────────────────── */
  const logCycle = async (dateKey, fields) => {
    setCycleLogs(prev => ({ ...prev, [dateKey]: { ...prev[dateKey], ...fields } }));
    try {
      await apiFetch(`/patients/me/cycle-logs/${dateKey}`, { method: 'PUT', body: fields });
    } catch (err) {
      console.error(err);
    }
  };

  const verifyKyc = () => setKycVerified(true);

  const value = {
    patients, updatePatient, addPatient, addRx, approveRefill, rejectRefill, refillRequests,
    appointments, addAppointment, updateAppointmentStatus, cancelAppointment,
    approveRequest, rejectRequest, callNextForDoctor,
    cycleLogs, logCycle,
    kycVerified, verifyKyc,
  };

  return <ClinicDataContext.Provider value={value}>{loading ? null : children}</ClinicDataContext.Provider>;
}
