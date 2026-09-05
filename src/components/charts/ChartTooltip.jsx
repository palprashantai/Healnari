import React from 'react';
import { formatCurrency } from '../../lib/currency.js';

export function ChartTooltip({ active, payload, label, currency = null, unit = '' }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 text-white rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[150px] z-50">
      {label && (
        <div className="font-extrabold text-slate-300 border-b border-slate-800/80 pb-1 mb-1 flex items-center justify-between">
          <span>{label}</span>
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item, idx) => {
          const val = item.value;
          const formattedVal = currency
            ? formatCurrency(val, currency)
            : unit
            ? `${Number(val).toLocaleString()} ${unit}`
            : Number(val).toLocaleString();

          return (
            <div key={`tooltip-${item.name || idx}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color || item.fill || '#6B46C1' }}
                />
                <span className="text-slate-400 font-medium truncate">{item.name || 'Value'}:</span>
              </div>
              <span className="font-mono font-semibold text-white">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChartTooltip;
