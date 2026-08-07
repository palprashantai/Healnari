import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function AdminDoctorDetails() {
  const { id } = useParams();
  const toast = useToast();

  // Mock doctor fetch based on ID
  const doctor = { 
    id: id, name: 'Dr. Sarah Mitchell', specialty: 'Gynaecologist', status: 'Active', verified: true, joined: '05 Jan 2026', commissionRate: 15, totalGross: 450000, totalConsults: 150, rating: 4.8,
    email: 'sarah.mitchell@healnari.app', phone: '+91 98765 00001',
    recentBookings: [
      { id: 'B-991', patient: 'Priya Sharma', date: '07 Aug 2026', gross: 3000, status: 'Completed' },
      { id: 'B-990', patient: 'Anita Desai', date: '06 Aug 2026', gross: 3000, status: 'Completed' },
      { id: 'B-989', patient: 'Sneha Patel', date: '06 Aug 2026', gross: 3000, status: 'Refunded' },
      { id: 'B-988', patient: 'Ananya Rao', date: '05 Aug 2026', gross: 2500, status: 'Completed' },
      { id: 'B-987', patient: 'Ritu Kapoor', date: '04 Aug 2026', gross: 3500, status: 'Completed' },
    ]
  };

  const REVENUE_DATA = [
    { month: 'Mar', revenue: 65000 },
    { month: 'Apr', revenue: 78000 },
    { month: 'May', revenue: 90000 },
    { month: 'Jun', revenue: 105000 },
    { month: 'Jul', revenue: 125000 },
    { month: 'Aug', revenue: 150000 },
  ];

  const [commission, setCommission] = useState(doctor.commissionRate);
  
  const [activeModal, setActiveModal] = useState(null);
  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear Dr. [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Policy Update', text: 'Dear Dr. [Name], please review the updated payout policy in your dashboard.' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Missed Consult', text: 'Hi Dr. [Name], you have a missed consultation. Please check your app.' },
    { id: 't4', type: 'push', label: 'Push: Urgent Update', text: 'Critical platform update requires your attention.' },
  ];

  const adminCommission = (doctor.totalGross * (commission / 100));
  const doctorNet = doctor.totalGross - adminCommission;

  const handleAction = (action) => {
    toast(`Action "${action}" triggered for ${doctor.name}.`, 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/admin-dashboard/doctors" className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Doctor Network
          </Link>
          <h1 className="text-2xl font-black text-slate-800">Doctor Profile: {doctor.name}</h1>
          <p className="text-sm text-slate-500">ID: {doctor.id} • {doctor.specialty}</p>
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
          {!doctor.verified && (
            <button onClick={() => handleAction('Review KYC')} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
              Review KYC Documents
            </button>
          )}
          <button onClick={() => handleAction(doctor.status === 'Active' ? 'Suspend' : 'Activate')} className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm text-white ${doctor.status === 'Active' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {doctor.status === 'Active' ? 'Suspend License' : 'Activate License'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-3xl font-black mx-auto mb-4 border-4 border-white shadow-md">
              {doctor.name.charAt(4)}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{doctor.name}</h2>
            <div className="flex justify-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${doctor.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {doctor.status}
              </span>
              {doctor.verified && (
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
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-envelope w-5 text-slate-400"></i> {doctor.email}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-phone w-5 text-slate-400"></i> {doctor.phone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Contract Terms</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-handshake w-5 text-aubergine-400"></i> {doctor.commissionRate}% Platform Cut</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-calendar-check w-5 text-slate-400"></i> Joined: {doctor.joined}</p>
              </div>
            </div>
          </div>

          {/* Contract Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4"><i className="fas fa-sliders h-4 w-4 mr-1.5 text-aubergine-600"></i>Platform Commission Rate</h3>
            <div className="flex items-center gap-4">
              <input type="range" min="5" max="30" step="1" value={commission} onChange={(e) => setCommission(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-aubergine-600" />
              <span className="font-black text-xl text-slate-800 w-12 text-right">{commission}%</span>
            </div>
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-slate-500">Adjust the percentage cut taken from this doctor's gross billings.</p>
              <button onClick={() => handleAction('Update Commission')} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
                Save Rate
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
              <p className="text-2xl font-black text-slate-800">₹{doctor.totalGross.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">{doctor.totalConsults} Consults</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Doctor Net Payout</p>
              <p className="text-2xl font-black text-emerald-600">₹{doctorNet.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Pending Transfer</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Platform Earnings</p>
              <p className="text-2xl font-black text-white">₹{adminCommission.toLocaleString()}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">From {doctor.commissionRate}% Cut</p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-64">
            <div className="mb-4">
              <h2 className="font-bold text-slate-800">Gross Revenue Trend (6 Months)</h2>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Booking Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Commission Ledger</h2>
              <button onClick={() => handleAction('Export Ledger')} className="text-xs font-bold text-aubergine-600 hover:underline">
                <i className="fas fa-download mr-1"></i> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Booking ID</th>
                    <th className="px-5 py-3 font-semibold">Patient & Date</th>
                    <th className="px-5 py-3 font-semibold text-right">Gross Paid</th>
                    <th className="px-5 py-3 font-semibold text-right">Doctor Cut</th>
                    <th className="px-5 py-3 font-semibold text-right text-aubergine-700">Platform Cut</th>
                    <th className="px-5 py-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {doctor.recentBookings.map(b => {
                    const cut = b.gross * (commission / 100);
                    const docAmount = b.gross - cut;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs text-slate-400">{b.id}</td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-700">{b.patient}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{b.date}</p>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-800">₹{b.gross}</td>
                        <td className="px-5 py-4 text-right font-semibold text-emerald-600">₹{docAmount}</td>
                        <td className="px-5 py-4 text-right font-black text-aubergine-700">₹{cut}</td>
                        <td className="px-5 py-4 text-right">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${b.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
      <Modal isOpen={activeModal === 'message'} onClose={() => {setActiveModal(null); setMessageText(''); setSelectedTemplate('');}} title={`Send ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} to ${doctor.name}`} size="md">
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
          <button onClick={() => { toast(`${messageType.toUpperCase()} sent!`, 'success'); setActiveModal(null); setMessageText(''); setSelectedTemplate(''); }} className={`w-full text-white font-bold py-3 rounded-xl transition-colors ${messageType === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-600 hover:bg-sky-700'}`}>
            <i className={`mr-2 ${messageType === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-paper-plane'}`}></i> Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default AdminDoctorDetails;
