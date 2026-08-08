import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [actionTarget, setActionTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [messageType, setMessageType] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    apiFetch('/admin/users')
      .then(d => setUsers(d || []))
      .catch(() => toast('Failed to load patients', 'error'))
      .finally(() => setLoading(false));
    apiFetch('/admin/communications/templates')
      .then(d => setTemplates(d || []))
      .catch(console.error);
  }, []);

  const filteredUsers = users.filter(u => {
    const ms = !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === 'All' || u.status === filterStatus;
    return ms && mst;
  });

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? filteredUsers.map(u => u.id) : []);
  const handleSelectOne = (e, id) => setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(i => i !== id));

  const toggleStatus = async () => {
    const user = actionTarget;
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    try {
      await apiFetch(`/admin/users/${user.id}/status`, { method: 'PUT', body: { status: newStatus } });
      toast(`${user.name} is now ${newStatus}.`, newStatus === 'Active' ? 'success' : 'warning');
    } catch {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: user.status } : u));
      toast('Failed to update status', 'error');
    }
    setActionTarget(null);
  };

  const openMessageModal = (type) => {
    if (selectedIds.length === 0) { toast('Please select at least one patient first.', 'error'); return; }
    setMessageType(type); setIsActionsDropdownOpen(false); setIsMessageModalOpen(true);
  };

  const handleSendMessage = async () => {
    try {
      await apiFetch('/admin/communications/broadcasts', {
        method: 'POST',
        body: { subject: messageText.slice(0, 60), audience: `${selectedIds.length} selected patients`, body: messageText },
      });
      toast(`${messageType.toUpperCase()} sent to ${selectedIds.length} patients!`, 'success');
    } catch { toast('Send failed', 'error'); }
    setIsMessageModalOpen(false); setSelectedIds([]); setMessageText(''); setSelectedTemplate('');
  };

  const getStatusColor = (status) => {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Suspended') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Patient Management</h1>
          <p className="text-sm text-slate-500">Manage all registered patients on the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {isActionsDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulk Messaging</p>
                <button onClick={() => openMessageModal('email')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-envelope text-sky-500 w-4"></i> Bulk Email</button>
                <button onClick={() => openMessageModal('push')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><i className="fas fa-bell text-amber-500 w-4"></i> Push Notification</button>
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
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name, email, or ID..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-100">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300" onChange={handleSelectAll} checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length} />
                </th>
                <th className="px-5 py-3 font-semibold">Patient ID</th>
                <th className="px-5 py-3 font-semibold">Name & Email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Joined</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="6" className="px-5 py-3"><div className="animate-pulse h-10 bg-slate-100 rounded-lg"></div></td></tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">No users found.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(u.id) ? 'bg-sky-50/30' : ''}`}>
                    <td className="px-5 py-4 w-10 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300" checked={selectedIds.includes(u.id)} onChange={(e) => handleSelectOne(e, u.id)} />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{u.id.slice(0, 8)}…</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(u.status)}`}>{u.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-bold text-slate-700 text-sm">{u.joined}</p>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                      <a href={`/admin-dashboard/users/${u.id}`} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm whitespace-nowrap">
                        View Details
                      </a>
                      <button onClick={() => setActionTarget(u)} className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center">
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
          Showing {filteredUsers.length} of {users.length} patients
        </div>
      </div>

      {/* Bulk Message Modal */}
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} title={`Bulk ${messageType} Broadcast`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Sending to {selectedIds.length} selected patient(s).</p>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Template</label>
            <select value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); const t = templates.find(t => t.id === e.target.value); if (t) setMessageText(t.content); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-sky-100">
              <option value="">-- Custom Message --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows="5"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-100 outline-none"
            placeholder="Type your message..." />
          <button onClick={handleSendMessage} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-paper-plane"></i> Send {messageType}
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
