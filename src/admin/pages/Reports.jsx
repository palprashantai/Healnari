import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const TYPE_COLORS = { Financial: '#6366f1', Clinical: '#10b981', Operations: '#f59e0b', System: '#0ea5e9' };

function EmptyChart({ label }) {
  return (
    <div className="h-52 flex items-center justify-center text-sm text-slate-400">
      <i className="fas fa-chart-simple mr-2"></i>{label}
    </div>
  );
}

/** Buckets report history rows into the last `weeks` ISO-ish weeks (Mon-start), oldest first. */
function buildWeeklyTrend(history, weeks = 8) {
  const now = new Date();
  const startOfWeek = (d) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // Mon = 0
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(startOfWeek(now));
    start.setDate(start.getDate() - i * 7);
    buckets.push({ start, name: `${start.getDate()}/${start.getMonth() + 1}`, count: 0 });
  }
  history.forEach((r) => {
    if (!r.created_at) return;
    const created = startOfWeek(new Date(r.created_at));
    const bucket = buckets.find(b => b.start.getTime() === created.getTime());
    if (bucket) bucket.count += 1;
  });
  return buckets;
}

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

  const weeklyTrend = useMemo(() => buildWeeklyTrend(history), [history]);
  const typeBreakdown = useMemo(() => {
    const counts = {};
    history.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
    return Object.entries(counts).map(([type, value]) => ({ name: type, value, color: TYPE_COLORS[type] || '#94a3b8' }));
  }, [history]);

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

      {/* Trend charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">Report Generation Volume</h2>
            <p className="text-xs text-slate-500">Reports generated per week, last 8 weeks.</p>
          </div>
          {loading ? <EmptyChart label="Loading…" /> : history.length === 0 ? (
            <EmptyChart label="No reports generated yet." />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="count" name="Reports Generated" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAuto)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">Reports by Type</h2>
            <p className="text-xs text-slate-500">Breakdown of all generated reports.</p>
          </div>
          {loading ? <EmptyChart label="Loading…" /> : typeBreakdown.length === 0 ? (
            <EmptyChart label="No reports generated yet." />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {typeBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
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
