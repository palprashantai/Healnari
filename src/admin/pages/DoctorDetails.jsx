import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiFetch } from '../../lib/apiClient.js';

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
  const toast = useToast();

  const [doctor, setDoctor] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [commission, setCommission] = useState(15);
  const [savingCommission, setSavingCommission] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiFetch(`/admin/clinics/${id}`)
      .then(d => {
        setDoctor(d.doctor);
        setKpis(d.kpis);
        setRevenueTrend(d.revenueTrend || []);
        setStatusBreakdown((d.appointmentStatusBreakdown || []).map(s => ({ ...s, name: s.status })));
        setLedger(d.ledger || []);
        setCommission(Number(d.doctor?.commission_rate ?? 15));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear Dr. [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Policy Update', text: 'Dear Dr. [Name], please review the updated payout policy in your dashboard.' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Missed Consult', text: 'Hi Dr. [Name], you have a missed consultation. Please check your app.' },
    { id: 't4', type: 'push', label: 'Push: Urgent Update', text: 'Critical platform update requires your attention.' },
  ];

  const handleAction = (action) => {
    toast(`Action "${action}" triggered for ${doctor?.full_name || 'this doctor'}.`, 'info');
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

  const totalGross = kpis?.totalGross || 0;
  const adminCommission = totalGross * (commission / 100);
  const doctorNet = totalGross - adminCommission;
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
            <button onClick={() => setActiveModal(activeModal === 'message-dropdown' ? null : 'message-dropdown')} className="bg-sky-50 text-sky-600 hover:bg-sky-100 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2">
              <i className="fas fa-envelope"></i> Message <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {activeModal === 'message-dropdown' && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                <button onClick={() => {setMessageType('email'); setActiveModal('message')}} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-envelope text-sky-500 w-4"></i> Send Email</button>
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
            <div className="flex justify-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${doctor.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {doctor.status || 'Active'}
              </span>
              {verified && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1">
                  <i className="fas fa-certificate"></i> Verified
                </span>
              )}
            </div>

            <div className="flex gap-2 mt-4 justify-center">
              <button onClick={() => {setMessageType('whatsapp'); setActiveModal('message')}} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-sm" title="WhatsApp Doctor">
                <i className="fab fa-whatsapp"></i>
              </button>
              <button onClick={() => {setMessageType('email'); setActiveModal('message')}} className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors shadow-sm" title="Email Doctor">
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
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Contract Terms</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-handshake w-5 text-aubergine-400"></i> {commission}% Platform Cut</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-calendar-check w-5 text-slate-400"></i> Joined: {joined}</p>
              </div>
            </div>
          </div>

          {/* Contract Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4"><i className="fas fa-sliders h-4 w-4 mr-1.5 text-aubergine-600"></i>Platform Commission Rate</h3>
            <div className="flex items-center gap-4">
              <input type="range" min="5" max="30" step="1" value={commission} onChange={(e) => setCommission(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-aubergine-600" />
              <span className="font-black text-xl text-slate-800 w-12 text-right">{commission}%</span>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-slate-500">Adjust the percentage cut taken from this doctor's gross billings.</p>
              <button onClick={handleSaveCommission} disabled={savingCommission} className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                {savingCommission ? 'Saving…' : 'Save Rate'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Ledger */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Gross Billing</p>
              <p className="text-2xl font-black text-slate-800">₹{totalGross.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">{kpis?.totalConsults || 0} Consults</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Doctor Net Payout</p>
              <p className="text-2xl font-black text-emerald-600">₹{doctorNet.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Lifetime</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Platform Earnings</p>
              <p className="text-2xl font-black text-white">₹{adminCommission.toLocaleString()}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">From {commission}% Cut</p>
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
                      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
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
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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
              <button onClick={() => handleAction('Export Ledger')} className="text-xs font-bold text-aubergine-600 hover:underline">
                <i className="fas fa-download mr-1"></i> Export CSV
              </button>
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
                    {ledger.map(b => {
                      const cut = b.amount * (commission / 100);
                      const docAmount = b.amount - cut;
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
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
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-sky-100"
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
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-100 outline-none"
            placeholder="Type your message here..."
          ></textarea>
          <button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()} className={`w-full text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${messageType === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-600 hover:bg-sky-700'}`}>
            <i className={`mr-2 ${sendingMessage ? 'fas fa-spinner fa-spin' : messageType === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-paper-plane'}`}></i> {sendingMessage ? 'Sending…' : `Send ${messageType.charAt(0).toUpperCase() + messageType.slice(1)}`}
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default AdminDoctorDetails;
