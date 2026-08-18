import React, { useState, useEffect } from 'react';

export function IosInstallPrompt() {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    // Check if app is already installed (standalone mode)
    const isStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone === true);

    setIsIos(isIosDevice);
    setIsStandalone(isStandaloneMode);

    // Check if user previously dismissed this prompt
    if (localStorage.getItem('healnari_ios_prompt_dismissed')) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('healnari_ios_prompt_dismissed', 'true');
  };

  if (!isIos || isStandalone || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300 ease-in-out">
      <div className="max-w-md mx-auto flex items-start gap-4 relative">
        <button 
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600 p-1"
          aria-label="Dismiss"
        >
          <i className="fa-solid fa-times text-sm"></i>
        </button>
        
        <div className="w-10 h-10 rounded-xl bg-aubergine-100 text-aubergine-600 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-download text-lg"></i>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Enable Notifications</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            To receive push notifications, tap the <i className="fa-solid fa-arrow-up-from-bracket mx-1"></i> Share icon below and select <strong className="font-semibold text-slate-800">"Add to Home Screen"</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
