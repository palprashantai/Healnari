/** Shared between Tracking.jsx (the daily checklist) and Dashboard.jsx (the
 * "Current Focus" widget, which shows real rolling completion for a subset
 * of these) so both read the same habit keys/labels as the lifestyle_logs API. */
export const LIFESTYLE_ITEMS = [
  { key: 'sleep', label: '8 Hours Restful Sleep', icon: 'fa-moon', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { key: 'lowGI', label: 'Low-GI, Anti-Inflammatory Nutrition', icon: 'fa-wheat-awn', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { key: 'exercise', label: '30 Mins Resistance Exercise', icon: 'fa-dumbbell', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { key: 'meds', label: 'Myo-Inositol / Prescribed Meds Taken', icon: 'fa-pills', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { key: 'water', label: 'Drink 2.5L Water', icon: 'fa-bottle-water', color: 'text-sky-600 bg-sky-50 border-sky-100' },
  { key: 'stress', label: 'Mindfulness / Stress Management (10 mins)', icon: 'fa-brain', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
];
