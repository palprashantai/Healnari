import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal.jsx';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';

export function GlobalCommissionModal({ isOpen, onClose, currentRate, history, onUpdate }) {
  const toast = useToast();
  const [rate, setRate] = useState(currentRate || 10);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRate(currentRate || 10);
      setReason('');
    }
  }, [isOpen, currentRate]);

  const presets = [5, 10, 12, 15, 20, 25];

  const handleSave = async () => {
    const numRate = Number(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      toast('Commission rate must be between 0% and 100%', 'error');
      return;
    }

    setLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(numRate, reason);
      } else {
        await apiFetch('/admin/commission', {
          method: 'PUT',
          body: { commissionRate: numRate, reason },
        });
      }
      toast(`Global platform commission successfully set to ${numRate}%. Effective for all new transactions.`, 'success');
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to update global commission rate', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sampleFee = 1000;
  const sampleCommission = Math.round((sampleFee * Number(rate || 0)) / 100);
  const sampleDoctorPayout = sampleFee - sampleCommission;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Platform Commission Settings" size="md">
      <div className="space-y-5">
        {/* Active Rate Display */}
        <div className="bg-gradient-to-br from-aubergine-900 to-slate-900 text-white rounded-2xl p-5 text-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-aubergine-300">
            Universal Single Source of Truth
          </span>
          <p className="text-4xl font-black text-amber-300 font-sans tracking-tight mt-1">{rate}%</p>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Doctors receive <strong className="text-white">{100 - Number(rate || 0)}%</strong> of gross settled earnings
          </p>
        </div>

        {/* Live Example Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-bold block text-[10px] uppercase">Example on ₹1,000 Consult</span>
            <span className="font-extrabold text-slate-800">Platform Retains: ₹{sampleCommission}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-bold block text-[10px] uppercase">Physician Net Payout</span>
            <span className="font-black text-emerald-700 text-sm">₹{sampleDoctorPayout} ({100 - Number(rate || 0)}%)</span>
          </div>
        </div>

        {/* Adjust Slider & Number Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black text-slate-700">Set Platform Take Rate (%)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={rate}
                onChange={e => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-16 text-right font-mono font-black text-sm border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-aubergine-500 focus:outline-none"
              />
              <span className="font-bold text-slate-500 text-sm">%</span>
            </div>
          </div>

          <input 
            type="range" 
            min="0" 
            max="50" 
            step="0.5" 
            value={rate || 0} 
            onChange={e => setRate(Number(e.target.value))} 
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-aubergine-600" 
          />

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Presets:</span>
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setRate(p)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  Number(rate) === p
                    ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Change Reason for Audit */}
        <div>
          <label className="text-xs font-black text-slate-700 mb-1.5 block">Audit Change Reason (Optional)</label>
          <input 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            placeholder="e.g. Platform take rate adjustment"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-aubergine-500 bg-white" 
          />
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-3.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Save Global Commission Rate
        </button>

        {/* Audit History Trail */}
        {history && history.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Audit History Trail</p>
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {history.map(h => (
                <div key={h.id} className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">
                      {h.previous_rate ?? '—'}% → <strong className="text-aubergine-700 font-black">{h.new_rate}%</strong>
                    </span>
                    {h.change_reason && <p className="text-[10px] text-slate-500 mt-0.5">{h.change_reason}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(h.effective_from || h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
