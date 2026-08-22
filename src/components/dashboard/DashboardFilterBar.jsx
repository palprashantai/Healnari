import React, { useState, useEffect } from 'react';

/**
 * Standardized Filter Bar for HealNari Dashboards
 * Features:
 * - Date Range Presets (Today, 7D, 30D, Month, Quarter, YTD, Custom)
 * - Custom Date Range pickers
 * - Optional Dropdown Filters (e.g. Region, Specialty, Currency, Status)
 * - Debounced search input
 * - Active Filter Chips with single-click removal and "Reset All"
 */
export function DashboardFilterBar({
  dateRange,
  onDateRangeChange,
  customStart,
  customEnd,
  onCustomDateChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [], // [{ key, label, value, options: [{ label, value }], onChange }]
  onReset,
  showDateFilter = true,
  className = '',
}) {
  const [localSearch, setLocalSearch] = useState(search || '');

  useEffect(() => {
    setLocalSearch(search || '');
  }, [search]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const DATE_PRESETS = [
    { label: 'Today', value: 'Today' },
    { label: 'Last 7 Days', value: '7D' },
    { label: 'Last 30 Days', value: '30D' },
    { label: 'This Month', value: 'Month' },
    { label: 'This Quarter', value: 'Quarter' },
    { label: 'Year to Date', value: 'YTD' },
    { label: 'Custom', value: 'Custom' },
  ];

  // Count active non-default filters
  const activeFiltersCount = (
    (dateRange && dateRange !== '30D' && dateRange !== 'All' ? 1 : 0) +
    (localSearch ? 1 : 0) +
    filters.filter(f => f.value && f.value !== 'ALL' && f.value !== 'All').length
  );

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        
        {/* Left: Search + Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-aubergine-500/20 focus:border-aubergine-500 transition-all"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              )}
            </div>
          )}

          {/* Dynamic Dropdowns */}
          {filters.map((filter) => (
            <div key={filter.key} className="relative min-w-[130px]">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl px-3 py-2 pr-8 outline-none focus:ring-2 focus:ring-aubergine-500/20 focus:border-aubergine-500 cursor-pointer"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>
          ))}
        </div>

        {/* Right: Date Presets & Custom Picker */}
        {showDateFilter && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto max-w-full">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onDateRangeChange(preset.value)}
                  className={`px-3 py-1 text-xs font-extrabold rounded-lg whitespace-nowrap transition-all ${
                    dateRange === preset.value
                      ? 'bg-white text-aubergine-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {dateRange === 'Custom' && onCustomDateChange && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 animate-fade-in">
                <input
                  type="date"
                  value={customStart || ''}
                  onChange={(e) => onCustomDateChange('start', e.target.value)}
                  className="bg-transparent outline-none text-xs text-slate-700"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  value={customEnd || ''}
                  onChange={(e) => onCustomDateChange('end', e.target.value)}
                  className="bg-transparent outline-none text-xs text-slate-700"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Chips & Reset */}
      {activeFiltersCount > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
            
            {localSearch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aubergine-50 border border-aubergine-100 text-aubergine-700 text-[11px] font-bold">
                <i className="fas fa-search text-[9px]"></i> "{localSearch}"
                <button type="button" onClick={() => setLocalSearch('')} className="hover:text-rose-500">
                  <i className="fas fa-xmark"></i>
                </button>
              </span>
            )}

            {dateRange && dateRange !== '30D' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aubergine-50 border border-aubergine-100 text-aubergine-700 text-[11px] font-bold">
                <i className="fas fa-calendar-day text-[9px]"></i> Range: {dateRange}
                <button type="button" onClick={() => onDateRangeChange('30D')} className="hover:text-rose-500">
                  <i className="fas fa-xmark"></i>
                </button>
              </span>
            )}

            {filters.map((f) => {
              if (!f.value || f.value === 'ALL' || f.value === 'All') return null;
              const selectedOpt = f.options.find(o => o.value === f.value);
              return (
                <span key={f.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                  {f.label}: {selectedOpt?.label || f.value}
                  <button type="button" onClick={() => f.onChange('ALL')} className="hover:text-rose-500">
                    <i className="fas fa-xmark"></i>
                  </button>
                </span>
              );
            })}
          </div>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-bold text-aubergine-600 hover:text-aubergine-800 hover:underline flex items-center gap-1"
            >
              <i className="fas fa-rotate-left text-[10px]"></i> Reset All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardFilterBar;
