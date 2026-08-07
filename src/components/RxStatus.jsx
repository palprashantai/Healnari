import React from 'react';

const MS_PER_DAY = 86400000;
const EXPIRING_SOON_WINDOW = 14;

/** Days from today until dateStr (e.g. "25 Dec 2026"). Negative if in the past. */
export function daysUntil(dateStr) {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / MS_PER_DAY);
}

/**
 * Resolves the *effective* status of a prescription from its validity date
 * rather than trusting a possibly-stale stored `status` field. 'Completed'
 * is preserved as-is since it reflects a course finished on schedule, not lapsed.
 */
export function resolveRxStatus(rx) {
  if (rx.status === 'Completed') return 'Completed';
  const days = daysUntil(rx.validTill);
  if (days === null) return rx.status;
  if (days < 0) return 'Expired';
  if (days <= EXPIRING_SOON_WINDOW) return 'Expiring Soon';
  return 'Active';
}

const BADGE_STYLE = {
  Active:         { icon: 'fa-circle-check',        style: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  'Expiring Soon':{ icon: 'fa-clock',                style: 'bg-amber-50 text-amber-700 border-amber-200' },
  Expired:        { icon: 'fa-circle-xmark',         style: 'bg-rose-50 text-rose-600 border-rose-100' },
  Completed:      { icon: 'fa-check-double',         style: 'bg-slate-100 text-slate-500 border-slate-200' },
};

/** Status pill that derives its label/color from validTill, with an icon for non-color legibility. */
export function RxStatusBadge({ rx, className = '' }) {
  const status = resolveRxStatus(rx);
  const cfg = BADGE_STYLE[status] || BADGE_STYLE.Expired;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.style} ${className}`}>
      <i className={`fas ${cfg.icon} text-[10px]`}></i>
      {status}
    </span>
  );
}

export default RxStatusBadge;
