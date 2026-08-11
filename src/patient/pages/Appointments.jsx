import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { PaymentModal } from '../../components/PaymentModal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { useWebRTCCall } from '../../hooks/useWebRTCCall.js';

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

const SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];

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
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            <option value="">-- Choose a doctor --</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.specialty || 'Specialist'})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Preferred Window</label>
          <input value={preferredWindow} onChange={e => setPreferredWindow(e.target.value)}
            placeholder="e.g. Tomorrow, Morning Slot"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <button disabled={!doctorId || !preferredWindow || joining} onClick={submit}
          className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {joining ? 'Joining…' : 'Join Waitlist'}
        </button>
      </div>
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

  useEffect(() => {
    if (isOpen) setForm({ doctorId: prefill.doctorId || '', type: prefill.type || 'Video Consult', date: '', slot: '', notes: '' });
  }, [isOpen, prefill.doctorId, prefill.type]);

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
      // already toasted by the caller — keep the modal open so the user can retry
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
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
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
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any specific concerns or symptoms..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>
          <button disabled={!form.doctorId || !form.date} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Choose Time Slot →
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-700">Available slots for {form.date}:</p>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map(slot => (
              <button key={slot} onClick={() => setForm(p => ({ ...p, slot }))}
                className={`py-3 rounded-xl text-xs font-bold border transition-all ${form.slot === slot ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300'}`}>
                {slot}
              </button>
            ))}
          </div>
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="font-bold text-slate-600">Doctor</span><span className="text-slate-800">Dr. {selectedDoctor?.full_name}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Type</span><span className="text-slate-800">{form.type}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Date & Time</span><span className="text-slate-800">{form.date} • {form.slot || '—'}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Consult Fee</span><span className="text-aubergine-700 font-black">₹{selectedDoctor?.consultation_fee ?? 799}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">← Back</button>
            <button disabled={!form.slot || booking} onClick={confirm}
              className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <i className={`fas ${booking ? 'fa-spinner fa-spin' : 'fa-circle-check'}`}></i> {booking ? 'Booking…' : 'Confirm'}
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

