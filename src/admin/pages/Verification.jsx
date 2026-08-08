import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function ReviewModal({ doctor, isOpen, onClose, onAction, loading }) {
  const [reason, setReason] = useState('');

  if (!doctor) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Verification Review — ${doctor.name}`} size="lg">
      <div className="space-y-6">
        <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-lg">
              {(doctor.name || 'D').charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{doctor.name}</h3>
              <p className="text-sm text-slate-500">{doctor.specialty} • {doctor.email}</p>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-full text-xs border border-amber-200 flex items-center gap-1.5">
            <i className="fas fa-clock"></i> Pending KYC
          </span>
        </div>

        <div>
          <h4 className="font-bold text-slate-700 text-sm mb-3">Doctor Information</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key: 'Applied On', val: doctor.appliedOn },
              { key: 'Specialty', val: doctor.specialty || 'Not specified' },
              { key: 'Email', val: doctor.email || 'Not provided' },
              { key: 'ID', val: doctor.id?.slice(0, 12) + '…' },
            ].map(({ key, val }) => (
              <div key={key} className="border border-slate-200 rounded-xl p-3 flex justify-between items-center bg-white shadow-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{key}</p>
                  <p className="font-semibold text-slate-700 text-sm">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <i className="fas fa-triangle-exclamation text-amber-600 text-xl mt-0.5"></i>
          <div>
            <p className="text-sm font-bold text-amber-900">Manual KYC Review Required</p>
            <p className="text-xs text-amber-800 mt-1">Please verify doctor credentials independently before approving. Once approved, the doctor gains full access to patient consultations.</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Audit Note / Rejection Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide optional notes for the audit trail log..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-3">
          <span>Audit Timestamp</span>
          <span>{new Date().toLocaleString()}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => { onAction(doctor.id, 'rejected', reason); onClose(); }} disabled={loading}
            className="flex-1 border border-rose-200 text-rose-600 font-bold py-2.5 rounded-xl text-sm hover:bg-rose-50 transition-colors disabled:opacity-70">
            Reject Profile
          </button>
          <button onClick={() => { onAction(doctor.id, 'approved', reason.trim() || 'Verified by Admin'); onClose(); }} disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
            <i className="fas fa-check-circle"></i> Approve & Issue License
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AdminVerification() {
  const toast = useToast();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    apiFetch('/admin/verifications')
      .then(d => setPending(d || []))
      .catch(() => toast('Failed to load verifications', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id, status, reason) => {
    setActionLoading(true);
    const doc = pending.find(p => p.id === id);
    try {
      await apiFetch(`/admin/verifications/${id}`, { method: 'PUT', body: { status } });
      setPending(prev => prev.filter(p => p.id !== id));
      setHistory(prev => [{
        id: doc.id,
        name: doc.name,
        specialty: doc.specialty,
        date: 'Just now',
        status: status === 'approved' ? 'Approved' : 'Rejected',
        by: 'Admin',
        reason,
      }, ...prev]);
      toast(`Doctor profile ${status}.`, status === 'approved' ? 'success' : 'info');
    } catch {
      toast('Failed to update verification status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Doctor Verification</h1>
        <p className="text-sm text-slate-500">Review KYC documents and approve new doctor signups.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '480px' }}>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Pending Review</h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="divide-y divide-slate-50 flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-5"><div className="animate-pulse h-16 bg-slate-100 rounded-xl"></div></div>
              ))
            ) : pending.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <i className="fas fa-check-circle text-4xl mb-3 block text-emerald-400"></i>
                <p className="font-bold">Queue is empty!</p>
                <p className="text-sm mt-1">All doctors are verified.</p>
              </div>
            ) : (
              pending.map(p => (
                <div key={p.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">{p.name}</h3>
                    <p className="text-sm text-slate-500">{p.specialty}</p>
                    <p className="text-xs text-slate-400 mt-1">Applied: {p.appliedOn}</p>
                  </div>
                  <button onClick={() => setReviewTarget(p)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap">
                    Review Documents
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Decision History */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '480px' }}>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Recent Decisions</h2>
          </div>
          <div className="divide-y divide-slate-50 flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <i className="fas fa-history text-3xl mb-3 block text-slate-300"></i>
                <p className="font-bold text-sm">No decisions yet in this session.</p>
              </div>
            ) : history.map(h => (
              <div key={h.id + h.date} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800">{h.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${h.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {h.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{h.specialty} • {h.date}</p>
                <p className="text-[10px] text-slate-400">Reviewed by {h.by}</p>
                {h.reason && <p className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-lg mt-2 inline-block border border-rose-100">{h.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReviewModal doctor={reviewTarget} isOpen={!!reviewTarget} onClose={() => setReviewTarget(null)} onAction={handleAction} loading={actionLoading} />
    </div>
  );
}

export default AdminVerification;
