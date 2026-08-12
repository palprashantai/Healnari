import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

function AuthModal({ onClose }) {
  const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regNo, setRegNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { user, error } = await signIn(email, password);
        if (error) { toast(error.message, 'error'); return; }
        onClose();
        navigate(user.role === 'admin' ? '/admin-dashboard' : (user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'));
      } else {
        const { user, error } = await signUp(email, password, role, {
          fullName,
          specialty: role === 'doctor' ? 'General' : undefined,
          registrationNo: role === 'doctor' ? regNo : undefined,
        });
        if (error) { toast(error.message, 'error'); return; }
        onClose();
        navigate(user.role === 'admin' ? '/admin-dashboard' : (user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'));
      }
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
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
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 shrink-0">
              <img src="/brand/logo-icon.jpg" alt="HealNari" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-xl font-bold text-slate-900">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {mode === 'login' ? 'Sign in to your account' : 'Join our healthcare platform'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto">

          {/* Role Toggle — only meaningful at registration. Login is account-bound:
              your role comes from your account, not from a tab you click, so
              showing this during login just misleads people into thinking they
              can pick which dashboard they land on. Admin isn't selectable here
              at all — those accounts are provisioned manually, never via public
              self-signup (the backend rejects it too). */}
          {mode === 'register' && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-center">
              <button
                onClick={() => setRole('patient')}
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 ${role === 'patient'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <i className="fas fa-user"></i> Patient
              </button>
              <button
                onClick={() => setRole('doctor')}
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 ${role === 'doctor'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <i className="fas fa-user-doctor"></i> Doctor
              </button>
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
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={role === 'doctor' ? "Dr. Jane Doe" : "Jane Doe"}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
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
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="text-sm font-semibold text-slate-700 block">Password</label>
                {mode === 'login' && (
                  <a href="#" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Forgot?</a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fas fa-lock"></i>
                </div>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
                />
              </div>
            </div>

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
                    value={regNo}
                    onChange={e => setRegNo(e.target.value)}
                    placeholder="e.g. MCI-12345"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-all mt-4 disabled:opacity-60 ${role === 'patient'
                ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
            >
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="font-bold text-brand-600 hover:text-brand-700"
              >
                {mode === 'login' ? 'Register now' : 'Sign in instead'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AuthModal;
