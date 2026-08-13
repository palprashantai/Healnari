import React from 'react';

function Hero({ onStartConsult, onOpenChecker }) {
  return (
    <section className="relative overflow-hidden py-12 md:py-20 max-w-6xl mx-auto px-5 md:px-8">
      {/* Decorative blurry background highlights */}
      <div className="absolute top-1/4 left-1/10 w-72 h-72 rounded-full bg-indigo-200/40 blur-3xl -z-10"></div>
      <div className="absolute top-1/3 right-1/10 w-80 h-80 rounded-full bg-violet-200/30 blur-3xl -z-10"></div>

      <div className="grid lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left animate-slide-up order-2 lg:order-1">
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-aubergine-50 border border-aubergine-100 text-aubergine-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-lock text-aubergine-500"></i> 100% private &amp; confidential
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-user-md text-emerald-500"></i> Backed by doctors
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-microscope text-amber-600"></i> Science-backed
            </span>
          </div>

          {/* Main Titles */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-5xl lg:leading-[1.15] font-extrabold tracking-tight text-slate-900 font-display">
              Online PCOS & Hormonal Healthcare That <br className="hidden lg:block" />
              Treats the <span className="text-aubergine-600">Root Cause</span>
            </h1>
            <div className="space-y-3 max-w-xl mx-auto lg:mx-0">
              <p className="text-slate-600 text-lg md:text-xl font-normal leading-relaxed">
                Stop being told to <span className="text-slate-800 font-medium">"just lose weight."</span> Whether you're dealing with <span className="text-aubergine-600 font-medium">PCOS, PCOD, thyroid disorders, hair fall, irregular periods, acne, hormonal imbalances, or weight-related concerns</span>, get a personalized treatment plan designed to address the <span className="text-slate-800 font-medium">underlying cause</span> of your symptoms.
              </p>
              <p className="text-slate-700 text-base md:text-lg font-medium leading-relaxed pt-1">
                Consult world-class endocrinologists and gynecologists online for evidence-based, personalized care—tailored to your unique hormonal health needs.
              </p>
            </div>
          </div>

          {/* Pricing Banner */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 inline-flex items-center gap-2 text-emerald-800 font-bold text-sm shadow-sm">
            <i className="fas fa-tag text-emerald-600"></i> Consultations starting at just $29
          </div>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex flex-col gap-2 w-full sm:w-auto relative">
              <span className="absolute -top-3 right-0 md:-right-4 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg animate-pulse z-10 border border-white">
                📅 Next slot: Today in your timezone
              </span>
              <button
                onClick={onStartConsult}
                className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-aubergine-100 transition-all btn-interactive flex items-center justify-center gap-2.5 text-lg"
              >
                <i className="fas fa-stethoscope text-base"></i> Book My $29 Consult
              </button>
            </div>
            <button
              onClick={onOpenChecker}
              className="bg-sand-50 hover:bg-aubergine-50 border border-sand-200 text-slate-700 font-bold py-4 px-8 rounded-xl shadow-sm transition-all btn-interactive flex items-center justify-center gap-2.5 text-lg h-full sm:h-[60px] mt-2 sm:mt-0"
            >
              <i className="fas fa-heart-pulse text-rose-500"></i> 2-Min Symptom Check
            </button>
          </div>

          {/* Risk Reversal */}
          <div className="text-center lg:text-left text-xs font-bold text-slate-500 mt-3 pt-1">
             <i className="fas fa-shield-halved text-emerald-500 mr-1"></i> 100% Risk-Free. Don't love your doctor? Your next consult is on us.
          </div>

          {/* Consultation trust statement */}
          <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-500">
            <div className="flex -space-x-1">
              <span className="w-5 h-5 rounded-full bg-aubergine-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">✓</span>
            </div>
            <span>45-min detailed video consultation • Includes free 14-day chat follow-up</span>
          </div>


        </div>

        {/* Right Column: Visual Component */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end order-1 lg:order-2">
          {/* Main Visual Frame */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-aubergine-600 via-magenta-400 to-indigo-300 opacity-25 blur-2xl animate-pulse-subtle"></div>
            
            {/* Beautiful Profile Image with Soft Vignette */}
            <div className="w-full h-full rounded-full overflow-hidden border-8 border-white shadow-2xl relative">
              <img
                src="/generated/hero.webp"
                alt="Patient consulting an online gynaecologist for PCOS and hormonal health at HealNari"
                width="500"
                height="500"
                fetchpriority="high"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent"></div>
            </div>

            {/* Interactive Rating Badge Overlay */}
            <div className="absolute -bottom-3 sm:-bottom-4 right-2 sm:right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-sand-200 p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 animate-float z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 text-base sm:text-lg shrink-0">
                <i className="fas fa-star"></i>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 text-sm sm:text-base leading-none">4.98</span>
                  <span className="text-[11px] text-slate-400 font-bold">/ 5.0</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold mt-0.5">2,000+ verified consults</p>
              </div>
            </div>

            {/* Mini Trust Bubble */}
            <div className="absolute -top-2 sm:-top-3 -left-2 sm:-left-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-sand-200 p-2 sm:p-2.5 flex items-center gap-2 animate-bounce-subtle z-10">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs shrink-0">
                <i className="fas fa-shield-heart"></i>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800">100% Doctor-Led</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
