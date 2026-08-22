import React from 'react';

/**
 * Standardized Empty / Error State component for BI Dashboards & Tables
 */
export function DashboardEmptyState({
  icon = 'fa-chart-pie',
  title = 'No Data Available',
  description = 'There are no records matching your current filter selection.',
  actionLabel,
  onAction,
  isError = false,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed ${
      isError ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50'
    } ${className}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl mb-3 shadow-xs ${
        isError ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-400 border border-slate-200'
      }`}>
        <i className={`fas ${icon}`}></i>
      </div>

      <h3 className={`text-base font-black mb-1 ${isError ? 'text-rose-900' : 'text-slate-800'}`}>
        {title}
      </h3>

      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center gap-2 ${
            isError
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <i className="fas fa-rotate-left text-[10px]"></i>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default DashboardEmptyState;
