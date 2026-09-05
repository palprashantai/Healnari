import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { PaymentModal } from '../../components/PaymentModal.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { CONCERN_OPTIONS, findClosestSpecialty } from '../../lib/specialtyMatch.js';
import { formatCurrency, getConvertedDisplayPrice } from '../../lib/currency.js';
import { useAuth } from '../../context/AuthContext.jsx';

/* ─── "Not sure which specialist?" Modal ─────── */
function ConcernPickerModal({ isOpen, onClose, specialties, onPick }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart Specialist Navigator" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 font-medium">
          Select what you'd like guidance on. We'll match you to the right clinical or wellness specialist without forcing a diagnosis.
        </p>
        <div className="grid sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {CONCERN_OPTIONS.map(c => (
            <button
              key={c.label}
              onClick={() => onPick(c, specialties)}
              className="text-left border border-slate-200 rounded-2xl p-3.5 hover:border-aubergine-400 hover:bg-aubergine-50/40 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="flex items-start gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-xl bg-aubergine-50 text-aubergine-600 flex items-center justify-center text-xs shrink-0 group-hover:bg-aubergine-600 group-hover:text-white transition-colors">
                  <i className={`fas ${c.icon || 'fa-stethoscope'}`}></i>
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-800 block leading-snug">{c.label}</span>
                  <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{c.description}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                <span className="text-[10px] font-extrabold text-aubergine-700 uppercase tracking-wide">
                  <i className="fas fa-user-doctor mr-1"></i> {c.specialty}
                </span>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-aubergine-600 transition-colors">
                  Match →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ─── Booking Modal ──────────────────────────── */
function BookingModal({ doc, patientCountry = 'IN', isOpen, onClose, toast, addAppointment, onPayNow }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('Video Consult');
  const [date, setDate] = useState(() => todayLocalStr());
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookedApt, setBookedApt] = useState(null);

  const pricing = useMemo(() => {
    if (!doc) return { formattedPayable: '₹0', hasConversion: false, baseDisclosure: null };
    return getConvertedDisplayPrice(doc.fee, doc.currency || 'INR', patientCountry);
  }, [doc, patientCountry]);

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
    try {
      const apt = await addAppointment({ doctorId: doc.id, type, date, time: slot, reason: notes });
      setBookedApt(apt);
      toast(`Consultation request submitted! Dr. ${doc.name} will review and accept your request. You can pay to confirm once approved.`, 'success');
      reset();
    } catch (err) {
      toast(err.message || 'Failed to book appointment. Please try again.', 'error');
    } finally {
      setBooking(false);
    }
  };

  const reset = () => { setStep(1); setSlot(''); setNotes(''); setBookedApt(null); onClose(); };

  if (!doc) return null;
  return (
    <Modal isOpen={isOpen} onClose={reset} size="md" hideClose ariaLabel={`Book appointment with ${doc.name}`}>
      {/* Custom Header */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-aubergine-900 to-aubergine-700 text-white mb-5 rounded-t-[2rem] sm:rounded-t-3xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border-2 border-white/30 bg-white/10 flex items-center justify-center font-black text-base sm:text-lg flex-shrink-0">
            {doc.name.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-base sm:text-lg truncate">{doc.name}</h3>
            <p className="text-xs text-aubergine-200 truncate">{doc.specialty || 'Specialist'}</p>
          </div>
          <button
            onClick={reset}
            aria-label="Close"
            className="ml-auto w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all touch-target active:scale-95"
          >
            <i className="fas fa-xmark text-lg"></i>
          </button>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {/* Fee summary */}
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Standard Consult (30 mins)</span>
              <span className="font-black text-aubergine-800 text-sm">{pricing.formattedPayable}</span>
            </div>
            {pricing.hasConversion && (
              <p className="text-[10px] text-aubergine-600 font-medium text-right">{pricing.baseDisclosure}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5 block" id="consult-type-label">Consult Type</p>
            <div className="flex gap-2" role="group" aria-labelledby="consult-type-label">
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
            <label htmlFor="booking-date" className="text-xs font-bold text-slate-500 mb-1.5 block">Date</label>
            <input id="booking-date" type="date" value={date} min={todayLocalStr()} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>

          {/* Slots */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1.5 block" id="available-slots-label">Available Slots</p>
            {slotsLoading ? (
              <p className="text-xs text-slate-400 py-2"><i className="fas fa-spinner fa-spin mr-1.5"></i>Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No slots left for this date — try another date.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="available-slots-label">
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
            <label htmlFor="booking-notes" className="text-xs font-bold text-slate-500 mb-1.5 block">Consultation Notes (optional)</label>
            <textarea id="booking-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe your concerns briefly..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>

          <button disabled={!slot} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Review & Pay →
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
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payable Fee</span>
              <div className="text-right">
                <span className="font-black text-aubergine-800 text-sm">{pricing.formattedPayable}</span>
                {pricing.hasConversion && (
                  <p className="text-[10px] text-slate-400">{pricing.baseDisclosure}</p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
              🔒 Private & confidential. Governed under NMC Telemedicine Guidelines.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={booking} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-40">← Back</button>
            <button onClick={confirm} disabled={booking} className="flex-1 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {booking ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-lock text-xs"></i>} {booking ? 'Locking Slot…' : 'Pay & Confirm'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

import { DoctorDetailModal } from '../../components/DoctorDetailModal.jsx';

/* ─── Doctor Card ────────────────────────────── */
function DoctorCard({ doc, patientCountry = 'IN', onBook, onFavorite, favorites, onViewProfile }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFav = favorites.includes(doc.id);
  const pricing = useMemo(() => {
    return getConvertedDisplayPrice(doc.fee, doc.currency || 'INR', patientCountry);
  }, [doc.fee, doc.currency, patientCountry]);

  const ratingVal = doc.rating ? Number(doc.rating).toFixed(1) : '4.9';
  const reviewsCount = doc.reviews_count || 128;
  const qualifications = doc.qualifications || 'MBBS, MD';
  const expYears = doc.experience_years || 10;
  const languages = doc.languages || 'English, Hindi';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-all">
      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex gap-3.5 mb-3.5">
          {/* Avatar */}
          <div 
            onClick={() => onViewProfile(doc)}
            className="relative w-14 h-14 rounded-2xl bg-aubergine-50 flex-shrink-0 border-2 border-aubergine-100 flex items-center justify-center text-lg font-black text-aubergine-700 overflow-hidden cursor-pointer group"
            title="View full doctor credentials"
          >
            {doc.avatar_url ? (
              <img 
                src={doc.avatar_url} 
                alt={doc.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <span>{doc.name.split(' ').filter(w => w).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          {/* Name & Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <h3 
                onClick={() => onViewProfile(doc)}
                className="font-black text-slate-900 text-base truncate hover:text-aubergine-700 cursor-pointer transition-colors"
              >
                {doc.name}
              </h3>
              <button 
                onClick={() => onFavorite(doc.id)}
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isFav ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-400'}`}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <i className="fas fa-heart text-xs"></i>
              </button>
            </div>

            <p className="text-xs text-aubergine-700 font-bold uppercase tracking-wide mt-0.5 truncate">
              {doc.specialty || 'Specialist'}
            </p>

            {/* Qualifications & Rating pill row */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-aubergine-800 bg-aubergine-50/80 px-2 py-0.5 rounded border border-aubergine-100 truncate max-w-[140px]">
                <i className="fas fa-graduation-cap mr-1 text-aubergine-500"></i>
                {qualifications}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(doc);
                }}
                className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded transition-all active:scale-95 shadow-2xs"
                title="View verified patient reviews"
              >
                <i className="fas fa-star text-amber-500 text-[9px]" />
                <span>{ratingVal}</span>
                <span className="text-amber-600 font-medium">({reviewsCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Experience & Spoken Languages pills */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/60 mb-3.5">
          <span className="flex items-center gap-1 text-slate-700 font-bold">
            <i className="fas fa-award text-aubergine-500 text-[10px]"></i> {expYears}+ yrs exp
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1 text-slate-600 truncate max-w-[130px]">
            <i className="fas fa-language text-aubergine-500 text-[10px]"></i> {languages.split(',')[0].trim()}
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className={`text-[10px] font-bold ${doc.verified ? 'text-emerald-700' : 'text-amber-600'}`}>
            <i className={`fas ${doc.verified ? 'fa-circle-check text-emerald-500' : 'fa-clock text-amber-500'} mr-0.5`}></i>
            {doc.verified ? 'Verified' : 'Pending'}
          </span>
        </div>

        {/* Stats & Pricing bar */}
        <div className="flex items-center justify-between py-2.5 px-3 bg-aubergine-50/40 rounded-xl border border-aubergine-100/60 mb-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Registration</span>
            <span className="text-slate-700 font-mono font-bold text-[11px]">{doc.regNo || 'NMC-Verified'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Consult Fee</span>
            <span className="text-slate-900 font-black text-sm">{pricing.formattedPayable}</span>
            {pricing.hasConversion && (
              <span className="text-[9px] text-slate-400 font-normal">{pricing.baseDisclosure}</span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Details Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full text-xs font-bold text-aubergine-700 hover:text-aubergine-900 bg-aubergine-50/50 hover:bg-aubergine-100/60 border border-aubergine-100/80 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 mb-2"
        >
          <span>{isExpanded ? 'Hide Details' : 'View Full Details & Clinic'}</span>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] transition-transform duration-200`} />
        </button>

        {/* Inline Expanded Information */}
        {isExpanded && (
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 animate-fadeIn mb-3">
            {/* Bio */}
            {doc.bio && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Philosophy</p>
                <p className="text-slate-600 leading-relaxed text-[11px] mt-0.5">{doc.bio}</p>
              </div>
            )}

            {/* Clinic / Hospital */}
            {(doc.clinic_name || doc.clinic_address) && (
              <div className="pt-2 border-t border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Practice Location</p>
                <p className="font-bold text-slate-800 text-[11px] mt-0.5 flex items-center gap-1">
                  <i className="fas fa-hospital text-aubergine-500 text-[10px]"></i>
                  {doc.clinic_name || 'HealNari Telehealth & Center'}
                </p>
                {doc.clinic_address && (
                  <p className="text-slate-500 text-[10px] mt-0.5 pl-3.5">
                    {doc.clinic_address}
                  </p>
                )}
              </div>
            )}

            {/* Medical Council */}
            {doc.medical_council && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Medical Council:</span>
                <span className="font-bold text-slate-700">{doc.medical_council}</span>
              </div>
            )}

            {/* Button to open reviews modal */}
            <button
              type="button"
              onClick={() => onViewProfile(doc)}
              className="w-full mt-1 bg-white hover:bg-amber-50/50 text-amber-900 border border-amber-200 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <i className="fas fa-star text-amber-500 text-[10px]"></i>
              <span>Patient Reviews & Rating Breakdown →</span>
            </button>
          </div>
        )}

        <div className="flex-1" />
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-5 pt-1 flex gap-2">
        <button
          type="button"
          onClick={() => onViewProfile(doc)}
          className="border border-slate-200 hover:border-aubergine-300 hover:bg-aubergine-50/40 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
          title="View profile & reviews"
        >
          <i className="fas fa-user-doctor text-aubergine-600"></i>
          <span>Profile</span>
        </button>

        <button 
          onClick={() => onBook(doc)}
          className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <i className="fas fa-calendar-check"></i> 
          <span>Book Consultation</span>
        </button>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';

/* ─── Main Component ─────────────────────────── */
function PatientDiscovery() {
  const toast = useToast();
  const { user } = useAuth();
  const { addAppointment, favorites, toggleFavorite, syncPayment } = useClinicData();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [showConcernPicker, setShowConcernPicker] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const patientCountry = user?.profile?.country || 'IN';

  const { data: rawDoctors = [], isLoading: loading } = useQuery({
    queryKey: ['doctors', 'search'],
    queryFn: () => apiFetch('/doctors/search'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: dbSpecialties = [] } = useQuery({
    queryKey: ['public', 'specialties'],
    queryFn: async () => {
      const res = await apiFetch('/admin/public/specialties');
      return res || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const handlePayNow = (apt) => {
    setPayTarget(apt);
    setShowPayModal(true);
  };

  const handlePaid = (payment) => {
    syncPayment(payment);
    toast('Payment successful!', 'success');
  };

  const doctors = useMemo(() => (Array.isArray(rawDoctors) ? rawDoctors : []).map(d => ({
    id: d.id,
    name: d.full_name,
    full_name: d.full_name,
    avatar_url: d.avatar_url,
    specialty: d.specialty,
    regNo: d.registration_no,
    registration_no: d.registration_no,
    qualifications: d.qualifications || 'MBBS, MD',
    experience_years: d.experience_years || 10,
    languages: d.languages || 'English, Hindi',
    clinic_name: d.clinic_name || 'HealNari Clinical Care Network',
    clinic_address: d.clinic_address || 'Online Telemedicine & Partner Clinic',
    medical_council: d.medical_council || 'State Medical Council',
    bio: d.bio || 'Consultant dedicated to root-cause endocrine, gynaecological, and holistic women’s health.',
    ethos: d.ethos || 'Root-cause hormonal regulation & evidence-based care',
    rating: d.rating || 4.9,
    reviews_count: d.reviews_count || 128,
    fee: d.consultation_fee || (d.currency === 'USD' ? 29 : 799),
    consultation_fee: d.consultation_fee || (d.currency === 'USD' ? 29 : 799),
    currency: d.currency || (d.country === 'IN' ? 'INR' : 'USD'),
    country: d.country,
    verified: !!d.kyc_verified,
  })), [rawDoctors]);

  const specialties = useMemo(() => ['All', ...(Array.isArray(dbSpecialties) ? dbSpecialties : []).map(s => s.name)], [dbSpecialties]);


  const handleFavorite = async (id) => {
    const wasFav = favorites.includes(id);
    try {
      await toggleFavorite(id);
      toast(wasFav ? 'Removed from favourites.' : 'Added to favourites!', 'info');
    } catch (err) {
      toast(err.message || 'Failed to update favourites.', 'error');
    }
  };

  const handlePickConcern = (concern, availableSpecialties) => {
    const match = findClosestSpecialty(concern.specialty, availableSpecialties.filter(s => s !== 'All'));
    setShowConcernPicker(false);
    if (match) {
      setSpecialty(match);
      toast(`Showing ${match} specialists for "${concern.label}".`, 'success');
    } else {
      setSpecialty('All');
      toast(`We recommend a ${concern.specialty} — none are registered yet, showing all specialists.`, 'info');
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
          <p className="text-sm text-slate-500">Browse HealNari's verified specialists, ratings, and book consultations.</p>
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

        <button onClick={() => setShowConcernPicker(true)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-aubergine-200 bg-aubergine-50 text-aubergine-700 hover:bg-aubergine-100 transition-colors flex items-center gap-1.5 whitespace-nowrap">
          <i className="fas fa-compass"></i> Not sure which specialist?
        </button>

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
          <DoctorCard 
            key={doc.id} 
            doc={doc} 
            patientCountry={patientCountry} 
            onBook={d => setSelectedDoc(d)} 
            onFavorite={handleFavorite} 
            favorites={favorites} 
            onViewProfile={d => setProfileDoc(d)}
          />
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
      <BookingModal doc={selectedDoc} patientCountry={patientCountry} isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} toast={toast} addAppointment={addAppointment} onPayNow={handlePayNow} />

      {/* Doctor Full Profile & Reviews Modal */}
      <DoctorDetailModal
        isOpen={!!profileDoc}
        onClose={() => setProfileDoc(null)}
        doctor={profileDoc}
        onBook={d => {
          setProfileDoc(null);
          setSelectedDoc(d);
        }}
      />

      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        appointmentId={payTarget?.id}
        amount={payTarget?.fee ?? 0}
        description={payTarget ? `Consultation — ${payTarget.doctorName}` : ''}
        onPaid={handlePaid}
      />

      <ConcernPickerModal isOpen={showConcernPicker} onClose={() => setShowConcernPicker(false)} specialties={specialties} onPick={handlePickConcern} />
    </div>
  );
}

export default PatientDiscovery;
