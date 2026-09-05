import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { apiFetch } from '../lib/apiClient.js';
import { COUNTRY_DIAL_CODES, detectUserCountry, getCountryByCode } from '../lib/countries.js';
import ProviderApplyModal from '../landing/components/ProviderApplyModal.jsx';

function AuthModal({ onClose, initialEmail = '', initialRole = 'patient', initialMode = 'login', onSuccess }) {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(initialRole); // 'patient' or 'doctor'
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail || searchParams?.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProviderApplyOpen, setIsProviderApplyOpen] = useState(false);

  // New required fields: country, age, phone, gender, doctor credentials, terms
  const defaultCountryCode = detectUserCountry() || 'IN';
  const [country, setCountry] = useState(defaultCountryCode);
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Female');
  const [specialty, setSpecialty] = useState('Gynaecologist & Obstetrician');
  const [regNo, setRegNo] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const activeCountryObj = getCountryByCode(country) || { flag: '🇮🇳', dialCode: '+91', name: 'India' };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateRegister = () => {
    const errs = {};
    const cleanName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanName) {
      errs.fullName = 'Full Name is required.';
    } else if (cleanName.length < 2) {
      errs.fullName = 'Name must be at least 2 characters.';
    }

    if (!cleanEmail) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!cleanPassword) {
      errs.password = 'Password is required.';
    } else if (cleanPassword.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!country) {
      errs.country = 'Country is required.';
    }

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      errs.phone = 'Phone number is required for consultation alerts.';
    } else if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      errs.phone = 'Please enter a valid 7–15 digit phone number.';
    }

    const numAge = Number(age);
    if (!age || isNaN(numAge)) {
      errs.age = 'Age is required.';
    } else if (numAge < 12 || numAge > 120) {
      errs.age = 'Patient age must be between 12 and 120 years.';
    }

    if (!agreeTerms) {
      errs.agreeTerms = 'You must accept the Terms of Service & Privacy Policy.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (mode === 'login') {
      if (!cleanEmail || !cleanPassword) {
        toast('Please enter both email and password.', 'warning');
        return;
      }
    } else if (mode === 'register') {
      const errs = validateRegister();
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        const firstErr = Object.values(errs)[0];
        toast(firstErr, 'warning');
        return;
      }
    } else if (mode === 'forgot') {
      if (!cleanEmail) {
        toast('Please enter your registered email address.', 'warning');
        return;
      }
    }

    setSubmitting(true);
    setAuthError('');

    try {
      if (mode === 'login') {
        const { user } = await signIn(cleanEmail, cleanPassword);
        onSuccess?.(user);
        onClose();
        navigate(user?.role === 'admin' ? '/admin-dashboard' : (user?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'));
      } else if (mode === 'register') {
        const dialPrefix = activeCountryObj.dialCode || '+91';
        const formattedPhone = `${dialPrefix} ${phone.trim()}`.trim();
        const { user } = await signUp(cleanEmail, cleanPassword, 'patient', {
          fullName: fullName.trim(),
          country,
          age: Number(age),
          phone: formattedPhone,
          gender,
        });
        toast('Account successfully created! Welcome to HealNari.', 'success');
        onSuccess?.(user);
        onClose();
        navigate('/patient-dashboard');
      } else if (mode === 'forgot') {
        try {
          await apiFetch('/auth/forgot-password', {
            method: 'POST',
            skipAuth: true,
            body: { email: cleanEmail },
          });
        } catch {
          // Silent catch to prevent user enumeration
        }
        setResetSent(true);
      }
    } catch (err) {
      const msg = err?.message || 'Authentication failed. Please check your credentials.';
      setAuthError(msg);
      toast(msg, 'error');
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

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        ></div>

        {/* Modal Content - Refined width and balanced vertical proportion */}
        <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[94dvh] sm:max-h-[90vh] border border-slate-100">
          
          {/* Header */}
          <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                mode === 'register' && role === 'doctor'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs'
                  : 'bg-white border-slate-100 shadow-xs'
              }`}>
                {mode === 'register' && role === 'doctor' ? (
                  <i className="fas fa-user-doctor text-lg"></i>
                ) : (
                  <img src="/brand/logo-icon.png" alt="HealNari" className="w-8 h-8 object-contain rounded-full" onError={(e) => { e.target.src = "/favicon.svg"; }} />
                )}
              </div>
              <div className="min-w-0">
                <h3 id="auth-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 font-display truncate">
                  {mode === 'login' 
                    ? 'Welcome Back' 
                    : (mode === 'register' 
                      ? (role === 'doctor' ? 'Join Global Provider Network' : 'Create Patient Account') 
                      : 'Reset Password')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate sm:text-clip">
                  {mode === 'login'
                    ? 'Sign in to access consultations & clinical records'
                    : (mode === 'register'
                      ? (role === 'doctor' 
                        ? 'Fast-track clinical onboarding & direct weekly payouts' 
                        : 'Personalized holistic care & verified specialist access')
                      : 'Enter your registered email to recover access')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 active:scale-95 ml-2"
              aria-label="Close authentication modal"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>

          {/* Scrollable Body - flex-1 min-h-0 ensures it scrolls without clipping bottom */}
          <div className="px-5 sm:px-6 py-5 sm:py-6 overflow-y-auto flex-1 min-h-0 space-y-4 pb-8">

            {/* Role Toggle for Registration */}
            {mode === 'register' && (
              <div className="flex bg-slate-100 p-1 rounded-xl mb-3 text-center shrink-0">
                <button
                  type="button"
                  onClick={() => { setRole('patient'); setFieldErrors({}); }}
                  className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex flex-row justify-center items-center gap-2 ${
                    role === 'patient'
                      ? 'bg-white text-aubergine-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <i className="fas fa-user"></i> Patient
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setRole('doctor'); 
                    setFieldErrors({}); 
                    setIsProviderApplyOpen(true);
                  }}
                  className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex flex-row justify-center items-center gap-2 ${
                    role === 'doctor'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <i className="fas fa-user-doctor"></i> Doctor / Specialist
                </button>
              </div>
            )}

            {/* Doctor Registration -> Exclusively follows Join Global Provider Network */}
            {mode === 'register' && role === 'doctor' ? (
              <div className="space-y-4 animate-fade-in py-1">
                <div className="bg-gradient-to-br from-slate-900 via-aubergine-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shrink-0 mt-0.5 shadow-inner">
                      <i className="fas fa-stethoscope"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                        Join Global Provider Network
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-white leading-snug">
                        Accredited Clinical Specialist Onboarding
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Doctors &amp; specialists join HealNari through our credentialing committee with verified medical councils, custom consultation fees &amp; guaranteed direct weekly payouts.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-white/5 p-4 rounded-xl border border-white/5 text-xs text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <i className="fas fa-shield-halved text-emerald-400 text-sm shrink-0"></i>
                      <span><strong>1. Credentials &amp; Country:</strong> License number &amp; council verification</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <i className="fas fa-money-bill-wave text-emerald-400 text-sm shrink-0"></i>
                      <span><strong>2. Fee &amp; Payout Rails:</strong> Set your fees &amp; local bank payouts</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <i className="fas fa-file-circle-check text-emerald-400 text-sm shrink-0"></i>
                      <span><strong>3. Document Verification:</strong> Fast-track license review within 24 hours</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsProviderApplyOpen(true)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-user-doctor text-base"></i>
                    <span>Apply to Join Provider Network (3 Steps) →</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs sm:text-sm text-slate-600">
                    Already have an active provider account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setRole('doctor');
                        setMode('login');
                      }}
                      className="font-bold text-aubergine-700 hover:text-aubergine-900 underline cursor-pointer"
                    >
                      Sign in to Provider Dashboard
                    </button>
                  </p>
                </div>
              </div>
            ) : mode === 'forgot' && resetSent ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl border border-emerald-100">
                  <i className="fas fa-paper-plane"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Check Your Inbox</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    We've dispatched a secure password reset link to <strong>{email}</strong>. Please check your inbox and spam folders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setMode('login'); setAuthError(''); }}
                  className="w-full py-3 bg-aubergine-600 text-white font-bold rounded-xl text-sm hover:bg-aubergine-700 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <>
                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in shadow-sm mb-2">
                    <i className="fas fa-circle-exclamation mt-0.5 text-rose-600 text-sm shrink-0"></i>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold leading-relaxed">{authError}</p>
                      {(authError.toLowerCase().includes('already') ||
                        authError.toLowerCase().includes('registered') ||
                        authError.toLowerCase().includes('exists')) &&
                        mode === 'register' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthError('');
                              setMode('login');
                            }}
                            className="font-bold text-aubergine-700 hover:text-aubergine-900 underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>Sign in to your account instead</span>
                            <i className="fas fa-arrow-right text-[10px]"></i>
                          </button>
                        )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name (Patient Register only) */}
                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label htmlFor="auth-fullname" className="text-xs font-bold text-slate-700 block">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <i className="fas fa-id-card"></i>
                        </div>
                        <input
                          id="auth-fullname"
                          type="text"
                          required
                          autoComplete="name"
                          value={fullName}
                          onChange={e => { setFullName(e.target.value); clearFieldError('fullName'); }}
                          placeholder="Jane Doe"
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border ${fieldErrors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm`}
                        />
                      </div>
                      {fieldErrors.fullName && <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.fullName}</p>}
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label htmlFor="auth-email" className="text-xs font-bold text-slate-700 block">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck="false"
                        value={email}
                        onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
                        placeholder="you@example.com"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${fieldErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm`}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.email}</p>}
                  </div>

                  {/* Password */}
                  {mode !== 'forgot' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="auth-password" class="text-xs font-bold text-slate-700 block">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => setMode('forgot')}
                            className="text-xs font-semibold text-aubergine-600 hover:text-aubergine-700 focus:outline-none"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <i className="fas fa-lock"></i>
                        </div>
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          value={password}
                          onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
                          placeholder="••••••••"
                          className={`w-full pl-10 pr-10 py-3 rounded-xl border ${fieldErrors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                        </button>
                      </div>
                      {fieldErrors.password && <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.password}</p>}
                    </div>
                  )}

                  {/* Country & Phone (Patient Register only) */}
                  {mode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Country Selector */}
                      <div className="space-y-1">
                        <label htmlFor="auth-country" className="text-xs font-bold text-slate-700 block">
                          Country <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base">
                            <span>{activeCountryObj.flag || '🌍'}</span>
                          </div>
                          <select
                            id="auth-country"
                            value={country}
                            onChange={e => {
                              setCountry(e.target.value);
                              clearFieldError('country');
                            }}
                            className={`w-full pl-9 pr-8 py-2.5 rounded-xl border ${fieldErrors.country ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-xs font-bold text-slate-800 appearance-none`}
                          >
                            {COUNTRY_DIAL_CODES.map(c => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.name} ({c.dialCode})
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <i className="fas fa-chevron-down text-[10px]"></i>
                          </div>
                        </div>
                        {fieldErrors.country && <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.country}</p>}
                      </div>

                      {/* Phone with dial prefix badge */}
                      <div className="space-y-1">
                        <label htmlFor="auth-phone" className="text-xs font-bold text-slate-700 block">
                          Mobile Phone <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex">
                          <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold shrink-0">
                            {activeCountryObj.dialCode || '+91'}
                          </span>
                          <input
                            id="auth-phone"
                            type="tel"
                            required
                            inputMode="tel"
                            value={phone}
                            onChange={e => { setPhone(e.target.value); clearFieldError('phone'); }}
                            placeholder="9876543210"
                            className={`w-full px-3 py-2.5 rounded-r-xl border ${fieldErrors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm`}
                          />
                        </div>
                        {fieldErrors.phone && <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.phone}</p>}
                      </div>
                    </div>
                  )}

                  {/* Patient Specific: Age & Gender */}
                  {mode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="auth-age" className="text-xs font-bold text-slate-700 block">
                          Age (Years) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <i className="fas fa-cake-candles text-xs"></i>
                          </div>
                          <input
                            id="auth-age"
                            type="number"
                            inputMode="numeric"
                            min="12"
                            max="120"
                            required
                            value={age}
                            onChange={e => { setAge(e.target.value); clearFieldError('age'); }}
                            placeholder="e.g. 28"
                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${fieldErrors.age ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm`}
                          />
                        </div>
                        {fieldErrors.age && <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.age}</p>}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="auth-gender" className="text-xs font-bold text-slate-700 block">
                          Gender <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="auth-gender"
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-xs font-bold text-slate-800 appearance-none"
                          >
                            <option value="Female">Female</option>
                            <option value="Other">Other / Non-binary</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <i className="fas fa-chevron-down text-[10px]"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consent & Terms Checkbox (Patient Register only) */}
                  {mode === 'register' && (
                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 leading-relaxed select-none">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={e => { setAgreeTerms(e.target.checked); clearFieldError('agreeTerms'); }}
                          className="mt-0.5 rounded text-aubergine-600 focus:ring-aubergine-500 h-4 w-4 shrink-0"
                        />
                        <span>
                          I agree to HealNari's <a href="/legal/terms" target="_blank" className="text-aubergine-600 font-bold underline">Terms of Service</a> &amp; <a href="/legal/privacy" target="_blank" className="text-aubergine-600 font-bold underline">Privacy Policy</a>, and consent to clinical data encryption.
                        </span>
                      </label>
                      {fieldErrors.agreeTerms && <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.agreeTerms}</p>}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-all mt-4 disabled:opacity-60 active:scale-[0.98] flex items-center justify-center gap-2 text-sm cursor-pointer bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 shadow-aubergine-500/20"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Please wait…</span>
                      </>
                    ) : mode === 'login' ? (
                      'Sign In'
                    ) : mode === 'register' ? (
                      'Create Patient Account'
                    ) : (
                      'Send Recovery Link'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Footer Navigation (for Login, Patient Register, and Forgot Password) */}
            {!(mode === 'register' && role === 'doctor') && (
              <div className="mt-5 text-center border-t border-slate-100 pt-3">
                {mode === 'forgot' ? (
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs font-bold text-aubergine-600 hover:text-aubergine-700"
                  >
                    ← Back to Sign In
                  </button>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-600">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('');
                        setFieldErrors({});
                        setMode(mode === 'login' ? 'register' : 'login');
                      }}
                      className="font-bold text-brand-600 hover:text-brand-700 underline"
                    >
                      {mode === 'login' ? 'Register now' : 'Sign in instead'}
                    </button>
                  </p>
                )}
              </div>
            )}

            <div className="mt-2 text-center">
              <p className="text-[11px] text-slate-400">
                <i className="fas fa-lock text-emerald-500 mr-1"></i> End-to-end encrypted medical data &amp; 100% private.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Embedded 3-Step Provider Credentialing Modal (Join Global Provider Network) */}
      {isProviderApplyOpen && (
        <ProviderApplyModal
          isOpen={isProviderApplyOpen}
          onClose={() => setIsProviderApplyOpen(false)}
          onOpenLogin={() => {
            setIsProviderApplyOpen(false);
            setRole('doctor');
            setMode('login');
          }}
        />
      )}
    </>
  );
}

export default AuthModal;
