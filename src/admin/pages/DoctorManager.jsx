import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function AdminDoctorManager() {
  const toast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [messageType, setMessageType] = useState('email');
  const [templates, setTemplates] = useState([]);
  const [dbSpecialties, setDbSpecialties] = useState([]);

  useEffect(() => {
    apiFetch('/admin/clinics')
      .then(d => setDoctors(d || []))
      .catch(() => toast('Failed to load doctors', 'error'))
      .finally(() => setLoading(false));
    apiFetch('/admin/communications/templates')
      .then(d => setTemplates(d || []))
      .catch(console.error);
    apiFetch('/admin/specialties')
      .then(d => setDbSpecialties(d || []))
      .catch(console.error);
  }, []);

  const specialties = ['All', ...dbSpecialties.map(s => s.name)];


  const filteredDoctors = doctors.filter(d => {
    const ms = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const msp = filterSpecialty === 'All' || d.specialty === filterSpecialty;
    const mst = filterStatus === 'All' || d.status === filterStatus;
    return ms && msp && mst;
  });

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? filteredDoctors.map(d => d.id) : []);
  };
  const handleSelectOne = (e, id) => {
    setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const openMessageModal = (type) => {
    if (selectedIds.length === 0) { toast('Please select at least one doctor first.', 'error'); return; }
    setMessageType(type);
    setIsActionsDropdownOpen(false);
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async () => {
    try {
      const res = await apiFetch('/admin/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: messageText.slice(0, 60),
          audience: `${selectedIds.length} selected doctors`,
          body: messageText,
          userIds: selectedIds,
          channels: [messageType === 'push' ? 'Push' : 'Email'],
        },
      });
      if (messageType === 'push') toast(`Push notification delivered to ${res.recipient_count ?? 0} doctor(s).`, 'success');
      else toast('Recorded, but not delivered — no email provider is connected yet.', 'info');
    } catch {
      toast('Send failed', 'error');
    }
    setIsMessageModalOpen(false);
    setSelectedIds([]);
    setMessageText('');
    setSelectedTemplate('');
  };

  const handleExport = () => {
    if (filteredDoctors.length === 0) {
      toast('No data to export', 'error');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Specialty', 'Status', 'Verified', 'Consultations', 'Commission Rate (%)', 'Platform Earnings', 'Total Gross Revenue'];
    const rows = filteredDoctors.map(d => {
      const platformEarnings = d.totalGross * (d.commissionRate / 100);
      return [
        d.id,
        `"${d.name || ''}"`,
        `"${d.email || ''}"`,
        `"${d.specialty || ''}"`,
        d.status,
        d.verified ? 'Yes' : 'No',
        d.totalConsults,
        d.commissionRate,
        platformEarnings,
        d.totalGross
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `doctors_commission_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Report exported successfully', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Doctor Network & Commission</h1>
          <p className="text-sm text-slate-500">Manage registered doctors, view performance reports, and track platform revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {isActionsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulk Messaging</p>
                <button onClick={() => openMessageModal('email')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-envelope text-aubergine-600 w-4"></i> Bulk Email</button>
                <button onClick={() => openMessageModal('push')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-bell text-amber-500 w-4"></i> Push Notification</button>
              </div>
            )}
          </div>
          <button onClick={handleExport}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-file-csv"></i> Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300" onChange={handleSelectAll} checked={filteredDoctors.length > 0 && selectedIds.length === filteredDoctors.length} />
                </th>
                <th className="px-5 py-3 font-semibold">Doctor Info</th>
                <th className="px-5 py-3 font-semibold">Status / Verification</th>
                <th className="px-5 py-3 font-semibold text-center">Consultations</th>
                <th className="px-5 py-3 font-semibold text-right">Commission Rate</th>
                <th className="px-5 py-3 font-semibold text-right">Platform Earning</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-5 py-3"><div className="animate-pulse h-10 bg-slate-100 rounded-lg"></div></td></tr>
                ))
              ) : filteredDoctors.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">No doctors found.</td></tr>
              ) : (
                filteredDoctors.map(d => {
                  const platformEarnings = d.totalGross * (d.commissionRate / 100);
                  return (
                    <tr key={d.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(d.id) ? 'bg-aubergine-50/40' : ''}`}>
                      <td className="px-5 py-4 w-10 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300" checked={selectedIds.includes(d.id)} onChange={(e) => handleSelectOne(e, d.id)} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{d.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{d.specialty} • {d.id.slice(0, 8)}…</p>
                        {d.rating > 0 && <span className="text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"><i className="fas fa-star mr-1"></i>{d.rating}</span>}
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
                      <td className="px-5 py-4 text-right">
                        <a href={`/admin-dashboard/doctors/${d.id}`} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm whitespace-nowrap">
                          View Dashboard
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500 text-center bg-slate-50">
          Showing {filteredDoctors.length} of {doctors.length} doctors
        </div>
      </div>

      {/* Bulk Message Modal */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title={`Bulk ${messageType} Broadcast`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Sending to {selectedIds.length} selected doctor(s) via {messageType}.</p>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Template</label>
            <select value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); const t = templates.find(t => t.id === e.target.value); if (t) setMessageText(t.content); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-aubergine-200">
              <option value="">-- Custom Message --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows="5"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-aubergine-200 outline-none"
            placeholder="Type your message here..." />
          <button onClick={handleSendMessage} className="crm-btn-primary w-full py-3 flex items-center justify-center gap-2">
            <i className="fas fa-paper-plane"></i> Send {messageType}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminDoctorManager;
