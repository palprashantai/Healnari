import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const SESSIONS = [
  { id: 1, patient: 'Priya Sharma',  age: '28F', type: 'PCOS Follow-up',   time: '09:30 AM', date: 'Today',         status: 'Now', phone: '+91 98765 43210', waiting: true  },
  { id: 2, patient: 'Kavita Patel',  age: '22F', type: 'Irregular Cycles',  time: '10:30 AM', date: 'Today',         status: 'Upcoming', phone: '+91 96543 21098', waiting: false },
  { id: 3, patient: 'Divya Menon',   age: '26F', type: 'DOR Counselling',   time: '11:30 AM', date: 'Today',         status: 'Upcoming', phone: '+91 93210 98765', waiting: false },
  { id: 4, patient: 'Riya Patel',    age: '25F', type: 'General Checkup',   time: '09:00 AM', date: 'Tomorrow',      status: 'Upcoming', phone: '+91 91234 56789', waiting: false },
];

/* ─── Active Call UI ─────────────────────────── */
function ActiveCallUI({ session, onEnd }) {
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);
  const [screen, setScreen] = useState(false);
  const [chat, setChat] = useState(false);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { from: 'patient', text: 'Hello Doctor, can you hear me?' },
  ]);
  const [elapsed, setElapsed] = useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { from: 'doctor', text: msg }]);
    setMsg('');
    setTimeout(() => setMessages(prev => [...prev, { from: 'patient', text: 'Got it, thank you Doctor.' }]), 1000);
  };

  return (
    <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
      {/* Video Area */}
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
        {/* Patient Video (main) */}
        <div className="text-center text-white">
          <div className="w-20 h-20 rounded-full bg-aubergine-700 mx-auto mb-3 flex items-center justify-center text-2xl font-black">
            {session.patient.split(' ').map(n => n[0]).join('')}
          </div>
          <p className="font-bold">{session.patient}</p>
          <p className="text-slate-400 text-xs mt-1">● Live</p>
        </div>

        {/* Timer */}
        <div className="absolute top-4 left-4 bg-black/50 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span> {fmt(elapsed)}
        </div>

        {/* Patient info overlay */}
        <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-xl border border-white/10">
          {session.type}
        </div>

        {/* Doctor PiP */}
        <div className="absolute bottom-4 right-4 w-28 h-20 bg-slate-700 rounded-xl border border-white/10 flex items-center justify-center text-white text-xs font-bold shadow-lg">
          {vidOff ? <i className="fas fa-video-slash text-slate-400 text-xl"></i> : 'You'}
        </div>

        {/* Screen share indicator */}
        {screen && (
          <div className="absolute bottom-4 left-4 bg-emerald-600/80 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
            <i className="fas fa-desktop"></i> Screen Sharing
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${muted ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <button onClick={() => setVidOff(!vidOff)} title={vidOff ? 'Turn on camera' : 'Turn off camera'}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${vidOff ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            <i className={`fas ${vidOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>
          <button onClick={() => setScreen(!screen)} title="Share screen"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${screen ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            <i className="fas fa-desktop"></i>
          </button>
          <button onClick={() => setChat(!chat)} title="Chat"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${chat ? 'bg-aubergine-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            <i className="fas fa-message"></i>
          </button>
          <button onClick={() => alert('Quick EMR panel would slide out here in production.')} title="Quick EMR"
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all bg-slate-700 text-slate-300 hover:bg-slate-600">
            <i className="fas fa-file-medical"></i>
          </button>
        </div>

        <button onClick={onEnd} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-lg">
          <i className="fas fa-phone-slash"></i> End Call
        </button>
      </div>

      {/* Chat Panel */}
      {chat && (
        <div className="bg-slate-900 border-t border-slate-700 p-4 animate-fade-in">
          <div className="h-32 overflow-y-auto space-y-2 mb-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.from === 'doctor' ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded-xl text-xs ${m.from === 'doctor' ? 'bg-aubergine-600 text-white' : 'bg-slate-700 text-slate-200'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Type a message..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-aubergine-500" />
            <button onClick={sendMsg} className="bg-aubergine-600 text-white px-3 py-2 rounded-xl text-xs hover:bg-aubergine-700 transition-colors">
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorTelemedicine() {
  const toast = useToast();
  const [activeCall, setActiveCall] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [sessions, setSessions] = useState(SESSIONS.map(s => ({ ...s, accepted: s.waiting })));

  const handleAccept = (id) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, accepted: true } : s));
    toast('Appointment accepted', 'success');
  };

  const handleReject = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast('Appointment rejected and refunded', 'info');
  };

  const joinCall = (session) => {
    setActiveCall(session);
    toast(`Joining call with ${session.patient}...`, 'success');
  };

  const endCall = () => {
    toast(`Call ended. Duration: ${Math.floor(Math.random() * 15) + 5} minutes. Summary sent.`, 'info');
    setActiveCall(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Telemedicine</h1>
          <p className="text-sm text-slate-500">HD-encrypted, HIPAA-compliant video consultations.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-700 text-xs font-bold">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> System Online
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
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Video Consultation Queue</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {sessions.map(s => (
                <div key={s.id} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors ${s.waiting ? 'bg-emerald-50/40' : ''}`}>
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
                    <button onClick={() => { setNoteTarget(s); setShowNotes(true); }}
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
              { icon: 'fa-shield-halved', title: 'End-to-End Encrypted', sub: 'All sessions secured with AES-256.' },
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
          <textarea rows={4} placeholder="Pre-call notes, patient history reminders..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          <button onClick={() => { toast('Notes saved for this session.', 'success'); setShowNotes(false); }}
            className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Save Notes
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default DoctorTelemedicine;
