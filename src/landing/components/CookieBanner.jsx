import React, { useState, useEffect } from 'react';

function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('femcare_cookie_consent');
    if (!hasConsented) {
      // Small delay so it doesn't jarringly appear instantly on load
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('femcare_cookie_consent', 'true');
    // Mock initializing GTM or other trackers after consent
    if (window.dataLayer) {
      window.dataLayer.push({ event: 'cookie_consent_granted' });
    }
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('femcare_cookie_consent', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[999] p-4 md:p-6 animate-slide-up pointer-events-none">
      <div className="max-w-6xl mx-auto pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
          {/* Accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-aubergine-600"></div>
          
          <div className="pl-3 md:pl-4 flex-1">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <i className="fas fa-cookie-bite text-sand-600"></i> Your Privacy & Data
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed pr-4">
              We use strictly necessary cookies to ensure the core functionality of our clinical platform. 
              With your consent, we also use performance cookies to understand usage and securely improve your telemedicine experience in compliance with GDPR. 
              <a href="#" className="text-aubergine-600 hover:underline font-semibold ml-1">Read our Privacy Policy</a>.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 shrink-0">
            <button 
              onClick={handleDecline}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm btn-interactive"
            >
              Essential Only
            </button>
            <button 
              onClick={handleAccept}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-white bg-aubergine-600 hover:bg-aubergine-700 shadow-md shadow-aubergine-100 transition-all btn-interactive text-sm"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieBanner;
