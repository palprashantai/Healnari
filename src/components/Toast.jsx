import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const TYPE_CONFIG = {
    success: { bg: 'bg-emerald-600', icon: 'fa-circle-check', border: 'border-emerald-500' },
    error:   { bg: 'bg-rose-600',    icon: 'fa-circle-xmark', border: 'border-rose-500' },
    info:    { bg: 'bg-sky-600',     icon: 'fa-circle-info',  border: 'border-sky-500' },
    warning: { bg: 'bg-amber-500',   icon: 'fa-triangle-exclamation', border: 'border-amber-400' },
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => {
          const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.success;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-2xl border ${cfg.bg} ${cfg.border} animate-slide-in-right max-w-xs`}
              style={{ animation: 'slideInRight 0.3s ease-out' }}
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
          from { opacity: 0; transform: translateX(100px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
