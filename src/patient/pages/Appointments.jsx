import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { PaymentModal } from '../../components/PaymentModal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { useWebRTCCall } from '../../hooks/useWebRTCCall.js';
import { useFullscreen } from '../../hooks/useFullscreen.js';
import { PreJoinCheck } from '../../components/PreJoinCheck.jsx';
import { formatCurrency } from '../../lib/currency.js';
import { AIButton } from '../../components/AiButton.jsx';
import { AIPaywallModal } from '../../components/ai/AIPaywallModal.jsx';
import { AISubscriptionCard } from '../../components/ai/AISubscriptionCard.jsx';

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

/* ─── AI Consult Prep & Question Assistant Modal ───────── */
function AiConsultPrepModal({ isOpen, onClose, appointment }) {
  const [prepData, setPrepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallInfo, setPaywallInfo] = useState(null);

  useEffect(() => {
    if (isOpen && appointment) {
      setLoading(true);
      setCopied(false);
      setPrepData(null);
      apiFetch('/ai/consult-prep', {
        method: 'POST',
        body: {
          patientName: 'Patient',
          doctorSpecialty: appointment.specialty,
          doctorName: appointment.doctor,
          concerns: `Upcoming ${appointment.type} consultation`,
          symptoms: appointment.notes ? [appointment.notes] : [],
        },
      })
        .then((res) => {
          const data = res?.data || res;
          setPrepData(data);
        })
        .catch((err) => {
          if (err?.paywallData || err?.status === 402 || err?.message?.toLowerCase()?.includes('premium') || err?.message?.toLowerCase()?.includes('allowance')) {
            onClose();
            setPaywallInfo(err.paywallData || {
              title: 'Unlock AI Visit Preparation',
              description: 'Synthesize your symptoms and get high-yield doctor questions tailored to your appointment.',
              planName: 'HealNari AI Premium',
              features: [
                'AI Consultation Preparation Briefs',
                'Tailored intelligent doctor questions',
                'Pre-consultation checklist generator',
                '500 AI inquiries per month',
              ],
            });
            setShowPaywall(true);
          } else {
            setPrepData({
              summary: `Prepare for your visit with ${appointment.doctor} (${appointment.specialty}).`,
              keyTopicsToCover: [
                'Current symptoms and cycle timeline',
                'Medication and supplement review',
                'Treatment goals and next steps',
              ],
              questionsForDoctor: [
                'What could be the primary physiological cause of my symptoms?',
                'Are specific hormone or blood tests recommended?',
                'How can lifestyle modifications support my recovery?',
              ],
              checklistBeforeCall: [
                'Have recent lab reports and prescription history open',
                'List all active medications and daily vitamins',
              ],
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, appointment]);

  if (!isOpen && !showPaywall) return null;

  const copyToClipboard = () => {
    if (!prepData) return;
    const questions = prepData.questionsForDoctor || [];
    const text = `Visit Prep for Dr. ${appointment?.doctor}:\n\nQuestions for Doctor:\n` +
      questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n') +
      (prepData.checklistBeforeCall?.length ? `\n\nChecklist:\n` + prepData.checklistBeforeCall.map(c => `• ${c}`).join('\n') : '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="AI Visit Preparation Assistant" size="lg">
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-aubergine-50 via-magenta-50 to-aubergine-50 border border-aubergine-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-aubergine-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
              <i className="fas fa-sparkles text-sm"></i>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">Smart Consultation Synthesis</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Personalized clinical brief for your visit with <strong className="text-aubergine-950">{appointment?.doctor}</strong> ({appointment?.specialty}).
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-3 border-purple-200 border-t-purple-600 animate-spin"></div>
              <p className="text-xs font-bold text-slate-600">Synthesizing clinical preparation brief...</p>
              <p className="text-[11px] text-slate-400">Curating specialist questions with Gemini Medical AI</p>
            </div>
          ) : prepData ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Emergency Red Flag Alert */}
              {prepData.emergencyAlert && (
                <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start gap-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 text-base shadow-xs mt-0.5">
                    <i className="fas fa-triangle-exclamation"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-rose-950 text-sm">Emergency Medical Notice</h4>
                    <p className="text-xs text-rose-900 font-bold mt-1 leading-relaxed">{prepData.emergencyAlert}</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              {prepData.summary && (
                <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-950 font-medium">
                  {prepData.summary}
                </div>
              )}

              {/* Questions for Doctor */}
              {prepData.questionsForDoctor?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    High-Yield Questions to Ask Your Doctor
                  </h4>
                  <div className="space-y-2">
                    {prepData.questionsForDoctor.map((q, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-3 text-xs text-slate-700 font-medium flex items-start gap-2.5 shadow-2xs">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed flex-1 font-semibold">{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              {prepData.checklistBeforeCall?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <i className="fas fa-clipboard-check text-aubergine-600"></i> Pre-Call Checklist
                  </h4>
                  <div className="space-y-1.5">
                    {prepData.checklistBeforeCall.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-700 flex items-center gap-2">
                        <i className="fas fa-circle-check text-emerald-500 text-xs"></i>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center italic pt-1">
                * Educational Preparation: This AI brief helps you organize your consultation and does not replace medical advice.
              </p>
            </div>
          ) : null}

          <div className="pt-2 flex gap-3 border-t border-slate-100">
            <button
              onClick={copyToClipboard}
              disabled={loading || !prepData}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <i className={`fas ${copied ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
              {copied ? 'Copied to Clipboard!' : 'Copy Prep Brief'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              Ready for Consult
            </button>
          </div>
        </div>
      </Modal>

      <AIPaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        paywallData={paywallInfo}
        onUpgraded={() => {
          setShowPaywall(false);
        }}
      />
    </>
  );
}

/* ─── Join Waitlist Modal ────────────────────── */
function JoinWaitlistModal({ isOpen, onClose, doctors, onJoin }) {
  const [doctorId, setDoctorId] = useState('');
  const [preferredWindow, setPreferredWindow] = useState('');
  const [joining, setJoining] = useState(false);

  const submit = async () => {
    if (!doctorId || !preferredWindow) return;
    setJoining(true);
    try {
      // onJoin rethrows on failure (after toasting) — without this catch, a
      // failed join used to reset the form and close the modal anyway,
      // looking identical to success.
      await onJoin(doctorId, preferredWindow);
      setDoctorId('');
      setPreferredWindow('');
      onClose();
    } catch {
      // already toasted by the caller — keep the modal open so the user can retry
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Waitlist" size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Doctor</label>
          <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
            className="crm-input">
            <option value="">-- Choose a doctor --</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.specialty || 'Specialist'})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Preferred Window</label>
          <input value={preferredWindow} onChange={e => setPreferredWindow(e.target.value)}
            placeholder="e.g. Tomorrow, Morning Slot"
            className="crm-input" />
        </div>
        <button disabled={!doctorId || !preferredWindow || joining} onClick={submit}
          className="crm-btn-primary w-full disabled:opacity-40">
          {joining ? 'Joining…' : 'Join Waitlist'}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Cancel Modal with Reason ───────────────── */
function CancelModal({ isOpen, onClose, onConfirm, apt }) {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const confirm = async () => {
    setCancelling(true);
    await onConfirm(reason);
    setCancelling(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Cancel Appointment?">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Are you sure you want to cancel your appointment with <strong>Dr. {apt?.doctor}</strong>? A refund will be initiated within 3–5 business days if applicable.
        </p>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Cancellation Reason (optional)</label>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Why are you cancelling?"
            className="crm-input resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={cancelling} className="crm-btn-secondary flex-1 disabled:opacity-40">Keep it</button>
          <button onClick={confirm} disabled={cancelling} className="crm-btn-primary flex-1 disabled:opacity-40 bg-rose-600 hover:bg-rose-700 border-none">
            {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Reschedule Modal ───────────────────────── */
function RescheduleModal({ isOpen, onClose, onReschedule, apt }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ date: '', slot: '', reason: '' });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsRefreshKey, setSlotsRefreshKey] = useState(0);

  useEffect(() => {
    if (isOpen) setForm({ date: '', slot: '', reason: '' });
  }, [isOpen]);

  useEffect(() => {
    if (!apt?.doctorId || !form.date) { setSlots([]); return; }
    setForm(p => ({ ...p, slot: '' }));
    setSlotsLoading(true);
    apiFetch(`/doctors/${apt.doctorId}/slots?date=${form.date}`)
      .then(res => setSlots(res.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [apt?.doctorId, form.date, slotsRefreshKey]);

  const reset = () => { setStep(1); onClose(); };
  const [booking, setBooking] = useState(false);

  const confirm = async () => {
    setBooking(true);
    try {
      await onReschedule({ newDate: form.date, newTime: form.slot, reason: form.reason });
      reset();
    } catch {
      setSlotsRefreshKey(k => k + 1);
    } finally {
      setBooking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={reset} title="Reschedule Appointment" size="md">
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            Rescheduling from: <strong>{apt?.date} at {apt?.time}</strong>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">New Preferred Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              min={todayLocalStr()} className="crm-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Reason (optional)</label>
            <textarea rows={2} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Why do you need to reschedule?" className="crm-input resize-none" />
          </div>
          <button disabled={!form.date} onClick={() => setStep(2)} className="crm-btn-primary w-full disabled:opacity-40">
            Choose Time Slot →
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-700">Available slots for {form.date}: <span className="font-normal text-slate-500 text-xs ml-1">(Local Time)</span></p>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl"></div>)}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No slots left for this date — go back and try another date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button key={slot} onClick={() => setForm(p => ({ ...p, slot }))}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all ${form.slot === slot ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300'}`}>
                  {slot}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="crm-btn-secondary flex-1 disabled:opacity-40">← Back</button>
            <button disabled={!form.slot || booking} onClick={confirm} className="crm-btn-primary flex-1 disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700 border-none">
              <i className={`fas ${booking ? 'fa-spinner fa-spin' : 'fa-check'} mr-2`}></i> {booking ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Booking Modal ──────────────────────────── */
function BookingModal({ isOpen, onClose, onBook, prefill = {}, doctors }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    doctorId: prefill.doctorId || '',
    type: prefill.type || 'Video Consult',
    date: '',
    slot: '',
    notes: '',
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsRefreshKey, setSlotsRefreshKey] = useState(0);

  useEffect(() => {
    if (isOpen) setForm({ doctorId: prefill.doctorId || '', type: prefill.type || 'Video Consult', date: '', slot: '', notes: '' });
  }, [isOpen, prefill.doctorId, prefill.type]);

  // Real per-doctor availability, not a fixed list — matches Discovery.jsx /
  // Dashboard.jsx's QuickBookModal. Re-fetched after a failed booking too
  // (slotsRefreshKey), so a slot someone else just took disappears instead
  // of staying selectable.
  useEffect(() => {
    if (!form.doctorId || !form.date) { setSlots([]); return; }
    setForm(p => ({ ...p, slot: '' }));
    setSlotsLoading(true);
    apiFetch(`/doctors/${form.doctorId}/slots?date=${form.date}`)
      .then(res => setSlots(res.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.doctorId, form.date, slotsRefreshKey]);

  const selectedDoctor = doctors.find(d => d.id === form.doctorId);

  const reset = () => { setStep(1); setForm({ doctorId: '', type: 'Video Consult', date: '', slot: '', notes: '' }); onClose(); };

  const [booking, setBooking] = useState(false);

  const confirm = async () => {
    setBooking(true);
    try {
      // onBook rethrows on failure (after showing its own error toast) so we
      // know not to reset/close here — previously this fired the request
      // and closed immediately regardless of outcome, making a failed
      // booking look identical to a successful one.
      await onBook({ ...form, doctorName: selectedDoctor?.full_name, fee: selectedDoctor?.consultation_fee });
      reset();
    } catch {
      // already toasted by the caller — keep the modal open so the user can
      // retry. Re-fetch availability in case this failed because someone
      // else just took the slot (the 23505 conflict case).
      setSlotsRefreshKey(k => k + 1);
    } finally {
      setBooking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={reset} title={prefill.followUp ? 'Book Follow-up' : 'Book Appointment'} size="md">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Doctor *</label>
            <select value={form.doctorId} onChange={e => setForm(p => ({ ...p, doctorId: e.target.value }))}
              className="crm-input">
              <option value="">-- Choose a specialist --</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.specialty || 'Specialist'})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Consultation Type</label>
            <div className="flex gap-3">
              {['Video Consult', 'Clinic Visit'].map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${form.type === t ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
                  <i className={`fas ${t === 'Video Consult' ? 'fa-video' : 'fa-hospital'}`}></i> {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Preferred Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              min={todayLocalStr()}
              className="crm-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any specific concerns or symptoms..."
              className="crm-input resize-none" />
          </div>
          <button disabled={!form.doctorId || !form.date} onClick={() => setStep(2)}
            className="crm-btn-primary w-full disabled:opacity-40">
            Choose Time Slot →
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-700">Available slots for {form.date}: <span className="font-normal text-slate-500 text-xs ml-1">(Local Time)</span></p>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl"></div>)}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No slots left for this date — go back and try another date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(slot => (
                <button key={slot} onClick={() => setForm(p => ({ ...p, slot }))}
                  className={`py-3 rounded-xl text-xs font-bold border transition-all ${form.slot === slot ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300'}`}>
                  {slot}
                </button>
              ))}
            </div>
          )}
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="font-bold text-slate-600">Doctor</span><span className="text-slate-800">Dr. {selectedDoctor?.full_name}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Type</span><span className="text-slate-800">{form.type}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Date & Time</span><span className="text-slate-800">{form.date} • {form.slot || '—'}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Consult Fee</span><span className="text-aubergine-700 font-black">{formatCurrency(selectedDoctor?.consultation_fee ?? 29, selectedDoctor?.currency || 'INR')}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="crm-btn-secondary flex-1 disabled:opacity-40">← Back</button>
            <button disabled={!form.slot || booking} onClick={confirm}
              className="crm-btn-primary flex-1 disabled:opacity-40 border-none bg-emerald-600 hover:bg-emerald-700">
              <i className={`fas ${booking ? 'fa-spinner fa-spin' : 'fa-lock'} mr-2`}></i> {booking ? 'Booking…' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Video Call Modal ───────────────────────── */
const CALL_STATUS_COPY = {
  'requesting-media': 'Requesting camera & microphone access…',
  connecting: 'Connecting you to the doctor…',
  'peer-left': 'The doctor left the call',
  ended: 'Call ended',
};

function callStatusCopy(call) {
  if (call.connectionState === 'failed') return call.error || 'Connection failed';
  return CALL_STATUS_COPY[call.connectionState] || '● Live';
}

const QUALITY_STYLES = {
  good: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  fair: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  poor: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
};

function fmtDuration(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function VideoCallModal({ isOpen, onClose, doctor, appointmentId, toast, autoJoin = false }) {
  const [joined, setJoined] = useState(false);
  const call = useWebRTCCall({ appointmentId, active: joined });
  const { callDeclinedId, clearCallDeclined } = useNotifications() || {};
  const [elapsed, setElapsed] = useState(0);
  const callViewRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen, supported: fullscreenSupported } = useFullscreen(callViewRef);

  // Manual "Join Now" tap — the doctor may not have started this call yet
  // (this appointment could still be Upcoming/Confirmed), so ring them too.
  // Best-effort and a no-op notification-wise if the doctor already has
  // (backend only rings on an actual not-In-Progress -> In Progress
  // transition), so this is safe to always fire.
  const join = () => {
    setJoined(true);
    apiFetch(`/appointments/${appointmentId}/status`, { method: 'PUT', body: { status: 'In Progress' } }).catch(() => { });
  };

  // Accepted from the incoming-call ring screen — skip the "Join Now" tap,
  // the user already answered. The doctor was the caller here, so no need
  // to ring them back.
  useEffect(() => {
    if (isOpen && autoJoin) setJoined(true);
  }, [isOpen, autoJoin]);

  const end = () => {
    call.hangUp();
    setJoined(false);
    onClose();
    toast('Call ended.', 'info');
  };

  // The doctor declined this call (they were rung by our join()) — hang up
  // on our side too, like a real phone call, instead of leaving this modal
  // "ringing" forever.
  useEffect(() => {
    if (!joined || callDeclinedId !== appointmentId) return;
    call.hangUp();
    setJoined(false);
    onClose();
    toast('The doctor declined the call.', 'info');
    clearCallDeclined?.();
  }, [callDeclinedId, joined, appointmentId]);

  useEffect(() => {
    if (call.connectionState === 'connected') toast('Connected to your doctor.', 'success');
  }, [call.connectionState, toast]);

  useEffect(() => {
    if (call.error) toast(call.error, 'error');
  }, [call.error, toast]);

  // Whichever way the call ends, don't leave the browser stuck in
  // fullscreen showing nothing once this view unmounts.
  useEffect(() => {
    if (!joined && document.fullscreenElement) document.exitFullscreen().catch(() => { });
  }, [joined]);

  useEffect(() => {
    if (call.connectionState !== 'connected') return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [call.connectionState]);

  // Once joined, the call takes over the whole screen (see the portal
  // render below) rather than sitting in a small dialog — lock background
  // scroll and let Escape hang up, matching how the ring screen behaves.
  useEffect(() => {
    if (!joined) return undefined;
    const handleKey = (e) => { if (e.key === 'Escape') end(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [joined]);

  const initials = doctor?.split(' ').slice(1).map(n => n[0]).join('') || 'DR';
  const failedOrEnded = call.connectionState === 'failed' || call.connectionState === 'ended';

  if (!isOpen) return null;

  // Still on the "ready to connect?" prompt — a small dialog is the right
  // scale for a yes/no decision. The full call view (below) only takes over
  // once actually joined.
  if (!joined) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Video Consultation" size="lg">
        <div className="text-center space-y-5 py-2">
          <div>
            <h4 className="font-black text-slate-800 text-xl">{doctor}</h4>
            <p className="text-sm text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Ready to connect
            </p>
          </div>
          <PreJoinCheck />
          <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-slate-600"><i className="fas fa-shield-halved text-emerald-500"></i> Private, doctor-only session</div>
            <div className="flex items-center gap-2 text-slate-600"><i className="fas fa-lock text-emerald-500"></i> DPDP Act, 2023 compliant</div>
          </div>
          <button onClick={join} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-3 shadow-lg">
            <i className="fas fa-video"></i> Join Now
          </button>
        </div>
      </Modal>
    );
  }

  // Joined — full-screen immersive call, matching a real video-call app
  // instead of being squeezed into a small dialog box.
  return createPortal(
    <div ref={callViewRef} className="fixed inset-0 z-[9200] flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 text-white/90 bg-slate-950/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className={`w-2 h-2 rounded-full ${call.connectionState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
          <span className="font-mono tabular-nums">{call.connectionState === 'connected' ? fmtDuration(elapsed) : callStatusCopy(call)}</span>
          {call.connectionState === 'connected' && call.connectionQuality && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${QUALITY_STYLES[call.connectionQuality]}`} title="Connection quality">
              <i className="fas fa-signal"></i> {call.connectionQuality}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white/70 truncate max-w-[40vw]">{doctor}</span>
          {fullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors"
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        {call.remoteStream ? (
          <VideoTile stream={call.remoteStream} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-aubergine-950 via-slate-950 to-slate-950">
            <div className="text-center text-white px-6">
              <div className="w-24 h-24 rounded-full bg-aubergine-700/80 mx-auto mb-4 flex items-center justify-center text-3xl font-black shadow-2xl">
                {initials}
              </div>
              <p className="font-bold text-lg">{doctor}</p>
              <p className={`text-sm mt-2 flex items-center justify-center gap-2 ${call.connectionState === 'failed' ? 'text-rose-400' : 'text-slate-400'}`}>
                {!failedOrEnded && call.connectionState !== 'peer-left' && <i className="fas fa-circle-notch fa-spin"></i>}
                {callStatusCopy(call)}
              </p>
            </div>
          </div>
        )}

        {call.peerMuted && call.remoteStream && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
            <i className="fas fa-microphone-slash text-rose-400"></i> Doctor is muted
          </div>
        )}

        {call.connectionQuality === 'poor' && !call.isVideoOff && call.localStream && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white text-xs px-3 py-2 rounded-xl border border-amber-500/30 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><i className="fas fa-triangle-exclamation text-amber-400"></i> Weak connection</span>
            <button onClick={call.toggleVideo} className="bg-white/15 hover:bg-white/25 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors">
              Continue with Audio Only
            </button>
          </div>
        )}

        {/* Local self-view (PiP) */}
        <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-48 bg-slate-800 rounded-2xl border border-white/20 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-2xl">
          {call.isVideoOff || !call.localStream ? (
            <i className="fas fa-video-slash text-slate-500 text-2xl"></i>
          ) : (
            <VideoTile stream={call.localStream} muted mirrored />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8 py-6 bg-slate-950/90 backdrop-blur-sm border-t border-white/10">
        <div className="flex flex-col items-center gap-2">
          <button onClick={call.toggleMute} disabled={!call.localStream}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all disabled:opacity-40 ${call.isMuted ? 'bg-rose-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            <i className={`fas ${call.isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wide">{call.isMuted ? 'Unmute' : 'Mute'}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={end} className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-2xl shadow-xl shadow-rose-900/40 transition-all hover:scale-105 active:scale-95">
            <i className="fas fa-phone-slash"></i>
          </button>
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wide">End</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={call.toggleVideo} disabled={!call.localStream}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all disabled:opacity-40 ${call.isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            <i className={`fas ${call.isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wide">{call.isVideoOff ? 'Start Video' : 'Stop Video'}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Main Component ─────────────────────────── */
const STATUS_LABEL = {
  Requested: 'Pending',
  Approved: 'Approved (Pending Payment)',
  Upcoming: 'Confirmed',
  Waiting: 'Confirmed',
  'In Progress': 'Confirmed',
  Done: 'Completed',
  Cancelled: 'Cancelled',
  'No Show': 'Cancelled',
};

function PatientAppointments() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // transactions/syncPayment come from ClinicDataContext (not fetched
  // locally) — the same cache Billing.jsx reads, so a payment made on
  // either page is immediately reflected on both.
  const { appointments, addAppointment, cancelAppointment, rescheduleAppointment, transactions, syncPayment, waitlist, joinWaitlist, leaveWaitlist, refreshAppointments, updateAppointmentStatus } = useClinicData();
  const [doctors, setDoctors] = useState([]);
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'upcoming');
  const [showJoinWaitlist, setShowJoinWaitlist] = useState(false);

  // Sync tab with URL search parameter if changed via navigation or deep-link
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && ['action_required', 'upcoming', 'past'].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    apiFetch('/doctors/search').then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const doctorById = useMemo(() => new Map(doctors.map(d => [d.id, d])), [doctors]);

  // Track paid appointments from billing transactions
  const paidAppointmentIds = useMemo(() => {
    return new Set(
      (transactions || [])
        .filter(t => t.status === 'success' || t.status === 'Paid' || t.status === 'COMPLETED')
        .map(t => t.appointment_id || t.appointmentId)
        .filter(Boolean)
    );
  }, [transactions]);

  const STATUS_LABEL = {
    Requested: 'Pending Doctor Acceptance',
    Approved: 'Action Required: Pay to Confirm',
    HOLD: 'Slot Reserved',
    Upcoming: 'Confirmed',
    Waiting: 'In Waiting Room',
    'In Progress': 'Consultation Live',
    Done: 'Completed',
    'No Show': 'Missed',
    Cancelled: 'Cancelled',
  };

  const STATUS_BADGE = {
    'Pending Doctor Acceptance': 'bg-aubergine-50 text-aubergine-700 border border-aubergine-200',
    'Action Required: Pay to Confirm': 'bg-amber-50 text-amber-800 border border-amber-300 font-black',
    'Slot Reserved': 'bg-purple-50 text-purple-700 border border-purple-200',
    Confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'In Waiting Room': 'bg-blue-50 text-blue-700 border border-blue-200',
    'Consultation Live': 'bg-rose-50 text-rose-700 border border-rose-200 font-black',
    Completed: 'bg-slate-100 text-slate-600 border border-slate-200',
    Cancelled: 'bg-rose-50 text-rose-600 border border-rose-200',
    Missed: 'bg-slate-100 text-slate-500 border border-slate-200',
  };

  const toRow = (a) => {
    const doc = doctorById.get(a.doctorId);
    const rawStatus = a.status || 'Requested';
    const displayStatus = STATUS_LABEL[rawStatus] || rawStatus;
    return {
      id: a.id,
      doctorId: a.doctorId,
      doctor: (a.doctorName || doc?.full_name || 'Specialist').startsWith('Dr.') ? (a.doctorName || doc?.full_name) : `Dr. ${a.doctorName || doc?.full_name || 'Specialist'}`,
      specialty: doc?.specialty || a.specialty || 'Specialist',
      date: a.date,
      dateLabel: a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      time: a.time,
      rawStatus,
      status: displayStatus,
      type: a.type,
      fee: doc?.consultation_fee ?? 799,
      isPaid: paidAppointmentIds.has(a.id),
    };
  };

  const pendingRequests = useMemo(() => appointments
    .filter(a => ['Requested', 'Approved', 'HOLD'].includes(a.status))
    .map(toRow)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [appointments, doctorById, paidAppointmentIds]);

  const upcoming = useMemo(() => appointments
    .filter(a => ['Upcoming', 'Waiting', 'In Progress'].includes(a.status))
    .map(toRow)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [appointments, doctorById, paidAppointmentIds]);

  const past = useMemo(() => appointments
    .filter(a => ['Done', 'Cancelled', 'No Show'].includes(a.status))
    .map(toRow)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [appointments, doctorById, paidAppointmentIds]);

  // Modals
  const [showBook, setShowBook] = useState(false);
  const [bookPrefill, setBookPrefill] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [videoTarget, setVideoTarget] = useState(null);
  const [aiPrepTarget, setAiPrepTarget] = useState(null);
  const [autoJoinTarget, setAutoJoinTarget] = useState(false);
  const [successApt, setSuccessApt] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Reached via the incoming-call ring screen's "Accept", or the service
  // worker navigating this tab to ?joinCall=<id> when an OS push
  // notification is tapped.
  const openCallFor = useCallback(async (appointmentId) => {
    let match = upcoming.find(a => a.id === appointmentId);
    if (!match) {
      try {
        const fresh = await refreshAppointments();
        const raw = fresh.find(a => a.id === appointmentId && ['Upcoming', 'Waiting', 'In Progress'].includes(a.status));
        match = raw ? toRow(raw) : null;
      } catch {
        match = null;
      }
    }
    if (!match) return false;
    setVideoTarget(match);
    setAutoJoinTarget(true);
    return true;
  }, [upcoming, refreshAppointments]);

  useEffect(() => {
    const joinCallId = searchParams.get('joinCall');
    if (!joinCallId) return;
    let cancelled = false;
    openCallFor(joinCallId).then((opened) => {
      if (cancelled) return;
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('joinCall');
        return next;
      }, { replace: true });
      if (!opened) toast("Couldn't open that call — it may have already ended.", 'error');
    });
    return () => { cancelled = true; };
  }, [searchParams, openCallFor, setSearchParams, toast]);

  const getFilteredData = () => {
    let data = tab === 'action_required' ? pendingRequests : tab === 'upcoming' ? upcoming : past;
    return data.filter(item => {
      const matchesSearch = !search || item.doctor.toLowerCase().includes(search.toLowerCase()) || item.specialty.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'All Types' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  };
  const filteredData = getFilteredData();

  const handleBook = async (form) => {
    try {
      const saved = await addAppointment({
        doctorId: form.doctorId,
        type: form.type,
        date: form.date,
        time: form.slot,
        reason: form.notes,
      });
      const apt = toRow(saved);
      setSuccessApt(apt);
      toast(`Consultation request sent to ${apt.doctor}! You will be notified once the doctor accepts.`, 'success');
      setTab('action_required');
    } catch (err) {
      toast(err.message || 'Failed to book appointment', 'error');
      throw err;
    }
  };

  const handleCancel = async (reason) => {
    const { id, doctor: doctorName } = cancelTarget;
    try {
      await cancelAppointment(id, reason);
      toast(`Appointment with ${doctorName} cancelled.`, 'info');
      setCancelTarget(null);
    } catch (err) {
      toast(err.message || 'Failed to cancel appointment. Please try again.', 'error');
    }
  };

  const handleReschedule = async ({ newDate, newTime, reason }) => {
    try {
      await rescheduleAppointment(rescheduleTarget.id, newDate, newTime, reason);
      toast(`Appointment rescheduled successfully to ${newDate} at ${newTime}.`, 'success');
      setRescheduleTarget(null);
      await refreshAppointments();
    } catch (err) {
      toast(err.message || 'Failed to reschedule appointment.', 'error');
      throw err;
    }
  };

  const handleJoinWaitlist = async (doctorId, preferredWindow) => {
    try {
      await joinWaitlist(doctorId, preferredWindow);
      toast('Added to the waitlist. We\'ll notify you when a slot opens.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to join waitlist.', 'error');
      throw err;
    }
  };

  const [payTarget, setPayTarget] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const openPayFor = (apt) => {
    setPayTarget(apt);
    setShowPayModal(true);
  };

  const handlePaid = async (payment) => {
    syncPayment(payment);
    if (payTarget) {
      try {
        await updateAppointmentStatus(payTarget.id, 'Upcoming');
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    }
    toast('Payment successful! Your appointment is confirmed.', 'success');
    setTab('upcoming');
    refreshAppointments();
  };

  const handleWaitlistCancel = async (entry) => {
    try {
      await leaveWaitlist(entry.id);
      toast(`Removed from waitlist for ${doctorById.get(entry.doctor_id)?.full_name || 'the doctor'}.`, 'info');
    } catch (err) {
      toast(err.message || 'Failed to leave waitlist.', 'error');
    }
  };

  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 30000); // 30s
    return () => clearInterval(timer);
  }, []);

  const isVideoEnabled = (apt) => {
    if (!apt.date || !apt.time) return true;
    try {
      let hours = 0;
      let minutes = 0;
      const ampmMatch = apt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (ampmMatch) {
         let h = parseInt(ampmMatch[1], 10);
         const m = parseInt(ampmMatch[2], 10);
         const ampm = ampmMatch[3].toUpperCase();
         if (ampm === 'PM' && h < 12) h += 12;
         if (ampm === 'AM' && h === 12) h = 0;
         hours = h;
         minutes = m;
      } else {
         const parts = apt.time.split(':');
         hours = parseInt(parts[0] || '0', 10);
         minutes = parseInt(parts[1] || '0', 10);
      }
      const aptTime = new Date(apt.date);
      aptTime.setHours(hours, minutes, 0, 0);
      return (aptTime.getTime() - nowTime.getTime()) <= 5 * 60 * 1000;
    } catch (e) {
      return true;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">My Appointments</h1>
          <p className="text-sm text-slate-500">Manage your appointment requests, payments, and consultations.</p>
        </div>
        <button onClick={() => { setBookPrefill({}); setShowBook(true); }}
          className="crm-btn-primary flex items-center gap-2">
          <i className="fas fa-plus"></i> Request Consultation
        </button>
      </div>

      {/* Success Banner */}
      {successApt && (
        <div className={`border rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-in bg-aubergine-50 border-aubergine-200`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-aubergine-100 text-aubergine-700`}>
              <i className="fas fa-clock"></i>
            </div>
            <div>
              <p className="font-bold text-aubergine-900">
                Consultation Request Submitted!
              </p>
              <p className="text-xs text-aubergine-700">
                {successApt.doctor} • {successApt.dateLabel} • {successApt.time} — The doctor will review your request. You will receive a notification to pay and confirm once accepted.
              </p>
            </div>
          </div>
          <button onClick={() => setSuccessApt(null)} className="text-aubergine-600 hover:text-aubergine-900"><i className="fas fa-xmark"></i></button>
        </div>
      )}

      {/* Action Required Banner if any Approved appointments */}
      {pendingRequests.some(r => r.rawStatus === 'Approved') && tab !== 'action_required' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Action Required: Doctor Accepted Your Request</h4>
              <p className="text-xs text-amber-700">You have appointment(s) awaiting payment confirmation.</p>
            </div>
          </div>
          <button onClick={() => setTab('action_required')} className="crm-btn-primary bg-amber-600 hover:bg-amber-700 text-xs py-2 px-3">
            Pay Now to Confirm →
          </button>
        </div>
      )}

      {/* Tabs + Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {[
            ['action_required', 'Action Required & Requests', pendingRequests.length, pendingRequests.some(r => r.rawStatus === 'Approved')],
            ['upcoming', 'Confirmed Upcoming', upcoming.length, false],
            ['past', 'Past History', past.length, false]
          ].map(([key, label, count, hasAlert]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-4 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${hasAlert ? 'bg-amber-500 text-white animate-pulse' : tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-white">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctor, specialty, or ID..."
              className="crm-input pl-9" />
          </div>
          <div className="relative min-w-[140px] sm:max-w-[150px] w-full group">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="crm-input w-full appearance-none cursor-pointer pr-8 focus:ring-aubergine-300">
              <option value="All Types">All Types</option>
              <option value="Video Consult">Video Consult</option>
              <option value="Clinic Visit">Clinic Visit</option>
            </select>
            <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs group-focus-within:text-aubergine-500 transition-colors"></i>
          </div>
          <div className="relative min-w-[140px] sm:max-w-[150px] w-full group">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="crm-input w-full appearance-none cursor-pointer pr-8 focus:ring-aubergine-300">
              <option value="All Status">All Status</option>
              <option value="Action Required: Pay to Confirm">Action Required</option>
              <option value="Pending Doctor Acceptance">Pending Review</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
            </select>
            <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs group-focus-within:text-aubergine-500 transition-colors"></i>
          </div>
        </div>

        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th className="whitespace-nowrap">Doctor</th>
                <th className="whitespace-nowrap">Date & Time</th>
                <th className="whitespace-nowrap">Type</th>
                <th className="whitespace-nowrap">Status</th>
                <th className="text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{apt.doctor}</div>
                    <div className="text-xs text-slate-500">{apt.specialty}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-aubergine-700">{apt.dateLabel}</div>
                    <div className="text-xs text-slate-500">{apt.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-max">
                      <i className={`fas ${apt.type === 'Video Consult' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {apt.type}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">{formatCurrency(apt.fee, apt.currency || 'INR')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[apt.status] || 'bg-slate-100 text-slate-600'}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {tab === 'action_required' ? (
                      <div className="flex justify-end items-center gap-2">
                        {apt.rawStatus === 'Approved' && (
                          <button onClick={() => openPayFor(apt)}
                            className="crm-btn-primary bg-amber-500 hover:bg-amber-600 border-none text-xs font-bold py-2 px-3 flex items-center gap-1.5 shadow-sm animate-pulse-subtle">
                            <i className="fas fa-credit-card"></i> Pay Now
                          </button>
                        )}
                        {apt.rawStatus === 'Requested' && (
                          <span className="text-xs text-slate-400 italic px-2">Awaiting doctor acceptance</span>
                        )}
                        <button onClick={() => setCancelTarget(apt)}
                          className="crm-btn-secondary text-xs text-rose-600 hover:bg-rose-50 py-1.5 px-2.5">
                          Cancel
                        </button>
                      </div>
                    ) : tab === 'upcoming' ? (
                      <div className="flex justify-end items-center gap-2">
                        <AIButton
                          variant="gradient"
                          size="sm"
                          icon="fa-sparkles"
                          onClick={() => setAiPrepTarget(apt)}
                          title="AI Visit Question Assistant"
                          className="!py-1.5 !px-3"
                        >
                          <span className="hidden sm:inline">AI Prep</span>
                        </AIButton>
                        <button onClick={() => setRescheduleTarget(apt)}
                          className="crm-btn-secondary h-8 px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-100">
                          Reschedule
                        </button>
                        <button onClick={() => setCancelTarget(apt)}
                          className="crm-btn-secondary h-8 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-100">
                          Cancel 
                        </button>
                        {apt.type === 'Video Consult' && (
                          <button 
                            onClick={() => isVideoEnabled(apt) && setVideoTarget(apt)}
                            disabled={!isVideoEnabled(apt)}
                            title={!isVideoEnabled(apt) ? "Video call link will be active 5 mins before appointment time" : ""}
                            className={`border-none text-[11px] h-8 px-3 rounded-xl font-bold flex items-center shadow-sm transition-all ${
                              isVideoEnabled(apt) 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            }`}>
                            <i className="fas fa-video mr-1"></i> Join Call
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            const docSlug = (apt.doctor || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            const docUrl = `${window.location.origin}/dr/${apt.doctorId || docSlug}`;
                            const msg = encodeURIComponent(
                              `Hi! I recommend consulting with ${apt.doctor} (${apt.specialty}) on HealNari. You can view their verified profile and book direct appointments here:\n\n${docUrl}`
                            );
                            window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                          }}
                          className="crm-btn-secondary text-[11px] h-8 px-2.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title={`Recommend ${apt.doctor} to Friends & Family on WhatsApp`}
                        >
                          <i className="fab fa-whatsapp text-emerald-600 text-xs sm:mr-1"></i>
                          <span className="hidden sm:inline">Recommend</span>
                        </button>
                        <button onClick={() => { setBookPrefill({ doctorId: apt.doctorId, followUp: true }); setShowBook(true); }}
                          className="crm-btn-primary text-[11px] h-8 px-3">
                          <i className="fas fa-calendar-plus mr-1"></i> Follow-up
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                      <i className={`fas ${tab === 'upcoming' ? 'fa-calendar-plus text-aubergine-300' : 'fa-clock-rotate-left text-slate-300'} text-4xl`}></i>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">
                      No Appointments Found
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                      Try adjusting your filters or booking a new consultation.
                    </p>
                    {tab === 'upcoming' && (
                      <button onClick={() => { setBookPrefill({}); setShowBook(true); }} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all btn-interactive">
                        <i className="fas fa-calendar-check mr-2"></i> Book Consultation
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waitlist */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Waitlist Requests</h3>
          <button onClick={() => setShowJoinWaitlist(true)} className="text-xs text-aubergine-600 font-bold hover:underline flex items-center gap-1">
            <i className="fas fa-plus"></i> Join Waitlist
          </button>
        </div>
        <div className="p-4 space-y-3">
          {waitlist.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">You're not on any waitlists. Join one for a doctor who's fully booked.</p>
          )}
          {waitlist.map(entry => (
            <div key={entry.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <div>
                <h4 className="font-bold text-amber-900 text-sm">{doctorById.get(entry.doctor_id)?.full_name || 'Doctor'}</h4>
                <p className="text-xs text-amber-700 mt-1">Requested for: {entry.preferred_window}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-600">#{entry.position}</div>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">In Queue</div>
                </div>
                <button onClick={() => handleWaitlistCancel(entry)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-1 rounded-lg hover:bg-rose-50 transition-colors border border-rose-200">
                  Leave Queue
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <BookingModal isOpen={showBook} onClose={() => setShowBook(false)} onBook={handleBook} prefill={bookPrefill} doctors={doctors} />
      <JoinWaitlistModal isOpen={showJoinWaitlist} onClose={() => setShowJoinWaitlist(false)} doctors={doctors} onJoin={handleJoinWaitlist} />
      <CancelModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        apt={cancelTarget}
      />
      <RescheduleModal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onReschedule={handleReschedule}
        apt={rescheduleTarget}
      />
      {videoTarget && (
        <VideoCallModal
          isOpen={!!videoTarget}
          onClose={() => { setVideoTarget(null); setAutoJoinTarget(false); }}
          doctor={videoTarget?.doctor}
          appointmentId={videoTarget?.id}
          toast={toast}
          autoJoin={autoJoinTarget}
        />
      )}
      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        appointmentId={payTarget?.id}
        amount={payTarget?.fee ?? 0}
        currency={payTarget?.currency || 'INR'}
        description={payTarget ? `Consultation — ${payTarget.doctor}` : ''}
        onPaid={handlePaid}
        onViewAppointment={() => {
          setTab('upcoming');
          refreshAppointments();
        }}
      />
      <AiConsultPrepModal
        isOpen={!!aiPrepTarget}
        onClose={() => setAiPrepTarget(null)}
        appointment={aiPrepTarget}
      />
    </div>
  );
}

export default PatientAppointments;
