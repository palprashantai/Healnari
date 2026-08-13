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
      }, 2000);

      // Remove component completely
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      
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
      className={`fixed inset-0 z-[9999] bg-[#F8F6FF] flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        <img 
          src="/brand/logo-icon.jpg" 
          alt="HealNari Logo" 
          className={`h-28 w-28 rounded-3xl shadow-2xl mb-8 object-cover transition-all duration-700 delay-100 ease-out transform ${
            mounted && !closing ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-8'
          }`}
        />
        
        <div className={`w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4 transition-all duration-700 delay-300 ${
          mounted && !closing ? 'opacity-100' : 'opacity-0'
        }`}></div>
        
        <h1 className={`text-3xl font-extrabold text-[#2A1647] tracking-tight transition-all duration-700 delay-500 ease-out transform ${
          mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          HealNari
        </h1>
        
        <p className={`mt-2 text-brand-600 font-bold tracking-widest text-sm uppercase transition-all duration-700 delay-700 ease-out transform ${
          mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          Root-Cause Care
        </p>
      </div>
    </div>
  );
}
