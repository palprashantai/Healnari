import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const FILE_STYLE = {
  pdf: { icon: 'fa-file-pdf', color: 'bg-rose-50 text-rose-500' },
  image: { icon: 'fa-image', color: 'bg-indigo-50 text-indigo-500' },
};

/* ─── File Preview Modal ─────────────────────── */
function FilePreviewModal({ file, onClose, onDownload }) {
  if (!file) return null;
  return (
    <Modal isOpen={!!file} onClose={onClose} title={file.name} size="lg">
      <div className="space-y-4">
        {/* Document Header Metadata Bar */}
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-mono">
          <span className="flex items-center gap-2 text-emerald-400 font-bold">
            <i className="fas fa-shield-check"></i> Stored in Your Vault
          </span>
          <span className="text-slate-500">{file.type?.toUpperCase() || 'FILE'}</span>
        </div>

        <div className="bg-slate-100 rounded-2xl aspect-video flex flex-col items-center justify-center gap-3 border border-slate-200 relative overflow-hidden group">
          <i className={`fas ${file.icon} text-6xl ${file.color.split(' ')[1]}`}></i>
          <p className="text-sm text-slate-700 font-bold">{file.name}</p>
          <p className="text-xs text-slate-500">{file.size} • Uploaded {file.date}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-slate-500 font-bold mb-0.5">Laboratory Provider</p>
            <p className="font-bold text-slate-800">{file.lab}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-slate-500 font-bold mb-0.5">Upload & Verification</p>
            <p className="font-bold text-slate-800">{file.date}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-slate-500 font-bold mb-0.5">Security & Compliance</p>
            <p className="font-bold text-emerald-700 flex items-center gap-1">
              <i className="fas fa-lock text-[10px]"></i> AES-256 Encrypted
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => { onDownload(file.name); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-download"></i> Download Original File
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add Contact Modal ──────────────────────── */
function AddContactModal({ isOpen, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', relation: 'Family Member', phone: '' });
  const handle = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const submit = (e) => { e.preventDefault(); if (form.name && form.phone) { onAdd(form); setForm({ name: '', relation: 'Family Member', phone: '' }); onClose(); } };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Emergency Contact" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Full Name *</label>
          <input required value={form.name} onChange={e => handle('name', e.target.value)} placeholder="Contact name"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Relationship</label>
          <select value={form.relation} onChange={e => handle('relation', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            {['Husband/Partner', 'Parent', 'Sibling', 'Friend', 'Family Member', 'Caregiver', 'Family Physician'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Phone Number *</label>
          <input required value={form.phone} onChange={e => handle('phone', e.target.value)} placeholder="+91 98765 43210" type="tel"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <button type="submit" className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          Add Contact
        </button>
      </form>
    </Modal>
  );
}

/* ─── Add Vaccine Modal ──────────────────────── */
function AddVaccineModal({ isOpen, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', doses: '' });
  const submit = (e) => { e.preventDefault(); if (form.name) { onAdd({ ...form, done: true }); setForm({ name: '', doses: '' }); onClose(); } };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Vaccination Record" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Vaccine Name *</label>
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Hepatitis B"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Dose Details</label>
          <input value={form.doses} onChange={e => setForm(p => ({ ...p, doses: e.target.value }))} placeholder="e.g. Dose 1: Jan 2020"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <button type="submit" className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          Save Record
        </button>
      </form>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientRecords() {
  const toast = useToast();
  const { user } = useAuth();
  const { patients, updatePatient } = useClinicData();
  const myPatient = patients[0];
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('documents');

  // Documents
  const [rawDocs, setRawDocs] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [docSearch, setDocSearch] = useState('');

  const loadDocs = () => apiFetch(`/records/documents/${user.id}`).then(setRawDocs).catch(err => toast(err.message || 'Failed to load documents', 'error'));
  const loadVaccines = () => apiFetch(`/records/vaccinations/${user.id}`).then(setRawVaccines).catch(err => toast(err.message || 'Failed to load vaccinations', 'error'));
  const loadContacts = () => apiFetch(`/records/emergency-contacts/${user.id}`).then(setRawContacts).catch(err => toast(err.message || 'Failed to load contacts', 'error'));

  const docs = rawDocs.map(d => ({
    id: d.id,
    name: d.file_name,
    type: d.file_type,
    size: d.size_bytes ? (d.size_bytes / 1024 / 1024).toFixed(1) + ' MB' : '—',
    date: new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    lab: d.lab_name || 'Uploaded by Patient',
    icon: (FILE_STYLE[d.file_type] || FILE_STYLE.pdf).icon,
    color: (FILE_STYLE[d.file_type] || FILE_STYLE.pdf).color,
  }));

  const filteredDocs = docs.filter(doc => !docSearch || doc.name.toLowerCase().includes(docSearch.toLowerCase()) || doc.lab.toLowerCase().includes(docSearch.toLowerCase()));

  // Profile
  const allergies = myPatient?.allergies || [];
  const conditions = myPatient?.medicalHistory?.chronicConditions || [];
  const [newAllergy, setNewAllergy] = useState('');
  const [showAllergyInput, setShowAllergyInput] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [showConditionInput, setShowConditionInput] = useState(false);
  const [rawVaccines, setRawVaccines] = useState([]);
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const vaccines = rawVaccines.map(v => ({ name: v.name, doses: v.doses, done: v.completed }));

  // Insurance — no backend table yet, so there is no real per-patient policy
  // to show. Previously this rendered the same fabricated provider/policy
  // number/expiry for every patient with an "Active" badge, which could be
  // mistaken for real data instead of a not-yet-built feature.
  const [rawContacts, setRawContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [deleteContactTarget, setDeleteContactTarget] = useState(null);
  const contacts = rawContacts.map(c => ({ id: c.id, name: c.name, relation: c.relation, phone: c.phone }));

  useEffect(() => { if (user?.id) { loadDocs(); loadVaccines(); loadContacts(); } }, [user?.id]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const results = await Promise.allSettled(files.map(f => apiFetch('/records/documents', {
      method: 'POST',
      body: {
        patientId: user.id,
        fileName: f.name,
        fileType: f.type.includes('pdf') ? 'pdf' : 'image',
        sizeBytes: f.size,
        labName: 'Uploaded by Patient',
      },
    })));
    await loadDocs(); // always reload — some files may have succeeded even if others failed
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (failed === 0) {
      toast(`${succeeded} file${succeeded > 1 ? 's' : ''} uploaded successfully!`, 'success');
    } else if (succeeded === 0) {
      toast(`Upload failed for all ${failed} file${failed > 1 ? 's' : ''}.`, 'error');
    } else {
      toast(`${succeeded} uploaded, ${failed} failed. Please retry the failed file(s).`, 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDoc = async () => {
    const name = deleteTarget.name;
    try {
      await apiFetch(`/records/documents/${deleteTarget.id}`, { method: 'DELETE' });
      await loadDocs();
      toast('Document deleted from your vault.', 'info');
    } catch (err) {
      toast(err.message || 'Failed to delete document', 'error');
    }
    setDeleteTarget(null);
  };

  const addAllergy = async () => {
    const value = newAllergy.trim();
    if (!value || !myPatient) return;
    try {
      await updatePatient({ ...myPatient, allergies: [...allergies, value] });
      toast(`Allergy "${value}" added to your profile.`, 'success');
      setNewAllergy('');
      setShowAllergyInput(false);
    } catch (err) {
      toast(err.message || 'Failed to add allergy', 'error');
    }
  };

  const addCondition = async () => {
    const value = newCondition.trim();
    if (!value || !myPatient) return;
    try {
      await updatePatient({ ...myPatient, medicalHistory: { ...myPatient.medicalHistory, chronicConditions: [...conditions, value] } });
      toast(`Added "${value}" to conditions.`, 'success');
      setNewCondition('');
      setShowConditionInput(false);
    } catch (err) {
      toast(err.message || 'Failed to add condition', 'error');
    }
  };

  const removeAllergy = async (a) => {
    try {
      await updatePatient({ ...myPatient, allergies: allergies.filter(x => x !== a) });
      toast(`Allergy "${a}" removed.`, 'info');
    } catch (err) {
      toast(err.message || 'Failed to remove allergy', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Medical Vault</h1>
          <p className="text-sm text-slate-500">Securely store your health profile, records, and insurance details.</p>
        </div>
        <div className="flex items-center gap-2 bg-aubergine-50 border border-aubergine-200 px-4 py-2 rounded-xl text-aubergine-700 text-xs font-bold">
          <i className="fas fa-lock"></i> 256-bit Encrypted
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            ['profile', 'Health Profile', 'fa-notes-medical'],
            ['documents', 'Digital Records', 'fa-folder-open'],
            ['insurance', 'Insurance & Emergency', 'fa-shield-heart'],
          ].map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <i className={`fas ${icon} text-xs`}></i> {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── DOCUMENTS TAB ── */}
          {tab === 'documents' && (
            <div className="space-y-5">
              {/* Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-aubergine-200 rounded-2xl p-6 bg-aubergine-50/30 hover:bg-aubergine-50 hover:border-aubergine-400 transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-4 group">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-aubergine-600 shadow-sm border border-aubergine-100 group-hover:scale-110 transition-transform">
                  <i className="fas fa-cloud-arrow-up text-xl"></i>
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="font-bold text-aubergine-800">Upload New Record</h3>
                  <p className="text-xs text-aubergine-600/80">Supports PDF, JPG, PNG up to 10MB. Click anywhere to browse.</p>
                </div>
                <span className="bg-aubergine-600 text-white font-bold px-5 py-2 rounded-xl text-sm group-hover:bg-aubergine-700 transition-colors">Browse Files</span>
              </div>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />

              <div className="relative">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search documents or lab name..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-sm" />
              </div>

              {/* Documents Grid */}
              <div className="grid md:grid-cols-2 gap-3">
                {filteredDocs.length === 0 && (
                  <div className="col-span-full text-center py-10 text-slate-500 text-sm border border-slate-200 rounded-xl bg-slate-50">
                    No documents found matching "{docSearch}".
                  </div>
                )}
                {filteredDocs.map(doc => (
                  <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-md hover:border-aubergine-200 transition-all group">
                    <div className={`w-12 h-12 ${doc.color} rounded-xl flex items-center justify-center text-2xl shrink-0 border border-slate-100`}>
                      <i className={`fas ${doc.icon}`}></i>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-slate-800 truncate text-sm">{doc.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.date} • {doc.lab}</p>
                      <p className="text-xs text-slate-500">{doc.size}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      <button onClick={() => setPreviewFile(doc)} className="w-8 h-8 rounded-lg bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-600 flex items-center justify-center text-xs transition-colors" title="Preview">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button onClick={() => toast('File download is coming soon.', 'info')} className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center text-xs transition-colors" title="Download">
                        <i className="fas fa-download"></i>
                      </button>
                      <button onClick={() => setDeleteTarget(doc)} className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center text-xs transition-colors" title="Delete">
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HEALTH PROFILE TAB ── */}
          {tab === 'profile' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                  Medical History
                </h3>
                <div className="space-y-4">
                  {/* Allergies */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Known Allergies</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {allergies.map(a => (
                        <span key={a} className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                          {a}
                          <button onClick={() => removeAllergy(a)} className="text-rose-400 hover:text-rose-600"><i className="fas fa-xmark text-[10px]"></i></button>
                        </span>
                      ))}
                    </div>
                    {showAllergyInput ? (
                      <div className="flex gap-2">
                        <input value={newAllergy} onChange={e => setNewAllergy(e.target.value)} placeholder="Type allergy..." onKeyDown={e => e.key === 'Enter' && addAllergy()}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300" autoFocus />
                        <button onClick={addAllergy} className="bg-aubergine-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Add</button>
                        <button onClick={() => setShowAllergyInput(false)} className="text-slate-500 hover:text-slate-600 px-2"><i className="fas fa-xmark"></i></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAllergyInput(true)} disabled={!myPatient}
                        className="text-xs text-aubergine-600 hover:text-aubergine-700 font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i className="fas fa-plus"></i> Add Allergy
                      </button>
                    )}
                  </div>

                  {/* Conditions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Chronic Conditions</label>
                    <div className="flex flex-wrap gap-2">
                      {conditions.map(c => (
                        <span key={c} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                          {c}
                          <button onClick={async () => {
                          try {
                            await updatePatient({ ...myPatient, medicalHistory: { ...myPatient.medicalHistory, chronicConditions: conditions.filter(x => x !== c) } });
                            toast(`Removed "${c}" from conditions.`, 'info');
                          } catch (err) {
                            toast(err.message || 'Failed to remove condition', 'error');
                          }
                        }} className="text-slate-500 hover:text-slate-600"><i className="fas fa-xmark text-[10px]"></i></button>
                        </span>
                      ))}
                    </div>
                    {showConditionInput ? (
                      <div className="flex gap-2 mt-2">
                        <input value={newCondition} onChange={e => setNewCondition(e.target.value)} placeholder="Type condition..." onKeyDown={e => e.key === 'Enter' && addCondition()}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300" autoFocus />
                        <button onClick={addCondition} className="bg-aubergine-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Add</button>
                        <button onClick={() => setShowConditionInput(false)} className="text-slate-500 hover:text-slate-600 px-2"><i className="fas fa-xmark"></i></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowConditionInput(true)} disabled={!myPatient}
                        className="mt-2 text-xs text-aubergine-600 hover:text-aubergine-700 font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i className="fas fa-plus"></i> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center justify-between">
                  Vaccination History
                  <button onClick={() => setShowVaccineModal(true)} className="text-xs text-aubergine-600 font-semibold flex items-center gap-1 hover:underline">
                    <i className="fas fa-plus"></i> Add
                  </button>
                </h3>
                <div className="space-y-3">
                  {vaccines.map((v, i) => (
                    <div key={i} className="flex justify-between items-start p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-200 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{v.name}</h4>
                        <p className="text-xs text-slate-500">{v.doses}</p>
                      </div>
                      <i className="fas fa-circle-check text-emerald-500 text-xl shrink-0 mt-0.5"></i>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── INSURANCE TAB ── */}
          {tab === 'insurance' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Insurance Card — no backend table yet, so this is an honest
                  empty state rather than a fabricated policy. */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
                <i className="fas fa-shield-heart absolute -right-4 -bottom-4 text-8xl text-indigo-500/10"></i>
                <div className="flex justify-between items-start mb-5">
                  <h3 className="font-black text-indigo-900 text-lg">Health Insurance</h3>
                  <span className="bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Not on File</span>
                </div>
                <p className="text-sm text-slate-600 relative z-10 mb-5">
                  No insurance policy is on file yet. This feature is coming soon — for now, please share your policy details with the clinic directly.
                </p>
                <button onClick={() => toast('Adding insurance details online is coming soon. Please contact the clinic to add your policy.', 'info')}
                  className="w-full bg-white text-indigo-600 font-bold px-4 py-2 rounded-xl text-sm shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors">
                  <i className="fas fa-plus mr-1.5"></i> Add Insurance Details
                </button>
              </div>

              {/* Emergency Contacts */}
              <div>
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex justify-between items-center">
                  Emergency Contacts
                  <button onClick={() => setShowContactModal(true)} className="text-aubergine-600 hover:text-aubergine-700 text-sm font-bold flex items-center gap-1">
                    <i className="fas fa-plus"></i> Add
                  </button>
                </h3>
                <div className="space-y-3">
                  {contacts.map((c) => (
                    <div key={c.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-aubergine-200 transition-colors group">
                      <div>
                        <h4 className="font-bold text-slate-800">{c.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{c.relation} • {c.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${c.phone.replace(/\s/g, '')}`}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-emerald-100">
                          <i className="fas fa-phone text-sm"></i>
                        </a>
                        <button onClick={() => setDeleteContactTarget(c)} aria-label="Remove contact"
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 bg-rose-50 text-rose-500 hover:bg-rose-100 w-9 h-9 rounded-full flex items-center justify-center transition-all border border-rose-100">
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={() => toast('File download is coming soon.', 'info')} />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteDoc}
        title="Delete Document?"
        message={`"${deleteTarget?.name}" will be permanently removed from your vault.`}
        confirmLabel="Delete"
        confirmStyle="danger"
      />
      <AddContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} onAdd={async c => {
        try {
          await apiFetch('/records/emergency-contacts', { method: 'POST', body: { patientId: user.id, name: c.name, relation: c.relation, phone: c.phone } });
          await loadContacts();
          toast(`${c.name} added as emergency contact.`, 'success');
        } catch (err) {
          toast(err.message || 'Failed to add contact', 'error');
        }
      }} />
      <AddVaccineModal isOpen={showVaccineModal} onClose={() => setShowVaccineModal(false)} onAdd={async v => {
        try {
          await apiFetch('/records/vaccinations', { method: 'POST', body: { patientId: user.id, name: v.name, doses: v.doses, completed: true } });
          await loadVaccines();
          toast(`Vaccination record for "${v.name}" added.`, 'success');
        } catch (err) {
          toast(err.message || 'Failed to add vaccination', 'error');
        }
      }} />
      <ConfirmModal
        isOpen={!!deleteContactTarget}
        onClose={() => setDeleteContactTarget(null)}
        onConfirm={async () => {
          try {
            await apiFetch(`/records/emergency-contacts/${deleteContactTarget.id}`, { method: 'DELETE' });
            await loadContacts();
            toast('Contact removed.', 'info');
          } catch (err) {
            toast(err.message || 'Failed to remove contact', 'error');
          }
          setDeleteContactTarget(null);
        }}
        title="Remove Contact?"
        message={`Remove ${deleteContactTarget?.name} from your emergency contacts?`}
        confirmLabel="Remove"
        confirmStyle="danger"
      />
    </div>
  );
}

export default PatientRecords;
