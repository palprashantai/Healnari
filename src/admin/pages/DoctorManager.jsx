import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const DOCTORS = [
  { id: 'D-8271', name: 'Dr. Sarah Mitchell', specialty: 'Gynaecologist', status: 'Active', verified: true, joined: '05 Jan 2026', commissionRate: 15, totalGross: 450000, totalConsults: 150, rating: 4.8 },
  { id: 'D-5544', name: 'Dr. Anil Kumar', specialty: 'General Physician', status: 'Active', verified: false, joined: '10 Apr 2026', commissionRate: 10, totalGross: 120000, totalConsults: 60, rating: 4.5 },
  { id: 'D-1234', name: 'Dr. Riya Sen', specialty: 'Dermatologist', status: 'Suspended', verified: true, joined: '20 May 2026', commissionRate: 20, totalGross: 85000, totalConsults: 34, rating: 4.2 },
];

/* ─── Main Component ─────────────────────────── */
function AdminDoctorManager() {
  const toast = useToast();
  const [doctors, setDoctors] = useState(DOCTORS);
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const specialties = ['All', ...new Set(DOCTORS.map(d => d.specialty))];

  const filteredDoctors = doctors.filter(d => {
    const ms = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const msp = filterSpecialty === 'All' || d.specialty === filterSpecialty;
    const mst = filterStatus === 'All' || d.status === filterStatus;
    return ms && msp && mst;
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear Dr. [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Policy Update', text: 'Dear Dr. [Name], please review the updated payout policy in your dashboard.' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Missed Consult', text: 'Hi Dr. [Name], you have a missed consultation. Please check your app.' },
    { id: 't4', type: 'push', label: 'Push: Urgent Update', text: 'Critical platform update requires your attention.' },
  ];

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredDoctors.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleQuickAction = (action, doc) => {
    toast(`Quick Action: ${action} triggered for ${doc.name}`, 'info');
  };

  const openMessageModal = (type) => {
    if (selectedIds.length === 0) {
      toast('Please select at least one doctor first.', 'error');
      return;
    }
    setMessageType(type);
    setIsActionsDropdownOpen(false);
    setIsMessageModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Doctor Network & Commission</h1>
          <p className="text-sm text-slate-500">Manage registered doctors, view performance reports, and track platform revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Actions Dropdown */}
          <div className="relative">
            <button onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {isActionsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulk Messaging</p>
                <button onClick={() => openMessageModal('email')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-envelope text-sky-500 w-4"></i> Bulk Email</button>
                <button onClick={() => openMessageModal('push')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-bell text-amber-500 w-4"></i> Push Notification</button>
                <button onClick={() => openMessageModal('whatsapp')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fab fa-whatsapp text-emerald-500 w-4"></i> WhatsApp Message</button>
              </div>
            )}
          </div>
          <button onClick={() => toast('Exporting full commission report...', 'info')}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-file-csv"></i> Export Global Revenue
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctor name or ID..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-100">
              {specialties.map(s => <option key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-100">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                    onChange={handleSelectAll}
                    checked={filteredDoctors.length > 0 && selectedIds.length === filteredDoctors.length}
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Doctor Info</th>
                <th className="px-5 py-3 font-semibold">Status / Verification</th>
                <th className="px-5 py-3 font-semibold text-center">Consultations</th>
                <th className="px-5 py-3 font-semibold text-right">Commission Rate</th>
                <th className="px-5 py-3 font-semibold text-right">Platform Earning (MTD)</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDoctors.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">No doctors found.</td></tr>
              ) : (
                filteredDoctors.map(d => {
                  const platformEarnings = d.totalGross * (d.commissionRate / 100);
                  return (
                    <tr key={d.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(d.id) ? 'bg-sky-50/30' : ''}`}>
                      <td className="px-5 py-4 w-10 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                          checked={selectedIds.includes(d.id)}
                          onChange={(e) => handleSelectOne(e, d.id)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{d.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{d.specialty} • {d.id}</p>
                        <span className="text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          <i className="fas fa-star mr-1"></i>{d.rating}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${d.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{d.status}</span>
                          {d.verified ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><i className="fas fa-certificate"></i> Verified</span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><i className="fas fa-clock"></i> Pending KYC</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-slate-700">{d.totalConsults}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded text-xs">{d.commissionRate}%</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-black text-emerald-600 text-lg">₹{platformEarnings.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold">From ₹{d.totalGross.toLocaleString()} Gross</p>
                      </td>
                      <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                        <a href={`/admin-dashboard/doctors/${d.id}`} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm whitespace-nowrap">
                          View Dashboard
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500 text-center bg-slate-50">
          Showing {filteredDoctors.length} of {doctors.length} doctors
        </div>
      </div>

      {/* Quick Broadcast Modal */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title={`Bulk ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} Broadcast`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Sending message to {selectedIds.length} selected doctor(s) via {messageType}.</p>
          
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
          <button onClick={() => { toast(`${messageType.toUpperCase()} sent to ${selectedIds.length} doctors!`, 'success'); setIsMessageModalOpen(false); setSelectedIds([]); setMessageText(''); setSelectedTemplate(''); }} className={`w-full text-white font-bold py-3 rounded-xl transition-colors ${messageType === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-600 hover:bg-sky-700'}`}>
            <i className={`mr-2 ${messageType === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-paper-plane'}`}></i> Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
          </button>
        </div>
      </Modal>

    </div>
  );
}

export default AdminDoctorManager;
