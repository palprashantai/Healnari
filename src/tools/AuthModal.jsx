import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { apiFetch } from '../lib/apiClient.js';

function AuthModal({ onClose, initialEmail = '' }) {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail || searchParams?.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regNo, setRegNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      toast('Please enter both email and password.', 'warning');
      return;
    }

    setSubmitting(true);
    setAuthError('');

    try {
      if (mode === 'login') {
        const { user } = await signIn(cleanEmail, cleanPassword);
        onClose();
        navigate(user?.role === 'admin' ? '/admin-dashboard' : (user?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'));
      } else if (mode === 'register') {
        const { user } = await signUp(cleanEmail, cleanPassword, role, {
          fullName: fullName?.trim(),
          specialty: role === 'doctor' ? 'General' : undefined,
          registrationNo: role === 'doctor' ? regNo?.trim() : undefined,
        });
        onClose();
        navigate(user?.role === 'admin' ? '/admin-dashboard' : (user?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'));
      } else if (mode === 'forgot') {
        try {
          await apiFetch('/auth/forgot-password', {
            method: 'POST',
            skipAuth: true,
            body: { email: cleanEmail }
          });
        } catch {
          // Graceful fallback: for security & privacy, always reassure the user
        }
        setResetSent(true);
        toast('Password recovery instructions sent to your email.', 'success');
      }
    } catch (err) {
      const msg = err?.message || 'Authentication failed. Please verify your details and try again.';
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

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[96dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 shrink-0">
              <img src="/brand/logo-icon.jpg" alt="HealNari" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-xl font-bold text-slate-900 font-display">
                {mode === 'login' ? 'Welcome Back' : (mode === 'register' ? 'Create Account' : 'Reset Password')}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {mode === 'login' ? 'Sign in to access your consultations & health records' : (mode === 'register' ? 'Join HealNari for compassionate, specialist-led care' : 'Enter your registered email to recover access')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 active:scale-95"
            aria-label="Close authentication modal"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto">

          {/* Role Toggle for Registration */}
          {mode === 'register' && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-center">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 ${role === 'patient'
                  ? 'bg-white text-aubergine-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <i className="fas fa-user"></i> Patient
              </button>
              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 ${role === 'doctor'
                  ? 'bg-white text-aubergine-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <i className="fas fa-user-doctor"></i> Doctor
              </button>
            </div>
          )}

          {mode === 'forgot' && resetSent ? (
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
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in shadow-sm mb-4">
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
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-fullname" className="text-sm font-semibold text-slate-700 block">Full Name</label>
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
                      onChange={e => setFullName(e.target.value)}
                      placeholder={role === 'doctor' ? "Dr. Jane Doe" : "Jane Doe"}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-sm font-semibold text-slate-700 block">Email Address</label>
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
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="text-sm font-semibold text-slate-700 block">Password</label>
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
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm"
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
                </div>
              )}

              {role === 'doctor' && mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-regno" className="text-sm font-semibold text-slate-700 block">Medical Registration Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <i className="fas fa-stethoscope"></i>
                    </div>
                    <input
                      id="auth-regno"
                      type="text"
                      required
                      autoCapitalize="characters"
                      spellCheck="false"
                      value={regNo}
                      onChange={e => setRegNo(e.target.value)}
                      placeholder="e.g. MCI-12345 or State Council No."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-aubergine-500 focus:ring-2 focus:ring-aubergine-200 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 shadow-md shadow-aubergine-500/20 transition-all mt-4 disabled:opacity-60 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Please wait…</span>
                  </>
                ) : mode === 'login' ? 'Sign In' : (mode === 'register' ? 'Create Account' : 'Send Recovery Link')}
              </button>
            </form>
            </>
          )}

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-bold text-aubergine-600 hover:text-aubergine-700"
              >
                ← Back to Sign In
              </button>
            ) : (
              <p className="text-sm text-slate-600">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setMode(mode === 'login' ? 'register' : 'login');
                  }}
                  className="font-bold text-brand-600 hover:text-brand-700"
                >
                  {mode === 'login' ? 'Register now' : 'Sign in instead'}
                </button>
              </p>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400">
              <i className="fas fa-lock text-emerald-500 mr-1"></i> End-to-end encrypted medical data &amp; 100% private.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AuthModal;
