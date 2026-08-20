import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const STATUS_STYLE = {
  New: 'bg-aubergine-50 text-aubergine-700 border-aubergine-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

function DoctorPatientRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('New');
  const [approvingId, setApprovingId] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declining, setDeclining] = useState(false);

  const load = () => apiFetch('/leads/consultation-requests/mine')
    .then(d => setRequests(d || []))
    .catch(err => toast(err.message || 'Failed to load patient requests', 'error'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = requests.filter(r => tab === 'All' || r.status === tab);
  const pendingCount = requests.filter(r => r.status === 'New').length;

  const approve = async (id) => {
    setApprovingId(id);
    try {
      const res = await apiFetch(`/leads/consultation-requests/${id}/approve`, { method: 'PUT' });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Converted' } : r));
      toast(res.emailSent
        ? 'Patient account created and login details emailed.'
        : 'Patient account created — email delivery is not configured, so share the login details with them directly.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to approve request', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const decline = async () => {
    setDeclining(true);
    try {
      await apiFetch(`/leads/consultation-requests/${declineTarget.id}/decline`, { method: 'PUT' });
      setRequests(prev => prev.map(r => r.id === declineTarget.id ? { ...r, status: 'Closed' } : r));
      toast('Request declined.', 'info');
      setDeclineTarget(null);
    } catch (err) {
      toast(err.message || 'Failed to decline request', 'error');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Patient Requests</h1>
        <p className="text-sm text-slate-500">Visitors who picked you on the public booking page. Approving creates their HealNari account, books the appointment, and emails them their login.</p>
      </div>

      <div className="flex gap-2">
        {['New', 'Converted', 'Closed', 'All'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors ${tab === t ? 'bg-aubergine-700 text-white border-aubergine-700' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
            {t === 'New' ? 'Pending' : t} {t === 'New' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {loading ? (
            <p className="px-5 py-10 text-center text-slate-400 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-user-check text-3xl mb-2 block text-slate-300"></i>
              <p className="font-bold text-sm">No requests here.</p>
            </div>
          ) : filtered.map(r => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center hover:bg-slate-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-800">{r.name}{r.age ? `, ${r.age}` : ''}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status] || STATUS_STYLE.New}`}>{r.status === 'New' ? 'Pending' : r.status}</span>
                </div>
                <p className="text-xs text-slate-500">{r.email} • {r.mobile}</p>
                <p className="text-xs text-aubergine-700 font-bold mt-1">{r.concern || 'General consultation'}</p>
                <p className="text-[10px] text-slate-400 mt-1">Preferred: {r.preferred_date || 'Any date'} {r.preferred_time || ''} • Received {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              {r.status === 'New' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setDeclineTarget(r)}
                    className="text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    Decline
                  </button>
                  <button onClick={() => approve(r.id)} disabled={approvingId === r.id}
                    className="text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors flex items-center gap-2">
                    <i className={`fas ${approvingId === r.id ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                    {approvingId === r.id ? 'Creating account…' : 'Approve & Create Patient'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        onConfirm={decline}
        title="Decline Request"
        message={`Decline the consultation request from ${declineTarget?.name}? They will not be notified automatically.`}
        confirmLabel={declining ? 'Declining…' : 'Decline'}
        confirmStyle="danger"
      />
    </div>
  );
}

export default DoctorPatientRequests;
