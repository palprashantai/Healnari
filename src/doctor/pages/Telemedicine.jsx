import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { useWebRTCCall } from '../../hooks/useWebRTCCall.js';
import { useFullscreen } from '../../hooks/useFullscreen.js';
import { PreJoinCheck } from '../../components/PreJoinCheck.jsx';

/** Binds a MediaStream to a <video> element — React has no declarative prop
 * for srcObject, so this stays a thin imperative wrapper. */
function VideoTile({ stream, muted = false, mirrored = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  if (!stream) return null;
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}

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
const LAB_OPTIONS = ['Hormonal Panel (LH, FSH, AMH)', 'Full Thyroid Profile (TSH, FT3, FT4)', 'Fasting Glucose & HbA1c'];

const QUALITY_STYLES = {
  good: 'bg-emerald-500/20 text-emerald-400',
  fair: 'bg-amber-500/20 text-amber-400',
  poor: 'bg-rose-500/20 text-rose-400',
};

function ActiveCallUI({ session, onEnd, onDeclined, autoJoin = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const { callDeclinedId, clearCallDeclined } = useNotifications() || {};
  const [joined, setJoined] = useState(autoJoin);
  const call = useWebRTCCall({ appointmentId: session.id, active: joined });
  const videoAreaRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen, supported: fullscreenSupported } = useFullscreen(videoAreaRef);

  useEffect(() => {
    if (callDeclinedId !== session.id) return;
    call.hangUp();
    onDeclined?.();
    clearCallDeclined?.();
  }, [callDeclinedId, session.id]);

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefExpanded, setBriefExpanded] = useState(false);

  useEffect(() => {
    apiFetch(`/appointments/${session.id}/consult-brief`)
      .then(setBrief)
      .catch(() => setBrief(null))
      .finally(() => setBriefLoading(false));
  }, [session.id]);

  // Draft State
  const [draftMeds, setDraftMeds] = useState([]);
  const [draftLabs, setDraftLabs] = useState([]);

  // Med Input State
  const [rxName, setRxName] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxSchedule, setRxSchedule] = useState('1-0-1');
  const [rxDuration, setRxDuration] = useState('30 Days');

  const [showSignModal, setShowSignModal] = useState(false);

  const handleAddMedToDraft = () => {
    if (!rxName.trim()) { toast('Enter a medication name.', 'error'); return; }
    setDraftMeds([...draftMeds, { name: rxName.trim(), dosage: rxDosage, frequency: rxSchedule, duration: rxDuration, instructions: '' }]);
    setRxName(''); setRxDosage('');
  };

  const removeMedFromDraft = (index) => {
    setDraftMeds(draftMeds.filter((_, i) => i !== index));
  };

  const toggleLabDraft = (lab) => {
    setDraftLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  };

  const applyProtocol = (protocol) => {
    if (protocol === 'PCOS') {
      setClinicalNotes("Patient presents with irregular cycles and signs of hyperandrogenism.\n\nPlan: Discussed lifestyle modifications. Started on Metformin. Follow up in 3 months with new lab reports.");
      setDraftMeds([{ name: 'Metformin ER', dosage: '500mg', frequency: '0-0-1', duration: '90 Days', instructions: 'Take with dinner' }]);
      setDraftLabs(['Hormonal Panel (LH, FSH, AMH)', 'Fasting Glucose & HbA1c']);
      toast('PCOS Protocol Applied', 'success');
    } else if (protocol === 'UTI') {
      setClinicalNotes("Patient reports dysuria and increased frequency for 2 days. No fever or flank pain. Prescribed antibiotics.\n\nPlan: Push fluids. If symptoms persist >3 days, repeat urine culture.");
      setDraftMeds([{ name: 'Nitrofurantoin', dosage: '100mg', frequency: '1-0-1', duration: '5 Days', instructions: '' }]);
      toast('UTI Protocol Applied', 'success');
    }
  };

  useEffect(() => {
    if (call.connectionState !== 'connected') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [call.connectionState]);

  useEffect(() => {
    if (call.error) toast(call.error, 'error');
  }, [call.error, toast]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const endConsultation = () => {
    call.hangUp();
    onEnd(clinicalNotes, draftMeds, draftLabs);
  };

  const STATUS_COPY = {
    'requesting-media': 'Requesting camera & microphone access…',
    connecting: `Waiting for ${session.patient} to join…`,
    'peer-left': `${session.patient} left the call`,
    failed: call.error || 'Connection failed',
    ended: 'Call ended',
  };

  if (!joined) {
    return (
      <div className="bg-slate-950 rounded-3xl p-6 shadow-2xl border border-slate-800 max-w-lg mx-auto">
        <div className="text-center mb-4">
          <h4 className="font-black text-white text-xl">{session.patient}</h4>
          <p className="text-xs text-slate-400 mt-1">{session.type} · {session.age}</p>
        </div>
        <PreJoinCheck dark />
        <div className="flex gap-3 mt-4">
          <button onClick={() => { call.hangUp(); onEnd('', [], []); }} className="flex-1 border border-slate-700 text-slate-300 hover:bg-slate-900 font-bold py-3.5 rounded-2xl text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={() => setJoined(true)}
            className="flex-[2] bg-aubergine-600 hover:bg-aubergine-700 text-white font-black py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            <i className="fas fa-video"></i> Start Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 bg-slate-950 rounded-[2.5rem] p-4 shadow-2xl border border-slate-800/80 ring-1 ring-white/5 h-[88vh] overflow-hidden">

      {/* Left 25% / 3 Cols: Vitals & History Dashboard */}
      <div className="hidden xl:flex xl:col-span-3 bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2rem] border border-slate-800/80 p-5 flex-col gap-6 overflow-y-auto custom-scrollbar shadow-inner relative">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none rounded-t-[2rem]"></div>
        
        {/* Vitals */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-white font-bold text-sm flex items-center gap-2 tracking-tight"><i className="fas fa-heart-pulse text-rose-500"></i> Live Vitals</h3>
             <span className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
             </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] flex flex-col justify-center items-center group hover:border-slate-700 transition-colors">
               <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 group-hover:text-slate-400">Heart Rate</p>
               <p className="text-3xl font-black text-rose-400 tracking-tighter">72<span className="text-xs font-bold text-rose-500/50 ml-0.5">bpm</span></p>
             </div>
             <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] flex flex-col justify-center items-center group hover:border-slate-700 transition-colors">
               <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 group-hover:text-slate-400">Blood Press</p>
               <p className="text-2xl font-black text-emerald-400 tracking-tighter mt-1">118<span className="text-sm text-emerald-500/60 font-bold">/76</span></p>
             </div>
             <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] flex flex-col justify-center items-center col-span-2 group hover:border-slate-700 transition-colors">
               <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 group-hover:text-slate-400">Blood Oxygen (SpO2)</p>
               <p className="text-3xl font-black text-sky-400 tracking-tighter">98<span className="text-lg text-sky-500/60">%</span></p>
               <div className="w-full bg-slate-900 rounded-full h-1 mt-3 overflow-hidden">
                 <div className="bg-sky-400 h-1 rounded-full" style={{ width: '98%' }}></div>
               </div>
             </div>
          </div>
        </div>

        {/* History Timeline */}
        <div className="flex-1 relative z-10 mt-2">
          <h3 className="text-white font-bold text-sm mb-5 flex items-center gap-2 tracking-tight"><i className="fas fa-clock-rotate-left text-indigo-400"></i> Patient History</h3>
          <div className="relative border-l-2 border-slate-800/80 ml-3 space-y-7 pb-4">
             <div className="relative pl-6 group">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900 group-hover:scale-125 transition-transform"></span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Aug 2, 2026</p>
                <p className="text-xs font-bold text-slate-200">Follow-up: PCOS</p>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-800">Patient reported improved cycle regularity after starting Metformin 500mg.</p>
             </div>
             <div className="relative pl-6 group">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-slate-700 ring-4 ring-slate-900 group-hover:scale-125 transition-transform"></span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Jun 15, 2026</p>
                <p className="text-xs font-bold text-slate-200">Initial Consultation</p>
             </div>
             <div className="relative pl-6 group">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-slate-900 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">Jun 14, 2026</p>
                <p className="text-xs font-bold text-slate-200">Lab Results Uploaded</p>
                <p className="text-[10px] text-rose-400 font-bold mt-1 bg-rose-500/10 inline-block px-2 py-0.5 rounded border border-rose-500/20">High Fasting Glucose</p>
             </div>
          </div>
        </div>
      </div>

      {/* Center 42% / 5 Cols: Cinematic Video Call */}
      <div className="col-span-1 lg:col-span-7 xl:col-span-5 flex flex-col space-y-4">
        <div ref={videoAreaRef} className="relative flex-1 bg-black rounded-[2rem] overflow-hidden border border-slate-800 flex items-center justify-center shadow-2xl shadow-black/50 group">
          
          {/* Main Video */}
          {call.remoteStream ? (
            <VideoTile stream={call.remoteStream} className="absolute inset-0 object-cover w-full h-full transition-transform duration-700 group-hover:scale-[1.02]" />
          ) : (
            <div className="text-center text-white px-6 z-10">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-aubergine-600 to-indigo-600 mx-auto mb-4 flex items-center justify-center text-4xl font-black shadow-[0_0_40px_rgba(88,28,135,0.4)] ring-4 ring-white/5">
                {session.patient.split(' ').map(n => n[0]).join('')}
              </div>
              <p className="font-black text-2xl tracking-tight">{session.patient}</p>
              {call.connectionState === 'connected' ? (
                <p className="text-emerald-400 text-xs mt-2.5 font-bold flex items-center justify-center gap-2 bg-emerald-500/10 inline-flex px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Camera off
                </p>
              ) : (
                <p className={`text-xs mt-2.5 font-bold flex items-center justify-center gap-2 ${call.connectionState === 'failed' ? 'text-rose-400' : 'text-slate-400'}`}>
                  {call.connectionState !== 'failed' && call.connectionState !== 'peer-left' && call.connectionState !== 'ended' && (
                    <i className="fas fa-circle-notch fa-spin"></i>
                  )}
                  {STATUS_COPY[call.connectionState] || 'Encrypted Audio/Video'}
                </p>
              )}
            </div>
          )}

          {/* Cinematic Vignette Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/70"></div>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-black/10 to-transparent"></div>

          {call.peerMuted && call.remoteStream && (
            <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-xl text-white text-xs font-bold px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
              <i className="fas fa-microphone-slash text-rose-400"></i> Patient Muted
            </div>
          )}

          {/* Timer & Connection */}
          <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-xl text-white text-xs font-mono font-bold px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-2xl">
            <span className={`w-2 h-2 rounded-full shadow-sm ${call.connectionState === 'connected' ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-slate-500'}`}></span> {fmt(elapsed)}
            {call.connectionState === 'connected' && call.connectionQuality && (
              <span className={`ml-1.5 pl-2 border-l border-white/20 flex items-center gap-1.5 text-[10px] ${QUALITY_STYLES[call.connectionQuality]}`} title="Connection quality">
                <i className="fas fa-signal"></i>
              </span>
            )}
          </div>

          {/* Fullscreen */}
          <div className="absolute top-6 right-6">
            {fullscreenSupported && (
              <button onClick={toggleFullscreen} className="w-10 h-10 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-xl text-white border border-white/10 flex items-center justify-center text-sm transition-all shadow-2xl hover:scale-105">
                <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
              </button>
            )}
          </div>

          {/* Doctor PiP */}
          <div className="absolute bottom-6 right-6 w-40 h-28 bg-slate-900 rounded-[1.5rem] border border-white/20 flex items-center justify-center text-white text-xs font-bold shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden ring-4 ring-black/20 hover:scale-105 transition-transform origin-bottom-right z-20">
            {call.isVideoOff || !call.localStream ? (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <i className="fas fa-video-slash text-2xl"></i>
              </div>
            ) : (
              <VideoTile stream={call.localStream} muted mirrored={!call.isScreenSharing} className="object-cover w-full h-full" />
            )}
          </div>
        </div>

        {/* Floating Controls Toolbar */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 pl-2">
            <button onClick={call.toggleMute} disabled={!call.localStream} title={call.isMuted ? 'Unmute' : 'Mute'}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all disabled:opacity-40 shadow-sm ${call.isMuted ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50 hover:border-slate-600'}`}>
              <i className={`fas ${call.isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={call.toggleVideo} disabled={!call.localStream} title={call.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all disabled:opacity-40 shadow-sm ${call.isVideoOff ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50 hover:border-slate-600'}`}>
              <i className={`fas ${call.isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
            <button onClick={call.toggleScreenShare} disabled={call.connectionState !== 'connected'} title="Share screen"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all disabled:opacity-40 shadow-sm ${call.isScreenSharing ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50 hover:border-slate-600'}`}>
              <i className="fas fa-desktop"></i>
            </button>
          </div>

          <button onClick={() => setShowSignModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black px-8 py-3.5 rounded-2xl text-sm flex items-center gap-3 transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:-translate-y-0.5">
            <i className="fas fa-file-signature text-lg"></i> REVIEW & SIGN
          </button>
        </div>
      </div>

      {/* Right 33% / 4 Cols: Glassmorphism Smart Canvas */}
      <div className="col-span-1 lg:col-span-5 xl:col-span-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2rem] flex flex-col overflow-hidden text-slate-200 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Canvas Header */}
        <div className="bg-slate-900/80 p-5 border-b border-slate-800/80 flex items-center justify-between backdrop-blur-md relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <i className="fas fa-pen-nib text-lg"></i>
            </div>
            <div>
              <h3 className="font-black text-sm text-white tracking-tight">Smart Charting Canvas</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Holistic Draft View</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
              <i className="fas fa-cloud-arrow-up"></i> Auto-Saving
            </span>
          </div>
        </div>

        {/* Scrollable Canvas Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7 custom-scrollbar relative z-10">
          
          {/* Quick Protocols */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><i className="fas fa-bolt text-amber-400"></i> Smart Protocols</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => applyProtocol('PCOS')} className="flex-1 bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 text-slate-300 text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:text-white hover:shadow-lg">
                PCOS Protocol
              </button>
              <button onClick={() => applyProtocol('UTI')} className="flex-1 bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500 text-slate-300 text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:text-white hover:shadow-lg">
                UTI Protocol
              </button>
            </div>
          </div>

          {/* AI Brief (Collapsible) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-[1.5rem] overflow-hidden shadow-lg transition-all">
            <button onClick={() => setBriefExpanded(!briefExpanded)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-aubergine-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <i className="fas fa-wand-magic-sparkles text-aubergine-400 text-xs"></i>
                </div>
                <span className="font-bold text-xs text-white uppercase tracking-wider">AI Brief & History</span>
              </div>
              <i className={`fas fa-chevron-down text-slate-500 text-xs transition-transform duration-300 ${briefExpanded ? 'rotate-180' : ''}`}></i>
            </button>
            {briefExpanded && (
              <div className="p-5 border-t border-slate-800 bg-slate-900/50">
                {briefLoading ? (
                  <p className="text-xs text-slate-500 font-bold"><i className="fas fa-spinner fa-spin mr-2 text-indigo-400"></i>Loading insights…</p>
                ) : !brief ? (
                  <p className="text-xs text-slate-500">Couldn't load the pre-consultation brief.</p>
                ) : (
                  <div className="space-y-4">
                    {brief.aiSummary && (
                      <div className="bg-gradient-to-br from-aubergine-900/30 to-indigo-900/20 border border-aubergine-800/50 rounded-xl p-4 shadow-inner">
                        <p className="text-[9px] font-black text-aubergine-300 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i className="fas fa-robot"></i> AI Summary</p>
                        <p className="text-[13px] text-slate-200 leading-relaxed font-medium">{brief.aiSummary}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                      <div>
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] mb-1">Reason</p>
                        <p className="text-slate-200 font-bold">{brief.reason || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] mb-1">Conditions</p>
                        <p className="text-slate-200 font-bold">{brief.chronicConditions.length ? brief.chronicConditions.join(', ') : 'None'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] mb-1">Allergies</p>
                        <p className={brief.allergies.length ? 'text-rose-400 font-black' : 'text-slate-200 font-bold'}>{brief.allergies.length ? brief.allergies.join(', ') : 'None recorded'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><i className="fas fa-clipboard-user text-indigo-400"></i> Clinical Notes</label>
              <button className="text-[9px] text-sky-400 hover:text-sky-300 font-black uppercase tracking-widest flex items-center gap-1.5 bg-sky-500/10 px-2 py-1 rounded-md border border-sky-500/20 transition-colors">
                <i className="fas fa-microphone"></i> Dictate
              </button>
            </div>
            <textarea rows={5} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} placeholder="Subjective, Objective, Assessment, Plan..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 text-[13px] text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans leading-relaxed shadow-inner placeholder:text-slate-600 transition-colors" />
          </div>

          {/* E-Rx Draft Board */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><i className="fas fa-pills text-emerald-400"></i> E-Prescription Draft</label>
            
            {/* Med Input Form */}
            <div className="bg-slate-950/80 p-3 rounded-[1.5rem] border border-slate-700/80 shadow-inner flex flex-col gap-2.5 transition-colors focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50">
              <input value={rxName} onChange={e => setRxName(e.target.value)} placeholder="Medication name (e.g. Metformin)"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-500 transition-colors" />
              <div className="grid grid-cols-3 gap-2">
                <input value={rxDosage} onChange={e => setRxDosage(e.target.value)} placeholder="Dosage"
                  className="col-span-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-500 transition-colors" />
                <select value={rxSchedule} onChange={e => setRxSchedule(e.target.value)}
                  className="col-span-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500 transition-colors">
                  <option value="1-0-1">1-0-1</option>
                  <option value="1-0-0">1-0-0</option>
                  <option value="0-0-1">0-0-1</option>
                  <option value="1-1-1">1-1-1</option>
                  <option value="PRN">PRN</option>
                </select>
                <input value={rxDuration} onChange={e => setRxDuration(e.target.value)} placeholder="Duration"
                  className="col-span-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500 placeholder:font-normal placeholder:text-slate-500 transition-colors" />
              </div>
              <button onClick={handleAddMedToDraft} className="w-full mt-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black py-3 rounded-xl text-[11px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-emerald-500/20">
                <i className="fas fa-plus"></i> Add to Draft
              </button>
            </div>

            {/* Drafted Meds List */}
            {draftMeds.length > 0 && (
              <div className="space-y-2 mt-3">
                {draftMeds.map((med, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-3.5 flex items-center justify-between shadow-lg shadow-black/20 group hover:border-slate-500 transition-colors">
                    <div>
                      <p className="font-black text-[13px] text-white">{med.name} <span className="text-emerald-400 font-bold ml-1">{med.dosage}</span></p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold"><span className="text-slate-300">{med.frequency}</span> &middot; {med.duration}</p>
                    </div>
                    <button onClick={() => removeMedFromDraft(idx)} className="w-8 h-8 rounded-full bg-slate-950 border border-slate-700 hover:bg-rose-500/20 hover:border-rose-500/50 text-slate-500 hover:text-rose-400 flex items-center justify-center transition-all shadow-sm">
                      <i className="fas fa-xmark text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lab Draft Board */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><i className="fas fa-flask text-sky-400"></i> Lab Requests</label>
            <div className="space-y-2">
              {LAB_OPTIONS.map(lab => (
                <label key={lab} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${draftLabs.includes(lab) ? 'bg-sky-500/10 border-sky-500/50 text-sky-300 shadow-md shadow-sky-500/10' : 'bg-slate-950/80 border-slate-700/80 text-slate-400 hover:border-slate-600 hover:bg-slate-900/80 shadow-sm'}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${draftLabs.includes(lab) ? 'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)] scale-110' : 'bg-slate-900 border border-slate-700'}`}>
                    {draftLabs.includes(lab) && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <span className="text-[13px] font-bold">{lab}</span>
                </label>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>

    {/* Review & Sign Modal Masterpiece */}
    <Modal isOpen={showSignModal} onClose={() => setShowSignModal(false)} title="" size="lg" className="bg-transparent shadow-none border-none p-0">
      <div className="relative bg-[#faf9f6] rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] font-serif text-slate-800 border border-[#e5e5df]">
        
        {/* Paper texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex justify-between items-center text-white relative z-10 shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
               <i className="fas fa-file-signature text-xl text-emerald-400"></i>
             </div>
             <div>
               <h2 className="font-sans font-black text-xl tracking-tight">Review & Sign Prescription</h2>
               <p className="font-sans text-xs text-slate-300 font-medium">Finalize the consultation document</p>
             </div>
          </div>
          <button onClick={() => setShowSignModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {/* Prescription Preview (The Document) */}
        <div className="p-8 relative z-10">
          
          {/* Doc Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-5 mb-6">
            <div>
              <h1 className="font-black text-3xl text-slate-900 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Healnari<span className="text-emerald-600">.</span></h1>
              <p className="font-sans text-xs text-slate-500 font-bold mt-1 tracking-widest uppercase">E-Prescription</p>
            </div>
            <div className="text-right font-sans">
              <p className="text-sm font-black text-slate-800">{session.patient}</p>
              <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Ref: {session.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
          
          {/* Doc Body */}
          <div className="space-y-6 min-h-[200px]">
            {clinicalNotes && (
              <div>
                <h4 className="font-sans text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i className="fas fa-clipboard-user"></i> Clinical Notes</h4>
                <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{clinicalNotes}</p>
              </div>
            )}
            
            {draftMeds.length > 0 && (
              <div>
                <h4 className="font-sans text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i className="fas fa-pills text-slate-300"></i> Medications (Rx)</h4>
                <ul className="space-y-3 pl-1">
                  {draftMeds.map((m, i) => (
                    <li key={i} className="text-sm text-slate-800 flex items-start gap-3">
                      <span className="text-slate-300 font-serif font-black mt-0.5">{i+1}.</span>
                      <div>
                        <p className="font-black font-sans">{m.name} <span className="text-emerald-600 ml-1">{m.dosage}</span></p>
                        <p className="font-sans text-[11px] text-slate-500 font-bold mt-0.5">Take <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{m.frequency}</span> for {m.duration}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {draftLabs.length > 0 && (
              <div>
                <h4 className="font-sans text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i className="fas fa-flask text-slate-300"></i> Lab Requests</h4>
                <ul className="pl-5 space-y-1.5">
                  {draftLabs.map((l, i) => <li key={i} className="text-[13px] text-slate-700 font-sans font-medium list-disc marker:text-slate-300">{l}</li>)}
                </ul>
              </div>
            )}
            
            {!clinicalNotes && draftMeds.length === 0 && draftLabs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <i className="fas fa-file-medical text-4xl text-slate-300 mb-3"></i>
                <p className="font-sans text-sm font-bold text-slate-400">Blank prescription document.</p>
              </div>
            )}
          </div>
          
          {/* Doc Footer & Signature */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex justify-between items-end">
             <div className="font-sans">
               <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 flex items-center gap-2 max-w-xs">
                 <i className="fas fa-paper-plane text-sky-500 text-sm"></i>
                 <p className="text-[10px] text-sky-800 font-bold leading-tight">Patient will be notified automatically upon signing.</p>
               </div>
             </div>
             <div className="text-right group cursor-pointer relative">
               <div className="absolute inset-0 bg-emerald-500/5 rounded-lg -m-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <p className="text-4xl text-slate-800 tracking-tighter" style={{ fontFamily: 'Satisfy, cursive', textShadow: '1px 1px 0 rgba(0,0,0,0.05)' }}>{user?.name || 'Dr. Practitioner'}</p>
               <div className="h-0.5 w-full bg-slate-200 mt-1 mb-1"></div>
               <p className="font-sans text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Signature</p>
             </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-100/80 p-5 flex gap-3 font-sans border-t border-slate-200 relative z-10">
          <button onClick={() => setShowSignModal(false)} className="flex-1 bg-white border border-slate-300 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
            Keep Editing
          </button>
          <button onClick={() => { setShowSignModal(false); onEnd(clinicalNotes, draftMeds, draftLabs); }} className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black py-3.5 rounded-xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_10px_25px_-5px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm tracking-wide">
            <i className="fas fa-check-circle text-lg"></i> SIGN & SEND PRESCRIPTION
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}


/** Short two-tone chime for incoming-call/request alerts — synthesized via
 * WebAudio so there's no audio asset to ship or fail to load. */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1108.73].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Best-effort — autoplay policies or missing WebAudio just mean no sound.
  }
}

/** "Updated 12s ago" label that ticks on its own so the doctor can trust
 * the queue is actually live without watching the network tab. */
function LastUpdated({ at }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);
  if (!at) return null;
  const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
  const label = secs < 5 ? 'Updated just now' : secs < 60 ? `Updated ${secs}s ago` : `Updated ${Math.round(secs / 60)}m ago`;
  return <span className="text-[10px] text-slate-500 font-medium">{label}</span>;
}

const QUEUE_POLL_MS = 20000;

/* ─── Main Component ─────────────────────────── */
function DoctorTelemedicine() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { updateAppointmentStatus } = useClinicData();
  const [activeCall, setActiveCall] = useState(null);
  // Calls arrived at via an already-answered ring screen (instant call, or
  // "Accept" on the incoming-call overlay) skip the device pre-check below —
  // the doctor already committed to joining on that screen, mirroring how
  // the patient side's autoJoin skips its own "Join Now" pre-check.
  const [skipPreJoin, setSkipPreJoin] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [rawSessions, setRawSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const knownSessionsRef = useRef(new Map()); // id -> last-seen status, for diffing new/changed sessions

  const todayStr = todayLocalStr();

  const loadQueue = ({ silent = false, alertChanges = false } = {}) => {
    if (silent) setRefreshing(true);
    return apiFetch('/telemedicine/queue')
      .then(data => {
        if (alertChanges) {
          const known = knownSessionsRef.current;
          const newRequests = data.filter(s => !known.has(s.id) && s.status === 'Requested');
          const nowWaiting = data.filter(s => known.has(s.id) && known.get(s.id) !== 'Waiting' && s.status === 'Waiting');
          if (newRequests.length || nowWaiting.length) playChime();
          newRequests.forEach(s => toast(`New video request from ${s.patientName}`, 'info'));
          nowWaiting.forEach(s => toast(`${s.patientName} is waiting for their video call`, 'success'));
        }
        knownSessionsRef.current = new Map(data.map(s => [s.id, s.status]));
        setRawSessions(data);
        setLastUpdated(Date.now());
      })
      .catch(err => { if (!silent) toast(err.message || 'Failed to load queue', 'error'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { loadQueue(); }, []);

  // Arrived here via the Patients page's instant-call button — the
  // appointment (In Progress, already rung) was created by that click, so
  // jump straight into the call instead of waiting for it to show up in the
  // queue. Clear the router state so a refresh doesn't restart the call.
  useEffect(() => {
    const session = location.state?.instantCallSession;
    if (!session) return;
    setActiveCall(session);
    setSkipPreJoin(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  // Keep the queue live without the doctor having to reload the page — paused
  // while a call is active since there's nothing new to surface mid-consult.
  useEffect(() => {
    if (activeCall) return;
    const t = setInterval(() => loadQueue({ silent: true, alertChanges: true }), QUEUE_POLL_MS);
    return () => clearInterval(t);
  }, [activeCall]);

  const toSession = (s) => ({
    id: s.id,
    patientId: s.patient_id,
    patient: s.patientName,
    age: s.patientAge != null ? `${s.patientAge}F` : '—',
    type: s.reason || 'Consultation',
    time: s.scheduled_time,
    date: s.scheduled_date === todayStr ? 'Today' : new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    phone: s.patientPhone || '—',
    waiting: s.status === 'Waiting' || s.status === 'In Progress',
    accepted: s.status !== 'Requested',
    status: s.status,
  });

  const sessions = rawSessions.map(toSession);

  const waitingSessions = sessions.filter(s => s.status === 'Waiting');
  const newRequestSessions = sessions.filter(s => !s.accepted);

  // Arrived here via the incoming-call ring screen's "Accept" — a patient
  // called us. The queue may not have picked up this appointment yet (it's
  // either brand new or just changed status), so fall back to a fresh fetch
  // rather than waiting on the next poll cycle.
  useEffect(() => {
    const startCallId = searchParams.get('startCall');
    if (!startCallId) return;
    let cancelled = false;
    (async () => {
      let session = sessions.find(s => s.id === startCallId);
      if (!session) {
        const fresh = await apiFetch('/telemedicine/queue').catch(() => []);
        const raw = fresh.find(s => s.id === startCallId);
        session = raw ? toSession(raw) : null;
      }
      if (cancelled) return;
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('startCall');
        return next;
      }, { replace: true });
      if (session) { setActiveCall(session); setSkipPreJoin(true); }
      else toast("Couldn't open that call — it may have already ended.", 'error');
    })();
    return () => { cancelled = true; };
  }, [searchParams, sessions, setSearchParams, toast]);

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

  const sendBulkMessage = async (channel, messageText) => {
    const recipients = sessions.filter(s => selectedIds.includes(s.id));
    const patientIds = [...new Set(recipients.map(s => s.patientId).filter(Boolean))];
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Telemedicine Sessions — ${recipients.length} patient(s)`,
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

  const handleAccept = async (id) => {
    try {
      await updateAppointmentStatus(id, 'Upcoming');
      await loadQueue();
      toast('Appointment accepted', 'success');
    } catch (err) {
      toast(err.message || 'Failed to accept', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await updateAppointmentStatus(id, 'Cancelled');
      await loadQueue();
      toast('Appointment rejected and refunded', 'info');
    } catch (err) {
      toast(err.message || 'Failed to reject', 'error');
    }
  };

  const joinCall = async (session) => {
    try {
      await updateAppointmentStatus(session.id, 'In Progress');
      setActiveCall(session);
      setSkipPreJoin(false);
      toast(`Joining call with ${session.patient}...`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to join call', 'error');
    }
  };

  const endCall = async (notes, draftMeds, draftLabs) => {
    try {
      if (notes) await apiFetch(`/telemedicine/${activeCall.id}/notes`, { method: 'POST', body: { note: notes } });
      
      if (draftMeds && draftMeds.length > 0) {
        for (const med of draftMeds) {
          await addRx(activeCall.patientId, med);
        }
      }
      
      if (draftLabs && draftLabs.length > 0) {
        await requestLabReport(activeCall.patientId, { requestedTests: draftLabs.join(', ') });
      }

      if (notes || (draftMeds && draftMeds.length > 0) || (draftLabs && draftLabs.length > 0)) {
        await apiFetch('/communications/broadcasts', {
          method: 'POST',
          body: {
            subject: 'Prescription Ready',
            body: `Dear ${activeCall.patient}, your prescription and consultation notes from today's teleconsultation are now available in your portal.`,
            audience: `Patient ${activeCall.patientId}`,
            channels: ['Push Notification', 'Email'],
            scheduleType: 'immediate',
            patientIds: [activeCall.patientId],
          },
        }).catch(() => {}); // silently fail if broadcast fails, don't crash the end call
      }

      await updateAppointmentStatus(activeCall.id, 'Done');
      await loadQueue();
      toast('Consultation ended. Prescription sent to patient!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to finalize consultation', 'error');
    } finally {
      setActiveCall(null);
      setSkipPreJoin(false);
    }
  };

  // Patient declined — the backend already reverted the appointment out of
  // In Progress, so this just closes the call view (no "Done" status, no
  // notes prompt — the consult never actually happened).
  const handleDeclined = () => {
    toast(`${activeCall?.patient || 'The patient'} declined the call.`, 'info');
    setActiveCall(null);
    setSkipPreJoin(false);
    loadQueue();
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading queue...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Telemedicine</h1>
          <p className="text-sm text-slate-500 mt-1">Private, doctor-only video consultations.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Bulk Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in origin-top-right">
                <div className="px-4 py-2 mb-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Messaging Channels</p></div>
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
              </div>
            )}
          </div>
          <button onClick={() => loadQueue({ silent: true })} disabled={refreshing}
            title="Refresh queue"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-aubergine-600 hover:border-aubergine-200 flex items-center justify-center transition-all shadow-sm hover:shadow hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
            <i className={`fas fa-rotate text-sm ${refreshing ? 'fa-spin' : ''}`}></i>
          </button>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-emerald-700 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></span> Live Queue
          </div>
        </div>
      </div>

      {/* Active Call */}
      {activeCall ? (
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live: {activeCall.patient}
            <span className="text-xs text-slate-500 font-medium">— use "End Consultation" below to save your notes and finish</span>
          </h2>
          <ActiveCallUI session={activeCall} onEnd={endCall} onDeclined={handleDeclined} autoJoin={skipPreJoin} />
        </div>
      ) : (
        <>
          {/* Waiting-patient alert */}
          {waitingSessions.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30 relative">
                <i className="fas fa-video animate-pulse"></i>
                <div className="absolute inset-0 bg-emerald-400 rounded-2xl animate-ping opacity-20"></div>
              </div>
              <div className="flex-1">
                <p className="font-black text-emerald-900 text-base">
                  {waitingSessions.length === 1 ? `${waitingSessions[0].patient} is waiting in the virtual lobby.` : `${waitingSessions.length} patients are waiting.`}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">Join now to avoid keeping them waiting.</p>
              </div>
              <button onClick={() => joinCall(waitingSessions[0])}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all flex-shrink-0 flex items-center gap-2 shadow-md hover:-translate-y-0.5">
                <i className="fas fa-video animate-pulse"></i> Join Now
              </button>
            </div>
          )}

          {/* New request alert */}
          {newRequestSessions.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <i className="fas fa-calendar-plus"></i>
              </div>
              <div className="flex-1">
                <p className="font-black text-amber-900 text-base">
                  {newRequestSessions.length === 1 ? '1 new video consultation request' : `${newRequestSessions.length} new video consultation requests`}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">Accept or reject below to confirm the patient's slot.</p>
              </div>
            </div>
          )}

          {/* Sessions Queue */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 tracking-tight">Video Consultation Queue</h2>
                <LastUpdated at={lastUpdated} />
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.length > 0 && selectedIds.length === sessions.length ? 'bg-aubergine-600 shadow-sm text-white' : selectedIds.length > 0 ? 'bg-aubergine-200 text-aubergine-700 ring-1 ring-aubergine-400' : 'bg-white ring-1 ring-slate-200 ring-inset'}`}>
                    {(selectedIds.length > 0 && selectedIds.length === sessions.length) ? <i className="fas fa-check text-[9px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-700 rounded-full"></div> : null}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedIds.length === sessions.length && sessions.length > 0} onChange={toggleSelectAll} />
                  Select All
                </label>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {sessions.map(s => (
                <div key={s.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white transition-all duration-300 shadow-sm hover:shadow-md ${s.waiting ? 'ring-1 ring-emerald-400 bg-emerald-50/20' : 'ring-1 ring-slate-100'} ${selectedIds.includes(s.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : ''}`}>
                  <label className="cursor-pointer group flex-shrink-0 self-center" onClick={e => e.stopPropagation()}>
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(s.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset group-hover:ring-aubergine-300'}`}>
                      {selectedIds.includes(s.id) && <i className="fas fa-check text-[9px]"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                  </label>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-aubergine-100 to-indigo-100 text-aubergine-700 font-bold flex items-center justify-center shadow-inner text-sm">
                        {s.patient.split(' ').map(n => n[0]).join('')}
                      </div>
                      {s.waiting && <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-sm shadow-emerald-500/50"></div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-slate-800 tracking-tight">{s.patient}</h3>
                        {s.waiting && <span className="text-[9px] bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-md border border-emerald-200 shadow-sm">WAITING</span>}
                        {!s.accepted && <span className="text-[9px] bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-md border border-amber-200 shadow-sm">NEW REQUEST</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{s.age} • {s.type}</p>
                      <p className="text-[11px] text-aubergine-700 font-bold mt-1 bg-aubergine-50 px-2 py-0.5 rounded-md inline-block border border-aubergine-100/50">{s.date} — {s.time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end items-center">
                    <a href={`tel:${s.phone}`}
                      className="w-10 h-10 rounded-full bg-white text-slate-500 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-colors border border-slate-200 shadow-sm" title="Call Patient">
                      <i className="fas fa-phone"></i>
                    </a>
                    <button onClick={() => { setNoteTarget(s); setNoteDraft(''); setShowNotes(true); }}
                      className="text-[11px] font-bold text-aubergine-600 border border-aubergine-200 px-4 py-2.5 rounded-xl hover:bg-aubergine-50 transition-colors shadow-sm flex items-center gap-1.5 bg-white">
                      <i className="fas fa-file-lines"></i> Notes
                    </button>
                    {s.accepted ? (
                      <button onClick={() => joinCall(s)}
                        className={`font-bold px-5 py-2.5 rounded-xl text-[11px] transition-all flex items-center gap-2 shadow-sm ${s.waiting ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:-translate-y-0.5' : 'bg-gradient-to-r from-aubergine-600 to-aubergine-700 text-white shadow-aubergine-600/20 hover:-translate-y-0.5'}`}>
                        <i className={`fas fa-video ${s.waiting ? 'animate-pulse' : ''}`}></i> {s.waiting ? 'Join Now' : 'Start Call'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleReject(s.id)}
                          className="font-bold px-4 py-2.5 rounded-xl text-[11px] transition-colors flex items-center gap-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 shadow-sm">
                          Reject
                        </button>
                        <button onClick={() => handleAccept(s.id)}
                          className="font-bold px-5 py-2.5 rounded-xl text-[11px] transition-all flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20 hover:-translate-y-0.5">
                          <i className="fas fa-check"></i> Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="bg-slate-50/50 rounded-2xl p-16 text-center border border-slate-100 border-dashed">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                    <i className="fas fa-video-slash text-3xl text-slate-300"></i>
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
              { icon: 'fa-shield-halved', title: 'Private Sessions', sub: 'Doctor-only access, no session recording.', gradient: 'from-sky-500 to-indigo-500' },
              { icon: 'fa-file-lines', title: 'Auto-SOAP Notes', sub: 'AI transcription & note generation.', gradient: 'from-fuchsia-500 to-purple-500' },
              { icon: 'fa-hospital', title: 'NMC Compliant', sub: 'Telemedicine practice guidelines met.', gradient: 'from-emerald-500 to-teal-500' },
            ].map(tip => (
              <div key={tip.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex gap-4 group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tip.gradient} text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${tip.icon} text-lg`}></i>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm tracking-tight">{tip.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{tip.sub}</p>
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
        onSend={(msg) => sendBulkMessage(bulkModalParams.channel, msg)}
      />
    </div>
  );
}

export default DoctorTelemedicine;
