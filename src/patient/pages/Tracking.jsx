import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { LIFESTYLE_ITEMS } from '../lifestyleConfig.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AIButton } from '../../components/AiButton.jsx';

/* ─── Config ─────────────────────────────────── */
const HIRSUTISM_GRADES = [
  { grade: 0, label: 'No extra hair', dots: 0, desc: 'You do not see any extra hair growth.' },
  { grade: 1, label: 'A little hair', dots: 1, desc: 'A few hairs on the upper lip or chin.' },
  { grade: 2, label: 'Noticeable hair', dots: 2, desc: 'Clear hair growth on the lip and chin.' },
  { grade: 3, label: 'Thick hair growth', dots: 3, desc: 'Thick, beard-like hair growth on the face.' },
];

export const MFG_BODY_AREAS = [
  { id: 'lip', name: 'Upper Lip', icon: 'fa-face-smile', max: 4, desc: '0: None to 4: Complete continuous mustache' },
  { id: 'chin', name: 'Chin & Jaw', icon: 'fa-face-grimace', max: 4, desc: '0: None to 4: Heavy dense beard-pattern' },
  { id: 'chest', name: 'Chest / Sternum', icon: 'fa-heart', max: 4, desc: '0: None to 4: Continuous sternal coverage' },
  { id: 'up_ab', name: 'Upper Abdomen', icon: 'fa-circle-dot', max: 4, desc: '0: None to 4: Complete midline triangle' },
  { id: 'low_ab', name: 'Lower Abdomen', icon: 'fa-shield-halved', max: 4, desc: '0: None to 4: Full male-pattern escutcheon' },
  { id: 'up_back', name: 'Upper Back', icon: 'fa-person', max: 4, desc: '0: None to 4: Broad dense shoulder coverage' },
  { id: 'low_back', name: 'Lower Back', icon: 'fa-user', max: 4, desc: '0: None to 4: Complete sacral/lower back hair' },
  { id: 'arms', name: 'Upper Arms', icon: 'fa-hand-fist', max: 4, desc: '0: None to 4: Dense upper arm coverage' },
  { id: 'thighs', name: 'Thighs', icon: 'fa-person-walking', max: 4, desc: '0: None to 4: Complete bilateral thigh coverage' },
];

const VITALS_CONFIG = {
  bbt: { label: 'Basal Body Temp', icon: 'fa-temperature-half', color: 'bg-magenta-50 text-magenta-600', unit: '°C' },
  lh: { label: 'LH Surge (T/C)', icon: 'fa-vial-circle-check', color: 'bg-aubergine-50 text-aubergine-600', unit: 'ratio' },
  weight: { label: 'Body Weight', icon: 'fa-weight-scale', color: 'bg-aubergine-50 text-aubergine-700', unit: 'kg' },
  bp: { label: 'Blood Pressure', icon: 'fa-heart-pulse', color: 'bg-rose-50 text-rose-600', unit: 'mmHg' },
  sugar: { label: 'Fasting Sugar', icon: 'fa-droplet', color: 'bg-amber-50 text-amber-600', unit: 'mg/dL' },
  sleep: { label: 'Sleep Duration', icon: 'fa-moon', color: 'bg-aubergine-50 text-aubergine-600', unit: 'hrs' },
  hotflashes: { label: 'Hot Flashes', icon: 'fa-fire-flame-curved', color: 'bg-rose-50 text-rose-600', unit: 'episodes' },
};

const todayKey = todayLocalStr;

const VITAL_EXAMPLES = { bbt: '36.65', lh: '1.2', weight: '65', bp: '120/80', sugar: '95', sleep: '7.5', hotflashes: '3' };

