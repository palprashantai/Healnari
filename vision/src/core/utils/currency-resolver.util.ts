import { DecimalMath } from './decimal.util';

export interface ResolvedCurrency {
  country: string;
  currency: 'INR' | 'USD';
  symbol: '₹' | '$';
  isDomestic: boolean;
}

export interface AppointmentPricingLock {
  base_fee_amount: number;
  base_fee_currency: string;
  patient_payable_amount: number;
  patient_payable_currency: string;
  exchange_rate: number;
  exchange_rate_source: string;
  exchange_rate_timestamp: string;
}

/**
 * Single source of truth for Country -> Currency resolution across HealNari.
 * Primary Rule:
 *   - India ('IN', 'INDIA') -> INR (₹)
 *   - All other supported countries -> USD ($)
 */
export function resolveCountryCurrency(countryCode?: string | null): ResolvedCurrency {
  const code = (countryCode || '').toUpperCase().trim();
  if (code === 'IN' || code === 'INDIA' || code === '+91') {
    return {
      country: 'IN',
      currency: 'INR',
      symbol: '₹',
      isDomestic: true,
    };
  }

  // All non-India countries default to USD
  return {
    country: code || 'US',
    currency: 'USD',
    symbol: '$',
    isDomestic: false,
  };
}

const PRICING_LOCK_PREFIX = '<!--HN_PRICING_LOCK:';
const PRICING_LOCK_SUFFIX = ':HN_PRICING_LOCK-->';

/**
 * Embeds a tamper-proof pricing lock into appointment notes while preserving user reason.
 */
export function embedPricingLock(userReason: string | null | undefined, lock: AppointmentPricingLock): string {
  const cleanReason = (userReason || '').trim();
  const lockJson = JSON.stringify(lock);
  return `${cleanReason}\n\n${PRICING_LOCK_PREFIX}${Buffer.from(lockJson).toString('base64')}${PRICING_LOCK_SUFFIX}`.trim();
}

/**
 * Extracts the locked pricing snapshot from an appointment, or null if pre-migration.
 */
export function extractPricingLock(appointment: any): AppointmentPricingLock | null {
  if (!appointment) return null;

  // Check direct properties if present
  if (appointment.base_fee_amount && appointment.patient_payable_amount) {
    return {
      base_fee_amount: Number(appointment.base_fee_amount),
      base_fee_currency: appointment.base_fee_currency || 'INR',
      patient_payable_amount: Number(appointment.patient_payable_amount),
      patient_payable_currency: appointment.patient_payable_currency || 'INR',
      exchange_rate: Number(appointment.exchange_rate || 1.0),
      exchange_rate_source: appointment.exchange_rate_source || 'healnari_treasury_matrix_v1',
      exchange_rate_timestamp: appointment.exchange_rate_timestamp || new Date().toISOString(),
    };
  }

  // Check embedded notes
  const notes = appointment.notes || appointment.reason || '';
  const startIdx = notes.indexOf(PRICING_LOCK_PREFIX);
  const endIdx = notes.indexOf(PRICING_LOCK_SUFFIX);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      const base64Str = notes.substring(startIdx + PRICING_LOCK_PREFIX.length, endIdx);
      const jsonStr = Buffer.from(base64Str, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      return {
        base_fee_amount: Number(parsed.base_fee_amount),
        base_fee_currency: parsed.base_fee_currency || 'INR',
        patient_payable_amount: Number(parsed.patient_payable_amount),
        patient_payable_currency: parsed.patient_payable_currency || 'INR',
        exchange_rate: Number(parsed.exchange_rate || 1.0),
        exchange_rate_source: parsed.exchange_rate_source || 'healnari_treasury_matrix_v1',
        exchange_rate_timestamp: parsed.exchange_rate_timestamp || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Strips the internal pricing lock tag from notes so clinical staff see only the medical reason.
 */
export function stripPricingLockFromNotes(notes?: string | null): string {
  if (!notes) return '';
  const startIdx = notes.indexOf(PRICING_LOCK_PREFIX);
  const endIdx = notes.indexOf(PRICING_LOCK_SUFFIX);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = notes.substring(0, startIdx).trim();
    const after = notes.substring(endIdx + PRICING_LOCK_SUFFIX.length).trim();
    return [before, after].filter(Boolean).join('\n').trim();
  }
  return notes.trim();
}
