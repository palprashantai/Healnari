/**
 * HealNari Centralized Two-Currency Formatter & Store
 * STRICT POLICY: Supports exclusively two currencies:
 * 1. 🇮🇳 INR — Indian Rupee (₹)
 * 2. 🇺🇸 USD — US Dollar ($)
 *
 * Provides bank-grade formatting, Indian lakh/crore support,
 * and unified persistence across the entire product.
 */

export const ISO_CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳', minorDecimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸', minorDecimals: 2 },
};

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', label: 'INR (₹) — Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', label: 'USD ($) — US Dollar', flag: '🇺🇸' },
];

export const SUPPORTED_REPORTING_CURRENCIES = [
  { code: 'INR', label: 'INR (₹)', symbol: '₹', flag: '🇮🇳' },
  { code: 'USD', label: 'USD ($)', symbol: '$', flag: '🇺🇸' },
];

/**
 * Validates whether a given currency code is strictly supported.
 */
export function isSupportedCurrency(currency) {
  const code = (currency || '').toUpperCase().trim();
  return code === 'INR' || code === 'USD';
}

/**
 * Normalizes input currency code to either 'INR' or 'USD' (defaulting to 'INR').
 */
export function normalizeCurrency(currency) {
  const code = (currency || '').toUpperCase().trim();
  return code === 'USD' ? 'USD' : 'INR';
}

/**
 * Returns strictly 'INR' for India and 'USD' for ANY other country globally.
 */
export function getCurrencyForCountry(countryCode) {
  const code = (countryCode || 'IN').toUpperCase().trim();
  return code === 'IN' ? 'INR' : 'USD';
}

/**
 * Gets ISO symbol for currency ('₹' or '$')
 */
export function getCurrencySymbol(currency = 'INR') {
  const code = normalizeCurrency(currency);
  return ISO_CURRENCIES[code].symbol;
}

/**
 * Primary Canonical Money Formatter for the entire HealNari application.
 *
 * Examples:
 * formatMoney(999, 'INR') => "₹999" (or "₹999.00" if forceDecimals: true)
 * formatMoney(125000, 'INR') => "₹1,25,000"
 * formatMoney(29, 'USD') => "$29"
 * formatMoney(29.5, 'USD') => "$29.50"
 * formatMoney(-15, 'USD') => "-$15"
 */
export function formatMoney(amount, currency = 'INR', options = {}) {
  const code = normalizeCurrency(currency);
  const meta = ISO_CURRENCIES[code];

  const rawNum = Number(amount || 0);
  const isNegative = rawNum < 0;
  const absAmount = Math.abs(rawNum);

  // By default, if the amount is a whole integer, omit decimal places for a clean minimal SaaS look
  // unless explicitly requested via options.decimals or options.forceDecimals
  const isWhole = absAmount % 1 === 0;
  let minDecimals = 0;
  let maxDecimals = 2;

  if (options.forceDecimals) {
    minDecimals = 2;
    maxDecimals = 2;
  } else if (options.decimals !== undefined) {
    minDecimals = options.decimals;
    maxDecimals = options.decimals;
  } else if (!isWhole) {
    minDecimals = 2;
    maxDecimals = 2;
  }

  const formattedValue = absAmount.toLocaleString(meta.locale, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  const sign = isNegative ? '-' : (options.showPlus && rawNum > 0 ? '+' : '');
  return `${sign}${meta.symbol}${formattedValue} ${meta.code}`;
}

// Alias for backward compatibility across existing components
export const formatCurrency = formatMoney;

/**
 * Format compact amounts for charts or KPI badges (e.g. ₹1.25 L, $42.5k)
 */
export function formatCompactCurrency(amount, currency = 'INR') {
  const code = normalizeCurrency(currency);
  const symbol = getCurrencySymbol(code);
  const rawNum = Number(amount || 0);
  const absNum = Math.abs(rawNum);
  const sign = rawNum < 0 ? '-' : '';

  if (code === 'INR') {
    if (absNum >= 10000000) {
      return `${sign}${symbol}${(absNum / 10000000).toFixed(2)} Cr`;
    }
    if (absNum >= 100000) {
      return `${sign}${symbol}${(absNum / 100000).toFixed(1)} L`;
    }
    if (absNum >= 1000) {
      return `${sign}${symbol}${(absNum / 1000).toFixed(1)}k`;
    }
  } else {
    // USD standard notation (k, M, B)
    if (absNum >= 1000000) {
      return `${sign}${symbol}${(absNum / 1000000).toFixed(1)}M`;
    }
    if (absNum >= 1000) {
      return `${sign}${symbol}${(absNum / 1000).toFixed(1)}k`;
    }
  }
  return `${sign}${symbol}${absNum.toFixed(0)}`;
}

/**
 * Client-side Currency Persistence Helpers
 */
export function getStoredCurrency() {
  try {
    const saved = localStorage.getItem('healnari_currency');
    if (saved === 'USD' || saved === 'INR') return saved;
  } catch {}
  return 'INR';
}

export function setStoredCurrency(code) {
  const normalized = normalizeCurrency(code);
  try {
    localStorage.setItem('healnari_currency', normalized);
    window.dispatchEvent(new CustomEvent('healnari_currency_changed', { detail: normalized }));
  } catch {}
  return normalized;
}

/**
 * Calculates dual-currency display for international healthcare consultations.
 * E.g., when a foreign doctor ($50 USD) is viewed by an Indian patient (INR),
 * returns payable amount ₹4,230 with base fee disclosure "$50 USD base fee".
 */
export function getConvertedDisplayPrice(baseAmount, baseCurrency = 'INR', patientCountry = 'IN') {
  const baseCurr = normalizeCurrency(baseCurrency);
  const patientCurr = getCurrencyForCountry(patientCountry);
  const amt = Number(baseAmount || 0);

  if (baseCurr === patientCurr) {
    return {
      payableAmount: amt,
      payableCurrency: patientCurr,
      formattedPayable: formatMoney(amt, patientCurr),
      hasConversion: false,
      baseDisclosure: null,
    };
  }

  // Institutional Treasury Matrix Reference Rate (USD/INR = 84.60)
  const USD_INR_RATE = 84.60;
  let payable = amt;
  let rateNote = '';

  if (baseCurr === 'USD' && patientCurr === 'INR') {
    payable = Math.round(amt * USD_INR_RATE);
    rateNote = '1 USD = ₹84.60';
  } else if (baseCurr === 'INR' && patientCurr === 'USD') {
    payable = Number((amt / USD_INR_RATE).toFixed(2));
    rateNote = '1 USD = ₹84.60';
  }

  return {
    payableAmount: payable,
    payableCurrency: patientCurr,
    formattedPayable: formatMoney(payable, patientCurr),
    hasConversion: true,
    baseDisclosure: `≈ ${formatMoney(amt, baseCurr)} base fee (${rateNote})`,
  };
}

export default formatMoney;


