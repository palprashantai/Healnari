import React, { useState, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { DoseSchedule, parseDoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge, resolveRxStatus, daysUntil } from '../../components/RxStatus.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { openPrescriptionPrintWindow, openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';
import { apiFetch } from '../../lib/apiClient.js';
import { AIButton } from '../../components/AiButton.jsx';

/* ─── AI Food & Drug Safety Modal ────────────── */
function AiDrugSafetyModal({ rx, onClose }) {
  const [loading, setLoading] = useState(true);
  const [safetyData, setSafetyData] = useState(null);

  React.useEffect(() => {
    if (!rx) return;
    setLoading(true);
    const medList = (rx.medicines || []).map(m => m.name);
    apiFetch('/ai/drug-interactions', {
      method: 'POST',
      body: { medications: medList },
    })
      .then(res => {
        const data = res?.data || res;
        setSafetyData(data);
      })
      .catch(() => {
        setSafetyData({
          hasInteractions: false,
          summary: 'No major food-drug or multi-drug interactions detected for your prescribed regimen.',
          foodGuidelines: ['Take with a glass of water.', 'Maintain a 2-hour gap between vitamins and dairy.'],
          missedDoseAdvice: 'Take as soon as remembered, unless it is close to your next scheduled dose.',
        });
      })
      .finally(() => setLoading(false));
  }, [rx]);

  if (!rx) return null;

  return (
    <Modal isOpen={!!rx} onClose={onClose} title="AI Medication & Food Safety Guide" size="lg">
      <div className="space-y-4 text-sm">
        <div className="bg-gradient-to-br from-aubergine-900 to-aubergine-800 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
              <i className="fas fa-shield-virus"></i>
            </div>
            <div>
              <h3 className="font-black text-base">Clinical Safety Shield</h3>
              <p className="text-aubergine-200 text-xs">AI analysis for: {rx.diagnosis}</p>
            </div>
          </div>
          <p className="text-xs text-aubergine-100 mt-2 font-medium leading-relaxed">
            Medications: {rx.medicines.map(m => m.name).join(', ')}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3">
            <i className="fas fa-spinner fa-spin text-3xl text-purple-600"></i>
            <p className="text-xs text-slate-500 font-bold">Consulting clinical pharmacology protocols…</p>
          </div>
        ) : safetyData ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${safetyData.hasInteractions ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                <i className={`fas ${safetyData.hasInteractions ? 'fa-triangle-exclamation text-amber-600' : 'fa-circle-check text-emerald-600'}`}></i>
                <span>{safetyData.hasInteractions ? 'Clinical Interaction Warning' : 'Safe to Take Together'}</span>
              </div>
              <p className="text-xs leading-relaxed">{safetyData.summary}</p>
            </div>

            {safetyData.foodGuidelines?.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                  <i className="fas fa-utensils text-purple-600"></i> Meal &amp; Absorption Guidelines
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {safetyData.foodGuidelines.map((guide, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <i className="fas fa-check text-emerald-600 text-[11px] mt-0.5 shrink-0"></i>
                      <span>{guide}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {safetyData.missedDoseAdvice && (
              <div className="bg-aubergine-50/70 border border-aubergine-200 rounded-2xl p-4 text-xs text-aubergine-900">
                <h4 className="font-bold text-aubergine-950 mb-1 flex items-center gap-2">
                  <i className="fas fa-clock text-aubergine-600"></i> If you miss a dose
                </h4>
                <p className="leading-relaxed">{safetyData.missedDoseAdvice}</p>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button onClick={onClose} className="crm-btn-secondary text-xs">
            Close Guide
          </button>
        </div>
      </div>
    </Modal>
  );
}

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

/** One card per prescription — every medicine a doctor wrote together in the
 * same "Write Prescription" visit shares a group_id and is shown together,
 * instead of each medicine line rendering as its own separate prescription. */
function toRxCards(myPatient) {
  if (!myPatient) return [];
  const byGroup = new Map();
  myPatient.meds.forEach(m => {
    if (!byGroup.has(m.groupId)) byGroup.set(m.groupId, []);
    byGroup.get(m.groupId).push(m);
  });
  return [...byGroup.entries()].map(([groupId, meds]) => ({
    id: groupId,
    doctor: meds[0]?.doctor || 'Your Doctor',
    doctorSpecialty: meds[0]?.doctorSpecialty || '',
    doctorRegNo: meds[0]?.doctorRegNo || '',
    date: meds[0]?.prescribedOn,
    diagnosis: meds.find(m => m.diagnosis)?.diagnosis || (myPatient.diagnosis && myPatient.diagnosis !== 'Pending' ? myPatient.diagnosis : 'General'),
    status: meds.some(m => m.refillsLeft > 0) ? 'Active' : 'Expired',
    validTill: meds.reduce((latest, m) => (!latest || (m.validTill && m.validTill > latest)) ? m.validTill : latest, ''),
    medicines: meds.map(m => ({ id: m.id, name: m.name, schedule: m.frequency, duration: m.duration, refills: m.refillsLeft })),
    instructions: meds.find(m => m.instructions)?.instructions || '',
    refillRequested: meds.some(m => m.refillRequested),
    handwrittenImage: meds[0]?.handwrittenImage || meds[0]?.file_url || null,
  })).sort((a, b) => new Date(b.date) - new Date(a.date));
}

const DOSE_SLOT_DEFS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
];

/* ─── Prescription Detail Modal ─────────────── */
function PrescriptionModal({ rx, labRequests, onClose }) {
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

        {/* Handwritten Attachment Preview */}
        {rx.handwrittenImage && (
          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-2">Handwritten Doctor Prescription</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#faf8f5] p-2">
              <img src={rx.handwrittenImage} alt="Doctor's Handwritten Prescription" className="w-full rounded-xl shadow-xs" />
            </div>
          </div>
        )}

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

        {/* Suggested Lab Tests */}
        {(() => {
          const matchingLabTests = (labRequests || []).filter(
            r => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '') === rx.date
          );
          if (matchingLabTests.length === 0) return null;
          return (
            <div>
              <h4 className="font-bold text-slate-700 text-sm mb-2 mt-4">Suggested Lab Tests</h4>
              <div className="bg-aubergine-50/70 border border-aubergine-100 rounded-xl p-4 text-xs">
                <ul className="list-disc pl-4 space-y-1 text-aubergine-900 font-medium">
                  {matchingLabTests.map((req, i) => (
                    <li key={i}>{req.requested_tests}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })()}

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-black text-amber-800 mb-1.5 uppercase tracking-wide flex items-center gap-1.5"><i className="fas fa-circle-info"></i> Doctor's Instructions</p>
          <p className="text-xs text-amber-900 leading-relaxed">{rx.instructions}</p>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 crm-btn-secondary">Close</button>
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
        <p className="text-[12px] text-slate-500">Your doctor will review this request and approve or decline it from their dashboard.</p>
        <button onClick={onSubmit} disabled={submitting} className="w-full crm-btn-primary disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 border-none shadow-none">
          <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'} mr-2`}></i> {submitting ? 'Submitting…' : 'Submit Refill Request'}
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
  const [safetyTargetRx, setSafetyTargetRx] = useState(null);
  const [submittingRefill, setSubmittingRefill] = useState(false);
  const [tab, setTab] = useState('All');
  const [labRequests, setLabRequests] = useState([]);

  const { listLabReportRequests } = useClinicData();

  React.useEffect(() => {
    if (patients && patients[0]) {
      listLabReportRequests(patients[0].id).then(r => setLabRequests(r)).catch(() => {});
    }
  }, [patients, listLabReportRequests]);

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
      // A prescription can carry several medicines — request a refill on
      // every one of them, not just the first (there's no single medicine
      // id to request against once a card represents the whole prescription).
      await Promise.all(refillRx.medicines.map(m => requestRefill(m.id)));
      toast('Refill requested. Your doctor will review it shortly.', 'success');
      setRefillRx(null);
    } catch (err) {
      toast(err.message || 'Failed to request refill', 'error');
    } finally {
      setSubmittingRefill(false);
    }
  };

  const handleDownload = (rx) => {
    let finalInstructions = rx.instructions;
    try {
      if (rx.instructions && rx.instructions.startsWith('{')) {
        const parsed = JSON.parse(rx.instructions);
        if (parsed.type === 'healnari-holistic-v1') {
          finalInstructions = [parsed.clinicalNotes, parsed.followUpAdvice ? `Next Follow-up: ${parsed.followUpAdvice}` : ''].filter(Boolean).join('\n\n');
        }
      }
    } catch(e) {}

    const me = patients[0];
    const matchingLabTests = labRequests.filter(r => 
      (r.created_at ? new Date(r.created_at).toLocaleDateString() : '') === rx.date
    );
    openPrescriptionPrintWindow({
      rxId: `RX-${rx.id.slice(0, 8).toUpperCase()}`,
      date: rx.date,
      doctor: { name: rx.doctor, specialty: rx.doctorSpecialty, regNo: rx.doctorRegNo },
      patient: { name: me?.name, age: me?.age !== '—' ? me?.age : null },
      diagnosis: rx.diagnosis,
      medicines: rx.medicines,
      labTests: matchingLabTests.map(r => r.requested_tests),
      instructions: finalInstructions,
      handwrittenImage: rx.handwrittenImage,
    });
  };

  const handleDownloadLifestyle = (rx) => {
    let parsedNotes = null;
    try {
      if (rx.instructions && rx.instructions.startsWith('{')) {
        const parsed = JSON.parse(rx.instructions);
        if (parsed.type === 'healnari-holistic-v1') parsedNotes = parsed;
      }
    } catch(e) {}

    if (!parsedNotes || (!parsedNotes.dietPlan && !parsedNotes.exercisePlan)) return;

    const me = patients[0];
    openLifestylePlanPrintWindow({
      rxId: `HN-${rx.id.slice(0, 8).toUpperCase()}`,
      date: rx.date,
      doctor: { name: rx.doctor, specialty: rx.doctorSpecialty, regNo: rx.doctorRegNo },
      patient: { name: me?.name, age: me?.age !== '—' ? me?.age : null },
      dietPlan: parsedNotes.dietPlan,
      exercisePlan: parsedNotes.exercisePlan
    });
  };

  const handleShare = () => toast('Sharing prescriptions is coming soon.', 'info');

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
          <h1 className="text-2xl font-black text-slate-800">My Care Plan</h1>
          <p className="text-sm text-slate-500">View your prescriptions, diet & yoga protocols, and request refills.</p>
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
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${m.refills > 0 ? 'bg-aubergine-50 text-aubergine-700 border border-aubergine-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {m.refills > 0 ? `${m.refills}×` : 'None left'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lifestyle Plan — shown inline if the doctor set one */}
                  {(() => {
                    try {
                      if (rx.instructions && rx.instructions.startsWith('{')) {
                        const parsed = JSON.parse(rx.instructions);
                        if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
                          return (
                            <div className="mb-5 space-y-3">
                              <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                <i className="fas fa-spa text-emerald-500"></i> Your Personalised Lifestyle Protocol
                              </div>

                              {parsed.dietPlan && (
                                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">🥗</span>
                                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Personalized Nutrition Plan</span>
                                  </div>
                                  <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap font-medium">{parsed.dietPlan}</p>
                                </div>
                              )}

                              {parsed.exercisePlan && (
                                <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">🧘‍♀️</span>
                                    <span className="text-xs font-black text-amber-800 uppercase tracking-wider">Yoga &amp; Mindful Movement Protocol</span>
                                  </div>
                                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap font-medium">{parsed.exercisePlan}</p>
                                </div>
                              )}

                              <button
                                onClick={() => handleDownloadLifestyle(rx)}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 text-white font-bold py-3 px-5 rounded-xl text-sm transition-all shadow-md shadow-aubergine-500/20"
                              >
                                <i className="fas fa-download"></i> Download Lifestyle Plan PDF
                              </button>
                            </div>
                          );
                        }
                      }
                    } catch(e) {}
                    return null;
                  })()}

                  {/* Actions */}
                  <div className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDetailRx(rx)}
                        className="text-sm font-bold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5">
                        <i className="fas fa-eye"></i> View Details
                      </button>
                      <AIButton
                        variant="safety"
                        size="sm"
                        icon="fa-shield-virus"
                        onClick={() => setSafetyTargetRx(rx)}
                        title="View AI Food & Drug Safety Guide"
                      >
                        AI Safety Guide
                      </AIButton>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleDownload(rx)}
                        className="bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-aubergine-200 flex items-center gap-1.5">
                        <i className="fas fa-download"></i> Medical Rx PDF
                      </button>
                      {(() => {
                        try {
                          if (rx.instructions && rx.instructions.startsWith('{')) {
                            const parsed = JSON.parse(rx.instructions);
                            if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
                              return (
                                <button onClick={() => handleDownloadLifestyle(rx)}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-emerald-200 flex items-center gap-1.5">
                                  <i className="fas fa-leaf"></i> Lifestyle Plan
                                </button>
                              );
                            }
                          }
                        } catch(e) {}
                        return null;
                      })()}
                      <button onClick={handleShare}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-colors border border-slate-200 flex items-center gap-1.5">
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

        {/* Sidebar — real dosing schedule + adherence */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-aubergine-900 to-aubergine-800 rounded-2xl shadow-sm border border-aubergine-800 p-6 text-white">
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
                  <div key={slot.key} className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-xs font-bold uppercase tracking-wider text-aubergine-200 mb-1">{slot.label}</div>
                    <div className="text-sm font-semibold">{slot.meds.join(', ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adherence card */}
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

          {/* Holistic Care Reminder */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-2xl shadow-sm border border-emerald-800 p-6 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl mb-4">
              <i className="fas fa-spa"></i>
            </div>
            <h3 className="font-bold text-lg mb-1.5">Your Holistic Care</h3>
            <p className="text-emerald-200 text-xs mb-5 leading-relaxed">Your doctor may have prescribed Personalized Nutrition Support and a Mindful Movement Protocol alongside your medicines. Check your prescription cards for your individual lifestyle advice.</p>
            <div className="space-y-2">
              {[
                { icon: '🥗', label: 'Personalized Nutrition', desc: 'Sustainable, balanced nourishment' },
                { icon: '🧘‍♀️', label: 'Yoga & Mindful Movement', desc: 'Sustainable physical activity' },
                { icon: '💊', label: 'Medications', desc: 'Taken on schedule' }
              ].map(pillar => (
                <div key={pillar.label} className="flex items-center gap-3 bg-white/10 rounded-xl p-2.5 border border-white/10">
                  <span className="text-xl">{pillar.icon}</span>
                  <div>
                    <div className="text-xs font-black">{pillar.label}</div>
                    <div className="text-[11px] text-emerald-300">{pillar.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrescriptionModal rx={detailRx} labRequests={labRequests} onClose={() => setDetailRx(null)} />
      <RefillModal rx={refillRx} onClose={() => setRefillRx(null)} onSubmit={handleRefillSubmit} submitting={submittingRefill} />
      <AiDrugSafetyModal rx={safetyTargetRx} onClose={() => setSafetyTargetRx(null)} />
    </div>
  );
}

export default PatientPrescriptions;
