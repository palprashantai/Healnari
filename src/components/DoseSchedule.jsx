import React from 'react';

/**
 * Parses dose-frequency notation like "1-0-1 (After Meals)" into
 * { doses: [morning, afternoon, night], note }.
 * Returns null for schedules that don't follow the N-N-N convention
 * (e.g. "PRN (During pain)"), so callers can fall back to plain text.
 */
export function parseDoseSchedule(schedule = '') {
  const match = schedule.match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)\s*(.*)$/);
  if (!match) return null;
  const [, morning, afternoon, night, rest] = match;
  return {
    doses: [Number(morning), Number(afternoon), Number(night)],
    note: rest.replace(/^\(|\)$/g, '').trim(),
  };
}

const SLOTS = [
  { key: 'morning', label: 'Morning', icon: 'fa-sun', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'afternoon', label: 'Afternoon', icon: 'fa-cloud-sun', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'night', label: 'Night', icon: 'fa-moon', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

const INACTIVE_STYLE = 'bg-slate-50 text-slate-300 border-slate-100';

/** Renders a medicine's dose schedule as scannable morning/afternoon/night chips. */
export function DoseSchedule({ schedule, className = '' }) {
  const parsed = parseDoseSchedule(schedule);

  if (!parsed) {
    return <p className={`text-xs text-slate-500 ${className}`}>{schedule}</p>;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        {SLOTS.map((slot, i) => {
          const qty = parsed.doses[i];
          const active = qty > 0;
          return (
            <span
              key={slot.key}
              title={`${slot.label}: ${active ? `${qty} dose${qty > 1 ? 's' : ''}` : 'none'}`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${active ? slot.style : INACTIVE_STYLE}`}
            >
              <i className={`fas ${slot.icon}`}></i>
              {active ? qty : '–'}
            </span>
          );
        })}
      </div>
      {parsed.note && <p className="text-[10px] text-slate-500 mt-1">{parsed.note}</p>}
    </div>
  );
}

export default DoseSchedule;
