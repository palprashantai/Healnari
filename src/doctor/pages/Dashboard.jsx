import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency, getCurrencySymbol } from '../../lib/currency.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Tilt3D } from '../../components/Tilt3D.jsx';
import { DoctorShareModal } from '../../components/DoctorShareModal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { getProviderCapabilities } from '../../lib/providerCapabilities.js';

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
function UrgentLabModal({ lab, onClose, toast, doctorName }) {
  const [contacting, setContacting] = useState(false);
  if (!lab) return null;
  const abnormal = Object.entries(lab.results || {}).filter(([, v]) => v.status !== 'normal');

  const contactPatient = async () => {
    setContacting(true);
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: 'Urgent: please contact your doctor',
          body: `Dr. ${doctorName} needs to discuss your recent ${lab.test} results urgently. Please call the clinic or reply in the app as soon as possible.`,
          audience: `Urgent lab alert — ${lab.patient}`,
          channels: ['Push Notification'],
          scheduleType: 'immediate',
          patientIds: [lab.patientId],
        },
      });
      toast('Patient notified.', 'success');
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to notify patient', 'error');
    } finally {
      setContacting(false);
    }
  };

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
          <button onClick={contactPatient} disabled={contacting}
            className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            <i className={`fas ${contacting ? 'fa-spinner fa-spin' : 'fa-phone'} mr-2`}></i>{contacting ? 'Notifying…' : 'Contact Patient'}
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
function PatientFileModal({ row, onClose, onPrimaryAction, capabilities }) {
  if (!row) return null;
  const p = row.patient;
  return (
    <Modal isOpen={!!row} onClose={onClose} title={`${capabilities?.clientLabel || 'Patient'} File — ${row.name}`} size="lg">
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
          <button onClick={() => onPrimaryAction(p)} className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <i className={`fas ${capabilities?.primaryAction?.icon || 'fa-file-prescription'}`}></i>
            {capabilities?.primaryAction?.name || 'Write Prescription'}
          </button>
        </div>
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
  const [rescheduling, setRescheduling] = useState(false);

  const sendReschedule = async () => {
    if (!patient.patient?.id) { toast('No patient record linked to this appointment.', 'error'); return; }
    setRescheduling(true);
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: 'Missed appointment — let\'s reschedule',
          body: `We missed you for your ${patient.time} appointment. Please open the app to pick a new time that works for you.`,
          audience: `Reschedule — ${patient.name}`,
          channels: ['Push Notification'],
          scheduleType: 'immediate',
          patientIds: [patient.patient.id],
        },
      });
      toast('Reschedule request sent.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to send reschedule request', 'error');
    } finally {
      setRescheduling(false);
    }
  };

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
            <button onClick={sendReschedule} disabled={rescheduling}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap">
              {rescheduling ? 'Sending…' : 'Reschedule'}
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
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${item.urgent ? 'bg-rose-100 text-rose-600' : 'bg-aubergine-100 text-aubergine-700'}`}>
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
                  <div className="w-8 h-8 rounded-lg bg-aubergine-100 text-aubergine-700 flex items-center justify-center flex-shrink-0 text-xs">
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
function PracticePerformanceCard({ earnings, navigate, queue, userCurrency }) {
  const done = queue.filter(q => q.status === 'Done').length;
  const total = queue.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (pct / 100) * circumference;

  const momGrowth = useMemo(() => {
    if (!earnings) return null;
    const thisM = Number(earnings.thisMonth ?? 0);
    const lastM = Number(earnings.lastMonth ?? 0);
    if (lastM === 0) {
      return thisM === 0 ? { display: '0%', direction: 'flat' } : { display: 'Active this month', direction: 'up' };
    }
    const pctChange = Math.round(((thisM - lastM) / lastM) * 100);
    return {
      display: `${pctChange >= 0 ? '+' : ''}${pctChange}% vs last month`,
      direction: pctChange >= 0 ? 'up' : 'down',
    };
  }, [earnings]);

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
                <p className="text-3xl font-black">{formatCurrency(earnings?.thisMonth ?? 0, userCurrency)}</p>
                <p className="text-xs text-aubergine-200">{earnings ? `${earnings.thisMonthCount} consultations` : 'Loading...'}</p>
              </div>
              {momGrowth ? (
                <div className={`flex items-center gap-1.5 ${momGrowth.direction === 'down' ? 'text-rose-300' : 'text-emerald-300'}`}>
                  <i className={`fas fa-arrow-trend-${momGrowth.direction === 'down' ? 'down' : 'up'} text-xs`}></i>
                  <span className="text-xs font-bold">{momGrowth.display}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-aubergine-300 text-xs">
                  <span>Calculating trend...</span>
                </div>
              )}
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
    if (refillRequests.length > 0) result.push({ icon: 'fa-pills', color: 'text-aubergine-500', text: `${refillRequests.length} refill request${refillRequests.length > 1 ? 's' : ''} awaiting approval.` });
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
        <i className="fas fa-wand-magic-sparkles mr-1"></i>AI
      </span>
    </div>
  );
}

/* ─── Minimal AI Dashboard Discovery Card ─── */
function AiDashboardCard({ navigate }) {
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    apiFetch('/ai/subscription/status')
      .then(res => setAiStatus(res))
      .catch(() => {});
  }, []);

  const remaining = aiStatus?.creditsRemaining ?? 25;
  const total = aiStatus?.totalCredits ?? aiStatus?.subscription?.monthly_ai_credits ?? 25;
  const percent = Math.max(0, Math.min(100, Math.round((remaining / Math.max(1, total)) * 100)));

  return (
    <div className="bg-gradient-to-r from-purple-50/60 via-white to-indigo-50/40 border border-purple-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-lg shrink-0 shadow-md shadow-purple-500/20">
          <i className="fas fa-robot"></i>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-slate-900">Clinical AI Copilot</h4>
            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              {aiStatus?.isPremium ? 'AI Pro' : 'Free Tier'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Generate instant SOAP notes, pre-consultation briefings, and real-time drug interaction checks.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <div className="text-right">
          <span className="text-xs font-black text-slate-800 font-mono">
            {remaining.toLocaleString()} <span className="text-slate-400 font-normal">/ {total.toLocaleString()}</span>
          </span>
          <div className="w-28 h-1.5 rounded-full bg-purple-100 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all ${remaining <= 5 ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">queries remaining</span>
        </div>

        <button
          onClick={() => navigate('/doctor-dashboard/ai')}
          className="px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 shrink-0 active:scale-95"
        >
          <i className="fas fa-robot text-xs" />
          <span>Open Copilot →</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Numerical Time Parser (Prevents 10:00 AM sorting before 9:00 AM) ─── */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 9999;
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return 9999;
  let [_, hours, minutes, period] = match;
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (period) {
    const p = period.toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
};

/* ─── Main Component ─── */
function DoctorDashboard() {
  const { user } = useAuth();
  const userCurrency = user?.profile?.currency || user?.currency || 'INR';
  const navigate = useNavigate();
  const toast = useToast();
  const { patients, appointments, refillRequests, approveRefill: ctxApproveRefill, rejectRefill: ctxRejectRefill, callNextForDoctor, kycVerified, kycSubmitted, verifyKyc } = useClinicData();

  const capabilities = useMemo(() => getProviderCapabilities(user), [user]);
  const doctorName = capabilities.displayName;
  const todayIso = todayLocalStr();

  const queue = useMemo(() => {
    return appointments
      .filter(a => (!user?.id || a.doctorId === user?.id) && a.date === todayIso && ['Upcoming', 'Waiting', 'In Progress', 'Done'].includes(a.status) && (a.paymentId || a.payment_id || a.status === 'Done'))
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
      .map((a, i) => {
        const patient = patients.find(p => p.id === a.patientId);
        const genderSuffix = patient?.gender ? (patient.gender.toLowerCase().startsWith('f') ? 'F' : patient.gender.toLowerCase().startsWith('m') ? 'M' : '') : '';
        return {
          id: a.id,
          token: a.token || a.queue_token || `T-${String(i + 1).padStart(2, '0')}`,
          name: a.patientName,
          age: patient ? `${patient.age}${genderSuffix}` : '—',
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
      id: r.id, patientId: p.id, patient: p.name, test: r.testName, received: daysAgoLabel(r.date), urgent: r.urgent, results: r.results,
    })));
  }, [patients]);

  const [reviewedLabIds, setReviewedLabIds] = useState([]);
  const visibleLabs = labs.filter(l => !reviewedLabIds.includes(l.id));
  const [selectedRow, setSelectedRow] = useState(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [kycBannerDismissed, setKycBannerDismissed] = useState(() => sessionStorage.getItem('kyc_banner_dismissed') === 'true');
  const [urgentLab, setUrgentLab] = useState(null);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    apiFetch('/billing/summary').then(setEarnings).catch(() => setEarnings(null));
  }, []);

  const currentPatient = queue.find(q => q.status === 'In Progress');
  const nextPatient = queue.find(q => q.status === 'Waiting');

  // Elapsed consultation duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!currentPatient) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPatient?.id]);

  const formatElapsed = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const urgentLabsCount = visibleLabs.filter(l => l.urgent).length;
  const waitingPatientsCount = queue.filter(q => q.status === 'Waiting').length;
  const pendingRefillsCount = refillRequests.length;
  const criticalPatientsWithAlerts = queue.filter(q => q.concern).length;
  const doneWithoutRxCount = queue.filter(q => q.status === 'Done' && (!q.patient?.prescriptions || q.patient.prescriptions.length === 0)).length;
  const totalAttentionCount = urgentLabsCount + pendingRefillsCount + criticalPatientsWithAlerts + (doneWithoutRxCount > 0 && capabilities.canManageRefills ? 1 : 0);

  const callNext = async () => {
    if (!nextPatient) {
      if (currentPatient) {
        try {
          await callNextForDoctor(doctorName);
          toast(`Marked ${currentPatient.name} as done. Queue is now clear!`, 'success');
        } catch (err) {
          toast(err.message || 'Failed to update queue', 'error');
        }
      } else {
        toast(`No waiting ${capabilities.clientLabel.toLowerCase()}s in the queue right now.`, 'info');
      }
      return;
    }

    try {
      await callNextForDoctor(doctorName);
      toast(`Calling next ${capabilities.clientLabel.toLowerCase()}: ${nextPatient.name} (${nextPatient.token})`, 'success');
    } catch (err) {
      toast(err.message || `Failed to call next ${capabilities.clientLabel.toLowerCase()}`, 'error');
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

  const handlePrimaryAction = (patient) => {
    setSelectedRow(null);
    if (capabilities.primaryAction?.route) {
      navigate(capabilities.primaryAction.route);
      toast(`Opening ${capabilities.primaryAction.name} for ${patient.name}.`, 'info');
    } else {
      navigate('/doctor-dashboard/patients');
    }
  };

  /* Doctor profile avatar and initials */
  const [avatarError, setAvatarError] = useState(false);
  const rawAvatarUrl = user?.avatarUrl || user?.avatar_url || user?.profile?.avatar_url || user?.photo;
  useEffect(() => {
    setAvatarError(false);
  }, [rawAvatarUrl]);
  const userAvatarUrl = !avatarError && rawAvatarUrl ? rawAvatarUrl : null;
  const doctorInitials = (capabilities.displayName?.replace('Dr. ', '') || 'Doctor')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DR';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const todayStats = [
    { 
      label: "Today's Schedule", 
      value: queue.length, 
      sub: `${queue.filter(q => q.status !== 'Done' && q.status !== 'No Show').length} remaining`, 
      icon: 'fa-hospital-user', 
      accent: 'text-indigo-600 bg-indigo-50 border-indigo-200/80', 
      onClick: () => navigate('/doctor-dashboard/appointments') 
    },
    capabilities.canReviewLabs
      ? { label: 'Lab Reviews', value: visibleLabs.length, sub: visibleLabs.some(l => l.urgent) ? '⚡ Urgent pending' : 'All reviewed', icon: 'fa-microscope', accent: visibleLabs.some(l => l.urgent) ? 'text-rose-600 bg-rose-50 border-rose-200/80' : 'text-slate-600 bg-slate-50 border-slate-200/80', onClick: () => navigate('/doctor-dashboard/reports') }
      : capabilities.canFormulateDiet
      ? { label: 'Diet Protocols', value: 'Active', sub: 'Clinical meal charts', icon: 'fa-apple-whole', accent: 'text-amber-600 bg-amber-50 border-amber-200/80', onClick: () => navigate('/doctor-dashboard/diet-yoga') }
      : { label: 'Care Protocols', value: 'Active', sub: 'Custom treatment guides', icon: 'fa-heart-circle-check', accent: 'text-amber-600 bg-amber-50 border-amber-200/80', onClick: () => navigate('/doctor-dashboard/diet-yoga') },
    capabilities.canManageRefills
      ? { label: 'Refill Requests', value: refillRequests.length, sub: 'Awaiting approval', icon: 'fa-prescription-bottle-medical', accent: refillRequests.length > 0 ? 'text-amber-600 bg-amber-50 border-amber-200/80' : 'text-slate-600 bg-slate-50 border-slate-200/80', onClick: () => navigate('/doctor-dashboard/prescriptions') }
      : capabilities.canFormulateYoga
      ? { label: 'Movement Protocols', value: 'Active', sub: 'Yoga & posture therapy', icon: 'fa-person-walking', accent: 'text-teal-600 bg-teal-50 border-teal-200/80', onClick: () => navigate('/doctor-dashboard/diet-yoga') }
      : { label: 'Completed Today', value: queue.filter(q => q.status === 'Done').length, sub: 'Finished consultations', icon: 'fa-clipboard-check', accent: 'text-emerald-600 bg-emerald-50 border-emerald-200/80', onClick: () => navigate('/doctor-dashboard/appointments') },
    { 
      label: `Active ${capabilities.clientLabel}s`, 
      value: patients.filter(p => p.status === 'active').length, 
      sub: `${patients.length} total in roster`, 
      icon: 'fa-users', 
      accent: 'text-purple-600 bg-purple-50 border-purple-200/80', 
      onClick: () => navigate('/doctor-dashboard/patients') 
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ═══ DOCTOR HERO AURORA HEADER ═══ */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4338CA 75%, #6366F1 100%)' }}
      >
        {/* Glow orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #818CF8, transparent 70%)' }} />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #C084FC, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #38BDF8, transparent 70%)' }} />
        </div>

        <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Doctor Avatar */}
            <div
              onClick={() => navigate('/doctor-dashboard/profile')}
              className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 backdrop-blur-md flex items-center justify-center text-xl sm:text-2xl shadow-xl cursor-pointer hover:scale-105 hover:border-white transition-all overflow-hidden relative group"
              title="View & Edit Doctor Profile"
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={capabilities.displayName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-black">
                  <span>{doctorInitials}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                <i className="fas fa-camera text-sm drop-shadow" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-mono font-black tracking-widest text-indigo-200/90 uppercase bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                  {capabilities.specialtyLabel || 'Specialist Physician'}
                </span>
                <span className="text-[10px] text-white/60 font-medium">• {todayLabel}</span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Clinic Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm flex items-center gap-2">
                <span>{greeting}, {capabilities.displayName}</span>
                <span className="inline-block">🩺</span>
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/80 mt-0.5 font-medium flex items-center gap-2 flex-wrap">
                <span>
                  <strong className="text-white font-bold">{queue.filter(q => q.status !== 'Done' && q.status !== 'No Show').length}</strong> {capabilities.clientLabel.toLowerCase()}(s) scheduled for today
                </span>
                <span className="text-indigo-300/50 hidden sm:inline">•</span>
                <button
                  onClick={() => navigate('/doctor-dashboard/profile')}
                  className="text-indigo-200 hover:text-white underline text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <i className="fas fa-user-pen text-[10px]" /> Profile &amp; Settings
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs shadow-sm active:scale-95"
              title="Share verified appointment booking link"
            >
              <i className="fas fa-share-nodes text-indigo-200 text-xs" />
              <span>Share Booking Link</span>
            </button>
            <button
              onClick={callNext}
              disabled={!nextPatient && !currentPatient}
              className="flex items-center gap-2 bg-white text-indigo-950 hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-white font-black px-5 py-2.5 rounded-xl transition-all text-xs shadow-md active:scale-95"
            >
              <i className="fas fa-bullhorn text-indigo-600 text-xs" />
              <span>Call Next {nextPatient?.token ? `(${nextPatient.token})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. CLINICAL ATTENTION REQUIRED TRIAGE BAR */}
      {totalAttentionCount > 0 ? (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base flex-shrink-0 shadow-2xs">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                  Clinical Attention Required
                </span>
                <span className="text-xs font-bold text-amber-800">
                  {totalAttentionCount} action item{totalAttentionCount > 1 ? 's' : ''} pending
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Immediate clinical, prescription, or visit sign-off actions waiting on you.
              </p>
            </div>
          </div>

          {/* Action Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {urgentLabsCount > 0 && (
              <button
                onClick={() => {
                  const u = visibleLabs.find(l => l.urgent);
                  if (u) setUrgentLab(u);
                }}
                className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <i className="fas fa-microscope text-rose-600"></i>
                <span>{urgentLabsCount} Urgent Lab Flag{urgentLabsCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {pendingRefillsCount > 0 && (
              <button
                onClick={() => navigate('/doctor-dashboard/prescriptions')}
                className="bg-amber-200/80 hover:bg-amber-300 text-amber-900 border border-amber-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <i className="fas fa-prescription-bottle text-amber-700"></i>
                <span>{pendingRefillsCount} Pending Refill{pendingRefillsCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {doneWithoutRxCount > 0 && capabilities.canManageRefills && (
              <button
                onClick={() => navigate('/doctor-dashboard/prescriptions')}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <i className="fas fa-file-signature text-indigo-700"></i>
                <span>{doneWithoutRxCount} Completed Visit{doneWithoutRxCount > 1 ? 's' : ''} Awaiting Rx</span>
              </button>
            )}

            {criticalPatientsWithAlerts > 0 && (
              <button
                onClick={() => navigate('/doctor-dashboard/appointments')}
                className="bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <i className="fas fa-heart-pulse text-red-600"></i>
                <span>{criticalPatientsWithAlerts} Patient Alert{criticalPatientsWithAlerts > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold">All Clinical Triage Indicators Normal</span>
            <span className="text-emerald-700/80 hidden sm:inline">— No urgent lab flags, pending critical refills, or high vitals alerts in queue.</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full">
            OPD On Schedule
          </span>
        </div>
      )}

      {/* 2. SIDE-BY-SIDE HERO: IN-SESSION & NEXT PATIENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* LEFT: Active In-Session Patient */}
        <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                In Consultation Now
              </span>

              {currentPatient && (
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                  <i className="fas fa-stopwatch text-emerald-600"></i>
                  {formatElapsed(elapsedSeconds)}
                </span>
              )}
            </div>

            {currentPatient ? (
              <div className="pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-black text-aubergine-800 bg-aubergine-50 px-2 py-0.5 rounded border border-aubergine-200 inline-block mb-1">
                      {currentPatient.token}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {currentPatient.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentPatient.age ? `${currentPatient.age} yrs · ` : ''}{currentPatient.type || 'General OPD Consultation'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-500 block">Slot</span>
                    <span className="text-xs font-bold font-mono text-slate-800">{currentPatient.time}</span>
                  </div>
                </div>

                {/* Vitals or Clinical Alerts */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {currentPatient.vital && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <i className="fas fa-heart-pulse text-slate-500"></i>
                      BP: {currentPatient.vital}
                    </span>
                  )}
                  {currentPatient.concern && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                      <i className="fas fa-triangle-exclamation text-rose-500"></i>
                      {currentPatient.concern}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                  <i className="fas fa-door-open"></i>
                </div>
                <h3 className="text-sm font-bold text-slate-800">Consultation Room Empty</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
                  No patient currently in session. Ready to begin next consultation.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2.5">
            {currentPatient ? (
              <>
                <button
                  onClick={() => navigate(`/doctor-dashboard/telemedicine?startCall=${currentPatient.id}`)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <i className="fas fa-video"></i>
                  <span>Join Video Room</span>
                </button>
                <button
                  onClick={() => setSelectedRow(currentPatient)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <i className="fas fa-file-medical text-aubergine-700"></i>
                  <span>EMR Chart</span>
                </button>
                <button
                  onClick={callNext}
                  className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                  title="Finish session and advance queue"
                >
                  <i className="fas fa-check"></i>
                  <span className="hidden sm:inline">Finish</span>
                </button>
              </>
            ) : nextPatient ? (
              <button
                onClick={callNext}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <i className="fas fa-bullhorn"></i>
                <span>Call Next: {nextPatient.name} ({nextPatient.token})</span>
              </button>
            ) : (
              <div className="w-full text-center py-1 text-xs font-bold text-slate-400">
                Queue Clear · No Pending Patients
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Next Patient In Line */}
        <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-amber-400 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase">
                <i className="fas fa-user-clock text-amber-600"></i>
                Next Up In Queue
              </span>

              {nextPatient && (
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Scheduled: {nextPatient.time}
                </span>
              )}
            </div>

            {nextPatient ? (
              <div className="pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mb-1">
                      {nextPatient.token}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {nextPatient.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {nextPatient.age ? `${nextPatient.age} yrs · ` : ''}{nextPatient.type || 'Scheduled Consultation'}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Checked In · Waiting
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    <i className="fas fa-circle-info text-slate-400 mr-1"></i>
                    Patient notified & waiting in virtual waiting room.
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                  <i className="fas fa-clipboard-check"></i>
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Patients Waiting</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
                  The OPD queue is clear. New check-ins will appear here immediately.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2.5">
            {nextPatient ? (
              <>
                <button
                  onClick={callNext}
                  className="flex-1 bg-aubergine-800 hover:bg-aubergine-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <i className="fas fa-door-open"></i>
                  <span>Call Into Room</span>
                </button>
                <button
                  onClick={() => setSelectedRow(nextPatient)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <i className="fas fa-file-lines text-slate-500"></i>
                  <span>Preview File</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/doctor-dashboard/appointments')}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <i className="fas fa-calendar-days text-slate-500"></i>
                <span>View Full Schedule</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. UNIFIED CLINICAL METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {todayStats.map(stat => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-aubergine-300 shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.accent}`}>
                <i className={`fas ${stat.icon} text-sm`}></i>
              </div>
              <i className="fas fa-arrow-right text-[10px] text-slate-300"></i>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">{stat.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Clinical Assistant Discovery Card */}
      <AiDashboardCard navigate={navigate} />

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
          
          {/* Patient Referral & Direct Booking Card */}
          <div className="bg-gradient-to-br from-aubergine-900 via-slate-900 to-aubergine-950 text-white rounded-3xl p-5 shadow-lg border border-aubergine-500/30 relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Direct Patient Booking Link
              </span>
              <i className="fas fa-qrcode text-aubergine-300 text-sm"></i>
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-white">Share Your Clinical Profile</h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Send your dedicated link or QR code to patients for direct video bookings.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex-1 bg-aubergine-600 hover:bg-aubergine-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <i className="fas fa-share-nodes text-xs"></i> Share &amp; QR Poster
              </button>
              <button
                onClick={() => {
                  const docId = user?.id || (user?.name ? user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sarah-mitchell');
                  const url = `${window.location.origin}/dr/${docId}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast('Direct booking link copied to clipboard!', 'success');
                  });
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                title="Copy direct booking link"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>

          <PracticePerformanceCard earnings={earnings} navigate={navigate} queue={queue} userCurrency={userCurrency} />
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
      <DoctorShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} doctor={user} />
      <PatientFileModal row={selectedRow} onClose={() => setSelectedRow(null)} onPrimaryAction={handlePrimaryAction} capabilities={capabilities} />
      <KYCModal isOpen={showKycModal} onClose={() => setShowKycModal(false)} toast={toast} onVerify={verifyKyc} />
      <UrgentLabModal lab={urgentLab} onClose={handleUrgentLabClose} toast={toast} doctorName={user?.name} />
    </div>
  );
}

export default DoctorDashboard;
