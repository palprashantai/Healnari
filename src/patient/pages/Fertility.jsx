import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

/* ─── Date helpers — pure UTC calendar-day arithmetic throughout (matches the
   backend's addDays). Never round-trip a local-parsed Date through
   toISOString(): in a positive-UTC-offset timezone (e.g. IST) that silently
   shifts the date by a day and can turn a "+1 day" loop into an infinite one. ─── */
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

/* ─── Simple confidence: icon + one short phrase, no percentages up front ─── */
const CONFIDENCE_LEVELS = [
  { min: 0.75, icon: 'fa-circle-check', word: "We're fairly sure", color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { min: 0.45, icon: 'fa-circle-question', word: 'This is our best guess', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { min: 0, icon: 'fa-triangle-exclamation', word: 'Not very sure yet', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
];
const confidenceInfo = (score) => CONFIDENCE_LEVELS.find(l => score >= l.min);

/* ─── Number stepper — big tap targets, no typing required ──── */
function NumberStepper({ value, onChange, min, max, suffix }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={dec} aria-label="Decrease"
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black flex items-center justify-center flex-shrink-0 active:scale-95 transition-all">
        <i className="fas fa-minus"></i>
      </button>
      <div className="flex-1 text-center">
        <div className="text-lg font-black text-slate-800">{value}</div>
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">{suffix}</div>
      </div>
      <button type="button" onClick={inc} aria-label="Increase"
        className="w-8 h-8 rounded-lg bg-aubergine-100 hover:bg-aubergine-200 text-aubergine-700 text-sm font-black flex items-center justify-center flex-shrink-0 active:scale-95 transition-all">
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
}

/* ─── Calendar day cell ───────────────────────── */
const DAY_TYPE_STYLE = {
  period: { cell: 'bg-rose-500 text-white shadow-sm shadow-rose-200' },
  'period-predicted': { cell: 'bg-rose-50 text-rose-500 border-2 border-dashed border-rose-300' },
  fertile: { cell: 'bg-sky-100 text-sky-700' },
  peak: { cell: 'bg-amber-400 text-white shadow-sm shadow-amber-200', badge: 'fa-star' },
};

/* Info shown in the panel below the grid for whichever day is hovered/tapped. */
const DAY_TYPE_INFO = {
  period: { icon: 'fa-droplet', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', label: 'Period Day (Logged)', description: "You've logged this as a period day. Rest, stay hydrated, and go easy on yourself." },
  'period-predicted': { icon: 'fa-droplet', iconBg: 'bg-rose-50', iconColor: 'text-rose-400', label: 'Next Period (Predicted)', description: "Based on your average cycle length, your next period is expected to start around here. Tap below once it actually starts." },
  fertile: { icon: 'fa-circle', iconBg: 'bg-sky-100', iconColor: 'text-sky-600', label: 'Fertile Day', description: 'Pregnancy is possible from unprotected sex on or near this day — chances rise the closer you get to your most fertile day.' },
  peak: { icon: 'fa-star', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', label: 'Most Fertile Day', description: 'Your single best estimated day for ovulation — the highest-chance day to conceive in this cycle.' },
};
const REGULAR_DAY_INFO = { icon: 'fa-calendar', iconBg: 'bg-slate-100', iconColor: 'text-slate-400', label: 'Regular Day', description: 'Nothing predicted for this day yet.' };

function DayCell({ day, type, dateStr, isToday, isActive, onSelect }) {
  const style = DAY_TYPE_STYLE[type];
  const base = style ? style.cell : 'text-slate-600 hover:bg-slate-100';
  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onMouseEnter={() => onSelect(dateStr)}
        onFocus={() => onSelect(dateStr)}
        onClick={() => onSelect(dateStr)}
        aria-label={`${dateStr}${type ? `, ${DAY_TYPE_INFO[type]?.label || ''}` : ''}`}
        className={`relative w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer hover:scale-110 hover:z-10 focus:outline-none focus:ring-2 focus:ring-aubergine-400 focus:ring-offset-1
          ${base}
          ${isToday ? 'ring-2 ring-slate-800 ring-offset-1' : ''}
          ${isActive && !isToday ? 'ring-2 ring-aubergine-500 ring-offset-1' : ''}`}>
        {day}
        {style?.badge && (
          <i className={`fas ${style.badge} text-white text-[6px] absolute -top-0.5 -right-0.5 bg-amber-500 rounded-full w-2.5 h-2.5 flex items-center justify-center shadow-sm border border-white`}></i>
        )}
      </button>
    </div>
  );
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* Small colored dot on a chevron hints that stepping there reveals something
   marked (a real log, a predicted period, or the fertile window) — so paging
   forward to see a prediction that landed in another month is discoverable
   instead of a blind guess. */
function MonthCalendar({ year, month, getDayType, activeDay, onDaySelect, onPrev, onNext, prevHasMarks, nextHasMarks }) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayLocalStr();
  const monthLabel = firstOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="max-w-xs mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} aria-label="Previous month"
          className="relative w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-xs">
          <i className="fas fa-chevron-left"></i>
          {prevHasMarks && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
        </button>
        <p className="text-sm font-black text-slate-800">{monthLabel}</p>
        <button onClick={onNext} aria-label="Next month"
          className="relative w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-xs">
          <i className="fas fa-chevron-right"></i>
          {nextHasMarks && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-400"></span>}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-slate-400">{w.slice(0, 3)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => onDaySelect(null)}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          return (
            <DayCell key={i} day={d} dateStr={dateStr} type={getDayType(dateStr)}
              isToday={dateStr === todayStr} isActive={dateStr === activeDay} onSelect={onDaySelect} />
          );
        })}
      </div>
    </div>
  );
}

/* Info panel shown below the grid for the hovered/tapped/default-selected day.
   Any day that isn't already a real logged period can be marked as one right
   here — this is the "manually select your period date" affordance, folded
   into the same interaction as browsing, rather than a separate form. */
function DayInfoPanel({ dateStr, type, cycleDay, onLogPeriod, logging }) {
  if (!dateStr) return null;
  const info = DAY_TYPE_INFO[type] || REGULAR_DAY_INFO;
  const isLogged = type === 'period';
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2.5 animate-fade-in max-w-xs mx-auto">
      <div className={`w-8 h-8 rounded-full ${info.iconBg} ${info.iconColor} flex items-center justify-center text-xs flex-shrink-0`}>
        <i className={`fas ${info.icon}`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <p className="font-black text-slate-800 text-xs">{formatDate(dateStr)}</p>
          {cycleDay != null && <span className="text-[10px] font-bold text-slate-400">Day {cycleDay}</span>}
        </div>
        <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${info.iconColor}`}>{info.label}</p>
        <p className="text-xs text-slate-600 mt-0.5 leading-snug">{info.description}</p>
        {isLogged ? (
          <span className="mt-1.5 text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1">
            <i className="fas fa-circle-check"></i> Logged
          </span>
        ) : (
          <button onClick={() => onLogPeriod(dateStr)} disabled={logging}
            className="mt-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors">
            <i className={`fas ${logging ? 'fa-spinner fa-spin' : 'fa-droplet'}`}></i> Mark as period day
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Quick Estimate Form — 3 plain questions, no typing required for numbers ─── */
function QuickEstimateForm({ defaultLastPeriodStart, onEstimate }) {
  const toast = useToast();
  const [lastPeriodStart, setLastPeriodStart] = useState(defaultLastPeriodStart || '');
  const [periodDurationDays, setPeriodDurationDays] = useState(5);
  const [cycleLengthDays, setCycleLengthDays] = useState(28);
  const [calculating, setCalculating] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!lastPeriodStart) { toast('Please pick when your last period started.', 'error'); return; }
    setCalculating(true);
    try {
      const result = await apiFetch('/patients/me/fertility-prediction/quick-estimate', {
        method: 'POST',
        body: { lastPeriodStart, periodDurationDays, cycleLengthDays },
      });
      onEstimate(result);
      toast('Here is your estimate!', 'success');
    } catch (err) {
      toast(err.message || 'Could not calculate. Please try again.', 'error');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border-2 border-aubergine-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 max-w-sm mx-auto">
      <div className="text-center">
        <div className="w-9 h-9 rounded-xl bg-aubergine-100 text-aubergine-600 text-sm flex items-center justify-center mx-auto mb-1.5">
          <i className="fas fa-bolt"></i>
        </div>
        <h4 className="font-black text-slate-800 text-sm">3 Quick Questions</h4>
        <p className="text-xs text-slate-500 mt-0.5">No history needed — get an estimate now.</p>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">1. Last period start date?</label>
        <input type="date" required value={lastPeriodStart} max={todayLocalStr()}
          onChange={e => setLastPeriodStart(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-aubergine-300 focus:border-aubergine-400" />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">2. Period length (days)?</label>
        <NumberStepper value={periodDurationDays} onChange={setPeriodDurationDays} min={1} max={15} suffix="days bleeding" />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">3. Days between periods?</label>
        <NumberStepper value={cycleLengthDays} onChange={setCycleLengthDays} min={15} max={90} suffix="days apart" />
        <p className="text-[10px] text-slate-500 mt-1 text-center">Not sure? 28 is a common average.</p>
      </div>

      <button type="submit" disabled={calculating}
        className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-60 text-white font-black py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md">
        <i className={`fas ${calculating ? 'fa-spinner fa-spin' : 'fa-calculator'}`}></i> {calculating ? 'Calculating…' : 'Show My Estimate'}
      </button>
    </form>
  );
}

/* ─── Learn section — folded into the same page as a collapsed-by-default
   card instead of a separate tab, so there's one continuous scroll. ─── */
const TOPIC_STYLES = {
  sky: { chip: 'bg-sky-50 text-sky-600', ring: 'border-sky-100', dot: 'text-sky-500' },
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
    <div className={`bg-white rounded-xl border ${s.ring} overflow-hidden transition-all`}>
      <button onClick={onToggle} aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50/60 transition-colors">
        <div className={`w-8 h-8 rounded-lg ${s.chip} flex items-center justify-center flex-shrink-0 text-sm`}>
          <i className={`fas ${topic.icon}`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 text-xs">{topic.title}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{topic.summary}</p>
        </div>
        <i className={`fas fa-chevron-down text-slate-300 text-xs transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          <ul className="space-y-2 pl-11">
            {topic.points.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                <i className={`fas fa-circle text-[3px] ${s.dot} mt-1.5 flex-shrink-0`}></i>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {topic.note && <p className="text-[10px] text-slate-400 mt-2 pl-11 italic">{topic.note}</p>}
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <i className="fas fa-book-open text-slate-400"></i> Learn About Your Cycle & Fertility
        </span>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-slate-400 text-xs`}></i>
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 pt-3 pb-1">General information to help you understand your calendar. Not a diagnosis.</p>
          {FERTILITY_TOPICS.map(topic => (
            <AccordionCard key={topic.id} topic={topic} isOpen={openIds.has(topic.id)} onToggle={() => toggleTopic(topic.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientFertility() {
  const { cycleLogs, logCycle } = useClinicData();
  const toast = useToast();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showQuickEstimate, setShowQuickEstimate] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayLocalStr());
  const [loggingDay, setLoggingDay] = useState(false);

  const lastKnownFlowDate = Object.keys(cycleLogs).filter(d => cycleLogs[d]?.flow).sort().pop() || '';

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/patients/me/fertility-prediction')
      .then(setPrediction)
      .catch(err => setError(err.message || 'We could not load your prediction.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasResult = prediction && prediction.classification !== 'insufficient_data';

  // Every real logged period day (from full history, not just the latest streak)
  // always wins; predictions fill in the gaps around it.
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

  // Always opens on today's month, like any normal calendar — predictions for
  // a future month are reached by paging forward (the dot on the chevron and
  // the "jump to predicted period" chip below both point the way there).
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
    const d = new Date(dateStr + 'T00:00:00');
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDay(dateStr);
  };

  const monthHasMarks = (year, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return Object.keys(dayTypes).some(d => d.startsWith(prefix));
  };
  const prevMonthDate = new Date(viewMonth.year, viewMonth.month - 1, 1);
  const nextMonthDate = new Date(viewMonth.year, viewMonth.month + 1, 1);
  const prevHasMarks = monthHasMarks(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  const nextHasMarks = monthHasMarks(nextMonthDate.getFullYear(), nextMonthDate.getMonth());

  // Falls back to today rather than leaving the panel blank once the mouse leaves the grid.
  const selectDay = (dateStr) => setSelectedDay(dateStr || todayLocalStr());

  const selectedDayCycleDay = selectedDay && hasResult ? daysBetweenLocal(prediction.lastPeriodStart, selectedDay) + 1 : null;

  const handleLogPeriod = async (dateStr) => {
    setLoggingDay(true);
    try {
      await logCycle(dateStr, { flow: 'Medium' });
      toast(`Logged ${formatShort(dateStr)} as a period day.`, 'success');
      load(); // refresh the prediction now that history changed
    } catch {
      toast('Could not log that day. Please try again.', 'error');
    } finally {
      setLoggingDay(false);
    }
  };

  const conf = hasResult ? confidenceInfo(prediction.confidenceScore) : null;
  const nextPeriodMonth = hasResult && prediction.nextPeriodEstimate ? new Date(prediction.nextPeriodEstimate + 'T00:00:00') : null;
  const nextPeriodElsewhere = nextPeriodMonth && (nextPeriodMonth.getFullYear() !== viewMonth.year || nextPeriodMonth.getMonth() !== viewMonth.month);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-800">Your Fertility Calendar</h1>
          <p className="text-xs text-slate-500">Tap any date to log it, and see your best days to try for a baby.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {hasResult && (
            <button onClick={() => window.print()} aria-label="Print"
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm text-xs">
              <i className="fas fa-print"></i>
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm">
            <i className={`fas fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {/* Short, plain disclaimer */}
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 text-xs">
          <i className="fas fa-user-doctor"></i>
        </div>
        <p className="text-xs text-sky-800"><strong>A helpful guide, not a medical test.</strong> Always talk to your doctor too.</p>
      </div>

      {loading && !prediction && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
          <p className="font-bold text-sm">Looking at your cycles…</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center">
          <i className="fas fa-triangle-exclamation text-rose-400 text-2xl mb-2 block"></i>
          <p className="text-sm text-rose-700 font-bold">{error}</p>
        </div>
      )}

      {(!loading || prediction) && !error && (
        <>
          {/* Calendar — always visible and tappable, whether or not a prediction exists yet */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
            <p className="text-[10px] text-slate-400 text-center mb-2">
              <i className="fas fa-arrow-pointer mr-1"></i>Tap a date to see it, or mark your period
            </p>
            <MonthCalendar year={viewMonth.year} month={viewMonth.month} getDayType={d => dayTypes[d]}
              activeDay={selectedDay} onDaySelect={selectDay}
              onPrev={() => goToMonth(-1)} onNext={() => goToMonth(1)}
              prevHasMarks={prevHasMarks} nextHasMarks={nextHasMarks} />

            {nextPeriodElsewhere && (
              <div className="flex justify-center mt-2">
                <button onClick={() => goToDate(prediction.nextPeriodEstimate)}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full transition-colors inline-flex items-center gap-1">
                  Next period: {formatShort(prediction.nextPeriodEstimate)} <i className="fas fa-arrow-right text-[8px]"></i>
                </button>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-100">
              {[
                { swatch: 'bg-rose-500', label: 'Period' },
                { swatch: 'bg-rose-50 border border-dashed border-rose-300', label: 'Predicted' },
                { swatch: 'bg-sky-100 border border-sky-200', label: 'Fertile' },
                { swatch: 'bg-amber-400', label: 'Best Day' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${l.swatch}`}></div>
                  <span className="text-[10px] font-bold text-slate-600">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Info panel — updates as you hover/tap dates above; lets you log a period day inline */}
            <DayInfoPanel dateStr={selectedDay} type={dayTypes[selectedDay]} cycleDay={selectedDayCycleDay}
              onLogPeriod={handleLogPeriod} logging={loggingDay} />
          </div>

          {!hasResult && (
            <div className="space-y-3">
              <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-2.5 flex items-start gap-2.5">
                <i className="fas fa-circle-info text-aubergine-500 mt-0.5 flex-shrink-0 text-xs"></i>
                <p className="text-xs text-aubergine-800">{prediction?.message || 'Tap dates above to log your period. After 2 full cycles, your fertile window prediction appears here automatically.'}</p>
              </div>
              <button onClick={() => setShowQuickEstimate(!showQuickEstimate)}
                className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-aubergine-600 py-1 transition-colors">
                {showQuickEstimate ? 'Hide' : "Prefer to just answer 3 quick questions instead?"} <i className={`fas fa-chevron-${showQuickEstimate ? 'up' : 'down'} ml-1`}></i>
              </button>
              {showQuickEstimate && <QuickEstimateForm defaultLastPeriodStart={lastKnownFlowDate} onEstimate={setPrediction} />}
            </div>
          )}

          {hasResult && (
            <>
              {prediction.source === 'manual' && (
                <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-2.5 flex items-center gap-2.5">
                  <i className="fas fa-bolt text-aubergine-500 text-sm flex-shrink-0"></i>
                  <p className="text-xs text-aubergine-800">A quick estimate from what you told us. Tap dates above to log real cycles for a more personal answer.</p>
                </div>
              )}

              {/* Big friendly headline */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg text-center">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-sm flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-egg"></i>
                </div>
                <p className="text-emerald-50 font-bold text-[10px] uppercase tracking-wide mb-0.5">Your Best Days To Try</p>
                <p className="text-xl sm:text-2xl font-black mb-0.5">{formatShort(prediction.fertileWindow[0])} – {formatShort(prediction.fertileWindow[1])}</p>
                <p className="text-emerald-100 text-xs">Most likely: <strong className="text-white">{formatDate(prediction.estimatedOvulationDate)}</strong> ({relativeDay(prediction.estimatedOvulationDate)})</p>
                <p className="text-emerald-50/90 text-[10px] mt-2 max-w-xs mx-auto leading-relaxed">
                  The "fertile window" is the handful of days around ovulation when pregnancy is possible.
                </p>
              </div>

              {/* Simple confidence + next period */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className={`rounded-xl border p-3 flex items-center gap-3 ${conf.bg}`}>
                  <i className={`fas ${conf.icon} ${conf.color} text-xl flex-shrink-0`}></i>
                  <div>
                    <p className={`font-black text-sm ${conf.color}`}>{conf.word}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">How sure we are about this estimate</p>
                  </div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 flex items-center gap-3">
                  <i className="fas fa-droplet text-sky-500 text-xl flex-shrink-0"></i>
                  <div>
                    <p className="font-black text-sky-700 text-sm">{formatDate(prediction.nextPeriodEstimate)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Next period expected ({relativeDay(prediction.nextPeriodEstimate)})</p>
                  </div>
                </div>
              </div>

              {prediction.pcosFlag && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-start gap-2.5">
                  <i className="fas fa-circle-info text-amber-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  <p className="text-xs text-amber-800">You've told us about PCOS/PCOD, so calendar guesses can be less exact. LH strips and BBT tracking on the Tracking page give a clearer answer.</p>
                </div>
              )}

              {/* Collapsible details for anyone who wants the numbers */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <i className="fas fa-chart-simple text-slate-400"></i> Numbers & Details
                  </span>
                  <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'} text-slate-400 text-xs`}></i>
                </button>
                {showDetails && (
                  <div className="p-3 pt-0 space-y-2 text-xs text-slate-600 border-t border-slate-100">
                    <p className="pt-3">{prediction.message}</p>
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between"><span>Cycles analyzed</span><span className="font-bold text-slate-800">{prediction.cycleStats.count}</span></div>
                      <div className="flex justify-between"><span>Average cycle length</span><span className="font-bold text-slate-800">{prediction.cycleStats.meanLength} days</span></div>
                      {prediction.cycleStats.stdDev !== null && (
                        <div className="flex justify-between"><span>Cycle variability (±)</span><span className="font-bold text-slate-800">{prediction.cycleStats.stdDev} days</span></div>
                      )}
                      <div className="flex justify-between"><span>Pattern</span><span className="font-bold text-slate-800">{prediction.classification === 'regular' ? 'Regular' : 'Irregular'}</span></div>
                      <div className="flex justify-between"><span>Confidence score</span><span className="font-bold text-slate-800">{Math.round(prediction.confidenceScore * 100)}%</span></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Learn — merged into the same page, collapsed by default */}
          <LearnSection />
        </>
      )}
    </div>
  );
}

export default PatientFertility;
