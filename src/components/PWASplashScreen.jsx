import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../lib/haptics.js';

export default function PWASplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isPWA, setIsPWA] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Check if running as an installed PWA / standalone app
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone || 
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsPWA(true);
      
      // Initial subtle haptic on splash launch
      triggerHaptic('light');

      // Trigger entrance choreography
      const mountTimer = setTimeout(() => {
        setMounted(true);
      }, 40);

      // Trigger closing animation
      const closingTimer = setTimeout(() => {
        setClosing(true);
      }, 2000);

      // Remove component completely
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2450);
      
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
      className={`fixed inset-0 z-[99999] bg-gradient-to-b from-[#2A1647] via-[#1E1133] to-[#120721] flex flex-col items-center justify-between py-12 px-6 overflow-hidden select-none transition-all duration-500 ease-in-out ${
        closing ? 'opacity-0 scale-105 blur-sm pointer-events-none' : 'opacity-100 scale-100 blur-none'
      }`}
    >
      {/* Background Animated Ambient Aurora Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-magenta-600/20 blur-[100px] transition-all duration-1000 ${
          mounted && !closing ? 'opacity-80 scale-125' : 'opacity-0 scale-50'
        }`}></div>
        <div className={`absolute bottom-1/3 -right-20 w-96 h-96 rounded-full bg-aubergine-600/30 blur-[120px] transition-all duration-1000 delay-150 ${
          mounted && !closing ? 'opacity-80 scale-125' : 'opacity-0 scale-50'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/20 blur-[90px] transition-all duration-1000 delay-300 ${
          mounted && !closing ? 'opacity-90 scale-150' : 'opacity-0 scale-50'
        }`}></div>
      </div>

      {/* Top Subtle App Tier Header */}
      <div className={`relative z-10 flex items-center gap-2 transition-all duration-700 delay-100 ${
        mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
      }`}>
        <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-[11px] font-bold text-aubergine-200 shadow-sm">
          <i className="fas fa-shield-heart text-emerald-400"></i> Encrypted Holistic Health Clinic
        </span>
      </div>

      {/* Center Hero Icon & Typography Showcase (Like Flipkart / Swiggy / Uber App Launch) */}
      <div className="flex flex-col items-center relative z-10 my-auto">
        
        {/* Pulsing Backlight Halo */}
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-magenta-500 via-aubergine-500 to-indigo-500 rounded-3xl blur-2xl transition-all duration-1000 ${
          mounted && !closing ? 'opacity-60 scale-110 animate-pulse' : 'opacity-0 scale-50'
        }`}></div>

        {/* 3D App Icon Container */}
        <div className={`relative mb-6 transition-all duration-800 ease-out transform ${
          mounted && !closing ? 'scale-100 opacity-100 translate-y-0 rotate-0' : 'scale-50 opacity-0 translate-y-10 -rotate-6'
        }`}>
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] p-1 bg-gradient-to-tr from-white/30 via-white/10 to-transparent shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <img 
              src="/brand/logo-icon.jpg" 
              alt="HealNari Logo" 
              className="w-full h-full rounded-[1.8rem] object-cover shadow-2xl border border-white/20"
            />
          </div>

          {/* Verification Badge */}
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-lg border-2 border-[#1E1133] transition-all duration-500 delay-300 ${
            mounted && !closing ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}>
            <i className="fas fa-check"></i>
          </div>
        </div>
        
        {/* Brand Typography with Gradient & Shimmer */}
        <div className="text-center space-y-1.5">
          <h1 
            className="text-4xl sm:text-5xl font-black tracking-tight text-white font-serif-brand transition-all duration-800 delay-200 ease-out"
            style={{
              opacity: mounted && !closing ? 1 : 0,
              transform: mounted && !closing ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            Heal<span className="bg-gradient-to-r from-magenta-400 to-indigo-300 bg-clip-text text-transparent">Nari</span>
          </h1>
          
          <p 
            className="text-aubergine-200/90 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-800 delay-300 ease-out"
            style={{
              opacity: mounted && !closing ? 1 : 0,
              transform: mounted && !closing ? 'translateY(0)' : 'translateY(8px)',
              letterSpacing: mounted && !closing ? '0.22em' : '0.05em'
            }}
          >
            Root-Cause Women&apos;s Health
          </p>
        </div>

        {/* High-Performance Neon Progress Line */}
        <div className={`w-40 sm:w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-7 transition-all duration-700 delay-300 border border-white/10 ${
          mounted && !closing ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          <div 
            className="h-full bg-gradient-to-r from-magenta-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-[1800ms] ease-out shadow-[0_0_12px_rgba(226,62,140,0.8)]"
            style={{
              width: mounted ? '100%' : '0%',
            }}
          ></div>
        </div>
      </div>

      {/* Footer Powered By & Compliance Badges (Like Flipkart/Google Pay) */}
      <div className={`relative z-10 flex flex-col items-center gap-2 text-center transition-all duration-700 delay-400 safe-area-pb ${
        mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}>
        <div className="flex items-center gap-3 text-white/50 text-[11px] font-semibold">
          <span className="flex items-center gap-1"><i className="fas fa-lock text-emerald-400"></i> 256-bit HIPAA Ready</span>
          <span>•</span>
          <span className="flex items-center gap-1"><i className="fas fa-user-doctor text-indigo-400"></i> Doctor-Led Care</span>
        </div>
        <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">Version 2.0 • PWA Instant Engine</p>
      </div>
    </div>
  );
}
