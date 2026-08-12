import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';

const STATUS_COLORS = { Pending: '#f59e0b', Reviewed: '#10b981' };

function EmptyChart({ label }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-slate-400">
      <i className="fas fa-chart-simple mr-2"></i>{label}
    </div>
  );
}

/** Buckets a doctor's lab report queue into normal vs flagged counts per
 * month, Jan through the current month of this year — real data, not a
 * sample trend. */
function buildLabTrend(reports) {
  const now = new Date();
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const buckets = MONTH_LABELS.slice(0, now.getMonth() + 1).map(name => ({ name, normal: 0, abnormal: 0 }));
  reports.forEach(r => {
    if (!r.created_at) return;
    const d = new Date(r.created_at);
    if (d.getFullYear() !== now.getFullYear()) return;
    const bucket = buckets[d.getMonth()];
    if (!bucket) return;
    if (r.urgent) bucket.abnormal += 1;
    else bucket.normal += 1;
  });
  return buckets;
}

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


/* ─── Lab Review Modal ───────────────────────── */
function LabReviewModal({ lab, isOpen, onClose, onAction }) {
  const { getLabReportUrl } = useClinicData();
  const toast = useToast();
  const [action, setAction] = useState('');
  const [opening, setOpening] = useState(false);

  useEffect(() => { setAction(lab?.action || ''); }, [lab?.id]);

  if (!lab) return null;

  const openFile = async () => {
    setOpening(true);
    try {
      const { url } = await getLabReportUrl(lab.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast(err.message || 'Failed to open report file', 'error');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lab Report — ${lab.patient}`} size="lg">
      <div className="space-y-5">
        {lab.urgent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 flex-shrink-0 mt-0.5"></i>
            <p className="text-xs text-amber-800 font-medium">Marked as urgent. Please review immediately.</p>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Uploaded File</p>
            <p className="text-sm font-bold text-slate-800">{Array.isArray(lab.tests) ? lab.tests.join(', ') : lab.tests}</p>
          </div>
          <button onClick={openFile} disabled={opening}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <i className="fas fa-file-arrow-up"></i> {opening ? 'Opening…' : 'Open Report'}
          </button>
        </div>

        {/* Doctor Action */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Clinical Interpretation & Action</label>
          <textarea rows={3} value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. TSH mildly elevated. Start Levothyroxine 25mcg OD. Repeat TSH in 6 weeks..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onAction(lab, action); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            <i className="fas fa-check-circle"></i> Mark Reviewed & Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Request Report Modal ───────────────────── */
function RequestReportModal({ isOpen, onClose, patients, onRequest }) {
  const [patientId, setPatientId] = useState('');
  const [requestedTests, setRequestedTests] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { setPatientId(''); setRequestedTests(''); setDueDate(''); setNotes(''); }
  }, [isOpen]);

  const submit = async (e) => {
    e.preventDefault();
    if (!patientId || !requestedTests.trim()) return;
    setSubmitting(true);
    try {
      await onRequest(patientId, { requestedTests: requestedTests.trim(), dueDate: dueDate || undefined, notes: notes.trim() || undefined });
      onClose();
    } catch {
      // already surfaced via toast in the caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Lab Report" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Patient *</label>
          <select required value={patientId} onChange={e => setPatientId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            <option value="">-- Select patient --</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Test(s) / Panel *</label>
          <input required value={requestedTests} onChange={e => setRequestedTests(e.target.value)} placeholder="e.g. Serum AMH, TSH & Free T4"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes for Patient</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Fasting required before the blood draw"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-aubergine-700 hover:bg-aubergine-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          <i className="fas fa-paper-plane"></i> {submitting ? 'Sending…' : 'Send Request'}
        </button>
      </form>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorReports() {
  const toast = useToast();
  const { patients, requestLabReport } = useClinicData();
  const [rawReports, setRawReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [selectedLab, setSelectedLab] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadReports = () => apiFetch('/records/lab-reports')
    .then(setRawReports)
    .catch(err => toast(err.message || 'Failed to load lab reports', 'error'))
    .finally(() => setLoading(false));
  useEffect(() => { loadReports(); }, []);

  const nameByPatientId = useMemo(() => new Map(patients.map(p => [p.id, p.name])), [patients]);

  const toRow = (r) => ({
    id: r.id,
    patientId: r.patient_id,
    patient: nameByPatientId.get(r.patient_id) || 'Patient',
    tests: [r.test_name],
    lab: r.lab_name || '—',
    received: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    urgent: r.urgent,
    interpretation: r.interpretation,
    action: r.doctor_action,
  });

  const pending = rawReports.filter(r => r.status === 'Uploaded').map(toRow);
  const reviewed = rawReports.filter(r => r.status === 'Reviewed').map(r => ({ ...toRow(r), tests: r.test_name, date: toRow(r).received }));

  const labTrend = useMemo(() => buildLabTrend(rawReports), [rawReports]);
  const queueBreakdown = useMemo(() => (
    [
      { name: 'Pending', value: pending.length },
      { name: 'Reviewed', value: reviewed.length },
    ].filter(s => s.value > 0)
  ), [pending.length, reviewed.length]);

  const handleRequestReport = async (patientId, request) => {
    try {
      await requestLabReport(patientId, request);
      toast('Report request sent to patient.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to send request', 'error');
      throw err;
    }
  };

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

  const sendBulkMessage = async (channel, messageText) => {
    const recipients = currentList.filter(r => selectedIds.includes(r.id));
    const patientIds = [...new Set(recipients.map(r => r.patientId).filter(Boolean))];
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Lab Reports — ${recipients.length} patient(s)`,
          channels: [channel],
          scheduleType: 'immediate',
          patientIds,
        },
      });
      toast(`${channel} sent to ${recipients.length} patient(s).`, 'success');
    } catch (err) {
      toast(err.message || `Failed to send ${channel}`, 'error');
    }
    setSelectedIds([]);
  };

  const downloadReportPdf = (r) => {
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) return;
    win.document.write(`
      <!doctype html><html><head><title>Lab Report — ${r.patient}</title>
      <style>
        body { font-family: Georgia, serif; padding: 32px; color: #1e293b; }
        h1 { font-size: 20px; margin: 0; }
        .muted { color: #64748b; font-size: 12px; }
        .header { border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 12px; }
      </style></head><body>
      <div class="header"><h1>HealNari — Lab Report</h1><p class="muted">${r.patient} • ${r.lab} • ${r.received}</p></div>
      <p><strong>Test(s):</strong> ${Array.isArray(r.tests) ? r.tests.join(', ') : r.tests}</p>
      <p style="margin-top:12px"><strong>Interpretation:</strong> ${r.interpretation}</p>
      ${r.action ? `<p style="margin-top:12px"><strong>Doctor's Action:</strong> ${r.action}</p>` : ''}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === currentList.length && currentList.length > 0) setSelectedIds([]);
    else setSelectedIds(currentList.map(l => l.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAction = async (lab, action) => {
    try {
      await apiFetch(`/records/lab-reports/${lab.id}/review`, {
        method: 'PUT',
        body: { interpretation: action || 'Reviewed. No immediate action required.', doctorAction: action },
      });
      await loadReports();
      toast(`Report for ${lab.patient} reviewed and action saved.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to save review', 'error');
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading lab reports...</div>;

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
          <button onClick={() => setShowRequestModal(true)}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-flask"></i> Request Report
          </button>
        </div>
      </div>

      {/* Lab Trends Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">Lab Results Overview (YTD)</h2>
            <p className="text-xs text-slate-500">Volume of normal vs flagged (urgent) diagnostic results, by month.</p>
          </div>
          {rawReports.length === 0 ? <EmptyChart label="No lab reports yet." /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={labTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="normal" name="Normal Results" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="abnormal" name="Flagged (Urgent)" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="font-bold text-slate-800">Review Queue</h2>
            <p className="text-xs text-slate-500">Pending vs already-reviewed reports.</p>
          </div>
          {queueBreakdown.length === 0 ? <EmptyChart label="No lab reports yet." /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={queueBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                    {queueBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
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
              <button onClick={() => downloadReportPdf(r)}
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

      <RequestReportModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} patients={patients} onRequest={handleRequestReport} />

      <BulkMessageModal
        isOpen={bulkModalParams.isOpen}
        onClose={() => setBulkModalParams({ isOpen: false, channel: '' })}
        channel={bulkModalParams.channel}
        selectedCount={selectedIds.length}
        onSend={(msg) => sendBulkMessage(bulkModalParams.channel, msg)}
      />
    </div>
  );
}

export default DoctorReports;
