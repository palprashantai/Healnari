import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { StepIndicator } from '../../components/StepIndicator.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

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

function SymptomCheckerModal({ isOpen, onClose, toast }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [severity, setSeverity] = useState(3);

  const toggleSymptom = (s) => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSubmit = () => {
    setStep(3);
    toast('Symptom report sent to Dr. Sarah Mitchell', 'success');
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
            {severity >= 8 ? 'High severity detected. Recommending urgent consult.' : 'We will send your report to your care team for review.'}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">← Back</button>
            <button onClick={handleSubmit} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Submit Report</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto"><i className="fas fa-circle-check"></i></div>
          <h4 className="font-black text-slate-800 text-lg">Report Submitted!</h4>
          <p className="text-sm text-slate-500">Dr. Sarah Mitchell will review your symptoms and respond within 2 hours.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 text-left space-y-1">
            <p className="font-bold">Logged Symptoms: <span className="font-normal text-aubergine-700">{selected.join(', ')}</span></p>
            <p className="font-bold">Severity: <span className="font-normal">{severity}/10</span></p>
          </div>
          <button onClick={reset} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Done</button>
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
      toast('Appointment booked! Confirmation SMS sent.', 'success');
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

/* ─── Cycle & Fertility widget — folds the phase-tip tracker together with a
   live teaser pulled from the real fertility-prediction endpoint, so the
   dashboard surfaces the same real numbers as the Fertility page. ─── */
function CycleFertilityWidget({ toast }) {
  const { logCycle, cycleLogs } = useClinicData();
  const navigate = useNavigate();
  const [fertility, setFertility] = useState(null);
  const [loadingFertility, setLoadingFertility] = useState(true);

  useEffect(() => {
    apiFetch('/patients/me/fertility-prediction')
      .then(setFertility)
      .catch(() => setFertility(null))
      .finally(() => setLoadingFertility(false));
  }, []);

  // Default to whatever phase was most recently logged; only fall back to a
  // neutral phase when there's no cycle history to read from yet.
  const [currentPhase, setCurrentPhase] = useState(() => {
    const dates = Object.keys(cycleLogs).sort().reverse();
    for (const d of dates) {
      if (cycleLogs[d]?.phase) return cycleLogs[d].phase;
    }
    return 'follicular';
  });
  const dateKey = todayLocalStr();
  const todayFlagKey = `cycle_logged_${dateKey}`;
  const [loggedToday, setLoggedToday] = useState(() => localStorage.getItem(todayFlagKey) === 'true');

  const phase = CYCLE_PHASES.find(p => p.id === currentPhase);

  const logToday = async () => {
    try {
      await logCycle(dateKey, { phase: phase.id });
      localStorage.setItem(todayFlagKey, 'true');
      setLoggedToday(true);
      toast(`Logged today as ${phase.label} phase.`, 'success');
    } catch {
      toast('Failed to save today\'s log. Please try again.', 'error');
    }
  };

  const hasFertility = fertility && fertility.classification !== 'insufficient_data';
  const cycleDay = hasFertility ? daysBetweenLocal(fertility.lastPeriodStart, dateKey) + 1 : null;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Cycle & Fertility</h3>
          <p className="text-sm text-slate-500">{cycleDay ? `Day ${cycleDay} of your cycle` : 'Tap a phase to see insights'}</p>
        </div>
        <button onClick={() => navigate('/patient-dashboard/fertility')}
          className="text-xs font-bold text-aubergine-600 hover:underline flex items-center gap-1 flex-shrink-0">
          Full Calendar <i className="fas fa-arrow-right text-[10px]"></i>
        </button>
      </div>

      {!loadingFertility && hasFertility && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-0.5">Fertile Window</p>
            <p className="font-black text-emerald-800 text-sm">{formatShort(fertility.fertileWindow[0])} – {formatShort(fertility.fertileWindow[1])}</p>
          </div>
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
            <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wide mb-0.5">Next Period</p>
            <p className="font-black text-sky-800 text-sm">{formatShort(fertility.nextPeriodEstimate)}</p>
          </div>
        </div>
      )}
      {!loadingFertility && !hasFertility && (
        <button onClick={() => navigate('/patient-dashboard/fertility')}
          className="w-full bg-slate-50 border border-dashed border-slate-200 hover:border-aubergine-300 rounded-xl p-3 mb-5 text-left transition-colors">
          <p className="text-xs font-bold text-slate-600"><i className="fas fa-circle-info text-aubergine-400 mr-1.5"></i>Log a couple of cycles to unlock fertile-window predictions here.</p>
        </button>
      )}

      {/* Phase Selector */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {CYCLE_PHASES.map(p => (
          <button key={p.id} onClick={() => { setCurrentPhase(p.id); toast(`Viewing ${p.label} phase`, 'info'); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${currentPhase === p.id ? 'border-aubergine-500 bg-aubergine-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
            <div className={`w-4 h-4 rounded-full ${p.color} ${currentPhase === p.id ? 'animate-pulse' : ''}`}></div>
            <span className={`text-[10px] font-black ${currentPhase === p.id ? 'text-aubergine-700' : 'text-slate-500'}`}>{p.label}</span>
            <span className="text-[9px] text-slate-500">{p.day}</span>
          </button>
        ))}
      </div>

      <div className="bg-sand-50 rounded-xl p-4 flex items-start gap-3 border border-sand-200 mb-4">
        <i className="fas fa-lightbulb text-amber-500 mt-0.5 flex-shrink-0"></i>
        <p className="text-sm text-slate-600">{phase.tip}</p>
      </div>

      {/* One real write action on the most-viewed screen, not only on the Tracking page */}
      <button onClick={logToday} disabled={loggedToday}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
          loggedToday
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
            : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'
        }`}>
        <i className={`fas ${loggedToday ? 'fa-circle-check' : 'fa-plus'}`}></i>
        {loggedToday ? "Today's phase logged" : `Log Today as ${phase.label}`}
      </button>
    </div>
  );
}

/* ─── Vitals snapshot — real readings from the Tracking page, not decoration. ─── */
function VitalsSnapshot({ vitals, discreet }) {
  const navigate = useNavigate();
  const hasAny = Object.keys(vitals || {}).length > 0;

  if (!hasAny) {
    return (
      <button onClick={() => navigate('/patient-dashboard/tracking')}
        className="w-full bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-aubergine-300 p-6 text-center transition-all">
        <i className="fas fa-heart-pulse text-slate-400 text-2xl mb-2 block"></i>
        <p className="font-bold text-slate-600 text-sm">Start tracking your vitals</p>
        <p className="text-xs text-slate-500 mt-0.5">Log weight, BP, sugar & sleep to see them here.</p>
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(VITALS_CONFIG).map(([key, cfg]) => {
        const reading = vitals[key];
        return (
          <button key={key} onClick={() => navigate('/patient-dashboard/tracking')}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-aubergine-200 transition-all text-left group">
            <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center mb-2 text-sm group-hover:scale-110 transition-transform`}>
              <i className={`fas ${cfg.icon}`}></i>
            </div>
            <div className={`font-black text-slate-800 text-lg ${discreet ? 'discreet-blur' : ''}`}>
              {reading ? reading.value : '—'} <span className="text-xs font-bold text-slate-400">{cfg.unit}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">{cfg.label}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Medications — real prescriptions, with a working refill request. ─── */
function MedicationsWidget({ meds, requestRefill, toast }) {
  const navigate = useNavigate();
  const list = (meds || []).slice(0, 3);

  const handleRefill = async (med) => {
    try {
      await requestRefill(med.id);
      toast('Refill requested — your doctor will review it.', 'success');
    } catch {
      toast('Failed to request refill. Please try again.', 'error');
    }
  };

  return (
    <div className="rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
        Medications
        <button onClick={() => navigate('/patient-dashboard/prescriptions')} className="text-xs text-aubergine-600 font-semibold hover:underline">View All</button>
      </h3>
      {list.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No active prescriptions yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map(med => (
            <div key={med.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-sm text-slate-800">{med.name}</p>
                <span className="text-[10px] font-bold text-slate-500">{med.frequency}</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{med.dosage}{med.duration ? ` • ${med.duration}` : ''}</p>
              {med.refillRequested ? (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full inline-flex items-center gap-1"><i className="fas fa-clock"></i>Refill requested</span>
              ) : med.refillsLeft <= 0 ? (
                <button onClick={() => handleRefill(med)}
                  className="text-[10px] font-bold text-white bg-aubergine-600 hover:bg-aubergine-700 px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1">
                  <i className="fas fa-rotate"></i>Request Refill
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{med.refillsLeft} refill{med.refillsLeft === 1 ? '' : 's'} left</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Health tip — deterministic daily rotation, no backend needed. ─── */
function HealthTipWidget() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const tip = HEALTH_TIPS[dayOfYear % HEALTH_TIPS.length];
  return (
    <div className="rounded-2xl p-5 border border-amber-100 shadow-sm bg-amber-50">
      <div className="flex items-center gap-2 mb-2">
        <i className="fas fa-lightbulb text-amber-500"></i>
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Health Tip of the Day</p>
      </div>
      <p className="text-sm text-amber-900 leading-relaxed"><i className={`fas ${tip.icon} mr-1.5 opacity-60`}></i>{tip.text}</p>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────── */
function PatientDashboard() {
  const { user } = useAuth();
  const { appointments, patients, addAppointment, lifestyleLogs, vitals, requestRefill } = useClinicData();
  const navigate = useNavigate();
  const toast = useToast();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [showLabReports, setShowLabReports] = useState(false);
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);

  useEffect(() => {
    apiFetch('/records/lab-reports')
      .then(reports => setPendingReportCount(reports.filter(r => r.status === 'Pending').length))
      .catch(() => setPendingReportCount(0));
  }, []);

  const own = patients?.[0];
  const upcomingAppointments = (appointments || [])
    .filter(a => !['Done', 'Cancelled', 'No Show'].includes(a.status))
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
  const nextAppointment = upcomingAppointments[0];
  const daysToNext = nextAppointment ? Math.max(0, daysUntil(nextAppointment.date)) : null;

  // The profile ask no longer blocks the very first paint — it waits for the dashboard
  // itself to render, then offers an inline, dismissible invite instead of a forced modal.
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem('healnari_onboarding_done') === 'true');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');

  const dismissOnboarding = () => {
    localStorage.setItem('healnari_onboarding_done', 'true');
    setOnboardingDone(true);
    setShowOnboarding(false);
  };

  // Real 7-day rolling completion, read from the same daily lifestyle
  // checklist the Tracking page writes to — no more hardcoded percentages.
  const goals = useMemo(() => {
    const GOAL_CONFIG = [
      { key: 'lowGI', label: 'PCOS Diet Plan', color: 'bg-emerald-500' },
      { key: 'exercise', label: 'Resistance Exercise', color: 'bg-sky-500' },
      { key: 'sleep', label: 'Sleep 8h / night', color: 'bg-aubergine-500' },
    ];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    return GOAL_CONFIG.map((g, i) => {
      const completedDays = last7Days.filter(d => lifestyleLogs[d]?.items?.[g.key]).length;
      return { id: i + 1, label: g.label, pct: Math.round((completedDays / last7Days.length) * 100), color: g.color };
    });
  }, [lifestyleLogs]);

  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  // A single, real, data-driven alert instead of a permanently-fake banner —
  // whichever is most time-sensitive right now, or nothing at all.
  const smartAlert = useMemo(() => {
    if (nextAppointment && nextAppointment.type === 'Video Consult' && daysToNext !== null && daysToNext <= 1) {
      return {
        icon: 'fa-video', label: daysToNext === 0 ? 'Today' : 'Tomorrow',
        title: `Video consultation with Dr. ${nextAppointment.doctorName}`,
        detail: `${daysToNext === 0 ? 'Today' : 'Tomorrow'} at ${nextAppointment.time}`,
        actionLabel: daysToNext === 0 ? 'Join Call' : 'View Details',
        onAction: () => (daysToNext === 0 ? setShowVideoCall(true) : navigate('/patient-dashboard/appointments')),
      };
    }
    if (pendingReportCount > 0) {
      return {
        icon: 'fa-flask', label: 'New',
        title: `${pendingReportCount} lab report${pendingReportCount > 1 ? 's' : ''} ready to review`,
        detail: 'Your latest results are in.',
        actionLabel: 'View Reports', onAction: () => setShowLabReports(true),
      };
    }
    const needsRefill = (own?.meds || []).find(m => m.refillsLeft <= 0 && !m.refillRequested);
    if (needsRefill) {
      return {
        icon: 'fa-pills', label: 'Action Needed',
        title: `${needsRefill.name} is out of refills`,
        detail: 'Request a refill so you don\'t run out.',
        actionLabel: 'Go to Prescriptions', onAction: () => navigate('/patient-dashboard/prescriptions'),
      };
    }
    return null;
  }, [nextAppointment, daysToNext, pendingReportCount, own, navigate]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header — informative, not decorative: greeting, real date, one-line status. */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-aubergine-600 uppercase tracking-widest mb-1">{todayLabel}</p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">
              {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-slate-500 mt-1">
              {nextAppointment
                ? <>Your next visit with Dr. {nextAppointment.doctorName} is <strong className="text-aubergine-700">{daysToNext === 0 ? 'today' : `in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`}</strong>.</>
                : "No upcoming visits booked — ready when you are."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowVideoCall(true)} disabled={!nextAppointment || nextAppointment.type !== 'Video Consult'}
              className="bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-all text-sm flex items-center gap-2">
              <i className="fas fa-video"></i> Join Call
            </button>
            <button onClick={() => setShowQuickBook(true)}
              className="bg-white border-2 border-aubergine-200 text-aubergine-700 hover:bg-aubergine-50 font-bold px-5 py-3 rounded-xl transition-all text-sm flex items-center gap-2">
              <i className="fas fa-calendar-plus"></i> Book Visit
            </button>
          </div>
        </div>
      </div>

      {/* Smart alert — only appears when there's something real and time-sensitive. */}
      {!alertDismissed && smartAlert && (
        <div className="bg-gradient-to-r from-aubergine-700 to-aubergine-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg shrink-0">
              <i className={`fas ${smartAlert.icon}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">{smartAlert.label}</span>
                <p className="font-black text-sm">{smartAlert.title}</p>
              </div>
              <p className="text-xs text-aubergine-100 mt-0.5">{smartAlert.detail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={smartAlert.onAction} className="bg-white text-aubergine-900 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-xs transition-colors">
              {smartAlert.actionLabel}
            </button>
            <button onClick={() => setAlertDismissed(true)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Vitals snapshot — real numbers from Tracking, front and center. */}
      <VitalsSnapshot vitals={vitals} discreet={discreet} />

      {/* Inline profile-completion invite — replaces a modal that used to block first
          paint. Same destination (OnboardingModal), just earned rather than forced. */}
      {!onboardingDone && (
        <div className="bg-aubergine-50 border border-aubergine-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-lg flex-shrink-0">
              <i className="fas fa-clipboard-user"></i>
            </div>
            <div>
              <p className="font-bold text-aubergine-900">Complete your health profile</p>
              <p className="text-xs text-aubergine-700">Two quick steps — helps your care team personalize what you see here.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowOnboarding(true)} className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap">
              Complete Profile
            </button>
            <button onClick={dismissOnboarding} aria-label="Dismiss profile prompt" title="Not now"
              className="w-9 h-9 rounded-xl border border-aubergine-200 text-aubergine-700 hover:bg-aubergine-100 transition-colors flex items-center justify-center">
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Cycle & Fertility */}
          <div className={`rounded-3xl border border-sand-200 shadow-sm overflow-hidden bg-white ${discreet ? 'discreet-blur' : ''}`}>
            <CycleFertilityWidget toast={toast} />
          </div>

          {/* Daily Wellness */}
          <div className="rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
            <h3 className="font-bold text-slate-800 mb-1 flex items-center justify-between">
              This Week's Wellness
              <button onClick={() => navigate('/patient-dashboard/tracking')} className="text-xs text-aubergine-600 font-semibold hover:underline">Log Today</button>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Rolling 7-day completion for your key habits.</p>
            <div className="space-y-4">
              {goals.map(g => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{g.label}</span>
                    <span className="text-xs font-black text-slate-600">{g.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${g.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${g.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div onClick={() => setShowSymptomChecker(true)}
              className="rounded-2xl p-6 border border-sand-200 shadow-sm hover:shadow-md hover:border-aubergine-200 transition-all group cursor-pointer bg-white">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-50 mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-heart-pulse text-xl text-rose-500"></i>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Symptom Checker</h3>
              <p className="text-sm text-slate-500">Run a quick AI-powered health assessment based on your symptoms.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">Start Check <i className="fas fa-arrow-right text-[10px]"></i></span>
            </div>

            <div onClick={() => setShowLabReports(true)}
              className="rounded-2xl p-6 border border-sand-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all group cursor-pointer bg-white">
              <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-flask text-xl text-sky-500"></i>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Lab Reports</h3>
              <p className="text-sm text-slate-500">View your latest blood work and hormonal panel results.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-sky-600">View Results <i className="fas fa-arrow-right text-[10px]"></i></span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Upcoming Appointments */}
          <div className="rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Upcoming Visits
              <button onClick={() => navigate('/patient-dashboard/appointments')}
                className="text-xs text-aubergine-600 font-semibold hover:underline">View All</button>
            </h3>
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 2).map(apt => (
                <div key={apt.id} className="p-3.5 rounded-xl border border-aubergine-100 bg-aubergine-50/40 hover:bg-aubergine-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/patient-dashboard/appointments')}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-aubergine-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-aubergine-700 text-sm">
                      {apt.doctorName.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Dr. {apt.doctorName}</h4>
                      <p className="text-xs text-aubergine-600 font-medium">{apt.reason || 'Consultation'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1"><i className="fas fa-calendar text-aubergine-400"></i>{apt.date ? new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</span>
                    <span className="flex items-center gap-1"><i className="fas fa-clock text-aubergine-400"></i>{apt.time}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${apt.type === 'Video Consult' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-slate-100 text-slate-600'}`}>
                      <i className={`fas ${apt.type === 'Video Consult' ? 'fa-video' : 'fa-hospital'} mr-1`}></i>{apt.type === 'Video Consult' ? 'Video' : 'Clinic'}
                    </span>
                  </div>
                </div>
              ))}
              {upcomingAppointments.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No upcoming visits. <button onClick={() => setShowQuickBook(true)} className="text-aubergine-600 font-bold hover:underline">Book one now</button></p>
              )}
            </div>
          </div>

          {/* Medications */}
          <MedicationsWidget meds={own?.meds} requestRefill={requestRefill} toast={toast} />

          {/* Health Tip */}
          <HealthTipWidget />

          {/* Quick Links */}
          <div className="rounded-2xl p-4 border border-slate-200 shadow-sm bg-gradient-to-br from-aubergine-900 to-aubergine-700 text-white">
            <p className="text-xs font-bold text-aubergine-200 mb-3 uppercase tracking-widest">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'My Records', icon: 'fa-folder-open', path: '/patient-dashboard/records' },
                { label: 'Prescriptions', icon: 'fa-pills', path: '/patient-dashboard/prescriptions' },
                { label: 'Billing', icon: 'fa-receipt', path: '/patient-dashboard/billing' },
                { label: 'Find Doctor', icon: 'fa-user-doctor', path: '/patient-dashboard/find-doctor' },
                { label: 'Fertility Insights', icon: 'fa-circle-dot', path: '/patient-dashboard/fertility' },
              ].map(link => (
                <button key={link.label} onClick={() => navigate(link.path)}
                  className="flex items-center gap-2 p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold transition-all">
                  <i className={`fas ${link.icon} text-aubergine-200`}></i> {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showOnboarding && <OnboardingModal isOpen={showOnboarding} onClose={dismissOnboarding} toast={toast} />}
      <VideoCallModal isOpen={showVideoCall} onClose={() => setShowVideoCall(false)} toast={toast} appointment={nextAppointment} />
      <SymptomCheckerModal isOpen={showSymptomChecker} onClose={() => setShowSymptomChecker(false)} toast={toast} />
      <LabReportsModal isOpen={showLabReports} onClose={() => setShowLabReports(false)} />
      <QuickBookModal isOpen={showQuickBook} onClose={() => setShowQuickBook(false)} toast={toast} addAppointment={addAppointment} />
    </div>
  );
}

export default PatientDashboard;
