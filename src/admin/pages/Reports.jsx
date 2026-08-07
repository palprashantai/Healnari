import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/* ─── Dummy Data ──────────────────────────────── */
const REPORT_METRICS = [
  { name: 'Week 1', automated: 120, manual: 40 },
  { name: 'Week 2', automated: 150, manual: 60 },
  { name: 'Week 3', automated: 180, manual: 70 },
  { name: 'Week 4', automated: 210, manual: 90 },
  { name: 'Week 5', automated: 240, manual: 85 },
  { name: 'Week 6', automated: 280, manual: 110 },
];
const REPORTS = [
  { id: 'REP-001', name: 'Monthly Revenue Summary', desc: 'Detailed breakdown of platform earnings, payouts, and taxes.', type: 'Financial', freq: 'Monthly' },
  { id: 'REP-002', name: 'Patient Demographics',    desc: 'Analysis of patient age, location, and condition prevalence.', type: 'Clinical', freq: 'Quarterly' },
  { id: 'REP-003', name: 'Doctor Performance Metrics',desc: 'Consultation volume, ratings, and response times.', type: 'Operations', freq: 'Monthly' },
  { id: 'REP-004', name: 'Telemedicine Usage Logs', desc: 'Call durations, drop rates, and bandwidth analytics.', type: 'System', freq: 'Weekly' },
];

/* ─── Main Component ─────────────────────────── */
function AdminReports() {
  const toast = useToast();
  const [generating, setGenerating] = useState(null);

  const handleGenerate = (id, name) => {
    setGenerating(id);
    toast(`Compiling data for ${name}...`, 'info');
    setTimeout(() => {
      setGenerating(null);
      toast(`${name} generated. Downloading PDF...`, 'success');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Generate comprehensive reports for system oversight.</p>
        </div>
      </div>

      {/* Quick Insights Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Tilt3D max={6}>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <i className="fas fa-chart-line absolute -right-4 -bottom-4 text-white/10 text-8xl"></i>
          <h3 className="font-bold mb-4 relative z-10">Consultation Growth</h3>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black">+24%</span>
            <span className="text-sm text-indigo-100 mb-1">MoM</span>
          </div>
        </div>
        </Tilt3D>
        <Tilt3D max={6}>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <i className="fas fa-face-smile absolute -right-4 -bottom-4 text-white/10 text-8xl"></i>
          <h3 className="font-bold mb-4 relative z-10">Patient Satisfaction</h3>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black">4.8</span>
            <span className="text-sm text-emerald-100 mb-1">/ 5.0 avg rating</span>
          </div>
        </div>
        </Tilt3D>
        <Tilt3D max={6}>
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <i className="fas fa-user-slash absolute -right-4 -bottom-4 text-white/10 text-8xl"></i>
          <h3 className="font-bold mb-4 relative z-10">No-Show Rate</h3>
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-4xl font-black">4.2%</span>
            <span className="text-sm text-rose-100 mb-1">Down 1.1%</span>
          </div>
        </div>
        </Tilt3D>
      </div>

      {/* Report Generation Trends */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="font-bold text-slate-800">Report Generation Volumes</h2>
          <p className="text-xs text-slate-500">Automated vs Manual report generation over the last 6 weeks.</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REPORT_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="automated" name="Automated Reports" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAuto)" />
              <Area type="monotone" dataKey="manual" name="Manual Exports" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorManual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reports Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800">Available Reports</h2>
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {REPORTS.map(r => (
            <div key={r.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.type}</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{r.freq}</span>
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-1">{r.name}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">{r.desc}</p>
              
              <div className="flex gap-3 mt-auto">
                <button onClick={() => handleGenerate(r.id, r.name)} disabled={generating === r.id}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {generating === r.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                  {generating === r.id ? 'Generating...' : 'Generate PDF'}
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
    </div>
  );
}

export default AdminReports;
