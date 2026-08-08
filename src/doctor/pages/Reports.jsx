import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const MSG_TEMPLATES = [
    { id: 'T1', name: 'Report Ready - Collect', text: 'Dear [Name], your lab report is now ready. Please collect it from the clinic or check the app for results.' },
    { id: 'T2', name: 'Abnormal Results - Follow-up', text: 'Dear [Name], your recent lab results require a follow-up consultation. Please book an appointment at your earliest convenience.' },
    { id: 'T3', name: 'Repeat Test Reminder', text: 'Hi [Name], your doctor has recommended a repeat test. Please schedule it within the next 2 weeks.' },
    { id: 'T4', name: 'Fasting Instructions', text: 'Hello [Name], please remember to fast for 10-12 hours before your upcoming blood test. Water is allowed.' },
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
          <p>Sending {channel} to {selectedCount} selected report(s).</p>
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
const LAB_TRENDS = [
  { name: 'Jan', normal: 45, abnormal: 12 },
  { name: 'Feb', normal: 52, abnormal: 15 },
  { name: 'Mar', normal: 48, abnormal: 10 },
  { name: 'Apr', normal: 61, abnormal: 18 },
  { name: 'May', normal: 59, abnormal: 14 },
  { name: 'Jun', normal: 75, abnormal: 22 },
];
const PENDING_LABS = [
  { id: 1, patient: 'Priya Sharma', tests: ['TSH', 'Free T4', 'Anti-TPO Ab'], lab: 'Dr. Lal PathLabs', received: '10 mins ago', urgent: true,
    results: { TSH: '5.2 mIU/L ↑ (ref: 0.4–4.0)', 'Free T4': '1.1 ng/dL (Normal)', 'Anti-TPO Ab': '98 IU/mL ↑ (ref: <35)' },
    interpretation: 'Elevated TSH with high Anti-TPO suggests Hashimoto\'s thyroiditis. Consider Levothyroxine initiation.' },
  { id: 2, patient: 'Meera Nair',  tests: ['AMH', 'LH', 'FSH'], lab: 'Apollo Diagnostics', received: '2 hrs ago', urgent: false,
    results: { AMH: '1.2 ng/mL (Low-Normal)', LH: '8.2 mIU/mL', FSH: '6.4 mIU/mL' },
    interpretation: 'AMH is low-normal suggesting diminished ovarian reserve. LH:FSH ratio normal. Recommend fertility counselling.' },
  { id: 3, patient: 'Sunita Desai', tests: ['HbA1c', 'Fasting Insulin', 'HOMA-IR'], lab: 'SRL Diagnostics', received: 'Yesterday', urgent: false,
    results: { HbA1c: '7.2% ↑ (ref: <5.7%)', 'Fasting Insulin': '24 μIU/mL ↑', 'HOMA-IR': '5.4 ↑ (ref: <2.5)' },
    interpretation: 'Poor glycaemic control. HOMA-IR suggests significant insulin resistance. Escalate Metformin and add lifestyle counselling.' },
];

const REVIEWED = [
  { id: 'R1', patient: 'Kavita Patel', tests: 'LH, FSH, Prolactin', lab: 'Dr. Lal PathLabs', date: '20 Jun 2026', action: 'Norethisterone continued. Follow-up in 2 months.' },
  { id: 'R2', patient: 'Aisha Khan', tests: 'CA-125, TVS', lab: 'City Scans', date: '15 Jun 2026', action: 'Endometriosis Gr.2 confirmed. Dienogest initiated.' },
];

/* ─── Lab Review Modal ───────────────────────── */
function LabReviewModal({ lab, isOpen, onClose, onAction }) {
  const [action, setAction] = useState('');
  const [orderMore, setOrderMore] = useState('');

  if (!lab) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lab Report — ${lab.patient}`} size="lg">
      <div className="space-y-5">
        {lab.urgent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 flex-shrink-0 mt-0.5"></i>
            <p className="text-xs text-amber-800 font-medium">Marked as urgent. Please review immediately.</p>
          </div>
        )}

        {/* Result Values */}
        <div>
          <h4 className="font-bold text-slate-700 text-sm mb-2">Test Results</h4>
          <div className="space-y-2">
            {Object.entries(lab.results).map(([test, value]) => (
              <div key={test} className={`flex justify-between items-center px-4 py-3 rounded-xl border text-sm ${value.includes('↑') ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold text-slate-700">{test}</span>
                <span className={`font-bold ${value.includes('↑') ? 'text-rose-700' : 'text-emerald-700'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Interpretation */}
        <div className="bg-slate-900 rounded-2xl p-4">
          <p className="text-xs text-aubergine-300 font-bold mb-2 flex items-center gap-1.5"><i className="fas fa-sparkles"></i> AI Clinical Interpretation</p>
          <p className="text-sm text-slate-200 leading-relaxed">{lab.interpretation}</p>
        </div>

        {/* Doctor Action */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Your Clinical Action</label>
          <textarea rows={2} value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Start Levothyroxine 25mcg OD. Repeat TSH in 6 weeks..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Order Additional Tests (optional)</label>
          <input value={orderMore} onChange={e => setOrderMore(e.target.value)} placeholder="e.g. Serum Cortisol, OGTT"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onAction(lab, action, orderMore); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            <i className="fas fa-check-circle"></i> Mark Reviewed & Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorReports() {
  const toast = useToast();
  const [pending, setPending] = useState(PENDING_LABS);
  const [reviewed, setReviewed] = useState(REVIEWED);
  const [tab, setTab] = useState('pending');
  const [selectedLab, setSelectedLab] = useState(null);

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

  const currentList = tab === 'pending' ? pending : reviewed;
  const handleBulkAction = (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) { toast('Please select at least one report first.', 'error'); return; }
    setBulkModalParams({ isOpen: true, channel: action });
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === currentList.length && currentList.length > 0) setSelectedIds([]);
    else setSelectedIds(currentList.map(l => l.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAction = (lab, action, orderMore) => {
    const reviewedEntry = {
      id: `R${Date.now()}`,
      patient: lab.patient,
      tests: lab.tests.join(', '),
      lab: lab.lab,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      action: action || 'Reviewed. No immediate action required.',
    };
    setPending(prev => prev.filter(p => p.id !== lab.id));
    setReviewed(prev => [reviewedEntry, ...prev]);
    if (orderMore) toast(`New labs ordered for ${lab.patient}: ${orderMore}`, 'success');
    toast(`Report for ${lab.patient} reviewed and action saved.`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Lab & Reports</h1>
          <p className="text-sm text-slate-500">Review diagnostic reports and record clinical actions.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 mb-1"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bulk Messaging</p></div>
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
          {pending.some(l => l.urgent) && (
            <span className="bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
              <i className="fas fa-circle-exclamation"></i> {pending.filter(l => l.urgent).length} Urgent
            </span>
          )}
          <button onClick={() => toast('Lab order form opened.', 'info')}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-flask"></i> Order Labs
          </button>
        </div>
      </div>

      {/* Lab Trends Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="mb-4">
          <h2 className="font-bold text-slate-800">Lab Results Overview (YTD)</h2>
          <p className="text-xs text-slate-500">Track the volume of normal vs abnormal diagnostic results.</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LAB_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="normal" name="Normal Results" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="abnormal" name="Abnormal (Flagged)" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 items-center justify-between pr-5">
          <div className="flex">
            {[['pending', 'Pending Review', pending.length], ['reviewed', 'Reviewed', reviewed.length]].map(([key, label, count]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-6 py-4 text-sm font-bold transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.length > 0 && selectedIds.length === currentList.length ? 'bg-aubergine-600 border-aubergine-600 text-white' : selectedIds.length > 0 ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-600' : 'bg-white border-slate-300'}`}>
                {(selectedIds.length > 0 && selectedIds.length === currentList.length) ? <i className="fas fa-check text-[8px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-600 rounded"></div> : null}
              </div>
              <input type="checkbox" className="hidden" checked={selectedIds.length === currentList.length && currentList.length > 0} onChange={toggleSelectAll} />
              Select All
            </label>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {tab === 'pending' && pending.map(lab => (
            <div key={lab.id} className={`p-5 flex flex-col sm:flex-row gap-4 hover:bg-slate-50 transition-colors ${lab.urgent ? 'bg-amber-50/30' : ''} ${selectedIds.includes(lab.id) ? 'ring-1 ring-inset ring-aubergine-200 bg-aubergine-50/20' : ''}`}>
              <label className="cursor-pointer group flex-shrink-0 mt-1" onClick={e => e.stopPropagation()}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(lab.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                  {selectedIds.includes(lab.id) && <i className="fas fa-check text-[10px]"></i>}
                </div>
                <input type="checkbox" className="hidden" checked={selectedIds.includes(lab.id)} onChange={() => toggleSelect(lab.id)} />
              </label>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-black text-slate-800">{lab.patient}</h3>
                  {lab.urgent && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1"><i className="fas fa-circle-exclamation text-[8px]"></i> Urgent</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {lab.tests.map(t => <span key={t} className="text-[10px] bg-sky-50 border border-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
                <p className="text-xs text-slate-500">{lab.lab} • Received: {lab.received}</p>
              </div>
              <button onClick={() => setSelectedLab(lab)}
                className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0 ${lab.urgent ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 border border-aubergine-200'}`}>
                <i className="fas fa-microscope"></i> Review Report
              </button>
            </div>
          ))}

          {tab === 'pending' && pending.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <i className="fas fa-circle-check text-4xl mb-3 block text-emerald-400"></i>
              <p className="font-bold">All reports reviewed!</p>
            </div>
          )}

          {tab === 'reviewed' && reviewed.map(r => (
            <div key={r.id} className={`p-5 flex flex-col sm:flex-row gap-4 hover:bg-slate-50 transition-colors ${selectedIds.includes(r.id) ? 'ring-1 ring-inset ring-aubergine-200 bg-aubergine-50/20' : ''}`}>
              <label className="cursor-pointer group flex-shrink-0 mt-1" onClick={e => e.stopPropagation()}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(r.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                  {selectedIds.includes(r.id) && <i className="fas fa-check text-[10px]"></i>}
                </div>
                <input type="checkbox" className="hidden" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
              </label>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-black text-slate-800">{r.patient}</h3>
                  <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Reviewed</span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{r.tests} • {r.lab} • {r.date}</p>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{r.action}</p>
              </div>
              <button onClick={() => toast(`Downloading report for ${r.patient}...`, 'info')}
                className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm text-aubergine-600 border border-aubergine-200 hover:bg-aubergine-50 transition-colors flex-shrink-0 h-max">
                <i className="fas fa-download"></i> Download
              </button>
            </div>
          ))}

          {tab === 'reviewed' && reviewed.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <i className="fas fa-file-circle-check text-4xl mb-3 block text-slate-300"></i>
              <p className="font-bold">No reviewed reports yet.</p>
            </div>
          )}
        </div>
      </div>

      <LabReviewModal lab={selectedLab} isOpen={!!selectedLab} onClose={() => setSelectedLab(null)} onAction={handleAction} />

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

export default DoctorReports;
