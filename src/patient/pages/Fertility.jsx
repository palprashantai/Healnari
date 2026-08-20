import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

/* ─── Date helpers ─── */
const addDaysLocal = (dateStr, days) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
};
const daysBetweenLocal = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const formatDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const formatShort = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—';

const relativeDay = (dateStr) => {
  if (!dateStr) return '';
  const diff = daysBetweenLocal(todayLocalStr(), dateStr);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
};

const CONFIDENCE_LEVELS = [
  { min: 0.75, icon: 'fa-circle-check', word: "We're fairly sure", color: 'text-emerald-600', bg: 'bg-emerald-50/80 border-emerald-200/60 backdrop-blur-sm' },
  { min: 0.45, icon: 'fa-circle-question', word: 'This is our best guess', color: 'text-amber-600', bg: 'bg-amber-50/80 border-amber-200/60 backdrop-blur-sm' },
  { min: 0, icon: 'fa-triangle-exclamation', word: 'Not very sure yet', color: 'text-rose-600', bg: 'bg-rose-50/80 border-rose-200/60 backdrop-blur-sm' },
];
const confidenceInfo = (score) => CONFIDENCE_LEVELS.find(l => score >= l.min);

function NumberStepper({ value, onChange, min, max, suffix }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={dec} aria-label="Decrease"
        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black flex items-center justify-center flex-shrink-0 active:scale-95 transition-all shadow-sm">
        <i className="fas fa-minus"></i>
      </button>
      <div className="flex-1 text-center bg-white border-2 border-slate-100 rounded-xl py-1.5 shadow-inner">
        <div className="text-xl font-black text-slate-800">{value}</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{suffix}</div>
      </div>
      <button type="button" onClick={inc} aria-label="Increase"
        className="w-10 h-10 rounded-xl bg-aubergine-100 hover:bg-aubergine-200 text-aubergine-700 text-sm font-black flex items-center justify-center flex-shrink-0 active:scale-95 transition-all shadow-sm">
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
}

