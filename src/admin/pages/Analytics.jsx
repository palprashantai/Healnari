import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { DashboardFilterBar } from '../../components/dashboard/DashboardFilterBar.jsx';
import { KPITrendCard } from '../../components/dashboard/KPITrendCard.jsx';
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState.jsx';

const CURRENCY_COLORS = {
  USD: '#6B46C1', // Aubergine Purple
  GBP: '#0284c7', // Sky Blue
  AED: '#10b981', // Emerald Green
  EUR: '#f59e0b', // Amber
  INR: '#E23E8C', // Magenta Pink
  CAD: '#8b5cf6', // Violet
  AUD: '#06b6d4', // Cyan
};

const STATUS_COLORS = {
  Done: '#10b981',
  Upcoming: '#0284c7',
  Waiting: '#f59e0b',
  'In Progress': '#6B46C1',
  'No Show': '#94a3b8',
  Cancelled: '#f43f5e',
};

const CONSULT_TYPE_COLORS = { video: '#6B46C1', clinic: '#10b981' };
const CONSULT_TYPE_LABELS = { video: 'Video Consults (WebRTC)', clinic: 'Clinic Visits (In-Person)' };

function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30D');
  const [selectedGeo, setSelectedGeo] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/analytics')
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const financialData = useMemo(() => data?.financialData || [], [data]);
  const specialtyRevenue = useMemo(() => data?.specialtyRevenue || [], [data]);
  const revenueByCurrency = useMemo(() => data?.revenueByCurrency || [], [data]);
  const geographicDistribution = useMemo(() => {
    const list = data?.geographicDistribution || [];
    if (selectedGeo === 'ALL') return list;
    return list.filter(g => g.code === selectedGeo);
  }, [data, selectedGeo]);

  const crossBorderSplit = data?.crossBorderSplit || {
    international: 0,
    domestic: 0,
    internationalPercentage: 0,
  };

  const statusBreakdown = useMemo(() => {
    return (data?.appointmentStatusBreakdown || []).map(s => ({ ...s, name: s.status }));
  }, [data]);

  const consultTypeData = useMemo(() => {
    if (!data?.consultTypeSplit) return [];
    return Object.entries(data.consultTypeSplit)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ 
        name: CONSULT_TYPE_LABELS[key] || key, 
        value, 
        color: CONSULT_TYPE_COLORS[key] || '#6B46C1' 
      }));
  }, [data]);

  const crossBorderTrends = useMemo(() => data?.crossBorderTrends || [], [data]);

  // Real Telehealth Conversion Funnel calculated from real backend data
  const totalPatientsCount = data?.totalPatients || 0;
  const completedSessions = statusBreakdown.find(s => s.status === 'Done')?.count || 0;
  const totalBookedSessions = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  const conversionFunnelStages = useMemo(() => {
    if (totalPatientsCount === 0 && totalBookedSessions === 0) return [];
    return [
      { stage: '1. Registered Patient Accounts', count: totalPatientsCount },
      { stage: '2. Consultations Booked', count: totalBookedSessions },
      { stage: '3. Sessions Successfully Completed', count: completedSessions },
    ];
  }, [totalPatientsCount, totalBookedSessions, completedSessions]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-2xl font-black text-slate-900">Global Telehealth Performance Analytics</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry on cross-border patient acquisition, multi-currency yield, and provider capacity from backend database.
          </p>
        </div>
      </div>

      {/* Global Filter Bar */}
      <DashboardFilterBar
        dateRange={timeRange}
        onDateRangeChange={setTimeRange}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter analytics across countries or specialties..."
        filters={[
          {
            key: 'geo',
            label: 'Country Filter',
            value: selectedGeo,
            onChange: setSelectedGeo,
            options: [
              { label: 'All Jurisdictions', value: 'ALL' },
              { label: '🇺🇸 United States', value: 'US' },
              { label: '🇬🇧 United Kingdom', value: 'GB' },
              { label: '🇦🇪 UAE & GCC', value: 'AE' },
              { label: '🇪🇺 European Union', value: 'EU' },
              { label: '🇮🇳 India', value: 'IN' },
              { label: '🇨🇦 Canada', value: 'CA' },
            ],
          },
        ]}
        onReset={() => {
          setTimeRange('30D');
          setSelectedGeo('ALL');
          setSearchQuery('');
        }}
      />

      {/* Level 1: Tier-1 KPI Grid (Real Data) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPITrendCard
          title="Telehealth Members"
          value={(data?.totalPatients || 0).toLocaleString()}
          period="Registered Patient Base"
          icon="fa-globe"
          colorScheme="purple"
          loading={loading}
        />

        <KPITrendCard
          title="Licensed Specialists"
          value={(data?.totalDoctors || 0).toLocaleString()}
          period="Verified Doctors"
          icon="fa-user-doctor"
          colorScheme="emerald"
          loading={loading}
        />

        <KPITrendCard
          title="Cross-Border Share"
          value={`${crossBorderSplit.internationalPercentage}%`}
          period="International vs Domestic"
          icon="fa-plane-departure"
          colorScheme="dark"
          loading={loading}
        />

        <KPITrendCard
          title="Currencies Settled"
          value={`${revenueByCurrency.length} Active`}
          period="Active Inflow Currencies"
          icon="fa-money-bill-transfer"
          colorScheme="amber"
          badgeText="Live Gateway"
          loading={loading}
        />

        <KPITrendCard
          title="Video Consultation %"
          value={`${data?.consultTypeSplit?.video ? Math.round((data.consultTypeSplit.video / Math.max(1, (data.consultTypeSplit.video + data.consultTypeSplit.clinic))) * 100) : 0}%`}
          period="Encrypted WebRTC Calls"
          icon="fa-video"
          colorScheme="magenta"
          loading={loading}
        />

        <KPITrendCard
          title="Consultations Done"
          value={(completedSessions || 0).toLocaleString()}
          period="Completed Telehealth Sessions"
          icon="fa-circle-check"
          colorScheme="purple"
          loading={loading}
        />
      </div>

      {/* Row 1: Geographic Penetration & Multi-Currency Gross Split */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Geographic Distribution (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">Patient Geographic Distribution</h2>
                <p className="text-xs text-slate-500">Distribution of enrolled patients across countries in the database.</p>
              </div>
              <span className="text-xs font-bold text-aubergine-700 bg-aubergine-50 px-2.5 py-1 rounded-full border border-aubergine-100">
                {geographicDistribution.length} Countries
              </span>
            </div>

            {geographicDistribution.length === 0 ? (
              <DashboardEmptyState
                icon="fa-earth-americas"
                title="No Geographic Data"
                description="Patient distribution across countries will render as users register."
              />
            ) : (
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
                        className="h-full bg-gradient-to-r from-aubergine-600 to-magenta-600 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(geo.percentage, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">International Enrolled</p>
              <p className="text-sm font-black text-slate-900">{crossBorderSplit.international} members</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">Domestic Enrolled</p>
              <p className="text-sm font-black text-slate-900">{crossBorderSplit.domestic} members</p>
            </div>
          </div>
        </div>

        {/* Multi-Currency Gross Split (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">Multi-Currency Gross Split</h2>
                <p className="text-xs text-slate-500">Inflow shares across active currencies in payments ledger.</p>
              </div>
            </div>

            {revenueByCurrency.length === 0 ? (
              <DashboardEmptyState
                icon="fa-coins"
                title="No Paid Currency Inflows"
                description="Currency breakdown will display once patient transactions are completed."
              />
            ) : (
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
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Automatic multi-currency settlement</span>
            <span className="font-bold text-slate-800">100% FX Guarded</span>
          </div>
        </div>
      </div>

      {/* Row 2: Conversion Funnel & Patient Growth Trajectory */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Telehealth Patient Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-base">Telehealth Booking Funnel</h2>
                <p className="text-xs text-slate-500">Real platform conversion from user registrations to completed sessions.</p>
              </div>
            </div>

            {conversionFunnelStages.length === 0 ? (
              <DashboardEmptyState
                icon="fa-filter"
                title="No Funnel Data Yet"
                description="Conversion funnel will populate as patients register and book sessions."
              />
            ) : (
              <div className="space-y-3 pt-2">
                {conversionFunnelStages.map((stg) => {
                  const baseCount = Math.max(1, conversionFunnelStages[0].count);
                  const pct = Math.round((stg.count / baseCount) * 100);
                  return (
                    <div key={stg.stage} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700">{stg.stage}</span>
                        <span className="font-mono text-slate-900">{stg.count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-aubergine-600 to-aubergine-800 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cross-Border Growth Trajectory */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-black text-slate-900 text-base">Patient Growth (International vs Domestic)</h2>
              <p className="text-xs text-slate-500">Real historical enrollment trends aggregated from database.</p>
            </div>
            <span className="text-xs font-bold text-aubergine-700 bg-aubergine-50 px-2.5 py-1 rounded-full border border-aubergine-100">
              {crossBorderSplit.internationalPercentage}% Intl
            </span>
          </div>

          {crossBorderTrends.length === 0 ? (
            <DashboardEmptyState
              icon="fa-chart-area"
              title="No Historical Growth Yet"
              description="6-month patient growth trajectory will graph here automatically."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crossBorderTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="intlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6B46C1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="domGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
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
                  <Area type="monotone" dataKey="International" name="International Patients" stroke="#6B46C1" strokeWidth={3} fill="url(#intlGrad)" />
                  <Area type="monotone" dataKey="Domestic" name="Domestic Patients" stroke="#0284c7" strokeWidth={2} fill="url(#domGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Specialty Breakdown & Delivery Modalities */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue by Specialty */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-black text-slate-900 text-sm mb-1">Clinical Specialty Breakdown</h2>
          <p className="text-xs text-slate-500 mb-4">Patient volume across medical verticals.</p>
          {specialtyRevenue.length === 0 ? (
            <DashboardEmptyState
              icon="fa-pie-chart"
              title="No Specialty Inflows"
              description="Specialty shares will display once consultations are booked."
            />
          ) : (
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
          )}
        </div>

        {/* Appointment Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-black text-slate-900 text-sm mb-1">Consultation Status Breakdown</h2>
          <p className="text-xs text-slate-500 mb-4">Real-time status of scheduled sessions.</p>
          {statusBreakdown.length === 0 ? (
            <DashboardEmptyState
              icon="fa-chart-bar"
              title="No Consultations Logged"
              description="Consultation statuses will graph here as appointments are made."
            />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px' }} />
                  <Bar dataKey="count" name="Appointments" radius={[0, 4, 4, 0]} barSize={18}>
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status || entry.name] || '#6B46C1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Consultation Delivery Modes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-black text-slate-900 text-sm mb-1">Delivery Modality</h2>
          <p className="text-xs text-slate-500 mb-4">Encrypted WebRTC Video vs In-Person.</p>
          {consultTypeData.length === 0 ? (
            <DashboardEmptyState
              icon="fa-video"
              title="No Modalities Logged"
              description="Video vs clinic consultation split will calculate here."
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
