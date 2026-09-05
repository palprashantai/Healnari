import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';

function AdminDoctorPayouts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/clinics/${id}/payouts`)
      .then(d => setPayouts(d || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading payouts...</div>;
  if (error) return <div className="p-10 text-center text-rose-500">Failed to load payouts.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to={`/admin-dashboard/doctors/${id}`} className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Doctor Profile
          </Link>
          <h1 className="text-2xl font-semibold text-slate-800">Complete Payout History</h1>
          <p className="text-sm text-slate-500">Detailed record of all withdrawal requests for this doctor.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {payouts.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold">No payouts requested yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50">
                  <th className="px-5 py-3 font-semibold">Date Requested</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Destination Details</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payouts.map(p => {
                  const date = p.requested_at || p.created_at;
                  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin-dashboard/doctors/${id}/payouts/${p.id}`)}>
                      <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{formattedDate}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium">{p.method || 'Bank Account'}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium truncate max-w-[200px]" title={JSON.stringify(p.destination_details)}>
                        {p.destination_details?.account_holder || '—'}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900">
                        {p.amount ? `₹${p.amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${
                          p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          p.status === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status || 'Processing'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDoctorPayouts;
