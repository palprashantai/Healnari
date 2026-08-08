import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const COLORS = ['#6B46C1', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#6366f1'];

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('Year to Date');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/analytics')
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fd = data?.financialData || [];
  const specialtyRevenue = data?.specialtyRevenue || [];

  const kpis = data ? [
    { title: 'Total Patients', value: data.totalPatients?.toLocaleString() || '0', icon: 'fa-hospital-user', color: 'text-sky-600', bg: 'bg-sky-50', text: 'text-slate-800', trend: 'Platform', up: true },
    { title: 'Active Doctors', value: data.totalDoctors?.toLocaleString() || '0', icon: 'fa-user-doctor', color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-slate-800', trend: 'Registered', up: true },
    { title: 'Gross Revenue', value: `₹${((fd.reduce((s, m) => s + m.revenue, 0)) / 1000).toFixed(1)}k`, icon: 'fa-money-bill-trend-up', color: 'text-white', bg: 'bg-slate-900', text: 'text-white', trend: 'All time', up: true, dark: true },
    { title: 'Net Margin', value: `₹${((fd.reduce((s, m) => s + m.margin, 0)) / 1000).toFixed(1)}k`, icon: 'fa-indian-rupee-sign', color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-slate-800', trend: '~15% platform cut', up: true },
    { title: 'Consultations', value: fd.reduce((s, m) => s + (m.revenue > 0 ? 1 : 0), 0).toString(), icon: 'fa-calendar-check', color: 'text-rose-600', bg: 'bg-rose-50', text: 'text-slate-800', trend: 'Completed', up: true },
    { title: 'Platform Uptime', value: '99.9%', icon: 'fa-server', color: 'text-violet-600', bg: 'bg-violet-50', text: 'text-slate-800', trend: 'Stable', up: true },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Platform Analytics</h1>
          <p className="text-sm text-slate-500">Monitor system-wide growth, revenue, and adoption metrics.</p>
        </div>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-300 shadow-sm">
          <option>Last 6 Months</option><option>Year to Date</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />) : kpis.map((kpi, i) => (
          <Tilt3D key={kpi.title} max={5}>
            <div className={`border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${kpi.dark ? 'bg-slate-900' : 'bg-white'}`}>
              {kpi.dark && <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>}
              <div className={`w-10 h-10 rounded-xl ${kpi.dark ? 'bg-white/10' : kpi.bg} ${kpi.color} flex items-center justify-center mb-3`}>
                <i className={`fas ${kpi.icon}`}></i>
              </div>
              <p className={`text-[10px] font-bold ${kpi.dark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider mb-1`}>{kpi.title}</p>
              <p className={`text-2xl font-black ${kpi.text}`}>{kpi.value}</p>
              <p className={`text-[10px] font-bold mt-1 ${kpi.up ? 'text-emerald-500' : 'text-rose-500'}`}>{kpi.trend}</p>
            </div>
          </Tilt3D>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Financial Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Financial Performance (Gross vs Payouts)</h2>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Gross Revenue" fill="#1e293b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payout" name="Doctor Payouts" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="margin" name="Net Margin" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* User Growth */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">User Growth (Patients vs Doctors)</h2>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="patients" name="Total Patients" stroke="#0ea5e9" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="doctors" name="Active Doctors" stroke="#f59e0b" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue by Specialty */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Revenue Share by Specialty</h2>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={specialtyRevenue} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {specialtyRevenue.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Net Margin Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Net Platform Margin Trend</h2>
          {loading ? <Skeleton className="h-64" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="margin" name="Net Margin" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMargin)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
