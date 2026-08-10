import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { StepIndicator } from '../../components/StepIndicator.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { LIFESTYLE_ITEMS } from '../lifestyleConfig.js';

/* ─── Reference config (not user data) ───────── */
const CYCLE_PHASES = [
  { id: 'menstrual', label: 'Menstrual', day: 'Day 1–5', color: 'bg-rose-500', text: 'text-rose-600', tip: 'Rest & iron-rich foods. Gentle yoga is helpful.' },
  { id: 'follicular', label: 'Follicular', day: 'Day 6–13', color: 'bg-sky-500', text: 'text-sky-600', tip: 'Energy rising! Great time for cardio & learning new skills.' },
  { id: 'ovulation', label: 'Ovulation', day: 'Day 14', color: 'bg-amber-500', text: 'text-amber-600', tip: 'Peak fertility. You may feel more social & energised.' },
  { id: 'luteal', label: 'Luteal', day: 'Day 15–28', color: 'bg-aubergine-500', text: 'text-aubergine-600', tip: 'Progesterone rises. Prioritise sleep & limit caffeine.' },
];

const SYMPTOMS = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Mood Swings', 'Spotting', 'Nausea', 'Back Pain', 'Breast Tenderness', 'Acne'];

const VITALS_CONFIG = {
  weight: { label: 'Weight', icon: 'fa-weight-scale', unit: 'kg', color: 'bg-sky-50 text-sky-500' },
  bp: { label: 'Blood Pressure', icon: 'fa-heart-pulse', unit: 'mmHg', color: 'bg-rose-50 text-rose-500' },
  sugar: { label: 'Sugar', icon: 'fa-droplet', unit: 'mg/dL', color: 'bg-amber-50 text-amber-500' },
  sleep: { label: 'Sleep', icon: 'fa-moon', unit: 'hrs', color: 'bg-indigo-50 text-indigo-500' },
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
function VideoCallModal({ isOpen, onClose, toast, appointment }) {
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const doctorName = appointment ? `Dr. ${appointment.doctorName}` : 'your doctor';
  const initials = appointment ? appointment.doctorName.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '—';

  const handleJoin = () => {
    setCallActive(true);
    toast(`Connected to video call with ${doctorName}`, 'success');
  };

  const handleEnd = () => {
    setCallActive(false);
    onClose();
    toast('Call ended. Have a great day!', 'info');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Video Consultation" size="lg">
      {!callActive ? (
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-aubergine-100 to-aubergine-200 mx-auto flex items-center justify-center">
            <i className="fas fa-video text-aubergine-700 text-3xl"></i>
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-xl">{doctorName}</h4>
            <p className="text-sm text-aubergine-600 font-semibold">{appointment?.reason || 'Consultation'}</p>
            <p className="text-xs text-slate-500 mt-1">Scheduled: {appointment ? `${appointment.date} ${appointment.time}` : '—'} • 30 min consult</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
            <div className="flex items-center gap-2"><i className="fas fa-shield-halved text-emerald-500"></i> Private, doctor-only session</div>
            <div className="flex items-center gap-2"><i className="fas fa-lock text-emerald-500"></i> DPDP Act, 2023 compliant</div>
            <div className="flex items-center gap-2"><i className="fas fa-clock text-emerald-500"></i> Session recording disabled for privacy</div>
          </div>
          <button onClick={handleJoin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg flex items-center justify-center gap-3">
            <i className="fas fa-video"></i> Join Consultation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Fake video feed */}
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-aubergine-700 flex items-center justify-center text-3xl font-black text-white mx-auto mb-3">{initials}</div>
                <p className="text-white font-bold">{doctorName}</p>
                <p className="text-slate-500 text-xs mt-1">● Live • 00:01:24</p>
              </div>
            </div>
            {/* Self-cam */}
            <div className="absolute bottom-3 right-3 w-24 h-16 bg-slate-700 rounded-xl border-2 border-white/20 flex items-center justify-center text-xs text-slate-500">
              {videoOff ? <i className="fas fa-video-slash text-slate-500 text-xl"></i> : <span className="font-bold text-white">You</span>}
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setMuted(!muted)} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${muted ? 'bg-rose-100 text-rose-600 border-2 border-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={() => setVideoOff(!videoOff)} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${videoOff ? 'bg-rose-100 text-rose-600 border-2 border-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <i className={`fas ${videoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
            <button onClick={handleEnd} className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xl transition-all shadow-lg">
              <i className="fas fa-phone-slash"></i>
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-lg transition-all">
              <i className="fas fa-comment"></i>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    apiFetch('/records/lab-reports').then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  }, [isOpen]);

  const latest = reports[0];
  const results = latest?.results && typeof latest.results === 'object' ? Object.entries(latest.results) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={latest ? latest.test_name : 'Lab Reports'} size="lg">
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8"><i className="fas fa-spinner fa-spin mr-2"></i>Loading…</p>
      ) : !latest ? (
        <p className="text-sm text-slate-500 text-center py-8">No lab reports on file yet.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 mb-4">
            {latest.lab_name || 'Lab'} • {new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {latest.status === 'Pending' && <span className="ml-2 text-amber-600 font-bold">Pending Review</span>}
          </p>
          {results.length === 0 ? (
            <p className="text-xs text-slate-500">Results not uploaded yet.</p>
          ) : results.map(([param, v]) => (
            <div key={param} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800 text-sm">{param}</p>
                <div className="text-right">
                  <p className="font-black text-slate-800">{v.value ?? '—'}</p>
                  {v.status && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === 'normal' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                      {v.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {latest.interpretation && (
            <p className="text-xs text-slate-600 pt-2 border-t border-slate-100"><i className="fas fa-circle-info text-slate-500 mr-1"></i>{latest.interpretation}</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function QuickBookModal({ isOpen, onClose, toast, addAppointment }) {
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
      await addAppointment({
        doctorId: form.doctorId,
        type: form.type === 'Video' ? 'Video Consult' : 'Clinic Visit',
        date: form.date,
        time: form.slot,
        reason: '',
      });
      onClose();
      toast('Appointment booked!', 'success');
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
            <p className="text-aubergine-600">Fee: ₹{selectedDoctor?.consultation_fee || 799} (Standard Consult)</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">← Back</button>
            <button disabled={!form.slot || booking} onClick={confirm}
              className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              {booking ? 'Booking…' : 'Confirm Booking ✓'}
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
      // Onboarding only asks for age, not an exact birthdate — approximate a
      // dob (Jan 1 of the birth year) so the record has something to compute
      // age from elsewhere, rather than discarding the answer entirely.
      const dob = form.age ? `${new Date().getFullYear() - Number(form.age)}-01-01` : own.dob;
      await updatePatient({
        ...own,
        dob,
        blood: form.bloodGroup || own.blood,
        height: form.height || own.height,
        weight: form.weight || own.weight,
        medicalHistory: { ...own.medicalHistory, chronicConditions: form.conditions.filter(c => c !== 'None') },
      });
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
      <StepIndicator step={step} total={2} labels={['Basic Info', 'Medical History']} />
      {step === 1 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm text-slate-600 mb-2">Let's personalize your care experience. This helps our doctors provide better care.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Age</label>
              <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
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
              <input type="number" value={form.height} onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" placeholder="cm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Weight (kg)</label>
              <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
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
      <div className="absolute bottom-0 left-0 right-0 bg-sky-100/50 transition-all duration-700 ease-out z-0"
        style={{ height: `${pct}%` }}>
        <div className="absolute -top-3 left-0 right-0 h-3 bg-sky-200/40 rounded-t-[50%] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-droplet text-sky-500"></i>
            <h3 className="font-bold text-slate-800 text-sm">Water Intake</h3>
          </div>
          <p className="text-xs text-slate-500">{waterCount} of {goal} glasses</p>
        </div>
        <button onClick={handleAdd} className="w-10 h-10 rounded-full bg-white shadow-md text-sky-500 hover:bg-sky-50 flex items-center justify-center text-lg transition-transform active:scale-90">
          <i className="fas fa-plus"></i>
        </button>
      </div>

      <div className="relative z-10 mt-4 flex gap-1 justify-between">
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} className={`h-8 flex-1 rounded-md transition-all duration-300 ${i < waterCount ? 'bg-sky-400' : 'bg-slate-100'}`}></div>
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

  const list = (meds || []).slice(0, 3);

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
    { id: 'Calm', icon: '😌', color: 'bg-sky-100 text-sky-700 border-sky-200', msg: "A calm mind is a powerful tool. Enjoy the peace." },
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
          )
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

/* ─── Main Dashboard ─────────────────────────── */
function PatientDashboard() {
  const { user } = useAuth();
  const { appointments, patients, addAppointment, vitals, logLifestyle, lifestyleLogs, logCycle, cycleLogs, requestRefill } = useClinicData();
  const navigate = useNavigate();
  const toast = useToast();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [showLabReports, setShowLabReports] = useState(false);
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);

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
    apiFetch('/records/lab-reports').then(r => setPendingReportCount(r.filter(x => x.status === 'Pending').length)).catch(() => setPendingReportCount(0));
  }, []);

  const own = patients?.[0];
  const upcomingAppointments = (appointments || []).filter(a => !['Done', 'Cancelled', 'No Show'].includes(a.status)).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
  const nextAppointment = upcomingAppointments[0];
  const daysToNext = nextAppointment ? Math.max(0, daysUntil(nextAppointment.date)) : null;

  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem('healnari_onboarding_done') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');

  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Dynamic Header */}
      <div className="relative rounded-3xl overflow-hidden shadow-soft border border-aubergine-100 p-8 md:p-10 bg-gradient-to-br from-white via-white to-aubergine-50/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-magenta-100 via-aubergine-50 to-transparent rounded-full mix-blend-multiply opacity-70 transform translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-sky-50 via-emerald-50 to-transparent rounded-full mix-blend-multiply opacity-60 transform -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-black text-aubergine-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i className="fas fa-calendar-day"></i> {todayLabel}</p>
            <h1 className="text-3xl md:text-4xl font-serif-brand font-black text-slate-800 mb-2 tracking-tight">
              {greeting}, {user?.name?.split(' ')[0] || 'there'}.
            </h1>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">
              {nextAppointment
                ? <>Your next visit with Dr. {nextAppointment.doctorName} is <strong className="text-aubergine-700">{daysToNext === 0 ? 'today' : `in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`}</strong>. Rest and recharge.</>
                : "Welcome to your daily health command center."}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowVideoCall(true)} disabled={!nextAppointment || nextAppointment.type !== 'Video Consult' || daysToNext !== 0}
              className="bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:from-aubergine-700 hover:to-magenta-700 disabled:opacity-40 disabled:grayscale text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-aubergine-500/20 text-sm flex items-center gap-2 btn-interactive">
              <i className="fas fa-video"></i> Join Call
            </button>
          </div>
        </div>
      </div>

      {/* Profile Completion Alert */}
      {!onboardingDone && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0"><i className="fas fa-star"></i></div>
            <div>
              <p className="font-bold text-amber-900 text-sm">Personalize your HealNari experience</p>
              <p className="text-xs text-amber-700">Complete your profile to get tailored insights.</p>
            </div>
          </div>
          <button onClick={() => setShowOnboarding(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap btn-interactive">
            Complete Profile
          </button>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Row 1 */}
        <WellnessScoreWidget vitals={vitals} lifestyle={lifestyleLogs[dateKey]} waterCount={waterCount} moodLogged={!!(cycleLogs[dateKey]?.mood)} discreet={discreet} />
        <HydrationTracker waterCount={waterCount} setWaterCount={setWaterCount} toast={toast} discreet={discreet} />
        <DailyMedicationChecklist meds={own?.meds} requestRefill={requestRefill} toast={toast} discreet={discreet} />

        {/* Row 2 */}
        <WeeklyCycleRibbon toast={toast} />
        <div className="grid grid-rows-2 gap-6 lg:col-span-1">
          <VitalsSnapshot vitals={vitals} discreet={discreet} navigate={navigate} />
          <MoodEnergyLogger logCycle={logCycle} cycleLogs={cycleLogs} toast={toast} />
        </div>

        {/* Row 3 - Quick Actions & Appointments */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
            <div onClick={() => setShowSymptomChecker(true)} className="glass-panel card-premium rounded-3xl p-6 group cursor-pointer flex flex-col justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform"><i className="fas fa-heart-pulse text-xl"></i></div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Symptom Checker</h3>
                <p className="text-xs text-slate-500">Log your symptoms to your cycle record.</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wide group-hover:gap-2 transition-all">Start Check <i className="fas fa-arrow-right"></i></span>
              </div>
            </div>

            <div onClick={() => setShowLabReports(true)} className="glass-panel card-premium rounded-3xl p-6 group cursor-pointer flex flex-col justify-between relative overflow-hidden">
              {pendingReportCount > 0 && <span className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce">{pendingReportCount} New</span>}
              <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform"><i className="fas fa-flask text-xl"></i></div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Lab Reports</h3>
                <p className="text-xs text-slate-500">View latest hormonal panels.</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-600 uppercase tracking-wide group-hover:gap-2 transition-all">View Results <i className="fas fa-arrow-right"></i></span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><i className="fas fa-calendar-check text-emerald-500"></i> Upcoming Visits</span>
              <button onClick={() => setShowQuickBook(true)} className="text-[10px] font-bold bg-aubergine-50 text-aubergine-700 hover:bg-aubergine-100 px-3 py-1.5 rounded-full transition-colors">+ Book</button>
            </h3>
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 2).map(apt => (
                <div key={apt.id} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-aubergine-200 transition-colors cursor-pointer shadow-sm group"
                  onClick={() => navigate('/patient-dashboard/appointments')}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 group-hover:text-aubergine-700 transition-colors">Dr. {apt.doctorName}</h4>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{apt.reason || 'Consultation'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black tracking-wide ${apt.type === 'Video Consult' ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-600'}`}>
                      {apt.type === 'Video Consult' ? 'VIDEO' : 'CLINIC'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5"><i className="fas fa-calendar text-aubergine-400"></i>{apt.date ? new Date(apt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'}</span>
                    <span className="flex items-center gap-1.5"><i className="fas fa-clock text-aubergine-400"></i>{apt.time}</span>
                  </div>
                </div>
              ))}
              {upcomingAppointments.length === 0 && (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">No upcoming visits.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      {showOnboarding && <OnboardingModal isOpen={showOnboarding} onClose={() => { localStorage.setItem('healnari_onboarding_done', 'true'); setOnboardingDone(true); setShowOnboarding(false); }} toast={toast} />}
      <VideoCallModal isOpen={showVideoCall} onClose={() => setShowVideoCall(false)} toast={toast} appointment={nextAppointment} />
      <SymptomCheckerModal isOpen={showSymptomChecker} onClose={() => setShowSymptomChecker(false)} toast={toast} />
      <LabReportsModal isOpen={showLabReports} onClose={() => setShowLabReports(false)} />
      <QuickBookModal isOpen={showQuickBook} onClose={() => setShowQuickBook(false)} toast={toast} addAppointment={addAppointment} />
    </div>
  );
}

export default PatientDashboard;
