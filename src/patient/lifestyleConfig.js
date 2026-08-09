/** Shared between Tracking.jsx (the daily checklist) and Dashboard.jsx (the
 * "Current Focus" widget, which shows real rolling completion for a subset
 * of these) so both read the same habit keys/labels as the lifestyle_logs API. */
export const LIFESTYLE_ITEMS = [
  { key: 'sleep', label: 'Slept for 8 hours', icon: 'fa-moon', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { key: 'lowGI', label: 'Ate healthy, low-sugar food', icon: 'fa-wheat-awn', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { key: 'exercise', label: 'Exercised for 30 minutes', icon: 'fa-dumbbell', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { key: 'meds', label: 'Took my medicines', icon: 'fa-pills', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { key: 'water', label: 'Drank 2.5 litres of water', icon: 'fa-bottle-water', color: 'text-sky-600 bg-sky-50 border-sky-100' },
  { key: 'stress', label: 'Took 10 minutes to relax', icon: 'fa-brain', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
];
