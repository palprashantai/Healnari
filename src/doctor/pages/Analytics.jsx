import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, ComposedChart } from 'recharts';
import { apiFetch } from '../../lib/apiClient.js';

const CONSULT_TYPE_COLORS = { video: '#6366f1', clinic: '#10b981' };
const CONSULT_TYPE_LABELS = { video: 'Video Consults', clinic: 'Clinic Visits' };
const APPT_STATUS_COLORS = { Completed: '#8B5CF6', Scheduled: '#38BDF8', Cancelled: '#FB7185', NoShow: '#94a3b8' };
const PAYMENT_COLORS = { UPI: '#6366F1', Card: '#14B8A6', Cash: '#F59E0B' };

function EmptyChart({ label }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center m-3 z-10 bg-slate-50/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-slate-200">
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 text-slate-300">
        <i className="fas fa-chart-pie text-lg"></i>
      </div>
      <p className="font-bold text-slate-600 text-sm">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">Data will appear here soon.</p>
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

  // Use REAL DATA from backend
  const monthlyTrend = data?.monthlyTrend || [];
  const weeklyLoad = data?.weeklyLoad || [];
  const ageDemographics = data?.ageDemographics || [];
  
  const consultTypeData = data
    ? Object.entries(data.consultTypeSplit || {})
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({ name: CONSULT_TYPE_LABELS[key] || key, value, color: CONSULT_TYPE_COLORS[key] || '#94a3b8' }))
    : [];
    
  const apptStatusData = data
    ? Object.entries(data.appointmentStatusSplit || {})
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({ name: key, value, color: APPT_STATUS_COLORS[key] || '#94a3b8' }))
    : [];

  const paymentData = data
    ? Object.entries(data.paymentMethodSplit || {})
        .filter(([, value]) => value > 0)
        .map(([key, value]) => ({ name: key, value, color: PAYMENT_COLORS[key] || '#94a3b8' }))
    : [];

  const topDiagnosesMax = data?.topDiagnoses?.length ? Math.max(...data.topDiagnoses.map((d) => d.count)) : 0;
  const topDiagnosesData = (data?.topDiagnoses || []).map((d) => ({ subject: d.condition, A: d.count, fullMark: Math.max(topDiagnosesMax, 1) }));

  const hasConsults = data?.totalConsultations > 0;
  const hasRevenue = data?.totalRevenue > 0;

  const kpis = data ? [
    { title: 'Total Revenue', value: `₹${data.totalRevenue.toLocaleString('en-IN')}`, icon: 'fa-indian-rupee-sign', color: 'text-aubergine-600', bg: 'bg-aubergine-50' },
    { title: 'Consultations', value: data.totalConsultations.toLocaleString('en-IN'), icon: 'fa-users', color: 'text-sky-600', bg: 'bg-sky-50' },
    { title: 'Total Patients', value: data.totalPatients.toLocaleString('en-IN'), icon: 'fa-user-plus', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'No-Show Rate', value: `${data.noShowRate}%`, icon: 'fa-user-slash', color: 'text-rose-600', bg: 'bg-rose-50' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Analytics & Growth</h1>
          <p className="text-sm text-slate-500">Live data from your practice revenue and clinical metrics.</p>
        </div>
        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-sm backdrop-blur-sm">
          {['7 Days', '30 Days', '6 Months', 'Year to Date'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === range
                  ? 'bg-white text-aubergine-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => (
          <div key={kpi.title} className="relative group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between z-10">
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${kpi.bg.replace('50', '200')} -z-10`}></div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <i className={`fas ${kpi.icon} text-lg`}></i>
                </div>
                <div className="bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 px-2 py-1 rounded-md uppercase tracking-wider">
                  {idx === 3 ? 'Metric' : 'YTD'}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.title}</p>
              <p className="text-3xl font-black text-slate-800 tabular-nums tracking-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 1. Revenue & Consultation Trend (Composed Chart) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 group relative">
        <h2 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
          <i className="fas fa-chart-area text-aubergine-600"></i> Revenue & Consultation Trend
        </h2>
        <div className="h-[300px] w-full relative">
          {!hasRevenue ? (
            <EmptyChart label="No revenue recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} minTickGap={20} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => val >= 1000 ? `₹${(val/1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `₹${val}`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                <Bar yAxisId="right" dataKey="consultations" name="Consultations" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.3} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#6B46C1" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: '#6B46C1' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* 2. Top Diagnoses (Horizontal Bar) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">
          <h2 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fas fa-stethoscope text-rose-500"></i> Top Diagnoses</h2>
          <p className="text-xs text-slate-500 mb-6">Conditions treated most.</p>
          <div className="flex-1 min-h-[220px] relative">
            {topDiagnosesData.length === 0 ? (
              <EmptyChart label="No diagnoses recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDiagnosesData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid horizontal={true} vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} width={90} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#d946ef', fontWeight: 'bold' }} />
                  <Bar dataKey="A" name="Cases" fill="#d946ef" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 3. NEW: Appointment Status (Donut) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">
          <h2 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fas fa-calendar-check text-blue-500"></i> Appt. Status</h2>
          <p className="text-xs text-slate-500 mb-6">Completion vs Cancellations.</p>
          <div className="flex-1 min-h-[220px] relative">
            {apptStatusData.length === 0 ? (
              <EmptyChart label="No appointments booked." />
            ) : (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 mt-1">
                  <span className="text-3xl font-black text-slate-700 tracking-tight">{data.totalConsultations}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={apptStatusData} cx="50%" cy="50%" innerRadius={75} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}>
                      {apptStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip cursor={false} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        {/* 4. NEW: Revenue by Payment Method (Pie) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">
          <h2 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fas fa-wallet text-amber-500"></i> Payment Methods</h2>
          <p className="text-xs text-slate-500 mb-6">Revenue split by payment type.</p>
          <div className="flex-1 min-h-[220px] relative">
            {paymentData.length === 0 ? (
              <EmptyChart label="No payments collected." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}>
                    {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip cursor={false} formatter={(value) => `₹${value.toLocaleString('en-IN')}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* 5. Age Demographics (Area Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">
          <h2 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fas fa-users-viewfinder text-teal-500"></i> Patient Age Demographics</h2>
          <p className="text-xs text-slate-500 mb-6">Distribution of your active patient base by age group.</p>
          <div className="flex-1 min-h-[250px] relative">
            {ageDemographics.every(d => d.count === 0) ? (
              <EmptyChart label="No patient data." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ageDemographics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip cursor={{ stroke: '#99f6e4', strokeWidth: 2, strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#14b8a6', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="count" name="Patients" stroke="#14b8a6" strokeWidth={4} fillOpacity={1} fill="url(#colorAge)" activeDot={{ r: 6, strokeWidth: 0, fill: '#14b8a6' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 6. Weekly Appointment Load (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative">
          <h2 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fas fa-calendar-week text-amber-500"></i> Weekly Appointment Load</h2>
          <p className="text-xs text-slate-500 mb-6">Your busiest days of the week based on scheduled visits.</p>
          <div className="flex-1 min-h-[250px] relative">
            {weeklyLoad.length === 0 || weeklyLoad.every(d => d.consultations === 0) ? (
              <EmptyChart label="No schedules recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#D946EF" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f8fafc" strokeDasharray="3 3" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#8B5CF6', fontWeight: 'bold' }} />
                  <Bar dataKey="consultations" name="Consultations" fill="url(#colorBar)" radius={[6, 6, 6, 6]} maxBarSize={32} background={{ fill: '#f1f5f9', radius: [6,6,6,6] }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default DoctorAnalytics;
