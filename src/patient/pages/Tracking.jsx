import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';

/* ─── Config ─────────────────────────────────── */
const HIRSUTISM_GRADES = [
  { grade: 0, label: 'None', desc: 'No terminal hair growth.' },
  { grade: 1, label: 'Minimal', desc: 'Few scattered hairs on upper lip/chin.' },
  { grade: 2, label: 'Mild', desc: 'Definite hair lines on lip and chin.' },
  { grade: 3, label: 'Moderate', desc: 'Dense beard-pattern hair growth.' },
];

const VITALS_CONFIG = {
  weight: { label: 'Body Weight', icon: 'fa-weight-scale', color: 'bg-sky-50 text-sky-500', unit: 'kg' },
  bp: { label: 'Blood Pressure', icon: 'fa-heart-pulse', color: 'bg-rose-50 text-rose-500', unit: 'mmHg' },
  sugar: { label: 'Fasting Sugar', icon: 'fa-droplet', color: 'bg-amber-50 text-amber-500', unit: 'mg/dL' },
  sleep: { label: 'Sleep Duration', icon: 'fa-moon', color: 'bg-indigo-50 text-indigo-500', unit: 'hrs' },
};

const LIFESTYLE_ITEMS = [
  { key: 'sleep', label: '8 Hours Restful Sleep', icon: 'fa-moon', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { key: 'lowGI', label: 'Low-GI, Anti-Inflammatory Nutrition', icon: 'fa-wheat-awn', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { key: 'exercise', label: '30 Mins Resistance Exercise', icon: 'fa-dumbbell', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { key: 'meds', label: 'Myo-Inositol / Prescribed Meds Taken', icon: 'fa-pills', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { key: 'water', label: 'Drink 2.5L Water', icon: 'fa-bottle-water', color: 'text-sky-600 bg-sky-50 border-sky-100' },
  { key: 'stress', label: 'Mindfulness / Stress Management (10 mins)', icon: 'fa-brain', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
];

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Derives a "vs last reading" trend line from the current + previous logged values. */
function computeTrend(current, previous, unit) {
  if (previous == null) return { text: 'First reading logged', color: 'text-slate-500' };
  const curNum = parseFloat(current);
  const prevNum = parseFloat(previous);
  if (!isNaN(curNum) && !isNaN(prevNum)) {
    const diff = +(curNum - prevNum).toFixed(2);
    if (diff === 0) return { text: '✓ No change from last log', color: 'text-slate-500' };
    const arrow = diff > 0 ? '↑' : '↓';
    return { text: `${arrow} ${Math.abs(diff)} ${unit} from last log`, color: diff > 0 ? 'text-amber-600' : 'text-emerald-600' };
  }
  if (current === previous) return { text: '✓ Same as last log', color: 'text-slate-500' };
  return { text: `Updated from ${previous}`, color: 'text-slate-500' };
}

/* ─── Log Vital Modal ────────────────────────── */
function LogVitalModal({ vitalKey, vital, isOpen, onClose, onSave }) {
  const [value, setValue] = useState(vital?.value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(vitalKey, value.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!vital) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log ${vital.label}`} size="sm">
      <div className="space-y-4">
        <div className={`w-14 h-14 ${vital.color} rounded-2xl flex items-center justify-center text-2xl mx-auto`}>
          <i className={`fas ${vital.icon}`}></i>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">
            Enter today's {vital.label} ({vital.unit})
          </label>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`e.g. ${vital.value || ''}`}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-center focus:outline-none focus:ring-2 focus:ring-aubergine-300"
            autoFocus
          />
          <p className="text-xs text-slate-500 text-center mt-1">Unit: {vital.unit}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {saving ? 'Saving…' : 'Save Reading'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Cycle Log Modal ────────────────────────── */
function CycleLogModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ flow: 'Medium', cramps: 2, mood: 'Calm', symptoms: [] });
  const SYMPTOMS_LIST = ['Cramps', 'Bloating', 'Headache', 'Fatigue', 'Back Pain', 'Nausea'];

  const toggleSymptom = (s) => setForm(p => ({ ...p, symptoms: p.symptoms.includes(s) ? p.symptoms.filter(x => x !== s) : [...p.symptoms, s] }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Today's Cycle" size="md">
      <div className="space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">Flow Intensity</label>
          <div className="flex gap-2">
            {['Light', 'Medium', 'Heavy', 'Spotting'].map(f => (
              <button key={f} onClick={() => setForm(p => ({ ...p, flow: f }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.flow === f ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">Cramp Level: {form.cramps}/5</label>
          <input type="range" min={0} max={5} value={form.cramps} onChange={e => setForm(p => ({ ...p, cramps: +e.target.value }))}
            className="w-full accent-rose-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">Mood</label>
          <div className="flex flex-wrap gap-2">
            {['Happy', 'Calm', 'Irritable', 'Anxious', 'Sad', 'Energised'].map(m => (
              <button key={m} onClick={() => setForm(p => ({ ...p, mood: m }))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.mood === m ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">Additional Symptoms</label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS_LIST.map(s => (
              <button key={s} onClick={() => toggleSymptom(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.symptoms.includes(s) ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { onSave(form); onClose(); }}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          Save Today's Log
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientTracking() {
  const toast = useToast();
  const { logCycle, vitals, logVital, lifestyleLogs, logLifestyle } = useClinicData();
  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');
  const [hirsutismGrade, setHirsutismGrade] = useState(() => {
    const v = vitals.hirsutism?.value;
    return v !== undefined ? parseInt(v, 10) || 0 : 0;
  });
  const [lifestyle, setLifestyle] = useState(() => {
    const saved = lifestyleLogs[todayKey()]?.items || {};
    return LIFESTYLE_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: !!saved[item.key] }), {});
  });
  const [shareLog, setShareLog] = useState(localStorage.getItem('share_tracking_log') === 'true');
  const [logModal, setLogModal] = useState(null); // { key, vital }
  const [showCycleLog, setShowCycleLog] = useState(false);
  const [lastCycleLog, setLastCycleLog] = useState(null);
  const [logSaved, setLogSaved] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  const handleShareToggle = () => {
    const next = !shareLog;
    setShareLog(next);
    localStorage.setItem('share_tracking_log', next ? 'true' : 'false');
    toast(next ? 'Logs shared with your care team.' : 'Log sharing disabled.', next ? 'success' : 'info');
  };

  const handleVitalSave = async (key, value) => {
    const config = VITALS_CONFIG[key];
    try {
      await logVital(key, value, config.unit);
      toast(`${config.label} updated to ${value} ${config.unit}`, 'success');
    } catch {
      toast(`Failed to save ${config.label}. Please try again.`, 'error');
    }
  };

  const handleHirsutismSelect = async (grade) => {
    setHirsutismGrade(grade);
    try {
      await logVital('hirsutism', String(grade), '');
      toast(`Grade ${grade} (${HIRSUTISM_GRADES[grade].label}) selected.`, 'info');
    } catch {
      toast('Failed to save hirsutism grade. Please try again.', 'error');
    }
  };

  const toggleLifestyle = (key) => {
    setLifestyle(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveLifestyleLog = async () => {
    setSavingLog(true);
    try {
      await logLifestyle(todayKey(), lifestyle);
      const completed = Object.values(lifestyle).filter(Boolean).length;
      setLogSaved(true);
      toast(`Daily log saved! ${completed}/${LIFESTYLE_ITEMS.length} habits completed today.`, 'success');
      setTimeout(() => setLogSaved(false), 3000);
    } catch {
      toast('Failed to save daily log. Please try again.', 'error');
    } finally {
      setSavingLog(false);
    }
  };

  const handleCycleLogSave = async (form) => {
    setLastCycleLog(form);
    try {
      await logCycle(todayKey(), form);
      toast('Cycle log saved! Your doctor can see this in real-time.', 'success');
    } catch {
      toast('Failed to save cycle log. Please try again.', 'error');
    }
  };

  const completedCount = Object.values(lifestyle).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Health & Endocrine Tracking</h1>
          <p className="text-sm text-slate-500">Log vitals, cycle, and lifestyle parameters for your care team.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCycleLog(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-circle-dot"></i> Log Cycle
          </button>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl cursor-pointer shadow-sm hover:bg-slate-50">
            <input type="checkbox" checked={shareLog} onChange={handleShareToggle} className="accent-aubergine-600 w-4 h-4 rounded" />
            Share with Doctor
          </label>
        </div>
      </div>

      {/* Last Cycle Log Banner */}
      {lastCycleLog && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center"><i className="fas fa-circle-dot"></i></div>
          <div>
            <p className="font-bold text-rose-800 text-sm">Today's Cycle Logged</p>
            <p className="text-xs text-rose-700">Flow: {lastCycleLog.flow} • Cramps: {lastCycleLog.cramps}/5 • Mood: {lastCycleLog.mood}</p>
          </div>
          <button onClick={() => setLastCycleLog(null)} className="ml-auto text-rose-400 hover:text-rose-600"><i className="fas fa-xmark"></i></button>
        </div>
      )}

      {/* Vitals Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(VITALS_CONFIG).map(([key, config]) => {
          const reading = vitals[key];
          const trend = reading ? computeTrend(reading.value, reading.previousValue, config.unit) : { text: 'No readings yet', color: 'text-slate-400' };
          const vital = { ...config, value: reading?.value ?? '—' };
          return (
            <div key={key} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-aubergine-200 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-11 h-11 rounded-xl ${config.color} flex items-center justify-center text-lg`}>
                  <i className={`fas ${config.icon}`}></i>
                </div>
                <button onClick={() => setLogModal({ key, vital })}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs border border-aubergine-100"
                  aria-label="Update reading"
                  title="Update Reading">
                  <i className="fas fa-pen"></i>
                </button>
              </div>
              <h3 className="text-slate-500 font-semibold text-xs mb-1">{config.label}</h3>
              <div className={`flex items-end gap-1.5 transition-all ${discreet ? 'discreet-blur' : ''}`}>
                <span className="text-3xl font-black text-slate-800">{vital.value}</span>
                <span className="text-sm font-bold text-slate-500 mb-1">{config.unit}</span>
              </div>
              <div className={`mt-3 text-xs font-bold ${trend.color} flex items-center gap-1`}>{trend.text}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Androgen Tracker */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Androgen Excess Tracker</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ferriman-Gallwey scale visual grading for hirsutism tracking.</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {HIRSUTISM_GRADES.map(g => (
              <button key={g.grade} onClick={() => handleHirsutismSelect(g.grade)}
                className={`p-3 rounded-xl border text-center transition-all ${hirsutismGrade === g.grade ? 'border-aubergine-500 bg-aubergine-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 text-xs font-black ${hirsutismGrade === g.grade ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-100 text-slate-500'}`}>
                  FG {g.grade}
                </div>
                <div className="text-xs font-bold text-slate-700">{g.label}</div>
              </button>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <strong>Selected:</strong> {HIRSUTISM_GRADES[hirsutismGrade].desc} Monthly tracking helps evaluate anti-androgenic therapy response.
          </div>
        </div>

        {/* Daily Lifestyle Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Daily PCOS Lifestyle Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Today's healthy habits tracker</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-aubergine-600">{completedCount}<span className="text-sm text-slate-500">/{LIFESTYLE_ITEMS.length}</span></div>
              <div className="text-[10px] text-slate-500 font-bold">Completed</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-aubergine-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${(completedCount / LIFESTYLE_ITEMS.length) * 100}%` }}></div>
          </div>

          <div className="space-y-2">
            {LIFESTYLE_ITEMS.map(item => {
              const isChecked = lifestyle[item.key];
              return (
                <div key={item.key} onClick={() => toggleLifestyle(item.key)}
                  className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all select-none ${isChecked ? 'border-emerald-400 bg-emerald-50/50 text-emerald-900' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs ${item.color}`}>
                      <i className={`fas ${item.icon}`}></i>
                    </div>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                    {isChecked && <i className="fas fa-check text-white text-[9px]"></i>}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={saveLifestyleLog} disabled={savingLog}
            className={`w-full font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${logSaved ? 'bg-emerald-500 text-white' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
            <i className={`fas ${logSaved ? 'fa-circle-check' : 'fa-floppy-disk'}`}></i>
            {savingLog ? 'Saving…' : logSaved ? 'Log Saved!' : "Save Today's Log"}
          </button>
        </div>
      </div>

      {/* Modals */}
      {logModal && (
        <LogVitalModal
          isOpen={!!logModal}
          onClose={() => setLogModal(null)}
          vitalKey={logModal.key}
          vital={logModal.vital}
          onSave={handleVitalSave}
        />
      )}
      <CycleLogModal isOpen={showCycleLog} onClose={() => setShowCycleLog(false)} onSave={handleCycleLogSave} />
    </div>
  );
}

export default PatientTracking;
