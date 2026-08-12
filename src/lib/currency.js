const SYMBOLS = { INR: '₹', AED: 'AED ', USD: '$' };

/** AUDIT_REPORT.md DB-3 — the ₹ symbol was hardcoded across the app with no
 * currency concept at all. Backend rows without an explicit currency are
 * pre-migration and were always INR, so that's the safe default here too. */
export function formatCurrency(amount, currency = 'INR') {
  const symbol = SYMBOLS[currency] || `${currency} `;
  const value = Number(amount || 0).toLocaleString('en-IN');
  return `${symbol}${value}`;
}

export default formatCurrency;
