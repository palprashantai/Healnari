import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const INITIAL_QUEUE = [
  { id: 1, token: 'T-01', name: 'Priya Sharma',   age: '28F', type: 'PCOS Follow-up',    time: '09:30 AM', date: 'Today',    mode: 'Video',  status: 'In Progress', phone: '+91 98765 43210' },
  { id: 2, token: 'T-02', name: 'Anita Desai',    age: '34F', type: 'Fertility Consult',  time: '10:00 AM', date: 'Today',    mode: 'Clinic', status: 'Waiting',     phone: '+91 97654 32109' },
  { id: 3, token: 'T-03', name: 'Kavita Patel',   age: '22F', type: 'Irregular Cycles',   time: '10:30 AM', date: 'Today',    mode: 'Video',  status: 'Upcoming',    phone: '+91 96543 21098' },
  { id: 4, token: 'T-04', name: 'Aisha Khan',     age: '29F', type: 'Endometriosis',       time: '11:00 AM', date: 'Today',    mode: 'Clinic', status: 'Upcoming',    phone: '+91 95432 10987' },
];

const REQUESTS = [
  { id: 5, name: 'Riya Patel',   age: '25F', type: 'General Checkup',     time: '09:00 AM', date: 'Tomorrow',         mode: 'Video' },
  { id: 6, name: 'Meera Reddy',  age: '31F', type: 'Thyroid Panel Review', time: '12:30 PM', date: 'Thu, 5 Jul 2026',  mode: 'Clinic' },
];

const PAST = [
  { id: 'P1', name: 'Sunita Desai',  age: '38F', type: 'PCOS Mgmt',        date: '25 Jun 2026', mode: 'Clinic', notes: 'Adjusted Metformin. Repeat labs in 6 weeks.' },
  { id: 'P2', name: 'Divya Menon',   age: '26F', type: 'Fertility Consult', date: '20 Jun 2026', mode: 'Video',  notes: 'AMH low-normal. Follow-up recommended.' },
];

const STATUS_BADGE = {
  'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Waiting':     'bg-amber-50 text-amber-700 border-amber-200',
  'Upcoming':    'bg-slate-100 text-slate-600 border-slate-200',
};

