import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';

function AdminDoctorLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/clinics/${id}/ledger`)
      .then(d => setLedger(d || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading ledger...</div>;
  if (error) return <div className="p-10 text-center text-rose-500">Failed to load ledger.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to={`/admin-dashboard/doctors/${id}`} className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Doctor Profile
          </Link>
          <h1 className="text-2xl font-semibold text-slate-800">Complete Commission Ledger</h1>
          <p className="text-sm text-slate-500">Detailed history of all payments and platform fees for this doctor.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {ledger.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold">No payments recorded.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50">
                  <th className="px-5 py-3 font-semibold">Patient & Date</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold text-right">Gross Paid</th>
                  <th className="px-5 py-3 font-semibold text-right">Doctor Cut</th>
                  <th className="px-5 py-3 font-semibold text-right text-aubergine-700">Platform Cut</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ledger.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin-dashboard/doctors/${id}/ledger/${b.id}`)}>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-700">{b.patient}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{b.date}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{b.service || '—'}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">₹{b.amount?.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-semibold text-emerald-600">₹{b.doctorNet?.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-semibold text-aubergine-700">₹{b.platformFee?.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDoctorLedger;
