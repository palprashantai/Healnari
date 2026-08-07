import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { DoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge, resolveRxStatus } from '../../components/RxStatus.jsx';

/* ─── Dummy Data ─────────────────────────────── */
const INITIAL_PRESCRIPTIONS = [
  {
    id: 'RX-894',
    doctor: 'Dr. Sarah Mitchell',
    date: '25 Jun 2026',
    diagnosis: 'PCOS Management',
    status: 'Active',
    validTill: '25 Dec 2026',
    medicines: [
      { name: 'Metformin 500mg', schedule: '1-0-1 (After Meals)', duration: '30 Days', refills: 2 },
      { name: 'Myo-Inositol Sachet', schedule: '1-0-0 (Morning, Empty Stomach)', duration: '30 Days', refills: 2 },
    ],
    instructions: 'Monitor fasting blood glucose weekly. Avoid high-GI foods. Combine with 30-min daily exercise.',
  },
  {
    id: 'RX-861',
    doctor: 'Dr. Sarah Mitchell',
    date: '30 Jul 2026',
    diagnosis: 'Endometriosis Gr.2',
    status: 'Active',
    validTill: '18 Aug 2026',
    medicines: [
      { name: 'Dienogest 2mg', schedule: '1-0-0 (Daily)', duration: '6 Months', refills: 0 },
    ],
    instructions: 'Monitor for breakthrough bleeding. Return immediately if pain exceeds 8/10.',
  },
  {
    id: 'RX-742',
    doctor: 'Dr. Anita Sharma',
    date: '20 Feb 2026',
    diagnosis: 'Vitamin D Deficiency',
    status: 'Completed',
    validTill: '20 Apr 2026',
    medicines: [
      { name: 'Cholecalciferol 60K IU', schedule: '1-0-0 (Once a week)', duration: '8 Weeks', refills: 0 },
    ],
    instructions: 'Take with full glass of milk or milk product. Sun exposure 15–20 mins recommended daily.',
  },
];

const STATUS_TABS = ['All', 'Active', 'Expiring Soon', 'Completed', 'Expired'];

const REMINDER_SLOTS = [
  { id: 'morning', label: 'Morning Meds', time: '8:00 AM', meds: ['Myo-Inositol Sachet'] },
  { id: 'evening', label: 'Evening Meds', time: '8:00 PM', meds: ['Metformin 500mg (Night)'] },
];

