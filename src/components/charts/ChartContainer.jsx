import React from 'react';

export function ChartContainer({
  title,
  subtitle,
  icon,
  badgeText,
  badgeColor = 'emerald',
  actionSlot,
  children,
  loading = false,
  isEmpty = false,
  emptyTitle = 'No Data Available',
  emptyDescription = 'Telemetry points will render here as events occur.',
  height = 'h-64',
  footer,
  className = '',
}) {
  const badgeClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-aubergine-50 text-aubergine-700 border-aubergine-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }[badgeColor] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between transition-all ${className}`}>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              {icon && <i className={`fas ${icon} text-aubergine-600`}></i>}
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {badgeText && (
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badgeClasses}`}>
                {badgeText}
              </span>
            )}
            {actionSlot}
          </div>
        </div>

        {loading ? (
          <div className={`${height} w-full flex items-center justify-center`}>
            <div className="w-full space-y-3 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-xl w-full"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-slate-100 rounded w-16"></div>
                <div className="h-3 bg-slate-100 rounded w-16"></div>
                <div className="h-3 bg-slate-100 rounded w-16"></div>
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          <div className={`${height} w-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200`}>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <i className={`fas ${icon || 'fa-chart-simple'} text-base`}></i>
            </div>
            <p className="text-xs font-bold text-slate-700">{emptyTitle}</p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">{emptyDescription}</p>
          </div>
        ) : (
          <div className={`${height} w-full`}>
            {children}
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
          {footer}
        </div>
      )}
    </div>
  );
}

export default ChartContainer;
