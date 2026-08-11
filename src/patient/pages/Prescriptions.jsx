import React, { useState, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { DoseSchedule, parseDoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge, resolveRxStatus, daysUntil } from '../../components/RxStatus.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';

const STATUS_TABS = ['All', 'Active', 'Expiring Soon', 'Completed', 'Expired'];

// Attention-worthy statuses surface first so the list is actually scannable
// once a patient has more than a couple of prescriptions on file.
const STATUS_PRIORITY = { 'Expiring Soon': 0, Active: 1, Completed: 2, Expired: 3 };

const STATUS_CARD_STYLE = {
  Active:          'bg-aubergine-100 text-aubergine-700',
  'Expiring Soon': 'bg-amber-100 text-amber-700',
  Expired:         'bg-slate-200 text-slate-500',
  Completed:       'bg-slate-200 text-slate-500',
};

/** The backend stores one row per medication line — each becomes its own
 * card here (medicines is a 1-item array) rather than a fabricated bundle. */
function toRxCards(myPatient) {
  if (!myPatient) return [];
  return myPatient.meds.map(m => ({
    id: m.id,
    doctor: m.doctor || 'Your Doctor',
    date: m.prescribedOn,
    diagnosis: myPatient.diagnosis && myPatient.diagnosis !== 'Pending' ? myPatient.diagnosis : 'General',
    status: m.refillsLeft > 0 ? 'Active' : 'Expired',
    validTill: m.validTill,
    medicines: [{ name: m.name, schedule: m.frequency, duration: m.duration, refills: m.refillsLeft }],
    instructions: m.instructions,
    refillRequested: m.refillRequested,
  }));
}

const DOSE_SLOT_DEFS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

/* ─── Prescription Detail Modal ─────────────── */
function PrescriptionModal({ rx, onClose }) {
  if (!rx) return null;
  const daysLeft = daysUntil(rx.validTill);
  const effectiveStatus = resolveRxStatus(rx);
  return (
    <Modal isOpen={!!rx} onClose={onClose} title={`Prescription — ${rx.diagnosis}`} size="lg">
      <div className="space-y-5">
        {/* Header info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500 font-bold mb-1">Prescribed By</p>
            <p className="font-bold text-slate-800">{rx.doctor}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500 font-bold mb-1">Date • Valid Till</p>
            <p className="font-bold text-slate-800">{rx.date} → {rx.validTill}</p>
            {effectiveStatus === 'Expiring Soon' && daysLeft !== null && (
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">
                {daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
              </p>
            )}
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
                    <p className="text-xs text-slate-500 mt-1.5">Duration: {m.duration}</p>
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
// Delivery method / urgency were previously collected here but had nowhere
// to go — prescriptions has no such columns and requestRefill() sends no
// body at all, so those choices were silently discarded while the success
// toast falsely confirmed them. Simplified to what the backend actually
// supports: a plain refill request.
function RefillModal({ rx, onClose, onSubmit, submitting }) {
  if (!rx) return null;
  return (
    <Modal isOpen={!!rx} onClose={onClose} title="Request Refill" size="sm">
      <div className="space-y-4">
        <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-sm">
          <p className="font-bold text-slate-800">{rx.diagnosis}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rx.medicines.map(m => m.name).join(', ')}</p>
        </div>
        <p className="text-xs text-slate-500">Your doctor will review this request and approve or decline it from their dashboard.</p>
        <button onClick={onSubmit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i> {submitting ? 'Submitting…' : 'Submit Refill Request'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientPrescriptions() {
  const toast = useToast();
  const { patients, requestRefill, lifestyleLogs } = useClinicData();
  const prescriptions = useMemo(() => toRxCards(patients[0]), [patients]);
  const [detailRx, setDetailRx] = useState(null);
  const [refillRx, setRefillRx] = useState(null);
  const [submittingRefill, setSubmittingRefill] = useState(false);
  const [tab, setTab] = useState('All');

  const tabFiltered = prescriptions
    .filter(rx => tab === 'All' || resolveRxStatus(rx) === tab)
    .sort((a, b) => {
      const diff = (STATUS_PRIORITY[resolveRxStatus(a)] ?? 4) - (STATUS_PRIORITY[resolveRxStatus(b)] ?? 4);
      return diff !== 0 ? diff : new Date(b.date) - new Date(a.date);
    });
  const tabCount = (t) => prescriptions.filter(rx => t === 'All' || resolveRxStatus(rx) === t).length;

  const handleRefillSubmit = async () => {
    setSubmittingRefill(true);
    try {
      await requestRefill(refillRx.id);
      toast('Refill requested. Your doctor will review it shortly.', 'success');
      setRefillRx(null);
    } catch (err) {
      toast(err.message || 'Failed to request refill', 'error');
    } finally {
      setSubmittingRefill(false);
    }
  };

  // No file storage or PDF generation exists on the backend for
  // prescriptions — being upfront about that instead of pretending a
  // download is happening.
  const handleDownload = () => toast('Prescription downloads are coming soon.', 'info');
  const handleShare = () => toast('Sharing prescriptions is coming soon.', 'info');

  // Real per-medicine dosing times, parsed from each active prescription's
  // schedule — replaces a previous card that showed two fixed medicine names
  // ("Myo-Inositol", "Metformin") that had nothing to do with this patient's
  // actual prescriptions.
  const doseSlots = useMemo(() => {
    const bySlot = { morning: [], afternoon: [], night: [] };
    prescriptions.filter(rx => resolveRxStatus(rx) === 'Active').forEach(rx => {
      rx.medicines.forEach(m => {
        const parsed = parseDoseSchedule(m.schedule);
        if (!parsed) return;
        DOSE_SLOT_DEFS.forEach((slot, i) => {
          if (parsed.doses[i] > 0) bySlot[slot.key].push(m.name);
        });
      });
    });
    return DOSE_SLOT_DEFS.map(s => ({ ...s, meds: bySlot[s.key] })).filter(s => s.meds.length > 0);
  }, [prescriptions]);

  // Real rolling 7-day adherence, read from the same daily "Took my
  // medicines" checkbox the Tracking page writes to — replaces a
  // permanently-hardcoded "71%" bar chart.
  const weekAdherence = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), taken: !!lifestyleLogs[key]?.items?.meds, logged: !!lifestyleLogs[key] };
    });
    const pct = Math.round((days.filter(d => d.taken).length / days.length) * 100);
    return { days, pct };
  }, [lifestyleLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">My Prescriptions</h1>
          <p className="text-sm text-slate-500">View your prescriptions, track dosing, and request refills.</p>
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
            {t} <span className={tab === t ? 'text-aubergine-200' : 'text-slate-500'}>({tabCount(t)})</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Prescription Cards */}
        <div className="lg:col-span-2 space-y-5">
          {tabFiltered.map(rx => {
            const effectiveStatus = resolveRxStatus(rx);
            const canRefill = effectiveStatus === 'Active' || effectiveStatus === 'Expiring Soon';
            const daysLeft = daysUntil(rx.validTill);
            return (
              <div key={rx.id} className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden hover:shadow-card-hover transition-shadow">
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${STATUS_CARD_STYLE[effectiveStatus] || STATUS_CARD_STYLE.Expired}`}>
                      <i className="fas fa-file-prescription text-lg"></i>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800">{rx.diagnosis}</h3>
                      <p className="text-xs text-slate-500">{rx.doctor} • {rx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <RxStatusBadge rx={rx} />
                    {effectiveStatus === 'Expiring Soon' && daysLeft !== null && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1">
                        {daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                      </p>
                    )}
                  </div>
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
                            <div className="text-xs text-slate-500 mt-1">{m.duration}</div>
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
                      <button onClick={handleDownload}
                        className="bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-aubergine-200 flex items-center gap-1.5">
                        <i className="fas fa-download"></i> PDF
                      </button>
                      <button onClick={handleShare}
                        className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-sky-200 flex items-center gap-1.5">
                        <i className="fas fa-share-nodes"></i> Share
                      </button>
                      {canRefill && rx.refillRequested && (
                        <span className="bg-amber-50 text-amber-700 font-bold px-4 py-2 rounded-xl text-sm border border-amber-200 flex items-center gap-1.5">
                          <i className="fas fa-clock"></i> Refill Requested
                        </span>
                      )}
                      {canRefill && !rx.refillRequested && (
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
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No prescriptions in this category.
            </div>
          )}

          {prescriptions.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-12 text-center">
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

        {/* Sidebar — real dosing schedule + adherence, no fabricated data */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-aubergine-900 to-indigo-900 rounded-2xl shadow-sm border border-aubergine-800 p-6 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl mb-4">
              <i className="fas fa-clock"></i>
            </div>
            <h3 className="font-bold text-lg mb-1.5">Daily Dosing Schedule</h3>
            <p className="text-aubergine-200 text-xs mb-5 leading-relaxed">When to take your active medications, from your prescriptions.</p>

            {doseSlots.length === 0 ? (
              <p className="text-aubergine-200 text-xs">No timed dosing schedule on your active prescriptions yet.</p>
            ) : (
              <div className="space-y-3">
                {doseSlots.map(slot => (
                  <div key={slot.key} className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                    <div className="text-sm font-bold mb-1">{slot.label}</div>
                    <div className="text-aubergine-200 text-xs">{slot.meds.join(', ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adherence card — real rolling 7-day data from the daily lifestyle
              checklist's "Took my medicines" entry (Tracking page). */}
          {prescriptions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card">
              <h4 className="font-bold text-slate-800 mb-3">This Week's Medicine Adherence</h4>
              <div className="flex gap-1 mb-3">
                {weekAdherence.days.map(d => (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full aspect-square rounded-md text-[8px] flex items-center justify-center font-bold ${d.taken ? 'bg-emerald-500 text-white' : d.logged ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                      {d.taken ? '✓' : d.logged ? '✕' : '·'}
                    </div>
                    <span className="text-[9px] text-slate-500">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                <span className="font-black text-emerald-600">{weekAdherence.pct}%</span> adherence this week, based on your daily health checklist.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PrescriptionModal rx={detailRx} onClose={() => setDetailRx(null)} />
      <RefillModal rx={refillRx} onClose={() => setRefillRx(null)} onSubmit={handleRefillSubmit} submitting={submittingRefill} />
    </div>
  );
}

export default PatientPrescriptions;
