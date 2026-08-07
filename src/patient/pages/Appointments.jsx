import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

/* ─── Dummy Data ─────────────────────────────── */
const DOCTORS = [
  'Dr. Sarah Mitchell (Gynaecologist)',
  'Dr. Ananya Mehta (Endocrinologist)',
  'Dr. Ritu Khanna (Thyroid)',
  'Dr. Shreya Verma (Dermatologist)',
  'Dr. Priya Nair (Sexual Health)',
];
const SLOTS = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '4:00 PM', '5:30 PM'];

let nextId = 200;

const INITIAL_UPCOMING = [
  { id: 'APT-101', doctor: 'Dr. Sarah Mitchell', specialty: 'Gynaecologist', date: '2026-08-10', dateLabel: '10 Aug 2026', time: '10:30 AM', status: 'Confirmed', type: 'Video Consult', fee: 799 },
  { id: 'APT-102', doctor: 'Dr. Anita Sharma', specialty: 'Endocrinologist', date: '2026-08-25', dateLabel: '25 Aug 2026', time: '11:15 AM', status: 'Pending', type: 'Clinic Visit', fee: 899 },
];

const INITIAL_PAST = [
  { id: 'APT-098', doctor: 'Dr. Sarah Mitchell', specialty: 'Gynaecologist', date: '2026-06-10', dateLabel: '10 Jun 2026', time: '2:00 PM', status: 'Completed', type: 'Video Consult', fee: 799 },
  { id: 'APT-087', doctor: 'Dr. Ritu Khanna', specialty: 'Endocrinologist', date: '2026-05-12', dateLabel: '12 May 2026', time: '11:00 AM', status: 'Completed', type: 'Clinic Visit', fee: 899 },
];

const WAITLIST = { doctor: 'Dr. Meera Reddy (Gynecology)', requested: 'Tomorrow, Morning Slot', position: 4 };

