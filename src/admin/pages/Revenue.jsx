import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function ProcessModal({ payout, isOpen, onClose, onProcess }) {
  const toast = useToast();
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!payout) return null;

  const handleProcess = async () => {
    if (!refId) { toast('Enter reference ID', 'error'); return; }
    setLoading(true);
    try {
      await onProcess(payout.id, refId);
      onClose();
    } catch {
      toast('Failed to process payout', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payout" size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">{payout.doctor}</p>
          <p className="text-3xl font-black text-slate-800">₹{payout.amount.toLocaleString()}</p>
          <p className="text-xs font-bold text-slate-400 mt-1">{payout.method}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Bank/UPI Reference Number</label>
          <input value={refId} onChange={e => setRefId(e.target.value)} placeholder="Enter txn reference ID"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <button onClick={handleProcess} disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-double"></i>} Mark as Processed
        </button>
      </div>
    </Modal>
  );
}

function AdminRevenue() {
  const toast = useToast();
  const [revenueData, setRevenueData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processTarget, setProcessTarget] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/revenue'),
      apiFetch('/admin/revenue/payouts'),
    ])
      .then(([rev, po]) => {
        setRevenueData(rev);
        setPayouts(po || []);
      })
      .catch(() => toast('Failed to load revenue data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleProcess = async (id, referenceId) => {
    await apiFetch(`/admin/revenue/payouts/${id}/process`, { method: 'PUT', body: { referenceId } });
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Processed' } : p));
    toast('Payout processed and doctor notified.', 'success');
  };

  const pendingCount = payouts.filter(p => p.status === 'Pending').length;
  const pendingAmount = payouts.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Revenue & Payouts</h1>
          <p className="text-sm text-slate-500">Track platform earnings and process doctor payouts.</p>
        </div>
        <button onClick={() => toast('Exporting financial report...', 'info')}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-file-csv"></i> Export Accounting Data
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Tilt3D max={5}>
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Payouts</p>
            <p className="text-3xl font-black mb-1">₹{loading ? '…' : pendingAmount.toLocaleString()}</p>
            <p className="text-sm text-slate-300">{loading ? '…' : pendingCount} requests waiting</p>
          </div>
        </Tilt3D>
        <Tilt3D max={5}>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platform Revenue (All Time)</p>
            <p className="text-3xl font-black text-slate-800 mb-1">₹{loading ? '…' : (revenueData?.currentMonth || 0).toLocaleString()}</p>
            <p className="text-sm font-bold text-emerald-600">From completed consultations</p>
          </div>
        </Tilt3D>
        <Tilt3D max={5}>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Completed Consultations</p>
            <p className="text-3xl font-black text-slate-800 mb-1">{loading ? '…' : (revenueData?.completedConsultations || 0).toLocaleString()}</p>
            <p className="text-sm text-slate-400">Total volume processed</p>
          </div>
        </Tilt3D>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800">Payout Requests</h2>
          {loading && <i className="fas fa-spinner fa-spin text-slate-400"></i>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">Request ID</th>
                <th className="px-5 py-3 font-semibold">Doctor</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Platform Cut</th>
                <th className="px-5 py-3 font-semibold">Net Payout</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="8" className="px-5 py-3"><div className="animate-pulse h-8 bg-slate-100 rounded-lg"></div></td></tr>
                ))
              ) : payouts.length === 0 ? (
                <tr><td colSpan="8" className="px-5 py-8 text-center text-slate-400">No payout requests yet.</td></tr>
              ) : (
                payouts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{p.displayId}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">{p.doctor}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{p.date}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{p.method}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-600">{p.feeCut} margin</span>
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-700">₹{p.amount.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${p.status === 'Processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.status === 'Pending' ? (
                        <button onClick={() => setProcessTarget(p)} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">Process</button>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold"><i className="fas fa-check mr-1"></i>Done</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProcessModal payout={processTarget} isOpen={!!processTarget} onClose={() => setProcessTarget(null)} onProcess={handleProcess} />
    </div>
  );
}

export default AdminRevenue;
