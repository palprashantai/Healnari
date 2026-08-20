import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { apiFetch } from '../../lib/apiClient.js';

const CATEGORY_COLORS = ['#0284c7', '#6B46C1', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

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

function AdminPatientDetails() {
  const { id } = useParams();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [spendingByCategory, setSpendingByCategory] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Active');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [activeModal, setActiveModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiFetch(`/admin/users/${id}`)
      .then(d => {
        setProfile(d.profile);
        setKpis(d.kpis);
        setSpendingTrend(d.spendingTrend || []);
        setSpendingByCategory((d.spendingByCategory || []).map(c => ({ ...c, name: c.category, value: c.amount })));
        setConsultations(d.consultations || []);
        setPayments(d.payments || []);
        setStatus(d.profile?.status || 'Active');
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Health Camp Invite', text: 'Hello [Name], join our upcoming free health camp this weekend!' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Reminder', text: 'Hi [Name], this is a reminder for your upcoming consultation.' },
    { id: 't4', type: 'push', label: 'Push: Promo Offer', text: 'Get 20% off your next consultation if booked today!' },
  ];

  const handleAction = (action) => {
    toast(`Action "${action}" triggered for ${profile?.full_name || 'this patient'}.`, 'info');
  };

  const handleToggleStatus = async () => {
    const newStatus = status === 'Active' ? 'Suspended' : 'Active';
    setUpdatingStatus(true);
    try {
      await apiFetch(`/admin/users/${profile.id}/status`, { method: 'PUT', body: { status: newStatus } });
      setStatus(newStatus);
      toast(`Account ${newStatus.toLowerCase()}.`, 'success');
      setActiveModal(null);
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendMessage = async () => {
    if (messageType !== 'push') {
      toast(`${messageType.toUpperCase()} is not connected yet — nothing was actually sent.`, 'info');
      setActiveModal(null); setMessageText(''); setSelectedTemplate('');
      return;
    }
    setSendingMessage(true);
    try {
      await apiFetch('/admin/notify', {
        method: 'POST',
        body: { userId: profile.id, title: 'Message from HealNari Admin', message: messageText },
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
          <Skeleton className="h-80 lg:col-span-1" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20 text-slate-400">
        <i className="fas fa-triangle-exclamation text-2xl mb-2 block"></i>
        Couldn't load this patient's file.
      </div>
    );
  }

  const joined = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/admin-dashboard/users" className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Patients
          </Link>
          <h1 className="text-2xl font-black text-slate-800">Patient File: {profile.full_name}</h1>
          <p className="text-sm text-slate-500">ID: {profile.id} • Joined {joined}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setActiveModal('password')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
            Reset Password
          </button>
          <button onClick={() => setActiveModal('suspend')} className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm text-white ${status === 'Active' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {status === 'Active' ? 'Suspend Account' : 'Activate Account'}
          </button>
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
          <button onClick={() => setActiveModal('billing')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm hidden sm:block">
            Billing History
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left Column: Profile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-3xl font-black mx-auto mb-4 border-4 border-white shadow-md">
              {(profile.full_name || 'P').charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{profile.full_name}</h2>
            <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full border ${status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {status}
            </span>

            <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 text-left">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Contact Information</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-envelope w-5 text-slate-400"></i> {profile.email || '—'}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-phone w-5 text-slate-400"></i> {profile.phone || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Activity */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Lifetime Value</p>
              <p className="text-2xl font-black text-emerald-700">₹{(kpis?.lifetimeValue || 0).toLocaleString()}</p>
              <p className="text-xs text-emerald-600 font-bold mt-1">Total Paid</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Consultations</p>
              <p className="text-2xl font-black text-slate-800">{kpis?.consultationsCompleted || 0}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Completed</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Bookings</p>
              <p className="text-2xl font-black text-aubergine-700">{consultations.length}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">All Time</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-4">Spending Trend (6 Months)</h2>
              {spendingTrend.some(s => s.spent > 0) ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spendingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6B46C1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6B46C1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Spent']} />
                      <Area type="monotone" dataKey="spent" stroke="#6B46C1" strokeWidth={3} fillOpacity={1} fill="url(#colorSpent)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart label="No paid spending in the last 6 months." />}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-4">Spending by Category</h2>
              {spendingByCategory.length ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                        {spendingByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyChart label="No paid spending recorded yet." />}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Recent Consultations</h2>
              <button onClick={() => setActiveModal('consultations')} className="text-xs font-bold text-aubergine-600 hover:underline">View All</button>
            </div>
            <div className="divide-y divide-slate-50 flex-1">
              {consultations.slice(0, 5).map(c => (
                <div key={c.id} className="p-6 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${c.type === 'Video' ? 'bg-aubergine-600' : 'bg-magenta-600'}`}>
                      <i className={`fas ${c.type === 'Video' ? 'fa-video' : 'fa-hospital'}`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{c.doctor} <span className="text-xs font-normal text-slate-500 ml-1">({c.specialty})</span></h3>
                      <p className="text-xs text-slate-500 mt-1">{c.date} • {c.type} Consult</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded border ${c.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{c.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-black text-slate-800">₹{c.cost.toLocaleString()}</span>
                    <button onClick={() => { setSelectedInvoice(c); setActiveModal('invoice'); }} className="text-xs text-aubergine-600 hover:text-aubergine-700 font-bold flex items-center gap-1 transition-colors">
                      <i className="fas fa-file-invoice"></i> Invoice
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono mt-2">{c.id.slice(0, 8)}</p>
                  </div>
                </div>
              ))}
              {consultations.length === 0 && (
                <div className="p-10 text-center text-slate-400 font-bold">No recent consultations.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal isOpen={activeModal === 'password'} onClose={() => setActiveModal(null)} onConfirm={() => { toast('Password reset link sent to patient.', 'success'); setActiveModal(null); }} title="Reset Password" message={`Send a password reset link to ${profile.email}?`} confirmLabel="Send Link" confirmStyle="primary" />

      <ConfirmModal isOpen={activeModal === 'suspend'} onClose={() => setActiveModal(null)} onConfirm={handleToggleStatus} title={status === 'Active' ? 'Suspend Account' : 'Activate Account'} message={`Are you sure you want to ${status === 'Active' ? 'suspend' : 'activate'} this patient account?`} confirmLabel={updatingStatus ? 'Working…' : status === 'Active' ? 'Suspend' : 'Activate'} confirmStyle={status === 'Active' ? 'danger' : 'success'} />

      <Modal isOpen={activeModal === 'message'} onClose={() => {setActiveModal(null); setMessageText(''); setSelectedTemplate('');}} title={`Send ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} to ${profile.full_name}`} size="md">
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

      <Modal isOpen={activeModal === 'billing'} onClose={() => setActiveModal(null)} title="Full Billing History" size="lg">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500">Complete record of all transactions for this patient.</p>
          {payments.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
              <i className="fas fa-file-invoice-dollar text-3xl text-slate-300 mb-2 block"></i>
              <p className="text-sm font-bold text-slate-600">No transactions yet.</p>
            </div>
          ) : payments.map(p => (
            <div key={p.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-3">
              <div>
                <p className="text-sm font-bold text-slate-700">{p.service || p.category || 'Payment'}</p>
                <p className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">₹{Number(p.amount).toLocaleString()}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.status}</span>
              </div>
            </div>
          ))}
          <button onClick={() => { toast('Exporting all records...', 'info'); setActiveModal(null); }} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors"><i className="fas fa-download mr-2"></i>Export to CSV</button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'consultations'} onClose={() => setActiveModal(null)} title="All Consultations" size="lg">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500">Complete consultation history ({consultations.length} total).</p>
          {consultations.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
              <i className="fas fa-notes-medical text-3xl text-slate-300 mb-2 block"></i>
              <p className="text-sm font-bold text-slate-600">No consultations found.</p>
            </div>
          ) : consultations.map(c => (
            <div key={c.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-3">
              <div>
                <p className="text-sm font-bold text-slate-700">{c.doctor} <span className="text-xs font-normal text-slate-500">({c.specialty})</span></p>
                <p className="text-[10px] text-slate-400">{c.date} • {c.type}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${c.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'invoice'} onClose={() => setActiveModal(null)} title={`Invoice ${selectedInvoice?.id?.slice(0, 8) || ''}`} size="md">
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-xl p-6 text-center border border-emerald-100">
             <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">{selectedInvoice?.status === 'Done' ? 'Paid in Full' : selectedInvoice?.status}</p>
             <p className="text-4xl font-black text-emerald-800">₹{selectedInvoice?.cost?.toLocaleString()}</p>
             <p className="text-sm text-emerald-700 mt-2">{selectedInvoice?.doctor} • {selectedInvoice?.date}</p>
          </div>
          <button onClick={() => { toast('Downloading PDF...', 'success'); setActiveModal(null); }} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors"><i className="fas fa-file-pdf mr-2"></i>Download PDF</button>
        </div>
      </Modal>

    </div>
  );
}

export default AdminPatientDetails;
