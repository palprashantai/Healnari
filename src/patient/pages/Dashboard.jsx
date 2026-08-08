import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { StepIndicator } from '../../components/StepIndicator.jsx';

/* ─── Dummy Data ─────────────────────────────── */
const CYCLE_PHASES = [
  { id: 'menstrual', label: 'Menstrual', day: 'Day 1–5', color: 'bg-rose-500', text: 'text-rose-600', tip: 'Rest & iron-rich foods. Gentle yoga is helpful.' },
  { id: 'follicular', label: 'Follicular', day: 'Day 6–13', color: 'bg-sky-500', text: 'text-sky-600', tip: 'Energy rising! Great time for cardio & learning new skills.' },
  { id: 'ovulation', label: 'Ovulation', day: 'Day 14', color: 'bg-amber-500', text: 'text-amber-600', tip: 'Peak fertility. You may feel more social & energised.' },
  { id: 'luteal', label: 'Luteal', day: 'Day 15–28', color: 'bg-aubergine-500', text: 'text-aubergine-600', tip: 'Progesterone rises. Prioritise sleep & limit caffeine.' },
];

const SYMPTOMS = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Mood Swings', 'Spotting', 'Nausea', 'Back Pain', 'Breast Tenderness', 'Acne'];

/* ─── Sub-components ─────────────────────────── */
function VideoCallModal({ isOpen, onClose, toast }) {
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const handleJoin = () => {
    setCallActive(true);
    toast('Connected to video call with Dr. Sarah Mitchell', 'success');
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
            <h4 className="font-black text-slate-800 text-xl">Dr. Sarah Mitchell</h4>
            <p className="text-sm text-aubergine-600 font-semibold">Gynaecologist • Online</p>
            <p className="text-xs text-slate-500 mt-1">Scheduled: Today 4:30 PM • 30 min consult</p>
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
                <div className="w-20 h-20 rounded-full bg-aubergine-700 flex items-center justify-center text-3xl font-black text-white mx-auto mb-3">SM</div>
                <p className="text-white font-bold">Dr. Sarah Mitchell</p>
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
  const LABS = [
    { name: 'Testosterone (Total)', value: '68 ng/dL', ref: '15–70 ng/dL', status: 'normal' },
    { name: 'LH : FSH Ratio', value: '2.8 : 1', ref: '< 2 : 1 (normal)', status: 'high' },
    { name: 'Fasting Insulin', value: '14 mU/L', ref: '< 10 mU/L', status: 'high' },
    { name: 'HbA1c', value: '5.4%', ref: '< 5.7%', status: 'normal' },
    { name: 'TSH', value: '2.1 mIU/L', ref: '0.4–4.0 mIU/L', status: 'normal' },
    { name: 'Vitamin D', value: '18 ng/mL', ref: '> 30 ng/mL', status: 'low' },
  ];

  const STATUS = { normal: 'text-emerald-600 bg-emerald-50', high: 'text-rose-600 bg-rose-50', low: 'text-amber-600 bg-amber-50' };
  const PLAIN_LANGUAGE = {
    normal: 'Within the healthy range — no action needed.',
    high: 'Above the healthy range. Your doctor will review this with you.',
    low: 'Below the healthy range. Your doctor will review this with you.',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hormonal Panel — Aug 2026" size="lg">
      <div className="space-y-3">
        <p className="text-xs text-slate-500 mb-4">Ordered by Dr. Ritu Khanna • Lal PathLabs • 3 Aug 2026</p>
        {LABS.map(lab => (
          <div key={lab.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-sm">{lab.name}</p>
                <p className="text-xs text-slate-500">Ref: {lab.ref}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">{lab.value}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[lab.status]}`}>
                  {lab.status.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/70">
              <i className="fas fa-circle-info text-slate-500 mr-1"></i>{PLAIN_LANGUAGE[lab.status]}
            </p>
          </div>
        ))}
        <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-100">Reviewed by Dr. Sarah Mitchell on 5 Aug 2026. Repeat panel recommended in 3 months.</p>
      </div>
    </Modal>
  );
}

function QuickBookModal({ isOpen, onClose, toast }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ doctor: '', type: 'Video', date: '', slot: '' });
  const DOCTORS = ['Dr. Sarah Mitchell (Gynaecologist)', 'Dr. Ananya Mehta (Endocrinologist)', 'Dr. Ritu Khanna (Thyroid)', 'Dr. Shreya Verma (Dermatologist)'];
  const SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '3:00 PM', '4:30 PM', '6:00 PM'];

  const confirm = () => {
    onClose();
    toast('Appointment booked! Confirmation SMS sent.', 'success');
    setStep(1); setForm({ doctor: '', type: 'Video', date: '', slot: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Appointment" size="md">
      <StepIndicator step={step} total={2} labels={['Details', 'Confirm']} />
      {step === 1 && (
        <div className="space-y-4 mt-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Doctor</label>
            <select value={form.doctor} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
              <option value="">-- Choose a specialist --</option>
              {DOCTORS.map(d => <option key={d}>{d}</option>)}
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
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <button disabled={!form.doctor || !form.date} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            See Available Slots →
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 mt-3">
          <p className="text-sm font-bold text-slate-700">Available slots for {form.date}:</p>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map(slot => (
              <button key={slot} onClick={() => setForm(p => ({ ...p, slot }))}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${form.slot === slot ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                {slot}
              </button>
            ))}
          </div>
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs text-aubergine-800 space-y-1">
            <p className="font-bold">{form.doctor}</p>
            <p>{form.type} • {form.date} • {form.slot || 'No slot selected'}</p>
            <p className="text-aubergine-600">Fee: ₹799 (Standard Consult)</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">← Back</button>
            <button disabled={!form.slot} onClick={confirm}
              className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              Confirm Booking ✓
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Cycle Dashboard ────────────────────────── */
function CycleDashboardView({ toast }) {
  const [currentPhase, setCurrentPhase] = useState('ovulation');
  const todayKey = `cycle_logged_${new Date().toISOString().slice(0, 10)}`;
  const [loggedToday, setLoggedToday] = useState(() => localStorage.getItem(todayKey) === 'true');

  const phase = CYCLE_PHASES.find(p => p.id === currentPhase);

  const logToday = () => {
    localStorage.setItem(todayKey, 'true');
    setLoggedToday(true);
    toast(`Logged today as ${phase.label} phase.`, 'success');
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Cycle Overview</h3>
          <p className="text-sm text-slate-500">Tap a phase to see insights</p>
        </div>
        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${phase.text} bg-opacity-10`}
          style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
          {phase.label} Phase
        </span>
      </div>

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

      {/* Progress bar */}
      <div className="relative pt-1 pb-4 mb-4">
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="h-2 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-aubergine-500 transition-all duration-500"
            style={{ width: currentPhase === 'menstrual' ? '12%' : currentPhase === 'follicular' ? '45%' : currentPhase === 'ovulation' ? '50%' : '90%' }}></div>
        </div>
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

function OnboardingModal({ isOpen, onClose, toast }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ age: '', height: '', weight: '', bloodGroup: '', conditions: [] });

  const CONDITIONS = ['PCOS / PCOD', 'Endometriosis', 'Thyroid Issues', 'Diabetes', 'Hypertension', 'None'];

  const toggleCondition = (c) => setForm(p => ({
    ...p,
    conditions: p.conditions.includes(c) ? p.conditions.filter(x => x !== c) : [...p.conditions, c]
  }));

  const handleComplete = () => {
    toast('Profile setup complete! Welcome to HealNari.', 'success');
    onClose();
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
          <button onClick={handleComplete}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-check"></i> Complete Profile
          </button>
          <button onClick={onClose} className="w-full text-center text-xs text-slate-500 hover:text-slate-600 font-semibold">
            Skip for now
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Dashboard ─────────────────────────── */
function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [showLabReports, setShowLabReports] = useState(false);
  const [showQuickBook, setShowQuickBook] = useState(false);
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
  const [goals, setGoals] = useState([
    { id: 1, label: 'PCOS Diet Plan', pct: 80, color: 'bg-emerald-500' },
    { id: 2, label: 'Daily Step Goal', pct: 65, color: 'bg-sky-500' },
    { id: 3, label: 'Sleep 8h / night', pct: 72, color: 'bg-aubergine-500' },
  ]);

  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Sticky Actionable Health Alert Bar (WCAG AAA Contrast) */}
      {!alertDismissed && (
        <div className="sticky top-0 z-30 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white rounded-2xl p-4 shadow-lg border border-amber-400/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg shrink-0">
              <i className="fas fa-bell-exclamation animate-bounce"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/30 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">Action Required</span>
                <p className="font-black text-sm">Fasting Lab Test Scheduled</p>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">Maintain 10-hour fasting prior to your 8:00 AM Hormonal Panel at City Scans tomorrow.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLabReports(true)} className="bg-white text-rose-900 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs">
              View Instructions
            </button>
            <button onClick={() => { setAlertDismissed(true); toast('Alert dismissed for this session.', 'info'); }} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-aubergine-900 to-aubergine-700 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-aubergine-400/20 blur-2xl rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Portal Active
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Welcome back, {user?.name?.split(' ')[0] || 'Priya'}! 👋
          </h1>
          <p className="text-aubergine-100 text-lg max-w-xl">
            Your next consultation with Dr. Sarah Mitchell is in <span className="font-black text-white">3 days</span>. Stay on track!
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => setShowVideoCall(true)}
              className="bg-white text-aubergine-900 hover:bg-sand-50 font-black px-6 py-3 rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 hover:scale-105">
              <i className="fas fa-video"></i> Join Upcoming Call
            </button>
            <button onClick={() => setShowQuickBook(true)}
              className="bg-aubergine-700/50 hover:bg-aubergine-700/70 border border-aubergine-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm flex items-center gap-2">
              <i className="fas fa-calendar-plus"></i> Book New
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip — held still so the numbers are legible to scan at a glance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Next Appointment', value: '3 Days', icon: 'fa-calendar', color: 'text-aubergine-600 bg-aubergine-50', onClick: () => navigate('/patient-dashboard/appointments') },
          { label: 'Active Prescriptions', value: '2 Rx', icon: 'fa-pills', color: 'text-emerald-600 bg-emerald-50', onClick: () => navigate('/patient-dashboard/prescriptions') },
          { label: 'Health Score', value: '82/100', icon: 'fa-heart-pulse', color: 'text-rose-600 bg-rose-50', onClick: () => navigate('/patient-dashboard/tracking') },
          { label: 'Unread Reports', value: '1 New', icon: 'fa-file-medical', color: 'text-sky-600 bg-sky-50', onClick: () => setShowLabReports(true) },
        ].map(stat => (
          <button key={stat.label} onClick={stat.onClick}
            className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-aubergine-200 transition-all group text-left">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="font-black text-slate-800 text-lg">{stat.value}</div>
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
          </button>
        ))}
      </div>

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

          {/* Cycle Tracker */}
          <div className={`rounded-3xl border border-sand-200 shadow-sm overflow-hidden bg-white ${discreet ? 'discreet-blur' : ''}`}>
            <CycleDashboardView toast={toast} />
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
              {[
                { name: 'Dr. Sarah Mitchell', spec: 'Gynaecology', date: 'Mon, 10 Aug', time: '10:30 AM', type: 'video' },
                { name: 'Dr. Ritu Khanna', spec: 'Endocrinology', date: 'Tue, 25 Aug', time: '11:15 AM', type: 'clinic' },
              ].map(apt => (
                <div key={apt.name} className="p-3.5 rounded-xl border border-aubergine-100 bg-aubergine-50/40 hover:bg-aubergine-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/patient-dashboard/appointments')}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-aubergine-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-aubergine-700 text-sm">
                      {apt.name.split(' ')[1]?.[0]}{apt.name.split(' ')[2]?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{apt.name}</h4>
                      <p className="text-xs text-aubergine-600 font-medium">{apt.spec}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1"><i className="fas fa-calendar text-aubergine-400"></i>{apt.date}</span>
                    <span className="flex items-center gap-1"><i className="fas fa-clock text-aubergine-400"></i>{apt.time}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${apt.type === 'video' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-slate-100 text-slate-600'}`}>
                      <i className={`fas ${apt.type === 'video' ? 'fa-video' : 'fa-hospital'} mr-1`}></i>{apt.type === 'video' ? 'Video' : 'Clinic'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Goals */}
          <div className="rounded-2xl p-6 border border-slate-200 shadow-sm bg-white">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Current Focus
              <button onClick={() => navigate('/patient-dashboard/tracking')} className="text-xs text-aubergine-600 font-semibold hover:underline">Track</button>
            </h3>
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
              <button onClick={() => { toast('Goal log updated for today!', 'success'); }}
                className="w-full mt-2 border border-dashed border-aubergine-300 text-aubergine-600 hover:bg-aubergine-50 rounded-xl py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                <i className="fas fa-plus"></i> Log Today's Progress
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl p-4 border border-slate-200 shadow-sm bg-gradient-to-br from-aubergine-900 to-aubergine-700 text-white">
            <p className="text-xs font-bold text-aubergine-200 mb-3 uppercase tracking-widest">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'My Records', icon: 'fa-folder-open', path: '/patient-dashboard/records' },
                { label: 'Prescriptions', icon: 'fa-pills', path: '/patient-dashboard/prescriptions' },
                { label: 'Billing', icon: 'fa-receipt', path: '/patient-dashboard/billing' },
                { label: 'Find Doctor', icon: 'fa-user-doctor', path: '/patient-dashboard/find-doctor' },
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
      <VideoCallModal isOpen={showVideoCall} onClose={() => setShowVideoCall(false)} toast={toast} />
      <SymptomCheckerModal isOpen={showSymptomChecker} onClose={() => setShowSymptomChecker(false)} toast={toast} />
      <LabReportsModal isOpen={showLabReports} onClose={() => setShowLabReports(false)} />
      <QuickBookModal isOpen={showQuickBook} onClose={() => setShowQuickBook(false)} toast={toast} />
    </div>
  );
}

export default PatientDashboard;
