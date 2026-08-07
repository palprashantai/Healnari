import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Tilt3D } from '../../components/Tilt3D.jsx';

const PLATFORM_DATA = [
  { name: 'Jan', revenue: 450000, payout: 380000, margin: 70000 }, { name: 'Feb', revenue: 520000, payout: 430000, margin: 90000 },
  { name: 'Mar', revenue: 480000, payout: 400000, margin: 80000 }, { name: 'Apr', revenue: 610000, payout: 510000, margin: 100000 },
  { name: 'May', revenue: 590000, payout: 490000, margin: 100000 }, { name: 'Jun', revenue: 750000, payout: 620000, margin: 130000 },
  { name: 'Jul', revenue: 820000, payout: 680000, margin: 140000 }, { name: 'Aug', revenue: 890000, payout: 740000, margin: 150000 },
  { name: 'Sep', revenue: 950000, payout: 780000, margin: 170000 }, { name: 'Oct', revenue: 920000, payout: 760000, margin: 160000 },
  { name: 'Nov', revenue: 1050000, payout: 870000, margin: 180000 }, { name: 'Dec', revenue: 1250000, payout: 1020000, margin: 230000 },
];

const USER_GROWTH = [
  { name: 'Jan', patients: 1200, doctors: 45 }, { name: 'Feb', patients: 1450, doctors: 52 },
  { name: 'Mar', patients: 1800, doctors: 58 }, { name: 'Apr', patients: 2200, doctors: 75 },
  { name: 'May', patients: 2600, doctors: 84 }, { name: 'Jun', patients: 3100, doctors: 105 },
  { name: 'Jul', patients: 3800, doctors: 120 }, { name: 'Aug', patients: 4500, doctors: 142 },
  { name: 'Sep', patients: 5200, doctors: 158 }, { name: 'Oct', patients: 6100, doctors: 175 },
  { name: 'Nov', patients: 7400, doctors: 198 }, { name: 'Dec', patients: 9200, doctors: 240 },
];

const SPECIALTY_REVENUE = [
  { name: 'Gynaecology', value: 4500000, color: '#6B46C1' },
  { name: 'Endocrinology', value: 3200000, color: '#10b981' },
  { name: 'Dermatology', value: 1800000, color: '#0ea5e9' },
  { name: 'Nutrition', value: 900000, color: '#f59e0b' },
];

const NETWORK_GROWTH = [
  { name: 'Jul', staff: 12, doctors: 120 }, { name: 'Aug', staff: 25, doctors: 142 },
  { name: 'Sep', staff: 40, doctors: 158 }, { name: 'Oct', staff: 75, doctors: 175 },
  { name: 'Nov', staff: 120, doctors: 198 }, { name: 'Dec', staff: 180, doctors: 240 },
];

const MAU_GROWTH = [
  { name: 'Jul', mau: 14500 }, { name: 'Aug', mau: 18200 },
  { name: 'Sep', mau: 21000 }, { name: 'Oct', mau: 24500 },
  { name: 'Nov', mau: 29800 }, { name: 'Dec', mau: 35000 },
];

const SATISFACTION = [
  { name: 'Jul', score: 4.5 }, { name: 'Aug', score: 4.6 },
  { name: 'Sep', score: 4.7 }, { name: 'Oct', score: 4.7 },
  { name: 'Nov', score: 4.8 }, { name: 'Dec', score: 4.9 },
];

function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('Year to Date');

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Platform Analytics</h1>
          <p className="text-sm text-slate-500">Monitor system-wide growth, revenue, and adoption metrics.</p>
        </div>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-300 shadow-sm">
          <option>Last 7 Days</option><option>Last 30 Days</option>
          <option>Last 6 Months</option><option>Year to Date</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { title: 'Gross Revenue', value: '₹3.4Cr', icon: 'fa-money-bill-trend-up', color: 'text-emerald-400', bg: 'bg-slate-900', text: 'text-white', trend: '+24%', up: true },
          { title: 'Active Doctors', value: '240', icon: 'fa-user-doctor', color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-slate-800', trend: '+18%', up: true },
          { title: 'Total Patients', value: '9,200', icon: 'fa-hospital-user', color: 'text-sky-600', bg: 'bg-sky-50', text: 'text-slate-800', trend: '+45%', up: true },
          { title: 'Consultations', value: '42,450', icon: 'fa-calendar-check', color: 'text-rose-600', bg: 'bg-rose-50', text: 'text-slate-800', trend: '+32%', up: true },
          { title: 'Avg Consult Value', value: '₹850', icon: 'fa-indian-rupee-sign', color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-slate-800', trend: '+5%', up: true },
          { title: 'Platform Uptime', value: '99.9%', icon: 'fa-server', color: 'text-aubergine-600', bg: 'bg-aubergine-50', text: 'text-slate-800', trend: 'Stable', up: true },
        ].map((kpi, i) => (
          <Tilt3D key={kpi.title} max={5}>
            <div className={`border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${i === 0 ? 'bg-slate-900' : 'bg-white'}`}>
              {i === 0 && <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>}
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center mb-3 ${i===0 ? 'bg-white/10' : ''}`}>
                <i className={`fas ${kpi.icon}`}></i>
              </div>
              <p className={`text-[10px] font-bold ${i===0?'text-slate-400':'text-slate-500'} uppercase tracking-wider mb-1`}>{kpi.title}</p>
              <p className={`text-2xl font-black ${kpi.text}`}>{kpi.value}</p>
              <p className={`text-[10px] font-bold mt-1 ${kpi.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                {kpi.trend === 'Stable' ? kpi.trend : <><i className={`fas fa-arrow-${kpi.up ? 'up' : 'down'}`}></i> {kpi.trend}</>}
              </p>
            </div>
          </Tilt3D>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 1. Financial Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Financial Performance (Gross vs Payouts)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PLATFORM_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="revenue" name="Gross Revenue" fill="#1e293b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payout" name="Doctor Payouts" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="margin" name="Net Margin" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Platform Adoption */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">User Growth (Patients vs Doctors)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={USER_GROWTH} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        </div>

        {/* 3. Revenue by Specialty */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Revenue Share by Specialty</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={SPECIALTY_REVENUE} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                  {SPECIALTY_REVENUE.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Active Staff vs Providers */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Network Growth (Doctors vs Staff)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={NETWORK_GROWTH} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStaff" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/><stop offset="95%" stopColor="#d946ef" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="doctors" name="Total Doctors" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorStaff)" />
                <Area type="monotone" dataKey="staff" name="Support Staff" stroke="#6366f1" strokeWidth={3} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Monthly Active Users (MAU) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Monthly Active Users (MAU)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MAU_GROWTH} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="mau" name="Active Users" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Patient Satisfaction */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Global Patient Satisfaction Score</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SATISFACTION} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis domain={[4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="score" name="Avg Rating / 5.0" stroke="#f43f5e" strokeWidth={4} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
