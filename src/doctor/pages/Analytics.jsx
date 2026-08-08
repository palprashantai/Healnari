import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const CONSULT_TYPE_COLORS = { video: '#6366f1', clinic: '#10b981' };
const CONSULT_TYPE_LABELS = { video: 'Video Consults', clinic: 'Clinic Visits' };

function EmptyChart({ label }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-slate-400">
      <i className="fas fa-chart-simple mr-2"></i>{label}
    </div>
  );
}

function DoctorAnalytics() {
  const [timeRange, setTimeRange] = useState('Year to Date');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/doctors/me/analytics')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const monthlyTrend = data?.monthlyTrend || [];
  const weeklyLoad = data?.weeklyLoad || [];
  const ageDemographics = data?.ageDemographics || [];
  const consultTypeData = data
    ? Object.entries(data.consultTypeSplit || {})
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({ name: CONSULT_TYPE_LABELS[key] || key, value, color: CONSULT_TYPE_COLORS[key] || '#94a3b8' }))
    : [];
  const topDiagnosesMax = data?.topDiagnoses?.length ? Math.max(...data.topDiagnoses.map((d) => d.count)) : 0;
  const topDiagnosesData = (data?.topDiagnoses || []).map((d) => ({ subject: d.condition, A: d.count, fullMark: Math.max(topDiagnosesMax, 1) }));

  const kpis = data ? [
    { title: 'Total Revenue', value: `₹${data.totalRevenue.toLocaleString('en-IN')}`, icon: 'fa-indian-rupee-sign', color: 'text-aubergine-600', bg: 'bg-aubergine-50' },
    { title: 'Consultations', value: data.totalConsultations.toLocaleString('en-IN'), icon: 'fa-users', color: 'text-sky-600', bg: 'bg-sky-50' },
    { title: 'Total Patients', value: data.totalPatients.toLocaleString('en-IN'), icon: 'fa-user-plus', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'No-Show Rate', value: `${data.noShowRate}%`, icon: 'fa-user-slash', color: 'text-slate-600', bg: 'bg-slate-100' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Analytics & Growth</h1>
          <p className="text-sm text-slate-500">Track your practice revenue, patient growth, and clinical metrics.</p>
        </div>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-aubergine-300 shadow-sm">
          <option>Last 7 Days</option><option>Last 30 Days</option>
          <option>Last 6 Months</option><option>Year to Date</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400"><i className="fas fa-spinner fa-spin text-2xl"></i></div>
      ) : !data ? (
        <div className="text-center py-20 text-slate-400">
          <i className="fas fa-triangle-exclamation text-2xl mb-2 block"></i>
          Couldn't load analytics right now.
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Tilt3D key={kpi.title} max={5}>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-3`}>
                <i className={`fas ${kpi.icon}`}></i>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.title}</p>
              <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
            </div>
          </Tilt3D>
        ))}
      </div>

      {/* 1. Revenue & Consultation Trend (full width) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4">Revenue & Consultation Trend (Last 12 Months)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#6B46C1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area yAxisId="right" type="monotone" dataKey="consultations" name="Consultations" stroke="#10b981" strokeWidth={3} fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 2. Top Diagnoses (Radar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Top Clinical Diagnoses</h2>
          {topDiagnosesData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={topDiagnosesData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} tick={false} axisLine={false} />
                  <Radar name="Cases" dataKey="A" stroke="#d946ef" fill="#d946ef" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart label="No chronic conditions recorded yet." />}
        </div>

        {/* 3. Consultation Types (Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Consultation Delivery Modes</h2>
          {consultTypeData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={consultTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {consultTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart label="No consultations recorded yet." />}
        </div>

        {/* 4. Age Demographics (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Patient Age Demographics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDemographics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="Patients" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Weekly Appointment Load (Line Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Weekly Appointment Load</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="consultations" name="Consultations" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default DoctorAnalytics;
