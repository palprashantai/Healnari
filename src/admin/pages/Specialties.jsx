import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

function AdminSpecialties() {
  const toast = useToast();
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState(null); // null means adding a new one
  const [specialtyName, setSpecialtyName] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSpecialties = () => {
    setLoading(true);
    apiFetch('/admin/specialties')
      .then(data => {
        setSpecialties(data || []);
      })
      .catch(() => toast('Failed to load specialties', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const handleOpenAdd = () => {
    setEditingSpecialty(null);
    setSpecialtyName('');
    setEditModalOpen(true);
  };

  const handleOpenEdit = (spec) => {
    setEditingSpecialty(spec);
    setSpecialtyName(spec.name);
    setEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!specialtyName.trim()) {
      toast('Specialty name cannot be empty.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingSpecialty) {
        // Update
        await apiFetch(`/admin/specialties/${editingSpecialty.id}`, {
          method: 'PUT',
          body: { name: specialtyName.trim() }
        });
        toast('Specialty updated successfully!', 'success');
      } else {
        // Create
        await apiFetch('/admin/specialties', {
          method: 'POST',
          body: { name: specialtyName.trim() }
        });
        toast('Specialty added successfully!', 'success');
      }
      setEditModalOpen(false);
      fetchSpecialties();
    } catch (err) {
      toast(err.message || 'Failed to save specialty', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/specialties/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      toast('Specialty deleted successfully', 'success');
      fetchSpecialties();
    } catch (err) {
      toast(err.message || 'Failed to delete specialty', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredSpecialties = specialties.filter(spec => 
    !search || (spec.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Specialty Management</h1>
          <p className="text-sm text-slate-500">Configure hormonal and medical specialties for the HealNari doctor network.</p>
        </div>
        <button onClick={handleOpenAdd} className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm btn-interactive">
          <i className="fas fa-plus"></i> Add Specialty
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search specialties..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Specialty Name</th>
                <th className="px-6 py-4 font-bold">Date Created</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="3" className="px-6 py-4">
                      <div className="animate-pulse h-6 bg-slate-100 rounded-lg w-3/4"></div>
                    </td>
                  </tr>
                ))
              ) : filteredSpecialties.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-400 font-semibold">
                    No specialties found.
                  </td>
                </tr>
              ) : (
                filteredSpecialties.map(spec => (
                  <tr key={spec.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {spec.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {new Date(spec.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button 
                        onClick={() => handleOpenEdit(spec)} 
                        className="text-aubergine-600 hover:text-aubergine-800 font-bold text-sm btn-interactive"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setDeleteTarget(spec)} 
                        className="text-rose-600 hover:text-rose-800 font-bold text-sm btn-interactive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Specialty Modal */}
      <Modal 
        isOpen={editModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        title={editingSpecialty ? 'Edit Specialty' : 'Add Specialty'} 
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Specialty Name</label>
            <input 
              value={specialtyName} 
              onChange={e => setSpecialtyName(e.target.value)} 
              placeholder="e.g. Gynaecologist, Endocrinologist"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Specialty'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Specialty"
        message={`Are you sure you want to delete the specialty "${deleteTarget?.name}"? Any doctors currently assigned this specialty will retain it, but it will be removed from all dropdown options.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmStyle="danger"
      />
    </div>
  );
}

export default AdminSpecialties;
