import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const INITIAL_USERS = [
  { id: 'U-9182', name: 'Priya Sharma', role: 'Patient', email: 'priya@example.com', phone: '+91 98765 43210', status: 'Active', joined: '12 Jan 2026' },
  { id: 'U-8271', name: 'Dr. Sarah M.', role: 'Doctor', email: 'sarah@healnari.app', phone: '+91 98765 00001', status: 'Active', joined: '05 Jan 2026' },
  { id: 'U-7362', name: 'Anita Desai', role: 'Patient', email: 'anita@example.com', phone: '+91 96543 21098', status: 'Active', joined: '20 Feb 2026' },
  { id: 'U-6453', name: 'Rahul Varma', role: 'Staff', email: 'rahul@clinic.com', phone: '+91 93210 98765', status: 'Suspended', joined: '15 Mar 2026' },
  { id: 'U-5544', name: 'Dr. Anil K.', role: 'Doctor', email: 'anil@healnari.app', phone: '+91 91234 56789', status: 'Active', joined: '10 Apr 2026' },
];

/* ─── Main Component ─────────────────────────── */
function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [actionTarget, setActionTarget] = useState(null);

  const filteredUsers = users.filter(u => {
    const ms = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const mr = filterRole === 'All' || u.role === filterRole;
    return ms && mr;
  });

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

  const getRoleColor = (role) => {
    if (role === 'Patient') return 'text-sky-600 bg-sky-50';
    if (role === 'Doctor') return 'text-aubergine-600 bg-aubergine-50';
    if (role === 'Staff') return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500">Manage all registered patients, doctors, and staff.</p>
        </div>
        <button onClick={() => toast('Exporting user list to CSV...', 'info')}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-download"></i> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or ID..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <div className="flex gap-2">
            {['All', 'Patient', 'Doctor', 'Staff'].map(role => (
              <button key={role} onClick={() => setFilterRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterRole === role ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold">User ID</th>
                <th className="px-5 py-3 font-semibold">Name & Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">No users found matching your criteria.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{u.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${getRoleColor(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(u.status)}`}>{u.status}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{u.joined}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setActionTarget(u)} className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center ml-auto">
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

      <ConfirmModal isOpen={!!actionTarget} onClose={() => setActionTarget(null)} onConfirm={toggleStatus}
        title={actionTarget?.status === 'Active' ? 'Suspend User?' : 'Reactivate User?'}
        message={`Are you sure you want to ${actionTarget?.status === 'Active' ? 'suspend' : 'reactivate'} ${actionTarget?.name}?`}
        confirmLabel={actionTarget?.status === 'Active' ? 'Suspend' : 'Reactivate'}
        confirmStyle={actionTarget?.status === 'Active' ? 'danger' : 'primary'} />
    </div>
  );
}

export default AdminUsers;
