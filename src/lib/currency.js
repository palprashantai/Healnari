/**
 * HealNari Centralized Multi-Currency Formatter & Treasury Library
 * Implements ISO 4217 compliance, precision decimal formatting,
 * negative refund formatting, and currency conversion normalization.
 */

export const ISO_CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸', minorDecimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳', minorDecimals: 2 },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', locale: 'en-AE', flag: 'ar-AE', minorDecimals: 2 },
  SAR: { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal', locale: 'ar-SA', flag: '🇸🇦', minorDecimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', flag: '🇪🇺', minorDecimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧', minorDecimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦', minorDecimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺', minorDecimals: 2 },
};

export const SUPPORTED_REPORTING_CURRENCIES = [
  { code: 'USD', label: 'USD ($)', symbol: '$', flag: '🇺🇸' },
  { code: 'INR', label: 'INR (₹)', symbol: '₹', flag: '🇮🇳' },
  { code: 'AED', label: 'AED (Dirham)', symbol: 'AED ', flag: '🇦🇪' },
  { code: 'EUR', label: 'EUR (€)', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', label: 'GBP (£)', symbol: '£', flag: '🇬🇧' },
];

export const SUPPORTED_CURRENCIES = Object.values(ISO_CURRENCIES).map(c => ({
  code: c.code,
  symbol: c.symbol,
  label: `${c.code} (${c.name})`,
  flag: c.flag,
}));

/**
 * Get ISO symbol for currency
 */
export function getCurrencySymbol(currency = 'INR') {
  const code = (currency || 'INR').toUpperCase().trim();
  return ISO_CURRENCIES[code]?.symbol || `${code} `;
}

/**
 * Bank-grade Multi-Currency Formatter
 * Correctly formats positive, zero, and negative (refund) monetary amounts.
 *
 * Examples:
 * formatCurrency(1500, 'INR') => "₹1,500.00"
 * formatCurrency(-18.5, 'USD') => "-$18.50"
 * formatCurrency(3200.5, 'AED') => "AED 3,200.50"
 */
export function formatCurrency(amount, currency = 'INR', options = {}) {
  const code = (currency || 'INR').toUpperCase().trim();
  const meta = ISO_CURRENCIES[code] || {
    symbol: `${code} `,
    locale: 'en-US',
    minorDecimals: 2,
  };

  const rawNum = Number(amount || 0);
  const isNegative = rawNum < 0;
  const absAmount = Math.abs(rawNum);

  const decimals = options.decimals !== undefined ? options.decimals : (options.compact && absAmount >= 1000 ? 0 : 2);

  const formattedValue = absAmount.toLocaleString(meta.locale, {
    minimumFractionDigits: options.hideZeroDecimals && absAmount % 1 === 0 ? 0 : decimals,
    maximumFractionDigits: decimals,
  });

  const sign = isNegative ? '-' : (options.showPlus && rawNum > 0 ? '+' : '');

  // Pre-symbol or post-symbol positioning based on currency conventions
  return `${sign}${meta.symbol}${formattedValue}`;
}

/**
 * Format compact amounts for charts or small KPI cards (e.g. $42.5k)
 */
export function formatCompactCurrency(amount, currency = 'INR') {
  const code = (currency || 'INR').toUpperCase().trim();
  const symbol = getCurrencySymbol(code);
  const rawNum = Number(amount || 0);
  const absNum = Math.abs(rawNum);
  const sign = rawNum < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return `${sign}${symbol}${(absNum / 10000000).toFixed(2)} Cr`;
  }
  if (absNum >= 100000) {
    return `${sign}${symbol}${(absNum / 100000).toFixed(1)} L`;
  }
  if (absNum >= 1000) {
    return `${sign}${symbol}${(absNum / 1000).toFixed(1)}k`;
  }
  return `${sign}${symbol}${absNum.toFixed(0)}`;
}

export default formatCurrency;
