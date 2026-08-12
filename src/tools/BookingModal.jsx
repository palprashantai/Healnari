import React, { useState, useEffect } from 'react';
import { StepIndicator } from '../components/StepIndicator.jsx';
import { markLeadCaptured } from './leadCapture.js';
import { todayLocalStr } from '../lib/dateUtils.js';
import { apiFetch } from '../lib/apiClient.js';

const STEP_FIELDS = [
  ['doctorId', 'concern'],
  ['name', 'email', 'age', 'mobile'],
  ['date', 'time'],
];

function BookingModal({ selectedDoc, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    mobile: '',
    doctorId: '',
    concern: '',
    date: '',
    time: ''
  });

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // selectedDoc, when set (e.g. from the symptom checker), is a recommended
  // *specialty* — used only to pre-sort/hint the real doctor list below, not
  // a specific doctor id (the visitor still picks a real, verified doctor).
  useEffect(() => {
    apiFetch('/doctors/search', { skipAuth: true })
      .then(list => {
        setDoctors(list || []);
        if (selectedDoc) {
          const match = (list || []).find(d => (d.specialty || '').toLowerCase().includes(selectedDoc.toLowerCase()));
          if (match) setFormData(prev => ({ ...prev, doctorId: match.id }));
        }
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, [selectedDoc]);

  // Set the minimum selectable date to today's date
  const todayStr = todayLocalStr();

  const concernsList = [
    'PCOS / PCOD',
    'Hair fall / Thinning',
    'Irregular periods',
    'Hormonal imbalance',
    'Acne / Weight gain',
    'Thyroid'
  ];

  const timeSlots = [
    '10:00 AM',
    '11:30 AM',
    '2:00 PM',
    '4:30 PM',
    '6:00 PM'
  ];

  const FIELD_VALIDATORS = {
    name: () => (!formData.name.trim() ? 'Full name is required' : null),
    email: () => (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ? 'Enter a valid email address' : null),
    age: () => (!formData.age || formData.age < 12 || formData.age > 100 ? 'Enter a valid age (12-100)' : null),
    mobile: () => (!formData.mobile.match(/^[0-9]{10}$/) ? 'Enter a valid 10-digit mobile number' : null),
    doctorId: () => (!formData.doctorId ? 'Please select a doctor' : null),
    concern: () => (!formData.concern ? 'Please select your primary concern' : null),
    date: () => (!formData.date ? 'Select an appointment date' : null),
    time: () => (!formData.time ? 'Select an appointment slot' : null),
  };

  const validateFields = (fields) => {
    const errs = {};
    fields.forEach((f) => {
      const msg = FIELD_VALIDATORS[f]();
      if (msg) errs[f] = msg;
    });
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const selectDoctor = (id) => {
    setFormData((prev) => ({ ...prev, doctorId: id }));
    if (errors.doctorId) setErrors((prev) => ({ ...prev, doctorId: null }));
  };

  const goNext = () => {
    if (validateFields(STEP_FIELDS[step - 1])) setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const selectedDoctor = doctors.find(d => d.id === formData.doctorId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields(STEP_FIELDS[2])) return;

    // Format date beautifully
    const formattedDate = new Date(formData.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    setSubmitting(true);
    setSubmitError('');
    try {
      await apiFetch('/leads/consultation-request', {
        method: 'POST',
        skipAuth: true,
        body: {
          name: formData.name,
          email: formData.email,
          age: Number(formData.age),
          mobile: formData.mobile,
          concern: formData.concern,
          doctorId: formData.doctorId,
          preferredDate: formData.date,
          preferredTime: formData.time,
        },
      });
      markLeadCaptured();
      onSuccess({
        doctor: selectedDoctor?.full_name ? `Dr. ${selectedDoctor.full_name}` : 'your doctor',
        slot: `${formattedDate} at ${formData.time}`,
        name: formData.name,
        email: formData.email,
      });
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const stepLabels = ['Choose Doctor', 'Your Details', 'Schedule'];

  return (
    <div
      className="fixed inset-0 z-[9000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      {/* Modal Dialog container */}
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-slide-up flex flex-col my-auto max-h-[92vh]">

        {/* Sticky Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 id="booking-modal-title" className="font-extrabold text-xl text-slate-800 font-display">
                Book Your Consultation
              </h3>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">
                45-minute clinical digital review
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 hover:text-slate-600 transition btn-interactive"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Price visible from the very first screen */}
          <div className="mt-3.5 flex items-center justify-between bg-aubergine-50 border border-aubergine-100 rounded-xl px-3.5 py-2">
            <span className="text-[10px] font-extrabold text-aubergine-700 uppercase tracking-wider">Consultation fee</span>
            <span className="text-aubergine-800 text-base font-black">₹299 <span className="text-[10px] font-bold text-aubergine-500 normal-case">· incl. free digital prescription &amp; follow-up chat</span></span>
          </div>

          <div className="mt-4">
            <StepIndicator step={step} total={3} labels={stepLabels} />
          </div>
        </div>

        {/* Modal Form scrollable wrapper */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-grow space-y-4">

          {step === 1 && (
            <>
              {/* Choose Doctor */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1" id="choose-doctor-label">
                  Choose Your Doctor *
                </p>
                {loadingDoctors ? (
                  <div className="text-center py-6 text-sm text-slate-400"><i className="fas fa-spinner fa-spin mr-2"></i>Loading doctors…</div>
                ) : doctors.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    No doctors are available for booking right now. Please check back soon.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5" role="group" aria-labelledby="choose-doctor-label">
                    {doctors.map(d => (
                      <button type="button" key={d.id} onClick={() => selectDoctor(d.id)}
                        className={`w-full text-left border rounded-xl p-3 flex items-center gap-3 transition-all ${formData.doctorId === d.id ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-200' : 'border-slate-200 hover:border-brand-300'}`}>
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {(d.full_name || 'D').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">Dr. {d.full_name}</p>
                          <p className="text-xs text-slate-500 truncate">{d.specialty || 'General Physician'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.doctorId && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.doctorId}</p>}
              </div>

              {/* Primary Concern */}
              <div>
                <label htmlFor="concern" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Primary Concern *
                </label>
                <select
                  id="concern"
                  required
                  value={formData.concern}
                  onChange={handleInputChange}
                  className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white ${errors.concern ? 'border-red-400' : 'border-slate-200'
                    }`}
                >
                  <option value="" disabled>Select primary symptom</option>
                  {concernsList.map(concern => <option key={concern}>{concern}</option>)}
                </select>
                {errors.concern && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.concern}</p>}
              </div>

              <button type="button" onClick={goNext} disabled={doctors.length === 0}
                className="w-full bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-100 transition-all btn-interactive flex items-center justify-center gap-2 text-base">
                Continue <i className="fas fa-arrow-right text-sm"></i>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Aditi Sharma"
                  className={`w-full border rounded-xl p-3 text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:outline-none ${errors.name ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                    }`}
                />
                {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className={`w-full border rounded-xl p-3 text-sm transition-all focus:ring-2 focus:ring-brand-500 focus:outline-none ${errors.email ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                    }`}
                />
                {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.email}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Once your doctor confirms, we'll create your HealNari account and email your login details here.</p>
              </div>

              {/* Age & Mobile */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label htmlFor="age" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Age *
                  </label>
                  <input
                    type="number"
                    id="age"
                    min="12"
                    max="100"
                    required
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="25"
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none ${errors.age ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                      }`}
                  />
                  {errors.age && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.age}</p>}
                </div>
                <div className="col-span-2">
                  <label htmlFor="mobile" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    id="mobile"
                    pattern="[0-9]{10}"
                    required
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="10-digit number"
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none ${errors.mobile ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                      }`}
                  />
                  {errors.mobile && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.mobile}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={goBack}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  <i className="fas fa-arrow-left text-sm mr-1.5"></i> Back
                </button>
                <button type="button" onClick={goNext}
                  className="flex-[2] bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-100 transition-all btn-interactive flex items-center justify-center gap-2 text-base">
                  Continue <i className="fas fa-arrow-right text-sm"></i>
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* Date & Time Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="date" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    min={todayStr}
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none ${errors.date ? 'border-red-400' : 'border-slate-200'
                      }`}
                  />
                  {errors.date && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.date}</p>}
                </div>

                <div>
                  <label htmlFor="time" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Time Slot *
                  </label>
                  <select
                    id="time"
                    required
                    value={formData.time}
                    onChange={handleInputChange}
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white ${errors.time ? 'border-red-400' : 'border-slate-200'
                      }`}
                  >
                    <option value="" disabled>Select slot</option>
                    {timeSlots.map(slot => <option key={slot}>{slot}</option>)}
                  </select>
                  {errors.time && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.time}</p>}
                </div>
              </div>

              {selectedDoctor && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  This request goes directly to <strong>Dr. {selectedDoctor.full_name}</strong> for approval.
                </p>
              )}

              {submitError && (
                <p className="text-red-500 text-xs font-bold text-center">{submitError}</p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={goBack}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  <i className="fas fa-arrow-left text-sm mr-1.5"></i> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-100 transition-all btn-interactive flex items-center justify-center gap-2 text-base"
                >
                  <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-lock'} text-sm`}></i> {submitting ? 'Sending…' : 'Send Booking Request'}
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}

export default BookingModal;
