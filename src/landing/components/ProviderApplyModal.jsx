import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';

function ProviderApplyModal({ isOpen, onClose, onOpenLogin }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    regNo: '',
    medicalCouncil: 'Medical Council of India (MCI)',
    specialty: 'Gynaecology & Obstetrics',
    experienceYears: '5-10 years',
    consultationFee: '₹800',
    clinicName: '',
    licenseFile: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const councils = [
    'National Medical Commission (NMC - India)',
    'State Medical Council (India)',
    'US State Medical Board (United States)',
    'General Medical Council (GMC - United Kingdom)',
    'Dubai Health Authority / MOHAP (UAE & GCC)',
    'AHPRA (Australia & New Zealand)',
    'Other International Medical Licensing Authority'
  ];

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
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-aubergine-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 font-black text-lg">
              <i className="fas fa-user-doctor"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold">Join HealNari Provider Network</h3>
              <p className="text-xs text-slate-300">Fast-track clinical onboarding & verification</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Multi-step progress indicator */}
        {!isSuccess && (
          <div className="px-6 sm:px-8 pt-5 pb-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span className={step >= 1 ? 'text-aubergine-700 font-extrabold' : ''}>1. Clinical Credentials</span>
              <span className={step >= 2 ? 'text-aubergine-700 font-extrabold' : ''}>2. Practice Preferences</span>
              <span className={step >= 3 ? 'text-aubergine-700 font-extrabold' : ''}>3. Document Verification</span>
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
              <h4 className="text-2xl font-black text-slate-900">Application Received!</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-slate-800">{formData.fullName || 'Doctor'}</strong>. We have received your credential submission for <span className="font-semibold text-aubergine-700">{formData.specialty}</span> (Reg No: {formData.regNo || 'N/A'}).
              </p>
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-left text-xs space-y-2 text-indigo-900 max-w-md mx-auto">
                <div className="font-bold flex items-center gap-1.5">
                  <i className="fas fa-clock text-indigo-600"></i> What happens next?
                </div>
                <p>1. Our credentialing committee verifies your registration number with the medical council.</p>
                <p>2. You will receive an SMS & Email containing your secure EMR portal access credentials.</p>
                <p>3. A dedicated clinical partner manager will schedule a 10-minute onboarding demo.</p>
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
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Full Name (with Prefix)</label>
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
                      <label className="text-xs font-bold text-slate-700">Primary Specialty</label>
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
                      <label className="text-xs font-bold text-slate-700">Medical Registration Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MCI-2018-84729"
                        value={formData.regNo}
                        onChange={e => handleChange('regNo', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Medical Licensing Council</label>
                      <select
                        value={formData.medicalCouncil}
                        onChange={e => handleChange('medicalCouncil', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      >
                        {councils.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Work Email Address</label>
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
                      <label className="text-xs font-bold text-slate-700">Contact / WhatsApp Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={e => handleChange('phone', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      />
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
                      <label className="text-xs font-bold text-slate-700">Target Video Consult Fee</label>
                      <input
                        type="text"
                        placeholder="e.g. ₹800 or $35"
                        value={formData.consultationFee}
                        onChange={e => handleChange('consultationFee', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Current Hospital / Clinic Affiliation (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Apollo Hospitals / Private Clinic"
                      value={formData.clinicName}
                      onChange={e => handleChange('clinicName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 text-sm outline-none transition-all"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <i className="fas fa-lock text-emerald-600"></i> Autonomy Guaranteed
                    </div>
                    <p className="text-emerald-800 leading-relaxed">
                      You retain 100% control over your consultation schedule, appointment duration, and clinical prescriptions.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Upload Medical Registration Proof / Degree</label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-aubergine-400 rounded-2xl p-6 text-center bg-slate-50/50 cursor-pointer transition-colors">
                      <i className="fas fa-file-medical text-3xl text-aubergine-500 mb-2"></i>
                      <p className="text-sm font-bold text-slate-800">Click to upload or drag & drop</p>
                      <p className="text-xs text-slate-500 mt-0.5">PDF, JPG, or PNG (Max 10MB)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100 rounded-2xl text-xs space-y-1.5 text-slate-600">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <i className="fas fa-shield-halved text-aubergine-600"></i> Strict Verification Protocol
                    </div>
                    <p>HealNari operates as a licensed, HIPAA-compliant digital clinic network. We independently verify every provider's credentials before activating live consultations.</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-6">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
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
