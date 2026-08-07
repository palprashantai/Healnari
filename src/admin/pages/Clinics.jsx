import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const INITIAL_CLINICS = [
  { id: 'C-01', name: 'HealNari Bandra', city: 'Mumbai', doctors: 4, staff: 6, status: 'Active', revenue: '₹4.2L', rating: '4.8' },
  { id: 'C-02', name: 'HealNari Andheri', city: 'Mumbai', doctors: 3, staff: 4, status: 'Active', revenue: '₹2.8L', rating: '4.5' },
  { id: 'C-03', name: 'HealNari Indiranagar', city: 'Bengaluru', doctors: 5, staff: 8, status: 'Active', revenue: '₹5.1L', rating: '4.9' },
  { id: 'C-04', name: 'HealNari HSR', city: 'Bengaluru', doctors: 0, staff: 2, status: 'Setup', revenue: '₹0', rating: '-' },
];

/* ─── Add Clinic Modal ───────────────────────── */
function ClinicModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', city: '', address: '' });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Clinic" size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Clinic Name</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HealNari Whitefield"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">City</label>
          <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Bengaluru"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Full Address</label>
          <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
        </div>
        <button onClick={() => { if (form.name && form.city) { onSave(form); onClose(); setForm({ name: '', city: '', address: '' }); } }}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          Create Clinic
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function AdminClinics() {
  const toast = useToast();
  const [clinics, setClinics] = useState(INITIAL_CLINICS);
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = (form) => {
    setClinics(prev => [...prev, { id: `C-${String(prev.length + 1).padStart(2, '0')}`, name: form.name, city: form.city, doctors: 0, staff: 0, status: 'Setup', revenue: '₹0', rating: '-' }]);
    toast(`${form.name} created and marked as Setup phase.`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Clinic Management</h1>
          <p className="text-sm text-slate-500">Manage physical clinic locations and performance.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-plus"></i> Add Location
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clinics.map(c => (
          <Tilt3D key={c.id} max={5} className="h-full">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-slate-800 text-lg">{c.name}</h3>
                <p className="text-xs text-slate-500"><i className="fas fa-location-dot mr-1"></i> {c.city}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {c.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 flex-1">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Personnel</p>
                <p className="text-sm font-bold text-slate-700">{c.doctors} Dr • {c.staff} Staff</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Revenue (MTD)</p>
                <p className="text-sm font-bold text-slate-700">{c.revenue}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                <i className="fas fa-star"></i> <span className="text-slate-700">{c.rating}</span>
              </div>
              <button onClick={() => toast(`Opening management portal for ${c.name}...`, 'info')} className="text-xs font-bold text-slate-600 hover:text-aubergine-600 transition-colors">
                Manage Clinic <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>
          </Tilt3D>
        ))}
      </div>

      <ClinicModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
    </div>
  );
}

export default AdminClinics;
