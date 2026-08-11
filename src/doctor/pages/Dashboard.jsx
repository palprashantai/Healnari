import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

const DAY_MS = 86400000;
function daysAgoLabel(dateStr) {
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

const STATUS_STYLE = {
  'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Waiting':     'bg-amber-50 text-amber-700 border-amber-200',
  'Upcoming':    'bg-slate-100 text-slate-600 border-slate-200',
  'No Show':     'bg-rose-50 text-rose-700 border-rose-200',
  'Done':        'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_ICON = {
  'In Progress': 'fa-circle-dot text-emerald-500',
  'Waiting':     'fa-clock text-amber-500',
  'Upcoming':    'fa-calendar text-slate-400',
  'No Show':     'fa-circle-xmark text-rose-400',
  'Done':        'fa-circle-check text-slate-400',
};


/* ─── EKG Line SVG Animation ─── */
function EkgLine() {
  return (
    <svg viewBox="0 0 300 60" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points="0,30 20,30 30,30 40,10 50,50 60,30 80,30 90,5 100,55 110,30 130,30 140,30 160,30 170,15 180,45 190,30 210,30 220,30 240,30 250,10 260,50 270,30 300,30"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ekg-animate"
      />
    </svg>
  );
}

/* ─── Clinical Quick Notes Pad ─── */
function QuickNotesPad() {
  const [notes, setNotes] = React.useState(() => localStorage.getItem('doctor_quick_notes') || '');
  const [saved, setSaved] = React.useState(false);

  const handleChange = (e) => {
    setNotes(e.target.value);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('doctor_quick_notes', notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl overflow-hidden">
      <div className="px-5 py-3 border-b border-amber-200 bg-amber-100/50 flex items-center justify-between">
        <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
          <i className="fas fa-note-sticky text-amber-600"></i> Clinical Quick Notes
        </h3>
        <button onClick={handleSave}
          className={`text-[10px] font-black px-3 py-1 rounded-lg transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Jot down quick clinical notes, reminders, or observations for today..."
        rows={4}
        className="w-full bg-transparent px-5 py-4 text-sm text-amber-900 placeholder:text-amber-400 resize-none focus:outline-none font-mono leading-relaxed"
      />
    </div>
  );
}

/* ─── Urgent Lab Modal ─── */
function UrgentLabModal({ lab, onClose, toast }) {
  if (!lab) return null;
  const abnormal = Object.entries(lab.results || {}).filter(([, v]) => v.status !== 'normal');
  return (
    <Modal isOpen={!!lab} onClose={onClose} title="Urgent Clinical Alert" size="md">
      <div className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-4">
          <i className="fas fa-triangle-exclamation text-rose-600 text-2xl mt-1"></i>
          <div>
            <h3 className="font-bold text-rose-800 text-base">{lab.patient}</h3>
            <p className="text-sm text-rose-700 mt-1">Critical values detected in: {lab.test}</p>
            <div className="mt-3 bg-white/60 p-3 rounded-xl text-xs space-y-1">
              {abnormal.map(([param, v]) => (
                <div key={param} className="flex justify-between">
                  <span className="text-slate-500">{param}:</span>
                  <span className="font-bold text-rose-600">{v.value} ({v.status === 'high' ? 'High' : 'Low'})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { toast('Patient contacted via emergency channel.', 'success'); onClose(); }}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
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

/* ─── Patient File Modal ─── */
function PatientFileModal({ row, onClose, onWriteRx }) {
  if (!row) return null;
  const p = row.patient;
  return (
    <Modal isOpen={!!row} onClose={onClose} title={`Patient File — ${row.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-xl font-black">
            {row.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">{row.name}</h3>
            <p className="text-sm text-slate-500">{row.age} • {row.type}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[row.status]}`}>{row.status}</span>
              <span className="text-xs text-aubergine-700 font-bold">{row.token} — {row.time}</span>
            </div>
          </div>
        </div>
        {row.concern && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 mt-0.5"></i>
            <div>
              <p className="font-bold text-amber-800 text-sm">Clinical Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">{row.concern}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Last Visit', value: p?.lastVisit || '—' },
            { label: 'Diagnosis', value: p?.diagnosis || '—' },
            { label: 'BMI', value: p?.bmi || '—' },
            { label: 'Last BP', value: p?.bp || '—' },
            { label: 'Allergies', value: p?.allergies?.length ? p.allergies.join(', ') : 'None recorded' },
            { label: 'Medications', value: p?.meds?.length ? p.meds.map(m => m.medName).join(', ') : 'None active' },
          ].map(f => (
            <div key={f.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-slate-500 font-bold mb-0.5">{f.label}</p>
              <p className="font-bold text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => onWriteRx(p)} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-file-prescription"></i> Write Prescription
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── AI Assistant Modal ─── */
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
    <Modal isOpen={isOpen} onClose={onClose} title="AI Clinical Copilot" size="md">
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
        <p className="text-[10px] text-slate-500 text-center">AI suggestions are for clinical decision support only. Always apply professional judgment.</p>
      </div>
    </Modal>
  );
}

/* ─── KYC Modal ─── */
function KYCModal({ isOpen, onClose, toast, onVerify }) {
  const [loading, setLoading] = useState(false);
  const handleUpload = async () => {
    setLoading(true);
    try { await onVerify(); toast('Documents uploaded. Pending admin verification.', 'success'); onClose(); }
    catch { toast('Failed to submit KYC.', 'error'); }
    finally { setLoading(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit KYC Documents" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Upload your Medical Registration Certificate and a valid Government ID.</p>
        {[{ label: 'Medical Registration Certificate', icon: 'fa-file-medical' }, { label: 'Government ID (Aadhar/Passport)', icon: 'fa-id-card' }].map(f => (
          <div key={f.label}>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">{f.label}</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-aubergine-300 transition-colors cursor-pointer bg-slate-50">
              <i className={`fas ${f.icon} text-2xl text-slate-400 mb-2`}></i>
              <p className="text-sm font-bold text-slate-700">Click to upload</p>
              <p className="text-xs text-slate-500">PDF or JPG (Max 5MB)</p>
            </div>
          </div>
        ))}
        <button onClick={handleUpload} disabled={loading}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-arrow-up"></i>}
          {loading ? 'Uploading...' : 'Submit for Verification'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Live Patient Timeline Card (Clinical Style) ─── */
function PatientTimelineCard({ patient, isActive, onReview, onCallNext, isNext, toast }) {
  const PRIORITY_COLOR = {
    'In Progress': 'border-l-emerald-500',
    'Waiting':     'border-l-amber-400',
    'Upcoming':    'border-l-slate-300',
    'No Show':     'border-l-rose-400',
    'Done':        'border-l-slate-200',
  };

  return (
    <div className={`relative flex gap-0 rounded-2xl border overflow-hidden transition-all duration-300 group
      ${isActive
        ? 'border-emerald-200 shadow-md shadow-emerald-100/60'
        : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
      }`}>

      {/* Left Clinical Priority Bar */}
      <div className={`w-1 flex-shrink-0 ${PRIORITY_COLOR[patient.status] || 'border-l-slate-200'} bg-current`}
        style={{ background: isActive ? '#10b981' : patient.status === 'Waiting' ? '#fbbf24' : patient.status === 'No Show' ? '#f87171' : patient.status === 'Done' ? '#e2e8f0' : '#cbd5e1' }}>
      </div>

      <div className={`flex gap-4 p-4 flex-1 ${isActive ? 'bg-gradient-to-r from-emerald-50/80 to-white' : 'bg-white'}`}>
        {/* Token + Time */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black font-mono
            ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-300' : patient.status === 'Done' ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-white'}`}>
            {patient.token}
          </div>
          <span className="text-[10px] text-slate-400 font-bold tabular-nums">{patient.time}</span>
        </div>

        {/* Patient Data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-bold text-sm leading-tight ${isActive ? 'text-emerald-900' : patient.status === 'Done' ? 'text-slate-400' : 'text-slate-800'}`}>
                {patient.name}
                {isActive && <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full animate-pulse">● LIVE</span>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1"><i className="fas fa-user text-[9px] text-slate-400"></i>{patient.age}</span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1"><i className="fas fa-stethoscope text-[9px] text-slate-400"></i>{patient.type}</span>
              </p>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex-shrink-0 flex items-center gap-1 ${STATUS_STYLE[patient.status]}`}>
              <i className={`fas ${STATUS_ICON[patient.status]} text-[8px]`}></i>
              {patient.status}
            </span>
          </div>

          {/* Clinical Alerts Row */}
          <div className="flex flex-wrap gap-2 mt-2">
            {patient.vital && (
              <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5">
                <i className="fas fa-heart-pulse text-rose-500 text-[9px]"></i>
                <span className="text-[10px] font-bold text-rose-700">BP: {patient.vital}</span>
              </div>
            )}
            {patient.concern && (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 max-w-[200px]">
                <i className="fas fa-triangle-exclamation text-amber-500 text-[9px]"></i>
                <span className="text-[10px] font-bold text-amber-700 truncate">{patient.concern}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col gap-2 flex-shrink-0 justify-center">
          {patient.status === 'No Show' ? (
            <button onClick={() => toast('Reschedule link sent via SMS.', 'success')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">
              Reschedule
            </button>
          ) : patient.status === 'Waiting' && isNext ? (
            <button onClick={onCallNext}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm shadow-emerald-300">
              <i className="fas fa-bullhorn text-[10px]"></i> Call In
            </button>
          ) : patient.status !== 'Done' && patient.status !== 'No Show' ? (
            <button onClick={() => onReview(patient)}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors whitespace-nowrap flex items-center gap-1.5">
              <i className="fas fa-folder-open text-[10px]"></i> Open File
            </button>
          ) : patient.status === 'Done' ? (
            <span className="text-[10px] font-bold text-slate-400 text-center">
              <i className="fas fa-circle-check mr-1"></i>Done
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Priority Action Inbox ─── */
function PriorityInbox({ labs, refillRequests, onReviewLab, onApproveRefill, onRejectRefill }) {
  const [activeTab, setActiveTab] = useState('all');
  const labItems = labs.map(l => ({ ...l, kind: 'lab' }));
  const refillItems = refillRequests.map(r => ({ ...r, kind: 'refill', id: r.med.id }));
  const allItems = [...labItems.filter(l => l.urgent), ...refillItems, ...labItems.filter(l => !l.urgent)];
  const filtered = activeTab === 'labs' ? labItems : activeTab === 'refills' ? refillItems : allItems;
  const urgentCount = labItems.filter(l => l.urgent).length;

  return (
    <div className="glass-panel rounded-3xl overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-clipboard-list text-rose-500"></i> Clinical Action Items
            {urgentCount > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">{urgentCount} URGENT</span>}
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{filtered.length} pending</span>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[['all', 'All'], ['labs', 'Labs'], ['refills', 'Refills']].map(([val, label]) => (
            <button key={val} onClick={() => setActiveTab(val)}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${activeTab === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {filtered.map((item, idx) => (
          <div key={`${item.kind}-${item.id || idx}`} className={`p-4 transition-colors ${item.urgent ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}>
            {item.kind === 'lab' ? (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${item.urgent ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'}`}>
                    <i className="fas fa-flask"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {item.urgent && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0"></span>}
                      {item.patient}
                    </p>
                    <p className="text-xs text-slate-500">{item.test}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.received}</p>
                  </div>
                </div>
                <button onClick={() => onReviewLab(item)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0
                    ${item.urgent ? 'bg-rose-500 text-white hover:bg-rose-600' : 'border border-aubergine-100 text-aubergine-600 hover:bg-aubergine-50'}`}>
                  {item.urgent ? '⚡ Urgent' : 'Review'}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 text-xs">
                    <i className="fas fa-pills"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.patient}</p>
                    <p className="text-xs text-slate-500">{item.med?.medName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Last Rx: {item.med?.date}</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-10">
                  <button onClick={() => onRejectRefill(item.patientId, item.med.id, item.patient)}
                    className="flex-1 text-xs font-bold text-rose-600 border border-rose-200 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">Reject</button>
                  <button onClick={() => onApproveRefill(item.patientId, item.med.id, item.patient)}
                    className="flex-1 text-xs font-bold bg-emerald-500 text-white py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">Approve</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <i className="fas fa-circle-check text-3xl mb-3 block text-emerald-400"></i>
            <p className="text-sm font-bold text-slate-700">All clear!</p>
            <p className="text-xs text-slate-500">No pending items.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Practice Performance Card ─── */
function PracticePerformanceCard({ earnings, navigate, queue }) {
  const done = queue.filter(q => q.status === 'Done').length;
  const total = queue.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (pct / 100) * circumference;
  return (
    <Tilt3D max={5}>
      <div className="bg-gradient-to-br from-aubergine-900 via-aubergine-800 to-magenta-700 rounded-3xl shadow-lg overflow-hidden text-white p-6 relative card-premium">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-magenta-500/20 blur-2xl rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] font-black text-aubergine-300 uppercase tracking-widest mb-1">This Month</p>
              <h3 className="font-bold text-aubergine-100 text-sm">Practice Performance</h3>
            </div>
            <i className="fas fa-chart-line text-aubergine-300 text-lg"></i>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="30" stroke="rgba(255,255,255,0.15)" strokeWidth="7" fill="transparent" />
                <circle cx="35" cy="35" r="30" stroke="url(#perf-grad)" strokeWidth="7" fill="transparent"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                  className="transition-all duration-1000" />
                <defs>
                  <linearGradient id="perf-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black">{pct}%</span>
                <span className="text-[8px] text-aubergine-300 font-bold">Today</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-3xl font-black">₹{(earnings?.thisMonth ?? 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-aubergine-200">{earnings ? `${earnings.thisMonthCount} consultations` : 'Loading...'}</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <i className="fas fa-arrow-trend-up text-xs"></i>
                <span className="text-xs font-bold">+12% vs last month</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black">{done}</p>
              <p className="text-[10px] text-aubergine-200">Seen Today</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black">{total - done}</p>
              <p className="text-[10px] text-aubergine-200">Remaining</p>
            </div>
          </div>
          <button onClick={() => navigate('/doctor-dashboard/billing')}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-white/20 flex items-center justify-center gap-2">
            <i className="fas fa-wallet"></i> View Payouts
          </button>
        </div>
      </div>
    </Tilt3D>
  );
}

/* ─── AI Insight Strip ─── */
function AIInsightStrip({ queue, labs, refillRequests }) {
  const insights = useMemo(() => {
    const result = [];
    const urgentLabs = labs.filter(l => l.urgent);
    if (urgentLabs.length > 0) result.push({ icon: 'fa-triangle-exclamation', color: 'text-rose-500', text: `${urgentLabs.length} urgent lab result${urgentLabs.length > 1 ? 's' : ''} require immediate review.` });
    const highBP = queue.filter(q => q.vital && q.vital.includes('/') && parseInt(q.vital.split('/')[0]) > 140);
    if (highBP.length > 0) result.push({ icon: 'fa-heart-pulse', color: 'text-amber-500', text: `${highBP.length} patient${highBP.length > 1 ? 's' : ''} in today's queue have elevated BP.` });
    if (refillRequests.length > 0) result.push({ icon: 'fa-pills', color: 'text-violet-500', text: `${refillRequests.length} refill request${refillRequests.length > 1 ? 's' : ''} awaiting approval.` });
    if (result.length === 0) result.push({ icon: 'fa-circle-check', color: 'text-emerald-500', text: "All clear! No critical alerts for today's schedule." });
    return result;
  }, [queue, labs, refillRequests]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % insights.length), 4000);
    return () => clearInterval(t);
  }, [insights.length]);

  const insight = insights[idx];
  return (
    <div className="bg-gradient-to-r from-slate-50 to-teal-50/50 border border-teal-100 rounded-2xl px-5 py-3 flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
        <i className={`fas ${insight.icon} text-sm ${insight.color}`}></i>
      </div>
      <p className="text-sm text-slate-700 font-medium flex-1 animate-fade-in" key={idx}>{insight.text}</p>
      {insights.length > 1 && (
        <div className="flex gap-1">
          {insights.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-teal-600' : 'bg-teal-200'}`}></div>
          ))}
        </div>
      )}
      <span className="text-[10px] font-black text-teal-700 bg-teal-100 px-2 py-1 rounded-lg flex-shrink-0">
        <i className="fas fa-sparkles mr-1"></i>AI
      </span>
    </div>
  );
}

/* ─── Main Component ─── */
function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { patients, appointments, refillRequests, approveRefill: ctxApproveRefill, rejectRefill: ctxRejectRefill, callNextForDoctor, kycVerified, kycSubmitted, verifyKyc } = useClinicData();

  const doctorName = user?.name || 'Dr. Sarah Mitchell';
  const todayIso = todayLocalStr();

  const queue = useMemo(() => {
    return appointments
      .filter(a => a.doctorId === user?.id && a.date === todayIso)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((a, i) => {
        const patient = patients.find(p => p.id === a.patientId);
        return {
          id: a.id,
          token: `T-${String(i + 1).padStart(2, '0')}`,
          name: a.patientName,
          age: patient ? `${patient.age}F` : '—',
          type: a.reason,
          time: a.time,
          status: a.status,
          vital: patient?.bp || null,
          concern: patient?.alert || null,
          patient,
        };
      });
  }, [appointments, patients, user?.id, todayIso]);

  const labs = useMemo(() => {
    return patients.flatMap(p => p.reports.slice(0, 1).map(r => ({
      id: r.id, patient: p.name, test: r.testName, received: daysAgoLabel(r.date), urgent: r.urgent, results: r.results,
    })));
  }, [patients]);

  const [reviewedLabIds, setReviewedLabIds] = useState([]);
  const visibleLabs = labs.filter(l => !reviewedLabIds.includes(l.id));
  const [selectedRow, setSelectedRow] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycBannerDismissed, setKycBannerDismissed] = useState(() => sessionStorage.getItem('kyc_banner_dismissed') === 'true');
  const [urgentLab, setUrgentLab] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    apiFetch('/billing/summary').then(setEarnings).catch(() => setEarnings(null));
  }, []);

  const currentPatient = queue.find(q => q.status === 'In Progress');
  const nextPatient = queue.find(q => q.status === 'Waiting');

  const callNext = async () => {
    try {
      await callNextForDoctor(doctorName);
      toast(`Calling ${nextPatient?.name || 'next patient'} — ${nextPatient?.token}`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to call next patient', 'error');
    }
  };

  const approveRefill = async (patientId, medId, patientName) => {
    try {
      await ctxApproveRefill(patientId, medId);
      toast(`Refill approved for ${patientName}.`, 'success');
    } catch (err) {
      toast(err.message || `Failed to approve refill for ${patientName}`, 'error');
    }
  };

  const rejectRefill = async (patientId, medId, patientName) => {
    try {
      await ctxRejectRefill(patientId, medId);
      toast(`Refill request from ${patientName} rejected.`, 'info');
    } catch (err) {
      toast(err.message || `Failed to reject refill for ${patientName}`, 'error');
    }
  };

  const reviewLab = (lab) => {
    if (lab.urgent) { setUrgentLab(lab); }
    else { setReviewedLabIds(prev => [...prev, lab.id]); toast(`Lab report for ${lab.patient} marked as reviewed.`, 'success'); }
  };

  const handleUrgentLabClose = () => {
    if (urgentLab) { setReviewedLabIds(prev => [...prev, urgentLab.id]); setUrgentLab(null); }
  };

  const handleWriteRx = (patient) => {
    setSelectedRow(null);
    navigate('/doctor-dashboard/patients');
    toast(`Open ${patient.name}'s chart to write a prescription.`, 'info');
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayStats = [
    { label: "Today's Queue", value: queue.length, sub: `${queue.filter(q => q.status !== 'Done' && q.status !== 'No Show').length} remaining`, icon: 'fa-hospital-user', color: 'from-slate-600 to-slate-800', onClick: () => navigate('/doctor-dashboard/appointments') },
    { label: 'Lab Reviews', value: visibleLabs.length, sub: visibleLabs.some(l => l.urgent) ? '⚡ Urgent pending' : 'All reviewed', icon: 'fa-microscope', color: 'from-amber-500 to-orange-600', onClick: () => navigate('/doctor-dashboard/reports') },
    { label: 'Refill Requests', value: refillRequests.length, sub: 'Awaiting approval', icon: 'fa-prescription-bottle-medical', color: 'from-teal-500 to-cyan-600', onClick: () => navigate('/doctor-dashboard/prescriptions') },
    { label: 'Active Patients', value: patients.filter(p => p.status === 'active').length, sub: `${patients.length} total in roster`, icon: 'fa-heart-pulse', color: 'from-rose-500 to-red-600', onClick: () => navigate('/doctor-dashboard/patients') },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* Clinical Command Header */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl text-white">
        {/* EKG Decorative Strip */}
        <div className="absolute bottom-0 left-0 right-0 h-16 text-emerald-400/20 pointer-events-none overflow-hidden">
          <EkgLine />
        </div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="relative z-10 p-8">
          {/* Top status bar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Clinic Active</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1">
              <i className="fas fa-calendar-day text-slate-400 text-[10px]"></i>
              <span className="text-[10px] font-bold text-slate-300">{todayLabel}</span>
            </div>
            {currentPatient && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1">
                <i className="fas fa-user-clock text-amber-400 text-[10px]"></i>
                <span className="text-[10px] font-bold text-amber-300">In Session: {currentPatient.name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                {greeting},
                <span className="block text-emerald-400">{user?.name || 'Doctor'}.</span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                <span className="text-white font-bold">{queue.filter(q => q.status !== 'Done').length}</span> patients remaining today
                {queue.filter(q => q.status === 'Done').length > 0 && (
                  <> · <span className="text-emerald-400 font-bold">{queue.filter(q => q.status === 'Done').length} seen</span></>
                )}
                {queue.some(q => q.concern) && (
                  <> · <span className="text-amber-400 font-bold">{queue.filter(q => q.concern).length} with alerts</span></>
                )}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setShowAI(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 font-bold px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2 text-white transition-all backdrop-blur-sm">
                <i className="fas fa-sparkles text-aubergine-300"></i> AI Copilot
              </button>
              <button
                onClick={() => { setCallActive(true); toast(`Starting video call with ${currentPatient?.name}...`, 'success'); setTimeout(() => setCallActive(false), 3000); }}
                disabled={!currentPatient}
                className="bg-emerald-500 disabled:opacity-40 hover:bg-emerald-400 text-white font-bold px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/50">
                <i className="fas fa-video"></i>
                {currentPatient ? `Start Call — ${currentPatient.name.split(' ')[0]}` : 'No Active Patient'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight Strip */}
      <AIInsightStrip queue={queue} labs={visibleLabs} refillRequests={refillRequests} />

      {/* KYC Banner */}
      {!kycVerified && !kycBannerDismissed && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">
              <i className={`fas ${kycSubmitted ? 'fa-hourglass-half' : 'fa-file-shield'}`}></i>
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">{kycSubmitted ? 'KYC Pending Admin Review' : 'Complete your KYC Verification'}</p>
              <p className="text-xs text-amber-700">
                {kycSubmitted
                  ? "Your documents were submitted. Payouts and verified-only features unlock once an admin approves your account."
                  : 'Upload your Medical License and Identity Proof to receive payouts.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!kycSubmitted && (
              <button onClick={() => setShowKycModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap">
                Upload Documents
              </button>
            )}
            <button onClick={() => { sessionStorage.setItem('kyc_banner_dismissed', 'true'); setKycBannerDismissed(true); }}
              className="w-9 h-9 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors flex items-center justify-center">
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* Active Call Banner */}
      {callActive && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-emerald-200">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {todayStats.map(stat => (
          <div key={stat.label} onClick={stat.onClick}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-transparent cursor-pointer transition-all group relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
            <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-md`}>
                <i className={`fas ${stat.icon} text-sm`}></i>
              </div>
              <i className="fas fa-arrow-right text-[10px] text-slate-300 group-hover:text-aubergine-400 group-hover:translate-x-0.5 transition-all"></i>
            </div>
            <div className="text-3xl font-black text-slate-800 mb-0.5">{stat.value}</div>
            <div className="text-xs font-bold text-slate-600">{stat.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Bento Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Live Patient Timeline */}
        <div className="lg:col-span-2 glass-panel rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-hospital-user text-teal-600"></i> Today's Patient Queue
            </h2>
            <button onClick={callNext} disabled={!nextPatient}
              className="bg-emerald-500 disabled:opacity-40 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm">
              <i className="fas fa-bullhorn"></i> Call Next {nextPatient?.token && `(${nextPatient.token})`}
            </button>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {queue.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-calendar-check text-4xl text-slate-300 mb-3 block"></i>
                <p className="text-slate-500 font-bold">No patients scheduled for today.</p>
                <p className="text-xs text-slate-400 mt-1">Check your appointments for upcoming dates.</p>
              </div>
            ) : (
              queue.map(p => (
                <PatientTimelineCard
                  key={p.id}
                  patient={p}
                  isActive={p.status === 'In Progress'}
                  isNext={p.id === nextPatient?.id}
                  onReview={setSelectedRow}
                  onCallNext={callNext}
                  toast={toast}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PracticePerformanceCard earnings={earnings} navigate={navigate} queue={queue} />
          <PriorityInbox
            labs={visibleLabs}
            refillRequests={refillRequests}
            onReviewLab={reviewLab}
            onApproveRefill={approveRefill}
            onRejectRefill={rejectRefill}
          />
        </div>
      </div>

      {/* Quick Notes */}
      <QuickNotesPad />

      {/* Modals */}
      <PatientFileModal row={selectedRow} onClose={() => setSelectedRow(null)} onWriteRx={handleWriteRx} />
      <AIAssistantModal isOpen={showAI} onClose={() => setShowAI(false)} patient={currentPatient} />
      <KYCModal isOpen={showKycModal} onClose={() => setShowKycModal(false)} toast={toast} onVerify={verifyKyc} />
      <UrgentLabModal lab={urgentLab} onClose={handleUrgentLabClose} toast={toast} />
    </div>
  );
}

export default DoctorDashboard;
