import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function AdminPatientDetails() {
  const { id } = useParams();
  const toast = useToast();

  const [patient, setPatient] = useState({ 
    id: id, name: 'Priya Sharma', role: 'Patient', email: 'priya@example.com', phone: '+91 98765 43210', status: 'Active', joined: '12 Jan 2026',
    address: '123 Palm Avenue, Mumbai', dob: '14 May 1992', gender: 'Female', bloodGroup: 'O+',
    recentConsultations: [
      { id: 'C-201', doctor: 'Dr. Sarah Mitchell', specialty: 'Gynaecologist', date: '07 Aug 2026', type: 'Video', status: 'Completed', cost: 1500 },
      { id: 'C-200', doctor: 'Dr. Amit Patel', specialty: 'Endocrinologist', date: '15 Jul 2026', type: 'Chat', status: 'Completed', cost: 800 },
    ],
    packages: [
      { id: 'PKG-1', name: 'Premium Wellness Plan', expires: '12 Dec 2026', status: 'Active' }
    ]
  });

  const SPENDING_DATA = [
    { month: 'Mar', spent: 0 },
    { month: 'Apr', spent: 1500 },
    { month: 'May', spent: 800 },
    { month: 'Jun', spent: 0 },
    { month: 'Jul', spent: 2300 },
    { month: 'Aug', spent: 1500 },
  ];

  const [activeModal, setActiveModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageText, setMessageText] = useState('');

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Health Camp Invite', text: 'Hello [Name], join our upcoming free health camp this weekend!' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Reminder', text: 'Hi [Name], this is a reminder for your upcoming consultation.' },
    { id: 't4', type: 'push', label: 'Push: Promo Offer', text: 'Get 20% off your next consultation if booked today!' },
  ];

  const handleAction = (action) => {
    toast(`Action "${action}" triggered for ${patient.name}.`, 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link to="/admin-dashboard/users" className="text-sm font-bold text-slate-400 hover:text-aubergine-600 transition-colors flex items-center gap-2 mb-2">
            <i className="fas fa-arrow-left"></i> Back to Patients
          </Link>
          <h1 className="text-2xl font-black text-slate-800">Patient File: {patient.name}</h1>
          <p className="text-sm text-slate-500">ID: {patient.id} • Joined {patient.joined}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveModal('password')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
            Reset Password
          </button>
          <button onClick={() => setActiveModal('suspend')} className={`font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm text-white ${patient.status === 'Active' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {patient.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
          </button>
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
          <button onClick={() => setActiveModal('billing')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm hidden sm:block">
            Billing History
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-3xl font-black mx-auto mb-4 border-4 border-white shadow-md">
              {patient.name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{patient.name}</h2>
            <span className="inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              {patient.status}
            </span>
            
            <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 text-left">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Contact Information</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-envelope w-5 text-slate-400"></i> {patient.email}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-phone w-5 text-slate-400"></i> {patient.phone}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-location-dot w-5 text-slate-400"></i> {patient.address}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Demographics</p>
                <p className="text-sm font-semibold text-slate-700"><i className="fas fa-calendar w-5 text-slate-400"></i> DOB: {patient.dob}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1"><i className="fas fa-droplet w-5 text-rose-400"></i> Blood: {patient.bloodGroup}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Medical History & Activity */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Lifetime Value</p>
              <p className="text-2xl font-black text-emerald-700">₹6,100</p>
              <p className="text-xs text-emerald-600 font-bold mt-1">Total Spent</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Consultations</p>
              <p className="text-2xl font-black text-slate-800">12</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Completed</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Health Score</p>
              <p className="text-2xl font-black text-sky-600">84/100</p>
              <p className="text-xs text-slate-500 font-bold mt-1">Improving</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Spending Trend Graph */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-64 flex flex-col">
              <div className="mb-4">
                <h2 className="font-bold text-slate-800">Engagement & Spending (6 Months)</h2>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SPENDING_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="spent" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorSpent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subscriptions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h2 className="font-bold text-slate-800 mb-4">Active Health Packages</h2>
              <div className="flex-1 flex flex-col gap-3">
                {patient.packages.map(pkg => (
                  <div key={pkg.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col h-full justify-center text-center group hover:bg-slate-50 transition-colors">
                    <i className="fas fa-box-heart text-2xl text-rose-400 mb-2"></i>
                    <h3 className="font-bold text-slate-800 text-sm">{pkg.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">Expires: {pkg.expires}</p>
                    <span className="inline-block mx-auto mt-2 text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">{pkg.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Recent Consultations</h2>
              <button onClick={() => setActiveModal('consultations')} className="text-xs font-bold text-aubergine-600 hover:underline">View All</button>
            </div>
            <div className="divide-y divide-slate-50 flex-1">
              {patient.recentConsultations.map(c => (
                <div key={c.id} className="p-6 hover:bg-slate-50 transition-colors flex justify-between items-center">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${c.type === 'Video' ? 'bg-emerald-500' : 'bg-sky-500'}`}>
                      <i className={`fas ${c.type === 'Video' ? 'fa-video' : 'fa-comment-alt'}`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{c.doctor} <span className="text-xs font-normal text-slate-500 ml-1">({c.specialty})</span></h3>
                      <p className="text-xs text-slate-500 mt-1">{c.date} • {c.type} Consult</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded border ${c.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{c.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-black text-slate-800">₹{c.cost.toLocaleString()}</span>
                    <button onClick={() => { setSelectedInvoice(c); setActiveModal('invoice'); }} className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 transition-colors">
                      <i className="fas fa-file-invoice"></i> Invoice
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono mt-2">{c.id}</p>
                  </div>
                </div>
              ))}
              {patient.recentConsultations.length === 0 && (
                <div className="p-10 text-center text-slate-400 font-bold">No recent consultations.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal isOpen={activeModal === 'password'} onClose={() => setActiveModal(null)} onConfirm={() => { toast('Password reset link sent to patient.', 'success'); setActiveModal(null); }} title="Reset Password" message={`Send a password reset link to ${patient.email}?`} confirmLabel="Send Link" confirmStyle="primary" />
      
      <ConfirmModal isOpen={activeModal === 'suspend'} onClose={() => setActiveModal(null)} onConfirm={() => { 
        const newStatus = patient.status === 'Active' ? 'Suspended' : 'Active';
        setPatient(prev => ({ ...prev, status: newStatus }));
        toast(`Account ${newStatus.toLowerCase()}.`, 'success'); 
        setActiveModal(null); 
      }} title={patient.status === 'Active' ? 'Suspend Account' : 'Activate Account'} message={`Are you sure you want to ${patient.status === 'Active' ? 'suspend' : 'activate'} this patient account?`} confirmLabel={patient.status === 'Active' ? 'Suspend' : 'Activate'} confirmStyle={patient.status === 'Active' ? 'danger' : 'success'} />

      <Modal isOpen={activeModal === 'message'} onClose={() => {setActiveModal(null); setMessageText(''); setSelectedTemplate('');}} title={`Send ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} to ${patient.name}`} size="md">
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

      <Modal isOpen={activeModal === 'billing'} onClose={() => setActiveModal(null)} title="Full Billing History" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Complete record of all transactions for this patient.</p>
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
             <i className="fas fa-file-invoice-dollar text-3xl text-slate-300 mb-2 block"></i>
             <p className="text-sm font-bold text-slate-600">Showing 24 past invoices</p>
          </div>
          <button onClick={() => { toast('Exporting all records...', 'info'); setActiveModal(null); }} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors"><i className="fas fa-download mr-2"></i>Export to CSV</button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'consultations'} onClose={() => setActiveModal(null)} title="All Consultations" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Complete medical consultation history.</p>
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
             <i className="fas fa-notes-medical text-3xl text-slate-300 mb-2 block"></i>
             <p className="text-sm font-bold text-slate-600">12 total consultations found.</p>
          </div>
          <button onClick={() => { toast('Loading older records...', 'info'); }} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">Load More</button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'invoice'} onClose={() => setActiveModal(null)} title={`Invoice ${selectedInvoice?.id}`} size="md">
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-xl p-6 text-center border border-emerald-100">
             <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Paid in Full</p>
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
