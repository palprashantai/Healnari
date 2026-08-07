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

/* ─── Active Call UI (Dual-Pane Split Screen Layout) ─────────────────────────── */
function ActiveCallUI({ session, onEnd }) {
  const toast = useToast();
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);
  const [screen, setScreen] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('Patient reports 3-day cycle delay, mild lower abdominal cramps. Recommended LH/FSH repeat.');
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
            {vidOff ? <i className="fas fa-video-slash text-slate-400 text-xl"></i> : <span className="bg-aubergine-900/80 px-2 py-1 rounded text-[10px]">Dr. Sarah Mitchell</span>}
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

          <button onClick={onEnd} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg">
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
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">Subjective / Objective Findings</label>
              <textarea rows={6} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-aubergine-500 resize-none font-mono" />
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
              <p className="text-slate-400 font-bold">Vitals & Patient Summary:</p>
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
            <p className="text-slate-400">Order Diagnostic Tests:</p>
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
          <p className="text-sm text-slate-500">Private, doctor-only video consultations.</p>
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
