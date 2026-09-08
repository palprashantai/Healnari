import React, { useState } from 'react';

/**
 * AIApprovalChip — a standalone confirmation gate for high-impact AI-suggested actions
 * that would write data to clinical records (signing a note, sending a prescription, etc.).
 *
 * Props:
 *  - label: string — primary action label (e.g. "Save to Clinical Note")
 *  - onConfirm: () => void — called after doctor explicitly confirms
 *  - onCancel?: () => void
 *  - icon?: string — FontAwesome icon class (e.g. "fa-file-medical")
 *  - description?: string — short description of what will happen
 *  - severity?: 'low' | 'medium' | 'high' — visual weight of the confirmation
 */
export function AIApprovalChip({
  label,
  onConfirm,
  onCancel,
  icon = 'fa-wand-magic-sparkles',
  description,
  severity = 'medium',
}) {
  const [state, setState] = useState('idle'); // idle | confirming | done

  const severityConfig = {
    low: {
      idle: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-400',
      confirm: 'bg-purple-900/5 border-purple-300',
      confirmBtn: 'bg-purple-700 hover:bg-purple-800 text-white',
    },
    medium: {
      idle: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-500',
      confirm: 'bg-amber-50 border-amber-300',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    high: {
      idle: 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 hover:border-rose-500',
      confirm: 'bg-rose-50 border-rose-300',
      confirmBtn: 'bg-rose-700 hover:bg-rose-800 text-white',
    },
  }[severity];

  if (state === 'done') {
    return (
      <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700">
        <i className="fas fa-circle-check text-emerald-500" />
        Applied to record
      </div>
    );
  }

  if (state === 'confirming') {
    return (
      <div className={`p-3 rounded-xl border ${severityConfig.confirm} space-y-2`}>
        <div className="flex items-start gap-2">
          <i className="fas fa-triangle-exclamation text-amber-500 text-sm mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black text-slate-800">Doctor confirmation required</p>
            {description && (
              <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => { setState('done'); onConfirm?.(); }}
            className={`flex-1 text-xs font-black py-2 px-3 rounded-lg transition-colors ${severityConfig.confirmBtn}`}
          >
            <i className="fas fa-check mr-1.5" />
            Confirm &amp; Apply
          </button>
          <button
            onClick={() => { setState('idle'); onCancel?.(); }}
            className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('confirming')}
      className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border transition-all active:scale-95 ${severityConfig.idle}`}
    >
      <i className={`fas ${icon} text-[11px]`} />
      {label}
      <span className="text-[9px] font-black uppercase tracking-wider ml-1 opacity-60">Review</span>
    </button>
  );
}

export default AIApprovalChip;
