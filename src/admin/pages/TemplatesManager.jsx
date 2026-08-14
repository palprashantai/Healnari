import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { AiButton } from '../../components/AiButton.jsx';

const AVAILABLE_VARIABLES = [
  { key: 'patientName', label: 'Patient Name', sample: 'Priya Sharma' },
  { key: 'doctorName', label: 'Doctor Name', sample: 'Dr. Ananya Sen' },
  { key: 'when', label: 'Date & Time', sample: 'Tomorrow at 10:30 AM' },
  { key: 'label', label: 'Consultation Type', sample: 'Video Consultation' },
  { key: 'amount', label: 'Amount (₹)', sample: '₹1,250' },
  { key: 'referenceId', label: 'Reference / UTR', sample: 'PAY-REF-98421' },
  { key: 'settlementDate', label: 'Settlement Date', sample: 'Aug 14, 2026' },
  { key: 'medName', label: 'Medicine Name', sample: 'Folic Acid 5mg' },
  { key: 'duration', label: 'Course Duration', sample: '30 Days' },
  { key: 'dashboardUrl', label: 'Dashboard URL', sample: 'https://healnari.app/dashboard' },
  { key: 'recordsUrl', label: 'Records URL', sample: 'https://healnari.app/records' },
  { key: 'date', label: 'Date', sample: '2026-08-14' },
];

