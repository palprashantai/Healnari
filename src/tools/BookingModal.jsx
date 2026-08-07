import React, { useState, useEffect, useRef } from 'react';
import { StepIndicator } from '../components/StepIndicator.jsx';
import { markLeadCaptured } from './leadCapture.js';

const STEP_FIELDS = [
  ['doctor', 'concern'],
  ['name', 'age', 'mobile'],
  ['date', 'time'],
];

function BookingModal({ selectedDoc, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    mobile: '',
    doctor: selectedDoc || '',
    concern: '',
    date: '',
    time: ''
  });

  const [errors, setErrors] = useState({});
  const [reportFile, setReportFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedDoc) {
      setFormData((prev) => ({ ...prev, doctor: selectedDoc }));
    }
  }, [selectedDoc]);

  // Set the minimum selectable date to today's date
  const todayStr = new Date().toISOString().split('T')[0];

  const doctorsList = [
    'Dr. Ananya Mehta',
    'Dr. Ritu Khanna',
    'Dr. Shreya Verma',
    'Dr. Priya Nair'
  ];

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
    age: () => (!formData.age || formData.age < 12 || formData.age > 100 ? 'Enter a valid age (12-100)' : null),
    mobile: () => (!formData.mobile.match(/^[0-9]{10}$/) ? 'Enter a valid 10-digit mobile number' : null),
    doctor: () => (!formData.doctor ? 'Please select a doctor' : null),
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

  const goNext = () => {
    if (validateFields(STEP_FIELDS[step - 1])) setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateFields(STEP_FIELDS[2])) return;

    // Format date beautifully
    const formattedDate = new Date(formData.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    markLeadCaptured();
    onSuccess({
      doctor: formData.doctor,
      slot: `${formattedDate} at ${formData.time}`,
      name: formData.name
    });
  };

  const acceptFile = (file) => {
    if (!file) return;
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setFileError('Please upload a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File must be under 5MB.');
      return;
    }
    setFileError('');
    setReportFile(file);
  };

  const handleFileInput = (e) => acceptFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
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

  const stepLabels = ['Your Concern', 'Your Details', 'Schedule'];

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
              {/* Select Doctor */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Select Specialist *
                </label>
                <select
                  id="doctor"
                  required
                  value={formData.doctor}
                  onChange={handleInputChange}
                  className={`w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white ${errors.doctor ? 'border-red-400' : 'border-slate-200'
                    }`}
                >
                  <option value="" disabled>Choose specialist</option>
                  {doctorsList.map(doc => <option key={doc}>{doc}</option>)}
                </select>
                {errors.doctor && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.doctor}</p>}
              </div>

              {/* Primary Concern */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
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

              <button type="button" onClick={goNext}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-100 transition-all btn-interactive flex items-center justify-center gap-2 text-base">
                Continue <i className="fas fa-arrow-right text-sm"></i>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Full Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
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

              {/* Age & Mobile */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
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

              {/* Medical Records Upload */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Past Reports / Scans (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {!reportFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer group ${isDragging ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    <i className="fas fa-cloud-arrow-up text-xl text-brand-400 group-hover:text-brand-600 mb-2 transition-colors"></i>
                    <p className="text-xs font-semibold text-slate-600">Click to upload or drag and drop</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
                      <i className="fas fa-file-circle-check text-emerald-500"></i> {reportFile.name}
                    </span>
                    <button type="button" onClick={() => { setReportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-slate-400 hover:text-rose-500 transition-colors shrink-0 ml-2">
                      <i className="fas fa-xmark"></i>
                    </button>
                  </div>
                )}
                {fileError && <p className="text-red-500 text-[10px] font-bold mt-1">{fileError}</p>}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={goBack}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                  <i className="fas fa-arrow-left text-sm mr-1.5"></i> Back
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-100 transition-all btn-interactive flex items-center justify-center gap-2 text-base"
                >
                  <i className="fas fa-lock text-sm"></i> Confirm Booking Request
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
