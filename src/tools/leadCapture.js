const KEY = 'healnari_lead_captured';

/** Call once a visitor has given their email or contact details this session. */
export function markLeadCaptured() {
  try { sessionStorage.setItem(KEY, 'true'); } catch { /* sessionStorage unavailable */ }
}

/** Whether this visitor has already been asked for (and given) contact details this session. */
export function hasLeadCaptured() {
  try { return sessionStorage.getItem(KEY) === 'true'; } catch { return false; }
}
