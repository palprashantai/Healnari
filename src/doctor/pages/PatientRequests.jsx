import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const STATUS_STYLE = {
  New: 'bg-aubergine-50 text-aubergine-700 border-aubergine-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

function DoctorPatientRequests() {
  const navigate = useNavigate();
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
      await apiFetch(`/leads/consultation-requests/${id}/approve`, { method: 'POST' });
      toast('Patient account created and welcome email dispatched.', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Failed to approve request', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const decline = async () => {
    if (!declineTarget) return;
    setDeclining(true);
    try {
      await apiFetch(`/leads/consultation-requests/${declineTarget.id}/decline`, { method: 'POST' });
      toast('Request declined.', 'info');
      setDeclineTarget(null);
      load();
    } catch (err) {
      toast(err.message || 'Failed to decline request', 'error');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Patient Requests</h1>
          <p className="text-sm text-slate-500">Public consultation requests submitted via your booking link.</p>
        </div>
        <div className="flex gap-2">
          {['New', 'Converted', 'Closed', 'All'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-aubergine-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {t === 'New' ? `Pending (${pendingCount})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading && <p className="text-center text-xs text-slate-400 py-12">Loading requests…</p>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <i className="fas fa-inbox text-3xl mb-2 text-slate-300"></i>
            <p className="text-sm font-bold text-slate-600">No requests found</p>
            <p className="text-xs text-slate-400 mt-1">Share your booking profile link to receive consultation requests.</p>
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {filtered.map(r => (
            <div key={r.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">{r.name}</span>
                  <span className="text-xs text-slate-400">({r.age ? `${r.age} yrs` : 'Age not provided'})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status] || STATUS_STYLE.New}`}>{r.status === 'New' ? 'Pending' : r.status}</span>
                </div>
                <p className="text-xs text-slate-500">{r.email} • {r.mobile}</p>
                <p className="text-xs text-aubergine-700 font-bold mt-1">{r.concern || 'General consultation'}</p>
                <p className="text-[10px] text-slate-400 mt-1">Preferred: {r.preferred_date || 'Any date'} {r.preferred_time || ''} • Received {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              {r.status === 'New' ? (
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
              ) : r.status === 'Converted' ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => navigate('/doctor-dashboard/appointments')}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-aubergine-50 text-aubergine-700 border border-aubergine-200 hover:bg-aubergine-100 transition-colors flex items-center gap-1.5">
                    <i className="fas fa-calendar-check text-[11px]"></i> View in Appointments
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        onConfirm={decline}
        title="Decline Request"
        message={`Decline the consultation request from ${declineTarget?.name}? They will be notified via email.`}
        confirmLabel={declining ? 'Declining…' : 'Decline'}
        confirmStyle="danger"
      />
    </div>
  );
}

export default DoctorPatientRequests;