/** Derives a "vs last reading" trend line from the current + previous logged values. */
function computeTrend(current, previous, unit) {
  if (previous == null) return { text: 'First reading logged', color: 'text-slate-500' };
  if (current === previous) return { text: '✓ No change from last log', color: 'text-slate-500' };

  const curBp = typeof current === 'string' && current.match(/^(\d+)\/(\d+)$/);
  const prevBp = typeof previous === 'string' && previous.match(/^(\d+)\/(\d+)$/);
  if (curBp && prevBp) {
    const sysDiff = +curBp[1] - +prevBp[1];
    const diaDiff = +curBp[2] - +prevBp[2];
    if (sysDiff === 0 && diaDiff === 0) return { text: '✓ No change from last log', color: 'text-slate-500' };
    const worse = sysDiff > 0 || diaDiff > 0;
    return { text: `${worse ? '↑' : '↓'} ${Math.abs(sysDiff)}/${Math.abs(diaDiff)} ${unit} from last log`, color: worse ? 'text-amber-600' : 'text-emerald-600' };
  }

  const curNum = parseFloat(current);
  const prevNum = parseFloat(previous);
  if (!isNaN(curNum) && !isNaN(prevNum)) {
    const diff = +(curNum - prevNum).toFixed(2);
    if (diff === 0) return { text: '✓ No change from last log', color: 'text-slate-500' };
    const arrow = diff > 0 ? '↑' : '↓';
    return { text: `${arrow} ${Math.abs(diff)} ${unit} from last log`, color: diff > 0 ? 'text-amber-600' : 'text-emerald-600' };
  }
  return { text: `Updated from ${previous}`, color: 'text-slate-500' };
}

// Zod schemas for validation
const vitalSchemas = {
  bbt: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 35 && parseFloat(val) <= 41, "BBT must be between 35.0°C and 41.0°C"),
  lh: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 5, "LH T/C ratio must be between 0.0 and 5.0"),
  weight: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) < 300, "Weight must be a valid number between 0 and 300"),
  bp: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "BP must be in format SYS/DIA (e.g., 120/80)"),
  sugar: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Sugar must be a positive number"),
  sleep: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 24, "Sleep must be between 0 and 24 hours"),
  hotflashes: z.string().refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0 && parseInt(val, 10) <= 50, "Episodes must be between 0 and 50"),
};

