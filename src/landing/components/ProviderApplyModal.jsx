import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { COUNTRIES, COUNTRY_DIAL_CODES, getCountryByCode, detectUserCountry } from '../../lib/countries.js';
import { formatCurrency } from '../../lib/currency.js';

function ProviderApplyModal({ isOpen, onClose, onOpenLogin }) {
  const [step, setStep] = useState(1);
  const initialCountryCode = detectUserCountry();
  const initialCountry = getCountryByCode(initialCountryCode);

  const [phoneDialCode, setPhoneDialCode] = useState(initialCountry.phonePrefix || '+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [formData, setFormData] = useState({
    countryCode: initialCountryCode,
    fullName: '',
    email: '',
    phone: '',
    regNo: '',
    medicalCouncil: initialCountry.councils[0],
    specialty: 'Gynaecology & Obstetrics',
    experienceYears: '5-10 years',
    consultationFee: `${initialCountry.symbol}${initialCountry.defaultDoctorFee}`,
    clinicName: '',
    payoutBankDetails: {},
    licenseFile: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const toast = useToast();

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

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setIsSuccess(true);
      toast.success("Application submitted successfully! Our credentialing team will review your details within 24 hours.", {
        icon: "fa-shield-halved",
        duration: 6000
      });
    }, 1200);
  };

  const specialties = [
    'Gynaecology & Obstetrics',
    'Endocrinology & Diabetology',
    'Reproductive Medicine / IVF',
    'Dermatology & Trichology',
    'Clinical Nutrition & Functional Medicine'
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh] border border-slate-100">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-aubergine-900 to-slate-950 text-white">
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
          <div className="px-6 sm:px-8 pt-5 pb-3 bg-slate-50 border-b border-slate-100">
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
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
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
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Clinical Experience</label>
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
                    <label className="text-xs font-bold text-slate-700">Upload Medical License / Council Registration Certificate</label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-aubergine-400 rounded-2xl p-6 text-center bg-slate-50/50 cursor-pointer transition-colors">
                      <i className="fas fa-file-medical text-3xl text-aubergine-500 mb-2"></i>
                      <p className="text-sm font-bold text-slate-800">Click to upload or drag &amp; drop</p>
                      <p className="text-xs text-slate-500 mt-0.5">PDF, JPG, or PNG (Max 10MB)</p>
                    </div>
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
