import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const STATUS_STYLE = {
  New: 'bg-aubergine-50 text-aubergine-700 border-aubergine-200',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUSES = ['New', 'Contacted', 'Converted', 'Closed'];

function AdminLeads() {
  const toast = useToast();
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/leads/consultation-requests'),
      apiFetch('/admin/leads/newsletter'),
    ])
      .then(([reqs, subs]) => { setRequests(reqs || []); setSubscribers(subs || []); })
      .catch(() => toast('Failed to load leads', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      await apiFetch(`/admin/leads/consultation-requests/${id}/status`, { method: 'PUT', body: { status } });
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: r.status } : r));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Leads</h1>
        <p className="text-sm text-slate-500">Consultation requests and newsletter signups from the public site — nobody creates an account for these, so the care team follows up by phone/email.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('requests')} className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors ${tab === 'requests' ? 'bg-aubergine-700 text-white border-aubergine-700' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
          Consultation Requests ({requests.length})
        </button>
        <button onClick={() => setTab('newsletter')} className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors ${tab === 'newsletter' ? 'bg-aubergine-700 text-white border-aubergine-700' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
          Newsletter Subscribers ({subscribers.length})
        </button>
      </div>

      {tab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="px-5 py-3 font-semibold">Name &amp; Contact</th>
                  <th className="px-5 py-3 font-semibold">Concern</th>
                  <th className="px-5 py-3 font-semibold">Doctor Selected</th>
                  <th className="px-5 py-3 font-semibold">Preferred</th>
                  <th className="px-5 py-3 font-semibold">Received</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-400">No consultation requests yet.</td></tr>
                ) : requests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{r.name}{r.age ? `, ${r.age}` : ''}</p>
                      <p className="text-xs text-slate-500">{r.mobile}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{r.concern || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{r.doctor_name ? `Dr. ${r.doctor_name}` : (r.specialty_recommendation || '—')}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{r.preferred_date || '—'} {r.preferred_time || ''}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                    <td className="px-5 py-4">
                      <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border outline-none cursor-pointer ${STATUS_STYLE[r.status] || STATUS_STYLE.New}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'newsletter' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {loading ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">Loading…</p>
            ) : subscribers.length === 0 ? (
              <p className="px-5 py-10 text-center text-slate-400 text-sm">No subscribers yet.</p>
            ) : subscribers.map(s => (
              <div key={s.id} className="px-5 py-3 flex justify-between items-center">
                <span className="font-bold text-slate-700 text-sm">{s.email}</span>
                <span className="text-xs text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLeads;
