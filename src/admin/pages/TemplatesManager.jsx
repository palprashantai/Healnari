import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const INITIAL_TEMPLATES = [
  { id: 'T-101', type: 'email', audience: 'General', label: 'System Maintenance Notice', text: 'Dear [Name],\n\nThe platform will undergo maintenance on [Date].\n\nThanks,\nAdmin Team' },
  { id: 'T-102', type: 'email', audience: 'Patient', label: 'Health Camp Invite', text: 'Hello [Name],\n\nJoin our upcoming free health camp this weekend!' },
  { id: 'T-103', type: 'email', audience: 'Doctor', label: 'Policy Update', text: 'Dear Dr. [Name],\n\nPlease review the updated payout policy in your dashboard.' },
  { id: 'T-201', type: 'whatsapp', audience: 'Patient', label: 'WhatsApp: Reminder', text: 'Hi [Name], this is a reminder for your upcoming consultation.' },
  { id: 'T-202', type: 'whatsapp', audience: 'Doctor', label: 'WhatsApp: Missed Consult', text: 'Hi Dr. [Name], you have a missed consultation. Please check your app.' },
  { id: 'T-301', type: 'push', audience: 'Patient', label: 'Push: Promo Offer', text: 'Get 20% off your next consultation if booked today!' },
  { id: 'T-302', type: 'push', audience: 'Doctor', label: 'Push: Urgent Update', text: 'Critical platform update requires your attention.' },
];

