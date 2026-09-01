import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { buildPatientTimeline } from '../../lib/patientTimeline.js';
import { AIButton } from '../../components/AiButton.jsx';
import { AIPaywallModal } from '../../components/ai/AIPaywallModal.jsx';
import { AISubscriptionCard } from '../../components/ai/AISubscriptionCard.jsx';

const FILE_STYLE = {
  pdf: { icon: 'fa-file-pdf', color: 'bg-rose-50 text-rose-500' },
  image: { icon: 'fa-image', color: 'bg-aubergine-50 text-aubergine-600' },
};

const LAB_REPORT_CATEGORIES = [
  'Blood Test', 'Urine Test', 'Stool Test', 'Hormone Test', 'Diabetes', 'Lipid Profile',
  'Vitamin Test', 'Thyroid', 'Pregnancy', 'PCOS', 'PCOD', 'Ultrasound', 'MRI', 'CT Scan',
  'X-Ray', 'ECG', 'ECHO', 'Biopsy', 'Histopathology', 'Genetic Test', 'Others',
];

/* ─── Upload Lab Report Modal ─────────────────── */
function UploadLabReportModal({ isOpen, onClose, onUpload, presetRequest }) {
  const [file, setFile] = useState(null);
  const [testName, setTestName] = useState('');
  const [testCategory, setTestCategory] = useState(LAB_REPORT_CATEGORIES[0]);
  const [labName, setLabName] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTestName(presetRequest ? presetRequest.requested_tests : '');
      setTestCategory(LAB_REPORT_CATEGORIES[0]);
      setLabName('');
      setReportDate('');
      setNotes('');
    }
  }, [isOpen, presetRequest]);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const MAX_SIZE = 15 * 1024 * 1024;

  const handleFile = (f) => {
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) { toast('Only PDF, JPG, or PNG files are supported.', 'error'); return; }
    if (f.size > MAX_SIZE) { toast('File is too large. Maximum size is 15MB.', 'error'); return; }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { toast('Please attach your report file.', 'error'); return; }
    if (!presetRequest && !testName.trim()) { toast('Enter the report/test name.', 'error'); return; }
    setSubmitting(true);
    try {
      await onUpload(file, {
        testName: testName.trim() || undefined,
        testCategory,
        labName: labName.trim() || undefined,
        reportDate: reportDate || undefined,
        notes: notes.trim() || undefined,
        requestId: presetRequest?.id,
      });
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to upload report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={presetRequest ? `Upload: ${presetRequest.requested_tests}` : 'Upload Lab Report'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div
          onClick={() => document.getElementById('lab-report-file-input')?.click()}
          className="border-2 border-dashed border-aubergine-200 rounded-2xl p-5 bg-aubergine-50/30 hover:bg-aubergine-50 hover:border-aubergine-400 transition-all cursor-pointer text-center">
          <i className="fas fa-cloud-arrow-up text-2xl text-aubergine-600 mb-2"></i>
          <p className="text-sm font-bold text-aubergine-800">{file ? file.name : 'Click to select PDF, JPG, or PNG'}</p>
          <p className="text-xs text-aubergine-600/80 mt-0.5">Max 15MB</p>
          <input id="lab-report-file-input" type="file" accept="application/pdf,image/jpeg,image/png" className="hidden"
            onChange={e => handleFile(e.target.files?.[0])} />
        </div>

        {!presetRequest && (
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Report / Test Name *</label>
            <input required value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Complete Blood Count"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Category</label>
            <select value={testCategory} onChange={e => setTestCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
              {LAB_REPORT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Test Date</label>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Lab Name</label>
          <input value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. Dr. Lal PathLabs"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything your doctor should know..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {submitting ? 'Uploading…' : 'Upload Report'}
        </button>
      </form>
    </Modal>
  );
}

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
  const { patients, appointments, updatePatient, uploadLabReport, deleteLabReport, getLabReportUrl, listLabReportRequests } = useClinicData();
  const myPatient = patients[0];
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('documents');

  // Single chronological timeline of everything on file for this patient —
  // built entirely from data other tabs already fetch (no new backend call),
  // so a doctor's note, a prescription, a lab report, and the appointment
  // that prompted them show up as one connected story instead of scattered
  // across four separate places.
  const timeline = useMemo(() => buildPatientTimeline(myPatient, appointments), [myPatient, appointments]);

  // Lab Reports
  const [rawLabReports, setRawLabReports] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [uploadModalRequest, setUploadModalRequest] = useState(undefined); // undefined = closed, null = free upload, object = fulfilling a request
  const [deleteLabTarget, setDeleteLabTarget] = useState(null);

  const loadLabReports = () => apiFetch('/records/lab-reports').then(setRawLabReports).catch(err => toast(err.message || 'Failed to load lab reports', 'error'));
  const loadLabRequests = () => listLabReportRequests().then(r => setLabRequests(r.filter(x => x.status === 'Pending'))).catch(() => setLabRequests([]));

  // AI Lab Report Decoder State
  const [aiLabModalOpen, setAiLabModalOpen] = useState(false);
  const [aiLabLoading, setAiLabLoading] = useState(false);
  const [aiLabData, setAiLabData] = useState(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallInfo, setPaywallInfo] = useState(null);

  const handleExplainWithAi = async (report) => {
    setAiLabModalOpen(true);
    setAiLabLoading(true);
    setAiLabData(null);
    try {
      const promptText = `Test: ${report.test_name}\nCategory: ${report.test_category || 'General'}\nLab: ${report.lab_name || 'Not specified'}\nNotes / Findings: ${report.notes || report.interpretation || 'Standard diagnostic panel'}`;
      const res = await apiFetch('/ai/lab-analysis', {
        method: 'POST',
        body: {
          reportText: promptText,
          reportName: report.test_name,
        },
      });
      const data = res?.data || res;
      setAiLabData(data);
    } catch (err) {
      setAiLabModalOpen(false);
      if (err?.paywallData || err?.status === 402 || err?.message?.toLowerCase()?.includes('premium') || err?.message?.toLowerCase()?.includes('allowance')) {
        setPaywallInfo(err.paywallData || {
          title: 'Unlock AI Lab Report Decoder',
          description: 'Get clear, plain-English biomarker interpretations, reference range explanations, and intelligent questions for your doctor.',
          planName: 'HealNari AI Premium',
          features: [
            'Unlimited AI Lab Report Explanations',
            'Cycle-phase calibrated hormone evaluation',
            'Personalized smart questions to ask your doctor',
            '200 AI Health Companion inquiries / month',
          ],
        });
        setShowPaywallModal(true);
      } else {
        toast(err.message || 'Failed to analyze lab report with AI', 'error');
      }
    } finally {
      setAiLabLoading(false);
    }
  };

  const viewLabReport = async (report) => {
    try {
      const { url } = await getLabReportUrl(report.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast(err.message || 'Failed to open report', 'error');
    }
  };

  const handleDeleteLabReport = async () => {
    try {
      await deleteLabReport(deleteLabTarget.id);
      await Promise.all([loadLabReports(), loadLabRequests()]);
      toast('Report removed.', 'info');
    } catch (err) {
      toast(err.message || 'Failed to delete report', 'error');
    }
    setDeleteLabTarget(null);
  };

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

  useEffect(() => { if (user?.id) { loadDocs(); loadVaccines(); loadContacts(); loadLabReports(); loadLabRequests(); } }, [user?.id]);

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
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto hide-scrollbar">
          {[
            ['timeline', 'Timeline', 'fa-timeline'],
            ['profile', 'Health Profile', 'fa-notes-medical'],
            ['documents', 'Digital Records', 'fa-folder-open'],
            ['labReports', 'Lab Reports', 'fa-flask', labRequests.length],
            ['insurance', 'Insurance & Emergency', 'fa-shield-heart'],
          ].map(([key, label, icon, badge]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <i className={`fas ${icon} text-xs`}></i> {label}
              {!!badge && <span className="bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{badge}</span>}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">

          {/* ── TIMELINE TAB ── */}
          {tab === 'timeline' && (
            <div>
              {timeline.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <i className="fas fa-timeline text-3xl mb-3 block text-slate-300"></i>
                  <p className="font-bold text-sm">Nothing on file yet.</p>
                  <p className="text-xs mt-1">Your appointments, prescriptions, lab reports, and doctor's notes will appear here as one timeline.</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {timeline.map((e, i) => (
                    <div key={e.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${e.color}`}>
                          <i className={`fas ${e.icon} text-xs`}></i>
                        </div>
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1"></div>}
                      </div>
                      <div className="pb-6 flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {new Date(e.dateRaw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="font-bold text-slate-800 text-sm">{e.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{e.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                      <button onClick={() => toast('File download is coming soon.', 'info')} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs transition-colors" title="Download">
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

          {/* ── LAB REPORTS TAB ── */}
          {tab === 'labReports' && (
            <div className="space-y-5">
              <AISubscriptionCard userRole="patient" />

              {labRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 text-sm">Requested by your doctor</h3>
                  {labRequests.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{r.requested_tests}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by Dr. {r.doctor_name}{r.due_date ? ` • Due ${new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                        </p>
                        {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
                      </div>
                      <button onClick={() => setUploadModalRequest(r)}
                        className="shrink-0 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors">
                        Upload
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Your Reports</h3>
                <button onClick={() => setUploadModalRequest(null)}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5">
                  <i className="fas fa-plus"></i> Upload Report
                </button>
              </div>

              {rawLabReports.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm border border-slate-200 rounded-xl bg-slate-50">
                  No lab reports uploaded yet.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {rawLabReports.map(r => (
                    <div key={r.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 hover:shadow-md hover:border-aubergine-200 transition-all group">
                      <div className={`w-12 h-12 ${r.file_type === 'application/pdf' ? FILE_STYLE.pdf.color : FILE_STYLE.image.color} rounded-xl flex items-center justify-center text-2xl shrink-0 border border-slate-100`}>
                        <i className={`fas ${r.file_type === 'application/pdf' ? FILE_STYLE.pdf.icon : FILE_STYLE.image.icon}`}></i>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 truncate text-sm">{r.test_name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{r.test_category || 'General'} • {r.lab_name || 'Lab not specified'}</p>
                        <p className="text-xs text-slate-500">Uploaded {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        {r.status === 'Reviewed' && r.interpretation && (
                          <p className="text-xs text-slate-700 mt-1.5 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                            <span className="font-bold">Doctor's note: </span>{r.interpretation}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-1.5 opacity-100 sm:opacity-90 sm:group-hover:opacity-100 transition-opacity">
                        <AIButton
                          variant="gradient"
                          size="sm"
                          icon="fa-wand-magic-sparkles"
                          onClick={() => handleExplainWithAi(r)}
                          title="Explain this lab report with AI"
                        >
                          <span className="hidden sm:inline">AI Simplifier</span>
                        </AIButton>
                        <button onClick={() => viewLabReport(r)} className="w-8 h-8 rounded-xl bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-600 flex items-center justify-center text-xs transition-colors border border-aubergine-200/60" title="View Document">
                          <i className="fas fa-eye"></i>
                        </button>
                        {r.status === 'Uploaded' && (
                          <button onClick={() => setDeleteLabTarget(r)} className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center text-xs transition-colors border border-rose-200/60" title="Delete">
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <div className="bg-aubergine-50/60 border border-aubergine-100 rounded-2xl p-6 relative overflow-hidden">
                <i className="fas fa-shield-heart absolute -right-4 -bottom-4 text-8xl text-aubergine-500/10"></i>
                <div className="flex justify-between items-start mb-5">
                  <h3 className="font-black text-aubergine-900 text-lg">Health Insurance</h3>
                  <span className="bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Not on File</span>
                </div>
                <p className="text-sm text-slate-600 relative z-10 mb-5">
                  No insurance policy is on file yet. This feature is coming soon — for now, please share your policy details with the clinic directly.
                </p>
                <button onClick={() => toast('Adding insurance details online is coming soon. Please contact the clinic to add your policy.', 'info')}
                  className="w-full bg-white text-aubergine-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm border border-aubergine-200 hover:bg-aubergine-50 transition-colors">
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
      <UploadLabReportModal
        isOpen={uploadModalRequest !== undefined}
        onClose={() => setUploadModalRequest(undefined)}
        presetRequest={uploadModalRequest}
        onUpload={async (file, meta) => {
          await uploadLabReport(user.id, file, meta);
          await Promise.all([loadLabReports(), loadLabRequests()]);
          toast('Lab report uploaded successfully.', 'success');
        }}
      />
      <ConfirmModal
        isOpen={!!deleteLabTarget}
        onClose={() => setDeleteLabTarget(null)}
        onConfirm={handleDeleteLabReport}
        title="Delete Lab Report?"
        message={`"${deleteLabTarget?.test_name}" will be permanently removed.`}
        confirmLabel="Delete"
        confirmStyle="danger"
      />
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
      {/* ── AI Lab Report Explainer Modal ── */}
      <Modal 
        isOpen={aiLabModalOpen} 
        onClose={() => setAiLabModalOpen(false)} 
        title={aiLabData?.reportName ? `AI Report Insights: ${aiLabData.reportName}` : 'AI Lab Report Insights'} 
        size="lg"
      >
        {aiLabLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-700">Analyzing diagnostic biomarkers with Gemini Medical AI...</p>
            <p className="text-xs text-slate-400">Translating reference ranges into plain English</p>
          </div>
        ) : aiLabData ? (
          <div className="space-y-6">
            {/* Reassuring Summary Banner */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 text-sm shadow-xs">
                <i className="fas fa-sparkles"></i>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-purple-950 text-sm">Clinical Overview</h4>
                <p className="text-xs text-purple-900 leading-relaxed">{aiLabData.summary}</p>
              </div>
            </div>

            {/* Biomarker Breakdown */}
            {aiLabData.biomarkers?.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Key Biomarkers &amp; Reference Ranges</h4>
                <div className="space-y-2.5">
                  {aiLabData.biomarkers.map((b, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{b.name}</span>
                          <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {b.value} {b.unit}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          b.status === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          b.status === 'LOW' ? 'bg-aubergine-100 text-aubergine-800 border-aubergine-300' :
                          'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Standard Reference: <strong className="text-slate-700">{b.referenceRange}</strong></span>
                      </div>
                      {b.explanation && (
                        <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/60 leading-relaxed">
                          {b.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions to Ask Doctor */}
            {aiLabData.questionsForDoctor?.length > 0 && (
              <div className="bg-aubergine-50/60 border border-aubergine-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-aubergine-800 flex items-center gap-1.5">
                  <i className="fas fa-comments text-aubergine-600"></i> 3 Questions to Ask Your Doctor
                </h4>
                <ul className="space-y-1.5">
                  {aiLabData.questionsForDoctor.map((q, idx) => (
                    <li key={idx} className="text-xs text-slate-800 font-medium flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-aubergine-200 text-aubergine-800 flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">{idx + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[11px] text-slate-400 text-center italic">
              * Educational Insights Only: This automated analysis is designed to help you prepare for doctor consultations and does not constitute a clinical medical diagnosis.
            </p>
          </div>
        ) : null}
      </Modal>

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

      <AIPaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        paywallData={paywallInfo}
        onUpgraded={() => {
          toast('AI Premium activated! You can now analyze unlimited lab reports.', 'success');
        }}
      />
    </div>
  );
}

export default PatientRecords;