const DAY_TYPE_STYLE = {
  period: { cell: 'bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-md shadow-rose-200 ring-2 ring-white ring-inset' },
  'period-predicted': { cell: 'bg-magenta-50 text-magenta-600 border-2 border-dashed border-magenta-300' },
  fertile: { cell: 'bg-gradient-to-br from-aubergine-100 to-aubergine-200 text-aubergine-800 shadow-sm border border-aubergine-300' },
  peak: { cell: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-white ring-inset', badge: 'fa-star' },
};

const DAY_TYPE_INFO = {
  period: { icon: 'fa-droplet', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', label: 'Period Day (Logged)', description: "You've logged this as a period day. Rest, stay hydrated, and go easy on yourself." },
  'period-predicted': { icon: 'fa-droplet', iconBg: 'bg-magenta-50', iconColor: 'text-magenta-600', label: 'Next Period (Predicted)', description: "Based on your average cycle length, your next period is expected to start around here. Tap below once it actually starts." },
  fertile: { icon: 'fa-circle', iconBg: 'bg-aubergine-100', iconColor: 'text-aubergine-700', label: 'Fertile Day', description: 'Pregnancy is possible from unprotected sex on or near this day.' },
  peak: { icon: 'fa-star', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', label: 'Most Fertile Day', description: 'Your single best estimated day for ovulation — the highest-chance day to conceive in this cycle.' },
};
const REGULAR_DAY_INFO = { icon: 'fa-calendar', iconBg: 'bg-slate-100', iconColor: 'text-slate-400', label: 'Regular Day', description: 'Nothing predicted for this day yet.' };

function DayCell({ day, type, dateStr, isToday, isActive, onHover, onPin }) {
  const style = DAY_TYPE_STYLE[type];
  const base = style ? style.cell : 'text-slate-600 hover:bg-slate-100/80';
  return (
    <div className="flex items-center justify-center p-0.5">
      <button
        type="button"
        onMouseEnter={() => onHover(dateStr)}
        onFocus={() => onHover(dateStr)}
        onClick={() => onPin(dateStr)}
        aria-label={`${dateStr}${type ? `, ${DAY_TYPE_INFO[type]?.label || ''}` : ''}`}
        className={`relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer hover:scale-110 hover:z-10 hover:shadow-lg focus:outline-none
          ${base}
          ${isToday && !style ? 'bg-slate-800 text-white shadow-md' : ''}
          ${isToday && style ? 'ring-2 ring-slate-800 ring-offset-2' : ''}
          ${isActive && !isToday ? 'ring-2 ring-aubergine-500 ring-offset-2 scale-110 z-10 shadow-md' : ''}`}>
        {day}
        {style?.badge && (
          <i className={`fas ${style.badge} text-white text-[7px] absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm border-2 border-white`}></i>
        )}
      </button>
    </div>
  );
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MonthCalendar({ year, month, getDayType, activeDay, onDayHover, onDayPin, onPrev, onNext, prevHasMarks, nextHasMarks }) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayLocalStr();
  const monthLabel = firstOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 backdrop-blur-sm">
        <button onClick={onPrev} aria-label="Previous month"
          className="relative w-8 h-8 rounded-xl hover:bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all text-sm group">
          <i className="fas fa-chevron-left group-hover:-translate-x-0.5 transition-transform"></i>
          {prevHasMarks && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 border border-white"></span>}
        </button>
        <p className="text-[15px] font-black text-slate-800 tracking-tight">{monthLabel}</p>
        <button onClick={onNext} aria-label="Next month"
          className="relative w-8 h-8 rounded-xl hover:bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all text-sm group">
          <i className="fas fa-chevron-right group-hover:translate-x-0.5 transition-transform"></i>
          {nextHasMarks && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 border border-white"></span>}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-2 mb-2">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">{w.slice(0, 3)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-2 gap-x-1" onMouseLeave={() => onDayHover(null)}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          return (
            <DayCell key={i} day={d} dateStr={dateStr} type={getDayType(dateStr)}
              isToday={dateStr === todayStr} isActive={dateStr === activeDay} onHover={onDayHover} onPin={onDayPin} />
          );
        })}
      </div>
    </div>
  );
}

function DayInfoPanel({ dateStr, type, cycleDay, onLogPeriod, logging }) {
  if (!dateStr) return null;
  const info = DAY_TYPE_INFO[type] || REGULAR_DAY_INFO;
  const isLogged = type === 'period';
  return (
    <div className="mt-4 animate-fade-in max-w-sm mx-auto">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-lg shadow-slate-200/50 flex items-start gap-3.5 transition-all">
        <div className={`w-10 h-10 rounded-2xl ${info.iconBg} ${info.iconColor} flex items-center justify-center text-lg flex-shrink-0 shadow-inner`}>
          <i className={`fas ${info.icon}`}></i>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="font-black text-slate-800 text-sm">{formatDate(dateStr)}</p>
            {cycleDay != null && <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">Day {cycleDay}</span>}
          </div>
          <p className={`text-[11px] font-black uppercase tracking-wider mt-1 ${info.iconColor}`}>{info.label}</p>
          <p className="text-[13px] text-slate-600 mt-1 leading-snug">{info.description}</p>
          {isLogged ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              <i className="fas fa-circle-check"></i> Logged
            </div>
          ) : (
            <button onClick={() => onLogPeriod(dateStr)} disabled={logging}
              className="mt-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 px-3.5 py-1.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm shadow-rose-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
              <i className={`fas ${logging ? 'fa-spinner fa-spin' : 'fa-droplet'}`}></i> Mark as period day
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Setup Wizard Component ─── */
function SetupWizard({ defaultLastPeriodStart, onComplete }) {
  const toast = useToast();
  const [step, setStep] = useState('source'); // 'source' -> 'manual'
  const [useTrackRecord, setUseTrackRecord] = useState(null);
  const [lastPeriodStart, setLastPeriodStart] = useState(defaultLastPeriodStart || '');
  const [periodDurationDays, setPeriodDurationDays] = useState(5);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [submitting, setSubmitting] = useState(false);
  const [checkingTrackRecord, setCheckingTrackRecord] = useState(false);

  const handleSourceSelection = async (val) => {
    setUseTrackRecord(val);
    if (val) {
      setCheckingTrackRecord(true);
      try {
        await onComplete({ source: 'track_record' });
      } finally {
        setCheckingTrackRecord(false);
      }
    } else {
      setStep('manual');
    }
  };

  const submitManual = async (e) => {
    e.preventDefault();
    if (!lastPeriodStart) { toast('Please pick when your last period started.', 'error'); return; }
    
    setSubmitting(true);
    try {
      const result = await apiFetch('/patients/me/fertility-prediction/quick-estimate', {
        method: 'POST',
        body: { lastPeriodStart, periodDurationDays, cycleLengthDays },
      });
      onComplete(result);
      toast('Here is your estimate!', 'success');
    } catch (err) {
      toast(err.message || 'Could not calculate. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 sm:p-8 shadow-xl shadow-slate-200/40 max-w-md mx-auto transform transition-all">
      {step === 'source' && (
        <div className="animate-fade-in text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aubergine-400 to-aubergine-600 text-white text-2xl flex items-center justify-center mx-auto shadow-lg shadow-aubergine-200">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Let's set up your calendar</h3>
            <p className="text-sm text-slate-500 mt-2">How would you like to calculate your predictions?</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => handleSourceSelection(true)} disabled={checkingTrackRecord}
              className="w-full flex items-center p-4 border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 disabled:hover:border-slate-100 disabled:hover:bg-transparent rounded-2xl transition-all group text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <i className={`fas ${checkingTrackRecord ? 'fa-spinner fa-spin' : 'fa-clock-rotate-left'}`}></i>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-black text-slate-800 text-sm">Use my track record</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{checkingTrackRecord ? 'Checking your logged cycles…' : "Analyze cycles I've already logged."}</p>
              </div>
              <i className="fas fa-chevron-right text-slate-300 group-hover:text-emerald-500"></i>
            </button>
            <button onClick={() => handleSourceSelection(false)} disabled={checkingTrackRecord}
              className="w-full flex items-center p-4 border-2 border-slate-100 hover:border-aubergine-300 hover:bg-aubergine-50 disabled:opacity-60 rounded-2xl transition-all group text-left">
              <div className="w-10 h-10 rounded-xl bg-aubergine-100 text-aubergine-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <i className="fas fa-keyboard"></i>
              </div>
              <div className="ml-4 flex-1">
                <p className="font-black text-slate-800 text-sm">Enter details manually</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Answer 3 quick questions for an estimate.</p>
              </div>
              <i className="fas fa-chevron-right text-slate-300 group-hover:text-aubergine-500"></i>
            </button>
          </div>
        </div>
      )}

      {step === 'manual' && (
        <form onSubmit={submitManual} className="animate-fade-in space-y-6">
          <div className="text-center">
            <button type="button" onClick={() => setStep('source')} className="text-slate-400 hover:text-slate-600 absolute left-5 top-5">
              <i className="fas fa-arrow-left"></i>
            </button>
            <h3 className="text-xl font-black text-slate-800">Your Cycle Details</h3>
            <p className="text-xs text-slate-500 mt-1">We'll use this to build your calendar.</p>
          </div>

          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-xs font-bold text-slate-700 mb-2 block">1. When did your last period start?</label>
              <input type="date" required value={lastPeriodStart} max={todayLocalStr()}
                onChange={e => setLastPeriodStart(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 text-center focus:outline-none focus:border-aubergine-400 focus:ring-4 focus:ring-aubergine-100 transition-all bg-white" />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-xs font-bold text-slate-700 mb-2 block">2. How many days does your period usually last?</label>
              <NumberStepper value={periodDurationDays} onChange={setPeriodDurationDays} min={1} max={15} suffix="days bleeding" />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center justify-between">
                <span>3. How many days are in your cycle?</span>
                <span className="text-[10px] font-normal text-slate-400">(Avg is 28)</span>
              </label>
              <NumberStepper value={cycleLengthDays} onChange={setCycleLengthDays} min={15} max={90} suffix="days total" />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-gradient-to-r from-aubergine-500 to-aubergine-600 hover:from-aubergine-600 hover:to-aubergine-700 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-aubergine-200 hover:shadow-xl hover:-translate-y-0.5">
            {submitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-calculator mr-2"></i>Calculate</>}
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── Cycle Ring Visualization ─── */
function CycleRing({ prediction, todayCycleDay }) {
  if (!prediction || !prediction.fertileWindow) return null;
  
  const cycleLen = prediction.cycleStats?.meanLength || prediction.cycleLengthDays || 28;
  const periodLen = prediction.periodDurationDays || 5;
  const fwStart = daysBetweenLocal(prediction.lastPeriodStart, prediction.fertileWindow[0]) + 1;
  const fwEnd = daysBetweenLocal(prediction.lastPeriodStart, prediction.fertileWindow[1]) + 1;
  const ovDay = daysBetweenLocal(prediction.lastPeriodStart, prediction.estimatedOvulationDate) + 1;

  const currentDay = todayCycleDay || 1;
  const cappedCurrentDay = Math.min(Math.max(1, currentDay), cycleLen);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 14;
  
  const getOffset = (day) => {
    return circumference - ((day - 1) / cycleLen) * circumference;
  };

  const getPercentage = (day) => ((day - 1) / cycleLen) * 100;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
      <h3 className="text-sm font-black text-slate-800 mb-1">Cycle Status</h3>
      <p className="text-[11px] text-slate-500 mb-6">Day {cappedCurrentDay} of {cycleLen}</p>

      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
          {/* Background Ring */}
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          
          {/* Period Phase (Red) */}
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#f43f5e" strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${(periodLen / cycleLen) * circumference} ${circumference}`}
            className="drop-shadow-sm" />
            
          {/* Fertile Window (Blue to Amber) */}
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#38bdf8" strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${((fwEnd - fwStart + 1) / cycleLen) * circumference} ${circumference}`}
            strokeDashoffset={-((fwStart - 1) / cycleLen) * circumference}
            className="drop-shadow-sm opacity-80" />
            
          {/* Ovulation Peak Dot */}
          <circle cx={100 + radius * Math.cos((ovDay - 1) / cycleLen * 2 * Math.PI)} 
                  cy={100 + radius * Math.sin((ovDay - 1) / cycleLen * 2 * Math.PI)} 
                  r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
          
          {/* Current Day Indicator */}
          <circle cx={100 + radius * Math.cos((cappedCurrentDay - 1) / cycleLen * 2 * Math.PI)} 
                  cy={100 + radius * Math.sin((cappedCurrentDay - 1) / cycleLen * 2 * Math.PI)} 
                  r="8" fill="#334155" stroke="#ffffff" strokeWidth="3" className="shadow-lg" />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center rotate-0">
          {currentDay <= periodLen ? (
            <>
              <i className="fas fa-droplet text-rose-500 text-xl mb-1 drop-shadow-sm"></i>
              <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Period</span>
            </>
          ) : currentDay >= fwStart && currentDay <= fwEnd ? (
             <>
               <i className="fas fa-egg text-aubergine-600 text-xl mb-1 drop-shadow-sm"></i>
               <span className="text-[10px] font-black uppercase text-aubergine-700 tracking-wider">Fertile</span>
             </>
          ) : (
            <>
               <i className="fas fa-leaf text-slate-400 text-xl mb-1"></i>
               <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Follicular/<br/>Luteal</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex gap-4 mt-6 text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>Period</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-aubergine-400"></div>Fertile Window</div>
      </div>
    </div>
  );
}

/* ─── Learn section ─── */
const TOPIC_STYLES = {
  sky: { chip: 'bg-aubergine-50 text-aubergine-700', ring: 'border-aubergine-100', dot: 'text-aubergine-600' },
  rose: { chip: 'bg-rose-50 text-rose-600', ring: 'border-rose-100', dot: 'text-rose-500' },
  amber: { chip: 'bg-amber-50 text-amber-600', ring: 'border-amber-100', dot: 'text-amber-500' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', ring: 'border-emerald-100', dot: 'text-emerald-500' },
  aubergine: { chip: 'bg-aubergine-50 text-aubergine-600', ring: 'border-aubergine-100', dot: 'text-aubergine-500' },
};

const FERTILITY_TOPICS = [
  {
    id: 'cycle-basics', icon: 'fa-calendar-days', color: 'sky',
    title: 'Your Menstrual Cycle, in 4 Phases', summary: 'What Day 1 means, and what happens after.',
    points: [
      'Period (roughly days 1–5): the uterine lining sheds. Day 1 of bleeding is counted as Day 1 of the cycle.',
      'Follicular phase (day 1 to ovulation): the body prepares an egg for release. This is the phase that varies most from person to person, and month to month.',
      'Ovulation (around day 14 in a 28-day cycle): a mature egg is released. Pregnancy is only possible around this window.',
      'Luteal phase (ovulation to the next period): usually the most consistent phase, close to 12–14 days for most people.',
    ],
    note: "A normal cycle can be anywhere from 21 to 35 days. What matters most is what's consistent for you.",
  },
  {
    id: 'fertile-window', icon: 'fa-egg', color: 'emerald',
    title: 'What Is the Fertile Window?', summary: "Why it's a range of days, not just one.",
    points: [
      "It's about 6 days: the 5 days before ovulation, plus the day of ovulation itself.",
      'Sperm can survive in the body for up to 5 days, waiting for an egg to be released.',
      'Once released, an egg survives only about 12–24 hours.',
      'Chances of conceiving are highest on the 1–2 days right before ovulation.',
    ],
    note: 'This is why the fertile window is marked as a range on your calendar rather than a single date.',
  },
  {
    id: 'ovulation-signs', icon: 'fa-star', color: 'amber',
    title: 'Signs Your Body Gives Around Ovulation', summary: 'What to notice, beyond the calendar.',
    points: [
      'Cervical mucus becomes clear, slippery, and stretchy — often compared to raw egg white.',
      'A mild, one-sided pelvic twinge, sometimes called mittelschmerz.',
      'A small rise in basal body temperature — but this confirms ovulation only after it has already happened.',
      'A surge in luteinizing hormone (LH), which is what ovulation predictor strips detect 24–36 hours before ovulation.',
    ],
    note: 'No single sign is foolproof on its own — tracking two or three together gives a clearer picture.',
  },
  {
    id: 'pcos', icon: 'fa-circle-info', color: 'rose',
    title: 'PCOS and Irregular Cycles', summary: 'Why the calendar can be less reliable here.',
    points: [
      'PCOS (Polycystic Ovary Syndrome) is one of the most common reasons for irregular or missed periods.',
      'It can make ovulation unpredictable or infrequent, so calendar-based predictions are naturally less accurate.',
      'Tracking basal body temperature and LH strips usually gives more reliable signals than a calendar alone.',
      'PCOS is manageable — a doctor can help build a plan based on your specific symptoms and goals.',
    ],
  },
  {
    id: 'when-to-see-doctor', icon: 'fa-user-doctor', color: 'aubergine',
    title: 'When to Check In With Your Doctor', summary: 'Patterns worth mentioning at your next visit.',
    points: [
      'Cycles that are consistently shorter than 21 days or longer than 35 days.',
      'Periods lasting more than 7 days, or very heavy bleeding.',
      'Severe pain that disrupts your day-to-day life.',
      'No period for 3 months or more, when not pregnant.',
      "Trying to conceive for 12 months without success (or 6 months if you're over 35).",
    ],
  },
  {
    id: 'tracking-tips', icon: 'fa-chart-simple', color: 'sky',
    title: 'Getting a More Accurate Prediction', summary: 'A few habits that sharpen your estimate.',
    points: [
      'Log your period as it happens, rather than estimating it after the fact.',
      'Tap dates directly on the calendar above — it takes a second per day.',
      'It typically takes 3 or more logged cycles before a clear pattern emerges.',
      'If your cycles are irregular, combine calendar tracking with BBT or LH strips for a clearer picture.',
    ],
  },
];

function AccordionCard({ topic, isOpen, onToggle }) {
  const s = TOPIC_STYLES[topic.color];
  return (
    <div className={`bg-white rounded-2xl border ${s.ring} overflow-hidden transition-all shadow-sm`}>
      <button onClick={onToggle} aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/60 transition-colors">
        <div className={`w-10 h-10 rounded-xl ${s.chip} flex items-center justify-center flex-shrink-0 text-lg shadow-inner`}>
          <i className={`fas ${topic.icon}`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 text-[13px]">{topic.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{topic.summary}</p>
        </div>
        <i className={`fas fa-chevron-down text-slate-400 text-xs transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <ul className="space-y-3 pl-13">
            {topic.points.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] text-slate-600 leading-relaxed">
                <i className={`fas fa-circle text-[4px] ${s.dot} mt-2 flex-shrink-0`}></i>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {topic.note && <p className="text-xs text-slate-400 mt-3 pl-13 italic leading-relaxed">{topic.note}</p>}
        </div>
      )}
    </div>
  );
}

function LearnSection() {
  const [expanded, setExpanded] = useState(false);
  const [openIds, setOpenIds] = useState(() => new Set());
  const toggleTopic = (id) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 overflow-hidden shadow-sm mt-8">
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
        <span className="text-sm font-black text-slate-700 flex items-center gap-2">
          <i className="fas fa-book-open text-slate-400"></i> Learn About Your Cycle & Fertility
        </span>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-slate-400 text-sm`}></i>
      </button>
      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-500 pt-2 pb-1 px-1">General information to help you understand your calendar. Not a diagnosis.</p>
          {FERTILITY_TOPICS.map(topic => (
            <AccordionCard key={topic.id} topic={topic} isOpen={openIds.has(topic.id)} onToggle={() => toggleTopic(topic.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
function PatientFertility() {
  const { cycleLogs, logCycle } = useClinicData();
  const toast = useToast();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  // Starts false — a returning patient with an already-established prediction
  // should land straight on their calendar. The effect below flips this to
  // true only if the initial load comes back empty/insufficient, instead of
  // unconditionally forcing every visit through the setup wizard first.
  const [setupMode, setSetupMode] = useState(false);
  // pinnedDay is the day a click deliberately selected (persists); hoveredDay
  // is a transient mouse/focus preview that falls back to pinnedDay once the
  // cursor leaves the grid — kept separate so moving the mouse from a clicked
  // day down to the "Mark as period day" button doesn't discard the click.
  const [pinnedDay, setPinnedDay] = useState(todayLocalStr());
  const [hoveredDay, setHoveredDay] = useState(null);
  const selectedDay = hoveredDay ?? pinnedDay;
  const [loggingDay, setLoggingDay] = useState(false);

  const lastKnownFlowDate = Object.keys(cycleLogs).filter(d => cycleLogs[d]?.flow).sort().pop() || '';

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return apiFetch('/patients/me/fertility-prediction')
      .then(res => { setPrediction(res); return res; })
      .catch(err => { setError(err.message || 'We could not load your prediction.'); return null; })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load().then(res => {
      // res is null only when load() failed (network/server error, already
      // surfaced via the error state) — that's a different case from a
      // successful response reporting 'insufficient_data'. Forcing the setup
      // wizard on both used to hide real load failures behind "let's set up
      // your calendar" instead of the error banner.
      if (res && res.classification === 'insufficient_data') setSetupMode(true);
    });
    // Only ever gate on the very first load — later manual "Refresh" clicks
    // must not re-trigger this and yank the user back into the wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasResult = prediction && prediction.classification !== 'insufficient_data';

  const dayTypes = useMemo(() => {
    const map = {};
    Object.entries(cycleLogs).forEach(([date, log]) => {
      if (log?.flow && log.flow.toLowerCase() !== 'none') map[date] = 'period';
    });
    if (!hasResult) return map;

    if (prediction.fertileWindow) {
      let d = prediction.fertileWindow[0];
      let guard = 0;
      while (d <= prediction.fertileWindow[1] && guard < 400) {
        if (map[d] !== 'period') map[d] = 'fertile';
        d = addDaysLocal(d, 1);
        guard++;
      }
    }
    if (prediction.nextPeriodEstimate && prediction.periodDurationDays) {
      for (let i = 0; i < prediction.periodDurationDays; i++) {
        const d = addDaysLocal(prediction.nextPeriodEstimate, i);
        if (map[d] !== 'period') map[d] = 'period-predicted';
      }
    }
    if (prediction.estimatedOvulationDate && map[prediction.estimatedOvulationDate] !== 'period') {
      map[prediction.estimatedOvulationDate] = 'peak';
    }
    return map;
  }, [cycleLogs, prediction, hasResult]);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const goToMonth = (delta) => {
    setViewMonth(v => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goToDate = (dateStr) => {
    // Parse the y/m components directly instead of going through Date — every
    // other date computation in this file anchors to UTC ('T00:00:00Z') to
    // avoid local-timezone drift, and this was the one spot that didn't.
    const [y, m] = dateStr.split('-').map(Number);
    setViewMonth({ year: y, month: m - 1 });
    setPinnedDay(dateStr);
  };

  const monthHasMarks = (year, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return Object.keys(dayTypes).some(d => d.startsWith(prefix));
  };
  const prevMonthDate = new Date(viewMonth.year, viewMonth.month - 1, 1);
  const nextMonthDate = new Date(viewMonth.year, viewMonth.month + 1, 1);
  const prevHasMarks = monthHasMarks(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  const nextHasMarks = monthHasMarks(nextMonthDate.getFullYear(), nextMonthDate.getMonth());

  const selectedDayCycleDay = selectedDay && hasResult && prediction.lastPeriodStart ? daysBetweenLocal(prediction.lastPeriodStart, selectedDay) + 1 : null;
  const todayCycleDay = hasResult && prediction.lastPeriodStart ? daysBetweenLocal(prediction.lastPeriodStart, todayLocalStr()) + 1 : null;

  const handleLogPeriod = async (dateStr) => {
    setLoggingDay(true);
    try {
      await logCycle(dateStr, { flow: 'Medium' });
      toast(`Logged ${formatShort(dateStr)} as a period day.`, 'success');
      if (hasResult) {
          load();
      }
    } catch {
      toast('Could not log that day. Please try again.', 'error');
    } finally {
      setLoggingDay(false);
    }
  };

  const handleSetupComplete = async (data) => {
    if (data.source === 'track_record') {
       const res = await load();
       if (!res) {
         return; // load() already surfaced the error via the error state; stay on the wizard
       }
       if (res.classification === 'insufficient_data') {
         toast("You don't have 2 full cycles logged yet, so we can't analyze a track record. Try \"Enter details manually\" instead, or log more cycles on the Tracking page.", 'error');
         return; // keep the wizard open
       }
    } else {
       setPrediction(data);
    }
    setSetupMode(false);
  };

  const conf = hasResult ? confidenceInfo(prediction.confidenceScore) : null;
  const nextPeriodMonth = hasResult && prediction.nextPeriodEstimate ? new Date(prediction.nextPeriodEstimate + 'T00:00:00') : null;
  const nextPeriodElsewhere = nextPeriodMonth && (nextPeriodMonth.getFullYear() !== viewMonth.year || nextPeriodMonth.getMonth() !== viewMonth.month);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-aubergine-500 to-rose-400 text-white flex items-center justify-center text-xl shadow-lg shadow-rose-200">
             <i className="fas fa-calendar-heart"></i>
           </div>
           <div>
             <h1 className="text-xl font-black text-slate-800 tracking-tight">Your Fertility Calendar</h1>
             <p className="text-[13px] text-slate-500 font-medium">Track your cycles, predict your best days.</p>
           </div>
        </div>
        <div className="flex items-center gap-2">
          {hasResult && !setupMode && (
            <button onClick={() => setSetupMode(true)} aria-label="Settings"
              className="bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-600 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm text-sm group">
              <i className="fas fa-cog group-hover:rotate-90 transition-transform duration-300"></i>
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="bg-white border-2 border-slate-100 hover:border-aubergine-200 disabled:opacity-60 text-aubergine-700 font-black px-4 py-2 rounded-xl text-[13px] flex items-center gap-2 transition-all shadow-sm group">
            <i className={`fas fa-arrows-rotate ${loading ? 'fa-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}></i> Refresh
          </button>
        </div>
      </div>

      <div className="bg-aubergine-50/70 border border-aubergine-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center flex-shrink-0 text-sm shadow-inner">
            <i className="fas fa-shield-halved"></i>
          </div>
          <div>
            <p className="text-xs text-slate-800 font-bold">SaMD Clinical Guidance & Non-Contraceptive Notice</p>
            <p className="text-[11px] text-slate-600 leading-snug">Calculated for conception planning and cycle awareness. Not an FDA/CE-certified contraceptive device — do not use as birth control.</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-aubergine-700 bg-aubergine-100 px-2.5 py-1 rounded-lg border border-aubergine-200 flex-shrink-0">
          Multi-Modal Engine
        </span>
      </div>

      {loading && !prediction && !setupMode && (
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-xl shadow-slate-200/50 p-12 text-center text-slate-400">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-aubergine-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="font-black text-base text-slate-700">Analyzing your cycle history…</p>
        </div>
      )}

      {!loading && error && !setupMode && (
        <div className="bg-rose-50/80 backdrop-blur-md rounded-3xl border border-rose-200 p-8 text-center shadow-lg shadow-rose-100/50">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
             <i className="fas fa-triangle-exclamation"></i>
          </div>
          <p className="text-base text-rose-800 font-black">{error}</p>
        </div>
      )}
      
      {setupMode && (
         <SetupWizard defaultLastPeriodStart={lastKnownFlowDate} onComplete={handleSetupComplete} />
      )}

      {(!loading || prediction) && !error && !setupMode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Calendar */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white shadow-xl shadow-slate-200/40 p-4 sm:p-6 transition-all">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-base font-black text-slate-800">Your Calendar</h2>
                 <p className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                   <i className="fas fa-arrow-pointer mr-1.5"></i>Tap to log
                 </p>
              </div>
              <MonthCalendar year={viewMonth.year} month={viewMonth.month} getDayType={d => dayTypes[d]}
                activeDay={selectedDay} onDayHover={setHoveredDay} onDayPin={setPinnedDay}
                onPrev={() => goToMonth(-1)} onNext={() => goToMonth(1)}
                prevHasMarks={prevHasMarks} nextHasMarks={nextHasMarks} />

              {nextPeriodElsewhere && (
                <div className="flex justify-center mt-4">
                  <button onClick={() => goToDate(prediction.nextPeriodEstimate)}
                    className="text-[11px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-4 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm hover:shadow-md">
                    Jump to next period <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-slate-100">
                {[
                  { swatch: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-sm', label: 'Period' },
                  { swatch: 'bg-rose-50 border-2 border-dashed border-rose-300', label: 'Predicted' },
                  { swatch: 'bg-gradient-to-br from-aubergine-300 to-aubergine-400 shadow-sm', label: 'Fertile' },
                  { swatch: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm', label: 'Best Day' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${l.swatch}`}></div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Interactive Info panel */}
              <DayInfoPanel dateStr={selectedDay} type={dayTypes[selectedDay]} cycleDay={selectedDayCycleDay}
                onLogPeriod={handleLogPeriod} logging={loggingDay} />
            </div>
          </div>
          
          {/* Right Column: Visualization & Stats */}
          <div className="lg:col-span-5 space-y-6">
             {hasResult ? (
                <>
                  <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/20 text-center relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-900/20 rounded-full blur-xl -ml-5 -mb-5 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-xl flex items-center justify-center mx-auto mb-4 shadow-inner ring-1 ring-white/30 group-hover:rotate-12 transition-transform duration-500">
                        <i className="fas fa-egg"></i>
                        </div>
                        <p className="text-emerald-50/80 font-black text-[11px] uppercase tracking-widest mb-1">Your Best Days To Try</p>
                        <p className="text-2xl sm:text-3xl font-black mb-1 drop-shadow-md">{formatShort(prediction.fertileWindow[0])} – {formatShort(prediction.fertileWindow[1])}</p>
                        <div className="bg-black/10 inline-block px-3 py-1.5 rounded-xl mt-2 backdrop-blur-sm border border-white/10">
                           <p className="text-emerald-50 text-[13px] font-medium">Peak day: <strong className="text-white font-black">{formatDate(prediction.estimatedOvulationDate)}</strong></p>
                        </div>
                    </div>
                  </div>
                  
                  <CycleRing prediction={prediction} todayCycleDay={todayCycleDay} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${conf.bg} shadow-sm`}>
                      <i className={`fas ${conf.icon} ${conf.color} text-2xl flex-shrink-0 drop-shadow-sm`}></i>
                      <div>
                        <p className={`font-black text-sm ${conf.color}`}>{conf.word}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wide">Confidence</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-aubergine-100 bg-gradient-to-br from-aubergine-50 to-white p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-aubergine-100 text-aubergine-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                         <i className="fas fa-droplet text-xl"></i>
                      </div>
                      <div>
                        <p className="font-black text-aubergine-800 text-sm">{formatDate(prediction.nextPeriodEstimate)}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wide">Next Period</p>
                      </div>
                    </div>
                  </div>
                  
                </>
             ) : (
                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-8 text-center h-full flex flex-col justify-center items-center">
                   <div className="w-16 h-16 bg-white rounded-2xl shadow-sm text-slate-300 text-2xl flex items-center justify-center mb-4">
                     <i className="fas fa-chart-pie"></i>
                   </div>
                   <p className="text-sm font-bold text-slate-500">Cycle insights will appear here once setup is complete.</p>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Learn Section restored for educational resources */}
      {(!loading || prediction) && !error && !setupMode && (
         <LearnSection />
      )}
    </div>
  );
}

export default PatientFertility;
