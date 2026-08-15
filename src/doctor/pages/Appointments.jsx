import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');

  const TEMPLATES = [
    { id: 'T1', name: 'Appointment Delay (30 mins)', text: 'Dear [Name], the doctor is currently running 30 minutes behind schedule. We apologize for the delay.' },
    { id: 'T2', name: 'Appointment Cancellation', text: 'Dear [Name], we regret to inform you that your appointment has been cancelled. Please contact us to reschedule.' },
    { id: 'T3', name: 'Clinic Closed Tomorrow', text: 'Dear [Name], please note that the clinic will be closed tomorrow due to an emergency. We will reschedule your appointment.' },
    { id: 'T4', name: 'Bring Past Records Reminder', text: 'Hello [Name], please remember to bring your past medical records and lab reports to your upcoming appointment.' },
  ];

  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setTemplateId(val);
    if (val) {
      const tmpl = TEMPLATES.find(t => t.id === val);
      if (tmpl) setMessageText(tmpl.text);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send ${channel}`} size="sm">
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-xl p-3 text-sm font-bold flex gap-2">
          <i className="fas fa-users mt-1 text-sky-500"></i>
          <p>You are about to send a {channel} to {selectedCount} selected appointment(s).</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select a Message Template (Optional)</label>
          <select value={templateId} onChange={handleTemplateChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            <option value="">-- Start from scratch --</option>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
           <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message Content</label>
           <textarea 
             rows={4} 
             value={messageText}
             onChange={e => setMessageText(e.target.value)}
             placeholder="Type your custom message here..." 
             className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-y"
           ></textarea>
        </div>
        <div className="pt-2">
          <button 
            onClick={() => { onSend(messageText); onClose(); }} 
            disabled={!messageText.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <i className="fas fa-paper-plane"></i> Send {channel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const STATUS_BADGE = {
  'In Progress': 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset shadow-sm',
  'Waiting':     'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset shadow-sm',
  'Upcoming':    'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 ring-1 ring-slate-200 ring-inset shadow-sm',
  'Requested':   'bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 ring-1 ring-sky-200 ring-inset shadow-sm',
  'Done':        'bg-gradient-to-r from-slate-200 to-slate-100 text-slate-700 ring-1 ring-slate-300 ring-inset shadow-sm'
};

/* ─── Notes Modal ────────────────────────────── */
// Parses the "Subjective: …\nAssessment: …\nPlan: …" format saveNotes()
// writes back out, so re-opening a saved note prefills the form instead of
// showing blank fields for an already-documented visit.
function parseNote(text) {
  const grab = (label) => {
    const m = text.match(new RegExp(`${label}: ([\\s\\S]*?)(?:\\n(?:Subjective|Assessment|Plan):|$)`));
    return m ? m[1].trim() : '';
  };
  return { notes: grab('Subjective'), diagnosis: grab('Assessment'), followUp: grab('Plan') };
}

function NotesModal({ patient, isOpen, onClose, onSave }) {
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [priorNotes, setPriorNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !patient) return;
    setNotes(''); setDiagnosis(''); setFollowUp(''); setPriorNotes([]);
    setLoading(true);
    apiFetch(`/telemedicine/${patient.id}/notes`)
      .then(list => {
        setPriorNotes(list);
        if (list.length) {
          const { notes, diagnosis, followUp } = parseNote(list[0].note);
          setNotes(notes); setDiagnosis(diagnosis); setFollowUp(followUp);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, patient]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={patient ? `SOAP Notes — ${patient.name}` : 'SOAP Notes'} size="md">
      {patient && (
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          <div className="flex gap-3"><span className="font-bold text-slate-500 w-16">Patient</span><span className="font-bold text-slate-800">{patient.name} ({patient.age})</span></div>
          <div className="flex gap-3"><span className="font-bold text-slate-500 w-16">Visit Type</span><span>{patient.type}</span></div>
        </div>
        {loading && <p className="text-xs text-slate-500 text-center py-1">Loading existing notes…</p>}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Subjective / Chief Complaint</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Patient reported..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Diagnosis / Assessment</label>
          <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. PCOS — Insulin Resistance Subtype"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Follow-up Plan</label>
          <input value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="e.g. Repeat labs in 6 weeks, follow-up call"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        {priorNotes.length > 1 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Earlier Notes</p>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {priorNotes.slice(1).map(n => (
                <div key={n.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-600 whitespace-pre-wrap">
                  <p className="text-[10px] text-slate-500 font-bold mb-0.5">{new Date(n.created_at).toLocaleString('en-IN')}</p>
                  {n.note}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onSave({ notes, diagnosis, followUp }); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-floppy-disk"></i> Save to EMR
          </button>
        </div>
      </div>
      )}
    </Modal>
  );
}

/* ─── Video Call Modal ───────────────────────── */
/* ─── Main Component ─────────────────────────── */
function DoctorAppointments() {
  const toast = useToast();
  const navigate = useNavigate();
  const { appointments, patients, approveRequest: approveRequestApi, rejectRequest: rejectRequestApi, cancelAppointment, callNextForDoctor } = useClinicData();
  const [tab, setTab] = useState('queue');

  const ageByPatientId = useMemo(() => new Map(patients.map(p => [p.id, p.age])), [patients]);
  const todayStr = todayLocalStr();

  const formatDate = (iso) => {
    if (!iso) return '—';
    if (iso === todayStr) return 'Today';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toRow = (a) => ({
    id: a.id,
    patientId: a.patientId,
    token: null,
    name: a.patientName,
    age: ageByPatientId.get(a.patientId) ? `${ageByPatientId.get(a.patientId)}F` : '—',
    type: a.reason || a.type,
    time: a.time,
    date: formatDate(a.date),
    mode: a.type === 'Video Consult' ? 'Video' : 'Clinic',
    status: a.status,
    notes: a.reason || '',
  });

  const queue = useMemo(() => appointments
    .filter(a => a.date === todayStr && a.status !== 'Requested' && a.status !== 'Cancelled')
    .map(toRow)
    .map((r, i) => ({ ...r, token: `T-${String(i + 1).padStart(2, '0')}` })),
    [appointments, todayStr, ageByPatientId]);

  const requests = useMemo(() => appointments.filter(a => a.status === 'Requested').map(toRow), [appointments, ageByPatientId]);

  const past = useMemo(() => appointments
    .filter(a => a.date < todayStr && a.status !== 'Requested')
    .map(toRow),
    [appointments, todayStr, ageByPatientId]);

  const [notesTarget, setNotesTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All Modes');

  const getFilteredData = () => {
    const source = tab === 'queue' ? queue : tab === 'requests' ? requests : past;
    return source.filter(p => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.token?.toLowerCase().includes(search.toLowerCase());
      const matchesMode = modeFilter === 'All Modes' || p.mode === modeFilter;
      return matchesSearch && matchesMode;
    });
  };
  const filteredData = getFilteredData();

  const [selectedIds, setSelectedIds] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState({ isOpen: false, channel: '' });
  const actionsMenuRef = useRef(null);

  // ── Dynamic Wait-Time Projection ──
  // Average consultation = 12 minutes per patient
  const AVG_CONSULT_MINS = 12;
  const computeEstWait = (tokenIndex) => {
    const waitingAhead = tokenIndex; // number of patients ahead
    const nowMs = Date.now();
    const estMs = nowMs + waitingAhead * AVG_CONSULT_MINS * 60 * 1000;
    const estDate = new Date(estMs);
    const timeStr = estDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const waitMins = waitingAhead * AVG_CONSULT_MINS;
    return { timeStr, waitMins };
  };

  // ── 1-Click Delay Broadcast ──
  const [delayBroadcastLoading, setDelayBroadcastLoading] = useState(null);
  const sendDelayBroadcast = async (delayMins) => {
    const waitingPatients = queue.filter(p => p.status === 'Waiting');
    if (!waitingPatients.length) {
      toast('No waiting patients to notify.', 'info');
      return;
    }
    setDelayBroadcastLoading(delayMins);
    const patientIds = [...new Set(waitingPatients.map(p => p.patientId).filter(Boolean))];
    const subject = `⏰ Queue Delay Notice: +${delayMins} Minutes`;
    const body = `Dear Patient, We regret to inform you that Dr. ${'your'} clinic is running approximately ${delayMins} minutes behind schedule. We appreciate your patience. Your token will be called as soon as possible. Thank you.`;
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject,
          body,
          audience: `Waiting Queue — ${waitingPatients.length} patient(s)`,
          channels: ['Push Notification', 'WhatsApp Message', 'Bulk Email'],
          scheduleType: 'immediate',
          patientIds,
        },
      });
      toast(`⏰ +${delayMins} min delay alert sent to ${waitingPatients.length} waiting patient(s)`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to send delay broadcast', 'error');
    } finally {
      setDelayBroadcastLoading(null);
    }
  };

  // Clear selections when tab changes
  useEffect(() => {
    setSelectedIds([]);
  }, [tab]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBulkAction = async (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) {
      toast('Please select at least one appointment first.', 'error');
      return;
    }
    if (action === 'Approve Selected') {
      await Promise.all(selectedIds.map(id => approveRequestApi(id)));
      toast(`Approved ${selectedIds.length} requests.`, 'success');
      setSelectedIds([]);
    } else {
      setBulkModalParams({ isOpen: true, channel: action });
    }
  };

  const sendBulkMessage = async (channel, messageText) => {
    const recipients = filteredData.filter(r => selectedIds.includes(r.id));
    const patientIds = [...new Set(recipients.map(r => r.patientId).filter(Boolean))];
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Appointments — ${recipients.length} patient(s)`,
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length && filteredData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const callNext = async () => {
    const nxt = queue.find(p => p.status === 'Waiting');
    try {
      await callNextForDoctor();
      toast(nxt ? `Called ${nxt.name} (${nxt.token})` : 'Queue advanced', 'success');
    } catch (err) {
      toast(err.message || 'Failed to advance the queue', 'error');
    }
  };

  const approveRequest = async (req) => {
    try {
      await approveRequestApi(req.id);
      toast(`Appointment approved for ${req.name}`, 'success');
    } catch (err) {
      toast(err.message || `Failed to approve ${req.name}'s request`, 'error');
    }
  };

  const rejectRequest = async (req) => {
    try {
      await rejectRequestApi(req.id);
      toast(`Request from ${req.name} rejected`, 'info');
    } catch (err) {
      toast(err.message || `Failed to reject ${req.name}'s request`, 'error');
    }
  };

  const handleCancel = async () => {
    const name = cancelTarget.name;
    const id = cancelTarget.id;
    try {
      await cancelAppointment(id);
      toast(`Appointment with ${name} cancelled`, 'info');
    } catch (err) {
      toast(err.message || `Failed to cancel appointment with ${name}`, 'error');
    } finally {
      setCancelTarget(null);
    }
  };

  const saveNotes = async ({ notes, diagnosis, followUp }) => {
    const combined = [notes && `Subjective: ${notes}`, diagnosis && `Assessment: ${diagnosis}`, followUp && `Plan: ${followUp}`].filter(Boolean).join('\n');
    if (!combined) { toast('Add at least one note before saving.', 'error'); return; }
    try {
      await apiFetch(`/telemedicine/${notesTarget.id}/notes`, { method: 'POST', body: { note: combined } });
      toast(`SOAP notes saved for ${notesTarget?.name}`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to save notes', 'error');
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Queue Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your daily tokens, approvals, and call history.</p>
        </div>
        <button onClick={callNext}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm">
          <i className="fas fa-bullhorn animate-pulse"></i> Call Next Patient
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'In Queue', value: queue.filter(q => q.status !== 'Done').length, color: 'text-aubergine-700', bg: 'bg-gradient-to-br from-aubergine-50 to-white', icon: 'fa-users', iconColor: 'text-aubergine-200' },
          { label: 'Waiting', value: queue.filter(q => q.status === 'Waiting').length, color: 'text-amber-600', bg: 'bg-gradient-to-br from-amber-50 to-white', icon: 'fa-hourglass-half', iconColor: 'text-amber-200' },
          { label: 'Completed', value: queue.filter(q => q.status === 'Done').length, color: 'text-emerald-600', bg: 'bg-gradient-to-br from-emerald-50 to-white', icon: 'fa-check-circle', iconColor: 'text-emerald-200' },
          { label: 'Requests', value: requests.length, color: 'text-rose-600', bg: 'bg-gradient-to-br from-rose-50 to-white', icon: 'fa-inbox', iconColor: 'text-rose-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative overflow-hidden group`}>
            <div className="relative z-10">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
            <i className={`fas ${s.icon} absolute -right-2 -bottom-2 text-6xl ${s.iconColor} opacity-50 group-hover:scale-110 transition-transform duration-300`}></i>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {/* Tabs */}
        <div className="p-2 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-2">
          {[
            ['queue',    'Today\'s Queue', queue.length],
            ['requests', 'New Requests', requests.length],
            ['past',     'Past Consults', past.length],
          ].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}>
              {label}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Filters & Delay Broadcast Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-white">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full max-w-2xl">
              <div className="relative flex-1 group">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-aubergine-500 transition-colors"></i>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name or token..."
                  className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 focus:bg-white transition-all shadow-inner" />
              </div>
              <div className="relative group min-w-[160px]">
                <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-aubergine-500 transition-colors z-10"></i>
                <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 focus:bg-white transition-all appearance-none cursor-pointer">
                  <option value="All Modes">All Modes</option>
                  <option value="Video">Video Consult</option>
                  <option value="Clinic">Clinic Visit</option>
                </select>
                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
            </div>

            <div className="relative w-full sm:w-auto" ref={actionsMenuRef}>
              <button 
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Bulk Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in origin-top-right">
                  <div className="px-4 py-2 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Messaging Channels</p>
                  </div>
                  <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-3 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      <i className="fas fa-envelope text-sky-500"></i>
                    </div>
                    Bulk Email
                  </button>
                  <button onClick={() => handleBulkAction('Push Notification')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-3 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      <i className="fas fa-bell text-amber-500"></i>
                    </div>
                    Push Notification
                  </button>
                  <button onClick={() => handleBulkAction('WhatsApp Message')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      <i className="fab fa-whatsapp text-emerald-500 text-lg"></i>
                    </div>
                    WhatsApp Message
                  </button>
                  {tab === 'requests' && (
                    <>
                      <div className="h-px bg-slate-100 my-2 mx-4"></div>
                      <button onClick={() => handleBulkAction('Approve Selected')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-3 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-white transition-colors">
                          <i className="fas fa-check-double text-emerald-600"></i>
                        </div>
                        Approve Selected
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 1-Click Delay Broadcast Toolbar (Queue only) ── */}
          {tab === 'queue' && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <i className="fas fa-clock-rotate-left text-amber-500"></i>
                Delay Alert:
              </div>
              {[10, 20, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => sendDelayBroadcast(mins)}
                  disabled={!!delayBroadcastLoading}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-xl border transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 hover:-translate-y-0.5"
                >
                  {delayBroadcastLoading === mins ? (
                    <i className="fas fa-spinner fa-spin text-[10px]"></i>
                  ) : (
                    <i className="fas fa-broadcast-tower text-[10px]"></i>
                  )}
                  +{mins} Min Delay
                </button>
              ))}
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                Broadcasts to all <strong className="text-amber-700">{queue.filter(p => p.status === 'Waiting').length}</strong> waiting patients via Push, WhatsApp &amp; Email
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-left text-sm border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-2 font-bold w-12">
                  <label className="flex items-center justify-center cursor-pointer">
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.length > 0 && selectedIds.length === filteredData.length ? 'bg-aubergine-600 shadow-sm text-white' : selectedIds.length > 0 ? 'bg-aubergine-200 text-aubergine-700 ring-1 ring-aubergine-400' : 'bg-slate-100/80 hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset'}`}>
                      {(selectedIds.length > 0 && selectedIds.length === filteredData.length) ? <i className="fas fa-check text-[9px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-700 rounded-full"></div> : null}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedIds.length === filteredData.length} onChange={toggleSelectAll} />
                  </label>
                </th>
                {tab === 'queue' && <th className="px-4 py-2 font-bold">Token</th>}
                <th className="px-4 py-2 font-bold">Patient</th>
                <th className="px-4 py-2 font-bold">Purpose</th>
                <th className="px-4 py-2 font-bold">{tab === 'past' ? 'Date' : 'Time'}</th>
                {tab === 'queue' && <th className="px-4 py-2 font-bold">Est. Wait</th>}
                <th className="px-4 py-2 font-bold">Format</th>
                {tab === 'queue' && <th className="px-4 py-2 font-bold">Status</th>}
                <th className="px-4 py-2 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'queue' && filteredData.map((p, tokenIndex) => {
                const waiting = queue.filter(q => q.status === 'Waiting');
                const waitingIndex = waiting.findIndex(w => w.id === p.id);
                const estWait = p.status === 'Waiting' && waitingIndex >= 0
                  ? computeEstWait(waitingIndex)
                  : null;
                return (
                  <tr key={p.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md ${selectedIds.includes(p.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'} ${p.status === 'In Progress' ? 'ring-1 ring-emerald-400 bg-emerald-50/20' : ''}`}>
                    <td className="px-4 py-3 rounded-l-2xl align-middle">
                      <label className="flex items-center justify-center cursor-pointer">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset group-hover:ring-aubergine-300'}`}>
                          {selectedIds.includes(p.id) && <i className="fas fa-check text-[9px]"></i>}
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                      </label>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg font-mono tracking-widest ${p.status === 'In Progress' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-slate-800 text-white shadow-sm shadow-slate-800/30'}`}>{p.token}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-aubergine-100 flex items-center justify-center text-aubergine-700 font-bold text-sm shadow-inner shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 tracking-tight">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{p.age}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">{p.type}</span>
                    </td>
                    <td className="px-4 py-3 align-middle font-bold text-aubergine-700 text-[13px] whitespace-nowrap">{p.time}</td>
                    {/* Dynamic Wait-Time Projection */}
                    <td className="px-4 py-3 align-middle">
                      {p.status === 'In Progress' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <i className="fas fa-stethoscope text-[9px] animate-pulse"></i> In Session
                        </span>
                      ) : p.status === 'Done' ? (
                        <span className="text-[11px] font-bold text-slate-400">Done</span>
                      ) : estWait ? (
                        <div className="space-y-0.5">
                          <div className="text-[12px] font-black text-slate-800">{estWait.timeStr}</div>
                          <div className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <i className="fas fa-hourglass-half text-[8px]"></i>
                            ~{estWait.waitMins}m wait
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${p.mode === 'Video' ? 'bg-sky-50 text-sky-700' : 'bg-slate-50 text-slate-600'}`}>
                        <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {p.status !== 'Done' && (
                          <button onClick={() => setCancelTarget(p)} title="Cancel Appointment" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                        <button onClick={() => setNotesTarget(p)} className="text-aubergine-600 font-bold text-[11px] px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100 flex items-center gap-1.5 shadow-sm">
                          <i className={`fas ${p.status === 'Done' ? 'fa-file-lines' : 'fa-pen'}`}></i> {p.status === 'Done' ? 'Notes' : 'Notes'}
                        </button>
                        {p.mode === 'Video' && p.status !== 'Done' && (
                          <button onClick={() => navigate(`/doctor-dashboard/telemedicine?startCall=${p.id}`)} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                            <i className="fas fa-video animate-pulse"></i> Join
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tab === 'queue' && filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-slate-400">
                      <i className="fas fa-mug-hot text-4xl mb-3 text-slate-300"></i>
                      <p className="text-sm font-bold">No patients in the queue right now.</p>
                      <p className="text-[11px]">Take a quick break or check your new requests.</p>
                    </div>
                  </td>
                </tr>
              )}

              {tab === 'requests' && filteredData.map(r => (
                <tr key={r.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl overflow-hidden ${selectedIds.includes(r.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'}`}>
                  <td className="px-4 py-3 rounded-l-2xl align-middle">
                    <label className="flex items-center justify-center cursor-pointer">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(r.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset group-hover:ring-aubergine-300'}`}>
                        {selectedIds.includes(r.id) && <i className="fas fa-check text-[9px]"></i>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                    </label>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center text-rose-500 font-bold text-sm shadow-inner shrink-0">
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 tracking-tight">{r.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{r.age}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                     <span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">{r.type}</span>
                  </td>
                  <td className="px-4 py-3 align-middle font-bold text-aubergine-700 text-[13px] whitespace-nowrap">{r.date} • {r.time}</td>
                  <td className="px-4 py-3 align-middle">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${r.mode === 'Video' ? 'bg-sky-50 text-sky-700' : 'bg-slate-50 text-slate-600'}`}>
                      <i className={`fas ${r.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {r.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => rejectRequest(r)} className="text-rose-500 font-bold text-[11px] px-4 py-1.5 rounded-lg hover:bg-rose-50 transition-colors border border-rose-200 shadow-sm">Reject</button>
                      <button onClick={() => approveRequest(r)} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-[11px] px-4 py-1.5 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors shadow-sm shadow-emerald-500/20 flex items-center gap-1.5">
                        <i className="fas fa-check"></i> Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tab === 'requests' && filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-slate-400">
                      <i className="fas fa-inbox text-4xl mb-3 text-slate-300"></i>
                      <p className="text-sm font-bold">No pending appointment requests.</p>
                      <p className="text-[11px]">You're all caught up!</p>
                    </div>
                  </td>
                </tr>
              )}

              {tab === 'past' && filteredData.map(p => (
                <tr key={p.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl overflow-hidden ${selectedIds.includes(p.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'}`}>
                  <td className="px-4 py-3 rounded-l-2xl align-middle">
                    <label className="flex items-center justify-center cursor-pointer">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset group-hover:ring-aubergine-300'}`}>
                        {selectedIds.includes(p.id) && <i className="fas fa-check text-[9px]"></i>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                    </label>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm shadow-inner shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 tracking-tight">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{p.age}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                     <span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">{p.type}</span>
                  </td>
                  <td className="px-4 py-3 align-middle font-bold text-aubergine-700 text-[13px] whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3 align-middle">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${p.mode === 'Video' ? 'bg-sky-50 text-sky-700' : 'bg-slate-50 text-slate-600'}`}>
                      <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                    <button onClick={() => setNotesTarget(p)} className="text-aubergine-600 font-bold text-[11px] px-4 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100 shadow-sm flex items-center gap-1.5 inline-flex">
                      <i className="fas fa-file-lines"></i> View Summary
                    </button>
                  </td>
                </tr>
              ))}
              {tab === 'past' && filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-slate-400">
                      <i className="fas fa-history text-4xl mb-3 text-slate-300"></i>
                      <p className="text-sm font-bold">No past consultations found.</p>
                      <p className="text-[11px]">Adjust your filters to see more.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NotesModal patient={notesTarget} isOpen={!!notesTarget} onClose={() => setNotesTarget(null)} onSave={saveNotes} />
      <ConfirmModal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel}
        title="Cancel Appointment?" message={`Cancel appointment with ${cancelTarget?.name}? They will be notified.`}
        confirmLabel="Cancel Appointment" confirmStyle="danger" />

      <BulkMessageModal
        isOpen={bulkModalParams.isOpen}
        onClose={() => setBulkModalParams({ isOpen: false, channel: '' })}
        channel={bulkModalParams.channel}
        selectedCount={selectedIds.length}
        onSend={(messageText) => sendBulkMessage(bulkModalParams.channel, messageText)}
      />
    </div>
  );
}

export default DoctorAppointments;
