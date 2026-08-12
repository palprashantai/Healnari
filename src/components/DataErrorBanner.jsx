import React from 'react';

/** AUDIT_REPORT.md FE-1 — shown when ClinicDataContext's load failed, so a
 * network blip or backend restart reads as "something's wrong, retry" and
 * not as a silently-empty account. */
export function DataErrorBanner({ message, onRetry }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span className="flex items-center gap-2">
        <i className="fas fa-triangle-exclamation"></i>
        {message || "We couldn't load your data. Please try again."}
      </span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}

export default DataErrorBanner;
