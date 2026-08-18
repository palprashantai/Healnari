import React from 'react';

function Hero({ onStartConsult, onOpenChecker, title, subtitle }) {
  return (
    <section className="relative overflow-hidden py-8 md:py-20 max-w-6xl mx-auto px-4 sm:px-5 md:px-8">
      {/* Decorative blurry background highlights */}
      <div className="absolute top-1/4 left-1/10 w-72 h-72 rounded-full bg-indigo-200/40 blur-3xl -z-10"></div>
      <div className="absolute top-1/3 right-1/10 w-80 h-80 rounded-full bg-violet-200/30 blur-3xl -z-10"></div>

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-8 text-center lg:text-left animate-slide-up order-2 lg:order-1">
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-aubergine-50 border border-aubergine-100 text-aubergine-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-lock text-aubergine-500"></i> 100% Private & Confidential
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-user-md text-emerald-500"></i> Qualified Indian Doctors
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-microscope text-amber-600"></i> Evidence-Based Medicine
            </span>
            <span className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-100 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs">
              <i className="fas fa-video text-sky-500"></i> Book in 2 Minutes
            </span>
          </div>

          {/* Main Titles */}
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl lg:leading-[1.15] font-extrabold tracking-tight text-slate-900 font-display">
              {title || (
                <>
                  Online PCOS & Hormonal Healthcare That <br className="hidden lg:block" />
                  Treats the <span className="text-aubergine-600">Root Cause</span>
                </>
              )}
            </h1>
            <div className="space-y-3 max-w-xl mx-auto lg:mx-0">
              {subtitle ? (
                <p className="text-slate-600 text-lg md:text-xl font-normal leading-relaxed whitespace-pre-line">
                  {subtitle}
                </p>
              ) : (
                <>
                  <p className="text-slate-600 text-lg md:text-xl font-normal leading-relaxed">
                    Tired of being told to <span className="text-slate-800 font-medium">"just lose weight"</span> or given a quick 5-minute prescription? HealNari connects you with specialist doctors — gynaecologists, endocrinologists, trichologists — for <span className="text-aubergine-600 font-medium">PCOS, thyroid issues, hormonal hair fall, acne, irregular periods, and weight management</span>. We find the root cause, not just the symptom.
                  </p>
                  <p className="text-slate-700 text-base md:text-lg font-medium leading-relaxed pt-1">
                    <span className="text-aubergine-700 font-bold">What you get:</span> A 45-minute 1-on-1 video consultation + personalised lab-test plan + diet & lifestyle protocol + 14-day free chat follow-up. All from home.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Pricing Banner */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-6 justify-center lg:justify-start text-sm sm:text-base font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full text-emerald-800 border border-emerald-100 shadow-xs text-xs sm:text-sm">
              <i className="fas fa-tag text-emerald-600"></i> Consultations starting at just ₹799
            </span>
          </div>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Primary Action Button */}
            <div className="relative group w-full sm:w-auto">
              <div className="absolute -top-3 right-2 sm:-right-3 z-10 bg-rose-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 sm:py-1 px-2 sm:px-2.5 rounded-full shadow-md shadow-rose-200/50 animate-bounce flex items-center gap-1 whitespace-nowrap">
                <i className="fas fa-calendar-day"></i> Next Slot: Today
              </div>
              <button 
                onClick={onStartConsult}
                className="w-full sm:w-auto relative bg-gradient-to-r from-aubergine-600 via-magenta-600 to-indigo-600 hover:from-aubergine-700 hover:via-magenta-700 hover:to-indigo-700 text-white font-extrabold px-6 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-3xl shadow-xl shadow-aubergine-200 hover:shadow-2xl hover:shadow-aubergine-300 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-xl group-hover:ring-4 ring-aubergine-100"
              >
                <i className="fas fa-stethoscope text-sm sm:text-base"></i> Book My ₹799 Consult
              </button>
            </div>
            <button
              onClick={onOpenChecker}
              className="w-full sm:w-auto bg-sand-50 hover:bg-aubergine-50 border border-sand-200 text-slate-700 font-bold py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl shadow-sm transition-all btn-interactive flex items-center justify-center gap-2 text-base sm:text-lg"
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
            <div className="flex -space-x-1 shrink-0">
              <span className="w-5 h-5 rounded-full bg-aubergine-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">✓</span>
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold border border-white">✓</span>
            </div>
            <span>45-min detailed video consult • Free 14-day chat follow-up • Prescription included</span>
          </div>


        </div>

        {/* Right Column: Visual Component */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end order-1 lg:order-2 mt-4 sm:mt-0">
          {/* Main Visual Frame */}
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-aubergine-600 via-magenta-400 to-indigo-300 opacity-25 blur-2xl animate-pulse-subtle"></div>
            
            {/* Beautiful Profile Image with Soft Vignette */}
            <div className="w-full h-full rounded-full overflow-hidden border-4 sm:border-8 border-white shadow-2xl relative">
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