/* ─── Modified Ferriman-Gallwey (mFG) Clinical Modal ─── */
function MfgAssessmentModal({ isOpen, onClose, onSave, currentScores }) {
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (isOpen) {
      setScores(currentScores || {});
    }
  }, [isOpen, currentScores]);

  const totalScore = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
  const staging = totalScore < 8
    ? { label: 'Normal / Minimal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    : totalScore <= 15
    ? { label: 'Mild Hirsutism', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    : { label: 'Moderate-to-Severe Hirsutism', color: 'text-rose-700 bg-rose-50 border-rose-200' };

  const handleScoreChange = (id, val) => {
    setScores(prev => ({ ...prev, [id]: val }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modified Ferriman-Gallwey (mFG) Assessment" size="lg">
      <div className="space-y-5">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Clinical 9-Area Body Hair Mapping</h4>
            <p className="text-xs text-slate-500 mt-0.5">This is a self-assessment guide. Share this with your gynaecologist for clinical interpretation.</p>
          </div>
          <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${staging.color}`}>
            <span>Total Score: <strong className="text-base">{totalScore}</strong>/36</span>
            <span>• {staging.label}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {MFG_BODY_AREAS.map(area => {
            const currentVal = scores[area.id] ?? 0;
            return (
              <div key={area.id} className="p-3.5 rounded-2xl border border-slate-100 bg-white hover:border-aubergine-200 transition-all shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-aubergine-50 text-aubergine-600 flex items-center justify-center text-xs">
                      <i className={`fas ${area.icon}`}></i>
                    </div>
                    <span className="font-bold text-xs text-slate-800">{area.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-aubergine-700 bg-aubergine-50 px-2 py-0.5 rounded-md">
                    Grade {currentVal}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2 leading-tight">{area.desc}</p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleScoreChange(area.id, val)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        currentVal === val
                          ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 italic">Score &ge;8 points warrants endocrine androgen profile workup.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onSave(totalScore, scores); onClose(); }}
              className="px-5 py-2 text-xs font-bold text-white bg-aubergine-600 hover:bg-aubergine-700 rounded-xl shadow-md transition-all"
            >
              Save mFG Score ({totalScore})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Log Vital Modal ────────────────────────── */
function LogVitalModal({ vitalKey, config, currentValue, isOpen, onClose, onSave }) {
  const schema = z.object({
    value: vitalSchemas[vitalKey] || z.string().min(1, "Cannot be empty")
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { value: currentValue || '' }
  });

  useEffect(() => {
    if (isOpen) {
      reset({ value: currentValue || '' });
    }
  }, [isOpen, currentValue, reset]);

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await onSave(vitalKey, data.value.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!config) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log ${config.label}`} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className={`w-14 h-14 ${config.color} rounded-2xl flex items-center justify-center text-2xl mx-auto`}>
          <i className={`fas ${config.icon}`}></i>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">
            Enter today's {config.label} ({config.unit})
          </label>
          <input
            {...register('value')}
            inputMode={vitalKey === 'bp' ? 'text' : 'decimal'}
            placeholder={`e.g. ${VITAL_EXAMPLES[vitalKey] || ''}`}
            className={`w-full border ${errors.value ? 'border-rose-500' : 'border-slate-200'} rounded-xl px-4 py-3 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-aubergine-300`}
            autoFocus
          />
          {errors.value && <p className="text-xs text-rose-500 text-center mt-1">{errors.value.message}</p>}
          <p className="text-xs text-slate-500 text-center mt-1">Unit: {config.unit}</p>
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {saving ? 'Saving…' : 'Save Reading'}
        </button>
      </form>
    </Modal>
  );
}

/* ─── Cycle Log Modal ────────────────────────── */
function CycleLogModal({ isOpen, onClose, onSave, existingLog }) {
  const [form, setForm] = useState({ flow: 'Medium', cramps: 2, mood: 'Calm', symptoms: [] });
  const SYMPTOMS_LIST = [
    'Cramps', 'Bloating', 'Headache', 'Fatigue', 'Back Pain', 'Nausea',
    'Breast Tenderness', 'Pelvic Pressure', 'Acne Flare', 'Vaginal Dryness',
    'Hot Flashes', 'Insomnia', 'Brain Fog', 'Joint Pain',
  ];

  useEffect(() => {
    if (isOpen) {
      setForm({
        flow: existingLog?.flow ?? 'Medium',
        cramps: existingLog?.cramps ?? 2,
        mood: existingLog?.mood ?? 'Calm',
        symptoms: existingLog?.symptoms ?? [],
      });
    }
  }, [isOpen, existingLog]);

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

  // Reads and writes go through ClinicDataContext — the same cache every
  // other patient page (Dashboard, Fertility, Prescriptions) uses — so a
  // vital/cycle/lifestyle log saved here shows up there immediately, and
  // vice versa, instead of living in a second, never-invalidated cache.
  const { vitals, cycleLogs, lifestyleLogs, logVital, logCycle, logLifestyle } = useClinicData();

  const [discreet, setDiscreet] = useState(localStorage.getItem('discreet_mode') === 'true');
  const savedHirsutismGrade = vitals.hirsutism?.value !== undefined ? (parseInt(vitals.hirsutism.value, 10) || 0) : 0;
  // logVital isn't optimistic — it only updates `vitals` once the PUT
  // resolves — so without a local pending value the selection wouldn't
  // highlight until the round-trip completes, inviting a double-tap on slow
  // connections. Cleared once the real value lands (success or failure).
  const [pendingHirsutismGrade, setPendingHirsutismGrade] = useState(null);
  const hirsutismGrade = pendingHirsutismGrade ?? savedHirsutismGrade;

  const [lifestyle, setLifestyle] = useState({});
  useEffect(() => {
    const saved = lifestyleLogs[todayKey()]?.items || {};
    setLifestyle(LIFESTYLE_ITEMS.reduce((acc, item) => ({ ...acc, [item.key]: !!saved[item.key] }), {}));
  }, [lifestyleLogs]);

  const [logModal, setLogModal] = useState(null); // { key, config, currentValue }
  const [showCycleLog, setShowCycleLog] = useState(false);
  const [showMfgModal, setShowMfgModal] = useState(false);
  
  const todayCycleLog = cycleLogs[todayKey()] || null;
  const [cycleBannerDismissed, setCycleBannerDismissed] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const logSavedTimeoutRef = useRef(null);

  useEffect(() => {
    const handler = () => setDiscreet(localStorage.getItem('discreet_mode') === 'true');
    window.addEventListener('discreet_mode_changed', handler);
    return () => window.removeEventListener('discreet_mode_changed', handler);
  }, []);

  useEffect(() => () => { if (logSavedTimeoutRef.current) clearTimeout(logSavedTimeoutRef.current); }, []);

  const handleVitalSave = async (key, value) => {
    const config = VITALS_CONFIG[key];
    try {
      await logVital(key, value, config.unit);
      toast(`${config.label} updated to ${value} ${config.unit}`, 'success');
    } catch {
      toast(`Failed to save ${config.label}. Please try again.`, 'error');
    }
  };

  const handleMfgSave = async (totalScore, scoresMap) => {
    try {
      await logVital('mfg_score', String(totalScore), '/36');
      toast(`mFG Score of ${totalScore}/36 recorded successfully.`, 'success');
    } catch {
      toast('Failed to save mFG score. Please try again.', 'error');
    }
  };

  const handleHirsutismSelect = async (grade) => {
    setPendingHirsutismGrade(grade);
    try {
      await logVital('hirsutism', String(grade), '');
      toast(`Grade ${grade} (${HIRSUTISM_GRADES[grade].label}) selected.`, 'info');
    } catch {
      toast('Failed to save hirsutism grade. Please try again.', 'error');
    } finally {
      setPendingHirsutismGrade(null);
    }
  };

  const toggleLifestyle = (key) => {
    setLifestyle(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveLifestyleLog = async () => {
    setSavingLog(true);
    try {
      // logLifestyle's PUT replaces the whole day's `items` object — merge
      // with whatever's already saved (e.g. the Dashboard hydration tracker's
      // `waterGlasses` count) instead of overwriting it with only this
      // checklist's six boolean keys.
      const existing = lifestyleLogs[todayKey()]?.items || {};
      await logLifestyle(todayKey(), { ...existing, ...lifestyle });
      const completed = Object.values(lifestyle).filter(Boolean).length;
      setLogSaved(true);
      toast(`Daily log saved! ${completed}/${LIFESTYLE_ITEMS.length} habits completed today.`, 'success');
      if (logSavedTimeoutRef.current) clearTimeout(logSavedTimeoutRef.current);
      logSavedTimeoutRef.current = setTimeout(() => setLogSaved(false), 3000);
    } catch {
      toast('Failed to save daily log. Please try again.', 'error');
    } finally {
      setSavingLog(false);
    }
  };

  const handleCycleLogSave = async (form) => {
    try {
      await logCycle(todayKey(), form);
      setCycleBannerDismissed(false);
      toast('Cycle log saved! Your doctor can see this in real-time.', 'success');
    } catch {
      toast('Failed to save cycle log. Please try again.', 'error');
    }
  };

  const completedCount = Object.values(lifestyle).filter(Boolean).length;

  const [aiForecastOpen, setAiForecastOpen] = useState(false);
  const [aiForecastLoading, setAiForecastLoading] = useState(false);
  const [forecastData, setForecastData] = useState(null);

  const handleRunAiForecast = async () => {
    if (!cycleLogs || Object.keys(cycleLogs).length === 0) {
      toast('Log your period start date first to enable AI forecasting', 'error');
      return;
    }
    setAiForecastOpen(true);
    setAiForecastLoading(true);
    try {
      const { apiFetch } = await import('../../lib/apiClient.js');
      const data = await apiFetch('/patients/me/fertility-prediction');
      const cycleStats = data?.cycleStats;
      const fertile = data?.fertileWindow;
      const nextPeriod = data?.nextPeriodEstimate;
      const classification = data?.classification;
      const pcos = data?.pcosFlag;

      const daysToNext = nextPeriod
        ? Math.round((new Date(nextPeriod) - new Date()) / 86400000)
        : null;
      const nextPeriodLabel = daysToNext != null
        ? daysToNext <= 0 ? 'Due today or overdue' : `Predicted in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`
        : 'Insufficient cycle history';

      const regularityLabel = classification === 'regular'
        ? `${Math.round((data.confidenceScore || 0.7) * 100)}% Regularity · ${cycleStats?.stdDev != null ? `±${cycleStats.stdDev}d σ` : 'Stable pattern'}`
        : `Irregular · ${pcos ? 'PCOS Detected' : `StdDev ${cycleStats?.stdDev ?? '—'}d`}`;

      const hormone = data?.message || 'Cycle data analyzed. Log daily BBT and LH strips for improved hormone phase accuracy.';

      const recs = [
        pcos
          ? 'Consider daily Myo-Inositol 2g and low-GI nutrition to support insulin sensitivity and ovulatory regularity.'
          : 'Prioritize magnesium & zinc-rich foods (pumpkin seeds, dark leafy greens) to ease menstrual cramps.',
        'Schedule 30-minute brisk walking each morning to stabilize cortisol and support cycle regularity.',
        'Maintain consistent sleep (7–9 hours) to avoid prolactin elevation which can disrupt ovulation.',
      ];

      setForecastData({
        nextPeriod: nextPeriodLabel,
        cycleRegularityScore: regularityLabel,
        hormonePattern: hormone,
        recommendations: recs,
        fertileWindow: fertile ? `${fertile[0]} – ${fertile[1]}` : null,
      });
    } catch {
      // Graceful fallback if API is unavailable
      setForecastData({
        nextPeriod: 'Log more cycles for prediction',
        cycleRegularityScore: 'Needs more data',
        hormonePattern: 'Log at least 2 full menstrual cycles on the Tracking page to enable AI-powered forecasting.',
        recommendations: [
          'Start logging your period flow days every month.',
          'Track BBT each morning before getting out of bed.',
          'Use LH surge test strips in the middle of your cycle.',
        ],
        fertileWindow: null,
      });
    } finally {
      setAiForecastLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Health & Endocrine Tracking</h1>
          <p className="text-sm text-slate-500">Log vitals, cycle, and lifestyle parameters for your care team.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <AIButton
            onClick={handleRunAiForecast}
            loading={aiForecastLoading}
            loadingText="Analyzing Cycle..."
            variant="gradient"
            icon="fa-wand-magic-sparkles"
            size="sm"
          >
            AI Cycle Forecast
          </AIButton>
          <button onClick={() => setShowCycleLog(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-circle-dot"></i> Log Cycle
          </button>
        </div>
      </div>

      {/* Last Cycle Log Banner */}
      {todayCycleLog && !cycleBannerDismissed && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center"><i className="fas fa-circle-dot"></i></div>
          <div>
            <p className="font-bold text-rose-800 text-sm">Today's Cycle Logged</p>
            <p className="text-xs text-rose-700">Flow: {todayCycleLog.flow} • Cramps: {todayCycleLog.cramps}/5 • Mood: {todayCycleLog.mood}</p>
          </div>
          <button onClick={() => setCycleBannerDismissed(true)} className="ml-auto text-rose-400 hover:text-rose-600"><i className="fas fa-xmark"></i></button>
        </div>
      )}

      {/* Vitals Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(VITALS_CONFIG).map(([key, config]) => {
          const reading = vitals[key];
          const trend = reading ? computeTrend(reading.value, reading.previousValue, config.unit) : { text: 'No readings yet', color: 'text-slate-400' };
          return (
            <div key={key} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-aubergine-200 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className={`w-11 h-11 rounded-xl ${config.color} flex items-center justify-center text-lg`}>
                  <i className={`fas ${config.icon}`}></i>
                </div>
                <button onClick={() => setLogModal({ key, config, currentValue: reading?.value ?? '' })}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-600 w-8 h-8 rounded-lg flex items-center justify-center text-xs border border-aubergine-100"
                  aria-label="Update reading"
                  title="Update Reading">
                  <i className="fas fa-pen"></i>
                </button>
              </div>
              <h3 className="text-slate-500 font-semibold text-xs mb-1">{config.label}</h3>
              <div className={`flex items-end gap-1.5 transition-all ${discreet ? 'discreet-blur' : ''}`}>
                <span className="text-3xl font-semibold text-slate-800">{reading?.value ?? '—'}</span>
                <span className="text-sm font-bold text-slate-500 mb-1">{config.unit}</span>
              </div>
              <div className={`mt-3 text-xs font-bold ${trend.color} flex items-center gap-1`}>{trend.text}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Androgen & Metabolic Tracker */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Facial & Body Hair (Androgen) Tracker</h3>
              <p className="text-xs text-slate-500 mt-0.5">Track hirsutism progression for PCOS & endocrine monitoring.</p>
            </div>
            {vitals.mfg_score?.value && (
              <span className="text-[11px] font-semibold text-aubergine-700 bg-aubergine-50 px-2.5 py-1 rounded-xl border border-aubergine-200">
                mFG: {vitals.mfg_score.value}/36
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HIRSUTISM_GRADES.map(g => (
              <button key={g.grade} onClick={() => handleHirsutismSelect(g.grade)}
                className={`p-3 rounded-xl border text-center transition-all ${hirsutismGrade === g.grade ? 'border-aubergine-500 bg-aubergine-50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center gap-0.5 mb-2 ${hirsutismGrade === g.grade ? 'bg-aubergine-100' : 'bg-slate-100'}`}>
                  {g.dots === 0
                    ? <i className={`fas fa-check text-sm ${hirsutismGrade === g.grade ? 'text-aubergine-700' : 'text-slate-400'}`}></i>
                    : Array.from({ length: g.dots }).map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${hirsutismGrade === g.grade ? 'bg-aubergine-700' : 'bg-slate-400'}`}></span>
                      ))}
                </div>
                <div className="text-xs font-bold text-slate-700">{g.label}</div>
              </button>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <strong>Quick Grade:</strong> {HIRSUTISM_GRADES[hirsutismGrade].desc}
            </div>
            <button
              type="button"
              onClick={() => setShowMfgModal(true)}
              className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <i className="fas fa-stethoscope"></i> Full 9-Area mFG Calculator
            </button>
          </div>
        </div>

        {/* Daily Lifestyle Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Today's Health Checklist</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mark the healthy habits you completed today</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-aubergine-600">{completedCount}<span className="text-sm text-slate-500">/{LIFESTYLE_ITEMS.length}</span></div>
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
          config={logModal.config}
          currentValue={logModal.currentValue}
          onSave={handleVitalSave}
        />
      )}
      <CycleLogModal isOpen={showCycleLog} onClose={() => setShowCycleLog(false)} onSave={handleCycleLogSave} existingLog={todayCycleLog} />
      <MfgAssessmentModal
        isOpen={showMfgModal}
        onClose={() => setShowMfgModal(false)}
        onSave={handleMfgSave}
      />

      {/* AI Cycle & Hormone Forecast Modal */}
      {aiForecastOpen && (
        <Modal
          isOpen={aiForecastOpen}
          onClose={() => setAiForecastOpen(false)}
          title="AI Menstrual & Hormone Health Forecast"
          size="md"
        >
          <div className="space-y-4">
            {aiForecastLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-aubergine-50 to-magenta-50 border border-aubergine-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-aubergine-700 uppercase tracking-wider block">Next Menstrual Cycle</span>
                    <h4 className="text-lg font-semibold text-aubergine-900 mt-0.5">{forecastData?.nextPeriod || 'Predicting...'}</h4>
                  </div>
                  <span className="bg-aubergine-100 text-aubergine-800 font-bold px-3 py-1 rounded-xl text-xs border border-aubergine-200 text-right">
                    {forecastData?.cycleRegularityScore || 'Analyzing'}
                  </span>
                </div>

                {forecastData?.fertileWindow && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 text-sm">
                      <i className="fas fa-seedling" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Estimated Fertile Window</span>
                      <p className="text-sm font-semibold text-emerald-900">{forecastData.fertileWindow}</p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Cycle Pattern & AI Insight</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {forecastData?.hormonePattern}
                  </p>
                </div>

                {forecastData?.recommendations && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider block">Personalised Care Recommendations</span>
                    <div className="space-y-1.5">
                      {forecastData.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                          <i className="fas fa-sparkles text-purple-500 mt-0.5 text-[10px]" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SaMD clinical disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-700 leading-relaxed">
                  <i className="fas fa-triangle-exclamation mr-1.5" />
                  <strong>Educational use only.</strong> These predictions are estimates based on logged cycle data and are not a substitute for clinical medical advice. Consult your doctor or gynaecologist for personalised health guidance.
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAiForecastOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors"
              >
                Close Forecast
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PatientTracking;
