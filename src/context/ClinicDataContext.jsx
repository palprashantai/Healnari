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
  const [vitals, setVitals] = useState({});
  const [lifestyleLogs, setLifestyleLogs] = useState({});
  const [careConnections, setCareConnections] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  // AUDIT_REPORT.md FE-1 — a failed load used to look identical to a
  // genuinely empty account (every page just silently rendered its empty
  // state). Surfaced so the UI can show "couldn't load — retry" instead.
  const [loadError, setLoadError] = useState(null);

  // Backend is the source of truth for KYC status — reflect it whenever the
  // logged-in user changes (login, or a fresh /auth/me after a refresh).
  // kycVerified only ever becomes true via admin approval; kycSubmitted just
  // means the doctor sent documents in and is waiting on that review — the
  // two must stay distinguishable or the UI ends up claiming "Verified"
  // for someone who's still pending, and every verified-only endpoint they
  // then hit 403s with no explanation.
  useEffect(() => {
    setKycVerified(!!user?.kycVerified);
    setKycSubmitted(!!user?.kycSubmittedAt);
  }, [user]);

  // Adapts backend patient format to frontend expectations
  const adaptPatient = (data) => {
    if (!data || !data.profile) return null;
    const { profile, record, prescriptions = [], lab_reports = [], clinical_notes = [], payments = [] } = data;
    
    // map backend meds to frontend expected shape
    const meds = prescriptions.map(p => ({
      id: p.id,
      groupId: p.group_id || p.id, // legacy rows with no group_id are their own single-medicine group
      diagnosis: p.diagnosis || '',
      name: p.med_name,
      dosage: p.dosage,
      frequency: p.schedule,
      duration: p.duration,
      instructions: p.instructions,
      doctor: p.doctor_name || 'Your Doctor',
      doctorSpecialty: p.doctor_specialty || '',
      doctorRegNo: p.doctor_registration_no || '',
      prescribedOn: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
      prescribedOnRaw: p.created_at || '',
      refillsLeft: p.refills_left || 0,
      validTill: p.valid_till || '',
      refillRequested: p.refill_requested || false,
      status: p.status || 'Active',
      appointmentId: p.appointment_id || null,
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
      city: record?.city || '',
      bmi: '—', bp: '—', pulse: '—', spo2: '—', temp: '—', bloodSugar: '—',
      allergies: record?.allergies || [],
      meds,
      reports: lab_reports.map(r => ({
        id: r.id,
        testName: r.test_name,
        testCategory: r.test_category || 'General',
        labName: r.lab_name || '',
        date: new Date(r.created_at).toLocaleDateString(),
        dateRaw: r.created_at || '',
        status: r.status,
        results: r.results,
        urgent: r.urgent,
        interpretation: r.interpretation,
        doctorAction: r.doctor_action,
        appointmentId: r.appointment_id || null,
      })),
      consultations: [],
      medicalHistory: { chronicConditions: record?.chronic_conditions || [], surgeries: [], familyHistory: [], lifestyle: '' },
      clinicalNotes: clinical_notes.map(n => ({
        id: n.id,
        text: n.note,
        date: n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        dateRaw: n.created_at || '',
        author: n.doctor_name || 'Your Doctor',
      })),
      payments: payments.map(p => ({
        id: p.id,
        date: new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        service: p.service,
        category: p.category || 'General',
        amount: Number(p.amount),
        status: p.status,
        method: p.method || '—',
        txnRef: p.txn_ref || '',
      })),
    };
  };

  const adaptCareConnection = (c) => ({
    id: c.id,
    name: c.invitee_name,
    email: c.invitee_email,
    relation: c.relation,
    invitedOn: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    status: c.status,
    avatar: c.invitee_name.slice(0, 2).toUpperCase(),
    permissions: c.permissions,
    inviteToken: c.invite_token,
  });

  const adaptAppointment = (a) => ({
    id: a.id,
    patientName: a.patientName || 'Unknown',
    doctorName: a.doctorName || 'Unknown',
    patientId: a.patient_id,
    doctorId: a.doctor_id,
    type: a.type === 'video' ? 'Video Consult' : 'Clinic Visit',
    specialty: a.specialty || '',
    country: a.country || 'US',
    currency: a.currency || 'INR',
    fee: a.fee || null,
    paymentId: a.payment_id || null,
    date: a.scheduled_date,
    time: a.scheduled_time,
    status: a.status, // Requested, Approved, HOLD, Upcoming, Waiting, In Progress, Done, Cancelled, No Show
    reason: a.reason || 'Follow-up',
    rescheduledAt: a.rescheduled_at || null,
    rescheduledFromDate: a.rescheduled_from_date || null,
    rescheduledFromTime: a.rescheduled_from_time || null,
    rescheduleReason: a.reschedule_reason || null,
    cancellationReason: a.cancellation_reason || null,
    cancelledAt: a.cancelled_at || null,
  });

  const fetchData = useCallback(async () => {
    if (!user) {
      setPatients([]);
      setAppointments([]);
      setCycleLogs({});
      setVitals({});
      setLifestyleLogs({});
      setCareConnections([]);
      setFavorites([]);
      setWaitlist([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoadError(null);
    try {
      // AUDIT_REPORT.md FE-3 — these don't depend on each other, so run them
      // together instead of one-by-one; on every page load this used to add
      // up to 8-9 sequential round trips before the loading spinner cleared.
      if (user.role === 'doctor') {
        const pts = await apiFetch('/patients').catch(() => []);
        setPatients(Array.isArray(pts) ? pts.map(adaptPatient).filter(Boolean) : []);
      } else if (user.role === 'patient') {
        const [me, logs, vitalsData, lifestyle, connections, favs, wait, txns] = await Promise.all([
          apiFetch('/patients/me'),
          apiFetch('/patients/me/cycle-logs'),
          apiFetch('/patients/me/vitals'),
          apiFetch('/patients/me/lifestyle-logs'),
          apiFetch('/patients/me/care-connections'),
          apiFetch('/patients/me/favorites'),
          apiFetch('/patients/me/waitlist'),
          apiFetch('/billing/transactions'),
        ]);

        if (me) setPatients([adaptPatient(me)]);

        const logMap = {};
        logs.forEach(l => {
          logMap[l.log_date] = { phase: l.phase, flow: l.flow, cramps: l.cramps, mood: l.mood, symptoms: l.symptoms };
        });
        setCycleLogs(logMap);

        setVitals(vitalsData);

        const lifestyleMap = {};
        lifestyle.forEach(l => {
          lifestyleMap[l.log_date] = { items: l.items, completedCount: l.completed_count };
        });
        setLifestyleLogs(lifestyleMap);

        setCareConnections(connections.map(adaptCareConnection));
        setFavorites(favs.map(f => f.doctor_id));
        setWaitlist(wait);
        setTransactions(txns);
      }

      if (user.role === 'doctor' || user.role === 'patient') {
        const apts = await apiFetch('/appointments');
        setAppointments(apts.map(adaptAppointment));
      }
    } catch (err) {
      console.error('Failed to fetch clinic data:', err);
      setLoadError(err.message || "We couldn't load your data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  // `appointments` is only ever populated by the fetchData() above (once, on
  // login) — there's no polling or socket-driven refresh. That's normally
  // fine, but a call the other party started *after* this session's initial
  // fetch (an instant call, or any brand-new appointment) won't be in this
  // list yet. Callers that need to react to a specific incoming appointmentId
  // right now (the incoming-call accept flow) use this to pull fresh data
  // and get the answer back immediately, instead of waiting on next render's
  // stale closure over `appointments`.
  const refreshAppointments = useCallback(async () => {
    if (!user || (user.role !== 'doctor' && user.role !== 'patient')) return appointments;
    try {
      const apts = await apiFetch('/appointments');
      const adapted = apts.map(adaptAppointment);
      setAppointments(adapted);
      return adapted;
    } catch (err) {
      console.warn('Failed to refresh appointments in background:', err);
      return appointments;
    }
  }, [user]);

  // Real-time reactive sync: automatically reload appointments when socket notifications arrive
  useEffect(() => {
    const handleUpdate = () => {
      refreshAppointments();
    };
    window.addEventListener('healnari_appointments_updated', handleUpdate);
    return () => window.removeEventListener('healnari_appointments_updated', handleUpdate);
  }, [refreshAppointments]);

  const refreshPatientsOnly = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'doctor') {
        const pts = await apiFetch('/patients');
        setPatients(pts.map(adaptPatient).filter(Boolean));
      } else if (user.role === 'patient') {
        const me = await apiFetch('/patients/me');
        if (me) setPatients([adaptPatient(me)]);
      }
    } catch (err) {
      console.warn('Failed to refresh patients:', err);
    }
  }, [user]);

  /* ── Patients ──────────────────────────────────────────────── */
  const updatePatient = useCallback(async (updated) => {
    // Optimistic
    setPatients(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    try {
      const res = await apiFetch(`/patients/${updated.id}`, {
        method: 'PUT',
        body: {
          name: updated.name, phone: updated.phone, dob: updated.dob, bloodGroup: updated.blood,
          city: updated.city, allergies: updated.allergies, chronicConditions: updated.medicalHistory?.chronicConditions,
          heightCm: updated.height, weightKg: updated.weight,
        }
      });
      // Sync back
      setPatients(prev => prev.map(p => (p.id === updated.id ? adaptPatient(res) : p)));
    } catch (err) {
      console.error(err);
      fetchData(); // rollback on error
      throw err;
    }
  }, [fetchData]);

  const addPatient = useCallback(async ({ name, phone = '', email = '', blood = '—' }) => {
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
  }, []);

  /** Issues one prescription with all its medicines saved together (shared
   * group_id server-side) — rx: { diagnosis, instructions, medicines: [{ name, dosage, frequency, duration }] } */
  const addRx = useCallback(async (patientId, rx) => {
    try {
      const res = await apiFetch('/records/prescriptions', {
        method: 'POST',
        body: {
          patientId,
          appointmentId: rx.appointmentId,
          diagnosis: rx.diagnosis,
          instructions: rx.instructions,
          handwrittenImage: rx.handwrittenImage,
          isDraft: rx.isDraft !== undefined ? rx.isDraft : true,
          idempotencyKey: rx.idempotencyKey,
          medicines: rx.medicines.map(m => ({
            medName: m.name,
            dosage: m.dosage,
            schedule: m.frequency,
            duration: m.duration,
          })),
        }
      });
      refreshPatientsOnly(); // Scoped reload instead of 8-endpoint full platform fetch
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const finalizeRx = useCallback(async (groupId) => {
    try {
      const res = await apiFetch(`/records/prescriptions/${groupId}/finalize`, { method: 'PUT' });
      refreshPatientsOnly();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const cancelRx = useCallback(async (groupId) => {
    try {
      const res = await apiFetch(`/records/prescriptions/${groupId}/cancel`, { method: 'PUT' });
      refreshPatientsOnly();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const uploadLabReport = useCallback(async (patientId, file, meta = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      if (meta.testName) formData.append('testName', meta.testName);
      if (meta.testCategory) formData.append('testCategory', meta.testCategory);
      if (meta.labName) formData.append('labName', meta.labName);
      if (meta.reportDate) formData.append('reportDate', meta.reportDate);
      if (meta.notes) formData.append('notes', meta.notes);
      if (meta.urgent) formData.append('urgent', 'true');
      if (meta.requestId) formData.append('requestId', meta.requestId);
      if (meta.appointmentId) formData.append('appointmentId', meta.appointmentId);

      const res = await apiFetch('/records/lab-reports/upload', { method: 'POST', body: formData });
      refreshPatientsOnly();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const deleteLabReport = useCallback(async (id) => {
    try {
      const res = await apiFetch(`/records/lab-reports/${id}`, { method: 'DELETE' });
      refreshPatientsOnly();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const getLabReportUrl = useCallback((id) => apiFetch(`/records/lab-reports/${id}/url`), []);

  const requestLabReport = useCallback(async (patientId, { requestedTests, dueDate, notes, appointmentId } = {}) => {
    try {
      const res = await apiFetch('/records/lab-report-requests', {
        method: 'POST',
        body: { patientId, requestedTests, dueDate, notes, appointmentId },
      });
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const listLabReportRequests = useCallback((patientId) => {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return apiFetch(`/records/lab-report-requests${query}`);
  }, []);

  const cancelLabReportRequest = useCallback((id) => apiFetch(`/records/lab-report-requests/${id}/cancel`, { method: 'PUT' }), []);

  const addClinicalNote = useCallback(async (patientId, note) => {
    try {
      const res = await apiFetch('/records/notes', { method: 'POST', body: { patientId, note } });
      refreshPatientsOnly();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const recordCharge = useCallback(async (patientId, charge) => {
    try {
      const res = await apiFetch('/billing/charges', {
        method: 'POST',
        body: {
          patientId,
          service: charge.service,
          category: charge.category,
          amount: charge.amount,
          method: charge.method,
          status: charge.status,
        }
      });
      setTransactions(prev => [res, ...prev]);
      refreshPatientsOnly();
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [refreshPatientsOnly]);

  const handleRefillAction = useCallback(async (patientId, medId, action) => {
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
      
      apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: action === 'approve' ? 'Prescription Refill Approved' : 'Prescription Refill Update',
          body: action === 'approve' 
            ? 'Your prescription refill request has been approved by your doctor.'
            : 'Your prescription refill request was reviewed by your doctor. Please check your portal for more details.',
          channels: ['Push Notification', 'Email'],
          scheduleType: 'immediate',
          patientIds: [patientId],
        },
      }).catch(() => {});
      
    } catch (err) {
      console.error(err);
      fetchData(); // Rollback on error
      throw err;
    }
  }, [fetchData]);

  const approveRefill = useCallback((patientId, medId) => handleRefillAction(patientId, medId, 'approve'), [handleRefillAction]);
  const rejectRefill = useCallback((patientId, medId) => handleRefillAction(patientId, medId, 'reject'), [handleRefillAction]);

  /** Patient-initiated: flags their own prescription line as needing a refill. */
  const requestRefill = useCallback(async (medId) => {
    setPatients(prev => prev.map(p => ({
      ...p,
      meds: p.meds.map(m => (m.id === medId ? { ...m, refillRequested: true } : m)),
    })));
    try {
      await apiFetch(`/records/prescriptions/${medId}/request-refill`, { method: 'PUT' });
    } catch (err) {
      console.error(err);
      fetchData(); // rollback
    }
  }, [fetchData]);

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
  const addAppointment = useCallback(async (partial) => {
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
  }, [user]);

  const updateAppointmentStatus = useCallback(async (id, status) => {
    const prev = appointments;
    setAppointments(cur => cur.map(a => (a.id === id ? { ...a, status } : a)));
    try {
      const res = await apiFetch(`/appointments/${id}/status`, { method: 'PUT', body: { status } });
      const newApt = adaptAppointment(res);
      setAppointments(cur => cur.map(a => (a.id === id ? newApt : a)));
      return newApt;
    } catch (err) {
      console.error(err);
      setAppointments(prev); // Rollback
      throw err;
    }
  }, [appointments]);

  /** Single source of truth for "is this appointment paid" — both Billing.jsx
   * and Appointments.jsx read `transactions` from here instead of each
   * fetching their own copy, so a payment made on one page is immediately
   * reflected on the other. */
  const syncPayment = useCallback((payment) => {
    if (!payment?.id) return;
    setTransactions(prev => {
      const idx = prev.findIndex(t => t.id === payment.id);
      if (idx === -1) return [payment, ...prev];
      const next = [...prev];
      next[idx] = payment;
      return next;
    });
  }, []);

  const cancelAppointment = useCallback(async (id, reason) => {
    try {
      const res = await apiFetch(`/appointments/${id}/status`, { 
        method: 'PUT', 
        body: { status: 'Cancelled', cancellationReason: reason } 
      });
      const newApt = adaptAppointment(res);
      setAppointments(cur => cur.map(a => (a.id === id ? newApt : a)));
      return newApt;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const rescheduleAppointment = useCallback(async (id, newDate, newTime, reason) => {
    try {
      const res = await apiFetch(`/appointments/${id}/reschedule`, {
        method: 'POST',
        body: { newDate, newTime, reason }
      });
      const newApt = adaptAppointment(res);
      setAppointments(cur => cur.map(a => (a.id === id ? newApt : a)));
      return newApt;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const approveRequest = useCallback((id) => updateAppointmentStatus(id, 'Approved'), [updateAppointmentStatus]);
  const rejectRequest = useCallback((id) => cancelAppointment(id, 'Request rejected by doctor'), [cancelAppointment]);

  const callNextForDoctor = useCallback(async (doctorName) => {
    try {
      const res = await apiFetch('/appointments/call-next', { method: 'POST' });
      setAppointments(res.map(adaptAppointment));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  /* ── Cycle logs ────────────────────────────────────────────── */
  const logCycle = useCallback(async (dateKey, fields) => {
    const prev = cycleLogs[dateKey];
    setCycleLogs(p => ({ ...p, [dateKey]: { ...p[dateKey], ...fields } }));
    try {
      await apiFetch(`/patients/me/cycle-logs/${dateKey}`, { method: 'PUT', body: fields });
    } catch (err) {
      console.error(err);
      setCycleLogs(p => {
        const next = { ...p };
        if (prev === undefined) delete next[dateKey]; else next[dateKey] = prev;
        return next;
      });
      throw err;
    }
  }, [cycleLogs]);

  /* ── Vitals ────────────────────────────────────────────────── */
  const logVital = useCallback(async (key, value, unit) => {
    const prev = vitals[key];
    try {
      const res = await apiFetch(`/patients/me/vitals/${key}`, { method: 'PUT', body: { value, unit } });
      setVitals(p => ({ ...p, [key]: res }));
      return res;
    } catch (err) {
      console.error(err);
      setVitals(p => ({ ...p, [key]: prev }));
      throw err;
    }
  }, [vitals]);

  /* ── Lifestyle logs ────────────────────────────────────────── */
  const logLifestyle = useCallback(async (dateKey, items) => {
    const prev = lifestyleLogs[dateKey];
    const completedCount = Object.values(items).filter(Boolean).length;
    setLifestyleLogs(p => ({ ...p, [dateKey]: { items, completedCount } }));
    try {
      const res = await apiFetch(`/patients/me/lifestyle-logs/${dateKey}`, { method: 'PUT', body: { items } });
      setLifestyleLogs(p => ({ ...p, [dateKey]: { items: res.items, completedCount: res.completed_count } }));
      return res;
    } catch (err) {
      console.error(err);
      setLifestyleLogs(p => {
        const next = { ...p };
        if (prev === undefined) delete next[dateKey]; else next[dateKey] = prev;
        return next;
      });
      throw err;
    }
  }, [lifestyleLogs]);

  /* ── Care circle connections ──────────────────────────────── */
  const inviteConnection = useCallback(async (email, relation) => {
    try {
      const res = await apiFetch('/patients/me/care-connections', { method: 'POST', body: { email, relation } });
      const newConn = adaptCareConnection(res);
      setCareConnections(prev => [newConn, ...prev]);
      return newConn;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const updateConnectionPermissions = useCallback(async (id, permissions) => {
    setCareConnections(prev => prev.map(c => (c.id === id ? { ...c, permissions } : c)));
    try {
      await apiFetch(`/patients/me/care-connections/${id}/permissions`, { method: 'PUT', body: { permissions } });
    } catch (err) {
      console.error(err);
      fetchData(); // rollback
      throw err;
    }
  }, [fetchData]);

  const removeConnection = useCallback(async (id) => {
    const prev = careConnections;
    setCareConnections(cur => cur.filter(c => c.id !== id));
    try {
      await apiFetch(`/patients/me/care-connections/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
      setCareConnections(prev); // rollback
      throw err;
    }
  }, [careConnections]);

  /* ── Discovery favourites ─────────────────────────────────── */
  const toggleFavorite = useCallback(async (doctorId) => {
    const isFav = favorites.includes(doctorId);
    setFavorites(prev => (isFav ? prev.filter(id => id !== doctorId) : [...prev, doctorId]));
    try {
      if (isFav) await apiFetch(`/patients/me/favorites/${doctorId}`, { method: 'DELETE' });
      else await apiFetch('/patients/me/favorites', { method: 'POST', body: { doctorId } });
    } catch (err) {
      console.error(err);
      setFavorites(prev => (isFav ? [...prev, doctorId] : prev.filter(id => id !== doctorId))); // rollback
      throw err;
    }
  }, [favorites]);

  /* ── Appointment waitlist ─────────────────────────────────── */
  const joinWaitlist = useCallback(async (doctorId, preferredWindow) => {
    try {
      await apiFetch('/patients/me/waitlist', { method: 'POST', body: { doctorId, preferredWindow } });
      const refreshed = await apiFetch('/patients/me/waitlist');
      setWaitlist(refreshed);
      return refreshed[0];
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const leaveWaitlist = useCallback(async (id) => {
    const prev = waitlist;
    setWaitlist(cur => cur.filter(w => w.id !== id));
    try {
      await apiFetch(`/patients/me/waitlist/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
      setWaitlist(prev); // rollback
      throw err;
    }
  }, [waitlist]);

  const verifyKyc = useCallback(async () => {
    try {
      await apiFetch('/doctors/me/kyc', { method: 'PUT' });
      setKycSubmitted(true);
    } catch (err) {
      console.error('Failed to submit KYC', err);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    patients, updatePatient, addPatient, addRx, finalizeRx, cancelRx, addClinicalNote, recordCharge, approveRefill, rejectRefill, requestRefill, refillRequests,
    uploadLabReport, deleteLabReport, getLabReportUrl, requestLabReport, listLabReportRequests, cancelLabReportRequest, refreshPatients: fetchData, fetchData,
    appointments, addAppointment, updateAppointmentStatus, cancelAppointment, rescheduleAppointment, refreshAppointments,
    approveRequest, rejectRequest, callNextForDoctor,
    transactions, syncPayment,
    cycleLogs, logCycle,
    vitals, logVital,
    lifestyleLogs, logLifestyle,
    careConnections, inviteConnection, updateConnectionPermissions, removeConnection,
    favorites, toggleFavorite,
    waitlist, joinWaitlist, leaveWaitlist,
    kycVerified, kycSubmitted, verifyKyc,
    fetchCommunications, sendBroadcast, fetchBroadcasts, sendDirectMessage, createChannel, updateChannel,
    loading, loadError, retryLoad: fetchData,
  }), [
    patients, updatePatient, addPatient, addRx, finalizeRx, cancelRx, addClinicalNote, recordCharge, approveRefill, rejectRefill, requestRefill, refillRequests,
    uploadLabReport, deleteLabReport, getLabReportUrl, requestLabReport, listLabReportRequests, cancelLabReportRequest, fetchData,
    appointments, addAppointment, updateAppointmentStatus, cancelAppointment, rescheduleAppointment, refreshAppointments,
    approveRequest, rejectRequest, callNextForDoctor,
    transactions, syncPayment,
    cycleLogs, logCycle,
    vitals, logVital,
    lifestyleLogs, logLifestyle,
    careConnections, inviteConnection, updateConnectionPermissions, removeConnection,
    favorites, toggleFavorite,
    waitlist, joinWaitlist, leaveWaitlist,
    kycVerified, kycSubmitted, verifyKyc,
    loading, loadError
  ]);

  return (
    <ClinicDataContext.Provider value={value}>
      {loading && user ? (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs flex flex-col items-center justify-center z-50 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center p-2 mb-3 animate-pulse">
            <img src="/brand/logo-icon.svg" alt="HealNari" className="w-full h-full object-contain" onError={(e) => { e.target.src = "/favicon.svg"; }} />
          </div>
          <div className="flex items-center gap-2 text-aubergine-700 font-bold text-xs tracking-wide">
            <div className="w-2 h-2 rounded-full bg-aubergine-600 animate-ping"></div>
            <span>Loading HealNari Workspace…</span>
          </div>
        </div>
      ) : children}
    </ClinicDataContext.Provider>
  );
}