function AdminTemplates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');

  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', type: 'email', audience: 'General', content: '' });

  useEffect(() => {
    apiFetch('/admin/communications/templates')
      .then(d => setTemplates(d || []))
      .catch(() => toast('Failed to load templates', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTemplates = templates.filter(t => {
    const ms = !search || (t.name || t.label || '').toLowerCase().includes(search.toLowerCase()) || (t.content || t.text || '').toLowerCase().includes(search.toLowerCase());
    const mt = filterType === 'All' || t.type === filterType;
    return ms && mt;
  });

  const getTypeColor = (type) => {
    if (type === 'email') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (type === 'whatsapp') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (type === 'push') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };
  
  const getTypeIcon = (type) => {
    if (type === 'email') return 'fas fa-envelope text-sky-500';
    if (type === 'whatsapp') return 'fab fa-whatsapp text-emerald-500';
    if (type === 'push') return 'fas fa-bell text-amber-500';
    return 'fas fa-pager text-slate-500';
  };

  const openCreate = () => {
    setFormData({ name: '', type: 'email', audience: 'General', content: '' });
    setView('create');
  };

  const openEdit = (t) => {
    setSelectedTemplate(t);
    setFormData({ name: t.name || t.label, type: t.type || 'email', audience: t.audience || 'General', content: t.content || t.text });
    setView('edit');
  };

  const openDelete = (t) => {
    setSelectedTemplate(t);
    setDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast('Please provide a template name and content.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (view === 'create') {
        const res = await apiFetch('/admin/communications/templates', {
          method: 'POST',
          body: { name: formData.name, content: formData.content },
        });
        setTemplates(prev => [res, ...prev]);
        toast('Template created successfully!', 'success');
      } else if (view === 'edit') {
        const res = await apiFetch(`/admin/communications/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          body: { name: formData.name, content: formData.content },
        });
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? res : t));
        toast('Template updated successfully!', 'success');
      }
    } catch {
      toast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
    setView('list');
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/admin/communications/templates/${selectedTemplate.id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== selectedTemplate.id));
      toast('Template deleted.', 'success');
    } catch {
      toast('Failed to delete template', 'error');
    }
    setDeleteModalOpen(false);
  };


  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <button onClick={() => setView('list')} className="text-sm font-bold text-slate-400 hover:text-sky-600 transition-colors flex items-center gap-2 mb-2">
              <i className="fas fa-arrow-left"></i> Back to Templates
            </button>
            <h1 className="text-2xl font-black text-slate-800">
              {view === 'create' ? 'Create New Template' : `Edit Template: ${selectedTemplate?.label}`}
            </h1>
            <p className="text-sm text-slate-500">
              {view === 'create' ? 'Design a new message layout to use across the platform.' : `Make changes to template ${selectedTemplate?.id}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
              <i className="fas fa-save"></i> {view === 'create' ? 'Save New Template' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm"><i className="fas fa-sliders mr-2 text-slate-400"></i> Delivery Settings</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-3 block uppercase tracking-widest">Channel</label>
                  <div className="flex flex-col gap-2">
                    {['email', 'whatsapp', 'push'].map(t => (
                      <label key={t} className={`flex items-center gap-3 cursor-pointer group p-3 rounded-xl border-2 transition-all ${formData.type === t ? (t==='whatsapp'?'border-emerald-500 bg-emerald-50/50':t==='email'?'border-sky-500 bg-sky-50/50':'border-amber-500 bg-amber-50/50') : 'border-slate-100 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${formData.type === t ? (t==='whatsapp'?'border-emerald-600':t==='email'?'border-sky-600':'border-amber-600') : 'border-slate-300'}`}>
                          {formData.type === t && <div className={`w-2 h-2 rounded-full ${t==='whatsapp'?'bg-emerald-600':t==='email'?'bg-sky-600':'bg-amber-600'}`}></div>}
                        </div>
                        <input type="radio" name="type" className="hidden" checked={formData.type === t} onChange={() => setFormData({...formData, type: t})} />
                        <div className="flex items-center gap-2.5">
                          <i className={`${getTypeIcon(t)} w-4 text-center text-lg`}></i>
                          <span className={`text-sm font-bold capitalize ${formData.type === t ? 'text-slate-800' : 'text-slate-600'}`}>{t === 'push' ? 'Push Notification' : t}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 mb-3 block uppercase tracking-widest">Target Audience</label>
                  <select 
                    value={formData.audience} 
                    onChange={e => setFormData({...formData, audience: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer"
                  >
                    <option value="General">All Users (General)</option>
                    <option value="Patient">Patients Only</option>
                    <option value="Doctor">Doctors Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm"><i className="fas fa-pen-nib mr-2 text-slate-400"></i> Content Editor</h3>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-widest">Template Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-base font-bold px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition-all"
                    placeholder="e.g. Appointment Reminder"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">Message Body</label>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-100 focus-within:border-sky-300 transition-all">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto">
                      <span className="text-[10px] uppercase font-bold text-slate-400 self-center mr-2">Variables:</span>
                      <button className="text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors shadow-sm">{'[Name]'}</button>
                      <button className="text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors shadow-sm">{'[Date]'}</button>
                      <button className="text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors shadow-sm">{'[Time]'}</button>
                    </div>
                    <textarea 
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      rows="12"
                      className="w-full bg-white text-slate-700 text-sm px-4 py-4 outline-none resize-y font-mono"
                      placeholder="Type your message template here..."
                    ></textarea>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[10px] text-slate-400"><i className="fas fa-info-circle mr-1"></i> SMS messages over 160 characters may be split.</p>
                    <p className={`text-xs font-bold ${(formData.content || '').length > 160 && formData.type !== 'email' ? 'text-amber-500' : 'text-slate-400'}`}>{(formData.content || '').length} chars</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Message Templates</h1>
          <p className="text-sm text-slate-500">Create and manage broadcast templates for Email, Push, and WhatsApp.</p>
        </div>
        <button onClick={openCreate} className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-plus"></i> New Template
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-slate-100">
              <option value="All">All Channels</option>
              <option value="email">Email Only</option>
              <option value="whatsapp">WhatsApp Only</option>
              <option value="push">Push Notification</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold w-16">ID</th>
                <th className="px-5 py-3 font-semibold">Channel</th>
                <th className="px-5 py-3 font-semibold">Target Audience</th>
                <th className="px-5 py-3 font-semibold">Template Label</th>
                <th className="px-5 py-3 font-semibold w-1/3">Preview</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">No templates found.</td></tr>
              ) : (
                filteredTemplates.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{t.id}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border flex items-center gap-1.5 w-max ${getTypeColor(t.type)}`}>
                        <i className={getTypeIcon(t.type)}></i> {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-700">{t.audience}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{t.label}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-500 truncate max-w-xs">{t.text}</p>
                    </td>
                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center transition-colors shadow-sm" title="Edit Template">
                        <i className="fas fa-pen text-xs"></i>
                      </button>
                      <button onClick={() => openDelete(t)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors shadow-sm" title="Delete Template">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-500 text-center bg-slate-50">
          Showing {filteredTemplates.length} templates
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${selectedTemplate?.label}"? This action cannot be undone.`}
        confirmLabel="Delete Template"
        confirmStyle="danger"
      />

    </div>
  );
}

export default AdminTemplates;
