import React from 'react';

/**
 * Progress indicator for multi-step modals/forms — shows the user
 * how many steps remain instead of dropping them into a flow blind.
 * `step` is 1-indexed; `labels` (optional) shows a caption per step.
 */
export function StepIndicator({ step, total, labels }) {
  return (
    <div className="mb-1">
      <div className="flex items-center">
        {Array.from({ length: total }, (_, i) => i + 1).map(n => (
          <React.Fragment key={n}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-colors ${
              n < step ? 'bg-emerald-500 text-white' : n === step ? 'bg-aubergine-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {n < step ? <i className="fas fa-check text-[9px]"></i> : n}
            </div>
            {n < total && <div className={`h-0.5 flex-1 rounded transition-colors ${n < step ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>}
          </React.Fragment>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between mt-1.5">
          {labels.map((l, i) => (
            <span key={l} className={`text-[10px] font-bold ${i + 1 === step ? 'text-aubergine-600' : 'text-slate-500'}`}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default StepIndicator;
