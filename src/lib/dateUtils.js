/**
 * `new Date().toISOString().slice(0, 10)` looks like "today's date" but isn't:
 * toISOString() converts to UTC first. In a positive-UTC-offset zone (e.g. IST,
 * UTC+5:30) that silently shows *yesterday's* date for the first ~5.5 hours of
 * every local day. Use this instead wherever you need today's calendar date as
 * a YYYY-MM-DD string (log keys, date-input min/max/defaults, "is this today"
 * checks) — it reads the local year/month/day directly, never through UTC.
 */
export function todayLocalStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
