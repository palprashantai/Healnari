import React, { useState, useEffect } from 'react';

export default function PWASplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isPWA, setIsPWA] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Check if running as a PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone || 
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsPWA(true);
      
      // Trigger entrance animation shortly after mount
      const mountTimer = setTimeout(() => {
        setMounted(true);
      }, 50);

      // Trigger exit animation before removing
      const closingTimer = setTimeout(() => {
        setClosing(true);
      }, 2500);

      // Remove component completely
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      
      return () => {
        clearTimeout(mountTimer);
        clearTimeout(closingTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsPWA(false);
      setShowSplash(false);
    }
  }, []);

  if (!isPWA || !showSplash) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#F8F6FF] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        closing ? 'opacity-0 scale-105 blur-sm' : 'opacity-100 scale-100 blur-none'
      }`}
    >
      <div className="flex flex-col items-center relative z-10">
        
        {/* Pulsing Aura Behind Logo */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-tr from-brand-300 to-aubergine-200 rounded-full blur-3xl transition-all duration-1000 ${
          mounted && !closing ? 'opacity-40 scale-150 animate-pulse' : 'opacity-0 scale-50'
        }`}></div>

        {/* Logo Container with 3D Float */}
        <div className={`relative mb-8 transition-all duration-1000 delay-100 ease-out transform ${
          mounted && !closing ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-12'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-400 to-brand-600 rounded-3xl blur-md opacity-30 animate-pulse"></div>
          <img 
            src="/brand/logo-icon.jpg" 
            alt="HealNari Logo" 
            className="relative h-28 w-28 rounded-3xl shadow-2xl object-cover border border-white/50"
          />
        </div>
        
        {/* Sleek Progress Bar instead of generic spinner */}
        <div className={`w-32 h-1 bg-brand-100 rounded-full overflow-hidden mb-6 transition-all duration-700 delay-400 ${
          mounted && !closing ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="h-full bg-gradient-to-r from-aubergine-400 to-brand-600 rounded-full animate-[progress_2s_ease-in-out_forwards]" style={{
            width: mounted ? '100%' : '0%',
            transition: 'width 2.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}></div>
        </div>
        
        {/* Brand Name with tracking expansion */}
        <h1 
          className="text-4xl font-extrabold text-[#2A1647] font-display transition-all duration-1000 delay-500 ease-out transform"
          style={{
            opacity: mounted && !closing ? 1 : 0,
            transform: mounted && !closing ? 'translateY(0)' : 'translateY(10px)',
            letterSpacing: mounted && !closing ? '-0.02em' : '-0.1em'
          }}
        >
          HealNari
        </h1>
        
        {/* Tagline */}
        <p 
          className="mt-2 text-brand-600 font-bold text-xs uppercase transition-all duration-1000 delay-700 ease-out transform"
          style={{
            opacity: mounted && !closing ? 1 : 0,
            transform: mounted && !closing ? 'translateY(0)' : 'translateY(10px)',
            letterSpacing: mounted && !closing ? '0.25em' : '0em'
          }}
        >
          Root-Cause Care
        </p>
      </div>
    </div>
  );
}