function VideoCallModal({ isOpen, onClose, doctor, appointmentId, toast, autoJoin = false }) {
  const [joined, setJoined] = useState(false);
  const call = useWebRTCCall({ appointmentId, active: joined });
  const { callDeclinedId, clearCallDeclined } = useNotifications() || {};

  // Manual "Join Now" tap — the doctor may not have started this call yet
  // (this appointment could still be Upcoming/Confirmed), so ring them too.
  // Best-effort and a no-op notification-wise if the doctor already has
  // (backend only rings on an actual not-In-Progress -> In Progress
  // transition), so this is safe to always fire.
  const join = () => {
    setJoined(true);
    apiFetch(`/appointments/${appointmentId}/status`, { method: 'PUT', body: { status: 'In Progress' } }).catch(() => {});
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

  const initials = doctor?.split(' ').slice(1).map(n => n[0]).join('') || 'DR';
  const failedOrEnded = call.connectionState === 'failed' || call.connectionState === 'ended';

  return (
    <Modal isOpen={isOpen} onClose={() => { if (joined) end(); else onClose(); }} title="Video Consultation" size="lg">
      {!joined ? (
        <div className="text-center space-y-5 py-2">
          <div className="w-20 h-20 rounded-3xl bg-aubergine-50 mx-auto flex items-center justify-center text-3xl font-black text-aubergine-700">
            {initials}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-xl">{doctor}</h4>
            <p className="text-sm text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Ready to connect
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-slate-600"><i className="fas fa-shield-halved text-emerald-500"></i> Private, doctor-only session</div>
            <div className="flex items-center gap-2 text-slate-600"><i className="fas fa-lock text-emerald-500"></i> DPDP Act, 2023 compliant</div>
          </div>
          <button onClick={join} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-3 shadow-lg">
            <i className="fas fa-video"></i> Join Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden">
            {call.remoteStream ? (
              <VideoTile stream={call.remoteStream} className="absolute inset-0" />
            ) : (
              <div className="text-center text-white px-6">
                <div className="w-20 h-20 rounded-full bg-aubergine-700 mx-auto mb-3 flex items-center justify-center text-2xl font-black">
                  {initials}
                </div>
                <p className="font-bold">{doctor}</p>
                <p className={`text-xs mt-1.5 flex items-center justify-center gap-1.5 ${call.connectionState === 'failed' ? 'text-rose-400' : 'text-slate-400'}`}>
                  {!failedOrEnded && call.connectionState !== 'peer-left' && <i className="fas fa-circle-notch fa-spin"></i>}
                  {callStatusCopy(call)}
                </p>
              </div>
            )}

            {call.peerMuted && call.remoteStream && (
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                <i className="fas fa-microphone-slash text-rose-400"></i> Doctor is muted
              </div>
            )}

            <div className="absolute bottom-3 right-3 w-24 h-16 bg-slate-700 rounded-xl border border-white/10 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              {call.isVideoOff || !call.localStream ? (
                <i className="fas fa-video-slash text-slate-500 text-xl"></i>
              ) : (
                <VideoTile stream={call.localStream} muted mirrored />
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={call.toggleMute} disabled={!call.localStream}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all disabled:opacity-40 ${call.isMuted ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <i className={`fas ${call.isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={end} className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xl shadow-lg">
              <i className="fas fa-phone-slash"></i>
            </button>
            <button onClick={call.toggleVideo} disabled={!call.localStream}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all disabled:opacity-40 ${call.isVideoOff ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <i className={`fas ${call.isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
const STATUS_LABEL = {
  Requested: 'Pending',
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
  // transactions/payAppointment come from ClinicDataContext (not fetched
  // locally) — the same cache Billing.jsx reads, so a payment made on
  // either page is immediately reflected on both.
  const { appointments, addAppointment, cancelAppointment, waitlist, joinWaitlist, leaveWaitlist, transactions, payAppointment, refreshAppointments } = useClinicData();
  const [doctors, setDoctors] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [showJoinWaitlist, setShowJoinWaitlist] = useState(false);

  useEffect(() => {
    apiFetch('/doctors/search').then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const doctorById = useMemo(() => new Map(doctors.map(d => [d.id, d])), [doctors]);
  const todayStr = todayLocalStr();

  // Appointment status and payment status are tracked independently on the
  // backend (booking never implies paid) — this is the only way the UI can
  // tell whether a given appointment still needs payment.
  const paidAppointmentIds = useMemo(
    () => new Set(transactions.filter(t => t.status === 'Paid').map(t => t.appointment_id)),
    [transactions]
  );

  const toRow = (a) => {
    const doc = doctorById.get(a.doctorId);
    return {
      id: a.id,
      doctorId: a.doctorId,
      doctor: `Dr. ${a.doctorName}`,
      specialty: doc?.specialty || 'Specialist',
      date: a.date,
      dateLabel: a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      time: a.time,
      status: STATUS_LABEL[a.status] || a.status,
      type: a.type,
      fee: doc?.consultation_fee ?? 799,
      isPaid: paidAppointmentIds.has(a.id),
    };
  };

  const upcoming = useMemo(() => appointments
    .filter(a => !['Done', 'Cancelled', 'No Show'].includes(a.status))
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
  const [videoTarget, setVideoTarget] = useState(null);
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
      // Not in this session's cached appointments — likely a call that
      // started after the initial fetch (e.g. the doctor's instant-call
      // feature creates a brand-new appointment). Pull fresh data instead
      // of waiting on a re-render that may never come.
      try {
        const fresh = await refreshAppointments();
        const raw = fresh.find(a => a.id === appointmentId && !['Done', 'Cancelled', 'No Show'].includes(a.status));
        match = raw ? toRow(raw) : null;
      } catch {
        match = null; // network hiccup — fall through to the "couldn't open" toast below rather than failing silently
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
      // Clear the param either way — openCallFor already did its own
      // fetch-fresh fallback, so a miss here means the call genuinely isn't
      // reachable (already ended, wrong id), not that we should keep retrying.
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
    let data = tab === 'upcoming' ? upcoming : past;
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
      setSuccessApt(toRow(saved));
      toast('Appointment requested! We\'ll confirm it shortly.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to book appointment', 'error');
      throw err; // let BookingModal know booking failed so it doesn't reset/close
    }
  };

  const handleCancel = async () => {
    // Read before the await — ConfirmModal calls onClose() right after this
    // regardless of outcome, so cancelTarget may already be null by the time
    // a rejected promise unwinds here.
    const { id, doctor: doctorName } = cancelTarget;
    try {
      await cancelAppointment(id);
      toast(`Appointment with ${doctorName} cancelled. Refund initiated.`, 'info');
    } catch (err) {
      // ConfirmModal doesn't await onConfirm, so without this catch a failed
      // cancellation silently rolled the row back with zero feedback.
      toast(err.message || 'Failed to cancel appointment. Please try again.', 'error');
    }
  };

  const handleJoinWaitlist = async (doctorId, preferredWindow) => {
    try {
      await joinWaitlist(doctorId, preferredWindow);
      toast('Added to the waitlist. We\'ll notify you when a slot opens.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to join waitlist.', 'error');
      throw err; // let JoinWaitlistModal know it failed so it doesn't reset/close
    }
  };

  // "Pay Now" opens the same method-selection/confirmation modal Billing.jsx
  // uses, instead of silently charging a hardcoded UPI payment on a single click.
  const [payTarget, setPayTarget] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const openPayFor = (apt) => {
    setPayTarget(apt);
    setShowPayModal(true);
  };

  const handlePaySuccess = async (method) => {
    try {
      await payAppointment(payTarget.id, method);
      toast('Payment successful!', 'success');
    } catch (err) {
      toast(err.message || 'Payment failed. Please try again.', 'error');
      throw err;
    }
  };

  const handleWaitlistCancel = async (entry) => {
    try {
      await leaveWaitlist(entry.id);
      toast(`Removed from waitlist for ${doctorById.get(entry.doctor_id)?.full_name || 'the doctor'}.`, 'info');
    } catch (err) {
      toast(err.message || 'Failed to leave waitlist.', 'error');
    }
  };

  const STATUS_BADGE = {
    Confirmed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-100',
    Completed: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">My Appointments</h1>
          <p className="text-sm text-slate-500">Manage your upcoming and past consultations.</p>
        </div>
        <button onClick={() => { setBookPrefill({}); setShowBook(true); }}
          className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <i className="fas fa-plus"></i> Book New
        </button>
      </div>

      {/* Success Banner */}
      {successApt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-circle-check"></i>
            </div>
            <div>
              <p className="font-bold text-emerald-800">Appointment Confirmed!</p>
              <p className="text-xs text-emerald-700">{successApt.doctor} • {successApt.dateLabel} • {successApt.time}</p>
            </div>
          </div>
          <button onClick={() => setSuccessApt(null)} className="text-emerald-600 hover:text-emerald-800"><i className="fas fa-xmark"></i></button>
        </div>
      )}

      {/* Tabs + Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          {[['upcoming', 'Upcoming', upcoming.length], ['past', 'Past History', past.length]].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm font-bold transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-white">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctor, specialty, or ID..."
              className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 outline-none">
            <option value="All Types">All Types</option>
            <option value="Video Consult">Video Consult</option>
            <option value="Clinic Visit">Clinic Visit</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 outline-none">
            <option value="All Status">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Doctor</th>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredData.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{apt.doctor}</div>
                    <div className="text-xs text-slate-500">{apt.specialty}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{apt.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-aubergine-700">{apt.dateLabel}</div>
                    <div className="text-xs text-slate-500">{apt.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-max">
                      <i className={`fas ${apt.type === 'Video Consult' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {apt.type}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">₹{apt.fee}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[apt.status] || 'bg-slate-100 text-slate-600'}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {tab === 'upcoming' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setCancelTarget(apt)}
                          className="text-rose-500 hover:text-rose-700 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors text-xs">
                          Cancel
                        </button>
                        {apt.type === 'Video Consult' && apt.status === 'Confirmed' && (
                          <button onClick={() => setVideoTarget(apt)}
                            className="bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-sm px-4 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-1.5">
                            <i className="fas fa-video"></i> Join Call
                          </button>
                        )}
                        {!apt.isPaid && (
                          <button onClick={() => openPayFor(apt)}
                            className="bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm px-4 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-1.5">
                            <i className="fas fa-credit-card"></i> Pay Now
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toast('Appointment summaries are coming soon.', 'info')}
                          className="text-slate-500 hover:text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-xs flex items-center gap-1.5">
                          <i className="fas fa-download"></i> Summary
                        </button>
                        <button onClick={() => { setBookPrefill({ doctorId: apt.doctorId, followUp: true }); setShowBook(true); }}
                          className="text-aubergine-600 font-bold hover:text-aubergine-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-aubergine-50 text-xs flex items-center gap-1.5">
                          <i className="fas fa-calendar-plus"></i> Follow-up
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
      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Appointment?"
        message={`Are you sure you want to cancel your appointment with ${cancelTarget?.doctor}? A refund will be initiated within 3–5 business days.`}
        confirmLabel="Yes, Cancel"
        confirmStyle="danger"
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
        amount={payTarget?.fee ?? 0}
        description={payTarget ? `Consultation — ${payTarget.doctor}` : ''}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}

export default PatientAppointments;
