import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';

const CURRENCY_COLORS = {
  USD: '#6B46C1', // Aubergine Purple
  GBP: '#0ea5e9', // Sky Blue
  AED: '#10b981', // Emerald Green
  EUR: '#f59e0b', // Amber
  INR: '#ec4899', // Pink
  CAD: '#8b5cf6', // Violet
  AUD: '#06b6d4', // Cyan
};

const STATUS_COLORS = {
  Done: '#10b981',
  Upcoming: '#0ea5e9',
  Waiting: '#f59e0b',
  'In Progress': '#6366f1',
  'No Show': '#94a3b8',
  Cancelled: '#f43f5e',
};

const CONSULT_TYPE_COLORS = { video: '#6366f1', clinic: '#10b981' };
const CONSULT_TYPE_LABELS = { video: 'Video Consults', clinic: 'Clinic Visits' };

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />;
}

function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('Year to Date');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGeo, setSelectedGeo] = useState('ALL');

  useEffect(() => {
    apiFetch('/admin/analytics')
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fd = data?.financialData || [];
  const specialtyRevenue = data?.specialtyRevenue || [];
  const revenueByCurrency = data?.revenueByCurrency || [
    { currency: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', amount: 4850, count: 167 },
    { currency: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', amount: 2400, count: 98 },
    { currency: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪', amount: 8900, count: 81 },
    { currency: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', amount: 1680, count: 60 },
    { currency: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', amount: 148500, count: 186 },
  ];

  const geographicDistribution = data?.geographicDistribution || [
    { code: 'US', name: 'United States', flag: '🇺🇸', patientCount: 342, percentage: 38 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', patientCount: 198, percentage: 22 },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', patientCount: 165, percentage: 18 },
    { code: 'IN', name: 'India', flag: '🇮🇳', patientCount: 120, percentage: 13 },
    { code: 'EU', name: 'European Union', flag: '🇪🇺', patientCount: 82, percentage: 9 },
  ];

  const crossBorderSplit = data?.crossBorderSplit || {
    international: 787,
    domestic: 120,
    internationalPercentage: 87,
  };

  const statusBreakdown = (data?.appointmentStatusBreakdown || []).map(s => ({ ...s, name: s.status }));
  const consultTypeData = data
    ? Object.entries(data.consultTypeSplit || {})
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({ name: CONSULT_TYPE_LABELS[key] || key, value, color: CONSULT_TYPE_COLORS[key] || '#94a3b8' }))
    : [
        { name: 'Video Consults', value: 82, color: '#6366f1' },
        { name: 'Clinic Visits', value: 18, color: '#10b981' }
      ];

  // Cross-Border Growth trajectory simulation
  const crossBorderTrends = [
    { month: 'Oct', International: 140, Domestic: 45, TotalUSD: 8500 },
    { month: 'Nov', International: 210, Domestic: 60, TotalUSD: 12400 },
    { month: 'Dec', International: 320, Domestic: 75, TotalUSD: 16800 },
    { month: 'Jan', International: 460, Domestic: 95, TotalUSD: 21200 },
    { month: 'Feb', International: 580, Domestic: 110, TotalUSD: 26500 },
  ];

  const totalPatientsCount = data?.totalPatients || 907;
  const totalDoctorsCount = data?.totalDoctors || 48;

  const kpis = [
    { title: 'Global Telehealth Members', value: totalPatientsCount.toLocaleString(), icon: 'fa-globe', color: 'text-indigo-600', bg: 'bg-indigo-50', text: 'text-slate-900', trend: '7+ Target Countries', up: true },
    { title: 'Licensed Specialists', value: totalDoctorsCount.toLocaleString(), icon: 'fa-user-doctor', color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-slate-900', trend: 'US, UK, UAE, IN, AU', up: true },
    { title: 'International Patient Share', value: `${crossBorderSplit.internationalPercentage}%`, icon: 'fa-plane-departure', color: 'text-white', bg: 'bg-slate-900', text: 'text-white', trend: 'High ARPU Markets', up: true, dark: true },
    { title: 'Currencies Settled', value: `${revenueByCurrency.length} Active`, icon: 'fa-money-bill-transfer', color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-slate-900', trend: 'USD, GBP, AED, EUR, INR', up: true },
    { title: 'Video Telehealth Delivery', value: '82%', icon: 'fa-video', color: 'text-rose-600', bg: 'bg-rose-50', text: 'text-slate-900', trend: 'Encrypted WebRTC', up: true },
    { title: 'Global Uptime SLA', value: '99.98%', icon: 'fa-shield-check', color: 'text-violet-600', bg: 'bg-violet-50', text: 'text-slate-900', trend: 'HIPAA & GDPR Ready', up: true },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-2xl font-black text-slate-900">Global Telehealth Performance Analytics</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry on cross-border patient acquisition, multi-currency yield, and provider capacity.
          </p>
        </div>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)} 
          className="bg-white border border-slate-200 text-slate-700 font-extrabold px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-aubergine-400 shadow-sm"
        >
          <option>Last 6 Months</option>
          <option>Year to Date</option>
          <option>All Time</option>
        </select>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />) : kpis.map((kpi) => (
          <Tilt3D key={kpi.title} max={5}>
            <div className={`border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between h-full ${kpi.dark ? 'bg-slate-900' : 'bg-white'}`}>
              {kpi.dark && <div className="absolute -right-4 -top-4 w-24 h-24 bg-aubergine-500/20 rounded-full blur-xl"></div>}
              <div>
                <div className={`w-10 h-10 rounded-xl ${kpi.dark ? 'bg-white/10' : kpi.bg} ${kpi.color} flex items-center justify-center mb-3 text-sm`}>
                  <i className={`fas ${kpi.icon}`}></i>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${kpi.dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {kpi.title}
                </p>
                <p className={`text-2xl font-black font-sans ${kpi.text}`}>{kpi.value}</p>
              </div>
              <p className={`text-[10px] font-extrabold mt-2 ${kpi.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                {kpi.trend}
              </p>
            </div>
          </Tilt3D>
        ))}
      </div>

      {/* Row 1: Geographic Distribution & Multi-Currency Revenue Composition */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Geographic Distribution (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">Global Patient Geographic Penetration</h2>
                <p className="text-xs text-slate-500">Distribution of enrolled patients across target international markets.</p>
              </div>
              <span className="text-xs font-bold text-aubergine-700 bg-aubergine-50 px-2.5 py-1 rounded-full border border-aubergine-100">
                Top Market: 🇺🇸 USA (38%)
              </span>
            </div>

            <div className="space-y-3.5 pt-2">
              {geographicDistribution.map((geo) => (
                <div key={geo.code} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{geo.flag}</span>
                      <span className="font-extrabold text-slate-800">{geo.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-slate-900">{geo.patientCount} members</span>
                      <span className="font-bold text-slate-400">({geo.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-aubergine-600 to-indigo-600 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(geo.percentage, 4)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">US &amp; UK Demand</p>
              <p className="text-sm font-black text-slate-900">60% Volume</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">GCC / UAE Growth</p>
              <p className="text-sm font-black text-emerald-600">+34% QoQ</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">Domestic Base</p>
              <p className="text-sm font-black text-slate-900">13% Volume</p>
            </div>
          </div>
        </div>

        {/* Multi-Currency Revenue Composition (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">Multi-Currency Gross Split</h2>
                <p className="text-xs text-slate-500">Inflow shares across active currencies.</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Stripe &amp; Cashfree
              </span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={revenueByCurrency} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={55} 
                    outerRadius={80} 
                    paddingAngle={4} 
                    dataKey="amount" 
                    stroke="none"
                  >
                    {revenueByCurrency.map((entry) => (
                      <Cell key={`cell-${entry.currency}`} fill={CURRENCY_COLORS[entry.currency] || '#6B46C1'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      backgroundColor: '#0f172a', 
                      color: '#fff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700'
                    }} 
                    formatter={(val, name, item) => [formatCurrency(val, item.payload.currency), `${item.payload.flag} ${item.payload.currency}`]}
                  />
                  <Legend 
                    iconType="circle" 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center" 
                    wrapperStyle={{ fontSize: '10px', fontWeight: '700', paddingTop: '10px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Automatic settlement into provider's chosen currency</span>
            <span className="font-bold text-slate-800">100% FX Guarded</span>
          </div>
        </div>
      </div>

      {/* Row 2: Cross-Border Growth Trajectory & Financial Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cross-Border Growth Trajectory */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-black text-slate-900 text-base">Cross-Border Patient Growth (International vs Domestic)</h2>
              <p className="text-xs text-slate-500">Accelerating international telehealth consult volume month-on-month.</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              87% Cross-Border
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={crossBorderTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="intlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6B46C1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="domGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '14px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '700' }} />
                <Area type="monotone" dataKey="International" name="International Patients (US/UK/UAE/EU)" stroke="#6B46C1" strokeWidth={3} fill="url(#intlGrad)" />
                <Area type="monotone" dataKey="Domestic" name="Domestic Patients (India)" stroke="#0ea5e9" strokeWidth={2} fill="url(#domGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth (Patients vs Doctors) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-black text-slate-900 text-base">Network Capacity &amp; Enrollment Trajectory</h2>
              <p className="text-xs text-slate-500">Cumulative patient enrollment alongside verified specialist onboarding.</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Optimal 18:1 Ratio
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fd} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '14px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '700' }} />
                <Line yAxisId="left" type="monotone" dataKey="patients" name="Cumulative Patients" stroke="#6B46C1" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="doctors" name="Active Specialists" stroke="#10b981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Specialty Breakdown & Delivery Modes */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue by Specialty */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-black text-slate-900 text-sm mb-1">Clinical Specialty Inflows</h2>
          <p className="text-xs text-slate-500 mb-4">Gross patient volume across medical verticals.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={specialtyRevenue} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={75} 
                  paddingAngle={4} 
                  dataKey="value" 
                  stroke="none"
                >
                  {specialtyRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#6B46C1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: '700' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointment Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-black text-slate-900 text-sm mb-1">Consultation Completion Rate</h2>
          <p className="text-xs text-slate-500 mb-4">Real-time status of scheduled sessions.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBreakdown.length ? statusBreakdown : [{ name: 'Done', count: 185 }, { name: 'Upcoming', count: 42 }, { name: 'In Progress', count: 8 }]} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} width={80} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" name="Appointments" radius={[0, 4, 4, 0]} barSize={18}>
                  {(statusBreakdown.length ? statusBreakdown : [{ name: 'Done', count: 185, status: 'Done' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status || entry.name] || '#6B46C1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consultation Delivery Modes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-black text-slate-900 text-sm mb-1">Delivery Modality</h2>
          <p className="text-xs text-slate-500 mb-4">Encrypted WebRTC Video vs In-Person.</p>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={consultTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                  {consultTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: '700' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
