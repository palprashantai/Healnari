import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { DoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge, resolveRxStatus } from '../../components/RxStatus.jsx';
import { StepIndicator } from '../../components/StepIndicator.jsx';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const MSG_TEMPLATES = [
    { id: 'T1', name: 'Medication Reminder', text: 'Dear [Name], this is a reminder to take your prescribed medications on time. Consistency is key for effective treatment.' },
    { id: 'T2', name: 'Refill Available', text: 'Hi [Name], your prescription refill is now available. Please visit the clinic or request a refill through the app.' },
    { id: 'T3', name: 'Dosage Adjustment Notice', text: 'Dear [Name], your medication dosage has been adjusted as per your latest consultation. Please check your updated prescription.' },
    { id: 'T4', name: 'Follow-up Lab Reminder', text: 'Hello [Name], your follow-up lab tests are due. Please schedule them at your earliest convenience.' },
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
          <p>Sending {channel} to {selectedCount} selected prescription(s).</p>
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

/* ─── Dummy Data ──────────────────────────────── */
const PATIENTS = ['Priya Sharma', 'Anita Desai', 'Kavita Patel', 'Aisha Khan', 'Sunita Desai'];

const MED_LIBRARY = [
  'Metformin 500mg', 'Metformin 1000mg', 'Myo-Inositol Sachet 2g', 'Vitamin D3 60000 IU',
  'Norethisterone 5mg', 'Dienogest 2mg', 'Mefenamic Acid 500mg', 'Clomiphene Citrate 50mg',
  'Progesterone 400mg', 'Folic Acid 5mg', 'Calcium + Vitamin D3', 'Tranexamic Acid 500mg',
  'Combined Oral Contraceptive Pill', 'Letrozole 2.5mg', 'Ibuprofen 400mg',
];

const SCHEDULE_PRESETS = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', 'SOS'];

const STATUS_TABS = ['All', 'Active', 'Expiring Soon', 'Refill Requested', 'Expired'];

const INITIAL_RX = [
  {
    id: 'RX-A01', patient: 'Priya Sharma', date: '25 Jun 2026', diagnosis: 'PCOS — Insulin Resistance',
    status: 'Active', validTill: '25 Dec 2026',
    meds: [
      { name: 'Metformin 500mg', schedule: '1-0-1 (After Meals)', duration: '30 Days', refillsLeft: 2 },
      { name: 'Myo-Inositol Sachet 2g', schedule: '1-0-0 (Empty Stomach)', duration: '30 Days', refillsLeft: 2 },
    ],
    instructions: 'Avoid high-GI foods. Exercise 30 mins daily. Follow-up TSH in 6 weeks.',
    refillRequested: false,
  },
  {
    id: 'RX-A02', patient: 'Kavita Patel', date: '10 Jun 2026', diagnosis: 'Oligomenorrhea',
    status: 'Active', validTill: '10 Sep 2026',
    meds: [
      { name: 'Norethisterone 5mg', schedule: '1-0-0 (Days 16–25 of cycle)', duration: '10 Days', refillsLeft: 1 },
    ],
    instructions: 'Take for 10 days. Withdrawal bleed expected 2–4 days after stopping.',
    refillRequested: true,
  },
  {
    id: 'RX-A03', patient: 'Aisha Khan', date: '1 Jun 2026', diagnosis: 'Endometriosis Gr.2',
    status: 'Active', validTill: '1 Dec 2026',
    meds: [
      { name: 'Dienogest 2mg', schedule: '1-0-0 (Daily)', duration: '6 Months', refillsLeft: 3 },
      { name: 'Mefenamic Acid 500mg', schedule: 'PRN (During pain)', duration: 'As needed', refillsLeft: 0 },
    ],
    instructions: 'Monitor for breakthrough bleeding. Return immediately if pain exceeds 8/10.',
    refillRequested: false,
  },
  {
    id: 'RX-A04', patient: 'Anita Desai', date: '15 May 2026', diagnosis: 'Fertility Enhancement',
    status: 'Expired', validTill: '15 Jun 2026',
    meds: [
      { name: 'Clomiphene Citrate 50mg', schedule: '1-0-0 (Days 2–6)', duration: 'Per cycle', refillsLeft: 0 },
    ],
    instructions: 'Monitor follicular growth via ultrasound on Day 12. Schedule trigger shot.',
    refillRequested: false,
  },
];

const TEMPLATES = [
  { name: 'PCOS First-Line Protocol',     meds: ['Metformin 500mg BD', 'Myo-Inositol 2g OD', 'Vitamin D3 60K IU weekly'] },
  { name: 'Cycle Regulation (Norethisterone)', meds: ['Norethisterone 5mg OD (Day 16–25)'] },
  { name: 'Endometriosis (GnRH + Dienogest)', meds: ['Dienogest 2mg OD', 'Calcium + Vit D supplement OD'] },
  { name: 'Fertility — Clomiphene Cycle',  meds: ['Clomiphene Citrate 50mg (Day 2–6)', 'Progesterone 400mg (Day 15–25)'] },
];

/* ─── Write Rx Modal ─────────────────────────── */
function WriteRxModal({ isOpen, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ patient: '', diagnosis: '', meds: [{ name: '', schedule: '', duration: '' }], instructions: '' });
  const [template, setTemplate] = useState('');

  const applyTemplate = (tmpl) => {
    const found = TEMPLATES.find(t => t.name === tmpl);
    if (found) {
      setForm(prev => ({ ...prev, meds: found.meds.map(m => ({ name: m, schedule: '', duration: '30 Days' })) }));
      setTemplate(tmpl);
    }
  };

  const addMed = () => setForm(p => ({ ...p, meds: [...p.meds, { name: '', schedule: '', duration: '' }] }));
  const removeMed = (i) => setForm(p => ({ ...p, meds: p.meds.filter((_, idx) => idx !== i) }));
  const updateMed = (i, k, v) => setForm(p => ({ ...p, meds: p.meds.map((m, idx) => idx === i ? { ...m, [k]: v } : m) }));

  const reset = () => { setStep(1); setForm({ patient: '', diagnosis: '', meds: [{ name: '', schedule: '', duration: '' }], instructions: '' }); setTemplate(''); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={reset} title="Write Prescription" size="lg">
      <StepIndicator step={step} total={2} labels={['Details', 'Preview & Issue']} />
      {step === 1 && (
        <div className="space-y-4 mt-3">
          {/* Template */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Quick Template</label>
            <select value={template} onChange={e => applyTemplate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
              <option value="">— Start from scratch or choose a template —</option>
              {TEMPLATES.map(t => <option key={t.name}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Patient *</label>
              <select value={form.patient} onChange={e => setForm(p => ({ ...p, patient: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
                <option value="">Select patient</option>
                {PATIENTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Diagnosis *</label>
              <input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g. PCOS — IR Subtype"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
            </div>
          </div>

          {/* Medicines */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">Medicines & Dosage</label>
            
            {/* CDSS Safety Checker Banner */}
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
              <i className="fas fa-shield-virus text-amber-600 text-sm mt-0.5 shrink-0"></i>
              <div>
                <p className="font-bold">CDSS Safety Check Active</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Automated Allergy (Penicillin) & Drug-Drug Interaction (DDI) validation enabled for patient: <span className="font-bold">{form.patient || 'Not Selected'}</span></p>
              </div>
            </div>

            <datalist id="med-library">
              {MED_LIBRARY.map(name => <option key={name} value={name} />)}
            </datalist>

            <div className="space-y-3">
              {form.meds.map((med, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-2.5 bg-slate-50/60 space-y-1.5">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <input list="med-library" value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="Medicine name + dose"
                      className="col-span-5 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                    <input value={med.schedule} onChange={e => updateMed(i, 'schedule', e.target.value)} placeholder="Schedule (e.g. 1-0-1)"
                      className="col-span-4 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                    <input value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} placeholder="Duration"
                      className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                    <button onClick={() => removeMed(i)} className="col-span-1 h-8 rounded-xl bg-rose-50 text-rose-500 text-xs flex items-center justify-center hover:bg-rose-100 transition-colors border border-rose-100">
                      <i className="fas fa-trash-can"></i>
                    </button>
                  </div>

                  {/* Quick schedule presets — tap instead of typing dose codes */}
                  <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Quick set:</span>
                    {SCHEDULE_PRESETS.map(preset => (
                      <button key={preset} type="button" onClick={() => updateMed(i, 'schedule', preset)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${med.schedule.startsWith(preset) ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Interaction Warning Badge */}
                  {med.name.toLowerCase().includes('penicillin') && (
                    <div className="px-3 py-1 bg-rose-100 border border-rose-300 text-rose-800 text-[11px] rounded-lg font-bold flex items-center gap-1.5">
                      <i className="fas fa-triangle-exclamation text-rose-600"></i>
                      <span>CRITICAL ALLERGY ALERT: Patient Priya Sharma is allergic to Penicillin.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addMed} className="mt-2 text-xs text-aubergine-600 font-bold flex items-center gap-1 hover:underline">
              <i className="fas fa-plus"></i> Add Medicine
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Special Instructions</label>
            <textarea rows={2} value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Dietary advice, follow-up, warnings..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>

          <button disabled={!form.patient || !form.diagnosis} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <span>Preview Prescription</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 mt-3">
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-lg">HealNari Rx</h3>
                <p className="text-xs text-slate-500">Dr. Sarah Mitchell • MCI-29402</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="font-mono text-slate-400">RX-{Math.floor(Math.random() * 9000) + 1000}</p>
              </div>
            </div>
            <div className="text-xs space-y-1">
              <p><strong>Patient:</strong> {form.patient}</p>
              <p><strong>Diagnosis:</strong> {form.diagnosis}</p>
            </div>
            <div className="space-y-2">
              {form.meds.filter(m => m.name).map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="font-bold text-slate-500 mt-0.5">Rx{i + 1}.</span>
                  <div>
                    <p className="font-bold text-slate-800">{m.name}</p>
                    <p className="text-slate-500">{m.schedule} • {m.duration}</p>
                  </div>
                </div>
              ))}
            </div>
            {form.instructions && (
              <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
                <strong>Instructions:</strong> {form.instructions}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50">← Edit</button>
            <button onClick={() => { onSave(form); reset(); }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <i className="fas fa-paper-plane"></i> Issue & Send to Patient
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorPrescriptions() {
  const toast = useToast();
  const [prescriptions, setPrescriptions] = useState(INITIAL_RX);
  const [showWrite, setShowWrite] = useState(false);
  const [refillTarget, setRefillTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All');

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
    if (selectedIds.length === 0) { toast('Please select at least one prescription first.', 'error'); return; }
    setBulkModalParams({ isOpen: true, channel: action });
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) setSelectedIds([]);
    else setSelectedIds(filtered.map(rx => rx.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const matchesTab = (rx, t) => {
    if (t === 'All') return true;
    if (t === 'Refill Requested') return rx.refillRequested;
    return resolveRxStatus(rx) === t;
  };

  const tabCount = (t) => prescriptions.filter(rx => matchesTab(rx, t)).length;

  const filtered = prescriptions.filter(rx =>
    matchesTab(rx, tab) &&
    (!search || rx.patient.toLowerCase().includes(search.toLowerCase()) || rx.diagnosis.toLowerCase().includes(search.toLowerCase()))
  );

  const approveRefill = (rx) => {
    setPrescriptions(prev => prev.map(r => r.id === rx.id ? { ...r, refillRequested: false, meds: r.meds.map(m => ({ ...m, refillsLeft: m.refillsLeft + 1 })) } : r));
    toast(`Refill approved for ${rx.patient}. New prescription issued.`, 'success');
    setRefillTarget(null);
  };

  const handleNewRx = (form) => {
    const newRx = {
      id: `RX-A${String(prescriptions.length + 1).padStart(2, '0')}`,
      patient: form.patient, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      diagnosis: form.diagnosis, status: 'Active',
      validTill: new Date(Date.now() + 180 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      meds: form.meds.filter(m => m.name).map(m => ({ ...m, refillsLeft: 2 })),
      instructions: form.instructions, refillRequested: false,
    };
    setPrescriptions(prev => [newRx, ...prev]);
    toast(`Prescription issued to ${form.patient}. Patient notified via SMS.`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Prescriptions</h1>
          <p className="text-sm text-slate-500">Issue, manage, and approve patient prescriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 mb-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk Messaging</p></div>
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
          <button onClick={() => setShowWrite(true)}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors">
            <i className="fas fa-file-prescription"></i> Write Prescription
          </button>
        </div>
      </div>

      {/* Refill alerts */}
      {prescriptions.some(r => r.refillRequested) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <i className="fas fa-pills"></i>
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900">Refill Requests Pending</p>
            <p className="text-xs text-amber-700">{prescriptions.filter(r => r.refillRequested).length} patient(s) have requested a prescription refill.</p>
          </div>
          <button onClick={() => setRefillTarget(prescriptions.find(r => r.refillRequested))}
            className="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-700 transition-colors flex-shrink-0">
            Review
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or diagnosis..."
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-sm" />
      </div>

      {/* Select All + Status filter tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors ${tab === t ? 'bg-aubergine-700 text-white border-aubergine-700' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
              {t} <span className={tab === t ? 'text-aubergine-200' : 'text-slate-400'}>({tabCount(t)})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.length > 0 && selectedIds.length === filtered.length ? 'bg-aubergine-600 border-aubergine-600 text-white' : selectedIds.length > 0 ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-600' : 'bg-white border-slate-300'}`}>
              {(selectedIds.length > 0 && selectedIds.length === filtered.length) ? <i className="fas fa-check text-[8px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-600 rounded"></div> : null}
            </div>
            <input type="checkbox" className="hidden" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
            Select All
          </label>
        </div>
      </div>

      {/* Rx Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
            No prescriptions match this filter.
          </div>
        )}
        {filtered.map(rx => (
          <div key={rx.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${selectedIds.includes(rx.id) ? 'border-aubergine-300 ring-1 ring-aubergine-200' : 'border-slate-200'}`}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer group flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(rx.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                    {selectedIds.includes(rx.id) && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedIds.includes(rx.id)} onChange={() => toggleSelect(rx.id)} />
                </label>
                <div className="w-11 h-11 bg-aubergine-50 text-aubergine-600 rounded-xl flex items-center justify-center text-lg">
                  <i className="fas fa-file-prescription"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800">{rx.patient}</h3>
                    {rx.refillRequested && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full">Refill Requested</span>}
                  </div>
                  <p className="text-xs text-aubergine-700 font-bold">{rx.diagnosis}</p>
                  <p className="text-[10px] text-slate-400">{rx.date} → Valid till {rx.validTill}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded">{rx.id}</span>
                <RxStatusBadge rx={rx} />
              </div>
            </div>

            <div className="p-5">
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                {rx.meds.map((m, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                    <div className="font-bold text-slate-800 mb-1.5">{m.name}</div>
                    <DoseSchedule schedule={m.schedule} />
                    <div className={`mt-1.5 ${m.refillsLeft === 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      {m.duration} • {m.refillsLeft === 0 ? 'No refills left' : `${m.refillsLeft} refills left`}
                    </div>
                  </div>
                ))}
              </div>
              {rx.instructions && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 mb-4">
                  <strong>Instructions:</strong> {rx.instructions}
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => toast(`Downloading ${rx.id} as PDF...`, 'info')}
                  className="text-xs font-bold text-aubergine-600 border border-aubergine-200 px-4 py-2 rounded-xl hover:bg-aubergine-50 transition-colors flex items-center gap-1.5">
                  <i className="fas fa-download"></i> Download PDF
                </button>
                <button onClick={() => toast(`${rx.id} sent to ${rx.patient} via SMS.`, 'success')}
                  className="text-xs font-bold text-sky-600 border border-sky-200 px-4 py-2 rounded-xl hover:bg-sky-50 transition-colors flex items-center gap-1.5">
                  <i className="fas fa-paper-plane"></i> Resend to Patient
                </button>
                {rx.refillRequested && (
                  <button onClick={() => setRefillTarget(rx)}
                    className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5">
                    <i className="fas fa-pills"></i> Approve Refill
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <WriteRxModal isOpen={showWrite} onClose={() => setShowWrite(false)} onSave={handleNewRx} />
      <ConfirmModal
        isOpen={!!refillTarget}
        onClose={() => setRefillTarget(null)}
        onConfirm={() => approveRefill(refillTarget)}
        title={`Approve Refill — ${refillTarget?.patient}`}
        message={`Approve the refill request for "${refillTarget?.meds?.[0]?.name}" and issue a new prescription to ${refillTarget?.patient}?`}
        confirmLabel="Approve & Issue"
        confirmStyle="primary"
      />
      <BulkMessageModal
        isOpen={bulkModalParams.isOpen}
        onClose={() => setBulkModalParams({ isOpen: false, channel: '' })}
        channel={bulkModalParams.channel}
        selectedCount={selectedIds.length}
        onSend={(msg) => {
          toast(`Successfully sent ${bulkModalParams.channel} to ${selectedIds.length} patients!`, 'success');
          setSelectedIds([]);
        }}
      />
    </div>
  );
}

export default DoctorPrescriptions;