/* ─── Notes Modal ────────────────────────────── */
function NotesModal({ patient, isOpen, onClose, onSave }) {
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [followUp, setFollowUp] = useState('');
  if (!patient) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`SOAP Notes — ${patient.name}`} size="md">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          <div className="flex gap-3"><span className="font-bold text-slate-500 w-16">Patient</span><span className="font-bold text-slate-800">{patient.name} ({patient.age})</span></div>
          <div className="flex gap-3"><span className="font-bold text-slate-500 w-16">Visit Type</span><span>{patient.type}</span></div>
        </div>
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
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onSave({ notes, diagnosis, followUp }); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-floppy-disk"></i> Save to EMR
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Video Call Modal ───────────────────────── */
function DoctorCallModal({ isOpen, onClose, patient, toast }) {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);
  return (
    <Modal isOpen={isOpen} onClose={() => { setActive(false); onClose(); }} title="Video Consultation" size="lg">
      {!active ? (
        <div className="text-center space-y-5 py-2">
          <div className="w-20 h-20 rounded-3xl bg-aubergine-100 text-aubergine-700 text-2xl font-black flex items-center justify-center mx-auto">
            {patient?.name?.split(' ').map(n => n[0]).join('') || 'P'}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-xl">{patient?.name}</h4>
            <p className="text-sm text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Patient is waiting
            </p>
            <p className="text-xs text-slate-400 mt-1">{patient?.type} • {patient?.time}</p>
          </div>
          <button onClick={() => { setActive(true); toast('Connected to patient!', 'success'); }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-3 shadow-lg">
            <i className="fas fa-video"></i> Join Consultation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-aubergine-600 mx-auto mb-3 flex items-center justify-center text-2xl font-black">
                {patient?.name?.split(' ').map(n => n[0]).join('')}
              </div>
              <p className="font-bold">{patient?.name}</p>
              <p className="text-slate-400 text-xs mt-1">● Live</p>
            </div>
            <div className="absolute top-3 right-3 bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
              <i className="fas fa-clock mr-1"></i> <span>00:00</span>
            </div>
            <div className="absolute bottom-3 right-3 w-24 h-16 bg-slate-700 rounded-xl border border-white/10 flex items-center justify-center text-white text-xs font-bold">
              {vidOff ? <i className="fas fa-video-slash text-slate-400 text-xl"></i> : 'You'}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setMuted(!muted)} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${muted ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={() => { setActive(false); onClose(); toast('Call ended. SOAP notes saved.', 'info'); }}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xl shadow-lg">
              <i className="fas fa-phone-slash"></i>
            </button>
            <button onClick={() => setVidOff(!vidOff)} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${vidOff ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
              <i className={`fas ${vidOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorAppointments() {
  const toast = useToast();
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [requests, setRequests] = useState(REQUESTS);
  const [past] = useState(PAST);
  const [notesTarget, setNotesTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const callNext = () => {
    let progDone = false;
    let waitCalled = false;
    const next = queue.map(p => {
      if (p.status === 'In Progress' && !progDone) { progDone = true; return { ...p, status: 'Done' }; }
      if (p.status === 'Waiting' && !waitCalled) { waitCalled = true; return { ...p, status: 'In Progress' }; }
      return p;
    });
    // promote first Upcoming to Waiting
    let upCalled = false;
    const final = next.map(p => {
      if (p.status === 'Upcoming' && !upCalled) { upCalled = true; return { ...p, status: 'Waiting' }; }
      return p;
    });
    setQueue(final);
    const nxt = queue.find(p => p.status === 'Waiting');
    toast(`Called ${nxt?.name || 'next patient'} (${nxt?.token})`, 'success');
  };

  const approveRequest = (req) => {
    const newToken = `T-0${queue.length + 1}`;
    setQueue(prev => [...prev, { ...req, token: newToken, status: 'Upcoming', date: req.date }]);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast(`Appointment approved for ${req.name}`, 'success');
  };

  const rejectRequest = (req) => {
    setRequests(prev => prev.filter(r => r.id !== req.id));
    toast(`Request from ${req.name} rejected`, 'info');
  };

  const handleCancel = () => {
    setQueue(prev => prev.filter(q => q.id !== cancelTarget.id));
    toast(`Appointment with ${cancelTarget.name} cancelled`, 'info');
    setCancelTarget(null);
  };

  const saveNotes = ({ notes, diagnosis, followUp }) => {
    toast(`SOAP notes saved for ${notesTarget?.name}`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Queue Management</h1>
          <p className="text-sm text-slate-500">Manage your daily tokens, approvals, and call history.</p>
        </div>
        <button onClick={callNext}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm">
          <i className="fas fa-bullhorn"></i> Call Next Patient
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'In Queue', value: queue.filter(q => q.status !== 'Done').length, color: 'text-aubergine-700' },
          { label: 'Waiting', value: queue.filter(q => q.status === 'Waiting').length, color: 'text-amber-600' },
          { label: 'Completed', value: queue.filter(q => q.status === 'Done').length, color: 'text-emerald-600' },
          { label: 'Requests', value: requests.length, color: 'text-rose-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            ['queue',    'Today\'s Queue', queue.length],
            ['requests', 'New Requests', requests.length],
            ['past',     'Past Consults', past.length],
          ].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
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
              {tab === 'queue' && queue.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.status === 'In Progress' ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-black px-2 py-1 rounded font-mono ${p.status === 'In Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>{p.token}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.age}</div>
                  </td>
                  <td className="px-5 py-4 text-xs"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full font-bold">{p.type}</span></td>
                  <td className="px-5 py-4 font-bold text-aubergine-700 text-xs whitespace-nowrap">{p.time}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold w-max ${p.mode === 'Video' ? 'text-sky-600' : 'text-slate-600'}`}>
                      <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[p.status] || 'bg-slate-100 text-slate-400 border-slate-200'}`}>{p.status}</span>
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
                        <button onClick={() => setCallTarget(p)} className="bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1">
                          <i className="fas fa-video text-[10px]"></i> Join
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {tab === 'requests' && requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{r.name}</div>
                    <div className="text-xs text-slate-400">{r.age}</div>
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

              {tab === 'past' && past.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.age}</div>
                  </td>
                  <td className="px-5 py-4 text-xs"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full font-bold">{p.type}</span></td>
                  <td className="px-5 py-4 font-bold text-aubergine-700 text-xs whitespace-nowrap">{p.date}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold w-max ${p.mode === 'Video' ? 'text-sky-600' : 'text-slate-600'}`}>
                      <i className={`fas ${p.mode === 'Video' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {p.mode}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => toast(`Notes: ${p.notes}`, 'info')} className="text-aubergine-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100">
                      View Summary
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NotesModal patient={notesTarget} isOpen={!!notesTarget} onClose={() => setNotesTarget(null)} onSave={saveNotes} />
      <DoctorCallModal isOpen={!!callTarget} onClose={() => setCallTarget(null)} patient={callTarget} toast={toast} />
      <ConfirmModal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel}
        title="Cancel Appointment?" message={`Cancel appointment with ${cancelTarget?.name}? They will be notified.`}
        confirmLabel="Cancel Appointment" confirmStyle="danger" />
    </div>
  );
}

export default DoctorAppointments;
