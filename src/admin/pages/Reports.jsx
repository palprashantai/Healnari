import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const REPORT_CATALOG = [
  { id: 'REP-001', name: 'Monthly Revenue Summary', desc: 'Detailed breakdown of platform earnings, payouts, and taxes.', type: 'Financial', freq: 'Monthly' },
  { id: 'REP-002', name: 'Patient Demographics', desc: 'Analysis of patient age, location, and condition prevalence.', type: 'Clinical', freq: 'Quarterly' },
  { id: 'REP-003', name: 'Doctor Performance Metrics', desc: 'Consultation volume, ratings, and response times.', type: 'Operations', freq: 'Monthly' },
  { id: 'REP-004', name: 'Telemedicine Usage Logs', desc: 'Call durations, drop rates, and bandwidth analytics.', type: 'System', freq: 'Weekly' },
];

function AdminReports() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    apiFetch('/admin/reports')
      .then(d => {
        setSummary(d?.summary || null);
        setHistory(d?.history || []);
      })
      .catch(() => toast('Failed to load reports', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (report) => {
    setGenerating(report.id);
    toast(`Compiling data for ${report.name}...`, 'info');
    try {
      const res = await apiFetch('/admin/reports/generate', {
        method: 'POST',
        body: { name: report.name, type: report.type },
      });
      setHistory(prev => [res, ...prev]);
      toast(`${report.name} generated successfully!`, 'success');
    } catch {
      toast('Report generation failed', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const trendData = [
    { name: 'W1', automated: 12, manual: 4 },
    { name: 'W2', automated: 15, manual: 6 },
    { name: 'W3', automated: 18, manual: 7 },
    { name: 'W4', automated: 21, manual: 9 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Reports & Analytics</h1>
        <p className="text-sm text-slate-500">Generate comprehensive reports for system oversight.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', value: loading ? '…' : (summary?.totalRegisteredUsers?.toLocaleString() || '0'), bg: 'from-indigo-500 to-indigo-700', icon: 'fa-users' },
          { label: 'Completed Consultations', value: loading ? '…' : (summary?.completedAppointments?.toLocaleString() || '0'), bg: 'from-emerald-500 to-emerald-700', icon: 'fa-calendar-check' },
          { label: 'Completion Rate', value: loading ? '…' : (summary?.completionRate || '0%'), bg: 'from-rose-500 to-rose-700', icon: 'fa-chart-pie' },
        ].map(s => (
          <Tilt3D key={s.label} max={6}>
            <div className={`bg-gradient-to-br ${s.bg} text-white rounded-2xl p-6 shadow-md relative overflow-hidden`}>
              <i className={`fas ${s.icon} absolute -right-4 -bottom-4 text-white/10 text-8xl`}></i>
              <h3 className="font-bold mb-4 relative z-10 text-sm">{s.label}</h3>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-4xl font-black">{s.value}</span>
              </div>
            </div>
          </Tilt3D>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="font-bold text-slate-800">Report Generation Volumes</h2>
          <p className="text-xs text-slate-500">Automated vs Manual report generation over the last 4 weeks.</p>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="automated" name="Automated Reports" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAuto)" />
              <Area type="monotone" dataKey="manual" name="Manual Exports" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorManual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800">Available Reports</h2>
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {REPORT_CATALOG.map(r => (
            <div key={r.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.type}</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{r.freq}</span>
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-1">{r.name}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">{r.desc}</p>
              <div className="flex gap-3 mt-auto">
                <button onClick={() => handleGenerate(r)} disabled={generating === r.id}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {generating === r.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                  {generating === r.id ? 'Generating...' : 'Generate Report'}
                </button>
                <button onClick={() => toast('Exporting raw data as CSV...', 'info')}
                  className="px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-sm transition-colors flex items-center justify-center" title="Download CSV">
                  <i className="fas fa-file-csv"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Generated Reports History</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.report_id} • {r.type} • {r.size}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${r.status === 'Generated' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.status}</span>
                  <button onClick={() => toast('Downloading...', 'info')} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <i className="fas fa-download"></i> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReports;