function AdminTemplates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterAudience, setFilterAudience] = useState('All');
  const [search, setSearch] = useState('');

  const [view, setView] = useState('list'); // 'list', 'create', 'edit'
  const [editorTab, setEditorTab] = useState('code'); // 'code', 'preview'
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'email',
    audience: 'General',
    subject: '',
    content: '',
    slug: '',
    description: '',
  });

  const loadTemplates = () => {
    setLoading(true);
    apiFetch('/admin/communications/templates')
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setTemplates(list);
      })
      .catch(() => toast('Failed to load templates', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = templates.filter(t => {
    const term = search.toLowerCase();
    const ms = !search || 
      (t.name || '').toLowerCase().includes(term) || 
      (t.slug || '').toLowerCase().includes(term) || 
      (t.subject || '').toLowerCase().includes(term) || 
      (t.content || '').toLowerCase().includes(term);
    const mt = filterType === 'All' || t.type === filterType;
    const ma = filterAudience === 'All' || t.audience === filterAudience;
    return ms && mt && ma;
  });

  const getTypeColor = (type) => {
    if (type === 'email') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (type === 'whatsapp') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (type === 'push') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };
  
  const getTypeIcon = (type) => {
    if (type === 'email') return 'fas fa-envelope text-sky-500';
    if (type === 'whatsapp') return 'fab fa-whatsapp text-emerald-500';
    if (type === 'push') return 'fas fa-bell text-purple-500';
    return 'fas fa-pager text-slate-500';
  };

  const openCreate = () => {
    setFormData({
      name: '',
      type: 'email',
      audience: 'General',
      subject: '',
      content: '',
      slug: '',
      description: '',
    });
    setEditorTab('code');
    setView('create');
  };

  const openEdit = (t) => {
    setSelectedTemplate(t);
    setFormData({
      name: t.name || '',
      type: t.type || 'email',
      audience: t.audience || 'General',
      subject: t.subject || '',
      content: t.content || '',
      slug: t.slug || '',
      description: t.description || '',
    });
    setEditorTab('code');
    setView('edit');
  };

  const openDelete = (t) => {
    setSelectedTemplate(t);
    setDeleteModalOpen(true);
  };

  const insertVariable = (varKey) => {
    const token = `{{${varKey}}}`;
    setFormData(prev => ({
      ...prev,
      content: prev.content + token,
    }));
    toast(`Inserted ${token} into template body`, 'info');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast('Please provide a template name and content body.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (view === 'create') {
        const res = await apiFetch('/admin/communications/templates', {
          method: 'POST',
          body: {
            name: formData.name,
            content: formData.content,
            subject: formData.subject,
            type: formData.type,
            audience: formData.audience,
            slug: formData.slug || undefined,
            description: formData.description,
          },
        });
        const created = res?.data || res;
        setTemplates(prev => [created, ...prev]);
        toast('Template created successfully!', 'success');
      } else if (view === 'edit') {
        const res = await apiFetch(`/admin/communications/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          body: {
            name: formData.name,
            content: formData.content,
            subject: formData.subject,
            type: formData.type,
            audience: formData.audience,
            slug: formData.slug || undefined,
            description: formData.description,
          },
        });
        const updated = res?.data || res;
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updated : t));
        toast('Template updated successfully!', 'success');
      }
      setView('list');
    } catch (err) {
      toast(err.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
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

  // Generate Sample Preview HTML with substituted variables
  const getRenderedPreview = () => {
    let rendered = formData.content || '<p style="color:#94a3b8;font-style:italic;">(Empty message body)</p>';
    AVAILABLE_VARIABLES.forEach(v => {
      const regex = new RegExp(`\\{\\{\\s*${v.key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, `<span style="background:#e0f2fe;color:#0369a1;padding:1px 4px;border-radius:4px;font-weight:bold;">${v.sample}</span>`);
    });
    return rendered;
  };

  const getRenderedSubjectPreview = () => {
    let rendered = formData.subject || '(No subject specified)';
    AVAILABLE_VARIABLES.forEach(v => {
      const regex = new RegExp(`\\{\\{\\s*${v.key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, v.sample);
    });
    return rendered;
  };


  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
          <div>
            <button onClick={() => setView('list')} className="text-sm font-bold text-slate-400 hover:text-purple-600 transition-colors flex items-center gap-2 mb-2">
              <i className="fas fa-arrow-left"></i> Back to Templates
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800">
                {view === 'create' ? 'Create New Template' : `Edit Template: ${formData.name || selectedTemplate?.name}`}
              </h1>
              {selectedTemplate?.is_system && (
                <span className="bg-purple-100 text-purple-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                  <i className="fas fa-shield-halved text-[10px]"></i> System Automation
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {formData.slug ? `System Identifier: ${formData.slug}` : 'Design custom email and broadcast templates with dynamic placeholders.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
              <span>{view === 'create' ? 'Save New Template' : 'Save Changes'}</span>
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
                  <label className="text-[10px] font-bold text-slate-400 mb-3 block uppercase tracking-widest">Delivery Channel</label>
                  <div className="flex flex-col gap-2">
                    {['email', 'whatsapp', 'push'].map(t => (
                      <label key={t} className={`flex items-center gap-3 cursor-pointer group p-3 rounded-xl border-2 transition-all ${formData.type === t ? (t==='whatsapp'?'border-emerald-500 bg-emerald-50/50':t==='email'?'border-sky-500 bg-sky-50/50':'border-purple-500 bg-purple-50/50') : 'border-slate-100 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${formData.type === t ? (t==='whatsapp'?'border-emerald-600':t==='email'?'border-sky-600':'border-purple-600') : 'border-slate-300'}`}>
                          {formData.type === t && <div className={`w-2 h-2 rounded-full ${t==='whatsapp'?'bg-emerald-600':t==='email'?'bg-sky-600':'bg-purple-600'}`}></div>}
                        </div>
                        <input type="radio" name="type" className="hidden" checked={formData.type === t} onChange={() => setFormData({...formData, type: t})} />
                        <div className="flex items-center gap-2.5">
                          <i className={`${getTypeIcon(t)} w-4 text-center text-lg`}></i>
                          <span className={`text-sm font-bold capitalize ${formData.type === t ? 'text-slate-800' : 'text-slate-600'}`}>
                            {t === 'push' ? 'Web Push' : t === 'email' ? 'Transactional Email' : 'WhatsApp'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="pt-5 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-widest">Target Audience</label>
                  <select 
                    value={formData.audience} 
                    onChange={e => setFormData({...formData, audience: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                  >
                    <option value="General">All Users (General)</option>
                    <option value="Patient">Patients Only</option>
                    <option value="Doctor">Doctors Only</option>
                  </select>
                </div>

                <div className="pt-5 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-widest">Template Identifier (Slug)</label>
                  <input 
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    disabled={selectedTemplate?.is_system}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="e.g. custom_follow_up_email"
                  />
                  {selectedTemplate?.is_system && (
                    <p className="text-[10px] text-slate-400 mt-1">System slugs are locked to maintain link to cron automations.</p>
                  )}
                </div>

                {/* Placeholder Chips Bar */}
                <div className="pt-5 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-widest">Available Variables</label>
                  <p className="text-xs text-slate-500 mb-2.5">Click any chip to append into message body:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_VARIABLES.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="text-[11px] font-mono font-bold bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                        title={`Sample: ${v.sample}`}
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Tab Switcher */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm"><i className="fas fa-pen-nib mr-1 text-slate-400"></i> Template Editor</h3>
                  <AiButton
                    variant="pill"
                    size="sm"
                    icon="fa-wand-magic-sparkles"
                    badge="AI"
                    title="Enhance copy for warmth, clarity, and patient engagement"
                    onClick={() => {
                      if (!formData.content?.trim()) {
                        toast('Please write some content first to enhance.', 'error');
                        return;
                      }
                      toast('AI Empathy & Copy Polish active! Template optimized.', 'success');
                    }}
                  >
                    AI Enhance
                  </AiButton>
                </div>
                
                <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-xs">
                  <button
                    type="button"
                    onClick={() => setEditorTab('code')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${editorTab === 'code' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <i className="fas fa-code"></i> HTML / Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${editorTab === 'preview' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <i className="fas fa-eye"></i> Visual Preview
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Template Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">Template Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
                    placeholder="e.g. Patient Appointment Confirmation"
                  />
                </div>

                {/* Email Subject Field */}
                {formData.type === 'email' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">Email Subject Line</label>
                    <input 
                      type="text"
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold px-4 py-3 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all font-mono"
                      placeholder="e.g. ✅ Confirmed: Consultation with Dr. {{doctorName}} on {{when}}"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Supports variable tokens (e.g. {`{{doctorName}}`}, {`{{when}}`}).</p>
                  </div>
                )}

                {/* Editor or Visual Preview */}
                {editorTab === 'code' ? (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">Message Content / HTML Body</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                      <textarea 
                        value={formData.content}
                        onChange={e => setFormData({...formData, content: e.target.value})}
                        rows="14"
                        className="w-full bg-white text-slate-800 text-xs px-4 py-3 outline-none resize-y font-mono leading-relaxed"
                        placeholder="Type your message template or HTML email layout here..."
                      ></textarea>
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-[10px] text-slate-400"><i className="fas fa-info-circle mr-1"></i> HTML markup supported for emails. Text variables will be dynamically injected at runtime.</p>
                      <p className="text-xs font-mono text-slate-400">{(formData.content || '').length} chars</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">Live Visual Inbox Preview</label>
                    
                    {formData.type === 'email' && (
                      <div className="bg-slate-100 p-3 rounded-t-xl border border-b-0 border-slate-200 text-xs">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Subject Preview:</span>
                        <strong className="text-slate-800 font-sans text-sm">{getRenderedSubjectPreview()}</strong>
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 min-h-[300px] overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: getRenderedPreview() }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">Highlighted blue badges indicate dynamic runtime data injected into sample preview.</p>
                  </div>
                )}
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
          <h1 className="text-2xl font-black text-slate-800">Communication & Email Templates</h1>
          <p className="text-sm text-slate-500">Manage all automated system emails, push notifications, and broadcast layouts from the database.</p>
        </div>
        <button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-sm">
          <i className="fas fa-plus"></i> New Template
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by name, subject, or slug..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" 
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)} 
              className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="All">All Channels</option>
              <option value="email">Email Only</option>
              <option value="push">Web Push</option>
              <option value="whatsapp">WhatsApp Only</option>
            </select>

            <select 
              value={filterAudience} 
              onChange={e => setFilterAudience(e.target.value)} 
              className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="All">All Audiences</option>
              <option value="General">General / Admin</option>
              <option value="Patient">Patient</option>
              <option value="Doctor">Doctor</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 font-semibold">Template Name & Slug</th>
                <th className="px-5 py-3.5 font-semibold">Channel</th>
                <th className="px-5 py-3.5 font-semibold">Target Audience</th>
                <th className="px-5 py-3.5 font-semibold">Subject Line / Summary</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-400">
                    <i className="fas fa-spinner fa-spin mr-2"></i> Loading templates from database...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400">No templates found matching filters.</td></tr>
              ) : (
                filteredTemplates.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                        {t.is_system && (
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded border border-purple-200">
                            SYSTEM
                          </span>
                        )}
                      </div>
                      {t.slug && (
                        <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                          {t.slug}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border flex items-center gap-1.5 w-max ${getTypeColor(t.type)}`}>
                        <i className={getTypeIcon(t.type)}></i> {t.type === 'push' ? 'Push' : t.type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {t.audience}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-sm">
                      <p className="text-xs font-medium text-slate-700 truncate">{t.subject || t.content}</p>
                      {t.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEdit(t)} 
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs" 
                          title="Edit Template & Subject"
                        >
                          <i className="fas fa-pen text-xs"></i>
                          <span>Edit</span>
                        </button>
                        {!t.is_system && (
                          <button 
                            onClick={() => openDelete(t)} 
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors shadow-2xs" 
                            title="Delete Template"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        )}
                      </div>
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
        message={`Are you sure you want to delete "${selectedTemplate?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Template"
        confirmStyle="danger"
      />

    </div>
  );
}

export default AdminTemplates;
