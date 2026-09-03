import { formatCurrency, formatCompactCurrency } from '../../lib/currency.js';

export const CHART_COLORS = {
  primary: '#6B46C1', // Aubergine / Brand
  primaryLight: '#9F7AEA',
  secondary: '#0284C7', // Sky Blue
  secondaryLight: '#38BDF8',
  success: '#10B981', // Emerald / Platform Margin
  successLight: '#34D399',
  warning: '#F59E0B', // Amber
  danger: '#F43F5E', // Rose / Urgent / Cancelled
  neutral: '#64748B', // Slate
  grid: '#F1F5F9',
  text: '#64748B',
  darkText: '#0F172A',
  cardBg: '#FFFFFF',
  tooltipBg: '#0F172A',
};

export const STATUS_PALETTE = {
  Done: '#10B981',
  Confirmed: '#0284C7',
  Scheduled: '#6B46C1',
  Waiting: '#F59E0B',
  Pending: '#F59E0B',
  Cancelled: '#F43F5E',
  'No-Show': '#94A3B8',
  Refunded: '#E11D48',
  Paid: '#10B981',
};

export const MODALITY_PALETTE = {
  video: '#6B46C1',
  clinic: '#10B981',
  telehealth: '#6B46C1',
  in_person: '#10B981',
};

export const CURRENCY_PALETTE = {
  INR: '#6B46C1',
  USD: '#0284C7',
  EUR: '#10B981',
  GBP: '#F59E0B',
  AED: '#8B5CF6',
};

/**
 * Universal human-readable compact formatter
 * e.g. 800 => ₹800, 1500 => ₹1.5k, 250000 => ₹2.5L / $250k
 */
export function formatChartMetric(val, currency = null) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  if (currency) {
    return formatCompactCurrency(num, currency);
  }
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString();
}

export const standardCartesianGrid = {
  vertical: false,
  stroke: CHART_COLORS.grid,
  strokeDasharray: '3 3',
};

export const standardXAxis = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fontWeight: 700, fill: CHART_COLORS.text },
  dy: 5,
};

export const standardYAxis = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: CHART_COLORS.text },
  dx: -5,
};
