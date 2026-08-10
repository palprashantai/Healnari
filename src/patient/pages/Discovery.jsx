import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';

const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking', 'Wallet'];

/* ─── Booking Modal ──────────────────────────── */
function BookingModal({ doc, isOpen, onClose, toast, addAppointment }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('Video Consult');
  const [date, setDate] = useState(todayLocalStr);
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState('UPI');
  const [booking, setBooking] = useState(false);
  const [bookedApt, setBookedApt] = useState(null);

  useEffect(() => {
    if (!doc || !date) return;
    setSlot('');
    setSlotsLoading(true);
    apiFetch(`/doctors/${doc.id}/slots?date=${date}`)
      .then(res => setSlots(res.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [doc, date]);

  const confirm = async () => {
    setBooking(true);
    // Booking and payment are two separate calls — if payment fails after the
    // appointment was already created, the appointment still exists (status
    // Requested). Treating that as one failure would tell the patient
    // "booking failed" when retrying would actually create a duplicate.
    let apt;
    try {
      apt = await addAppointment({ doctorId: doc.id, type, date, time: slot, reason: notes });
    } catch (err) {
      toast(err.message || 'Failed to book appointment. Please try again.', 'error');
      setBooking(false);
      return;
    }
    try {
      await apiFetch('/billing/pay', { method: 'POST', body: { appointmentId: apt.id, method } });
      setBookedApt(apt);
      setStep(3);
      toast(`Appointment booked with ${doc?.name}!`, 'success');
    } catch (err) {
      setBookedApt(apt);
      setStep(3);
      toast('Appointment booked, but payment could not be processed. You can pay from My Appointments.', 'error');
    } finally {
      setBooking(false);
    }
  };

  const reset = () => { setStep(1); setSlot(''); setNotes(''); setBookedApt(null); onClose(); };

  if (!doc) return null;
  return (
    <Modal isOpen={isOpen} onClose={reset} size="md" hideClose ariaLabel={`Book appointment with ${doc.name}`}>
      {/* Custom Header */}
      <div className="-mx-6 -mt-6 px-6 py-5 bg-gradient-to-r from-aubergine-900 to-aubergine-700 text-white mb-5 rounded-t-3xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border-2 border-white/30 bg-white/10 flex items-center justify-center font-black text-lg flex-shrink-0">
            {doc.name.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-black text-lg">{doc.name}</h3>
            <p className="text-xs text-aubergine-200">{doc.specialty || 'Specialist'}</p>
          </div>
          <button onClick={reset} className="ml-auto text-white/60 hover:text-white"><i className="fas fa-xmark text-xl"></i></button>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {/* Fee summary */}
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs flex justify-between">
            <span className="text-slate-600 font-medium">Standard Consult (30 mins)</span>
            <span className="font-black text-aubergine-800">₹{doc.fee}</span>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Consult Type</label>
            <div className="flex gap-2">
              {['Video Consult', 'Clinic Visit'].map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${type === t ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  <i className={`fas ${t === 'Video Consult' ? 'fa-video' : 'fa-hospital'}`}></i> {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Date</label>
            <input type="date" value={date} min={todayLocalStr()} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>

          {/* Slots */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Available Slots</label>
            {slotsLoading ? (
              <p className="text-xs text-slate-400 py-2"><i className="fas fa-spinner fa-spin mr-1.5"></i>Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No slots left for this date — try another date.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map(s => (
                  <button key={s} onClick={() => setSlot(s)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${slot === s ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Consultation Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe your concerns briefly..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>

          <button disabled={!slot} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Review & Confirm →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span className="font-bold text-slate-800">{doc.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-bold text-slate-800">{type}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-bold text-slate-800">{date}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slot</span><span className="font-bold text-slate-800">{slot}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Fee</span><span className="font-black text-aubergine-800">₹{doc.fee}</span></div>
            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
              🔒 Private & confidential. Governed under NMC Telemedicine Guidelines, India.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${method === m ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">← Back</button>
            <button onClick={confirm} disabled={booking} className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {booking ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-lock text-xs"></i>} {booking ? 'Booking…' : 'Pay & Book'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto border-2 border-emerald-200">
            <i className="fas fa-circle-check"></i>
          </div>
          <h4 className="font-black text-slate-800 text-xl">Appointment Booked!</h4>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your consultation has been confirmed and payment recorded.
          </p>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-left space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">With</span><span className="font-bold">{doc.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-bold">{date}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slot</span><span className="font-bold">{slot}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-bold">{type}</span></div>
          </div>
          <button onClick={reset} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Done</button>
        </div>
      )}
    </Modal>
  );
}

/* ─── Doctor Card ────────────────────────────── */
function DoctorCard({ doc, onBook, onFavorite, favorites }) {
  const isFav = favorites.includes(doc.id);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="p-6 flex-1">
        {/* Header */}
        <div className="flex gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-aubergine-50 flex-shrink-0 border-2 border-aubergine-100 flex items-center justify-center text-xl font-black text-aubergine-700">
            {doc.name.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-slate-800 text-base truncate">{doc.name}</h3>
              {doc.verified && <i className="fas fa-circle-check text-aubergine-600 text-xs flex-shrink-0" title="KYC Verified"></i>}
            </div>
            <p className="text-xs text-aubergine-700 font-bold uppercase tracking-wide mt-0.5">{doc.specialty || 'Specialist'}</p>
            {doc.regNo && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono border border-slate-200 inline-block mt-1">{doc.regNo}</span>}
          </div>
          <button onClick={() => onFavorite(doc.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isFav ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-400'}`}>
            <i className="fas fa-heart text-xs"></i>
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between py-3 border-y border-slate-100 mb-4 text-xs font-bold">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Status</span>
            <span className={doc.verified ? 'text-emerald-600' : 'text-amber-600'}>{doc.verified ? 'Verified' : 'Pending Verification'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Consult Fee</span>
            <span className="text-slate-800 font-black text-sm">₹{doc.fee}</span>
          </div>
        </div>
      </div>

      {/* Book Button */}
      <div className="px-6 pb-6">
        <button onClick={() => onBook(doc)}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
          <i className="fas fa-calendar-check"></i> Book Consultation
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientDiscovery() {
  const toast = useToast();
  const { addAppointment, favorites, toggleFavorite } = useClinicData();
  const [rawDoctors, setRawDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');

  useEffect(() => {
    apiFetch('/doctors/search')
      .then(setRawDoctors)
      .catch(() => setRawDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  const doctors = useMemo(() => rawDoctors.map(d => ({
    id: d.id,
    name: d.full_name,
    specialty: d.specialty,
    regNo: d.registration_no,
    fee: d.consultation_fee || 799,
    verified: !!d.kyc_verified,
  })), [rawDoctors]);

  const specialties = useMemo(() => ['All', ...new Set(doctors.map(d => d.specialty).filter(Boolean))], [doctors]);

  const handleFavorite = async (id) => {
    const wasFav = favorites.includes(id);
    try {
      await toggleFavorite(id);
      toast(wasFav ? 'Removed from favourites.' : 'Added to favourites!', 'info');
    } catch (err) {
      toast(err.message || 'Failed to update favourites.', 'error');
    }
  };

  const filtered = doctors.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.specialty || '').toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === 'All' || d.specialty === specialty;
    return matchSearch && matchSpec;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Find a Doctor</h1>
          <p className="text-sm text-slate-500">Browse HealNari's verified specialists and book a consultation.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {doctors.length} Specialist{doctors.length === 1 ? '' : 's'} Available
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialty..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50" />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {specialties.map(s => (
            <button key={s} onClick={() => setSpecialty(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${specialty === s ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
              {s}
            </button>
          ))}
        </div>

        {favorites.length > 0 && (
          <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
            <i className="fas fa-heart"></i> {favorites.length} Favourites
          </span>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500 font-medium">
        {loading ? 'Loading specialists…' : (
          <>Showing {filtered.length} of {doctors.length} specialists{search && <> matching "<strong>{search}</strong>"</>}</>
        )}
      </p>

      {/* Doctor Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(doc => (
          <DoctorCard key={doc.id} doc={doc} onBook={d => setSelectedDoc(d)} onFavorite={handleFavorite} favorites={favorites} />
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <i className="fas fa-user-doctor text-4xl mb-3 block"></i>
            <p className="font-bold">No doctors found matching your filters.</p>
            <button onClick={() => { setSearch(''); setSpecialty('All'); }} className="mt-3 text-aubergine-600 font-bold text-sm hover:underline">Reset Filters</button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal doc={selectedDoc} isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} toast={toast} addAppointment={addAppointment} />
    </div>
  );
}

export default PatientDiscovery;
