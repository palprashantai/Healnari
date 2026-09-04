import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar.jsx';
import { KPITrendCard } from '../../components/dashboard/KPITrendCard.jsx';
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState.jsx';

const TYPE_COLORS = { Financial: '#6B46C1', Clinical: '#10b981', Operations: '#f59e0b', System: '#0284c7' };

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
  { id: 'REP-001', name: 'Monthly Revenue Summary', desc: 'Detailed breakdown of platform earnings, multi-currency take-rates, doctor payouts, and tax logs.', type: 'Financial', freq: 'Monthly' },
  { id: 'REP-002', name: 'Patient Demographics & Prevalence', desc: 'Cross-border patient analysis by age, country, and clinical condition distribution.', type: 'Clinical', freq: 'Quarterly' },
  { id: 'REP-003', name: 'Doctor Capacity & Performance', desc: 'Consultation completion rate, patient review score, and average video session duration.', type: 'Operations', freq: 'Monthly' },
  { id: 'REP-004', name: 'WebRTC Telehealth SLA Logs', desc: 'Encrypted call duration, packet loss telemetry, and server node relay availability.', type: 'System', freq: 'Weekly' },
];

function AdminReports() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [dateRange, setDateRange] = useState('30D');

  useEffect(() => {
    apiFetch('/admin/reports')
      .then(d => {
        setSummary(d?.summary || null);
        setHistory(d?.history || []);
      })
      .catch(() => toast('Failed to load reports from backend API', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

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

  const handleExportCsv = (r) => {
    const headers = ['Report_ID', 'Report_Name', 'Category', 'Frequency', 'Generated_Date', 'Status'];
    const rows = [
      [r.report_id || r.id, `"${r.name}"`, r.type, r.freq || 'On Demand', r.created_at || new Date().toISOString(), r.status || 'Generated'].join(',')
    ];
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${r.name.replace(/\s+/g, '_').toLowerCase()}_dossier.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`${r.name} downloaded`, 'success');
  };

  const filteredCatalog = useMemo(() => {
    return REPORT_CATALOG.filter(r => {
      const matchType = selectedType === 'ALL' || r.type === selectedType;
      const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [selectedType, searchQuery]);

  const weeklyTrend = useMemo(() => buildWeeklyTrend(history), [history]);
  const typeBreakdown = useMemo(() => {
    const counts = {};
    history.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
    return Object.entries(counts).map(([type, value]) => ({ name: type, value, color: TYPE_COLORS[type] || '#94a3b8' }));
  }, [history]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Reports &amp; Regulatory Audits</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate exportable compliance, financial, and clinical analytics dossiers from database.</p>
      </div>

      {/* Filter Bar */}
      <DashboardFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search available reports..."
        filters={[
          {
            key: 'type',
            label: 'Report Vertical',
            value: selectedType,
            onChange: setSelectedType,
            options: [
              { label: 'All Verticals', value: 'ALL' },
              { label: 'Financial Reports', value: 'Financial' },
              { label: 'Clinical Reports', value: 'Clinical' },
              { label: 'Operational Reports', value: 'Operations' },
              { label: 'System & SLA Logs', value: 'System' },
            ],
          },
        ]}
        onReset={() => {
          setDateRange('30D');
          setSelectedType('ALL');
          setSearchQuery('');
        }}
      />

      {/* Tier 1 KPIs (Real Data) */}
      <div className="grid sm:grid-cols-3 gap-5">
        <KPITrendCard
          title="Total Registered Platform Patients"
          value={(summary?.totalPatients ?? summary?.totalRegisteredUsers ?? 0).toLocaleString()}
          period="Verified Database Records"
          icon="fa-users"
          colorScheme="purple"
          loading={loading}
        />

        <KPITrendCard
          title="Completed Consultations"
          value={(summary?.completedAppointments ?? 0).toLocaleString()}
          period="Recorded Telehealth Sessions"
          icon="fa-calendar-check"
          colorScheme="emerald"
          loading={loading}
        />

        <KPITrendCard
          title="Consultation Completion Rate"
          value={summary?.completionRate || '0%'}
          period="Fulfilled vs Total Appointments"
          icon="fa-chart-pie"
          colorScheme="magenta"
          badgeText="Live Metric"
          loading={loading}
        />
      </div>

      {/* Trend charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="font-black text-slate-900 text-sm">Report Generation Cadence</h2>
            <p className="text-xs text-slate-500">Volume of audit reports generated over the last 8 weeks.</p>
          </div>
          
          {history.length === 0 ? (
            <DashboardEmptyState
              icon="fa-file-lines"
              title="No Reports Generated Yet"
              description="Click 'Generate Live Report' on any report catalog card below."
            />
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6B46C1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="count" name="Reports Generated" stroke="#6B46C1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAuto)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="font-black text-slate-900 text-sm">Reports by Vertical</h2>
            <p className="text-xs text-slate-500">Distribution of generated dossiers.</p>
          </div>
          
          {typeBreakdown.length === 0 ? (
            <DashboardEmptyState
              icon="fa-pie-chart"
              title="No Generated Data"
              description="Generate your first report to view breakdown."
            />
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {typeBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '700' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Available Report Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
          <h2 className="font-black text-slate-900 text-sm">Available Audit &amp; Compliance Dossiers</h2>
          <span className="text-xs font-bold text-slate-500">{filteredCatalog.length} available dossiers</span>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {filteredCatalog.map(r => (
            <div key={r.id} className="p-6 hover:bg-slate-50/70 transition-colors flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-aubergine-700 bg-aubergine-50 px-2 py-0.5 rounded border border-aubergine-100 uppercase tracking-wider">
                  {r.type}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {r.freq} Cadence
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-base mb-1">{r.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6 flex-1">{r.desc}</p>
              
              <div className="flex gap-3 mt-auto">
                <button 
                  onClick={() => handleGenerate(r)} 
                  disabled={generating === r.id}
                  className="flex-1 bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-xs"
                >
                  {generating === r.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                  {generating === r.id ? 'Generating Dossier...' : 'Generate Live Report'}
                </button>
                <button 
                  onClick={() => handleExportCsv(r)}
                  className="px-3.5 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors flex items-center justify-center shadow-xs" 
                  title="Export raw CSV data"
                >
                  <i className="fas fa-file-csv text-emerald-600"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated History Table */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
            <h2 className="font-black text-slate-900 text-sm">Generated Dossier Archive</h2>
            <span className="text-xs text-slate-500">{history.length} archived files</span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map(r => (
              <div key={r.id || r.report_id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">{r.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{r.report_id || r.id} • {r.type} • {r.size || '1.2 MB'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    r.status === 'Generated' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {r.status || 'Ready'}
                  </span>
                  <button 
                    onClick={() => handleExportCsv(r)} 
                    className="text-xs font-bold text-slate-700 hover:text-aubergine-700 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs"
                  >
                    <i className="fas fa-download text-[10px]"></i> Download
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
