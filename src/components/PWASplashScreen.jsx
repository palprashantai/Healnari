import React, { useState, useEffect } from 'react';

export default function PWASplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as a PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone || 
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsPWA(true);
      // Hide splash screen after a short delay
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setIsPWA(false);
      setShowSplash(false);
    }
  }, []);

  if (!isPWA || !showSplash) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F8F6FF] flex flex-col items-center justify-center transition-opacity duration-500">
      <div className="animate-pulse flex flex-col items-center">
        <img 
          src="/brand/logo-icon.jpg" 
          alt="HealNari Logo" 
          className="h-28 w-28 rounded-2xl shadow-xl mb-8 object-cover"
        />
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <h1 className="text-2xl font-bold text-[#2A1647] tracking-tight">HealNari</h1>
        <p className="mt-2 text-brand-600 font-medium tracking-wide text-sm uppercase">Root-Cause Care</p>
      </div>
    </div>
  );
}
