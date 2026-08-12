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
  'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Waiting':     'bg-amber-50 text-amber-700 border-amber-200',
  'Upcoming':    'bg-slate-100 text-slate-600 border-slate-200',
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-lg font-black text-slate-800">Queue Management</h1>
          <p className="text-xs text-slate-500">Manage your daily tokens, approvals, and call history.</p>
        </div>
        <button onClick={callNext}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 text-xs">
          <i className="fas fa-bullhorn"></i> Call Next Patient
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'In Queue', value: queue.filter(q => q.status !== 'Done').length, color: 'text-aubergine-700' },
          { label: 'Waiting', value: queue.filter(q => q.status === 'Waiting').length, color: 'text-amber-600' },
          { label: 'Completed', value: queue.filter(q => q.status === 'Done').length, color: 'text-emerald-600' },
          { label: 'Requests', value: requests.length, color: 'text-rose-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-2 text-center shadow-sm">
            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-slate-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            ['queue',    'Today\'s Queue', queue.length],
            ['requests', 'New Requests', requests.length],
            ['past',     'Past Consults', past.length],
          ].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-white justify-between items-center">
          <div className="flex gap-3 flex-1 w-full max-w-md">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or token..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white" />
            </div>
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 outline-none">
              <option value="All Modes">All Modes</option>
              <option value="Video">Video Consult</option>
              <option value="Clinic">Clinic Visit</option>
            </select>
          </div>

          <div className="relative" ref={actionsMenuRef}>
            <button 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm h-full"
            >
              Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 mb-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bulk Messaging</p>
                </div>
                <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-sky-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-envelope text-sky-500 w-4"></i> Bulk Email
                </button>
                <button onClick={() => handleBulkAction('Push Notification')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-bell text-amber-500 w-4"></i> Push Notification
                </button>
                <button onClick={() => handleBulkAction('WhatsApp Message')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-3 transition-colors">
                  <i className="fab fa-whatsapp text-emerald-500 w-4 text-lg"></i> WhatsApp Message
                </button>
                {tab === 'requests' && (
                  <>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button onClick={() => handleBulkAction('Approve Selected')} className="w-full text-left px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
                      <i className="fas fa-check text-emerald-500 w-4"></i> Approve Selected
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3 w-10">
                  <label className="flex items-center justify-center cursor-pointer">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.length > 0 && selectedIds.length === filteredData.length ? 'bg-aubergine-600 border-aubergine-600 text-white' : selectedIds.length > 0 ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-600' : 'bg-white border-slate-300'}`}>
                      {(selectedIds.length > 0 && selectedIds.length === filteredData.length) ? <i className="fas fa-check text-[8px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-600 rounded"></div> : null}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedIds.length === filteredData.length} onChange={toggleSelectAll} />
                  </label>
                </th>
                {tab === 'queue' && <th className="px-5 py-3 font-semibold">Token</th>}
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">{tab === 'past' ? 'Date' : 'Time'}</th>
                <th className="px-5 py-3 font-semibold">Mode</th>
                {tab === 'queue' && <th className="px-5 py-3 font-semibold">Status</th>}
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tab === 'queue' && filteredData.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(p.id) ? 'bg-slate-50' : ''} ${p.status === 'In Progress' ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <label className="flex items-center justify-center cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(p.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                        {selectedIds.includes(p.id) && <i className="fas fa-check text-[8px]"></i>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-black px-2 py-1 rounded font-mono ${p.status === 'In Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>{p.token}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.age}</div>
                  </td>
                  <td className="px-5 py-4 text-xs"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full font-bold">{p.type}</span></td>
                  <td className="px-5 py-4 font-bold text-aubergine-700 text-xs whitespace-nowrap">{p.time}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold w-max ${p.mode === 'Video' ? 'text-sky-600' : 'text-slate-600'}`}>
                      <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{p.status}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {p.status !== 'Done' && (
                        <button onClick={() => setCancelTarget(p)} className="text-rose-500 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">Cancel</button>
                      )}
                      <button onClick={() => setNotesTarget(p)} className="text-aubergine-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100">
                        {p.status === 'Done' ? 'View Notes' : 'Add Notes'}
                      </button>
                      {p.mode === 'Video' && p.status !== 'Done' && (
                        <button onClick={() => navigate(`/doctor-dashboard/telemedicine?startCall=${p.id}`)} className="bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1">
                          <i className="fas fa-video text-[10px]"></i> Join
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tab === 'queue' && filteredData.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">No patients match your filters.</td></tr>
              )}

              {tab === 'requests' && filteredData.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(r.id) ? 'bg-slate-50' : ''}`}>
                  <td className="px-5 py-4">
                    <label className="flex items-center justify-center cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(r.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                        {selectedIds.includes(r.id) && <i className="fas fa-check text-[8px]"></i>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.age}</div>
                  </td>
                  <td className="px-5 py-4 text-xs"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full font-bold">{r.type}</span></td>
                  <td className="px-5 py-4 font-bold text-aubergine-700 text-xs whitespace-nowrap">{r.date} • {r.time}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold w-max ${r.mode === 'Video' ? 'text-sky-600' : 'text-slate-600'}`}>
                      <i className={`fas ${r.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {r.mode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => rejectRequest(r)} className="text-rose-500 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors border border-rose-200">Reject</button>
                      <button onClick={() => approveRequest(r)} className="bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">Approve</button>
                    </div>
                  </td>
                </tr>
              ))}
              {tab === 'requests' && filteredData.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No new appointment requests match your filters.</td></tr>
              )}

              {tab === 'past' && filteredData.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(p.id) ? 'bg-slate-50' : ''}`}>
                  <td className="px-5 py-4">
                    <label className="flex items-center justify-center cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(p.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                        {selectedIds.includes(p.id) && <i className="fas fa-check text-[8px]"></i>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.age}</div>
                  </td>
                  <td className="px-5 py-4 text-xs"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full font-bold">{p.type}</span></td>
                  <td className="px-5 py-4 font-bold text-aubergine-700 text-xs whitespace-nowrap">{p.date}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold w-max ${p.mode === 'Video' ? 'text-sky-600' : 'text-slate-600'}`}>
                      <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setNotesTarget(p)} className="text-aubergine-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100">
                      View Summary
                    </button>
                  </td>
                </tr>
              ))}
              {tab === 'past' && filteredData.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No past consultations match your filters.</td></tr>
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
