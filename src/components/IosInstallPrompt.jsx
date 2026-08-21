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
    <div 
      role="region"
      aria-label="Install HealNari App"
      className="fixed bottom-24 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-white/95 backdrop-blur-xl border border-aubergine-200/80 rounded-2xl p-4 shadow-[0_12px_36px_rgba(42,22,71,0.22)] transform transition-all duration-300 ease-out animate-fade-in"
    >
      <div className="flex items-start gap-3.5 relative">
        <button 
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          aria-label="Dismiss installation prompt"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
        
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-aubergine-600 to-magenta-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-aubergine-500/20">
          <i className="fa-solid fa-mobile-screen-button text-lg"></i>
        </div>
        
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>Install HealNari App</span>
            <span className="bg-aubergine-100 text-aubergine-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded">iOS</span>
          </h4>
          <p className="text-xs text-slate-600 leading-snug">
            Tap <i className="fa-solid fa-arrow-up-from-bracket text-aubergine-600 mx-1"></i> in Safari, then select <strong className="font-bold text-slate-800">"Add to Home Screen"</strong> for full offline access & instant care.
          </p>
        </div>
      </div>
    </div>
  );
}
