import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { PaymentModal } from '../../components/PaymentModal.jsx';
import { StepIndicator } from '../../components/StepIndicator.jsx';
import { PatientCarePassModal } from '../../components/PatientCarePassModal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { LIFESTYLE_ITEMS, HEALTH_GOALS, MOVEMENT_CATEGORIES } from '../lifestyleConfig.js';
import { formatCurrency } from '../../lib/currency.js';
import { openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';

/* ─── Reference config (not user data) ───────── */
const CYCLE_PHASES = [
  { id: 'menstrual', label: 'Menstrual', day: 'Day 1–5', color: 'bg-rose-500', text: 'text-rose-600', tip: 'Rest & iron-rich foods. Gentle yoga is helpful.' },
  { id: 'follicular', label: 'Follicular', day: 'Day 6–13', color: 'bg-magenta-500', text: 'text-magenta-600', tip: 'Energy rising! Great time for cardio & learning new skills.' },
  { id: 'ovulation', label: 'Ovulation', day: 'Day 14', color: 'bg-amber-500', text: 'text-amber-600', tip: 'Peak fertility. You may feel more social & energised.' },
  { id: 'luteal', label: 'Luteal', day: 'Day 15–28', color: 'bg-aubergine-500', text: 'text-aubergine-600', tip: 'Progesterone rises. Prioritise sleep & limit caffeine.' },
];

const SYMPTOMS = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Mood Swings', 'Spotting', 'Nausea', 'Back Pain', 'Breast Tenderness', 'Acne'];

const VITALS_CONFIG = {
  weight: { label: 'Weight', icon: 'fa-weight-scale', unit: 'kg', color: 'bg-aubergine-50 text-aubergine-700' },
  bp: { label: 'Blood Pressure', icon: 'fa-heart-pulse', unit: 'mmHg', color: 'bg-rose-50 text-rose-500' },
  sugar: { label: 'Sugar', icon: 'fa-droplet', unit: 'mg/dL', color: 'bg-amber-50 text-amber-500' },
  sleep: { label: 'Sleep', icon: 'fa-moon', unit: 'hrs', color: 'bg-aubergine-50 text-aubergine-600' },
};

const HEALTH_TIPS = [
  { icon: 'fa-glass-water', text: 'Staying hydrated helps regulate hormones — aim for 8–10 glasses of water daily.' },
  { icon: 'fa-bed', text: '7–9 hours of consistent sleep supports healthy insulin and cortisol levels.' },
  { icon: 'fa-dumbbell', text: 'Strength training 2–3x a week can improve insulin sensitivity, especially with PCOS.' },
  { icon: 'fa-leaf', text: 'Low-glycemic foods like whole grains and legumes help keep blood sugar stable.' },
  { icon: 'fa-brain', text: '10 minutes of daily mindfulness can reduce cortisol and ease PMS symptoms.' },
  { icon: 'fa-person-walking', text: 'A short walk after meals can help lower post-meal blood sugar spikes.' },
  { icon: 'fa-moon', text: 'Cutting screen time an hour before bed can meaningfully improve sleep quality.' },
];

/* ─── Date helpers ─────────────────────────────── */
const daysBetweenLocal = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const formatShort = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—';
const daysUntil = (dateStr) => dateStr ? daysBetweenLocal(todayLocalStr(), dateStr.slice(0, 10)) : null;

/* ─── Sub-components ─────────────────────────── */
// Previously this made no API call at all — "Submit" just flipped to a
// success screen claiming "Symptom report sent to Dr. Sarah Mitchell" (a
// hardcoded name with no relation to the patient's real doctor), reviewed
// "within 2 hours". Nothing was ever sent anywhere. There's no patient-facing
// messaging/report backend to route this through for real, but cycle_logs
// already has a working `symptoms` array column — reusing it gives this
// real persistence (visible later on Tracking/Fertility) instead of a lie.
function SymptomCheckerModal({ isOpen, onClose, toast }) {
  const { logCycle, cycleLogs } = useClinicData();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [severity, setSeverity] = useState(3);
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (s) => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Merge with whatever's already logged today (e.g. via Tracking)
      // instead of overwriting it — logCycle's PUT replaces the whole array.
      const existing = cycleLogs[todayLocalStr()]?.symptoms || [];
      const merged = Array.from(new Set([...existing, ...selected]));
      await logCycle(todayLocalStr(), { symptoms: merged });
      setStep(3);
    } catch {
      toast('Could not save your symptom log. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setStep(1); setSelected([]); setSeverity(3); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={reset} title="Symptom Checker" size="md">
      {step < 3 && <StepIndicator step={step} total={2} labels={['Symptoms', 'Severity']} />}
      {step === 1 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm text-slate-600">Select all symptoms you're experiencing today:</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map(s => (
              <button key={s} onClick={() => toggleSymptom(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selected.includes(s) ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                {s}
              </button>
            ))}
          </div>
          <button disabled={selected.length === 0} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Next → Rate Severity
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-5 mt-3">
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Overall Pain / Discomfort Level</p>
            <input type="range" min={1} max={10} value={severity} onChange={e => setSeverity(+e.target.value)}
              className="w-full accent-aubergine-600" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1 - Minimal</span><span className="font-black text-aubergine-600 text-base">{severity}</span><span>10 - Severe</span></div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
            <i className="fas fa-circle-info mr-1.5"></i>
            {severity >= 8
              ? 'High severity — consider booking an appointment or contacting your doctor directly.'
              : "This will be saved to today's cycle log as a personal record — it isn't automatically sent to your care team."}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={saving} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">← Back</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">{saving ? 'Saving…' : 'Save Symptom Log'}</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto"><i className="fas fa-circle-check"></i></div>
          <h4 className="font-black text-slate-800 text-lg">Symptoms Logged</h4>
          <p className="text-sm text-slate-500">
            Saved to today's cycle log.{' '}
            {severity >= 8 ? 'Given the severity you reported, consider booking an appointment.' : 'You can review this anytime on the Tracking or Fertility pages.'}
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 text-left space-y-1">
            <p className="font-bold">Logged Symptoms: <span className="font-normal text-aubergine-700">{selected.join(', ')}</span></p>
            <p className="font-bold">Severity: <span className="font-normal">{severity}/10</span></p>
          </div>
          {severity >= 8 ? (
            <button onClick={() => { reset(); navigate('/patient-dashboard/appointments'); }} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Book an Appointment</button>
          ) : (
            <button onClick={reset} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Done</button>
          )}
        </div>
      )}
    </Modal>
  );
}

