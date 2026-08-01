import React, { useState, useRef } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

/* ─── Dummy Data ─────────────────────────────── */
const INITIAL_DOCS = [
  { id: 1, name: 'Hormonal_Panel_Aug2023.pdf', type: 'pdf', size: '1.2 MB', date: '15 Aug 2023', lab: 'Dr. Lal PathLabs', icon: 'fa-file-pdf', color: 'bg-rose-50 text-rose-500' },
  { id: 2, name: 'Pelvic_Ultrasound_Scan.jpg', type: 'image', size: '3.8 MB', date: '10 Aug 2023', lab: 'City Scans', icon: 'fa-image', color: 'bg-indigo-50 text-indigo-500' },
  { id: 3, name: 'CBC_Report_Jan2024.pdf', type: 'pdf', size: '0.8 MB', date: '05 Jan 2024', lab: 'Apollo Diagnostics', icon: 'fa-file-pdf', color: 'bg-rose-50 text-rose-500' },
  { id: 4, name: 'Thyroid_Panel_Mar2024.pdf', type: 'pdf', size: '1.1 MB', date: '20 Mar 2024', lab: 'Dr. Lal PathLabs', icon: 'fa-file-pdf', color: 'bg-rose-50 text-rose-500' },
];

const INITIAL_ALLERGIES = ['Penicillin'];
const INITIAL_CONDITIONS = ['PCOS', 'Insulin Resistance'];
const INITIAL_VACCINES = [
  { name: 'HPV Vaccine (Gardasil 9)', doses: 'Dose 1: 12 Jan 2020 • Dose 2: 15 Mar 2020', done: true },
  { name: 'COVID-19 (Covishield)', doses: 'Fully Vaccinated + Booster', done: true },
];
const INITIAL_CONTACTS = [
  { name: 'Rahul Sharma', relation: 'Husband', phone: '+91 98765 43210' },
  { name: 'Dr. Vivek Joshi', relation: 'Family Physician', phone: '+91 98765 43211' },
];

