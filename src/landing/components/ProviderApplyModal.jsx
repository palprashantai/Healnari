import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { COUNTRIES, COUNTRY_DIAL_CODES, getCountryByCode, detectUserCountry } from '../../lib/countries.js';
import { formatCurrency } from '../../lib/currency.js';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { API_URL } from '../../lib/apiClient.js';

function ProviderApplyModal({ isOpen, onClose, onOpenLogin }) {
  const [step, setStep] = useState(1);
  const initialCountryCode = detectUserCountry();
  const initialCountry = getCountryByCode(initialCountryCode);

  const [phoneDialCode, setPhoneDialCode] = useState(initialCountry.phonePrefix || '+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [formData, setFormData] = useState({
    countryCode: initialCountryCode,
    fullName: '',
    email: '',
    phone: '',
    regNo: '',
    medicalCouncil: initialCountry.councils[0],
    specialty: 'Gynaecologist',
    experienceYears: '5-10 years',
    consultationFee: `${initialCountry.symbol}${initialCountry.defaultDoctorFee}`,
    clinicName: '',
    payoutBankDetails: {},
    licenseFile: null,
    licenseFileName: '',
    licenseFileSize: '',
    licenseFileType: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      trackEvent(AnalyticsEvents.PROVIDER_APPLY_OPENED, { country: initialCountryCode });
    }
  }, [isOpen, initialCountryCode]);

  if (!isOpen) return null;

  const currentCountry = getCountryByCode(formData.countryCode);

  const handleCountryChange = (code) => {
    const selected = getCountryByCode(code);
    const newPrefix = selected.phonePrefix || '+91';
    setPhoneDialCode(newPrefix);
    setFormData(prev => ({
      ...prev,
      countryCode: code,
      medicalCouncil: selected.councils[0] || '',
      consultationFee: `${selected.symbol}${selected.defaultDoctorFee}`,
      phone: `${newPrefix} ${phoneNumber}`.trim()
    }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePayoutChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      payoutBankDetails: {
        ...prev.payoutBankDetails,
        [fieldId]: value
      }
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    setUploadError(null);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext) && !file.type.match(/(pdf|image\/(jpeg|png|jpg))/i)) {
      const err = 'Please upload a valid PDF, JPG, or PNG document.';
      setUploadError(err);
      toast?.error?.(err);
      return;
    }

    if (file.size > maxSize) {
      const err = `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit.`;
      setUploadError(err);
      toast?.error?.(err);
      return;
    }

    setFormData(prev => ({
      ...prev,
      licenseFile: file,
      licenseFileName: file.name,
      licenseFileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      licenseFileType: ext === 'pdf' || file.type.includes('pdf') ? 'pdf' : 'image',
    }));

    toast?.success?.(`Uploaded "${file.name}"`);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      licenseFile: null,
      licenseFileName: '',
      licenseFileSize: '',
      licenseFileType: '',
    }));
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 3 && !formData.licenseFile) {
      const msg = 'Please attach your medical license or council registration certificate.';
      setUploadError(msg);
      toast?.error?.(msg);
      return;
    }
    trackEvent(AnalyticsEvents.PROVIDER_APPLY_STEP_COMPLETED, {
      step,
      specialty: formData.specialty,
      country: formData.countryCode,
    });
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || `${phoneDialCode} ${phoneNumber}`.trim(),
        countryCode: formData.countryCode,
        regNo: formData.regNo,
        medicalCouncil: formData.medicalCouncil,
        specialty: formData.specialty,
        experienceYears: formData.experienceYears,
        consultationFee: formData.consultationFee,
        clinicName: formData.clinicName,
        licenseFileName: formData.licenseFileName || null,
        licenseFileSize: formData.licenseFileSize || null,
        licenseFileType: formData.licenseFileType || null,
      };

      const res = await fetch(`${API_URL}/leads/provider-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.message || 'Submission failed. Please try again.');
      }

      setIsSuccess(true);
      trackEvent(AnalyticsEvents.PROVIDER_APPLY_SUCCESS, {
        specialty: formData.specialty,
        country: formData.countryCode,
        experienceYears: formData.experienceYears,
      });
      toast.success("Application submitted! Our credentialing team will review your details within 24 hours.", {
        icon: "fa-shield-halved",
        duration: 6000
      });
    } catch (err) {
      toast.error(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const specialties = [
    'Gynaecologist',
    'PCOS Specialist',
    'Endocrinologist',
    'Dermatologist',
    'Trichologist',
    'Nutritionist',
    'Yoga & Movement',
    'Fertility Specialist'
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[96dvh] sm:max-h-[92vh] border-0 sm:border border-slate-100">
        
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-aubergine-900 to-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
              <i className="fas fa-user-doctor"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold">Join Global Provider Network</h3>
              <p className="text-xs text-slate-300">Fast-track clinical onboarding &amp; direct weekly payouts</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Multi-step progress indicator */}
        {!isSuccess && (
          <div className="px-4 sm:px-8 pt-4 pb-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span className={step >= 1 ? 'text-aubergine-700 font-bold' : ''}>1. Credentials &amp; Country</span>
              <span className={step >= 2 ? 'text-aubergine-700 font-bold' : ''}>2. Fee &amp; Payout Rails</span>
              <span className={step >= 3 ? 'text-aubergine-700 font-bold' : ''}>3. Document Verification</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-aubergine-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto flex-1">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                <i className="fas fa-circle-check"></i>
              </div>
              <h4 className="text-2xl font-bold text-slate-900">Application Received!</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-normal">
                Thank you, <strong className="text-slate-800">{formData.fullName || 'Doctor'}</strong>. We have received your credentials in <span className="font-semibold text-slate-800">{currentCountry.flag} {currentCountry.name}</span> for <span className="font-semibold text-aubergine-700">{formData.specialty}</span> (Reg No: {formData.regNo || 'N/A'}).
              </p>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-left text-xs space-y-2 text-indigo-900 max-w-md mx-auto">
                <div className="font-bold flex items-center gap-1.5">
                  <i className="fas fa-clock text-indigo-600"></i> What happens next?
                </div>
                <p>1. Our credentialing committee verifies your registration number with {formData.medicalCouncil}.</p>
                <p>2. You will receive an SMS &amp; Email with your secure EMR portal access credentials.</p>
                <p>3. Payout rail is configured for <strong>{currentCountry.currency} ({currentCountry.symbol})</strong> with weekly settlements via {currentCountry.payoutRail}.</p>
              </div>
              <div className="pt-4">
                <button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-md">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNext} className="space-y-4">
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  {/* Country of Practice */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Country of Medical Practice &amp; Licensing *</span>
                      <span className="text-[11px] font-semibold text-aubergine-600">Payout in {currentCountry.currency} ({currentCountry.symbol})</span>
                    </label>
                    <select
                      value={formData.countryCode}
                      onChange={e => handleCountryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm font-semibold outline-none transition-all"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} — ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Full Name (with Prefix) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Sarah Mitchell"
                        value={formData.fullName}
                        onChange={e => handleChange('fullName', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Primary Specialty *</label>
                      <select
                        value={formData.specialty}
                        onChange={e => handleChange('specialty', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      >
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Medical Registration Number *</label>
                      <input
                        type="text"
                        required
                        placeholder={formData.countryCode === 'US' ? 'e.g. ME-1234567 / NPI' : formData.countryCode === 'GB' ? 'e.g. GMC-7654321' : 'e.g. NMC-2018-84729'}
                        value={formData.regNo}
                        onChange={e => handleChange('regNo', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Medical Licensing Council *</label>
                      <select
                        value={formData.medicalCouncil}
                        onChange={e => handleChange('medicalCouncil', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      >
                        {currentCountry.councils.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Work Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="doctor@clinic.com"
                        value={formData.email}
                        onChange={e => handleChange('email', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Contact / WhatsApp Number *</label>
                      <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-aubergine-500 focus-within:ring-2 focus-within:ring-aubergine-100 transition-all overflow-hidden">
                        <select
                          value={phoneDialCode}
                          onChange={(e) => {
                            const newDial = e.target.value;
                            setPhoneDialCode(newDial);
                            handleChange('phone', `${newDial} ${phoneNumber}`.trim());
                          }}
                          className="px-2.5 py-2.5 bg-slate-100/90 hover:bg-slate-200/80 border-r border-slate-200 text-xs sm:text-sm font-bold text-slate-700 outline-none cursor-pointer transition-colors max-w-[110px] sm:max-w-[125px]"
                          aria-label="Country Code"
                        >
                          {COUNTRY_DIAL_CODES.map((item) => (
                            <option key={`${item.code}-${item.dialCode}`} value={item.dialCode}>
                              {item.flag} {item.dialCode}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          placeholder="98765 43210"
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhoneNumber(val);
                            handleChange('phone', `${phoneDialCode} ${val}`.trim());
                          }}
                          className="flex-1 px-3 py-2.5 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Clinical Experience *</label>
                      <select
                        value={formData.experienceYears}
                        onChange={e => handleChange('experienceYears', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      >
                        <option value="1-3 years">1 - 3 years</option>
                        <option value="3-5 years">3 - 5 years</option>
                        <option value="5-10 years">5 - 10 years</option>
                        <option value="10+ years">10+ years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Target Video Consult Fee</span>
                        <span className="text-[10px] text-emerald-600 font-bold">You keep 90%</span>
                      </label>
                      <input
                        type="text"
                        placeholder={`${currentCountry.symbol}${currentCountry.defaultDoctorFee}`}
                        value={formData.consultationFee}
                        onChange={e => handleChange('consultationFee', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm font-bold text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Payout Banking Details for the selected country */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <i className="fas fa-building-columns text-aubergine-600"></i> {currentCountry.payoutLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {currentCountry.payoutRail}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {currentCountry.payoutFields.map(field => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">{field.label}</label>
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            value={formData.payoutBankDetails[field.id] || ''}
                            onChange={e => handlePayoutChange(field.id, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-aubergine-500 font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Current Hospital / Clinic Affiliation (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Mount Sinai / Apollo Hospitals / Private Practice"
                      value={formData.clinicName}
                      onChange={e => handleChange('clinicName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <i className="fas fa-shield-halved text-emerald-600"></i> 100% Clinical Autonomy &amp; Weekly Direct Payouts
                    </div>
                    <p className="text-emerald-800 leading-relaxed font-normal">
                      Payouts are settled directly to your {currentCountry.currency} account every Wednesday with automated invoicing and zero software charges.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Upload Medical License / Council Registration Certificate *
                    </label>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {formData.licenseFile ? (
                      /* Attached File State Card */
                      <div className="border-2 border-emerald-300 bg-emerald-50/70 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs transition-all animate-fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                            <i className={`fas ${formData.licenseFileType === 'pdf' ? 'fa-file-pdf text-rose-500' : 'fa-file-image text-emerald-600'}`}></i>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[280px]">
                                {formData.licenseFileName}
                              </p>
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded-md shrink-0">
                                Attached
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formData.licenseFileSize} • Ready for credentialing
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-aubergine-700 hover:text-aubergine-900 bg-white border border-sand-300 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
                            title="Remove file"
                            aria-label="Remove uploaded file"
                          >
                            <i className="fas fa-trash-can text-sm"></i>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drag and Drop Zone */
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files?.[0]) {
                            processFile(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 select-none ${
                          isDragging
                            ? 'border-aubergine-600 bg-aubergine-50/80 scale-[1.01] ring-4 ring-aubergine-100'
                            : 'border-slate-300 hover:border-aubergine-500 bg-slate-50/60 hover:bg-aubergine-50/30'
                        }`}
                      >
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-aubergine-100 text-aubergine-600 flex items-center justify-center text-2xl mb-3 shadow-2xs">
                          <i className="fas fa-cloud-arrow-up"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          Click to upload or drag &amp; drop
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Medical License, Degree Certificate or NMC Registration (PDF, JPG, PNG up to 10MB)
                        </p>
                        <span className="inline-block mt-3 px-4 py-1.5 bg-white border border-sand-300 text-aubergine-700 text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-50">
                          Browse Files
                        </span>
                      </div>
                    )}

                    {uploadError && (
                      <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 mt-1.5">
                        <i className="fas fa-circle-exclamation"></i> {uploadError}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-100 rounded-2xl text-xs space-y-1.5 text-slate-600">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <i className="fas fa-shield-halved text-aubergine-600"></i> Strict Verification Protocol
                    </div>
                    <p>HealNari operates as a licensed, HIPAA &amp; GDPR-compliant digital clinic network. We independently verify every provider's credentials with {formData.medicalCouncil} before activating live consultations.</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-6">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div></div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Submitting...
                    </>
                  ) : step === 3 ? (
                    <>
                      <i className="fas fa-paper-plane"></i> Submit Application
                    </>
                  ) : (
                    <>
                      Next Step <i className="fas fa-arrow-right text-xs"></i>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer note */}
          {!isSuccess && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Already have an active provider account?{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin?.();
                }}
                className="font-bold text-aubergine-700 hover:underline"
              >
                Sign in to Provider Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProviderApplyModal;
