import React from 'react';

/**
 * Parses dose-frequency notation into structured slot counts.
 * Supports:
 * - 3-slot: "1-0-1", "1 - 0 - 1 (After food)"
 * - 4-slot: "1-0-1-1", "1-1-1-1"
 * - Clinical shorthand: "OD", "BD", "TDS", "QID", "HS", "SOS", "PRN"
 */
export function parseDoseSchedule(schedule = '') {
  if (!schedule) return null;
  const clean = String(schedule).trim();

  // Check SOS / PRN
  if (/^(sos|prn)(\b.*)?$/i.test(clean)) {
    const note = clean.replace(/^(sos|prn)[:\s-]*/i, '').replace(/^\(|\)$/g, '').trim();
    return { isSos: true, doses: [0, 0, 0, 0], note: note || 'Take only as needed when symptomatic' };
  }

  // Check 4-slot: N-N-N-N
  const match4 = clean.match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*(.*)$/);
  if (match4) {
    const [, m, a, e, n, rest] = match4;
    return {
      doses: [Number(m), Number(a), Number(e), Number(n)],
      is4Slot: true,
      note: rest.replace(/^\(|\)$/g, '').trim(),
    };
  }

  // Check 3-slot: N-N-N
  const match3 = clean.match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*(.*)$/);
  if (match3) {
    const [, m, a, n, rest] = match3;
    return {
      doses: [Number(m), Number(a), 0, Number(n)],
      is4Slot: false,
      note: rest.replace(/^\(|\)$/g, '').trim(),
    };
  }

  // Standard abbreviations
  const upper = clean.toUpperCase();
  if (upper.startsWith('OD') || upper.startsWith('ONCE DAILY')) {
    return { doses: [1, 0, 0, 0], note: clean.replace(/^(OD|ONCE DAILY)[:\s-]*/i, '').trim() };
  }
  if (upper.startsWith('BD') || upper.startsWith('BID') || upper.startsWith('TWICE DAILY')) {
    return { doses: [1, 0, 0, 1], note: clean.replace(/^(BD|BID|TWICE DAILY)[:\s-]*/i, '').trim() };
  }
  if (upper.startsWith('TDS') || upper.startsWith('TID') || upper.startsWith('THRICE DAILY')) {
    return { doses: [1, 1, 0, 1], note: clean.replace(/^(TDS|TID|THRICE DAILY)[:\s-]*/i, '').trim() };
  }
  if (upper.startsWith('QID')) {
    return { doses: [1, 1, 1, 1], is4Slot: true, note: clean.replace(/^QID[:\s-]*/i, '').trim() };
  }
  if (upper.startsWith('HS') || upper.startsWith('BEDTIME')) {
    return { doses: [0, 0, 0, 1], note: clean.replace(/^(HS|BEDTIME)[:\s-]*/i, '').trim() };
  }

  return null;
}

export function formatScheduleFriendly(schedule = '', form = 'tablet') {
  const parsed = parseDoseSchedule(schedule);
  if (!parsed) return schedule;

  if (parsed.isSos) {
    return parsed.note ? `As needed (SOS): ${parsed.note}` : 'Take as needed (SOS)';
  }

  const [m, a, e, n] = parsed.doses;
  const unit = (form || 'dose').toLowerCase();
  const parts = [];

  const fmt = (qty, time) => `${qty} ${unit}${qty > 1 ? 's' : ''} in the ${time}`;

  if (m > 0) parts.push(fmt(m, 'morning'));
  if (a > 0) parts.push(fmt(a, 'afternoon'));
  if (e > 0) parts.push(fmt(e, 'evening'));
  if (n > 0) parts.push(fmt(n, 'night (bedtime)'));

  if (parts.length === 0) return schedule;
  const sentence = parts.join(', ');
  return parsed.note ? `${sentence} (${parsed.note})` : sentence;
}

const SLOTS_3 = [
  { key: 'morning', label: 'Morning', icon: 'fa-sun', style: 'bg-amber-50 text-amber-800 border-amber-300' },
  { key: 'afternoon', label: 'Noon', icon: 'fa-cloud-sun', style: 'bg-sky-50 text-sky-800 border-sky-300' },
  { key: 'night', label: 'Night', icon: 'fa-moon', style: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
];

const SLOTS_4 = [
  { key: 'morning', label: 'Morning', icon: 'fa-sun', style: 'bg-amber-50 text-amber-800 border-amber-300' },
  { key: 'afternoon', label: 'Noon', icon: 'fa-cloud-sun', style: 'bg-sky-50 text-sky-800 border-sky-300' },
  { key: 'evening', label: 'Eve', icon: 'fa-mug-hot', style: 'bg-purple-50 text-purple-800 border-purple-300' },
  { key: 'night', label: 'Night', icon: 'fa-moon', style: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
];

const INACTIVE_STYLE = 'bg-slate-50 text-slate-400 border-slate-200';

/** Renders a medicine's dose schedule as scannable morning/afternoon/night chips with full patient accessibility. */
export function DoseSchedule({ schedule, className = '' }) {
  const parsed = parseDoseSchedule(schedule);

  if (!parsed) {
    return <p className={`text-xs text-slate-700 font-medium ${className}`}>{schedule}</p>;
  }

  if (parsed.isSos) {
    return (
      <div className={`space-y-1 ${className}`}>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <i className="fas fa-triangle-exclamation text-[10px]"></i>
          SOS • As Needed
        </span>
        {parsed.note && <p className="text-[11px] text-slate-600 font-medium">{parsed.note}</p>}
      </div>
    );
  }

  const slots = parsed.is4Slot ? SLOTS_4 : SLOTS_3;
  const doseValues = parsed.is4Slot ? parsed.doses : [parsed.doses[0], parsed.doses[1], parsed.doses[3]];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((slot, i) => {
          const qty = doseValues[i] || 0;
          const active = qty > 0;
          return (
            <span
              key={slot.key}
              title={`${slot.label}: ${active ? `${qty} dose${qty > 1 ? 's' : ''}` : 'none'}`}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${active ? slot.style : INACTIVE_STYLE}`}
            >
              <i className={`fas ${slot.icon} text-[10px]`}></i>
              <span className="text-[10px] font-medium opacity-80">{slot.label}:</span>
              <span>{active ? qty : '–'}</span>
            </span>
          );
        })}
      </div>
      {parsed.note && <p className="text-[11px] text-slate-600 font-medium mt-1">{parsed.note}</p>}
    </div>
  );
}

export default DoseSchedule;
