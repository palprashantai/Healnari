import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { Tilt3D } from '../../components/Tilt3D.jsx';

const REVENUE_DATA = [
  { name: 'Jan', revenue: 4000, patients: 24 }, { name: 'Feb', revenue: 3000, patients: 18 },
  { name: 'Mar', revenue: 5000, patients: 29 }, { name: 'Apr', revenue: 8780, patients: 45 },
  { name: 'May', revenue: 5890, patients: 32 }, { name: 'Jun', revenue: 9390, patients: 52 },
  { name: 'Jul', revenue: 11200, patients: 65 }, { name: 'Aug', revenue: 12500, patients: 78 },
  { name: 'Sep', revenue: 14000, patients: 90 }, { name: 'Oct', revenue: 13500, patients: 85 },
  { name: 'Nov', revenue: 16000, patients: 105 }, { name: 'Dec', revenue: 18500, patients: 120 },
];

const CONSULT_TYPES = [
  { name: 'Video Consults', value: 850, color: '#6366f1' },
  { name: 'Clinic Visits', value: 540, color: '#10b981' },
  { name: 'Home Visits', value: 120, color: '#f59e0b' },
  { name: 'Chat Consults', value: 230, color: '#d946ef' },
];

const AGE_DEMOGRAPHICS = [
  { age: '18-25', count: 120 }, { age: '26-35', count: 350 },
  { age: '36-45', count: 240 }, { age: '46-55', count: 180 },
  { age: '56+', count: 90 },
];

const RETENTION_DATA = [
  { name: 'Jul', new: 45, return: 20 }, { name: 'Aug', new: 50, return: 28 },
  { name: 'Sep', new: 60, return: 30 }, { name: 'Oct', new: 45, return: 40 },
  { name: 'Nov', new: 70, return: 35 }, { name: 'Dec', new: 80, return: 40 },
];

const TOP_DIAGNOSES = [
  { subject: 'PCOS', A: 120, fullMark: 150 },
  { subject: 'Endometriosis', A: 98, fullMark: 150 },
  { subject: 'Thyroid', A: 86, fullMark: 150 },
  { subject: 'Menopause', A: 99, fullMark: 150 },
  { subject: 'Fertility', A: 85, fullMark: 150 },
  { subject: 'Fibroids', A: 65, fullMark: 150 },
];

const WEEKLY_LOAD = [
  { day: 'Mon', consults: 42 }, { day: 'Tue', consults: 38 },
  { day: 'Wed', consults: 45 }, { day: 'Thu', consults: 30 },
  { day: 'Fri', consults: 55 }, { day: 'Sat', consults: 65 },
  { day: 'Sun', consults: 15 },
];

function DoctorAnalytics() {
  const [timeRange, setTimeRange] = useState('Year to Date');

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

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: 'Total Revenue', value: '₹1.8L', icon: 'fa-indian-rupee-sign', color: 'text-aubergine-600', bg: 'bg-aubergine-50', trend: '+12%', up: true },
          { title: 'Consultations', value: '1,240', icon: 'fa-users', color: 'text-sky-600', bg: 'bg-sky-50', trend: '+8%', up: true },
          { title: 'New Patients', value: '345', icon: 'fa-user-plus', color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+15%', up: true },
          { title: 'Follow-up Rate', value: '62%', icon: 'fa-rotate-right', color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Stable', up: true },
          { title: 'Avg Rating', value: '4.9', icon: 'fa-star', color: 'text-rose-500', bg: 'bg-rose-50', trend: '+0.1', up: true },
          { title: 'No-Show Rate', value: '3.2%', icon: 'fa-user-slash', color: 'text-slate-600', bg: 'bg-slate-100', trend: '-1.2%', up: true },
        ].map(kpi => (
          <Tilt3D key={kpi.title} max={5}>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-3`}>
                <i className={`fas ${kpi.icon}`}></i>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.title}</p>
              <p className="text-2xl font-black text-slate-800">{kpi.value}</p>
              <p className={`text-[10px] font-bold mt-1 ${kpi.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.trend === 'Stable' ? kpi.trend : <><i className={`fas fa-arrow-${kpi.up ? 'up' : 'down'}`}></i> {kpi.trend}</>}
              </p>
            </div>
          </Tilt3D>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 1. Revenue & Patient Growth */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Revenue & Patient Growth</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#6B46C1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area yAxisId="right" type="monotone" dataKey="patients" stroke="#10b981" strokeWidth={3} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Patient Retention (Stacked Bar) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Patient Retention (New vs Return)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={RETENTION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="new" name="New Patients" stackId="a" fill="#0ea5e9" radius={[0, 0, 4, 4]} />
                <Bar dataKey="return" name="Return Patients" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Top Diagnoses (Radar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Top Clinical Diagnoses</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={TOP_DIAGNOSES}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar name="Cases" dataKey="A" stroke="#d946ef" fill="#d946ef" fillOpacity={0.4} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Consultation Types (Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Consultation Delivery Modes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CONSULT_TYPES} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                  {CONSULT_TYPES.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Age Demographics (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Patient Age Demographics</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AGE_DEMOGRAPHICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="Patients" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Weekly Appointment Load (Line Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Weekly Appointment Load</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEKLY_LOAD} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="consults" name="Consultations" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorAnalytics;