/* ─── Prescription Detail Modal ─────────────── */
function PrescriptionModal({ rx, onClose }) {
  if (!rx) return null;
  return (
    <Modal isOpen={!!rx} onClose={onClose} title={`Prescription — ${rx.id}`} size="lg">
      <div className="space-y-5">
        {/* Header info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-400 font-bold mb-1">Prescribed By</p>
            <p className="font-bold text-slate-800">{rx.doctor}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-400 font-bold mb-1">Date • Valid Till</p>
            <p className="font-bold text-slate-800">{rx.date} → {rx.validTill}</p>
          </div>
        </div>

        <RxStatusBadge rx={rx} />

        {/* Medicines */}
        <div>
          <h4 className="font-bold text-slate-700 text-sm mb-2">Prescribed Medicines</h4>
          <div className="space-y-2">
            {rx.medicines.map((m, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-800 mb-1.5">{m.name}</p>
                    <DoseSchedule schedule={m.schedule} />
                    <p className="text-xs text-slate-400 mt-1.5">Duration: {m.duration}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${m.refills > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {m.refills > 0 ? `${m.refills} Refills Left` : 'No Refills Left'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-black text-amber-800 mb-1.5 uppercase tracking-wide flex items-center gap-1.5"><i className="fas fa-circle-info"></i> Doctor's Instructions</p>
          <p className="text-xs text-amber-900 leading-relaxed">{rx.instructions}</p>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Refill Modal ────────────────────────────── */
function RefillModal({ rx, onClose, onSubmit }) {
  const [pharmacy, setPharmacy] = useState('Home Delivery');
  const [urgent, setUrgent] = useState(false);

  if (!rx) return null;
  return (
    <Modal isOpen={!!rx} onClose={onClose} title="Request Refill" size="sm">
      <div className="space-y-4">
        <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-sm">
          <p className="font-bold text-slate-800">{rx.diagnosis}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rx.medicines.map(m => m.name).join(', ')}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Delivery Method</label>
          <div className="space-y-2">
            {['Home Delivery', 'Clinic Pickup', 'Nearby Pharmacy'].map(opt => (
              <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pharmacy === opt ? 'border-aubergine-400 bg-aubergine-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="pharmacy" checked={pharmacy === opt} onChange={() => setPharmacy(opt)} className="accent-aubergine-600" />
                <span className="text-sm font-semibold text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} className="accent-rose-600 w-4 h-4" />
          <span className="text-sm font-semibold text-slate-700">Mark as Urgent (24h processing)</span>
        </label>
        <button onClick={() => onSubmit(pharmacy, urgent)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          Submit Refill Request
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientPrescriptions() {
  const toast = useToast();
  const [prescriptions, setPrescriptions] = useState(INITIAL_PRESCRIPTIONS);
  const [detailRx, setDetailRx] = useState(null);
  const [refillRx, setRefillRx] = useState(null);
  const [reminders, setReminders] = useState({ morning: true, evening: false });
  const [tab, setTab] = useState('All');

  const tabFiltered = prescriptions.filter(rx => tab === 'All' || resolveRxStatus(rx) === tab);
  const tabCount = (t) => prescriptions.filter(rx => t === 'All' || resolveRxStatus(rx) === t).length;

  const handleRefillSubmit = (pharmacy, urgent) => {
    toast(`Refill requested via ${pharmacy}${urgent ? ' (Urgent)' : ''}. Expected in ${urgent ? '24h' : '2–3 days'}.`, 'success');
    setRefillRx(null);
  };

  const toggleReminder = (id) => {
    setReminders(p => {
      const next = { ...p, [id]: !p[id] };
      toast(next[id] ? `Reminder set for ${REMINDER_SLOTS.find(r => r.id === id)?.time}` : 'Reminder disabled', next[id] ? 'success' : 'info');
      return next;
    });
  };

  const handleDownload = (rx) => {
    toast(`Downloading ${rx.id} — ${rx.diagnosis}.pdf...`, 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">My Prescriptions</h1>
          <p className="text-sm text-slate-500">Access and download your digital prescriptions.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-700 text-xs font-bold">
          <i className="fas fa-shield-halved"></i> Digitally Signed
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors ${tab === t ? 'bg-aubergine-700 text-white border-aubergine-700' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
            {t} <span className={tab === t ? 'text-aubergine-200' : 'text-slate-400'}>({tabCount(t)})</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Prescription Cards */}
        <div className="lg:col-span-2 space-y-5">
          {tabFiltered.map(rx => {
            const effectiveStatus = resolveRxStatus(rx);
            const canRefill = effectiveStatus === 'Active' || effectiveStatus === 'Expiring Soon';
            return (
              <div key={rx.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${effectiveStatus === 'Active' ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>
                      <i className="fas fa-file-prescription text-lg"></i>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800">{rx.diagnosis}</h3>
                      <p className="text-xs text-slate-500">{rx.doctor} • {rx.date}</p>
                    </div>
                  </div>
                  <RxStatusBadge rx={rx} />
                </div>

                {/* Medicines */}
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {rx.medicines.map((m, i) => (
                      <div key={i} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-800 text-sm mb-1">{m.name}</div>
                            <DoseSchedule schedule={m.schedule} />
                            <div className="text-xs text-slate-400 mt-1">{m.duration}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${m.refills > 0 ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {m.refills > 0 ? `${m.refills}×` : 'None left'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-100 pt-4">
                    <button onClick={() => setDetailRx(rx)}
                      className="text-sm font-bold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5">
                      <i className="fas fa-eye"></i> View Details
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleDownload(rx)}
                        className="bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-aubergine-200 flex items-center gap-1.5">
                        <i className="fas fa-download"></i> PDF
                      </button>
                      <button onClick={() => handleDownload({ ...rx, id: rx.id + '-SHARE' })}
                        className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-sky-200 flex items-center gap-1.5">
                        <i className="fas fa-share-nodes"></i> Share
                      </button>
                      {canRefill && (
                        <button onClick={() => setRefillRx(rx)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-emerald-200 flex items-center gap-1.5">
                          <i className="fas fa-pills"></i> Request Refill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {tabFiltered.length === 0 && prescriptions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
              No prescriptions in this category.
            </div>
          )}

          {prescriptions.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                <i className="fas fa-file-prescription text-4xl text-slate-300"></i>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">No Active Prescriptions</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                You do not have any active medication records. Any new prescriptions issued by your doctor will automatically appear here.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — Reminders */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-aubergine-900 to-indigo-900 rounded-2xl shadow-sm border border-aubergine-800 p-6 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl mb-4">
              <i className="fas fa-bell"></i>
            </div>
            <h3 className="font-bold text-lg mb-1.5">Medicine Reminders</h3>
            <p className="text-aubergine-200 text-xs mb-5 leading-relaxed">Never miss a dose. Toggle reminders for each scheduled time.</p>

            <div className="space-y-3">
              {REMINDER_SLOTS.map(slot => (
                <div key={slot.id} className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-bold">{slot.label}</div>
                    <button onClick={() => toggleReminder(slot.id)}
                      className={`w-11 h-6 rounded-full relative transition-all border ${reminders[slot.id] ? 'bg-emerald-500 border-emerald-400' : 'bg-white/20 border-white/20'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${reminders[slot.id] ? 'right-1' : 'left-1 opacity-50'}`}></div>
                    </button>
                  </div>
                  <div className="text-aubergine-200 text-xs">{slot.time} • {slot.meds.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Adherence card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-3">This Week's Adherence</h4>
            <div className="flex gap-1 mb-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full aspect-square rounded-md text-[8px] flex items-center justify-center font-bold ${i < 4 ? 'bg-emerald-500 text-white' : i === 4 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {i < 4 ? '✓' : i === 4 ? '~' : '·'}
                  </div>
                  <span className="text-[9px] text-slate-400">{d}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              <span className="font-black text-emerald-600">71%</span> adherence this week. Keep it up!
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrescriptionModal rx={detailRx} onClose={() => setDetailRx(null)} />
      <RefillModal rx={refillRx} onClose={() => setRefillRx(null)} onSubmit={handleRefillSubmit} />
    </div>
  );
}

export default PatientPrescriptions;
