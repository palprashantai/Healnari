import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const PENDING_LABS = [
  { id: 1, patient: 'Priya Sharma',  test: 'Full Thyroid Panel + CBC',  received: '10 mins ago', urgent: true },
  { id: 2, patient: 'Meera Nair',    test: 'AMH + LH + FSH Profile',   received: '2 hrs ago',   urgent: false },
  { id: 3, patient: 'Sunita Desai',  test: 'Fasting Insulin + HbA1c',  received: 'Yesterday',   urgent: false },
];

const REFILL_REQUESTS = [
  { id: 1, patient: 'Kavita Patel', med: 'Metformin 500mg', lastRx: '10 Jun 2026', status: 'pending' },
  { id: 2, patient: 'Aisha Khan',   med: 'Norethisterone 5mg', lastRx: '20 May 2026', status: 'pending' },
];

const STATUS_STYLE = {
  'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Waiting':     'bg-amber-50 text-amber-700 border-amber-100',
  'Upcoming':    'bg-slate-100 text-slate-600 border-slate-200',
  'No Show':     'bg-rose-50 text-rose-700 border-rose-200',
  'Done':        'bg-slate-100 text-slate-400 border-slate-200',
};

/* ─── Urgent Lab Modal ───────────────────────── */
function UrgentLabModal({ lab, onClose, toast }) {
  if (!lab) return null;
  return (
    <Modal isOpen={!!lab} onClose={onClose} title="Urgent Clinical Alert" size="md">
      <div className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-4">
          <i className="fas fa-triangle-exclamation text-rose-600 text-2xl mt-1"></i>
          <div>
            <h3 className="font-bold text-rose-800 text-base">{lab.patient}</h3>
            <p className="text-sm text-rose-700 mt-1">Critical values detected in: {lab.test}</p>
            <div className="mt-3 bg-white/60 p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Hemoglobin:</span> <span className="font-bold text-rose-600">7.2 g/dL (Low)</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ferritin:</span> <span className="font-bold text-rose-600">8 ng/mL (Low)</span></div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { toast('Patient contacted via emergency channel.', 'success'); onClose(); }} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            <i className="fas fa-phone mr-2"></i>Contact Patient
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors">
            Review Later
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Patient File Modal ─────────────────────── */
function PatientFileModal({ patient, onClose }) {
  if (!patient) return null;
  return (
    <Modal isOpen={!!patient} onClose={onClose} title={`Patient File — ${patient.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-xl font-black">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">{patient.name}</h3>
            <p className="text-sm text-slate-500">{patient.age} • {patient.type}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[patient.status]}`}>{patient.status}</span>
              <span className="text-xs text-aubergine-700 font-bold">{patient.token} — {patient.time}</span>
            </div>
          </div>
        </div>

        {patient.concern && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 mt-0.5"></i>
            <div>
              <p className="font-bold text-amber-800 text-sm">Clinical Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">{patient.concern}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Last Visit', value: '10 Jun 2026' },
            { label: 'Diagnosis', value: 'PCOS — IR Subtype' },
            { label: 'BMI', value: '24.2 (Normal)' },
            { label: 'Last BP', value: patient.vital || '—' },
            { label: 'Allergies', value: 'Penicillin' },
            { label: 'Medications', value: 'Metformin, Inositol' },
          ].map(f => (
            <div key={f.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-slate-400 font-bold mb-0.5">{f.label}</p>
              <p className="font-bold text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => { onClose(); }} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-file-prescription"></i> Write Prescription
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── AI Assistant Modal ─────────────────────── */
function AIAssistantModal({ isOpen, onClose, patient }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Patient Context for ${patient?.name || 'Jane Doe'}: PCOS with insulin resistance subtype. Elevated TSH 5.2 mIU/L suggests possible Hashimoto's thyroiditis. Current medications: Metformin 500mg BD, Myo-Inositol 2g OD.` },
    { role: 'ai', text: 'Recommendation: Consider adding T3/T4 to the panel. Evaluate for TPO antibodies. Adjust Metformin after thyroid stabilization. Review HbA1c trend.' },
  ]);
  const [typing, setTyping] = useState(false);

  const send = () => {
    if (!input.trim()) return;
    const q = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: `Based on the clinical data: ${q.toLowerCase().includes('dose') ? 'Recommend starting at 25mcg Levothyroxine, titrate every 6 weeks. Monitor TSH quarterly.' : q.toLowerCase().includes('lab') ? 'Order: TSH, Free T4, Anti-TPO Antibodies, Fasting Insulin, HOMA-IR. Expedite as urgent.' : 'Based on existing protocols, a conservative approach is recommended. Review in 4–6 weeks.'}` }]);
      setTyping(false);
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Clinical Assistant" size="md">
      <div className="space-y-4">
        <div className="bg-slate-900 rounded-2xl p-4 h-64 overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${m.role === 'ai' ? 'bg-aubergine-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {m.role === 'ai' ? 'AI' : 'Dr'}
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'ai' ? 'bg-slate-800 text-slate-200' : 'bg-aubergine-600 text-white'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-aubergine-600 flex items-center justify-center text-[10px] font-black text-white">AI</div>
              <div className="bg-slate-800 px-3 py-2 rounded-xl flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about dosage, labs, protocols..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          <button onClick={send} className="bg-aubergine-600 text-white px-4 py-2.5 rounded-xl hover:bg-aubergine-700 transition-colors">
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center">AI suggestions are for clinical decision support only. Always apply professional judgment.</p>
      </div>
    </Modal>
  );
}

/* ─── KYC Document Upload Modal ─────────────────────── */
function KYCModal({ isOpen, onClose, toast, onVerify }) {
  const [loading, setLoading] = useState(false);

  const handleUpload = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onVerify();
      toast('Documents uploaded successfully. Pending admin verification.', 'success');
      onClose();
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit KYC Documents" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Please upload your Medical Registration Certificate and a valid Government ID.</p>
        
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Medical Registration Certificate</label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-aubergine-300 transition-colors cursor-pointer bg-slate-50">
            <i className="fas fa-file-medical text-2xl text-slate-400 mb-2"></i>
            <p className="text-sm font-bold text-slate-700">Click to upload</p>
            <p className="text-xs text-slate-500">PDF or JPG (Max 5MB)</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Government ID (Aadhar/Passport)</label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-aubergine-300 transition-colors cursor-pointer bg-slate-50">
            <i className="fas fa-id-card text-2xl text-slate-400 mb-2"></i>
            <p className="text-sm font-bold text-slate-700">Click to upload</p>
            <p className="text-xs text-slate-500">PDF or JPG (Max 5MB)</p>
          </div>
        </div>

        <button onClick={handleUpload} disabled={loading}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-2">
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-arrow-up"></i>}
          {loading ? 'Uploading...' : 'Submit for Verification'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [queue, setQueue] = useState([
    { id: 1, token: 'T-01', name: 'Priya Sharma',  age: '28F', type: 'PCOS Follow-up',    time: '09:30 AM', status: 'In Progress', vital: 'BP 118/78', concern: 'Elevated TSH 5.2 mIU/L — review before consult' },
    { id: 2, token: 'T-02', name: 'Anita Desai',   age: '34F', type: 'Fertility Consult', time: '10:00 AM', status: 'Waiting',    vital: null, concern: null },
    { id: 3, token: 'T-03', name: 'Kavita Patel',  age: '22F', type: 'Irregular Cycles',  time: '10:30 AM', status: 'No Show',   vital: null, concern: null },
    { id: 4, token: 'T-04', name: 'Aisha Khan',    age: '29F', type: 'Endometriosis',      time: '11:00 AM', status: 'Upcoming',   vital: null, concern: null },
    { id: 5, token: 'T-05', name: 'Riya Mehta',    age: '25F', type: 'Thyroid Review',     time: '02:00 PM', status: 'Upcoming',   vital: null, concern: null },
  ]);
  const [labs, setLabs] = useState(PENDING_LABS);
  const [refills, setRefills] = useState(REFILL_REQUESTS);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [urgentLab, setUrgentLab] = useState(null);
  const [callActive, setCallActive] = useState(false);

  const currentPatient = queue.find(q => q.status === 'In Progress');
  const nextPatient    = queue.find(q => q.status === 'Waiting');

  const callNext = () => {
    setQueue(prev => prev.map(p => {
      if (p.status === 'In Progress') return { ...p, status: 'Done' };
      if (p.status === 'Waiting') return { ...p, status: 'In Progress' };
      const waitingIdx = prev.findIndex(x => x.status === 'Upcoming');
      if (p.id === prev[waitingIdx]?.id) return { ...p, status: 'Waiting' };
      return p;
    }));
    toast(`Calling ${nextPatient?.name || 'next patient'} — ${nextPatient?.token}`, 'success');
  };

  const approveRefill = (id) => {
    setRefills(prev => prev.filter(r => r.id !== id));
    toast('Refill approved and sent to patient pharmacy.', 'success');
  };

  const rejectRefill = (id) => {
    setRefills(prev => prev.filter(r => r.id !== id));
    toast('Refill request rejected.', 'info');
  };

  const reviewLab = (lab) => {
    if (lab.urgent) {
      setUrgentLab(lab);
    } else {
      setLabs(prev => prev.filter(l => l.id !== lab.id));
      toast(`Lab report for ${lab.patient} marked as reviewed.`, 'success');
    }
  };

  const handleUrgentLabClose = () => {
    if (urgentLab) {
      setLabs(prev => prev.filter(l => l.id !== urgentLab.id));
      setUrgentLab(null);
    }
  };

  const todayStats = [
    { label: "Today's Patients", value: queue.length, sub: '2 video • 3 clinic', icon: 'fa-users', color: 'bg-aubergine-50 text-aubergine-600', onClick: () => navigate('/doctor-dashboard/appointments') },
    { label: 'Pending Lab Reviews', value: labs.length, sub: '1 urgent', icon: 'fa-flask', color: 'bg-amber-50 text-amber-600', onClick: () => navigate('/doctor-dashboard/reports') },
    { label: 'Refill Requests', value: refills.length, sub: 'Awaiting approval', icon: 'fa-pills', color: 'bg-rose-50 text-rose-500', onClick: () => navigate('/doctor-dashboard/prescriptions') },
    { label: 'Total Active Patients', value: 142, sub: '+8 this month', icon: 'fa-heart-pulse', color: 'bg-emerald-50 text-emerald-600', onClick: () => navigate('/doctor-dashboard/patients') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Good morning, {user?.name?.split(' ')[0] || 'Doctor'} 👋</h1>
          <p className="text-sm text-slate-500">You have <strong className="text-aubergine-700">{queue.filter(q => q.status !== 'Done').length}</strong> patients scheduled today.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAI(true)}
            className="border border-slate-200 bg-white hover:border-aubergine-300 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 text-slate-600 transition-colors shadow-sm card-premium">
            <i className="fas fa-sparkles text-aubergine-500"></i> AI Assistant
          </button>
          <button onClick={() => { setCallActive(true); toast('Starting next video consultation...', 'success'); setTimeout(() => setCallActive(false), 3000); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm card-premium">
            <i className="fas fa-video"></i> Start Call
          </button>
        </div>
      </div>

      {/* KYC Alert */}
      {!kycVerified && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">
              <i className="fas fa-file-shield"></i>
            </div>
            <div>
              <p className="font-bold text-amber-800">Complete your KYC Verification</p>
              <p className="text-xs text-amber-700">Upload your Medical License and Identity Proof to receive payouts.</p>
            </div>
          </div>
          <button onClick={() => setShowKycModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap card-premium">
            Upload Documents
          </button>
        </div>
      )}

      {/* Active Call Banner */}
      {callActive && (
        <div className="bg-emerald-600 text-white rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center animate-pulse">
              <i className="fas fa-video"></i>
            </div>
            <div>
              <p className="font-bold">Video Consultation Active</p>
              <p className="text-xs text-emerald-100">{currentPatient?.name} • {currentPatient?.type}</p>
            </div>
          </div>
          <button onClick={() => { setCallActive(false); toast('Call ended. Notes saved.', 'info'); }}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-bold text-sm border border-white/20 transition-colors">
            End Call
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {todayStats.map(stat => (
          <Tilt3D key={stat.label} max={5}>
          <div onClick={stat.onClick}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-aubergine-200 cursor-pointer transition-all group card-premium">
            <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${stat.color}`}>
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <i className="fas fa-arrow-right text-[10px] text-slate-300 group-hover:text-aubergine-400 group-hover:translate-x-0.5 transition-all"></i>
            </div>
            <div className="text-3xl font-black text-slate-800 mb-0.5">{stat.value}</div>
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            <div className="text-[10px] text-slate-400 mt-1">{stat.sub}</div>
          </div>
          </Tilt3D>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-list-ol text-aubergine-500"></i> Today's Queue
            </h2>
            <button onClick={callNext} disabled={!nextPatient}
              className="bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm card-premium">
              <i className="fas fa-bullhorn"></i> Call Next ({nextPatient?.token || '—'})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">Token</th>
                  <th className="px-5 py-3 font-semibold">Patient</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 stagger-children">
                {queue.map(p => (
                  <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.status === 'In Progress' ? 'bg-emerald-50/30' : ''}`}>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-black px-2 py-1 rounded font-mono ${p.status === 'In Progress' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
                        {p.token}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.age} • {p.time}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full">{p.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.status === 'No Show' ? (
                        <button onClick={() => toast('Reschedule link sent via SMS.', 'success')}
                          className="text-slate-600 hover:text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                          Reschedule
                        </button>
                      ) : p.status !== 'Done' ? (
                        <button onClick={() => setSelectedPatient(p)}
                          className="text-aubergine-600 hover:text-aubergine-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100">
                          Review File
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5 stagger-children">
          {/* Earnings Widget */}
          <div className="bg-gradient-to-br from-aubergine-900 to-aubergine-700 rounded-2xl shadow-sm overflow-hidden text-white p-5 relative card-premium">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10"></div>
             <div className="relative z-10">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-aubergine-100 text-sm">Week Earnings</h3>
                 <i className="fas fa-wallet text-aubergine-300"></i>
               </div>
               <div className="text-3xl font-black mb-1">₹14,500</div>
               <p className="text-xs text-aubergine-200 mb-4">+12% from last week</p>
               <button className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-2 rounded-xl text-xs transition-colors border border-white/20">View Payouts</button>
             </div>
          </div>

          {/* Availability Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 card-premium">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800 text-sm">Today's Availability</h3>
               <button className="text-xs text-aubergine-600 font-bold hover:underline">Edit</button>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Morning Slot</span>
                 <span className="font-bold text-slate-800">09:00 - 13:00</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-500">Evening Slot</span>
                 <span className="font-bold text-slate-800">16:00 - 19:00</span>
               </div>
             </div>
             <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Accepting Walk-ins</span>
                <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                </div>
             </div>
          </div>

          {/* Pending Lab Reports */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Pending Lab Reports</h3>
              {labs.some(l => l.urgent) && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">URGENT</span>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {labs.map(lab => (
                <div key={lab.id} className={`p-4 ${lab.urgent ? 'bg-amber-50/50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        {lab.urgent && <span className="w-2 h-2 bg-rose-500 rounded-full"></span>}
                        {lab.patient}
                      </p>
                      <p className="text-xs text-slate-500">{lab.test}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{lab.received}</p>
                    </div>
                    <button onClick={() => reviewLab(lab)}
                      className="text-xs font-bold text-aubergine-600 hover:text-aubergine-800 px-3 py-1.5 rounded-lg hover:bg-aubergine-50 transition-colors border border-aubergine-100 whitespace-nowrap flex-shrink-0">
                      {lab.urgent ? 'Urgent Review' : 'Review'}
                    </button>
                  </div>
                </div>
              ))}
              {labs.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <i className="fas fa-check-circle text-2xl mb-2 block text-emerald-400"></i>
                  <p className="text-xs font-medium">All reports reviewed!</p>
                </div>
              )}
            </div>
          </div>

          {/* Refill Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Refill Requests</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {refills.map(r => (
                <div key={r.id} className="p-4">
                  <p className="font-bold text-slate-800 text-sm">{r.patient}</p>
                  <p className="text-xs text-slate-500">{r.med}</p>
                  <p className="text-[10px] text-slate-400">Last Rx: {r.lastRx}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => rejectRefill(r.id)} className="flex-1 text-xs font-bold text-rose-600 border border-rose-200 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">Reject</button>
                    <button onClick={() => approveRefill(r.id)} className="flex-1 text-xs font-bold bg-emerald-500 text-white py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">Approve</button>
                  </div>
                </div>
              ))}
              {refills.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <i className="fas fa-check-circle text-2xl mb-2 block text-emerald-400"></i>
                  <p className="text-xs font-medium">No pending refills</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PatientFileModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      <AIAssistantModal isOpen={showAI} onClose={() => setShowAI(false)} patient={currentPatient} />
      <KYCModal isOpen={showKycModal} onClose={() => setShowKycModal(false)} toast={toast} onVerify={() => setKycVerified(true)} />
      <UrgentLabModal lab={urgentLab} onClose={handleUrgentLabClose} toast={toast} />
    </div>
  );
}

export default DoctorDashboard;