function LabReportsModal({ isOpen, onClose }) {
  const [reports, setReports] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      apiFetch('/records/lab-reports').catch(() => []),
      apiFetch('/records/lab-report-requests').catch(() => []),
    ]).then(([r, req]) => {
      setReports(r);
      setRequests(req.filter(x => x.status === 'Pending'));
    }).finally(() => setLoading(false));
  }, [isOpen]);

  const latest = reports[0];
  const goToVault = () => { onClose(); navigate('/patient-dashboard/records'); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lab Reports" size="lg">
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8"><i className="fas fa-spinner fa-spin mr-2"></i>Loading…</p>
      ) : (
        <div className="space-y-4">
          {requests.length > 0 && (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{r.requested_tests}</p>
                    <p className="text-xs text-slate-500">Requested by Dr. {r.doctor_name}{r.due_date ? ` • Due ${new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}</p>
                  </div>
                  <button onClick={goToVault} className="shrink-0 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">Upload</button>
                </div>
              ))}
            </div>
          )}

          {!latest ? (
            <p className="text-sm text-slate-500 text-center py-6">No lab reports on file yet.</p>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 text-sm">{latest.test_name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${latest.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{latest.status}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {latest.lab_name || 'Lab'} • {new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {latest.interpretation && (
                <p className="text-xs text-slate-600 pt-2 mt-2 border-t border-slate-100"><i className="fas fa-circle-info text-slate-500 mr-1"></i>{latest.interpretation}</p>
              )}
            </div>
          )}

          <button onClick={goToVault} className="w-full border border-aubergine-200 text-aubergine-700 font-bold py-2.5 rounded-xl text-sm hover:bg-aubergine-50 transition-colors">
            View & Upload Reports
          </button>
        </div>
      )}
    </Modal>
  );
}

function QuickBookModal({ isOpen, onClose, toast, addAppointment, onBooked }) {
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ doctorId: '', type: 'Video', date: '', slot: '' });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (isOpen) apiFetch('/doctors/search').then(setDoctors).catch(() => setDoctors([]));
  }, [isOpen]);

  useEffect(() => {
    if (!form.doctorId || !form.date) return;
    setSlotsLoading(true);
    setForm(p => ({ ...p, slot: '' }));
    apiFetch(`/doctors/${form.doctorId}/slots?date=${form.date}`)
      .then(res => setSlots(res.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.doctorId, form.date]);

  const selectedDoctor = doctors.find(d => d.id === form.doctorId);

  const confirm = async () => {
    setBooking(true);
    try {
      const saved = await addAppointment({
        doctorId: form.doctorId,
        type: form.type === 'Video' ? 'Video Consult' : 'Clinic Visit',
        date: form.date,
        time: form.slot,
        reason: '',
      });
      onClose();
      toast('Consultation request submitted! The doctor will review your request and you will receive a notification to pay once approved.', 'success');
      if (onBooked) onBooked(saved);
      setStep(1); setForm({ doctorId: '', type: 'Video', date: '', slot: '' });
    } catch (err) {
      toast(err.message || 'Failed to book appointment.', 'error');
    } finally {
      setBooking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Appointment" size="md">
      <StepIndicator step={step} total={2} labels={['Details', 'Confirm']} />
      {step === 1 && (
        <div className="space-y-4 mt-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Doctor</label>
            <select value={form.doctorId} onChange={e => setForm(p => ({ ...p, doctorId: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
              <option value="">-- Choose a specialist --</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.specialty || 'Specialist'})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Consultation Type</label>
            <div className="flex gap-3">
              {['Video', 'Clinic Visit'].map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${form.type === t ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                  <i className={`fas ${t === 'Video' ? 'fa-video' : 'fa-hospital'}`}></i> {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Preferred Date</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              min={todayLocalStr()}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <button disabled={!form.doctorId || !form.date} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            See Available Slots →
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm font-bold text-slate-700">Available slots for {form.date}:</p>
          {slotsLoading ? (
            <p className="text-xs text-slate-400 py-2"><i className="fas fa-spinner fa-spin mr-1.5"></i>Loading slots…</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No slots left for this date — go back and try another date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button key={slot} onClick={() => setForm(p => ({ ...p, slot }))}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${form.slot === slot ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                  {slot}
                </button>
              ))}
            </div>
          )}
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs text-aubergine-800 space-y-1">
            <p className="font-bold">{selectedDoctor?.full_name}</p>
            <p>{form.type} • {form.date} • {form.slot || 'No slot selected'}</p>
            <p className="text-aubergine-600">Fee: {formatCurrency(Number(selectedDoctor?.consultation_fee) > 0 ? Number(selectedDoctor.consultation_fee) : ((selectedDoctor?.currency || 'INR') === 'USD' ? 29 : 799), selectedDoctor?.currency || 'INR')} (Standard Consult)</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">← Back</button>
            <button disabled={!form.slot || booking} onClick={confirm}
              className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <i className={`fas ${booking ? 'fa-spinner fa-spin' : 'fa-lock'}`}></i>
              {booking ? 'Booking…' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function OnboardingModal({ isOpen, onClose, toast }) {
  const { patients, updatePatient } = useClinicData();
  const own = patients?.[0];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ age: '', height: '', weight: '', bloodGroup: '', conditions: [] });
  const [saving, setSaving] = useState(false);

  const CONDITIONS = ['PCOS / PCOD', 'Endometriosis', 'Thyroid Issues', 'Diabetes', 'Hypertension', 'None'];

  const toggleCondition = (c) => setForm(p => ({
    ...p,
    conditions: p.conditions.includes(c) ? p.conditions.filter(x => x !== c) : [...p.conditions, c]
  }));

  const handleComplete = async () => {
    if (!own) { onClose(); return; }
    setSaving(true);
    try {
      const dob = form.age ? `${new Date().getFullYear() - Number(form.age)}-01-01` : own.dob;
      await updatePatient({
        ...own,
        dob,
        blood: form.bloodGroup || own.blood,
        height: form.height || own.height,
        weight: form.weight || own.weight,
        medicalHistory: { ...own.medicalHistory, chronicConditions: form.conditions.filter(c => c !== 'None') },
      });

      if (form.lastPeriodStart) {
        await apiFetch('/patients/me/fertility-prediction/quick-estimate', {
          method: 'POST',
          body: JSON.stringify({
            lastPeriodStart: form.lastPeriodStart,
            periodDurationDays: Number(form.periodDurationDays) || 5,
            cycleLengthDays: Number(form.cycleLengthDays) || 28,
          })
        }).catch(() => {});
      }

      toast('Profile setup complete! Welcome to HealNari.', 'success');
      onClose();
    } catch {
      toast('Could not save your profile right now. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Your Health Profile" size="md">
      <StepIndicator step={step} total={3} labels={['Basic Info', 'Medical History', 'Cycle Data']} />
      {step === 1 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm text-slate-600 mb-2">Let's personalize your care experience. This helps our doctors provide better care.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Age</label>
              <input type="number" inputMode="numeric" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" placeholder="Years" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Blood Group</label>
              <select value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Height (cm)</label>
              <input type="number" inputMode="numeric" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" placeholder="cm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Weight (kg)</label>
              <input type="number" inputMode="numeric" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" placeholder="kg" />
            </div>
          </div>
          <button disabled={!form.age || !form.bloodGroup} onClick={() => setStep(2)}
            className="w-full mt-4 bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Next → Medical History
          </button>
          <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-slate-600 font-semibold">
            Skip for now
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm text-slate-600 mb-2">Do you have any existing medical conditions?</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => toggleCondition(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.conditions.includes(c) ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(3)}
            className="w-full mt-4 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Next → Cycle Setup
          </button>
          <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-slate-600 font-semibold">
            Skip for now
          </button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm text-slate-600 mb-2">When was your last period? This helps us predict your cycle.</p>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">First day of last period</label>
            <input type="date" value={form.lastPeriodStart || ''} max={todayLocalStr()} onChange={e => setForm(p => ({ ...p, lastPeriodStart: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Bleeding duration</label>
              <input type="number" inputMode="numeric" value={form.periodDurationDays || 5} min={1} max={15} onChange={e => setForm(p => ({ ...p, periodDurationDays: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" placeholder="Days" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Cycle length</label>
              <input type="number" inputMode="numeric" value={form.cycleLengthDays || 28} min={15} max={90} onChange={e => setForm(p => ({ ...p, cycleLengthDays: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" placeholder="Days" />
            </div>
          </div>
          <button onClick={handleComplete} disabled={saving}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i> {saving ? 'Saving…' : 'Complete Profile'}
          </button>
          <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-slate-600 font-semibold">
            Skip for now
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ─── Wellness Score ─── */
function WellnessScoreWidget({ vitals, lifestyle, waterCount, moodLogged, discreet }) {
  // Score out of 100
  let score = 50; // base score
  if (vitals && Object.keys(vitals).length > 0) score += 10;
  if (waterCount >= 4) score += 10;
  if (waterCount >= 8) score += 10;
  if (moodLogged) score += 10;
  // Count only real checklist habits (LIFESTYLE_ITEMS keys) — `lifestyle.items`
  // also carries the raw `waterGlasses` counter (any non-zero value is truthy),
  // which isn't a habit itself and would otherwise double-count hydration
  // progress that's already scored above via `waterCount`.
  const completedHabits = lifestyle?.items ? LIFESTYLE_ITEMS.filter(item => lifestyle.items[item.key]).length : 0;
  if (completedHabits > 0) score += (completedHabits * 5);
  score = Math.min(100, score);

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center ${discreet ? 'discreet-blur' : ''}`}>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-aubergine-300 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-magenta-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <h3 className="font-bold text-slate-800 text-sm mb-4 relative z-10">Today's Wellness</h3>

      <div className="relative w-28 h-28 flex items-center justify-center z-10 mb-2">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#EDE7FF" strokeWidth="8" fill="transparent" />
          <circle cx="50" cy="50" r="40" stroke="url(#score-gradient)" strokeWidth="8" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
          <defs>
            <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6B46C1" />
              <stop offset="100%" stopColor="#E23E8C" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-aubergine-700 to-magenta-600">{score}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 font-medium relative z-10">
        {score >= 80 ? "You're doing amazing today!" : score >= 50 ? "Keep up the good habits!" : "Let's log some healthy actions."}
      </p>
    </div>
  );
}

/* ─── Interactive Hydration Tracker ─── */
function HydrationTracker({ waterCount, setWaterCount, toast, discreet }) {
  const goal = 8;
  const pct = Math.min(100, (waterCount / goal) * 100);

  const handleAdd = () => {
    setWaterCount(prev => prev + 1);
    if (waterCount + 1 === goal) toast("Hydration goal reached! 💧", "success");
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden group ${discreet ? 'discreet-blur' : ''}`}>
      {/* Animated water background */}
      <div className="absolute bottom-0 left-0 right-0 bg-aubergine-100/40 transition-all duration-700 ease-out z-0"
        style={{ height: `${pct}%` }}>
        <div className="absolute -top-3 left-0 right-0 h-3 bg-aubergine-200/40 rounded-t-[50%] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-droplet text-aubergine-600"></i>
            <h3 className="font-bold text-slate-800 text-sm">Water Intake</h3>
          </div>
          <p className="text-xs text-slate-500">{waterCount} of {goal} glasses</p>
        </div>
        <button onClick={handleAdd} className="w-10 h-10 rounded-full bg-white shadow-md text-aubergine-600 hover:bg-aubergine-50 flex items-center justify-center text-lg transition-transform active:scale-90">
          <i className="fas fa-plus"></i>
        </button>
      </div>

      <div className="relative z-10 mt-4 flex gap-1 justify-between">
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} className={`h-8 flex-1 rounded-md transition-all duration-300 ${i < waterCount ? 'bg-aubergine-500' : 'bg-slate-100'}`}></div>
        ))}
      </div>
    </div>
  );
}

/* ─── Daily Medication Checklist ─── */
function DailyMedicationChecklist({ meds, requestRefill, toast, discreet }) {
  const navigate = useNavigate();
  const [taken, setTaken] = useState(() => {
    const saved = localStorage.getItem(`meds_taken_${todayLocalStr()}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [refillingId, setRefillingId] = useState(null);

  const toggleMed = (id) => {
    const next = { ...taken, [id]: !taken[id] };
    setTaken(next);
    localStorage.setItem(`meds_taken_${todayLocalStr()}`, JSON.stringify(next));
    if (next[id]) toast("Medication marked as taken", "success");
  };

  // Out-of-refills is safety-relevant (a lapse in medication) — this needs to
  // surface here too, not only on the Prescriptions page a patient might not
  // visit for days.
  const handleRefill = async (e, med) => {
    e.stopPropagation();
    setRefillingId(med.id);
    try {
      await requestRefill(med.id);
      toast('Refill requested — your doctor will review it.', 'success');
    } catch {
      toast('Failed to request refill. Please try again.', 'error');
    } finally {
      setRefillingId(null);
    }
  };

  const list = (meds || []).filter(m => m.status !== 'Draft' && m.status !== 'Cancelled').slice(0, 3);
  if (list.length === 0) return null;
  return (
    <div className={`glass-panel rounded-3xl p-6 ${discreet ? 'discreet-blur' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="fas fa-pills text-aubergine-500"></i>
          <h3 className="font-bold text-slate-800 text-sm">Today's Meds</h3>
        </div>
        <button onClick={() => navigate('/patient-dashboard/prescriptions')} className="text-[10px] font-bold text-aubergine-600 hover:underline uppercase tracking-wide">All</button>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-xl">No active prescriptions.</p>
      ) : (
        <div className="space-y-3">
          {list.map(med => (
            <div key={med.id} onClick={() => toggleMed(med.id)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${taken[med.id] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-aubergine-200 shadow-sm'}`}>
              <div>
                <p className={`font-bold text-sm ${taken[med.id] ? 'text-emerald-800 line-through opacity-70' : 'text-slate-800'}`}>{med.name}</p>
                <p className="text-xs text-slate-500">{med.dosage} • {med.frequency}</p>
                {med.refillsLeft <= 0 && (
                  med.refillRequested ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><i className="fas fa-clock"></i>Refill requested</span>
                  ) : (
                    <button onClick={(e) => handleRefill(e, med)} disabled={refillingId === med.id}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-60 px-2 py-0.5 rounded-full transition-colors">
                      <i className={`fas ${refillingId === med.id ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>{refillingId === med.id ? 'Requesting…' : 'Out of refills — Request'}
                    </button>
                  )
                )}
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-colors shrink-0 ${taken[med.id] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}>
                <i className="fas fa-check"></i>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Mood & Energy Logger ─── */
function MoodEnergyLogger({ logCycle, cycleLogs, toast }) {
  const dateKey = todayLocalStr();
  const currentMood = cycleLogs[dateKey]?.mood;
  const [logging, setLogging] = useState(false);

  const MOODS = [
    { id: 'Joyful', icon: '😊', color: 'bg-amber-100 text-amber-700 border-amber-200', msg: "Glad you're feeling great! Keep that positive energy flowing." },
    { id: 'Calm', icon: '😌', color: 'bg-aubergine-100 text-aubergine-700 border-aubergine-200', msg: "A calm mind is a powerful tool. Enjoy the peace." },
    { id: 'Tired', icon: '🥱', color: 'bg-slate-100 text-slate-700 border-slate-200', msg: "Listen to your body. Rest is productive too." },
    { id: 'Anxious', icon: '😟', color: 'bg-rose-100 text-rose-700 border-rose-200', msg: "Take a deep breath. Hormonal fluctuations can trigger this. Be kind to yourself." },
  ];

  const handleMood = async (m) => {
    if (m.id === currentMood) return;
    setLogging(true);
    try {
      await logCycle(dateKey, { mood: m.id });
      toast(m.msg, 'info');
    } catch {
      toast("Failed to log mood", "error");
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <i className="fas fa-face-smile-beam text-magenta-500"></i>
        <h3 className="font-bold text-slate-800 text-sm">How are you feeling?</h3>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MOODS.map(m => {
          const isSelected = currentMood === m.id;
          return (
            <button key={m.id} onClick={() => handleMood(m)} disabled={logging}
              className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 ${isSelected ? `${m.color} scale-105 shadow-md` : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'}`}>
              <span className="text-2xl mb-1">{m.icon}</span>
              <span className={`text-[10px] font-bold ${isSelected ? '' : 'text-slate-500'}`}>{m.id}</span>
            </button>
          );
        })}
      </div>
      {currentMood && (
        <p className="text-xs text-center mt-4 text-slate-500 font-medium italic animate-fade-in">
          "{MOODS.find(m => m.id === currentMood)?.msg}"
        </p>
      )}
    </div>
  );
}

