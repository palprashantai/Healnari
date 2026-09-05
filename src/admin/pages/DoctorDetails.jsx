import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency, formatCompactCurrency } from '../../lib/currency.js';
import { ChartTooltip } from '../../components/charts/ChartTooltip.jsx';
import { standardCartesianGrid, standardXAxis, standardYAxis } from '../../components/charts/chartTheme.js';

const STATUS_COLORS = {
  Done: '#10b981',
  Upcoming: '#0ea5e9',
  Waiting: '#f59e0b',
  'In Progress': '#6366f1',
  'No Show': '#94a3b8',
  Cancelled: '#f43f5e',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />;
}

function EmptyChart({ label }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-slate-400">
      <i className="fas fa-chart-simple mr-2"></i>{label}
    </div>
  );
}

function AdminDoctorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [doctor, setDoctor] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [aiSubscription, setAiSubscription] = useState(null);
  const [aiPurchaseHistory, setAiPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [commission, setCommission] = useState(10);
  const [savingCommission, setSavingCommission] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedPlanToAssign, setSelectedPlanToAssign] = useState('doctor_plan_2');
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiFetch(`/admin/clinics/${id}`)
      .then(d => {
        setDoctor(d.doctor);
        setKpis(d.kpis);
        setRevenueTrend(d.revenueTrend || []);
        setStatusBreakdown((d.appointmentStatusBreakdown || []).map(s => ({ ...s, name: s.status })));
        setAiSubscription(d.aiSubscription || null);
        if (d.aiSubscription?.planId) {
          setSelectedPlanToAssign(d.aiSubscription.planId);
        }
        setAiPurchaseHistory(d.aiPurchaseHistory || []);
        setLedger(d.ledger || []);
        setPayouts(d.payouts || []);
        setCommission(10);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (doctor?.full_name) {
      const trimmed = doctor.full_name.trim();
      const label = trimmed.toLowerCase().startsWith('dr.') || trimmed.toLowerCase().startsWith('dr ')
        ? trimmed
        : `Dr. ${trimmed}`;
      window.dispatchEvent(new CustomEvent('set-breadcrumb', { detail: { id, label } }));
    }
  }, [id, doctor?.full_name]);

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear Dr. [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Policy Update', text: 'Dear Dr. [Name], please review the updated payout policy in your dashboard.' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Missed Consult', text: 'Hi Dr. [Name], you have a missed consultation. Please check your app.' },
    { id: 't4', type: 'push', label: 'Push: Urgent Update', text: 'Critical platform update requires your attention.' },
  ];

  const handleAction = (type) => {
    toast(`${type} action logged for audit.`, 'info');
  };

  const handleSaveAiPlan = async () => {
    setSavingPlan(true);
    try {
      const res = await apiFetch(`/admin/users/${id}/ai-plan`, {
        method: 'PUT',
        body: { planId: selectedPlanToAssign, resetCredits: true },
      });
      setAiSubscription(prev => ({
        ...(prev || {}),
        planId: res.planId,
        planName: res.planName,
        monthlyCredits: res.monthlyCredits,
        creditsUsed: res.creditsUsed,
        creditsRemaining: res.creditsRemaining,
        status: res.status,
      }));
      toast(`Successfully updated ${doctor?.full_name || 'doctor'}'s tier to ${res.planName}!`, 'success');
      setActiveModal(null);
    } catch (err) {
      toast(err.message || 'Failed to update physician AI plan', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = doctor.status === 'Suspended' ? 'Active' : 'Suspended';
    setUpdatingStatus(true);
    try {
      await apiFetch(`/admin/users/${doctor.id}/status`, { method: 'PUT', body: { status: newStatus } });
      setDoctor(prev => ({ ...prev, status: newStatus }));
      toast(`Dr. ${doctor.full_name} is now ${newStatus}.`, newStatus === 'Active' ? 'success' : 'warning');
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveCommission = async () => {
    setSavingCommission(true);
    try {
      await apiFetch(`/admin/clinics/${doctor.id}/commission`, { method: 'PUT', body: { commissionRate: commission } });
      toast('Commission rate updated.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update commission rate', 'error');
    } finally {
      setSavingCommission(false);
    }
  };

  const handleSendMessage = async () => {
    if (messageType !== 'push') {
      // No email/WhatsApp provider is wired up yet — be honest instead of
      // pretending this went out.
      toast(`${messageType.toUpperCase()} is not connected yet — nothing was actually sent.`, 'info');
      setActiveModal(null); setMessageText(''); setSelectedTemplate('');
      return;
    }
    setSendingMessage(true);
    try {
      await apiFetch('/admin/notify', {
        method: 'POST',
        body: { userId: doctor.id, title: 'Message from HealNari Admin', message: messageText },
      });
      toast('Push notification sent!', 'success');
      setActiveModal(null); setMessageText(''); setSelectedTemplate('');
    } catch (err) {
      toast(err.message || 'Failed to send push notification', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-1" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="text-center py-20 text-slate-400">
        <i className="fas fa-triangle-exclamation text-2xl mb-2 block"></i>
        Couldn't load this doctor's profile.
      </div>
    );
  }

  const totalGross = Number(kpis?.totalGross || 0);
  const adminCommission = Number(kpis?.totalPlatformFee || 0);
  const doctorNet = Number(kpis?.totalDoctorNet || (totalGross - adminCommission));
  const verified = !!doctor.kyc_verified;
  const joined = doctor.created_at ? new Date(doctor.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/admin-dashboard/doctors" className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Doctor Network
          </Link>
          <h1 className="text-2xl font-black text-slate-800">Doctor Profile: {doctor.full_name}</h1>
          <p className="text-sm text-slate-500">ID: {doctor.id} • {doctor.specialty || 'General'}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={() => setActiveModal(activeModal === 'message-dropdown' ? null : 'message-dropdown')} className="bg-aubergine-50 text-aubergine-700 hover:bg-aubergine-100 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2">
              <i className="fas fa-envelope"></i> Message <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {activeModal === 'message-dropdown' && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                <button onClick={() => {setMessageType('email'); setActiveModal('message')}} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-envelope text-aubergine-600 w-4"></i> Send Email</button>
                <button onClick={() => {setMessageType('push'); setActiveModal('message')}} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-bell text-amber-500 w-4"></i> Push Notification</button>
                <button onClick={() => {setMessageType('whatsapp'); setActiveModal('message')}} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fab fa-whatsapp text-emerald-500 w-4"></i> WhatsApp Message</button>
              </div>
            )}
          </div>
          {!verified && (
            <button onClick={() => handleAction('Review KYC')} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
              Review KYC Documents
            </button>
          )}
          <button onClick={handleToggleStatus} disabled={updatingStatus} className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm text-white disabled:opacity-50 ${doctor.status === 'Suspended' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {updatingStatus ? 'Updating…' : doctor.status === 'Suspended' ? 'Activate License' : 'Suspend License'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left Column: Profile & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-3xl font-black mx-auto mb-4 border-4 border-white shadow-md">
              {(doctor.full_name || 'D').charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{doctor.full_name}</h2>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${doctor.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {doctor.status || 'Active'}
              </span>
              {verified && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-aubergine-50 text-aubergine-700 border-aubergine-200 flex items-center gap-1">
                  <i className="fas fa-certificate"></i> Verified
                </span>
              )}
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                aiSubscription?.planId === 'doctor_plan_3'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : aiSubscription?.planId === 'doctor_plan_2'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <i className="fas fa-robot text-[9px]"></i> {aiSubscription?.planName || 'Doctor Starter'}
              </span>
            </div>

            <div className="flex gap-2 mt-4 justify-center">
              <button onClick={() => {setMessageType('whatsapp'); setActiveModal('message')}} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-sm" title="WhatsApp Doctor">
                <i className="fab fa-whatsapp"></i>
              </button>
              <button onClick={() => {setMessageType('email'); setActiveModal('message')}} className="w-10 h-10 rounded-full bg-aubergine-50 text-aubergine-700 hover:bg-aubergine-100 flex items-center justify-center transition-colors shadow-sm" title="Email Doctor">
                <i className="fas fa-envelope"></i>
              </button>
              <button onClick={() => {setMessageType('push'); setActiveModal('message')}} className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors shadow-sm" title="Push Notification">
                <i className="fas fa-bell"></i>
              </button>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 text-left">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Contact Information</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-envelope w-5 text-slate-400"></i> {doctor.email || '—'}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-phone w-5 text-slate-400"></i> {doctor.phone || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">AI Clinical Plan</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-robot w-5 text-aubergine-600"></i> {aiSubscription?.planName || 'Doctor Starter'}</p>
                <p className="text-xs text-slate-500 mt-0.5 ml-5">{aiSubscription?.creditsRemaining ?? 25} uses remaining this month</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Contract Terms</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-handshake w-5 text-aubergine-400"></i> 10% Global Platform Cut</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-calendar-check w-5 text-slate-400"></i> Joined: {joined}</p>
              </div>
            </div>
          </div>

          {/* Global Platform Commission Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-globe text-aubergine-600"></i> Platform Commission
              </h3>
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs px-2.5 py-1 rounded-full">
                Global Standard
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center my-3">
              <p className="text-3xl font-black text-slate-900 font-sans">{Number(doctor?.commission_rate) || 10}%</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Platform Take Rate</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              HealNari applies a centralized <strong>{Number(doctor?.commission_rate) || 10}% global platform fee</strong> across all network physicians. The doctor retains <strong>{100 - (Number(doctor?.commission_rate) || 10)}%</strong> of gross settled earnings.
            </p>
          </div>
        </div>

        {/* Right Column: Financials & Ledger */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Gross Billing</p>
              <p className="text-2xl font-black text-slate-800">₹{Math.round(totalGross).toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">{kpis?.totalConsults || kpis?.totalAppointments || 0} Consults</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Doctor Net Earned</p>
              <p className="text-2xl font-black text-emerald-600">{formatCurrency(doctorNet, doctor?.currency || 'INR')}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">{100 - (Number(doctor?.commission_rate) || 10)}% Net Share</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Platform Earnings</p>
              <p className="text-2xl font-black text-white">{formatCurrency(adminCommission, doctor?.currency || 'INR')}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">From {Number(doctor?.commission_rate) || 10}% Global Platform Fee</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-4">Gross Revenue Trend (6 Months)</h2>
              {revenueTrend.some(r => r.revenue > 0) ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...standardCartesianGrid} />
                      <XAxis dataKey="month" {...standardXAxis} />
                      <YAxis {...standardYAxis} tickFormatter={(v) => formatCompactCurrency(v, doctor?.currency || 'INR')} />
                      <Tooltip content={<ChartTooltip currency={doctor?.currency || 'INR'} />} />
                      <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart label="No paid revenue in the last 6 months." />}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-4">Appointment Status Breakdown</h2>
              {statusBreakdown.length ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="count" stroke="none">
                        {statusBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip unit="Sessions" />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart label="No appointments booked yet." />}
            </div>
          </div>

          {/* Payment Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Commission Ledger</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => handleAction('Export Ledger')} className="text-xs font-bold text-aubergine-600 hover:underline">
                  <i className="fas fa-download mr-1"></i> Export CSV
                </button>
                <Link to={`/admin-dashboard/doctors/${id}/ledger`} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                  View All <i className="fas fa-chevron-right ml-1 text-[10px]"></i>
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              {ledger.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold">No payments recorded for this doctor yet.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3 font-semibold">Patient & Date</th>
                      <th className="px-5 py-3 font-semibold">Service</th>
                      <th className="px-5 py-3 font-semibold text-right">Gross Paid</th>
                      <th className="px-5 py-3 font-semibold text-right">Doctor Cut</th>
                      <th className="px-5 py-3 font-semibold text-right text-aubergine-700">Platform Cut</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ledger.slice(0, 5).map(b => {
                      const cut = b.platformFee || 0;
                      const docAmount = b.doctorNet || b.amount;
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin-dashboard/doctors/${id}/ledger/${b.id}`)}>
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-700">{b.patient}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{b.date}</p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{b.service || '—'}</td>
                          <td className="px-5 py-4 text-right font-bold text-slate-800">₹{b.amount.toLocaleString()}</td>
                          <td className="px-5 py-4 text-right font-semibold text-emerald-600">₹{docAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-5 py-4 text-right font-black text-aubergine-700">₹{cut.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-5 py-4 text-right">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Payouts & Withdrawal History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Payout &amp; Withdrawal History</h2>
              <Link to={`/admin-dashboard/doctors/${id}/payouts`} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                View All <i className="fas fa-chevron-right ml-1 text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto flex-1">
              {payouts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold">No payouts requested yet.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3 font-semibold">Date Requested</th>
                      <th className="px-5 py-3 font-semibold">Method</th>
                      <th className="px-5 py-3 font-semibold">Destination Details</th>
                      <th className="px-5 py-3 font-semibold text-right">Amount</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payouts.slice(0, 5).map(p => {
                      const date = p.requested_at || p.created_at;
                      const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin-dashboard/doctors/${id}/payouts/${p.id}`)}>
                          <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{formattedDate}</td>
                          <td className="px-5 py-4 text-slate-600 font-medium">{p.method || 'Bank Account'}</td>
                          <td className="px-5 py-4 text-slate-600 font-medium truncate max-w-[200px]" title={JSON.stringify(p.destination_details)}>
                            {p.destination_details?.account_holder || '—'}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-slate-900">
                            {p.amount ? `₹${p.amount.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border capitalize ${
                              p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              p.status === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {p.status || 'Processing'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* AI Clinical Plan & Subscription History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-aubergine-50/50 to-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-aubergine-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <i className="fas fa-robot text-sm"></i>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">AI Clinical Assistant Plan &amp; Purchase History</h2>
                  <p className="text-xs text-slate-500">Track active tier, clinical consultation quota, and purchase receipts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                  aiSubscription?.planId === 'doctor_plan_3'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : aiSubscription?.planId === 'doctor_plan_2'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {aiSubscription?.planName || 'Doctor Starter'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  {aiSubscription?.status || 'Active'}
                </span>
                <button
                  onClick={() => setActiveModal('ai-plan')}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-xs px-3 py-1 rounded-xl transition-all shadow-xs flex items-center gap-1.5 ml-2"
                >
                  <i className="fas fa-sliders text-[10px]"></i> Change Tier
                </button>
              </div>
            </div>

            {/* Quota & Plan Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Active Plan Tier</p>
                <p className="text-lg font-black text-slate-800">{aiSubscription?.planName || 'Doctor Starter'}</p>
                <p className="text-[11px] text-slate-500 mt-1">Billing Cycle: {aiSubscription?.billingCycle || 'Monthly'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Monthly Uses Quota</p>
                <p className="text-lg font-black text-aubergine-700">
                  {aiSubscription?.creditsRemaining ?? 25} <span className="text-xs text-slate-400 font-normal">/ {aiSubscription?.monthlyCredits || 25} left</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Consumed: {aiSubscription?.creditsUsed || 0} uses this month</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Plan Validity</p>
                <p className="text-lg font-black text-slate-800">
                  {aiSubscription?.renewalDate ? new Date(aiSubscription.renewalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Continuous (Free Tier)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Plan: {aiSubscription?.isPremium ? 'Prepaid (30 Days)' : 'Standard Free'}</p>
              </div>
            </div>

            {/* AI Purchase History Table */}
            <div className="overflow-x-auto">
              {!aiPurchaseHistory || aiPurchaseHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-xs">
                  No paid AI plan purchases recorded yet. Doctor is currently on the default starter tier.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/70">
                      <th className="px-5 py-3 font-semibold">Purchase Date</th>
                      <th className="px-5 py-3 font-semibold">Plan Purchased</th>
                      <th className="px-5 py-3 font-semibold text-right">Amount Paid</th>
                      <th className="px-5 py-3 font-semibold">Gateway</th>
                      <th className="px-5 py-3 font-semibold">Reference ID</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {aiPurchaseHistory.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                          {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                          {t.planName}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-right font-black text-emerald-600">
                          {t.currency === 'USD' ? '$' : '₹'}{t.finalAmount?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                          {t.gateway}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-slate-500">
                          {t.gatewayTxnId || t.id.slice(0, 10)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
      <Modal isOpen={activeModal === 'message'} onClose={() => {setActiveModal(null); setMessageText(''); setSelectedTemplate('');}} title={`Send ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} to ${doctor.full_name}`} size="md">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Template</label>
            <select
              value={selectedTemplate}
              onChange={e => {
                setSelectedTemplate(e.target.value);
                const tmpl = TEMPLATES.find(t => t.id === e.target.value);
                if (tmpl) setMessageText(tmpl.text);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-200"
            >
              <option value="">-- Custom Message --</option>
              {TEMPLATES.filter(t => t.type === messageType).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            rows="5"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-aubergine-200 outline-none"
            placeholder="Type your message here..."
          ></textarea>
          <button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()} className={`w-full text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${messageType === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' : 'crm-btn-primary'}`}>
            <i className={`mr-2 ${sendingMessage ? 'fas fa-spinner fa-spin' : messageType === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-paper-plane'}`}></i> {sendingMessage ? 'Sending…' : `Send ${messageType.charAt(0).toUpperCase() + messageType.slice(1)}`}
          </button>
        </div>
      </Modal>

      {/* Change AI Plan Modal */}
      <Modal isOpen={activeModal === 'ai-plan'} onClose={() => setActiveModal(null)} title={`Assign / Update AI Plan for ${doctor?.full_name || 'Physician'}`} size="md">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Select the canonical physician plan tier to assign. Quotas and feature entitlements will activate immediately in the doctor's portal.
          </p>

          <div className="space-y-3">
            {[
              { id: 'doctor_plan_1', name: 'Doctor Plan 1 (Doctor Starter)', credits: 25, price: 'Included', desc: 'Basic clinical queries & chat companion' },
              { id: 'doctor_plan_2', name: 'Doctor Plan 2 (Doctor Pro)', credits: 100, price: '₹1,499 / $19/mo', desc: 'Pre-consult briefs, patient history & consult summaries' },
              { id: 'doctor_plan_3', name: 'Doctor Plan 3 (Doctor Premium)', credits: 300, price: '₹2,999 / $39/mo', desc: 'Automated SOAP notes, Rx autocomplete & full clinical support' },
            ].map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPlanToAssign(p.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPlanToAssign === p.id
                    ? 'border-aubergine-600 bg-aubergine-50/50 ring-2 ring-aubergine-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-slate-800">{p.name}</span>
                  <span className="text-xs font-black text-emerald-700">{p.price}</span>
                </div>
                <p className="text-xs text-slate-500">{p.desc}</p>
                <p className="text-[11px] font-bold text-aubergine-700 mt-1">Monthly Quota: {p.credits} uses</p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAiPlan}
              disabled={savingPlan}
              className="flex-1 bg-slate-900 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingPlan ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>} Assign Plan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminDoctorDetails;
