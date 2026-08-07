import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const INITIAL_STAFF = [
  { id: 1, name: 'Neha Kulkarni', role: 'Nurse Practitioner',  shift: 'Morning (8AM–4PM)', status: 'On Duty', phone: '+91 98765 11111', joinedOn: 'Jan 2024', avatar: 'NK' },
  { id: 2, name: 'Ravi Sharma',   role: 'Receptionist',        shift: 'Morning (9AM–5PM)', status: 'On Duty', phone: '+91 98765 22222', joinedOn: 'Mar 2023', avatar: 'RS' },
  { id: 3, name: 'Pooja Singh',   role: 'Lab Technician',      shift: 'Morning (8AM–2PM)', status: 'Off Duty',phone: '+91 98765 33333', joinedOn: 'Jun 2022', avatar: 'PS' },
  { id: 4, name: 'Arun Yadav',    role: 'Clinic Coordinator',  shift: 'Evening (2PM–9PM)', status: 'On Duty', phone: '+91 98765 44444', joinedOn: 'Sep 2024', avatar: 'AY' },
];

const ROLES = ['Nurse Practitioner', 'Receptionist', 'Lab Technician', 'Clinic Coordinator', 'Admin Assistant'];
const SHIFTS = ['Morning (8AM–4PM)', 'Morning (9AM–5PM)', 'Morning (8AM–2PM)', 'Evening (2PM–9PM)', 'Night (9PM–6AM)'];

const LEAVES = [
  { id: 1, name: 'Pooja Singh', type: 'Sick Leave',   from: '28 Jun 2026', to: '30 Jun 2026', status: 'pending' },
  { id: 2, name: 'Ravi Sharma', type: 'Casual Leave', from: '5 Jul 2026',  to: '5 Jul 2026',  status: 'pending' },
];

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
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [leaves, setLeaves] = useState(LEAVES);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [tab, setTab] = useState('staff');

  const toggleStatus = (id) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'On Duty' ? 'Off Duty' : 'On Duty' } : s));
    const member = staff.find(s => s.id === id);
    toast(`${member?.name} marked as ${member?.status === 'On Duty' ? 'Off Duty' : 'On Duty'}.`, 'info');
  };

  const addStaff = (form) => {
    const newMember = { ...form, id: Date.now(), status: 'On Duty', joinedOn: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), avatar: form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) };
    setStaff(prev => [...prev, newMember]);
    toast(`${form.name} added to clinic team.`, 'success');
  };

  const updateStaff = (form) => {
    setStaff(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...form } : s));
    toast('Staff details updated.', 'success');
    setEditTarget(null);
  };

  const removeStaff = () => {
    setStaff(prev => prev.filter(s => s.id !== removeTarget.id));
    toast(`${removeTarget.name} removed from clinic team.`, 'info');
    setRemoveTarget(null);
  };

  const handleLeave = (id, approve) => {
    setLeaves(prev => prev.filter(l => l.id !== id));
    const l = leaves.find(x => x.id === id);
    toast(`${l?.name}'s ${l?.type} ${approve ? 'approved' : 'rejected'}.`, approve ? 'success' : 'info');
  };

  const onDuty = staff.filter(s => s.status === 'On Duty').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Staff Management</h1>
          <p className="text-sm text-slate-500">{staff.length} team members • {onDuty} on duty today</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors">
          <i className="fas fa-user-plus"></i> Add Staff
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
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
        <div className="flex border-b border-slate-200 bg-slate-50">
          {[['staff', 'Team Members', staff.length], ['leaves', 'Leave Requests', leaves.length]].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm font-bold transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {tab === 'staff' && (
          <div className="divide-y divide-slate-50">
            {staff.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <i className="fas fa-user-group text-3xl mb-2 block text-slate-300"></i>
                <p className="font-bold text-sm">No team members added yet</p>
              </div>
            ) : staff.map(s => (
              <div key={s.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors group">
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
                  <p className="text-xs text-slate-400">{s.shift} • Joined {s.joinedOn}</p>
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
              <div className="text-center py-12 text-slate-400">
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
    </div>
  );
}

export default DoctorStaff;
