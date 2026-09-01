import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';

function AdminPayoutDetail() {
  const { id, payoutId } = useParams();
  const [payout, setPayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoading(true);
    apiFetch(`/admin/clinics/${id}/payouts`)
      .then(d => {
        const found = (d || []).find(p => p.id === payoutId);
        if (found) setPayout(found);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, payoutId]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-aubergine-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-slate-500 font-bold mt-6 tracking-widest uppercase text-xs animate-pulse">Loading Details...</p>
    </div>
  );
  
  if (error || !payout) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-24 h-24 bg-rose-50/50 rounded-3xl flex items-center justify-center text-rose-500 mb-6 shadow-sm border border-rose-100 rotate-3">
        <i className="fas fa-exclamation-triangle text-4xl -rotate-3"></i>
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-3">Payout Not Found</h2>
      <p className="text-slate-500 max-w-md font-medium">The payout details you are looking for could not be found or failed to load securely.</p>
      <Link to={`/admin-dashboard/doctors/${id}/payouts`} className="mt-8 text-sm font-bold text-slate-700 bg-white border border-slate-200 px-6 py-3 rounded-xl hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all">
        Return to Payouts
      </Link>
    </div>
  );

  const isPaid = payout.status === 'Paid';
  const isFailed = payout.status === 'Failed';

  return (
    <div className={`max-w-5xl mx-auto py-10 px-4 sm:px-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <Link to={`/admin-dashboard/doctors/${id}/payouts`} className="group flex items-center gap-2.5 text-sm font-bold text-slate-500 hover:text-aubergine-700 transition-colors bg-white/50 backdrop-blur-md border border-slate-200/60 px-4 py-2.5 rounded-full shadow-sm hover:shadow-md hover:bg-white">
          <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1"></i> 
          Back to History
        </Link>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payout ID</span>
          <span className="text-xs font-mono font-bold text-slate-700">{payout.id}</span>
          <button onClick={() => navigator.clipboard.writeText(payout.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-aubergine-600 transition-colors ml-1" title="Copy ID">
            <i className="far fa-copy text-[10px]"></i>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Amount & Status */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Main Value Card */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 shadow-2xl group transition-transform hover:-translate-y-1 duration-500">
            {/* Animated Background Gradients */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-gradient-to-br from-aubergine-500/30 to-fuchsia-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-1000 group-hover:scale-110"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-gradient-to-tr from-brand-500/20 to-teal-500/10 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-1000"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Requested Amount
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-medium text-slate-500 font-serif -mb-1">₹</span>
                  <p className="text-6xl font-black text-white tracking-tighter">
                    {payout.amount?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2.5">
                    <div className={`relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg ${
                      isPaid ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' :
                      isFailed ? 'bg-rose-500/20 text-rose-400 shadow-rose-500/20' :
                      'bg-amber-500/20 text-amber-400 shadow-amber-500/20'
                    }`}>
                      <i className={`fas text-sm ${
                        isPaid ? 'fa-check' :
                        isFailed ? 'fa-times' :
                        'fa-hourglass-half animate-pulse'
                      }`}></i>
                      {!isPaid && !isFailed && (
                        <span className="absolute inset-0 rounded-full border border-amber-400/50 animate-ping opacity-75"></span>
                      )}
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wider ${
                      isPaid ? 'text-emerald-400' :
                      isFailed ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {payout.status || 'Processing'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Method</p>
                  <p className="text-sm font-bold text-slate-200">{payout.method || 'Bank Account'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Tracking */}
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/40 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-full opacity-50"></div>
            
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
              <i className="fas fa-route text-slate-400"></i> Request Tracking
            </h3>
            
            <div className="relative pl-4 space-y-10">
              {/* Animated Progress Line */}
              <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-slate-100 rounded-full overflow-hidden">
                <div className={`w-full bg-gradient-to-b from-aubergine-500 to-emerald-500 transition-all duration-1000 ease-out origin-top ${payout.processed_at ? 'scale-y-100' : 'scale-y-0'}`}></div>
              </div>

              {/* Step 1 */}
              <div className="relative flex items-start gap-6 group/step">
                <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-aubergine-500 shadow-md text-aubergine-600 transition-transform group-hover/step:scale-110">
                  <i className="fas fa-file-invoice-dollar text-sm"></i>
                </div>
                <div className="pt-1.5 flex-1">
                  <p className="font-bold text-slate-800 text-base mb-1">Request Initiated</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {payout.requested_at ? new Date(payout.requested_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-start gap-6 group/step">
                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-transform group-hover/step:scale-110 shadow-md ${
                  isFailed ? 'bg-white border-rose-500 text-rose-500' :
                  payout.processed_at ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30' : 
                  'bg-white border-slate-200 text-slate-300'
                }`}>
                  <i className={`fas text-sm ${
                    isFailed ? 'fa-times' :
                    payout.processed_at ? 'fa-check' : 'fa-spinner fa-spin'
                  }`}></i>
                </div>
                <div className="pt-1.5 flex-1">
                  <p className={`font-bold text-base mb-1 ${payout.processed_at || isFailed ? 'text-slate-800' : 'text-slate-400'}`}>
                    {isFailed ? 'Processing Failed' : 'Funds Settled'}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {payout.processed_at ? new Date(payout.processed_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : (isFailed ? 'Payment rejected' : 'Pending bank confirmation')}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Destination Details Glass Card */}
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/40 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50/50 pointer-events-none"></div>
            
            <div className="relative px-8 py-7 border-b border-slate-100/80 flex items-center gap-4 bg-white/50 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-aubergine-50 to-fuchsia-50 border border-aubergine-100/50 text-aubergine-600 flex items-center justify-center shrink-0 shadow-inner">
                <i className="fas fa-building-columns text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Destination Account</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Where the funds are going</p>
              </div>
            </div>
            
            <div className="relative p-8">
              {payout.destination_details && typeof payout.destination_details === 'object' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-8">
                  {Object.entries(payout.destination_details).map(([key, value]) => {
                    if (key === 'timestamp' || key === 'method') return null;
                    return (
                      <div key={key} className="group relative">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <div className="relative">
                          <p className="font-semibold text-slate-800 text-lg sm:text-xl group-hover:text-aubergine-700 transition-colors break-words">
                            {value === null || value === '' ? '—' : String(value)}
                          </p>
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-0 bg-aubergine-400 rounded-full transition-all duration-300 group-hover:h-full opacity-0 group-hover:opacity-100"></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <pre className="text-sm font-mono text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-auto whitespace-pre-wrap shadow-inner">
                  {JSON.stringify(payout.destination_details, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Technical Data Card */}
          <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/60 shadow-inner overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200/50 flex items-center gap-3">
              <i className="fas fa-server text-slate-400"></i>
              <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest">System Record</h2>
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Reference ID / Txn Hash</p>
                <div className="inline-flex">
                  <p className="font-medium text-slate-600 text-sm break-all font-mono bg-white border border-slate-200/60 px-4 py-2.5 rounded-xl shadow-sm selection:bg-aubergine-100">
                    {payout.reference_id || 'Pending Allocation'}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Settlement Currency</p>
                <div className="inline-flex items-center gap-3 bg-white border border-slate-200/60 px-4 py-2.5 rounded-xl shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                    {payout.currency === 'INR' ? '₹' : '$'}
                  </div>
                  <p className="font-bold text-slate-700 text-sm">
                    {payout.currency || 'INR'}
                  </p>
                </div>
              </div>

              {payout.failure_reason && (
                <div className="sm:col-span-2 mt-2">
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-3">Failure Reason Log</p>
                  <div className="font-medium text-rose-700 bg-white p-5 rounded-2xl border border-rose-200 shadow-sm shadow-rose-100 flex gap-4 items-start relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                    <i className="fas fa-engine-warning mt-1 text-rose-500"></i>
                    <p className="text-sm font-mono leading-relaxed">{payout.failure_reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default AdminPayoutDetail;