/* ─── File Preview Modal ─────────────────────── */
function FilePreviewModal({ file, onClose, onDownload }) {
  if (!file) return null;
  return (
    <Modal isOpen={!!file} onClose={onClose} title={file.name} size="lg">
      <div className="space-y-4">
        <div className="bg-slate-100 rounded-2xl aspect-video flex flex-col items-center justify-center gap-3 border border-slate-200">
          <i className={`fas ${file.icon} text-6xl ${file.color.split(' ')[1]}`}></i>
          <p className="text-sm text-slate-500 font-medium">{file.name}</p>
          <p className="text-xs text-slate-400">{file.size} • {file.date}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-slate-400 font-bold mb-0.5">Laboratory</p>
            <p className="font-bold text-slate-800">{file.lab}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-slate-400 font-bold mb-0.5">Upload Date</p>
            <p className="font-bold text-slate-800">{file.date}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => { onDownload(file.name); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-download"></i> Download
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

/* ─── Insurance Modal ────────────────────────── */
function InsuranceModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ provider: 'Star Health Comprehensive', policy: 'SH-9823-1102', validity: '2025-12' });
  const handle = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Insurance Policy" size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Insurance Provider</label>
          <input value={form.provider} onChange={e => handle('provider', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Policy Number</label>
          <input value={form.policy} onChange={e => handle('policy', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Valid Till</label>
          <input type="month" value={form.validity} onChange={e => handle('validity', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Save</button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientRecords() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('documents');

  // Documents
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Profile
  const [allergies, setAllergies] = useState(INITIAL_ALLERGIES);
  const [conditions, setConditions] = useState(INITIAL_CONDITIONS);
  const [newAllergy, setNewAllergy] = useState('');
  const [showAllergyInput, setShowAllergyInput] = useState(false);
  const [vaccines, setVaccines] = useState(INITIAL_VACCINES);
  const [showVaccineModal, setShowVaccineModal] = useState(false);

  // Insurance
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [insurance, setInsurance] = useState({ provider: 'Star Health Comprehensive', policy: 'SH-9823-1102', validity: 'Dec 2025' });
  const [deleteContactTarget, setDeleteContactTarget] = useState(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newDocs = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      type: f.type.includes('pdf') ? 'pdf' : 'image',
      size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      lab: 'Uploaded by Patient',
      icon: f.type.includes('pdf') ? 'fa-file-pdf' : 'fa-image',
      color: f.type.includes('pdf') ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500',
    }));
    setDocs(prev => [...newDocs, ...prev]);
    toast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully!`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDoc = () => {
    setDocs(prev => prev.filter(d => d.id !== deleteTarget.id));
    toast('Document deleted from your vault.', 'info');
    setDeleteTarget(null);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setAllergies(prev => [...prev, newAllergy.trim()]);
      toast(`Allergy "${newAllergy.trim()}" added to your profile.`, 'success');
      setNewAllergy('');
      setShowAllergyInput(false);
    }
  };

  const removeAllergy = (a) => {
    setAllergies(prev => prev.filter(x => x !== a));
    toast(`Allergy "${a}" removed.`, 'info');
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

              {/* Documents Grid */}
              <div className="grid md:grid-cols-2 gap-3">
                {docs.map(doc => (
                  <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-md hover:border-aubergine-200 transition-all group">
                    <div className={`w-12 h-12 ${doc.color} rounded-xl flex items-center justify-center text-2xl shrink-0 border border-slate-100`}>
                      <i className={`fas ${doc.icon}`}></i>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-slate-800 truncate text-sm">{doc.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.date} • {doc.lab}</p>
                      <p className="text-xs text-slate-400">{doc.size}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setPreviewFile(doc)} className="w-8 h-8 rounded-lg bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-600 flex items-center justify-center text-xs transition-colors" title="Preview">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button onClick={() => toast(`Downloading ${doc.name}...`, 'info')} className="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center text-xs transition-colors" title="Download">
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
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center justify-between">
                  Medical History
                  <button onClick={() => toast('Medical history saved', 'success')} className="text-xs text-aubergine-600 font-semibold hover:underline">Save</button>
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
                        <button onClick={() => setShowAllergyInput(false)} className="text-slate-400 hover:text-slate-600 px-2"><i className="fas fa-xmark"></i></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAllergyInput(true)} className="text-xs text-aubergine-600 hover:text-aubergine-700 font-bold flex items-center gap-1">
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
                          <button onClick={() => { setConditions(prev => prev.filter(x => x !== c)); toast(`Removed "${c}" from conditions.`, 'info'); }} className="text-slate-400 hover:text-slate-600"><i className="fas fa-xmark text-[10px]"></i></button>
                        </span>
                      ))}
                      <button onClick={() => { const c = prompt('Add condition:'); if (c) { setConditions(prev => [...prev, c]); toast(`Added "${c}"`, 'success'); } }}
                        className="text-xs text-aubergine-600 font-bold flex items-center gap-1"><i className="fas fa-plus"></i> Add</button>
                    </div>
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
              {/* Insurance Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
                <i className="fas fa-shield-heart absolute -right-4 -bottom-4 text-8xl text-indigo-500/10"></i>
                <div className="flex justify-between items-start mb-5">
                  <h3 className="font-black text-indigo-900 text-lg">Health Insurance</h3>
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                </div>
                <div className="space-y-3 relative z-10">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Provider</div>
                    <div className="font-bold text-slate-800">{insurance.provider}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Policy Number</div>
                      <div className="font-mono font-bold text-slate-800">{insurance.policy}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Valid Till</div>
                      <div className="font-bold text-slate-800">{insurance.validity}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowInsuranceModal(true)}
                    className="flex-1 bg-white text-indigo-600 font-bold px-4 py-2 rounded-xl text-sm shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors">
                    <i className="fas fa-pen mr-1.5"></i> Update Policy
                  </button>
                  <button onClick={() => toast('Insurance card downloaded!', 'success')}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-4 py-2 rounded-xl text-sm border border-indigo-200 transition-colors">
                    <i className="fas fa-download"></i>
                  </button>
                </div>
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
                  {contacts.map((c, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-aubergine-200 transition-colors group">
                      <div>
                        <h4 className="font-bold text-slate-800">{c.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{c.relation} • {c.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${c.phone.replace(/\s/g, '')}`}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-emerald-100">
                          <i className="fas fa-phone text-sm"></i>
                        </a>
                        <button onClick={() => setDeleteContactTarget(i)}
                          className="opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 hover:bg-rose-100 w-9 h-9 rounded-full flex items-center justify-center transition-all border border-rose-100">
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
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={name => toast(`Downloading ${name}...`, 'info')} />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteDoc}
        title="Delete Document?"
        message={`"${deleteTarget?.name}" will be permanently removed from your vault.`}
        confirmLabel="Delete"
        confirmStyle="danger"
      />
      <AddContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} onAdd={c => { setContacts(prev => [...prev, c]); toast(`${c.name} added as emergency contact.`, 'success'); }} />
      <AddVaccineModal isOpen={showVaccineModal} onClose={() => setShowVaccineModal(false)} onAdd={v => { setVaccines(prev => [...prev, v]); toast(`Vaccination record for "${v.name}" added.`, 'success'); }} />
      <InsuranceModal isOpen={showInsuranceModal} onClose={() => setShowInsuranceModal(false)}
        onSave={data => {
          setInsurance({ provider: data.provider, policy: data.policy, validity: data.validity });
          setShowInsuranceModal(false);
          toast('Insurance details updated.', 'success');
        }} />
      <ConfirmModal
        isOpen={deleteContactTarget !== null}
        onClose={() => setDeleteContactTarget(null)}
        onConfirm={() => { setContacts(prev => prev.filter((_, i) => i !== deleteContactTarget)); toast('Contact removed.', 'info'); setDeleteContactTarget(null); }}
        title="Remove Contact?"
        message={`Remove ${contacts[deleteContactTarget]?.name} from your emergency contacts?`}
        confirmLabel="Remove"
        confirmStyle="danger"
      />
    </div>
  );
}

export default PatientRecords;
