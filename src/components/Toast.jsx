import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

const LEAVE_ANIM_MS = 220;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, LEAVE_ANIM_MS);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastId;
    const dur = typeof type === 'object' ? (type.duration || 3000) : duration;
    const actualType = typeof type === 'string' ? type : 'success';
    setToasts(prev => [...prev, { id, message, type: actualType, leaving: false }]);
    setTimeout(() => removeToast(id), dur);
  }, [removeToast]);

  const toastApi = useMemo(() => {
    const fn = (message, type = 'success', duration = 3000) => addToast(message, type, duration);
    fn.success = (msg, durationOrOpts) => {
      const dur = typeof durationOrOpts === 'object' ? (durationOrOpts.duration || 3000) : (durationOrOpts || 3000);
      addToast(msg, 'success', dur);
    };
    fn.error = (msg, durationOrOpts) => {
      const dur = typeof durationOrOpts === 'object' ? (durationOrOpts.duration || 3000) : (durationOrOpts || 3000);
      addToast(msg, 'error', dur);
    };
    fn.info = (msg, durationOrOpts) => {
      const dur = typeof durationOrOpts === 'object' ? (durationOrOpts.duration || 3000) : (durationOrOpts || 3000);
      addToast(msg, 'info', dur);
    };
    fn.warning = (msg, durationOrOpts) => {
      const dur = typeof durationOrOpts === 'object' ? (durationOrOpts.duration || 3000) : (durationOrOpts || 3000);
      addToast(msg, 'warning', dur);
    };
    fn.toast = fn;
    return fn;
  }, [addToast]);

  const TYPE_CONFIG = {
    success: { bg: 'bg-emerald-600', icon: 'fa-circle-check', border: 'border-emerald-500' },
    error:   { bg: 'bg-rose-600',    icon: 'fa-circle-xmark', border: 'border-rose-500' },
    info:    { bg: 'bg-sky-600',     icon: 'fa-circle-info',  border: 'border-sky-500' },
    warning: { bg: 'bg-amber-500',   icon: 'fa-triangle-exclamation', border: 'border-amber-400' },
  };

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => {
          const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.success;
          return (
            <div
              key={toast.id}
              className={`toast-item pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-2xl border ${cfg.bg} ${cfg.border} max-w-xs`}
              style={{ animation: toast.leaving ? `slideOutRight ${LEAVE_ANIM_MS}ms ease-in both` : 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <i className={`fas ${cfg.icon} text-base flex-shrink-0`}></i>
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-1 text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(40px) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          .toast-item { animation: none !important; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
