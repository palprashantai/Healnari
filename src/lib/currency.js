const SYMBOLS = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  AED: 'AED ',
  EUR: '€',
  CAD: 'CA$',
  AUD: 'A$',
};

const LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  GBP: 'en-GB',
  AED: 'en-AE',
  EUR: 'de-DE',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

/**
 * Format monetary amounts according to currency and locale.
 */
export function formatCurrency(amount, currency = 'USD') {
  const symbol = SYMBOLS[currency] || `${currency} `;
  const locale = LOCALES[currency] || 'en-US';
  const value = Number(amount || 0).toLocaleString(locale);
  return `${symbol}${value}`;
}

export default formatCurrency;
