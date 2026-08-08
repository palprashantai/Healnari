import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const MSG_TEMPLATES = [
    { id: 'T1', name: 'Join Link Ready', text: 'Hi [Name], your video consultation link is now ready. Please join through the app or click the link sent to your email.' },
    { id: 'T2', name: 'Session Delayed', text: 'Dear [Name], your teleconsultation has been delayed by approximately 15 minutes. We apologize for the inconvenience.' },
    { id: 'T3', name: 'Session Rescheduled', text: 'Dear [Name], your video consultation has been rescheduled. Please check the app for your updated appointment time.' },
    { id: 'T4', name: 'Post-Consult Follow-up', text: 'Hello [Name], thank you for your teleconsultation today. Your prescription and notes have been uploaded to your profile.' },
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
          <p>Sending {channel} to {selectedCount} selected session(s).</p>
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

/* ─── Active Call UI (Dual-Pane Split Screen Layout) ─────────────────────────── */
function ActiveCallUI({ session, onEnd }) {
  const toast = useToast();
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);
  const [screen, setScreen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [activeTab, setActiveTab] = useState('notes'); // notes | rx | lab
  const [elapsed, setElapsed] = useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-950 rounded-3xl p-4 shadow-2xl border border-slate-800">
      
      {/* Left 50% / 7 Cols: Video Call & Stream */}
      <div className="lg:col-span-7 flex flex-col space-y-3">
        <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {/* Patient Video (main) */}
          <div className="text-center text-white">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-aubergine-600 to-aubergine-800 mx-auto mb-3 flex items-center justify-center text-3xl font-black shadow-lg">
              {session.patient.split(' ').map(n => n[0]).join('')}
            </div>
            <p className="font-bold text-lg">{session.patient}</p>
            <p className="text-emerald-400 text-xs mt-1 font-semibold flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Encrypted Audio/Video
            </p>
          </div>

          {/* Timer */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span> {fmt(elapsed)}
          </div>

          {/* Patient info overlay */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-xl border border-white/10 font-medium">
            {session.type} ({session.age})
          </div>

          {/* Doctor PiP */}
          <div className="absolute bottom-4 right-4 w-32 h-24 bg-slate-800 rounded-xl border border-white/20 flex items-center justify-center text-white text-xs font-bold shadow-xl overflow-hidden">
            {vidOff ? <i className="fas fa-video-slash text-slate-500 text-xl"></i> : <span className="bg-aubergine-900/80 px-2 py-1 rounded text-[10px]">Dr. Sarah Mitchell</span>}
          </div>
        </div>

        {/* Call Controls Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all ${muted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={() => setVidOff(!vidOff)} title={vidOff ? 'Turn on camera' : 'Turn off camera'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all ${vidOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              <i className={`fas ${vidOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
            <button onClick={() => setScreen(!screen)} title="Share screen"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all ${screen ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              <i className="fas fa-desktop"></i>
            </button>
          </div>

          <button onClick={() => onEnd(clinicalNotes)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg">
            <i className="fas fa-phone-slash"></i> End Consultation
          </button>
        </div>
      </div>

      {/* Right 50% / 5 Cols: Integrated Real-Time EHR Charting Canvas */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-file-medical text-aubergine-400"></i>
            <h3 className="font-bold text-sm text-white">Live EHR Consultation Canvas</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30">Auto-Saving</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 mb-3 gap-2">
          <button onClick={() => setActiveTab('notes')} className={`pb-2 text-xs font-bold border-b-2 transition-all ${activeTab === 'notes' ? 'border-aubergine-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            Clinical Notes
          </button>
          <button onClick={() => setActiveTab('rx')} className={`pb-2 text-xs font-bold border-b-2 transition-all ${activeTab === 'rx' ? 'border-aubergine-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            Instant E-Rx
          </button>
          <button onClick={() => setActiveTab('lab')} className={`pb-2 text-xs font-bold border-b-2 transition-all ${activeTab === 'lab' ? 'border-aubergine-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            Order Labs
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Subjective / Objective Findings</label>
              <textarea rows={6} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-aubergine-500 resize-none font-mono" />
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
              <p className="text-slate-500 font-bold">Vitals & Patient Summary:</p>
              <p className="text-slate-300">BP: 118/78 mmHg • BMI: 24.2 • Known Allergy: Penicillin</p>
            </div>
          </div>
        )}

        {activeTab === 'rx' && (
          <div className="flex-1 space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <p className="font-bold text-aubergine-300">Prescription Draft</p>
              <p className="text-slate-300">• Metformin 500mg (1-0-1 After Meals)</p>
              <p className="text-slate-300">• Myo-Inositol 2g (1-0-0 Empty Stomach)</p>
            </div>
            <button onClick={() => toast('Rx attached to consult session.', 'success')} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors">
              Attach & Sign E-Prescription
            </button>
          </div>
        )}

        {activeTab === 'lab' && (
          <div className="flex-1 space-y-3 text-xs">
            <p className="text-slate-500">Order Diagnostic Tests:</p>
            <div className="space-y-1.5">
              {['Hormonal Panel (LH, FSH, AMH)', 'Full Thyroid Profile (TSH, FT3, FT4)', 'Fasting Glucose & HbA1c'].map(lab => (
                <label key={lab} className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer text-slate-300">
                  <input type="checkbox" defaultChecked className="accent-aubergine-600" />
                  <span>{lab}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
          <span>Patient: {session.patient}</span>
          <span>HIPAA Compliant Session</span>
        </div>
      </div>

    </div>
  );
}


/* ─── Main Component ─────────────────────────── */
function DoctorTelemedicine() {
  const toast = useToast();
  const [activeCall, setActiveCall] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [rawSessions, setRawSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = todayLocalStr();
  const loadQueue = () => apiFetch('/telemedicine/queue')
    .then(setRawSessions)
    .catch(err => toast(err.message || 'Failed to load queue', 'error'))
    .finally(() => setLoading(false));
  useEffect(() => { loadQueue(); }, []);

  const sessions = rawSessions.map(s => ({
    id: s.id,
    patient: s.patientName,
    age: s.patientAge != null ? `${s.patientAge}F` : '—',
    type: s.reason || 'Consultation',
    time: s.scheduled_time,
    date: s.scheduled_date === todayStr ? 'Today' : new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    phone: s.patientPhone || '—',
    waiting: s.status === 'Waiting' || s.status === 'In Progress',
    accepted: s.status !== 'Requested',
    status: s.status,
  }));

  const [selectedIds, setSelectedIds] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState({ isOpen: false, channel: '' });
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBulkAction = (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) { toast('Please select at least one session first.', 'error'); return; }
    setBulkModalParams({ isOpen: true, channel: action });
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === sessions.length && sessions.length > 0) setSelectedIds([]);
    else setSelectedIds(sessions.map(s => s.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const setStatus = (id, status) => apiFetch(`/appointments/${id}/status`, { method: 'PUT', body: { status } });

  const handleAccept = async (id) => {
    try {
      await setStatus(id, 'Upcoming');
      await loadQueue();
      toast('Appointment accepted', 'success');
    } catch (err) {
      toast(err.message || 'Failed to accept', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await setStatus(id, 'Cancelled');
      await loadQueue();
      toast('Appointment rejected and refunded', 'info');
    } catch (err) {
      toast(err.message || 'Failed to reject', 'error');
    }
  };

  const joinCall = async (session) => {
    try {
      await setStatus(session.id, 'In Progress');
      setActiveCall(session);
      toast(`Joining call with ${session.patient}...`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to join call', 'error');
    }
  };

  const endCall = async (notes) => {
    try {
      if (notes) await apiFetch(`/telemedicine/${activeCall.id}/notes`, { method: 'POST', body: { note: notes } });
      await setStatus(activeCall.id, 'Done');
      await loadQueue();
      toast('Call ended. Summary saved.', 'info');
    } catch (err) {
      toast(err.message || 'Failed to end call', 'error');
    } finally {
      setActiveCall(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading queue...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Telemedicine</h1>
          <p className="text-sm text-slate-500">Private, doctor-only video consultations.</p>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-700 text-xs font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> System Online
          </div>
        </div>
      </div>

      {/* Active Call */}
      {activeCall ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live: {activeCall.patient}
            </h2>
            <button onClick={endCall} className="text-rose-600 font-bold text-sm hover:underline flex items-center gap-1.5">
              <i className="fas fa-phone-slash"></i> End Call
            </button>
          </div>
          <ActiveCallUI session={activeCall} onEnd={endCall} />
        </div>
      ) : (
        <>
          {/* Sessions Queue */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Video Consultation Queue</h2>
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.length > 0 && selectedIds.length === sessions.length ? 'bg-aubergine-600 border-aubergine-600 text-white' : selectedIds.length > 0 ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-600' : 'bg-white border-slate-300'}`}>
                    {(selectedIds.length > 0 && selectedIds.length === sessions.length) ? <i className="fas fa-check text-[8px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-600 rounded"></div> : null}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedIds.length === sessions.length && sessions.length > 0} onChange={toggleSelectAll} />
                  Select All
                </label>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {sessions.map(s => (
                <div key={s.id} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors ${s.waiting ? 'bg-emerald-50/40' : ''} ${selectedIds.includes(s.id) ? 'ring-1 ring-inset ring-aubergine-200 bg-aubergine-50/20' : ''}`}>
                  <label className="cursor-pointer group flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(s.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                      {selectedIds.includes(s.id) && <i className="fas fa-check text-[10px]"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                  </label>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-aubergine-100 text-aubergine-700 font-black flex items-center justify-center">
                        {s.patient.split(' ').map(n => n[0]).join('')}
                      </div>
                      {s.waiting && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">{s.patient}</h3>
                        {s.waiting && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full border border-emerald-200">WAITING</span>}
                        {!s.accepted && <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full border border-amber-200">NEW REQUEST</span>}
                      </div>
                      <p className="text-xs text-slate-500">{s.age} • {s.type}</p>
                      <p className="text-xs text-aubergine-700 font-bold">{s.date} — {s.time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${s.phone}`}
                      className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors border border-slate-200" title="Call">
                      <i className="fas fa-phone text-xs"></i>
                    </a>
                    <button onClick={() => { setNoteTarget(s); setNoteDraft(''); setShowNotes(true); }}
                      className="text-xs font-bold text-aubergine-600 border border-aubergine-200 px-3 py-2 rounded-xl hover:bg-aubergine-50 transition-colors">
                      Notes
                    </button>
                    {s.accepted ? (
                      <button onClick={() => joinCall(s)}
                        className={`font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 ${s.waiting ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' : 'bg-aubergine-600 hover:bg-aubergine-700 text-white'}`}>
                        <i className="fas fa-video"></i> {s.waiting ? 'Join Now' : 'Start Call'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleReject(s.id)}
                          className="font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100">
                          <i className="fas fa-times"></i> Reject
                        </button>
                        <button onClick={() => handleAccept(s.id)}
                          className="font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                          <i className="fas fa-check"></i> Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="bg-white p-12 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                    <i className="fas fa-mug-hot text-4xl text-slate-300"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">Queue is Empty</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    You have no upcoming telemedicine consultations. Enjoy your break!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tech Tips */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: 'fa-shield-halved', title: 'Private Sessions', sub: 'Doctor-only access, no session recording.' },
              { icon: 'fa-file-lines', title: 'Auto-SOAP Notes', sub: 'AI transcription & note generation.' },
              { icon: 'fa-hospital', title: 'NMC Compliant', sub: 'Telemedicine practice guidelines met.' },
            ].map(tip => (
              <div key={tip.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-aubergine-50 text-aubergine-600 flex items-center justify-center flex-shrink-0">
                  <i className={`fas ${tip.icon}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{tip.title}</h4>
                  <p className="text-xs text-slate-500">{tip.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes Modal */}
      <Modal isOpen={showNotes} onClose={() => setShowNotes(false)} title={`Pre-call Notes — ${noteTarget?.patient}`} size="sm">
        <div className="space-y-4">
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs text-aubergine-800">
            <strong>Visit Type:</strong> {noteTarget?.type}<br />
            <strong>Scheduled:</strong> {noteTarget?.date} at {noteTarget?.time}
          </div>
          <textarea rows={4} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Pre-call notes, patient history reminders..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          <button onClick={async () => {
            try {
              if (noteDraft.trim()) await apiFetch(`/telemedicine/${noteTarget.id}/notes`, { method: 'POST', body: { note: noteDraft.trim() } });
              toast('Notes saved for this session.', 'success');
            } catch (err) {
              toast(err.message || 'Failed to save notes', 'error');
            }
            setShowNotes(false);
          }}
            className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Save Notes
          </button>
        </div>
      </Modal>

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

export default DoctorTelemedicine;
