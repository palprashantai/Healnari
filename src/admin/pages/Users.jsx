import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

const INITIAL_USERS = [
  { id: 'U-9182', name: 'Priya Sharma', role: 'Patient', email: 'priya@example.com', phone: '+91 98765 43210', status: 'Active', joined: '12 Jan 2026', ltv: 12500, lastVisit: '07 Aug 2026' },
  { id: 'U-7362', name: 'Anita Desai', role: 'Patient', email: 'anita@example.com', phone: '+91 96543 21098', status: 'Active', joined: '20 Feb 2026', ltv: 8400, lastVisit: '06 Aug 2026' },
  { id: 'U-4432', name: 'Meera Rajput', role: 'Patient', email: 'meera@example.com', phone: '+91 91234 56789', status: 'Suspended', joined: '10 Apr 2026', ltv: 2500, lastVisit: '01 Aug 2026' },
];

/* ─── Main Component ─────────────────────────── */
function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [actionTarget, setActionTarget] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const TEMPLATES = [
    { id: 't1', type: 'email', label: 'System Maintenance Notice', text: 'Dear [Name], the platform will undergo maintenance on [Date].' },
    { id: 't2', type: 'email', label: 'Health Camp Invite', text: 'Hello [Name], join our upcoming free health camp this weekend!' },
    { id: 't3', type: 'whatsapp', label: 'WhatsApp: Reminder', text: 'Hi [Name], this is a reminder for your upcoming consultation.' },
    { id: 't4', type: 'push', label: 'Push: Promo Offer', text: 'Get 20% off your next consultation if booked today!' },
  ];

  const filteredUsers = users.filter(u => {
    const ms = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === 'All' || u.status === filterStatus;
    return ms && mst;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredUsers.map(u => u.id));
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

  const handleQuickAction = (action, user) => {
    toast(`Quick Action: ${action} triggered for ${user.name}`, 'info');
  };

  const toggleStatus = () => {
    const user = actionTarget;
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    toast(`${user.name} is now ${newStatus}.`, newStatus === 'Active' ? 'success' : 'warning');
    setActionTarget(null);
  };

  const getStatusColor = (status) => {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Suspended') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const openMessageModal = (type) => {
    if (selectedIds.length === 0) {
      toast('Please select at least one patient first.', 'error');
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
          <h1 className="text-2xl font-black text-slate-800">Patient Management</h1>
          <p className="text-sm text-slate-500">Manage all registered patients on the platform.</p>
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
          <button onClick={() => toast('Exporting user list to CSV...', 'info')}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-download"></i> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name, email, or ID..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-100">
              <option value="All">All Statuses</option>
              <option value="Active">Active Accounts</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                    onChange={handleSelectAll}
                    checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Patient ID</th>
                <th className="px-5 py-3 font-semibold">Name & Email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Lifetime Value (LTV)</th>
                <th className="px-5 py-3 font-semibold text-right">Last Visit</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">No users found matching your criteria.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(u.id) ? 'bg-sky-50/30' : ''}`}>
                    <td className="px-5 py-4 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                        checked={selectedIds.includes(u.id)}
                        onChange={(e) => handleSelectOne(e, u.id)}
                      />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{u.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(u.status)}`}>{u.status}</span>
                      {u.status === 'Suspended' && <p className="text-[10px] text-rose-500 mt-1 font-semibold">Review required</p>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-black text-emerald-600 text-sm">₹{u.ltv.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-bold text-slate-700 text-sm">{u.lastVisit}</p>
                      <p className="text-[10px] text-slate-400">Joined: {u.joined}</p>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                      <a href={`/admin-dashboard/users/${u.id}`} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm whitespace-nowrap">
                        View Details
                      </a>
                      <button onClick={() => setActionTarget(u)} className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center" title="More Actions">
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500 text-center bg-slate-50">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Quick Broadcast Modal */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title={`Bulk ${messageType.charAt(0).toUpperCase() + messageType.slice(1)} Broadcast`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Sending message to {selectedIds.length} selected patient(s) via {messageType}.</p>
          
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
          <button onClick={() => { toast(`${messageType.toUpperCase()} sent to ${selectedIds.length} patients!`, 'success'); setIsMessageModalOpen(false); setSelectedIds([]); setMessageText(''); setSelectedTemplate(''); }} className={`w-full text-white font-bold py-3 rounded-xl transition-colors ${messageType === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-600 hover:bg-sky-700'}`}>
            <i className={`mr-2 ${messageType === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-paper-plane'}`}></i> Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={toggleStatus}
        title={actionTarget?.status === 'Active' ? 'Suspend Patient' : 'Activate Patient'}
        message={`Are you sure you want to ${actionTarget?.status === 'Active' ? 'suspend' : 'activate'} ${actionTarget?.name}?`}
        confirmLabel={actionTarget?.status === 'Active' ? 'Suspend' : 'Activate'}
        confirmStyle={actionTarget?.status === 'Active' ? 'danger' : 'primary'}
      />
    </div>
  );
}

export default AdminUsers;
