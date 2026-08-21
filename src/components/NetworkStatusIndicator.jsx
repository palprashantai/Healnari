import React, { useState, useEffect } from 'react';

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
      window.location.reload();
    }
  };

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] sm:w-auto max-w-md bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-400 flex items-center justify-between gap-3 animate-fade-in text-xs font-semibold"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <i className="fas fa-wifi text-sm"></i>
          <span>Back online. Your connection is restored.</span>
        </div>
        <button 
          onClick={() => setShowReconnected(false)} 
          className="text-emerald-100 hover:text-white p-1"
          aria-label="Close notification"
        >
          <i className="fas fa-xmark"></i>
        </button>
      </div>
    );
  }

  return (
    <div 
      role="alert"
      aria-live="assertive"
      className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[94vw] sm:w-auto max-w-lg bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <i className="fas fa-cloud-arrow-down text-sm"></i>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <span>You're currently offline</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          </p>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
            Previously cached care records and health trackers remain accessible. Telemedicine and live bookings will resume once connected.
          </p>
        </div>
      </div>
      <button 
        onClick={handleRetry}
        className="self-end sm:self-center bg-aubergine-600 hover:bg-aubergine-500 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all border border-aubergine-400 shrink-0 flex items-center gap-1.5"
      >
        <i className="fas fa-arrows-rotate text-[10px]"></i>
        <span>Retry</span>
      </button>
    </div>
  );
}
