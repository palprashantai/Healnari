import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const MSG_TEMPLATES = [
    { id: 'T1', name: 'Clinic Closed Tomorrow', text: 'Hi Team, the clinic will be closed tomorrow. Please plan accordingly and inform your assigned patients.' },
    { id: 'T2', name: 'Extra Shift Required', text: 'Dear Team, we need additional staff coverage this weekend. Please confirm your availability at the earliest.' },
    { id: 'T3', name: 'Staff Meeting Notice', text: 'Reminder: Mandatory staff meeting scheduled for [Date] at [Time]. Attendance is required.' },
    { id: 'T4', name: 'New Protocol Update', text: 'Dear Team, please review the updated clinic protocols shared in the staff portal. Compliance is mandatory from next week.' },
  ];
  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setTemplateId(val);
    if (val) { const tmpl = MSG_TEMPLATES.find(t => t.id === val); if (tmpl) setMessageText(tmpl.text); }
  };
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send ${channel}`} size="sm">
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-xl p-3 text-sm font-bold flex gap-2">
          <i className="fas fa-users mt-1 text-sky-500"></i>
          <p>Sending {channel} to {selectedCount} selected staff member(s).</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select a Message Template (Optional)</label>
          <select value={templateId} onChange={handleTemplateChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            <option value="">-- Start from scratch --</option>
            {MSG_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message Content</label>
          <textarea rows={4} value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your custom message here..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-y"></textarea>
        </div>
        <div className="pt-2">
          <button onClick={() => { onSend(messageText); onClose(); }} disabled={!messageText.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
            <i className="fas fa-paper-plane"></i> Send {channel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Reference lists (not records — no backend needed) ──────── */
const ROLES = ['Nurse Practitioner', 'Receptionist', 'Lab Technician', 'Clinic Coordinator', 'Admin Assistant'];
const SHIFTS = ['Morning (8AM–4PM)', 'Morning (9AM–5PM)', 'Morning (8AM–2PM)', 'Evening (2PM–9PM)', 'Night (9PM–6AM)'];

/* ─── Add/Edit Staff Modal ───────────────────── */
function StaffModal({ isOpen, onClose, onSave, existing }) {
  const [form, setForm] = useState(existing || { name: '', role: ROLES[0], shift: SHIFTS[0], phone: '' });
  React.useEffect(() => setForm(existing || { name: '', role: ROLES[0], shift: SHIFTS[0], phone: '' }), [existing]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existing ? 'Edit Staff Member' : 'Add Staff Member'} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Full Name *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Staff member's name"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Role</label>
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Shift</label>
          <select value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            {SHIFTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Phone</label>
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 00000" type="tel"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <button onClick={() => { if (form.name) { onSave(form); onClose(); } }}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {existing ? 'Update Staff' : 'Add Staff Member'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorStaff() {
  const toast = useToast();
  const [rawStaff, setRawStaff] = useState([]);
  const [rawLeaves, setRawLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [tab, setTab] = useState('staff');

  const load = () => Promise.all([apiFetch('/staff'), apiFetch('/staff/leaves')])
    .then(([s, l]) => { setRawStaff(s); setRawLeaves(l); })
    .catch(err => toast(err.message || 'Failed to load staff data', 'error'))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const staff = rawStaff.map(s => ({
    id: s.id, name: s.name, role: s.role, shift: s.shift, status: s.status, phone: s.phone || '',
    joinedOn: new Date(s.joined_on).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    avatar: s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
  }));

  const nameByStaffId = useMemo(() => new Map(rawStaff.map(s => [s.id, s.name])), [rawStaff]);
  const leaves = rawLeaves.filter(l => l.status === 'Pending').map(l => ({
    id: l.id, name: nameByStaffId.get(l.staff_id) || 'Staff', type: l.leave_type,
    from: new Date(l.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    to: new Date(l.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  }));

  const [selectedIds, setSelectedIds] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState({ isOpen: false, channel: '' });
  const actionsMenuRef = useRef(null);

  useEffect(() => { setSelectedIds([]); }, [tab]);
  useEffect(() => {
    const handler = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBulkAction = (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) { toast('Please select at least one staff member first.', 'error'); return; }
    setBulkModalParams({ isOpen: true, channel: action });
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === staff.length && staff.length > 0) setSelectedIds([]);
    else setSelectedIds(staff.map(s => s.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Staff aren't patients, so there's no live push channel for them the way
  // there is for the patient-facing bulk actions elsewhere — this just logs
  // a real broadcast record via the same endpoint rather than faking a toast.
  const sendBulkMessage = async (channel, messageText) => {
    const recipients = staff.filter(s => selectedIds.includes(s.id));
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Staff — ${recipients.length} member(s)`,
          channels: [channel],
          scheduleType: 'immediate',
        },
      });
      toast(`${channel} logged for ${recipients.length} staff member(s).`, 'success');
    } catch (err) {
      toast(err.message || `Failed to send ${channel}`, 'error');
    }
    setSelectedIds([]);
  };

  const toggleStatus = async (id) => {
    const member = staff.find(s => s.id === id);
    const nextStatus = member?.status === 'On Duty' ? 'Off Duty' : 'On Duty';
    try {
      await apiFetch(`/staff/${id}`, { method: 'PUT', body: { status: nextStatus } });
      await load();
      toast(`${member?.name} marked as ${nextStatus}.`, 'info');
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error');
    }
  };

  const addStaff = async (form) => {
    try {
      await apiFetch('/staff', { method: 'POST', body: { name: form.name, role: form.role, shift: form.shift, phone: form.phone } });
      await load();
      toast(`${form.name} added to clinic team.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to add staff member', 'error');
    }
  };

  const updateStaff = async (form) => {
    try {
      await apiFetch(`/staff/${editTarget.id}`, { method: 'PUT', body: { name: form.name, role: form.role, shift: form.shift, phone: form.phone } });
      await load();
      toast('Staff details updated.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update staff member', 'error');
    }
    setEditTarget(null);
  };

  const removeStaff = async () => {
    const name = removeTarget.name;
    try {
      await apiFetch(`/staff/${removeTarget.id}`, { method: 'DELETE' });
      await load();
      toast(`${name} removed from clinic team.`, 'info');
    } catch (err) {
      toast(err.message || 'Failed to remove staff member', 'error');
    }
    setRemoveTarget(null);
  };

  const handleLeave = async (id, approve) => {
    const l = leaves.find(x => x.id === id);
    try {
      await apiFetch(`/staff/leaves/${id}`, { method: 'PUT', body: { status: approve ? 'Approved' : 'Rejected' } });
      await load();
      toast(`${l?.name}'s ${l?.type} ${approve ? 'approved' : 'rejected'}.`, approve ? 'success' : 'info');
    } catch (err) {
      toast(err.message || 'Failed to update leave request', 'error');
    }
  };

  const onDuty = staff.filter(s => s.status === 'On Duty').length;

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading staff...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Staff Management</h1>
          <p className="text-sm text-slate-500">{staff.length} team members • {onDuty} on duty today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 mb-1"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bulk Messaging</p></div>
                <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-sky-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-envelope text-sky-500 w-4"></i> Bulk Email
                </button>
                <button onClick={() => handleBulkAction('Push Notification')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-bell text-amber-500 w-4"></i> Push Notification
                </button>
                <button onClick={() => handleBulkAction('WhatsApp Message')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-3 transition-colors">
                  <i className="fab fa-whatsapp text-emerald-500 w-4 text-lg"></i> WhatsApp Message
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowAdd(true)}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors">
            <i className="fas fa-user-plus"></i> Add Staff
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Staff', value: staff.length, color: 'text-slate-800' },
          { label: 'On Duty', value: onDuty, color: 'text-emerald-700' },
          { label: 'Leave Requests', value: leaves.length, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 items-center justify-between pr-5">
          <div className="flex">
            {[['staff', 'Team Members', staff.length], ['leaves', 'Leave Requests', leaves.length]].map(([key, label, count]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-6 py-4 text-sm font-bold transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
              </button>
            ))}
          </div>
          {tab === 'staff' && (
            <div className="flex items-center gap-3">
              {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.length > 0 && selectedIds.length === staff.length ? 'bg-aubergine-600 border-aubergine-600 text-white' : selectedIds.length > 0 ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-600' : 'bg-white border-slate-300'}`}>
                  {(selectedIds.length > 0 && selectedIds.length === staff.length) ? <i className="fas fa-check text-[8px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-600 rounded"></div> : null}
                </div>
                <input type="checkbox" className="hidden" checked={selectedIds.length === staff.length && staff.length > 0} onChange={toggleSelectAll} />
                Select All
              </label>
            </div>
          )}
        </div>

        {tab === 'staff' && (
          <div className="divide-y divide-slate-50">
            {staff.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <i className="fas fa-user-group text-3xl mb-2 block text-slate-300"></i>
                <p className="font-bold text-sm">No team members added yet</p>
              </div>
            ) : staff.map(s => (
              <div key={s.id} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors group ${selectedIds.includes(s.id) ? 'bg-aubergine-50/20 ring-1 ring-inset ring-aubergine-200' : ''}`}>
                <label className="cursor-pointer group/cb flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(s.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover/cb:border-aubergine-400'}`}>
                    {selectedIds.includes(s.id) && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                </label>
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-aubergine-100 text-aubergine-700 font-black text-base flex items-center justify-center">
                    {s.avatar}
                  </div>
                  {s.status === 'On Duty' && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-800">{s.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.status === 'On Duty' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-aubergine-700 font-bold mt-0.5">{s.role}</p>
                  <p className="text-xs text-slate-500">{s.shift} • Joined {s.joinedOn}</p>
                </div>

                <div className="flex gap-2 items-center">
                  <button onClick={() => toggleStatus(s.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border ${s.status === 'On Duty' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
                    {s.status === 'On Duty' ? 'Mark Off' : 'Mark On'}
                  </button>
                  <a href={`tel:${s.phone}`} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors border border-slate-200" title="Call">
                    <i className="fas fa-phone text-xs"></i>
                  </a>
                  <button onClick={() => setEditTarget(s)} className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-aubergine-50 hover:text-aubergine-600 flex items-center justify-center transition-colors border border-slate-200" title="Edit">
                    <i className="fas fa-pen text-xs"></i>
                  </button>
                  <button onClick={() => setRemoveTarget(s)} aria-label="Remove team member" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 w-9 h-9 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-all border border-rose-100" title="Remove">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'leaves' && (
          <div className="divide-y divide-slate-50">
            {leaves.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <i className="fas fa-circle-check text-3xl mb-2 block text-emerald-400"></i>
                <p className="font-bold text-sm">No pending leave requests</p>
              </div>
            ) : leaves.map(l => (
              <div key={l.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-black text-slate-800">{l.name}</h3>
                  <p className="text-xs text-aubergine-700 font-bold">{l.type}</p>
                  <p className="text-xs text-slate-500">{l.from} → {l.to}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleLeave(l.id, false)} className="text-xs font-bold text-rose-600 border border-rose-200 px-4 py-2 rounded-xl hover:bg-rose-50 transition-colors">Reject</button>
                  <button onClick={() => handleLeave(l.id, true)} className="text-xs font-bold bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <StaffModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSave={addStaff} existing={null} />
      <StaffModal isOpen={!!editTarget} onClose={() => setEditTarget(null)} onSave={updateStaff} existing={editTarget} />
      <ConfirmModal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={removeStaff}
        title={`Remove ${removeTarget?.name}?`}
        message={`${removeTarget?.name} will be removed from your clinic team. This action can be undone by re-adding them.`}
        confirmLabel="Remove" confirmStyle="danger" />
      <BulkMessageModal
        isOpen={bulkModalParams.isOpen}
        onClose={() => setBulkModalParams({ isOpen: false, channel: '' })}
        channel={bulkModalParams.channel}
        selectedCount={selectedIds.length}
        onSend={(msg) => sendBulkMessage(bulkModalParams.channel, msg)}
      />
    </div>
  );
}

export default DoctorStaff;