/* ─── Booking Modal ──────────────────────────── */
function BookingModal({ isOpen, onClose, onBook, prefill = {} }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    doctor: prefill.doctor || '',
    type: prefill.type || 'Video Consult',
    date: '',
    slot: '',
    notes: '',
  });

  const reset = () => { setStep(1); setForm({ doctor: '', type: 'Video Consult', date: '', slot: '', notes: '' }); onClose(); };

  const confirm = () => {
    onBook({ ...form });
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={reset} title={prefill.followUp ? 'Book Follow-up' : 'Book Appointment'} size="md">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Doctor *</label>
            <select value={form.doctor} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
              <option value="">-- Choose a specialist --</option>
              {DOCTORS.map(d => <option key={d}>{d}</option>)}
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
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any specific concerns or symptoms..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>
          <button disabled={!form.doctor || !form.date} onClick={() => setStep(2)}
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
            <div className="flex justify-between"><span className="font-bold text-slate-600">Doctor</span><span className="text-slate-800">{form.doctor}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Type</span><span className="text-slate-800">{form.type}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Date & Time</span><span className="text-slate-800">{form.date} • {form.slot || '—'}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-600">Consult Fee</span><span className="text-aubergine-700 font-black">₹799</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">← Back</button>
            <button disabled={!form.slot} onClick={confirm}
              className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <i className="fas fa-circle-check"></i> Confirm
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Video Call Modal ───────────────────────── */
function VideoCallModal({ isOpen, onClose, doctor, toast }) {
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vidOff, setVidOff] = useState(false);

  const join = () => { setActive(true); toast('Connected to video consultation!', 'success'); };
  const end = () => { setActive(false); onClose(); toast('Call ended. Summary emailed to you.', 'info'); };

  return (
    <Modal isOpen={isOpen} onClose={() => { setActive(false); onClose(); }} title="Video Consultation" size="lg">
      {!active ? (
        <div className="text-center space-y-5 py-2">
          <div className="w-20 h-20 rounded-3xl bg-aubergine-50 mx-auto flex items-center justify-center text-3xl font-black text-aubergine-700">
            {doctor?.split(' ').slice(1).map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-xl">{doctor}</h4>
            <p className="text-sm text-emerald-600 font-semibold mt-1 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Online & Ready
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
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-aubergine-700 mx-auto mb-3 flex items-center justify-center text-2xl font-black">
                {doctor?.split(' ').slice(1).map(n => n[0]).join('')}
              </div>
              <p className="font-bold">{doctor}</p>
              <p className="text-slate-400 text-xs mt-1">● Live</p>
            </div>
            <div className="absolute bottom-3 right-3 w-24 h-16 bg-slate-700 rounded-xl border border-white/10 flex items-center justify-center text-white text-xs font-bold">
              {vidOff ? <i className="fas fa-video-slash text-slate-400 text-xl"></i> : 'You'}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setMuted(!muted)} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${muted ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={end} className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xl shadow-lg">
              <i className="fas fa-phone-slash"></i>
            </button>
            <button onClick={() => setVidOff(!vidOff)} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${vidOff ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <i className={`fas ${vidOff ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientAppointments() {
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [upcoming, setUpcoming] = useState(INITIAL_UPCOMING);
  const [past] = useState(INITIAL_PAST);
  const [waitPos, setWaitPos] = useState(WAITLIST.position);

  // Modals
  const [showBook, setShowBook] = useState(false);
  const [bookPrefill, setBookPrefill] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [videoTarget, setVideoTarget] = useState(null);
  const [successApt, setSuccessApt] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');

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

  const handleBook = (form) => {
    const newApt = {
      id: `APT-${++nextId}`,
      doctor: form.doctor.split('(')[0].trim(),
      specialty: form.doctor.match(/\((.*)\)/)?.[1] || 'Specialist',
      date: form.date,
      dateLabel: new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: form.slot,
      status: 'Pending',
      type: form.type,
      fee: 799,
    };
    setUpcoming(prev => [...prev, newApt].sort((a, b) => a.date.localeCompare(b.date)));
    setSuccessApt(newApt);
    toast('Appointment booked! Confirmation SMS sent.', 'success');
  };

  const handleCancel = () => {
    setUpcoming(prev => prev.filter(a => a.id !== cancelTarget.id));
    toast(`Appointment with ${cancelTarget.doctor} cancelled. Refund initiated.`, 'info');
    setCancelTarget(null);
  };

  const handleWaitlistCancel = () => {
    toast('Removed from waitlist for Dr. Meera Reddy.', 'info');
    setWaitPos(null);
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
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
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
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{apt.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-aubergine-700">{apt.dateLabel}</div>
                    <div className="text-xs text-slate-500">{apt.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-max">
                      <i className={`fas ${apt.type === 'Video Consult' ? 'fa-video' : 'fa-hospital'} text-[10px]`}></i> {apt.type}
                    </span>
                    <div className="text-xs text-slate-400 mt-1">₹{apt.fee}</div>
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
                        {apt.status === 'Pending' && (
                          <button onClick={() => toast('Reminder: Payment due before appointment', 'warning')}
                            className="bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-sm px-4 py-1.5 rounded-lg transition-colors text-xs flex items-center gap-1.5">
                            <i className="fas fa-clock"></i> Pending
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toast('Downloading appointment summary...', 'info')}
                          className="text-slate-500 hover:text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-xs flex items-center gap-1.5">
                          <i className="fas fa-download"></i> Summary
                        </button>
                        <button onClick={() => { setBookPrefill({ doctor: apt.doctor, followUp: true }); setShowBook(true); }}
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
      {waitPos !== null && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Waitlist Requests</h3>
            <span className="text-xs text-slate-500">{waitPos > 0 ? `Position #${waitPos}` : 'Active'}</span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <div>
                <h4 className="font-bold text-amber-900 text-sm">{WAITLIST.doctor}</h4>
                <p className="text-xs text-amber-700 mt-1">Requested for: {WAITLIST.requested}</p>
                <button onClick={() => toast('Waitlist notification preferences saved', 'success')}
                  className="mt-2 text-xs text-amber-700 underline font-semibold">Notify me when slot opens</button>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-600">#{waitPos}</div>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">In Queue</div>
                </div>
                <button onClick={handleWaitlistCancel}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-1 rounded-lg hover:bg-rose-50 transition-colors border border-rose-200">
                  Leave Queue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BookingModal isOpen={showBook} onClose={() => setShowBook(false)} onBook={handleBook} prefill={bookPrefill} />
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
        <VideoCallModal isOpen={!!videoTarget} onClose={() => setVideoTarget(null)} doctor={videoTarget?.doctor} toast={toast} />
      )}
    </div>
  );
}

export default PatientAppointments;
