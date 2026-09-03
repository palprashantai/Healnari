import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency, getCurrencySymbol } from '../../lib/currency.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart } from 'recharts';
import { apiFetch } from '../../lib/apiClient.js';
import { KPITrendCard } from '../../components/dashboard/KPITrendCard.jsx';
import { DashboardEmptyState } from '../../components/dashboard/DashboardEmptyState.jsx';
import { ChartTooltip } from '../../components/charts/ChartTooltip.jsx';
import { standardCartesianGrid, standardXAxis, standardYAxis } from '../../components/charts/chartTheme.js';

const CONSULT_TYPE_COLORS = { video: '#6B46C1', clinic: '#10B981' };
const CONSULT_TYPE_LABELS = { video: 'Video Consults (WebRTC)', clinic: 'Clinic Visits (In-Person)' };
const APPT_STATUS_COLORS = { Completed: '#6B46C1', Scheduled: '#0284c7', Cancelled: '#EF4444', NoShow: '#94a3b8' };

function DoctorAnalytics() {
  const { user } = useAuth();
  const userCurrency = user?.profile?.currency || user?.currency || 'INR';
  const [timeRange, setTimeRange] = useState('Year to Date');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const rangeQueryMap = {
    '7 Days': '7d',
    '30 Days': '30d',
    '6 Months': '6m',
    'Year to Date': 'ytd',
  };

  useEffect(() => {
    setLoading(true);
    const rangeParam = rangeQueryMap[timeRange] || 'ytd';
    apiFetch(`/doctors/me/analytics?range=${rangeParam}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [timeRange]);

  const monthlyTrend = useMemo(() => data?.monthlyTrend || [], [data]);
  const weeklyLoad = useMemo(() => data?.weeklyLoad || [], [data]);
  const ageDemographics = useMemo(() => data?.ageDemographics || [], [data]);
  
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
    
  const apptStatusData = useMemo(() => {
    if (!data?.appointmentStatusSplit) return [];
    return Object.entries(data.appointmentStatusSplit)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ 
        name: key, 
        value, 
        color: APPT_STATUS_COLORS[key] || '#6B46C1' 
      }));
  }, [data]);

  const topDiagnosesData = useMemo(() => {
    if (!data?.topDiagnoses || data.topDiagnoses.length === 0) return [];
    return data.topDiagnoses.map(d => ({
      subject: d.condition || 'General Consultation',
      A: d.count || 0,
    }));
  }, [data]);

  const completedPct = useMemo(() => {
    if (apptStatusData.length === 0) return 0;
    const completed = apptStatusData.find(s => s.name === 'Completed' || s.name === 'Done')?.value || 0;
    const total = apptStatusData.reduce((sum, s) => sum + s.value, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [apptStatusData]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Practice Growth &amp; Clinical Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time consultation volume, patient demographics, and completion metrics from database.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs">
          {['7 Days', '30 Days', '6 Months', 'Year to Date'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-white text-aubergine-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Level 1: Tier-1 KPI Cards (Real Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITrendCard
          title="Net Practice Earnings"
          value={data?.totalRevenue !== undefined ? formatCurrency(data.totalRevenue, userCurrency) : formatCurrency(0, userCurrency)}
          period={data?.grossBillings ? `Gross: ${formatCurrency(data.grossBillings, userCurrency)} (10% fee: ${formatCurrency(data.platformCommission || 0, userCurrency)})` : `${timeRange} Net Earned`}
          icon={['USD','CAD','AUD'].includes(userCurrency) ? 'fa-dollar-sign' : userCurrency === 'EUR' ? 'fa-euro-sign' : userCurrency === 'GBP' ? 'fa-sterling-sign' : userCurrency === 'INR' ? 'fa-indian-rupee-sign' : 'fa-money-bill-wave'}
          colorScheme="purple"
          loading={loading}
        />

        <KPITrendCard
          title="Completed Consultations"
          value={(data?.totalConsultations ?? 0).toLocaleString('en-IN')}
          period="Total Patient Sessions"
          icon="fa-hospital-user"
          colorScheme="magenta"
          loading={loading}
        />

        <KPITrendCard
          title="Active Patient Roster"
          value={(data?.totalPatients ?? 0).toLocaleString('en-IN')}
          period="Unique Enrolled Patients"
          icon="fa-user-plus"
          colorScheme="emerald"
          loading={loading}
        />

        <KPITrendCard
          title="No-Show Rate"
          value={`${data?.noShowRate ?? 0}%`}
          period="Target benchmark &lt; 5%"
          icon="fa-user-slash"
          colorScheme="emerald"
          badgeText="Live Metric"
          loading={loading}
        />
      </div>

      {/* Level 2: Composed Trend Chart (Revenue + Consultations) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <i className="fas fa-chart-area text-aubergine-600"></i> Revenue &amp; Consultation Volume Trajectory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Monthly billing volume correlated with completed patient sessions.</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            Live Trajectory
          </span>
        </div>

        {monthlyTrend.length === 0 ? (
          <DashboardEmptyState
            icon="fa-chart-area"
            title="No Monthly Practice History Yet"
            description="Completed consultations and monthly revenue will automatically graph here."
          />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDoctorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" {...standardXAxis} />
                <YAxis yAxisId="left" {...standardYAxis} tickFormatter={(val) => val >= 1000 ? `${getCurrencySymbol(userCurrency)}${(val/1000).toFixed(0)}k` : `${getCurrencySymbol(userCurrency)}${val}`} />
                <YAxis yAxisId="right" orientation="right" {...standardYAxis} allowDecimals={false} />
                <CartesianGrid {...standardCartesianGrid} />
                <Tooltip content={<ChartTooltip currency={userCurrency} />} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar yAxisId="right" dataKey="consultations" name="Consultations" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} opacity={0.6} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Net Revenue" stroke="#6B46C1" strokeWidth={3} fillOpacity={1} fill="url(#colorDoctorRevenue)" activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Level 3: Diagnoses Breakdown, Completion, and Modality Split */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Top Diagnoses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <i className="fas fa-stethoscope text-aubergine-600"></i> Clinical Diagnoses Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-4">Patient cases grouped by diagnosis reason.</p>

            {topDiagnosesData.length === 0 ? (
              <DashboardEmptyState
                icon="fa-stethoscope"
                title="No Diagnoses Recorded"
                description="Clinical diagnoses logged in consults will populate here."
              />
            ) : (
              <div className="space-y-3">
                {topDiagnosesData.map((d) => (
                  <div key={d.subject} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-700 truncate pr-2">{d.subject}</span>
                      <span className="font-mono text-slate-900">{d.A} cases</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-aubergine-600 rounded-full" 
                        style={{ width: `${Math.min(100, Math.round((d.A / Math.max(1, topDiagnosesData[0].A)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Appointment Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <i className="fas fa-calendar-check text-emerald-600"></i> Session Completion Rate
            </h2>
            <p className="text-xs text-slate-500 mb-4">Fulfilled vs cancelled sessions in practice schedule.</p>

            {apptStatusData.length === 0 ? (
              <DashboardEmptyState
                icon="fa-chart-pie"
                title="No Session Statuses"
                description="Status breakdown will compute from scheduled appointments."
              />
            ) : (
              <div className="h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={apptStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {apptStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip unit="Sessions" />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                  <span className="text-2xl font-black text-slate-800">{completedPct}%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Fulfilled</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modality Delivery Split */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              <i className="fas fa-video text-aubergine-600"></i> Consultation Modality
            </h2>
            <p className="text-xs text-slate-500 mb-4">WebRTC Video Consults vs In-Clinic Visits.</p>

            {consultTypeData.length === 0 ? (
              <DashboardEmptyState
                icon="fa-video"
                title="No Modalities Logged"
                description="Video vs clinic breakdown will graph as appointments occur."
              />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={consultTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {consultTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip unit="Consults" />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Age Demographics & Weekly Appointment Load */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
            <i className="fas fa-users text-aubergine-600"></i> Patient Age Demographics
          </h2>
          <p className="text-xs text-slate-500 mb-4">Distribution of patient roster by discrete age bracket.</p>
          {ageDemographics.length === 0 ? (
            <DashboardEmptyState
              icon="fa-users"
              title="No Demographic Data"
              description="Patient ages will aggregate here from patient records."
            />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageDemographics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid {...standardCartesianGrid} />
                  <XAxis dataKey="age" {...standardXAxis} />
                  <YAxis {...standardYAxis} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip unit="Patients" />} />
                  <Bar dataKey="count" name="Patients" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
            <i className="fas fa-calendar-week text-amber-500"></i> Weekly Consultation Load
          </h2>
          <p className="text-xs text-slate-500 mb-4">Distribution of appointments across days of the week.</p>
          {weeklyLoad.length === 0 ? (
            <DashboardEmptyState
              icon="fa-calendar-week"
              title="No Weekly Consultations"
              description="Appointments distribution across the week will display here."
            />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid {...standardCartesianGrid} />
                  <XAxis dataKey="day" {...standardXAxis} />
                  <YAxis {...standardYAxis} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip unit="Consults" />} />
                  <Bar dataKey="consultations" name="Consultations" fill="#6B46C1" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorAnalytics;
