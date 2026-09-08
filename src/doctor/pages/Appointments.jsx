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
        <div className="bg-aubergine-50 border border-aubergine-200 text-aubergine-800 rounded-xl p-3 text-sm font-bold flex gap-2">
          <i className="fas fa-users mt-1 text-aubergine-600"></i>
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
  'Requested':   'bg-gradient-to-r from-aubergine-100 to-aubergine-50 text-aubergine-700 ring-1 ring-aubergine-200 ring-inset shadow-sm',
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

/* ─── Cancel Modal with Reason ───────────────── */
function CancelModal({ isOpen, onClose, onConfirm, apt }) {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const confirm = async () => {
    setCancelling(true);
    await onConfirm(reason);
    setCancelling(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Cancel Appointment?">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Are you sure you want to cancel the appointment with <strong>{apt?.name}</strong>? They will be notified.
        </p>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Cancellation Reason (optional)</label>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Why are you cancelling?"
            className="crm-input resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={cancelling} className="crm-btn-secondary flex-1 disabled:opacity-40">Keep it</button>
          <button onClick={confirm} disabled={cancelling} className="crm-btn-primary flex-1 disabled:opacity-40 bg-rose-600 hover:bg-rose-700 border-none">
            {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Video Call Modal ───────────────────────── */
/**
 * Deterministically parses 12h/24h time strings like '10:00 AM', '9:30 AM', '12:15 PM'
 * into total integer minutes from midnight (0 - 1439).
 * Eliminates naive string comparison bugs ('10:00 AM' < '9:00 AM').
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const cleaned = String(timeStr).trim();
  const isPM = cleaned.toLowerCase().includes('pm');
  const match = cleaned.match(/(\d+):(\d+)/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ─── Main Component ─────────────────────────── */
function DoctorAppointments() {
  const toast = useToast();
  const navigate = useNavigate();
  const { 
    appointments, 
    patients, 
    approveRequest: approveRequestApi, 
    rejectRequest: rejectRequestApi, 
    cancelAppointment, 
    callNextForDoctor,
    updateAppointmentStatus,
    broadcastDelay,
  } = useClinicData();

  const [tab, setTab] = useState('queue');
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
    token: a.queue_token || null,
    name: a.patientName,
    age: ageByPatientId.get(a.patientId) ? `${ageByPatientId.get(a.patientId)}F` : '—',
    type: a.reason || a.type,
    time: a.time,
    date: formatDate(a.date),
    rawDate: a.date,
    mode: a.type === 'Video Consult' || a.type === 'video' ? 'Video' : 'Clinic',
    status: a.status,
    notes: a.reason || '',
    paid: Boolean(a.paymentId || a.payment_id),
    startedAt: a.started_at,
    endedAt: a.ended_at,
    durationSeconds: a.consultation_duration_seconds,
    checkedInAt: a.checked_in_at,
    priority: a.queue_priority || 0,
    timeMinutes: parseTimeToMinutes(a.time),
  });

  // 1. All appointments for today, strictly sorted by 24h minutes (9:00 AM before 10:00 AM)
  const allTodayAppointments = useMemo(() => {
    const todayList = appointments
      .filter(a => a.date === todayStr)
      .map(toRow)
      .sort((a, b) => a.timeMinutes - b.timeMinutes);

    // Assign stable, deterministic daily tokens (T-01, T-02, ...)
    return todayList.map((r, i) => ({
      ...r,
      token: r.token || `T-${String(i + 1).padStart(2, '0')}`,
    }));
  }, [appointments, todayStr, ageByPatientId]);

  // 2. LIVE QUEUE: Strictly patients currently active in the clinical encounter or waiting
  const queue = useMemo(() => {
    return allTodayAppointments
      .filter(a => ['Waiting', 'In Progress', 'Called'].includes(a.status))
      .sort((a, b) => {
        if (a.status === 'In Progress') return -1;
        if (b.status === 'In Progress') return 1;
        if (a.status === 'Called') return -1;
        if (b.status === 'Called') return 1;
        const pDiff = (b.priority || 0) - (a.priority || 0);
        if (pDiff !== 0) return pDiff;
        return a.timeMinutes - b.timeMinutes;
      });
  }, [allTodayAppointments]);

  const activeConsultation = useMemo(() => {
    return queue.find(p => p.status === 'In Progress') || null;
  }, [queue]);

  const waitingPatients = useMemo(() => {
    return queue.filter(p => p.status === 'Waiting');
  }, [queue]);

  const nextPatient = useMemo(() => {
    return waitingPatients[0] || null;
  }, [waitingPatients]);

  const completedToday = useMemo(() => {
    return allTodayAppointments.filter(p => p.status === 'Done');
  }, [allTodayAppointments]);

  // 3. UPCOMING: Today's unarrived confirmed bookings + future confirmed bookings
  const upcoming = useMemo(() => {
    const todayUnarrived = allTodayAppointments.filter(a => ['Upcoming', 'Approved'].includes(a.status));
    const future = appointments
      .filter(a => a.date > todayStr && ['Upcoming', 'Approved', 'Waiting', 'In Progress'].includes(a.status))
      .map(toRow)
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate) || a.timeMinutes - b.timeMinutes);
    return [...todayUnarrived, ...future];
  }, [allTodayAppointments, appointments, todayStr, ageByPatientId]);

  // 4. REQUESTS: Unapproved booking requests
  const requests = useMemo(() => appointments
    .filter(a => ['Requested', 'HOLD'].includes(a.status))
    .map(toRow)
    .sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || '')),
    [appointments, ageByPatientId]);

  // 5. PAST / COMPLETED: History of finished or cancelled visits
  const past = useMemo(() => appointments
    .filter(a => (a.date < todayStr || a.status === 'Done' || a.status === 'Cancelled' || a.status === 'No Show') && !['Requested', 'HOLD'].includes(a.status))
    .map(toRow)
    .sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || '') || b.timeMinutes - a.timeMinutes),
    [appointments, todayStr, ageByPatientId]);

  // Active consultation live timer
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!activeConsultation) {
      setActiveElapsedSeconds(0);
      return;
    }
    const startMs = activeConsultation.startedAt ? new Date(activeConsultation.startedAt).getTime() : Date.now();
    const initialElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    setActiveElapsedSeconds(initialElapsed);

    const interval = setInterval(() => {
      setActiveElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeConsultation?.id, activeConsultation?.startedAt]);

  // Doctor schedule delay calculation
  const currentDelayMinutes = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const AVG_MINUTES = 15;
    if (activeConsultation) {
      if (nowMinutes > activeConsultation.timeMinutes + AVG_MINUTES) {
        return nowMinutes - (activeConsultation.timeMinutes + AVG_MINUTES);
      }
    } else if (waitingPatients.length > 0) {
      if (nowMinutes > waitingPatients[0].timeMinutes + 5) {
        return nowMinutes - waitingPatients[0].timeMinutes;
      }
    }
    return 0;
  }, [activeConsultation, waitingPatients]);

  const [notesTarget, setNotesTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All Modes');
  const [upcomingDateFilter, setUpcomingDateFilter] = useState('');

  const getFilteredData = () => {
    let source = tab === 'queue' ? queue : tab === 'requests' ? requests : tab === 'upcoming' ? upcoming : past;
    
    if (tab === 'upcoming' && upcomingDateFilter) {
      source = source.filter(p => p.rawDate === upcomingDateFilter);
    }
    
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

  // Dynamic wait-time projection
  const AVG_CONSULT_MINS = 15;
  const computeEstWait = (patientId) => {
    const waitingIndex = waitingPatients.findIndex(w => w.id === patientId);
    if (waitingIndex === -1) return null;
    let baseMins = 0;
    if (activeConsultation) {
      const remainingActive = Math.max(2, AVG_CONSULT_MINS - Math.floor(activeElapsedSeconds / 60));
      baseMins = remainingActive;
    }
    const waitMins = baseMins + waitingIndex * AVG_CONSULT_MINS;
    const estMs = Date.now() + waitMins * 60 * 1000;
    const estDate = new Date(estMs);
    const timeStr = estDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { timeStr, waitMins };
  };

  // 1-Click Delay Broadcast
  const [delayBroadcastLoading, setDelayBroadcastLoading] = useState(null);
  const sendDelayBroadcast = async (delayMins) => {
    if (!waitingPatients.length) {
      toast('No waiting patients currently in queue to notify.', 'info');
      return;
    }
    setDelayBroadcastLoading(delayMins);
    try {
      if (broadcastDelay) {
        await broadcastDelay(delayMins);
      } else {
        const patientIds = [...new Set(waitingPatients.map(p => p.patientId).filter(Boolean))];
        await apiFetch('/communications/broadcasts', {
          method: 'POST',
          body: {
            subject: `⏰ Schedule Update: +${delayMins} Min Delay`,
            body: `Dear Patient, the doctor is currently running approximately ${delayMins} minutes behind schedule. We appreciate your patience. Your token will be called as soon as possible.`,
            audience: `Waiting Queue — ${waitingPatients.length} patient(s)`,
            channels: ['Push Notification', 'WhatsApp Message'],
            scheduleType: 'immediate',
            patientIds,
          },
        });
      }
      toast(`⏰ +${delayMins} min delay notice broadcast to ${waitingPatients.length} waiting patient(s)`, 'success');
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
    if (!nextPatient) {
      toast('No patients currently waiting in the queue.', 'info');
      return;
    }
    try {
      await callNextForDoctor();
      toast(`Called next patient: ${nextPatient.name} (${nextPatient.token})`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to advance the queue', 'error');
    }
  };

  const concludeConsultation = async (patientRow) => {
    const target = patientRow || activeConsultation;
    if (!target) return;
    try {
      await updateAppointmentStatus(target.id, 'Done');
      toast(`Consultation concluded for ${target.name}. Moved to Completed records.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to conclude consultation', 'error');
    }
  };

  const approveRequest = async (req) => {
    setActionLoadingId(req.id);
    try {
      await approveRequestApi(req.id);
      toast(`Appointment approved for ${req.name}`, 'success');
    } catch (err) {
      toast(err.message || `Failed to approve ${req.name}'s request`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectRequest = async (req) => {
    setActionLoadingId(req.id);
    try {
      await rejectRequestApi(req.id);
      toast(`Request from ${req.name} rejected`, 'info');
    } catch (err) {
      toast(err.message || `Failed to reject ${req.name}'s request`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (reason) => {
    const name = cancelTarget.name;
    const id = cancelTarget.id;
    try {
      await cancelAppointment(id, reason);
      toast(`Appointment with ${name} cancelled`, 'info');
      setCancelTarget(null);
    } catch (err) {
      toast(err.message || `Failed to cancel appointment with ${name}`, 'error');
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
    <div className="space-y-4 animate-fade-in">
      {/* Header with OPD / Telemedicine Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Queue Management</h1>
            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-xs ${
              currentDelayMinutes > 0 
                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <i className={`fas ${currentDelayMinutes > 0 ? 'fa-clock-rotate-left' : 'fa-check-circle'} text-[10px]`}></i>
              {currentDelayMinutes > 0 ? `Running ~${currentDelayMinutes} min behind` : 'Schedule on track'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Live patient waiting lobby, consultation flow, and appointment approvals.</p>
        </div>

        {/* Primary Call Next Button with Strict Eligibility Guard */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={callNext}
            disabled={!nextPatient}
            title={!nextPatient ? "No patients currently waiting in queue" : `Call ${nextPatient.name} (${nextPatient.token})`}
            className={`w-full sm:w-auto font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm ${
              nextPatient
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-600/25 hover:-translate-y-0.5 cursor-pointer'
                : 'bg-slate-200 text-slate-400 border border-slate-300 shadow-none cursor-not-allowed opacity-75'
            }`}
          >
            <i className={`fas fa-bullhorn ${nextPatient ? 'animate-pulse' : ''}`}></i>
            {nextPatient ? `Call Next: ${nextPatient.name} (${nextPatient.token})` : 'No Patients Waiting'}
          </button>
        </div>
      </div>

      {/* Top Clinical KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Waiting', value: waitingPatients.length, color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/70', icon: 'fa-hourglass-half', iconColor: 'text-amber-300' },
          { label: 'In Consultation', value: activeConsultation ? 1 : 0, color: 'text-emerald-700', bg: 'bg-emerald-50/50 border-emerald-200/70', icon: 'fa-stethoscope', iconColor: 'text-emerald-300' },
          { label: 'Next Patient', value: nextPatient ? nextPatient.token : 'None', color: 'text-aubergine-700', bg: 'bg-aubergine-50/50 border-aubergine-200/70', icon: 'fa-user-check', iconColor: 'text-aubergine-300' },
          { label: 'Delay', value: currentDelayMinutes > 0 ? `+${currentDelayMinutes}m` : '0m', color: currentDelayMinutes > 0 ? 'text-rose-600' : 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: 'fa-clock', iconColor: 'text-slate-300' },
          { label: 'Completed Today', value: completedToday.length, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', icon: 'fa-circle-check', iconColor: 'text-slate-300' },
          { label: 'Requests', value: requests.length, color: 'text-rose-600', bg: 'bg-rose-50/50 border-rose-200/70', icon: 'fa-inbox', iconColor: 'text-rose-300' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl border p-4 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group`}>
            <div className="relative z-10">
              <div className={`text-2xl font-black ${s.color} font-mono tracking-tight`}>{s.value}</div>
              <div className="text-[11px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{s.label}</div>
            </div>
            <i className={`fas ${s.icon} absolute -right-2 -bottom-2 text-5xl ${s.iconColor} opacity-40 group-hover:scale-105 transition-transform duration-300`}></i>
          </div>
        ))}
      </div>

      {/* ── Active Consultation Hero Card (Live Encounter) ── */}
      {activeConsultation && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-700/20 border border-emerald-500/40 relative overflow-hidden animate-fade-in">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl font-black font-mono shadow-inner border border-white/30 shrink-0">
                {activeConsultation.token}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white/25 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-white/20 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span> Live Consultation
                  </span>
                  <span className="text-white/80 text-xs font-semibold">
                    Scheduled: {activeConsultation.time}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-1 tracking-tight">
                  {activeConsultation.name} <span className="text-sm font-medium text-emerald-100 font-sans">({activeConsultation.age})</span>
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5 flex items-center gap-2">
                  <span><i className="fas fa-notes-medical mr-1"></i> {activeConsultation.type}</span>
                  <span>•</span>
                  <span><i className={`fas ${activeConsultation.mode === 'Video' ? 'fa-video' : 'fa-hospital'} mr-1`}></i> {activeConsultation.mode} Mode</span>
                </p>
              </div>
            </div>

            {/* Live Counter & Primary Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="bg-black/20 backdrop-blur-md rounded-xl px-4 py-2 text-center border border-white/15">
                <span className="text-[10px] font-bold text-emerald-200 block uppercase tracking-wider">Session Duration</span>
                <span className="font-mono text-lg font-black tracking-wider text-white">
                  {formatDuration(activeElapsedSeconds)}
                </span>
              </div>

              {activeConsultation.mode === 'Video' && (
                <button 
                  onClick={() => navigate(`/doctor-dashboard/telemedicine?startCall=${activeConsultation.id}`)}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <i className="fas fa-video text-emerald-600 animate-pulse"></i> Open Video Session
                </button>
              )}

              <button 
                onClick={() => setNotesTarget(activeConsultation)}
                className="bg-white/15 hover:bg-white/25 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all border border-white/20 flex items-center justify-center gap-2"
              >
                <i className="fas fa-pen-to-square"></i> SOAP Notes
              </button>

              <button 
                onClick={() => concludeConsultation(activeConsultation)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 border border-rose-400"
              >
                <i className="fas fa-circle-check"></i> Conclude Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        {/* Navigation Tabs */}
        <div className="p-2 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-2">
          {[
            ['queue',    'Live Queue', queue.length],
            ['upcoming', 'Upcoming', upcoming.length],
            ['requests', 'New Requests', requests.length],
            ['past',     'Completed & History', past.length],
          ].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                tab === key 
                  ? 'bg-white text-aubergine-800 shadow-sm ring-1 ring-slate-200/70' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
              }`}>
              {label}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-600'
              }`}>{count}</span>
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
              {tab === 'upcoming' && (
                <div className="relative group min-w-[160px]">
                  <i className="fas fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-aubergine-500 transition-colors z-10"></i>
                  <input type="date" value={upcomingDateFilter} onChange={e => setUpcomingDateFilter(e.target.value)} className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 focus:bg-white transition-all shadow-inner" />
                </div>
              )}
              <div className="relative group min-w-[160px]">
                <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-aubergine-500 transition-colors z-10"></i>
                <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full border border-slate-200 rounded-xl pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 focus:bg-white transition-all appearance-none cursor-pointer">
                  <option value="All Modes">All Formats</option>
                  <option value="Video">Video Consult</option>
                  <option value="Clinic">In-Clinic Visit</option>
                </select>
                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
              </div>
            </div>

            {/* Contextual Bulk Actions */}
            <div className="relative w-full sm:w-auto" ref={actionsMenuRef}>
              <button 
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                disabled={selectedIds.length === 0}
                className={`w-full sm:w-auto font-bold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedIds.length > 0 
                    ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-md cursor-pointer' 
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                Bulk Actions {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} 
                <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
              </button>
              {showActionsMenu && selectedIds.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-full sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in origin-top-right">
                  <div className="px-4 py-2 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Action on {selectedIds.length} Selected
                    </p>
                  </div>
                  <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-aubergine-50 hover:text-aubergine-700 flex items-center gap-3 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-aubergine-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      <i className="fas fa-envelope text-aubergine-600"></i>
                    </div>
                    Send Email Notice
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

          {/* ── Contextual Delay Broadcast Toolbar (Live Queue tab only) ── */}
          {tab === 'queue' && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100 mt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <i className="fas fa-clock-rotate-left text-amber-500"></i>
                Notify Delay:
              </div>
              {[10, 20, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => sendDelayBroadcast(mins)}
                  disabled={waitingPatients.length === 0 || !!delayBroadcastLoading}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                    waitingPatients.length > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 hover:-translate-y-0.5 cursor-pointer shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  {delayBroadcastLoading === mins ? (
                    <i className="fas fa-spinner fa-spin text-[10px]"></i>
                  ) : (
                    <i className="fas fa-broadcast-tower text-[10px]"></i>
                  )}
                  +{mins} Min Delay
                </button>
              ))}
              <span className="text-[11px] text-slate-400 font-medium ml-1">
                {waitingPatients.length > 0 ? (
                  <>Broadcasts to all <strong className="text-amber-700 font-bold">{waitingPatients.length}</strong> waiting patient(s)</>
                ) : (
                  <span className="italic text-slate-400">0 patients currently waiting in lobby</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Mobile View (< sm) */}
        <div className="sm:hidden px-3 pb-4 space-y-3">
          {tab === 'queue' && filteredData.map((p) => {
            const estWait = p.status === 'Waiting' ? computeEstWait(p.id) : null;
            return (
              <div key={p.id} className={`responsive-table-card ${p.status === 'In Progress' ? 'ring-2 ring-emerald-400 bg-emerald-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg font-mono tracking-wider ${
                      p.status === 'In Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    }`}>{p.token}</span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">{p.age} • {p.type}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-500'}`}>
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 bg-slate-50/50 -mx-4 px-4 my-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Scheduled</span>
                    <span className="font-bold text-aubergine-700">{p.time}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Wait / Status</span>
                    {p.status === 'In Progress' ? (
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <i className="fas fa-stethoscope text-[9px] animate-pulse"></i> Consulting ({formatDuration(activeElapsedSeconds)})
                      </span>
                    ) : estWait ? (
                      <span className="text-amber-700 font-bold text-[11px] flex items-center gap-1">
                        <i className="fas fa-hourglass-half text-[9px]"></i> ~{estWait.waitMins}m ({estWait.timeStr})
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] font-medium">{p.status}</span>
                    )}
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  {p.mode === 'Video' && p.status !== 'Done' && (
                    <button
                      onClick={() => navigate(`/doctor-dashboard/telemedicine?startCall=${p.id}`)}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <i className="fas fa-video animate-pulse"></i> Join
                    </button>
                  )}
                  {p.status === 'In Progress' && (
                    <button
                      onClick={() => concludeConsultation(p)}
                      className="flex-1 bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <i className="fas fa-check"></i> Conclude
                    </button>
                  )}
                  <button
                    onClick={() => setNotesTarget(p)}
                    className="crm-btn-secondary text-xs font-bold py-2.5 px-3 flex items-center justify-center gap-1.5 text-aubergine-700"
                  >
                    <i className="fas fa-pen"></i> Notes
                  </button>
                  {p.status !== 'Done' && (
                    <button
                      onClick={() => setCancelTarget(p)}
                      className="crm-btn-secondary text-xs font-bold py-2.5 px-3 text-rose-600 hover:bg-rose-50 border-rose-100 flex items-center justify-center"
                      title="Cancel"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {tab === 'queue' && filteredData.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <i className="fas fa-mug-hot text-3xl mb-2 text-slate-300"></i>
              <p className="text-sm font-bold text-slate-600">Live Queue is clear.</p>
              <p className="text-xs text-slate-400 mt-0.5">No patients currently waiting in the lobby.</p>
            </div>
          )}

          {tab === 'upcoming' && filteredData.map(p => (
            <div key={p.id} className="responsive-table-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{p.name}</h4>
                  <p className="text-[11px] text-slate-500">{p.age} • {p.type}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {p.mode}
                  </span>
                  {p.paid ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      Paid
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs py-2 border-y border-slate-100 bg-slate-50/50 -mx-4 px-4 flex justify-between my-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Scheduled</span>
                  <span className="font-bold text-aubergine-700">{p.date} • {p.time}</span>
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <button onClick={() => setCancelTarget(p)} className="crm-btn-secondary text-xs text-rose-600 hover:bg-rose-50 py-2 px-4">
                  Cancel Booking
                </button>
              </div>
            </div>
          ))}

          {tab === 'requests' && filteredData.map(r => (
            <div key={r.id} className="responsive-table-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{r.name}</h4>
                  <p className="text-[11px] text-slate-500">{r.age} • {r.type}</p>
                </div>
                <span className="text-[10px] font-bold text-aubergine-700 bg-aubergine-50 border border-aubergine-200 px-2 py-0.5 rounded-full">
                  {r.mode}
                </span>
              </div>
              <div className="text-xs py-2 border-y border-slate-100 bg-slate-50/50 -mx-4 px-4 my-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Requested Slot</span>
                <span className="font-bold text-aubergine-700">{r.date} • {r.time}</span>
              </div>
              <div className="pt-1 flex gap-2">
                {r.status === 'Approved' ? (
                  <span className="w-full text-center text-amber-600 font-bold text-xs py-2 bg-amber-50 rounded-xl border border-amber-200">
                    <i className="fas fa-hourglass-half mr-1"></i> Awaiting Patient Payment
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => rejectRequest(r)}
                      disabled={actionLoadingId === r.id}
                      className="flex-1 crm-btn-secondary text-xs font-bold text-rose-600 hover:bg-rose-50 py-2"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approveRequest(r)}
                      disabled={actionLoadingId === r.id}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-xs py-2 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {actionLoadingId === r.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {tab === 'past' && filteredData.map(p => (
            <div key={p.id} className="responsive-table-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{p.name}</h4>
                  <p className="text-[11px] text-slate-500">{p.age} • {p.type}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {p.date}
                </span>
              </div>
              <div className="pt-1 flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setNotesTarget(p)}
                  className="crm-btn-secondary text-xs font-bold py-2 px-3 text-slate-600 flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-pen"></i> Notes
                </button>
                <button
                  onClick={() => navigate(`/doctor-dashboard/appointments/summary/${p.id}`, { state: { appointment: p } })}
                  className="crm-btn-secondary text-xs font-bold py-2 px-3 text-aubergine-700 flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-file-lines"></i> Visit Summary
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Live Clinical Table (sm:block) */}
        <div className="hidden sm:block overflow-x-auto px-4 pb-4">
          <table className="w-full text-left text-sm border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-2 font-bold w-12 whitespace-nowrap">
                  <label className="flex items-center justify-center cursor-pointer">
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.length > 0 && selectedIds.length === filteredData.length ? 'bg-aubergine-600 shadow-sm text-white' : selectedIds.length > 0 ? 'bg-aubergine-200 text-aubergine-700 ring-1 ring-aubergine-400' : 'bg-slate-100/80 hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset'}`}>
                      {(selectedIds.length > 0 && selectedIds.length === filteredData.length) ? <i className="fas fa-check text-[9px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-700 rounded-full"></div> : null}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedIds.length === filteredData.length && filteredData.length > 0} onChange={toggleSelectAll} />
                  </label>
                </th>
                {tab === 'queue' && <th className="px-4 py-2 font-bold whitespace-nowrap">Token</th>}
                <th className="px-4 py-2 font-bold whitespace-nowrap">Patient</th>
                <th className="px-4 py-2 font-bold whitespace-nowrap">Clinical Purpose</th>
                <th className="px-4 py-2 font-bold whitespace-nowrap">{tab === 'past' ? 'Date' : 'Slot'}</th>
                {tab === 'queue' && <th className="px-4 py-2 font-bold whitespace-nowrap">Wait Time / Status</th>}
                <th className="px-4 py-2 font-bold whitespace-nowrap">Format</th>
                {tab === 'queue' && <th className="px-4 py-2 font-bold whitespace-nowrap">Status</th>}
                <th className="px-4 py-2 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'queue' && filteredData.map((p) => {
                const estWait = p.status === 'Waiting' ? computeEstWait(p.id) : null;
                return (
                  <tr key={p.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md ${
                    selectedIds.includes(p.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'
                  } ${p.status === 'In Progress' ? 'ring-2 ring-emerald-400 bg-emerald-50/25' : ''}`}>
                    <td className="px-4 py-3 rounded-l-2xl align-middle">
                      <label className="flex items-center justify-center cursor-pointer">
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset'}`}>
                          {selectedIds.includes(p.id) && <i className="fas fa-check text-[9px]"></i>}
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                      </label>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg font-mono tracking-widest ${
                        p.status === 'In Progress' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-slate-800 text-white shadow-sm shadow-slate-800/30'
                      }`}>{p.token}</span>
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
                    
                    {/* Live Wait-Time Metric */}
                    <td className="px-4 py-3 align-middle">
                      {p.status === 'In Progress' ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <i className="fas fa-stethoscope text-[9px] animate-pulse"></i> Consulting ({formatDuration(activeElapsedSeconds)})
                        </span>
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
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${p.mode === 'Video' ? 'bg-aubergine-50 text-aubergine-700' : 'bg-slate-50 text-slate-600'}`}>
                        <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <button onClick={() => setNotesTarget(p)} className="text-aubergine-600 font-bold text-[11px] px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100 flex items-center gap-1.5 shadow-sm">
                          <i className="fas fa-pen"></i> Notes
                        </button>
                        {p.mode === 'Video' && p.status !== 'Done' && (
                          <button onClick={() => navigate(`/doctor-dashboard/telemedicine?startCall=${p.id}`)} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                            <i className="fas fa-video animate-pulse"></i> Join
                          </button>
                        )}
                        {p.status === 'In Progress' && (
                          <button onClick={() => concludeConsultation(p)} className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-500/20">
                            <i className="fas fa-check"></i> End
                          </button>
                        )}
                        {p.status !== 'Done' && p.status !== 'In Progress' && (
                          <button onClick={() => setCancelTarget(p)} title="Cancel Appointment" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                            <i className="fas fa-times"></i>
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
                      <p className="text-sm font-bold text-slate-700">Live Queue is clear</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No patients are currently waiting in the clinical lobby.</p>
                    </div>
                  </td>
                </tr>
              )}

              {tab === 'upcoming' && filteredData.map(p => (
                <tr key={p.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl overflow-hidden ${selectedIds.includes(p.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'}`}>
                  <td className="px-4 py-3 rounded-l-2xl align-middle">
                    <label className="flex items-center justify-center cursor-pointer">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset'}`}>
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
                  <td className="px-4 py-3 align-middle font-bold text-aubergine-700 text-[13px] whitespace-nowrap">{p.date} • {p.time}</td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${p.mode === 'Video' ? 'bg-aubergine-50 text-aubergine-700' : 'bg-slate-50 text-slate-600'}`}>
                        <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                      </span>
                      {p.paid ? (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <i className="fas fa-circle-check text-[9px]"></i> Paid
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <i className="fas fa-clock text-[9px]"></i> Payment Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <button onClick={() => setCancelTarget(p)} title="Cancel Appointment" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tab === 'upcoming' && filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-slate-400">
                      <i className="fas fa-calendar-check text-4xl mb-3 text-slate-300"></i>
                      <p className="text-sm font-bold text-slate-700">No upcoming appointments found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Check back later for new bookings.</p>
                    </div>
                  </td>
                </tr>
              )}

              {tab === 'requests' && filteredData.map(r => (
                <tr key={r.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl overflow-hidden ${selectedIds.includes(r.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'}`}>
                  <td className="px-4 py-3 rounded-l-2xl align-middle">
                    <label className="flex items-center justify-center cursor-pointer">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(r.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset'}`}>
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
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${r.mode === 'Video' ? 'bg-aubergine-50 text-aubergine-700' : 'bg-slate-50 text-slate-600'}`}>
                      <i className={`fas ${r.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {r.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                    <div className="flex justify-end gap-2">
                      {r.status === 'Approved' ? (
                        <span className="text-amber-600 font-bold text-[11px] px-4 py-1.5 bg-amber-50 rounded-lg border border-amber-200 shadow-sm">
                          <i className="fas fa-hourglass-half mr-1"></i> Awaiting Payment
                        </span>
                      ) : (
                        <>
                          <button 
                            onClick={() => rejectRequest(r)} 
                            disabled={actionLoadingId === r.id}
                            className="text-rose-500 font-bold text-[11px] px-4 py-1.5 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors border border-rose-200 shadow-sm"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => approveRequest(r)} 
                            disabled={actionLoadingId === r.id}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-[11px] px-4 py-1.5 rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-500/20 flex items-center gap-1.5"
                          >
                            {actionLoadingId === r.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                            {actionLoadingId === r.id ? 'Approving…' : 'Approve'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tab === 'requests' && filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-slate-400">
                      <i className="fas fa-inbox text-4xl mb-3 text-slate-300"></i>
                      <p className="text-sm font-bold text-slate-700">No pending appointment requests</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">All booking requests have been reviewed.</p>
                    </div>
                  </td>
                </tr>
              )}

              {tab === 'past' && filteredData.map(p => (
                <tr key={p.id} className={`group bg-white hover:bg-slate-50/80 transition-all duration-300 shadow-sm hover:shadow-md rounded-2xl overflow-hidden ${selectedIds.includes(p.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : 'ring-1 ring-slate-100'}`}>
                  <td className="px-4 py-3 rounded-l-2xl align-middle">
                    <label className="flex items-center justify-center cursor-pointer">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(p.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset'}`}>
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
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold w-max px-2.5 py-1 rounded-lg ${p.mode === 'Video' ? 'bg-aubergine-50 text-aubergine-700' : 'bg-slate-50 text-slate-600'}`}>
                      <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 rounded-r-2xl align-middle text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setNotesTarget(p)} className="text-slate-600 font-bold text-[11px] px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm flex items-center gap-1.5 inline-flex">
                        <i className="fas fa-pen"></i> Notes
                      </button>
                      <button onClick={() => navigate(`/doctor-dashboard/appointments/summary/${p.id}`, { state: { appointment: p } })} className="text-aubergine-700 font-bold text-[11px] px-3.5 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-200 shadow-sm flex items-center gap-1.5 inline-flex">
                        <i className="fas fa-file-lines"></i> Summary
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tab === 'past' && filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-slate-400">
                      <i className="fas fa-history text-4xl mb-3 text-slate-300"></i>
                      <p className="text-sm font-bold text-slate-700">No past consultations found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Completed visits will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NotesModal patient={notesTarget} isOpen={!!notesTarget} onClose={() => setNotesTarget(null)} onSave={saveNotes} />
      <CancelModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        apt={cancelTarget}
      />

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