/* ─── 5 Life-Stage Modes ─── */
export const LIFE_MODES = [
  { id: 'cycle', label: 'Cycle & Wellness', icon: 'fa-droplet', color: 'from-rose-500 to-pink-500', desc: 'Menstrual rhythm & phases' },
  { id: 'pcos', label: 'PCOS & Metabolic', icon: 'fa-sliders', color: 'from-aubergine-600 to-aubergine-800', desc: 'Androgen mapping & insulin' },
  { id: 'ttc', label: 'TTC & Fertility', icon: 'fa-egg', color: 'from-emerald-500 to-teal-600', desc: 'Ovulation peak & BBT shift' },
  { id: 'pregnancy', label: 'Pregnancy Journey', icon: 'fa-baby', color: 'from-amber-500 to-orange-500', desc: 'Fetal growth & milestones' },
  { id: 'menopause', label: 'Perimenopause', icon: 'fa-fire-flame-curved', color: 'from-purple-600 to-rose-500', desc: 'Vasomotor & bone health' },
];

/* ─── Mode-Tailored Feature Cards ─── */
function PregnancyJourneyCard({ navigate, toast }) {
  const [lmpDate, setLmpDate] = useState(() => localStorage.getItem('pregnancy_lmp_date') || '');
  const [gestationalWeek, setGestationalWeek] = useState(18);

  useEffect(() => {
    if (lmpDate) {
      const days = daysBetweenLocal(lmpDate, todayLocalStr());
      setGestationalWeek(Math.max(1, Math.floor(days / 7) + 1));
    }
  }, [lmpDate]);

  const handleSetLmp = () => {
    const d = prompt("When was your last period start date? (YYYY-MM-DD)");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      localStorage.setItem('pregnancy_lmp_date', d);
      setLmpDate(d);
    } else if (d) {
      toast("Invalid date format. Use YYYY-MM-DD", "error");
    }
  };

  const [kicksToday, setKicksToday] = useState(() => {
    const saved = localStorage.getItem(`kicks_${todayLocalStr()}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleAddKick = () => {
    const next = kicksToday + 1;
    setKicksToday(next);
    localStorage.setItem(`kicks_${todayLocalStr()}`, String(next));
    toast(`Fetal kick logged! Total today: ${next}`, 'success');
  };

  return (
    <div className="glass-panel rounded-3xl p-6 lg:col-span-2 bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-white border border-amber-200/80 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md shadow-amber-300">
            <i className="fas fa-baby"></i>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">Pregnancy Journey</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-amber-800 font-semibold">
                {lmpDate ? `Week ${gestationalWeek} of 40` : 'Set your dates to track progress'}
              </p>
              {!lmpDate && <button onClick={handleSetLmp} className="text-[9px] font-bold bg-white px-2 py-0.5 rounded-full text-amber-700 border border-amber-200">Set LMP</button>}
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/patient-dashboard/appointments')}
          className="text-[11px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all">
          Antenatal Visits
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Fetal Kick Counter</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{kicksToday} <span className="text-xs text-slate-400 font-bold">kicks today</span></p>
          </div>
          <button onClick={handleAddKick} className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center text-sm shadow-sm transition-all">
            <i className="fas fa-plus"></i>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Screening</p>
          <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1.5 text-amber-800">
            <i className="fas fa-ultrasound"></i> Anatomy Ultrasound (18–22w)
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Daily Maternal Rx</p>
          <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1.5 text-emerald-700">
            <i className="fas fa-pills"></i> Prenatal DHA + Folate
          </p>
        </div>
      </div>

      <div className="bg-white/90 rounded-2xl p-3 text-xs text-slate-600 border border-amber-100 flex items-center gap-2">
        <i className="fas fa-lightbulb text-amber-500"></i>
        <span><strong>Trimester 2 Tip:</strong> Hydrate consistently and sleep on your left side to maximize uteroplacental blood flow.</span>
      </div>
    </div>
  );
}

function PcosMetabolicCard({ navigate }) {
  const { vitals } = useClinicData();
  const mfg = vitals.mfg_score?.value;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:col-span-2 bg-gradient-to-br from-aubergine-50/70 via-purple-50/50 to-white border border-aubergine-200/80 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-aubergine-600 text-white flex items-center justify-center text-xl shadow-md shadow-aubergine-300">
            <i className="fas fa-sliders"></i>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">PCOS & Metabolic Tracker</h3>
            <p className="text-xs text-aubergine-800 font-semibold">Manage your PCOS symptoms and insulin</p>
          </div>
        </div>
        <button onClick={() => navigate('/patient-dashboard/tracking')}
          className="text-[11px] font-black text-aubergine-700 bg-aubergine-100 hover:bg-aubergine-200 px-3 py-1.5 rounded-xl transition-all">
          Update Metrics
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Hirsutism mFG Score</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">{mfg ? `${mfg}/36 points` : 'Not evaluated'}</p>
          <span className="text-[10px] text-aubergine-600 font-bold">{mfg && Number(mfg) >= 8 ? 'Androgen elevation noted' : 'Minimal androgen excess'}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Metabolic Target</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">&le; 95 mg/dL</p>
          <span className="text-[10px] text-emerald-600 font-bold">Fasting glucose target</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">First-Line Protocol</p>
          <p className="text-xs font-black text-slate-800 mt-1 text-aubergine-700">Myo-Inositol 2g + Low-GI diet</p>
          <span className="text-[10px] text-slate-400 font-bold">Improves ovulatory rate</span>
        </div>
      </div>

      <div className="bg-white/90 rounded-2xl p-3 text-xs text-slate-600 border border-purple-100 flex items-center gap-2">
        <i className="fas fa-sparkles text-purple-500"></i>
        <span><strong>Insulin Sensitivity Tip:</strong> Combining protein & healthy fats with carbohydrates reduces postprandial insulin surges.</span>
      </div>
    </div>
  );
}

function TtcFertilityCard({ navigate }) {
  const { vitals } = useClinicData();
  const bbt = vitals.bbt?.value;
  const lh = vitals.lh?.value;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:col-span-2 bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-white border border-emerald-200/80 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-300">
            <i className="fas fa-egg"></i>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">Trying to Conceive (TTC) Hub</h3>
            <p className="text-xs text-emerald-800 font-semibold">Multi-Modal Biomarker Window & Ovulation Peak</p>
          </div>
        </div>
        <button onClick={() => navigate('/patient-dashboard/fertility')}
          className="text-[11px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-all">
          Open Calendar
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Basal Body Temp (BBT)</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">{bbt ? `${bbt} °C` : '36.55 °C'}</p>
          <span className="text-[10px] text-emerald-600 font-bold">{bbt ? 'Biphasic tracking active' : 'Log morning temp'}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">LH Surge Strip</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">{lh ? `T/C: ${lh}` : 'Log LH'}</p>
          <span className="text-[10px] text-teal-600 font-bold">{lh && Number(lh) >= 1 ? 'Peak LH Surge!' : 'Pre-surge window'}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Optimal Timing</p>
          <p className="text-xs font-black text-slate-800 mt-1 text-emerald-700">Days -2, -1, and Ovulation</p>
          <span className="text-[10px] text-slate-400 font-bold">Highest conception window</span>
        </div>
      </div>

      <div className="bg-white/90 rounded-2xl p-3 text-xs text-slate-600 border border-emerald-100 flex items-center gap-2">
        <i className="fas fa-heart text-rose-500"></i>
        <span><strong>Fertility Tip:</strong> Sperm can survive in fertile cervical mucus for up to 5 days before ovulation occurs.</span>
      </div>
    </div>
  );
}

function PerimenopauseCard({ navigate }) {
  const { vitals } = useClinicData();
  const hotflashes = vitals.hotflashes?.value;

  return (
    <div className="glass-panel rounded-3xl p-6 lg:col-span-2 bg-gradient-to-br from-purple-50/70 via-rose-50/50 to-white border border-purple-200/80 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-md shadow-purple-300">
            <i className="fas fa-fire-flame-curved"></i>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">Perimenopause & Menopause Navigator</h3>
            <p className="text-xs text-purple-800 font-semibold">Vasomotor Symptoms, HRT Monitoring & Bone Health</p>
          </div>
        </div>
        <button onClick={() => navigate('/patient-dashboard/tracking')}
          className="text-[11px] font-black text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-xl transition-all">
          Log Symptoms
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Vasomotor Frequency</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">{hotflashes ? `${hotflashes} episodes` : '0 logged today'}</p>
          <span className="text-[10px] text-purple-600 font-bold">Hot flashes & night sweats</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">DEXA & Bone Density</p>
          <p className="text-xs font-black text-slate-800 mt-1 text-rose-700">T-Score Screening Due</p>
          <span className="text-[10px] text-slate-400 font-bold">Osteoporosis prevention</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Cardiovascular Health</p>
          <p className="text-xs font-black text-slate-800 mt-1 text-emerald-700">{vitals.bp?.value ? `BP: ${vitals.bp.value}` : 'Log BP reading'}</p>
          <span className="text-[10px] text-slate-400 font-bold">Heart health monitoring</span>
        </div>
      </div>

      <div className="bg-white/90 rounded-2xl p-3 text-xs text-slate-600 border border-purple-100 flex items-center gap-2">
        <i className="fas fa-shield-heart text-purple-500"></i>
        <span><strong>Bone Health Tip:</strong> Adequate Vitamin D3 (2000 IU) + Calcium (1200 mg) supports bone mass during estrogen transition.</span>
      </div>
    </div>
  );
}

/* ─── Enhanced Cycle Ribbon ─── */
function WeeklyCycleRibbon({ toast }) {
  const { logCycle, cycleLogs } = useClinicData();
  const navigate = useNavigate();

  const dateKey = todayLocalStr();
  const [currentPhase, setCurrentPhase] = useState(() => {
    const dates = Object.keys(cycleLogs).sort().reverse();
    for (const d of dates) { if (cycleLogs[d]?.phase) return cycleLogs[d].phase; }
    return 'follicular';
  });

  const phase = CYCLE_PHASES.find(p => p.id === currentPhase);
  const loggedToday = !!cycleLogs[dateKey]?.phase;

  const logToday = async (id) => {
    try {
      await logCycle(dateKey, { phase: id });
      setCurrentPhase(id);
      toast(`Logged today as ${CYCLE_PHASES.find(p => p.id === id).label} phase.`, 'success');
    } catch {
      toast('Failed to save log.', 'error');
    }
  };

  // Generate 7 days timeline
  const timeline = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = i === 3;
    const isFuture = i > 3;
    return { date: d, dateStr, isToday, isFuture, label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }), dayNum: d.getDate() };
  });

  return (
    <div className="glass-panel rounded-3xl p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <i className="fas fa-moon text-aubergine-500"></i> Cycle & Fertility
          </h3>
          <p className="text-xs text-slate-500 mt-1">{phase.label} Phase • {phase.day}</p>
        </div>
        <button onClick={() => navigate('/patient-dashboard/fertility')}
          className="text-[10px] font-bold text-aubergine-600 hover:underline uppercase tracking-wide">
          Calendar
        </button>
      </div>

      {/* Week Timeline */}
      <div className="flex justify-between items-center mb-6 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10"></div>
        {timeline.map(t => (
          <div key={t.dateStr} className="flex flex-col items-center gap-2 bg-white px-1 relative">
            <span className={`text-[10px] font-bold ${t.isToday ? 'text-aubergine-600' : 'text-slate-400'}`}>{t.label}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${t.isToday ? 'bg-gradient-to-br from-aubergine-500 to-magenta-500 text-white shadow-lg shadow-aubergine-500/30 ring-4 ring-aubergine-50' : t.isFuture ? 'bg-slate-50 text-slate-400 border border-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              {t.dayNum}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-aubergine-50 to-magenta-50 rounded-2xl p-4 flex items-start gap-3 border border-aubergine-100/50 mb-4">
        <i className="fas fa-lightbulb text-magenta-500 mt-0.5"></i>
        <p className="text-xs text-aubergine-900 font-medium leading-relaxed">{phase.tip}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {CYCLE_PHASES.map(p => (
          <button key={p.id} onClick={() => logToday(p.id)}
            className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${currentPhase === p.id ? `${p.color} text-white border-transparent shadow-md` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <button onClick={() => logCycle(dateKey, { flow: 'Medium' }).then(() => toast('Period logged for today', 'success'))}
          className="w-full bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-colors">
          <i className="fas fa-droplet mr-1.5"></i> My Period Started Today
        </button>
      </div>
    </div>
  );
}

/* ─── Vitals Widget (Mini) ─── */
function VitalsSnapshot({ vitals, discreet, navigate }) {
  const hasAny = Object.keys(vitals || {}).length > 0;
  return (
    <div className={`glass-panel rounded-3xl p-6 flex flex-col justify-between ${discreet ? 'discreet-blur' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="fas fa-heart-pulse text-rose-500"></i>
          <h3 className="font-bold text-slate-800 text-sm">Vitals</h3>
        </div>
        <button onClick={() => navigate('/patient-dashboard/tracking')} className="text-[10px] font-bold text-rose-600 hover:underline uppercase tracking-wide">Update</button>
      </div>

      {!hasAny ? (
        <div className="text-center py-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">Log vitals to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(VITALS_CONFIG).map(([key, cfg]) => {
            const reading = vitals[key];
            if (!reading) return null;
            return (
              <div key={key} className={`p-3 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col`}>
                <span className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1"><i className={`fas ${cfg.icon} text-slate-400`}></i> {cfg.label}</span>
                <span className="font-black text-slate-800 text-base">{reading.value} <span className="text-[10px] font-bold text-slate-400">{cfg.unit}</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Health Focus Goals Widget (Evidence-Based, Multi-Goal) ─── */
function HealthFocusGoalsWidget({ toast, discreet }) {
  const [selectedGoals, setSelectedGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('healnari_active_health_goals');
      return saved ? JSON.parse(saved) : ['habits', 'cycle', 'energy'];
    } catch {
      return ['habits', 'cycle', 'energy'];
    }
  });

  const toggleGoal = (id) => {
    const updated = selectedGoals.includes(id)
      ? selectedGoals.filter(g => g !== id)
      : [...selectedGoals, id];
    setSelectedGoals(updated);
    try {
      localStorage.setItem('healnari_active_health_goals', JSON.stringify(updated));
    } catch {}
    toast('Health focus goals updated', 'info');
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden lg:col-span-2 ${discreet ? 'discreet-blur' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h3 className="font-bold text-slate-800 text-sm">My Health &amp; Hormone Goals</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evidence-based priorities tailored to your body.
          </p>
        </div>
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
          {selectedGoals.length} Active {selectedGoals.length === 1 ? 'Goal' : 'Goals'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
        {HEALTH_GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'bg-aubergine-50/80 border-aubergine-300 shadow-xs ring-1 ring-aubergine-400/40'
                  : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-base">{goal.emoji}</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isSelected ? 'bg-aubergine-600 text-white' : 'border border-slate-300'}`}>
                  {isSelected && <i className="fas fa-check"></i>}
                </span>
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-aubergine-900' : 'text-slate-700'}`}>
                  {goal.label}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{goal.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-sand-50/80 border border-sand-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
        <i className="fas fa-circle-check text-emerald-600 mt-0.5 flex-shrink-0"></i>
        <p className="leading-relaxed">
          <strong className="text-slate-800">Guideline Insight:</strong> Healthy lifestyle changes provide major metabolic, cardiovascular, and ovulatory benefits even when body weight does not change.
        </p>
      </div>
    </div>
  );
}

/* ─── My Personalized Nutrition Support Widget ─── */
function PersonalizedNutritionWidget({ navigate, discreet }) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('healnari_nutrition_prefs');
      return saved ? JSON.parse(saved) : {
        diet: 'Vegetarian',
        cuisine: 'Indian & Mediterranean',
        prepTime: '15-30 mins',
        goal: 'Insulin Sensitivity & Satiety'
      };
    } catch {
      return { diet: 'Vegetarian', cuisine: 'Indian & Mediterranean', prepTime: '15-30 mins', goal: 'Insulin Sensitivity & Satiety' };
    }
  });

  const [isEditing, setIsEditing] = useState(false);

  const savePreferences = (updated) => {
    setPreferences(updated);
    try {
      localStorage.setItem('healnari_nutrition_prefs', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden ${discreet ? 'discreet-blur' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥗</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Personalized Nutrition</h3>
            <p className="text-[11px] text-slate-400">Tailored to your lifestyle &amp; culture</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-[10px] font-bold text-aubergine-700 bg-aubergine-50 hover:bg-aubergine-100 px-3 py-1.5 rounded-full transition-colors"
        >
          {isEditing ? 'Done' : 'Customize'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Diet Preference</label>
            <select
              value={preferences.diet}
              onChange={e => savePreferences({ ...preferences, diet: e.target.value })}
              className="w-full p-2 rounded-xl border border-slate-200 bg-white"
            >
              {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Pescatarian'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Daily Meal Prep Time</label>
            <select
              value={preferences.prepTime}
              onChange={e => savePreferences({ ...preferences, prepTime: e.target.value })}
              className="w-full p-2 rounded-xl border border-slate-200 bg-white"
            >
              {['<15 mins (Quick Meals)', '15-30 mins', '30+ mins (Meal Prep)'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Primary Nutrition Goal</label>
            <select
              value={preferences.goal}
              onChange={e => savePreferences({ ...preferences, goal: e.target.value })}
              className="w-full p-2 rounded-xl border border-slate-200 bg-white"
            >
              {['Insulin Sensitivity & Satiety', 'Cycle Regularity Support', 'Gut Microbiome Diversity', 'Sustained All-Day Energy'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Diet Pattern</span>
              <span className="font-bold text-emerald-950">{preferences.diet}</span>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Prep Target</span>
              <span className="font-bold text-amber-950">{preferences.prepTime}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
              <i className="fas fa-bullseye text-aubergine-600"></i> Active Focus:
            </div>
            <p className="text-xs text-slate-700 font-semibold">{preferences.goal}</p>
          </div>

          <p className="text-[10.5px] text-slate-400 italic leading-snug">
            * Aligned with 2023 Guidelines: No single diet is universally superior for PCOS; sustainable healthy eating tailored to your preferences works best.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── This Week's Movement Goal & Mindful Movement Widget ─── */
function MindfulMovementWidget({ toast, discreet }) {
  const [weeklyMinutes, setWeeklyMinutes] = useState(() => {
    try {
      const saved = localStorage.getItem('healnari_weekly_movement_mins');
      return saved ? Number(saved) : 75;
    } catch {
      return 75;
    }
  });

  const [activeCategory, setActiveCategory] = useState('gentle_yoga');

  const addMinutes = (mins) => {
    const updated = weeklyMinutes + mins;
    setWeeklyMinutes(updated);
    try {
      localStorage.setItem('healnari_weekly_movement_mins', String(updated));
    } catch {}
    toast(`Added +${mins}m to this week's movement goal!`, 'success');
  };

  const targetMinutes = 150; // WHO & 2023 Guideline moderate weekly target
  const percent = Math.min(100, Math.round((weeklyMinutes / targetMinutes) * 100));

  return (
    <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden ${discreet ? 'discreet-blur' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧘‍♀️</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Yoga &amp; Mindful Movement</h3>
            <p className="text-[11px] text-slate-400">This Week's Movement Goal</p>
          </div>
        </div>
        <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
          {weeklyMinutes} / {targetMinutes}m
        </span>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
          <span>{percent}% of guideline goal (150m)</span>
          <span>{Math.max(0, targetMinutes - weeklyMinutes)}m remaining</span>
        </div>

        {/* Quick Log Movement */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quick Log:</span>
          <button
            onClick={() => addMinutes(15)}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            +15m
          </button>
          <button
            onClick={() => addMinutes(30)}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            +30m
          </button>
          <button
            onClick={() => addMinutes(45)}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            +45m
          </button>
        </div>

        {/* Category Pills */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">6 Movement Pillars:</span>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            {MOVEMENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg border text-center font-bold transition-all truncate ${
                  activeCategory === cat.id
                    ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title={cat.desc}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 italic pt-1 leading-snug">
          * Walking, gentle yoga, swimming, strength, and household movement all contribute to an active lifestyle.
        </p>
      </div>
    </div>
  );
}

/* ─── Well-Being & Emotional Check-in Widget (Psychological Support) ─── */
function WellbeingCheckinWidget({ toast, discreet }) {
  const [checkin, setCheckin] = useState(() => {
    try {
      const saved = localStorage.getItem('healnari_wellbeing_today');
      return saved ? JSON.parse(saved) : {
        stress: 'Moderate',
        sleep: 'Fair',
        energy: 'Steady',
        emotion: 'Calm',
        shareWithDoctor: true,
      };
    } catch {
      return { stress: 'Moderate', sleep: 'Fair', energy: 'Steady', emotion: 'Calm', shareWithDoctor: true };
    }
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleOptionChange = (key, val) => {
    const updated = { ...checkin, [key]: val };
    setCheckin(updated);
    setIsSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('healnari_wellbeing_today', JSON.stringify(checkin));
      setIsSaved(true);
      toast('Well-being check-in saved to your health profile', 'success');
    } catch {
      toast('Saved locally', 'info');
    }
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden lg:col-span-2 ${discreet ? 'discreet-blur' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Well-Being &amp; Emotional Check-in</h3>
            <p className="text-[11px] text-slate-500">Mental &amp; emotional health is a core pillar of PCOS care</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-aubergine-700 bg-aubergine-50 border border-aubergine-100 px-2.5 py-1 rounded-full">
          Psychological Health
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Stress */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
            Stress Today
          </label>
          <div className="flex gap-1">
            {['Low', 'Moderate', 'High'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleOptionChange('stress', s)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  checkin.stress === s
                    ? 'bg-aubergine-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
            Sleep Quality
          </label>
          <div className="flex gap-1">
            {['Restful', 'Fair', 'Disrupted'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleOptionChange('sleep', s)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  checkin.sleep === s
                    ? 'bg-aubergine-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
            Energy Level
          </label>
          <div className="flex gap-1">
            {['Energized', 'Steady', 'Drained'].map(e => (
              <button
                key={e}
                type="button"
                onClick={() => handleOptionChange('energy', e)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  checkin.energy === e
                    ? 'bg-aubergine-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Emotion */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
            Feeling
          </label>
          <div className="flex gap-1">
            {['Calm', 'Optimistic', 'Overwhelmed', 'Anxious'].map(em => (
              <button
                key={em}
                type="button"
                onClick={() => handleOptionChange('emotion', em)}
                className={`flex-1 py-1 rounded-lg text-[9.5px] font-bold transition-all ${
                  checkin.emotion === em
                    ? 'bg-aubergine-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
          <input
            type="checkbox"
            checked={checkin.shareWithDoctor}
            onChange={e => handleOptionChange('shareWithDoctor', e.target.checked)}
            className="w-4 h-4 rounded text-aubergine-600 focus:ring-aubergine-500"
          />
          <span>Discuss my emotional well-being during next consultation</span>
        </label>

        <button
          onClick={handleSave}
          className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs shrink-0"
        >
          {isSaved ? '✓ Saved for Doctor' : 'Save Check-in'}
        </button>
      </div>
    </div>
  );
}

/* ─── Lifestyle Plan Widget ─── */
function LifestylePlanWidget({ navigate, discreet }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    apiFetch('/records/prescriptions?limit=20')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        // Find the most recent prescription with a holistic lifestyle plan
        for (const rx of list) {
          try {
            if (rx.instructions && rx.instructions.startsWith('{')) {
              const parsed = JSON.parse(rx.instructions);
              if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
                setPlan({ ...parsed, rxId: rx.id, date: rx.date, doctor: rx.doctor });
                return;
              }
            }
          } catch(e) {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = () => {
    if (!plan) return;
    openLifestylePlanPrintWindow({
      rxId: `HN-${plan.rxId?.slice(0, 8).toUpperCase() || 'PLAN'}`,
      date: plan.date,
      doctor: { name: plan.doctor },
      patient: { name: user?.name, gender: 'Female' },
      dietPlan: plan.dietPlan,
      exercisePlan: plan.exercisePlan
    });
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 lg:col-span-2 relative overflow-hidden ${discreet ? 'discreet-blur' : ''}`}>
      {/* Decorative bg */}
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-100 rounded-full opacity-40 blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-100 rounded-full opacity-40 blur-2xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-spa text-emerald-500"></i>
            <h3 className="font-bold text-slate-800 text-sm">My Prescribed Lifestyle Protocol</h3>
          </div>
          <button
            onClick={() => navigate('/patient-dashboard/lifestyle')}
            className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-wide flex items-center gap-1"
          >
            <span>Open Hub</span>
            <i className="fas fa-arrow-right text-[9px]"></i>
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6"><i className="fas fa-spinner fa-spin mr-2"></i>Loading your plan…</p>
        ) : !plan ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-2xl border border-slate-100">🥗</div>
            <div>
              <p className="text-sm font-bold text-slate-700">No Doctor Protocol Prescribed Yet</p>
              <p className="text-xs text-slate-500 mt-1">Your doctor will prescribe tailored nutrition &amp; mindful movement protocols during your consultation.</p>
            </div>
            <button
              onClick={() => navigate('/patient-dashboard/appointments')}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition-colors"
            >
              Book a Consultation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {plan.doctor && (
              <p className="text-[10px] text-slate-400 font-medium">
                <i className="fas fa-user-doctor mr-1"></i>Prescribed by {plan.doctor} • {plan.date}
              </p>
            )}

            {plan.dietPlan && (
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">🥗</span>
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Personalized Nutrition Plan</span>
                </div>
                <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap font-medium line-clamp-3">{plan.dietPlan}</p>
              </div>
            )}

            {plan.exercisePlan && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">🧘‍♀️</span>
                  <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Yoga &amp; Mindful Movement Protocol</span>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap font-medium line-clamp-3">{plan.exercisePlan}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => navigate('/patient-dashboard/lifestyle')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <i className="fas fa-seedling"></i> Open Diet &amp; Yoga Hub
              </button>
              <button
                onClick={handleDownload}
                className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-2xs"
                title="Download Official A4 PDF"
              >
                <i className="fas fa-file-pdf text-emerald-600"></i> Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Minimal Patient AI Discovery Card ─── */
function PatientAiDashboardCard({ navigate }) {
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    apiFetch('/ai/subscription/status')
      .then(res => setAiStatus(res))
      .catch(() => {});
  }, []);

  const remaining = aiStatus?.creditsRemaining ?? 15;
  const total = aiStatus?.totalCredits ?? aiStatus?.subscription?.monthly_ai_credits ?? 15;
  const percent = Math.max(0, Math.min(100, Math.round((remaining / Math.max(1, total)) * 100)));

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base shrink-0 border border-purple-100">
          <i className="fas fa-wand-magic-sparkles"></i>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800">AI Health Companion</h4>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {aiStatus?.isPremium ? 'AI Premium' : 'Included Free'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized cycle tips, pre-consultation visit briefs, and intelligent lab decoder.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <div className="text-right">
          <span className="text-xs font-black text-slate-800 font-mono">
            {remaining.toLocaleString()} <span className="text-slate-400 font-normal">/ {total.toLocaleString()}</span>
          </span>
          <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${remaining <= 3 ? 'bg-amber-500' : 'bg-purple-600'}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">tokens available</span>
        </div>

        <button
          onClick={() => navigate('/patient-dashboard/ai')}
          className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          Explore AI →
        </button>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────── */
function PatientDashboard() {
  const { user } = useAuth();
  const { appointments, patients, addAppointment, vitals, logLifestyle, lifestyleLogs, logCycle, cycleLogs, requestRefill } = useClinicData();
  const own = patients?.[0] || null;
  const navigate = useNavigate();
  const toast = useToast();

  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [showLabReports, setShowLabReports] = useState(false);
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [fertilityData, setFertilityData] = useState(null);

  useEffect(() => {
    apiFetch('/patients/me/fertility-prediction').then(setFertilityData).catch(() => {});
  }, []);

  // Water tracking integration
  const dateKey = todayLocalStr();
  const todayLifestyle = lifestyleLogs[dateKey]?.items || {};
  // Tracked under its own `waterGlasses` count, not the shared `water` key —
  // Tracking.jsx's daily checklist reads `items.water` as a plain boolean
  // ("did you hit your 2.5L goal today"), so writing the raw 0-8 glass count
  // there would flip that checkbox true after the very first glass instead
  // of only once the goal is actually met. `water` below is still kept in
  // sync as the derived boolean so the checklist reflects the real goal.
  const savedWaterGlasses = todayLifestyle.waterGlasses || 0;
  const [waterCount, setWaterCount] = useState(savedWaterGlasses);

  // logLifestyle/todayLifestyle come from context and aren't stable references
  // across renders — kept in a ref instead of the effect's dependency array so
  // an unrelated re-render (e.g. logging a mood elsewhere on this page) can't
  // cancel and reschedule the pending debounced water save from zero.
  const latestSaveRef = useRef({ logLifestyle, todayLifestyle });
  latestSaveRef.current = { logLifestyle, todayLifestyle };

  // Sync water count locally then to backend efficiently
  useEffect(() => {
    if (waterCount !== savedWaterGlasses) {
      const timeoutId = setTimeout(() => {
        const { logLifestyle: save, todayLifestyle: current } = latestSaveRef.current;
        save(dateKey, { ...current, waterGlasses: waterCount, water: waterCount >= 8 }).catch(() => { });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [waterCount, savedWaterGlasses, dateKey]);

  useEffect(() => {
    apiFetch('/records/lab-report-requests').then(r => setPendingReportCount(r.filter(x => x.status === 'Pending').length)).catch(() => setPendingReportCount(0));
  }, []);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 9999;
    const clean = String(timeStr).trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
    if (!match) return 9999;
    let [_, hours, minutes, period] = match;
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    if (period) {
      const p = period.toUpperCase();
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
    }
    return h * 60 + m;
  };

  const upcomingAppointments = (appointments || [])
    .filter(a => ['Upcoming', 'Waiting', 'In Progress'].includes(a.status) && (a.paymentId || a.payment_id))
    .sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  const nextAppointment = upcomingAppointments[0];
  const pendingPaymentApt = (appointments || []).find(a => (a.status === 'Approved' || a.status === 'HOLD') && !a.paymentId && !a.payment_id);
  const daysToNext = nextAppointment ? Math.max(0, daysUntil(nextAppointment.date)) : null;

  // Live queue position for today's appointment — refetched periodically
  // while the dashboard is open so "you're 3rd in line" stays accurate as
  // the doctor actually works through their queue, instead of the patient
  // just watching their originally booked slot time come and go.
  const [queueStatus, setQueueStatus] = useState(null);
  const isTodayVisit = nextAppointment && daysToNext === 0;
  useEffect(() => {
    if (!isTodayVisit) { setQueueStatus(null); return; }
    let cancelled = false;
    const fetchQueue = () => apiFetch(`/appointments/${nextAppointment.id}/queue-status`)
      .then(res => { if (!cancelled) setQueueStatus(res); })
      .catch(() => { if (!cancelled) setQueueStatus(null); });
    fetchQueue();
    const interval = setInterval(fetchQueue, 45000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isTodayVisit, nextAppointment?.id]);

  const [activeLifeMode, setActiveLifeMode] = useState(() => localStorage.getItem('patient_life_mode') || 'cycle');
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem('healnari_onboarding_done') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCarePassModal, setShowCarePassModal] = useState(false);
  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');

  const handleSelectLifeMode = (id) => {
    setActiveLifeMode(id);
    localStorage.setItem('patient_life_mode', id);
    toast(`Active Mode: ${LIFE_MODES.find(m => m.id === id)?.label}`, 'info');
  };

   return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Patient Clinical Greeting Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
              HealNari Patient Portal
            </span>
            <span className="text-xs text-slate-400 font-medium">• {todayLabel}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {greeting}, {user?.name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Your personal health care summary and active clinical care plan.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowCarePassModal(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-xs text-xs flex items-center gap-2"
            title="View your Emergency Care Card & QR Pass"
          >
            <i className="fas fa-id-card text-aubergine-700"></i>
            <span>My Health Pass</span>
          </button>
          <button
            onClick={() => setShowQuickBook(true)}
            className="bg-aubergine-800 hover:bg-aubergine-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs text-xs flex items-center gap-2"
          >
            <i className="fas fa-calendar-plus text-xs text-aubergine-200"></i>
            <span>Book Consultation</span>
          </button>
        </div>
      </div>

      {/* 1. NEXT APPOINTMENT HERO (Immediate Visibility) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-aubergine-50 text-aubergine-800 border border-aubergine-200/80 flex items-center justify-center text-xl shrink-0">
              <i className={nextAppointment?.type === 'Video Consult' ? 'fas fa-video' : 'fas fa-hospital-user'}></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-aubergine-50 text-aubergine-800 border border-aubergine-200">
                  {nextAppointment ? 'Upcoming Consultation' : 'Clinical Consultation'}
                </span>
                {isTodayVisit && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Happening Today
                  </span>
                )}
              </div>
              {nextAppointment ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900">
                    Dr. {nextAppointment.doctorName}
                    <span className="text-sm font-normal text-slate-500 ml-2">({nextAppointment.reason || 'Specialist Consultation'})</span>
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      <i className="fas fa-calendar text-slate-400"></i>
                      {nextAppointment.date ? new Date(nextAppointment.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Today'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <i className="fas fa-clock text-slate-400"></i>
                      {nextAppointment.time}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <i className={nextAppointment.type === 'Video Consult' ? 'fas fa-video text-aubergine-600' : 'fas fa-location-dot text-slate-400'}></i>
                      {nextAppointment.type || 'Video Consult'}
                    </span>
                  </p>
                  {isTodayVisit && queueStatus?.position && (
                    <div className="mt-2.5 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold">Queue Status:</span>
                      <span>
                        {queueStatus.status === 'In Progress'
                          ? "Doctor is ready — please join the consultation"
                          : queueStatus.peopleAhead === 0
                          ? "You are next in line"
                          : `#${queueStatus.position} in line (~${queueStatus.estimatedWaitMinutes || 10} min wait)`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-slate-900">No Upcoming Appointments</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule a consultation with our verified specialists for personalized diagnosis and ongoing care.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {nextAppointment ? (
              <>
                <button
                  onClick={() => navigate(`/patient-dashboard/appointments?joinCall=${nextAppointment.id}`)}
                  disabled={nextAppointment.type !== 'Video Consult' || daysToNext !== 0}
                  className="bg-aubergine-800 hover:bg-aubergine-700 disabled:opacity-40 disabled:hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs"
                >
                  <i className="fas fa-video"></i>
                  <span>{isTodayVisit ? 'Join Video Room' : 'View Appointment'}</span>
                </button>
                <button
                  onClick={() => navigate('/patient-dashboard/appointments')}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
                >
                  All Visits
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowQuickBook(true)}
                className="bg-aubergine-800 hover:bg-aubergine-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs"
              >
                <i className="fas fa-calendar-plus text-xs text-aubergine-200"></i>
                <span>Book Appointment</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. YOUR NEXT STEPS (Task-Driven Action Center) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <i className="fas fa-list-check text-aubergine-700"></i>
            <span>Your Next Steps</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Daily health tasks</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Pending Payment if applicable */}
          {pendingPaymentApt ? (
            <div
              onClick={() => navigate('/patient-dashboard/appointments?tab=action_required')}
              className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="flex items-start gap-2.5">
                <i className="fas fa-credit-card text-amber-600 mt-0.5 text-sm"></i>
                <div>
                  <p className="text-xs font-bold text-amber-900">Confirm Appointment</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Pay consultation fee for Dr. {pendingPaymentApt.doctorName || 'Specialist'}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-800 mt-2 self-end flex items-center gap-1">
                Pay Now <i className="fas fa-arrow-right text-[8px]"></i>
              </span>
            </div>
          ) : !onboardingDone ? (
            <div
              onClick={() => setShowOnboarding(true)}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="flex items-start gap-2.5">
                <i className="fas fa-user-check text-aubergine-700 mt-0.5 text-sm"></i>
                <div>
                  <p className="text-xs font-bold text-slate-900">Health Profile</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Complete your medical background &amp; allergies.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-aubergine-800 mt-2 self-end flex items-center gap-1">
                Complete Profile <i className="fas fa-arrow-right text-[8px]"></i>
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 flex items-start gap-2.5">
              <i className="fas fa-check-circle text-emerald-600 mt-0.5 text-sm"></i>
              <div>
                <p className="text-xs font-bold text-slate-900">Profile Verified</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Medical background &amp; records up to date.</p>
              </div>
            </div>
          )}

          {/* Action 2: Daily Medication */}
          <div
            onClick={() => navigate('/patient-dashboard/prescriptions')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-start gap-2.5">
              <i className="fas fa-pills text-aubergine-700 mt-0.5 text-sm"></i>
              <div>
                <p className="text-xs font-bold text-slate-900">Today's Medications</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {own?.meds?.length ? `${own.meds.length} active prescriptions scheduled.` : 'No active medications required today.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-aubergine-800 mt-2 self-end flex items-center gap-1">
              View Schedule <i className="fas fa-arrow-right text-[8px]"></i>
            </span>
          </div>

          {/* Action 3: Diagnostic Lab Results */}
          <div
            onClick={() => setShowLabReports(true)}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-start gap-2.5">
              <i className="fas fa-flask text-aubergine-700 mt-0.5 text-sm"></i>
              <div>
                <p className="text-xs font-bold text-slate-900">Diagnostic Reports</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {pendingReportCount > 0 ? `${pendingReportCount} report(s) ready for review.` : 'Upload lab tests or track pending results.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-aubergine-800 mt-2 self-end flex items-center gap-1">
              {pendingReportCount > 0 ? 'Review Results' : 'Manage Reports'} <i className="fas fa-arrow-right text-[8px]"></i>
            </span>
          </div>

          {/* Action 4: Symptom & Wellness Log */}
          <div
            onClick={() => setShowSymptomChecker(true)}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex items-start gap-2.5">
              <i className="fas fa-clipboard-user text-aubergine-700 mt-0.5 text-sm"></i>
              <div>
                <p className="text-xs font-bold text-slate-900">Daily Health Log</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Log today's symptoms, vitals, or energy.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-aubergine-800 mt-2 self-end flex items-center gap-1">
              Log Today <i className="fas fa-arrow-right text-[8px]"></i>
            </span>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN CLINICAL OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Care Plan & Today's Diet */}
        <div className="space-y-6">
          {/* Current Care Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h3 className="font-bold text-slate-900 text-sm">Active Care Plan</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Under Clinical Supervision
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {own?.diagnosis && own.diagnosis !== 'Pending' ? own.diagnosis : 'Comprehensive Healthcare Protocol'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Attending: {nextAppointment?.doctorName ? `Dr. ${nextAppointment.doctorName}` : 'HealNari Clinical Team'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    MRN #{own?.mrn || user?.id?.slice(0, 8) || 'EMR-SYNC'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Care Stage</span>
                    <span className="text-xs font-bold text-slate-800">Active Phase</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Next Review</span>
                    <span className="text-xs font-bold text-slate-800">{daysToNext !== null ? `in ${daysToNext}d` : 'Scheduled'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Adherence</span>
                    <span className="text-xs font-bold text-emerald-700">Good</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/patient-dashboard/lifestyle')}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs transition-colors text-center"
                >
                  View Care Protocol
                </button>
                <button
                  onClick={() => openLifestylePlanPrintWindow({
                    patientName: user?.name || own?.name || 'Patient',
                    age: own?.age || 28,
                    gender: 'Female',
                    doctorName: nextAppointment?.doctorName || 'Dr. Sarah Mitchell',
                    date: todayLabel,
                    dietPlan: 'Low-glycemic anti-inflammatory nutrition protocol with balanced micro-nutrients.',
                    exercisePlan: 'Daily 30-minute moderate walking and restorative yoga.',
                  })}
                  className="px-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
                  title="Print Clinical Care Plan"
                >
                  <i className="fas fa-print"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Today's Diet Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <i className="fas fa-utensils text-aubergine-700"></i>
                <span>Today's Nutrition Plan</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">2 / 4 tracked</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { meal: 'Breakfast', desc: 'Protein-rich oats with soaked chia & pumpkin seeds', done: true },
                { meal: 'Lunch', desc: 'Low-GI quinoa bowl with steamed greens & tofu/paneer', done: true },
                { meal: 'Afternoon Snack', desc: 'Herbal spearmint infusion with handful of roasted walnuts', done: false },
                { meal: 'Dinner', desc: 'Light warm lentil soup with stir-fried seasonal vegetables', done: false },
              ].map((m) => (
                <div key={m.meal} className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  m.done ? 'bg-slate-50/60 border-slate-200 text-slate-500' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      m.done ? 'bg-emerald-500 text-white' : 'border border-slate-300 text-transparent'
                    }`}>
                      <i className="fas fa-check"></i>
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 mr-2">{m.meal}:</span>
                      <span className="text-slate-600">{m.desc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500">Clinical macro goal: <strong>Low Glycemic</strong></span>
              <button
                onClick={() => navigate('/patient-dashboard/lifestyle')}
                className="text-aubergine-800 hover:text-aubergine-900 font-bold"
              >
                Full Meal Chart →
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Medications & Lab Results */}
        <div className="space-y-6">
          {/* Active Prescriptions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <i className="fas fa-prescription-bottle-medical text-aubergine-700"></i>
                <span>Active Medications</span>
              </h3>
              <button
                onClick={() => navigate('/patient-dashboard/prescriptions')}
                className="text-xs font-bold text-aubergine-800 hover:underline"
              >
                View All ({own?.meds?.length || 0})
              </button>
            </div>

            <div className="space-y-2.5">
              {own?.meds && own.meds.length > 0 ? (
                own.meds.slice(0, 3).map((m) => (
                  <div key={m.id || m.medName} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{m.medName}</h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {m.dosage || 'Standard dose'} • {m.frequency || 'Daily'} • {m.timing || 'After food'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (requestRefill && own?.id) {
                          requestRefill(own.id, m.id);
                          toast(`Refill request sent for ${m.medName}`, 'success');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 whitespace-nowrap shadow-2xs"
                    >
                      Refill
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <i className="fas fa-pills text-2xl text-slate-300 mb-1 block"></i>
                  <p className="text-xs text-slate-500 font-medium">No active medications prescribed.</p>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Lab Results */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <i className="fas fa-vial-virus text-aubergine-700"></i>
                <span>Diagnostic Lab Results</span>
              </h3>
              <button
                onClick={() => setShowLabReports(true)}
                className="text-xs font-bold text-aubergine-800 hover:underline"
              >
                Manage Reports
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {pendingReportCount > 0 ? `${pendingReportCount} New Report(s) Available` : 'All Diagnostic Tests Synchronized'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hormonal panel, metabolic markers, and routine blood tests.
                </p>
              </div>
              <button
                onClick={() => setShowLabReports(true)}
                className="bg-aubergine-800 hover:bg-aubergine-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-2xs"
              >
                {pendingReportCount > 0 ? 'Review' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. HEALTH PROGRESS & DAILY FOUNDATIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Health Progress &amp; Adherence</h2>
            <p className="text-xs text-slate-500">Self-monitoring and vital indicators.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">Past 7 Days</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <HydrationTracker waterCount={waterCount} setWaterCount={setWaterCount} toast={toast} discreet={discreet} />
          <VitalsSnapshot vitals={vitals} discreet={discreet} navigate={navigate} />
          <MoodEnergyLogger logCycle={logCycle} cycleLogs={cycleLogs} toast={toast} />
          <WellnessScoreWidget vitals={vitals} lifestyle={lifestyleLogs[dateKey]} waterCount={waterCount} moodLogged={!!(cycleLogs[dateKey]?.mood)} discreet={discreet} />
        </div>
      </div>

      {/* Clinical SaMD Notice */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-slate-500 text-xs leading-relaxed">
        <i className="fas fa-shield-halved text-aubergine-600 mt-0.5 flex-shrink-0 text-sm"></i>
        <div>
          <span className="font-bold text-slate-700">Clinical & Regulatory Notice (SaMD Guidance): </span>
          HealNari health scoring, cycle mapping, and life-stage insights are designed for educational self-monitoring. They do not constitute medical diagnosis, birth control, or medical treatment plans without consultation with your licensed physician.
        </div>
      </div>

      {/* Modals */}
      <PatientCarePassModal isOpen={showCarePassModal} onClose={() => setShowCarePassModal(false)} patient={own} doctorName={nextAppointment?.doctorName || 'Dr. Sarah Mitchell'} />
      {showOnboarding && <OnboardingModal isOpen={showOnboarding} onClose={() => { localStorage.setItem('healnari_onboarding_done', 'true'); setOnboardingDone(true); setShowOnboarding(false); }} toast={toast} />}
      <SymptomCheckerModal isOpen={showSymptomChecker} onClose={() => setShowSymptomChecker(false)} toast={toast} />
      <LabReportsModal isOpen={showLabReports} onClose={() => setShowLabReports(false)} />
      <QuickBookModal isOpen={showQuickBook} onClose={() => setShowQuickBook(false)} toast={toast} addAppointment={addAppointment} onBooked={() => {}} />
      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        appointmentId={payTarget?.id}
        amount={payTarget?.fee ?? 0}
        description={payTarget ? `Consultation — ${payTarget.doctor}` : ''}
        onPaid={(payment) => {
          // If we had syncPayment we could call it, but refreshing appointments works too
          toast('Payment successful!', 'success');
        }}
      />
    </div>
  );
}

export default PatientDashboard;
