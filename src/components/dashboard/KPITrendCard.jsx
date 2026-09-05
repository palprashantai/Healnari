import React from 'react';
import { Tilt3D } from '../Tilt3D.jsx';

/**
 * Standardized KPI Card for HealNari BI & Dashboards
 * Features:
 * - Level 1 KPI Display (Tier 1 Critical & Tier 2 Supporting)
 * - Semantic trend indicator (+% vs previous period, neutral, down)
 * - Period / Subtitle context (Never numbers in isolation)
 * - Optional drill-down CTA
 * - Semantic status colors from HealNari brand system
 * - Dark mode / Hero emphasis support
 */
export function KPITrendCard({
  title,
  value,
  unit = '',
  period = 'vs last 30 days',
  changePercent,
  trendDirection, // 'up' | 'down' | 'neutral'
  isPositive = true, // true if 'up' is good (e.g. revenue up = good, cancellations up = bad)
  icon = 'fa-chart-simple',
  colorScheme = 'purple', // 'purple' | 'magenta' | 'emerald' | 'amber' | 'rose' | 'dark'
  drillDownLabel,
  onDrillDown,
  loading = false,
  badgeText,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm animate-pulse space-y-3 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
          <div className="w-16 h-5 rounded-full bg-slate-100"></div>
        </div>
        <div className="w-24 h-8 bg-slate-100 rounded-lg"></div>
        <div className="w-32 h-4 bg-slate-100 rounded-md"></div>
      </div>
    );
  }

  const isDark = colorScheme === 'dark';

  const SCHEME_STYLES = {
    purple: {
      iconBg: 'bg-aubergine-50 text-aubergine-700 border-aubergine-100',
      accentGlow: 'bg-aubergine-500/10',
    },
    magenta: {
      iconBg: 'bg-magenta-50 text-magenta-600 border-magenta-100',
      accentGlow: 'bg-magenta-500/10',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      accentGlow: 'bg-emerald-500/10',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-700 border-amber-100',
      accentGlow: 'bg-amber-500/10',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-700 border-rose-100',
      accentGlow: 'bg-rose-500/10',
    },
    dark: {
      iconBg: 'bg-white/10 text-white border-white/10',
      accentGlow: 'bg-aubergine-500/20',
    },
  };

  const currentScheme = SCHEME_STYLES[colorScheme] || SCHEME_STYLES.purple;

  // Compute trend color
  let trendColor = 'text-slate-500 bg-slate-100';
  let trendIcon = 'fa-minus';

  if (trendDirection === 'up') {
    trendColor = isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';
    trendIcon = 'fa-arrow-up';
  } else if (trendDirection === 'down') {
    trendColor = isPositive ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    trendIcon = 'fa-arrow-down';
  }

  return (
    <Tilt3D max={5}>
      <div
        className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full group ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200/90 text-slate-900'
        } ${className}`}
      >
        {/* Glow backdrop */}
        <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 ${currentScheme.accentGlow}`}></div>

        <div>
          {/* Header Row */}
          <div className="flex justify-between items-start mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm border shadow-xs transition-transform group-hover:scale-105 duration-300 ${currentScheme.iconBg}`}>
              <i className={`fas ${icon}`}></i>
            </div>

            {badgeText ? (
              <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                isDark ? 'bg-white/10 text-aubergine-200 border-white/15' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {badgeText}
              </span>
            ) : changePercent !== undefined && changePercent !== null ? (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${trendColor}`}>
                <i className={`fas ${trendIcon} text-[9px]`}></i>
                {Math.abs(changePercent)}%
              </span>
            ) : null}
          </div>

          {/* Metric Value */}
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-semibold font-sans tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {value}
              </span>
              {unit && (
                <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {unit}
                </span>
              )}
            </div>

            <p className={`text-xs font-bold mt-1 tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {title}
            </p>
          </div>
        </div>

        {/* Footer / Context & Drilldown */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <span className="font-medium text-[11px]">
            {period}
          </span>

          {drillDownLabel && onDrillDown && (
            <button
              type="button"
              onClick={onDrillDown}
              className={`font-semibold text-[11px] flex items-center gap-1 hover:underline ${
                isDark ? 'text-aubergine-300 hover:text-white' : 'text-aubergine-700 hover:text-aubergine-900'
              }`}
            >
              {drillDownLabel} <i className="fas fa-chevron-right text-[8px]"></i>
            </button>
          )}
        </div>
      </div>
    </Tilt3D>
  );
}

export default KPITrendCard;
