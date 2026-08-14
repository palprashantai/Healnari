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

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (Indian Rupee)', flag: '🇮🇳' },
  { code: 'AED', symbol: 'AED ', label: 'AED (UAE Dirham)', flag: '🇦🇪' },
  { code: 'USD', symbol: '$', label: 'USD (US Dollar)', flag: '🇺🇸' },
  { code: 'GBP', symbol: '£', label: 'GBP (British Pound)', flag: '🇬🇧' },
  { code: 'EUR', symbol: '€', label: 'EUR (Euro)', flag: '🇪🇺' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (Canadian Dollar)', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (Australian Dollar)', flag: '🇦🇺' },
];

export function getCurrencySymbol(currency = 'USD') {
  return SYMBOLS[currency] || `${currency} `;
}

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
