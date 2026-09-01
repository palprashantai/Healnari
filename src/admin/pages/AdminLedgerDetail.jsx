import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';

function AdminLedgerDetail() {
  const { id, ledgerId } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Fetch all and find, or we could have a specific endpoint. 
    // Using the existing list endpoint for simplicity.
    apiFetch(`/admin/clinics/${id}/ledger`)
      .then(d => {
        const found = (d || []).find(r => r.id === ledgerId);
        if (found) setRecord(found);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, ledgerId]);

  if (loading) return <div className="p-10 text-center">Loading ledger details...</div>;
  if (error || !record) return <div className="p-10 text-center text-rose-500">Failed to load ledger details or not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-6">
      <Link to={`/admin-dashboard/doctors/${id}/ledger`} className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
        <i className="fas fa-arrow-left"></i> Back to Ledger History
      </Link>
      
      <div>
        <h1 className="text-2xl font-black text-slate-800">Ledger Entry Details</h1>
        <p className="text-sm text-slate-500">#{record.id}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-bold mb-1">Gross Amount</p>
            <p className="text-2xl font-black text-slate-900 font-sans">₹{record.amount?.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs text-emerald-600 font-bold mb-1">Doctor Net</p>
            <p className="text-2xl font-black text-emerald-700 font-sans">₹{record.doctorNet?.toLocaleString()}</p>
          </div>
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4">
            <p className="text-xs text-aubergine-600 font-bold mb-1">Platform Fee ({record.commissionRate}%)</p>
            <p className="text-2xl font-black text-aubergine-700 font-sans">₹{record.platformFee?.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 text-sm font-bold">Status</span>
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded border capitalize ${
              record.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {record.status}
            </span>
          </div>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between">
            <span className="text-slate-500 text-sm">Patient</span>
            <span className="font-bold text-slate-800">{record.patient}</span>
          </div>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between">
            <span className="text-slate-500 text-sm">Service</span>
            <span className="font-bold text-slate-800">{record.service || '—'}</span>
          </div>
          <div className="px-5 py-4 flex justify-between">
            <span className="text-slate-500 text-sm">Transaction Date</span>
            <span className="font-bold text-slate-800">{new Date(record.rawDate || record.date).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLedgerDetail;
