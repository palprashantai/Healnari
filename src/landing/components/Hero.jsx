import React from 'react';
import { triggerHaptic } from '../../lib/haptics.js';

function Hero({ onStartConsult, onOpenChecker, title, subtitle }) {
  return (
    <section className="relative pt-6 pb-32 md:pt-10 lg:pt-12 md:pb-20 max-w-6xl mx-auto px-4 sm:px-5 md:px-8">
      {/* Decorative blurry background highlights */}
      <div className="absolute top-1/4 left-1/10 w-72 h-72 rounded-full bg-indigo-200/40 blur-3xl -z-10"></div>
      <div className="absolute top-1/3 right-1/10 w-80 h-80 rounded-full bg-violet-200/30 blur-3xl -z-10"></div>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-center lg:items-stretch">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-7 text-center lg:text-left order-2 lg:order-1 min-w-0">
          {/* Trust Badges - Horizontal Scroll Snap on Mobile for zero clutter */}
          <div className="flex overflow-x-auto hide-scrollbar snap-x justify-start lg:justify-start gap-2 py-1 sm:flex-wrap">
            <span className="snap-start shrink-0 inline-flex items-center gap-1.5 bg-aubergine-50 border border-aubergine-100 text-aubergine-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-mobile-screen text-aubergine-500"></i> Mobile-First PWA
            </span>
            <span className="snap-start shrink-0 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-user-md text-emerald-500"></i> 8+ Specialist Disciplines
            </span>
            <span className="snap-start shrink-0 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-wand-magic-sparkles text-indigo-500"></i> AI-Guided Triage
            </span>
            <span className="snap-start shrink-0 inline-flex items-center gap-1.5 bg-magenta-50 border border-magenta-100 text-magenta-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-shield-halved text-magenta-600"></i> 100% Private &amp; Encrypted
            </span>
          </div>

          {/* Main Titles */}
          <div className="space-y-4 px-1 sm:px-0">
            <h1 className="text-3xl leading-[1.2] sm:text-4xl lg:text-5xl lg:leading-[1.15] font-extrabold tracking-tight text-slate-900 font-display">
              {title || (
                <>
                  The Holistic Care Platform for <br className="hidden lg:block" />
                  <span className="text-aubergine-600 inline-block">Women's Health, Hormones &amp; Wellness</span>
                </>
              )}
            </h1>
            <div className="space-y-4 max-w-xl mx-auto lg:mx-0 px-2 sm:px-0 relative z-10">
              {subtitle ? (
                <p className="text-slate-600 text-lg md:text-xl font-normal leading-relaxed whitespace-pre-line">
                  {subtitle}
                </p>
              ) : (
                <>
                  <p className="text-slate-600 text-[15px] sm:text-lg md:text-xl font-normal leading-relaxed">
                    Connect with qualified specialists across <strong>Gynaecology, PCOS, Endocrinology, Dermatology, Hair &amp; Scalp, Nutrition, and Yoga</strong>. From symptom tracking and AI guidance to online consultations and digital prescriptions.
                  </p>
                  <p className="text-slate-600 text-[15px] sm:text-base md:text-lg font-normal leading-relaxed">
                    <strong>Your personalized health journey in one installable app.</strong> Track cycles, log symptoms, screen hormonal risk factors with AI, and consult top verified doctors with structured root-cause care plans.
                  </p>
                  <p className="text-slate-700 text-[15px] sm:text-base md:text-lg font-medium leading-relaxed pt-2 pb-4 sm:pb-0">
                    <span className="text-aubergine-700 font-bold">Included in care:</span> 45-min video consult • Tailored nutrition &amp; yoga plans • Lab roadmap • Digital Rx • Free 14-day chat follow-up.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Pricing Banner */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-6 justify-center lg:justify-start text-sm sm:text-base font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full text-emerald-800 border border-emerald-100 shadow-xs text-xs sm:text-sm">
              <i className="fas fa-tag text-emerald-600"></i> Specialist Consultations starting at ₹799
            </span>
            <span className="inline-flex items-center gap-1.5 bg-aubergine-50 px-3 py-1.5 rounded-full text-aubergine-800 border border-aubergine-100 shadow-xs text-xs sm:text-sm">
              <i className="fas fa-heart-circle-bolt text-aubergine-600"></i> Free Health &amp; Cycle Tracking
            </span>
          </div>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-2 pt-3 sm:pt-0">
            {/* Primary Action Button */}
            <div className="relative group w-full sm:w-auto mt-2 sm:mt-0">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:-right-2 z-10 bg-rose-700 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-2 sm:px-2.5 rounded-full shadow-md shadow-rose-200/50 animate-bounce flex items-center gap-1 whitespace-nowrap">
                <i className="fas fa-calendar-day"></i> Next Slot: Today
              </div>
              <button 
                onClick={() => {
                  triggerHaptic('medium');
                  onStartConsult?.();
                }}
                className="w-full sm:w-auto relative bg-gradient-to-r from-aubergine-600 via-magenta-600 to-indigo-600 hover:from-aubergine-700 hover:via-magenta-700 hover:to-indigo-700 text-white font-extrabold px-5 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-aubergine-200 hover:shadow-2xl hover:shadow-aubergine-300 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-2.5 text-[15px] sm:text-lg group-hover:ring-4 ring-aubergine-100 whitespace-nowrap"
              >
                <i className="fas fa-stethoscope text-sm"></i> Book Specialist Consult
              </button>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenChecker?.();
              }}
              className="w-full sm:w-auto bg-sand-50 hover:bg-aubergine-50 border border-sand-200 text-slate-700 font-bold py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl shadow-sm transition-all btn-interactive flex items-center justify-center gap-2 text-xs sm:text-base whitespace-nowrap"
            >
              <i className="fas fa-heart-pulse text-rose-500"></i> 2-Min Symptom Checker
            </button>
          </div>

          {/* Risk Reversal */}
          <div className="text-center lg:text-left text-xs font-bold text-slate-500 mt-3 pt-1">
             <i className="fas fa-shield-halved text-emerald-500 mr-1"></i> 100% Confidentiality &amp; Satisfaction Guarantee. Don't love your doctor? Your next consult is on us.
          </div>

          {/* Consultation trust statement */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 text-xs sm:text-sm text-slate-500 text-center sm:text-left mt-2">
            <div className="flex -space-x-1 shrink-0">
              <span className="w-5 h-5 rounded-full bg-aubergine-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">✓</span>
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">✓</span>
              <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">✓</span>
            </div>
            <span>45-min detailed video consult • Digital prescription &amp; lab roadmap • 14-day free chat follow-up</span>
          </div>


        </div>

        {/* Right Column: Visual Component */}
        <div className="lg:col-span-5 relative order-1 lg:order-2 mt-2 sm:mt-0">
          {/* Main Visual Frame */}
          <div className="relative w-44 h-44 sm:w-72 sm:h-72 lg:w-96 lg:h-96 mx-auto lg:ml-auto lg:mr-0 lg:mt-8 lg:sticky lg:top-32">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-aubergine-600 via-magenta-400 to-indigo-300 opacity-25 blur-2xl animate-pulse-subtle"></div>
            
            {/* Beautiful Profile Image with Soft Vignette */}
            <div className="w-full h-full rounded-full overflow-hidden border-4 sm:border-8 border-white shadow-2xl relative">
              <img
                src="/generated/hero.webp"
                alt="Patient consulting an online gynaecologist for PCOS and hormonal health at HealNari"
                width="320"
                height="320"
                fetchpriority="high"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent"></div>
            </div>

            {/* Interactive Rating Badge Overlay */}
            <div className="absolute -bottom-2 sm:-bottom-4 -right-2 sm:right-4 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-sand-200 p-2 sm:p-3.5 flex items-center gap-1.5 sm:gap-3 animate-float z-10 scale-90 sm:scale-100 origin-bottom-right">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 text-xs sm:text-lg shrink-0">
                <i className="fas fa-star"></i>
              </div>
              <div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="font-extrabold text-slate-800 text-xs sm:text-base leading-none">4.98</span>
                  <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold">/ 5.0</span>
                </div>
                <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold mt-0.5">2,000+ verified consults</p>
              </div>
            </div>

            {/* Mini Trust Bubble */}
            <div className="absolute -top-1 sm:-top-3 -left-1 sm:-left-3 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-sand-200 p-1.5 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 animate-bounce-subtle z-10 scale-90 sm:scale-100 origin-top-left">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px] sm:text-xs shrink-0">
                <i className="fas fa-shield-heart"></i>
              </div>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-800">100% Doctor-Led</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
