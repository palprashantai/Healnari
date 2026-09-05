import React, { useState, useEffect } from 'react';
import Reveal from '../../components/Reveal.jsx';
import Tilt3D from '../../components/Tilt3D.jsx';
import { useToast } from '../../components/Toast.jsx';

function ProviderHero({ onApply, onOpenLogin, title, subtitle }) {
  const [activeWorkflow, setActiveWorkflow] = useState('queue');
  const [activeSession, setActiveSession] = useState({
    token: 'T-01',
    patient: 'Priya Sharma',
    age: '28F',
    concern: 'PCOS Root-Cause Diagnostic',
    status: 'In Video Call',
    elapsed: 18,
  });
  const [queueList, setQueueList] = useState([
    { token: 'T-02', patient: 'Ananya Roy', age: '24F', concern: 'Irregular Cycles & Acne', time: '10:15 AM' },
    { token: 'T-03', patient: 'Sneha Kapoor', age: '31F', concern: 'Hormonal Hair Fall', time: '11:00 AM' },
  ]);

  const toast = useToast();

  // 6-Line Typewriter Animation Effect
  const rotatingLines = [
    'AI-Powered Clinical EMR',
    'Automated SOAP Notes & Scribe',
    'Smart Rx & Drug Safety Checks',
    'Global Multi-Currency Practice',
    'Direct Net Weekly Payouts',
    'Full Clinical Autonomy',
  ];

  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = rotatingLines[lineIndex];
    const typingSpeed = isDeleting ? 35 : 75;

    if (!isDeleting && displayedText === currentFullText) {
      const pauseTimer = setTimeout(() => {
        setIsDeleting(true);
      }, 1900);
      return () => clearTimeout(pauseTimer);
    } else if (isDeleting && displayedText === '') {
      setIsDeleting(false);
      setLineIndex((prev) => (prev + 1) % rotatingLines.length);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(
        isDeleting
          ? currentFullText.substring(0, displayedText.length - 1)
          : currentFullText.substring(0, displayedText.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, lineIndex]);

  const handleCallNext = () => {
    if (queueList.length === 0) return;
    const nextPatient = queueList[0];
    setQueueList(prev => prev.slice(1));
    setActiveSession({
      token: nextPatient.token,
      patient: nextPatient.patient,
      age: nextPatient.age,
      concern: nextPatient.concern,
      status: 'In Video Call',
      elapsed: 1,
    });
    if (toast) {
      if (typeof toast.success === 'function') {
        toast.success(`Video room connected with ${nextPatient.patient} (${nextPatient.token})`, 4000);
      } else if (typeof toast === 'function') {
        toast(`Video room connected with ${nextPatient.patient} (${nextPatient.token})`, 'success', 4000);
      }
    }
  };

  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pt-8 sm:pb-16 md:pt-14 md:pb-24 bg-gradient-to-b from-aubergine-50/50 via-[#FDFBF7] to-white">
      {/* Decorative Warm Highlights */}
      <div className="absolute top-12 left-1/10 w-96 h-96 rounded-full bg-aubergine-200/30 blur-3xl -z-10"></div>
      <div className="absolute top-24 right-1/10 w-96 h-96 rounded-full bg-pink-100/40 blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Main Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-5 sm:space-y-6 animate-slide-up">
          
          {/* Top Social Proof & Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center -space-x-2">
              <img src="/generated/doc1.webp" alt="Doctor" className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs" />
              <img src="/generated/doc2.webp" alt="Doctor" className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs" />
              <img src="/generated/doc3.webp" alt="Doctor" className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs" />
              <div className="w-7 h-7 rounded-full border-2 border-white bg-aubergine-700 text-white font-black text-[9px] flex items-center justify-center shadow-2xs">
                250+
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <div className="flex text-amber-500 text-[11px]">
                <i className="fas fa-star" />
                <i className="fas fa-star" />
                <i className="fas fa-star" />
                <i className="fas fa-star" />
                <i className="fas fa-star" />
              </div>
              <span className="font-extrabold text-slate-900">4.96/5</span>
              <span className="text-slate-500 font-normal">Clinician Rating</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                <i className="fas fa-shield-halved text-emerald-600" /> NMC Verified Network
              </span>
            </div>
          </div>

          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 bg-white border border-aubergine-200/80 shadow-xs text-aubergine-800 text-[11px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 rounded-full text-center max-w-full">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="sm:hidden">Onboarding Women's Health Specialists</span>
            <span className="hidden sm:inline">Now Onboarding Gynaecologists, Endocrinologists, Dermatologists, Trichologists, Dietitians &amp; Yoga Therapists</span>
          </div>

          {/* Typography Section */}
          <div className="space-y-4 sm:space-y-5 relative z-10">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.2] sm:leading-[1.14]">
              {title || (
                <>
                  Expand Your Clinical Practice with <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-aubergine-700 via-magenta-600 to-indigo-700 inline-block min-h-[1.15em]">
                    {displayedText}
                  </span>
                  <span className="inline-block w-[3px] sm:w-[3.5px] h-[0.85em] bg-magenta-600 align-middle ml-1 animate-pulse rounded-full shadow-xs"></span>
                </>
              )}
            </h1>
            <p className="text-slate-600 text-sm sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-normal px-1">
              {subtitle || "Run your multi-specialty digital clinic on HealNari — zero rent, zero staff overhead, zero commute. Connect with pre-screened patients across Gynecology, PCOS, Endocrinology, Dermatology, Nutrition, and Movement with built-in AI EMR, digital Rx, and direct weekly payouts."}
            </p>
          </div>

          {/* Specialties Ribbon */}
          <div className="pt-1 pb-1 flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-3xl mx-auto">
            {[
              { icon: 'fa-venus', label: 'Gynaecology & PCOS', color: 'text-rose-700 bg-rose-50/80 border-rose-200' },
              { icon: 'fa-dna', label: 'Endocrinology & Thyroid', color: 'text-indigo-700 bg-indigo-50/80 border-indigo-200' },
              { icon: 'fa-wand-magic-sparkles', label: 'Dermatology & Acne', color: 'text-amber-700 bg-amber-50/80 border-amber-200' },
              { icon: 'fa-seedling', label: 'Trichology & Scalp', color: 'text-emerald-700 bg-emerald-50/80 border-emerald-200' },
              { icon: 'fa-apple-whole', label: 'Clinical Nutrition', color: 'text-teal-700 bg-teal-50/80 border-teal-200' },
              { icon: 'fa-person-praying', label: 'Pelvic & Yoga Therapy', color: 'text-purple-700 bg-purple-50/80 border-purple-200' },
              { icon: 'fa-baby', label: 'Fertility & Ovulation', color: 'text-pink-700 bg-pink-50/80 border-pink-200' },
            ].map(s => (
              <span key={s.label} className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border shadow-2xs ${s.color}`}>
                <i className={`fas ${s.icon} text-[10px]`} />
                {s.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-4 pt-2">
            <button
              onClick={onApply}
              className="w-full sm:w-auto bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl shadow-lg shadow-aubergine-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 text-sm sm:text-base"
            >
              <i className="fas fa-stethoscope"></i>
              <span className="sm:hidden">Apply as Specialist (3 Mins)</span>
              <span className="hidden sm:inline">Apply as Specialist (Takes 3 Mins)</span>
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-sand-300 text-slate-700 font-semibold px-6 py-3.5 sm:py-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <i className="fas fa-arrow-right-to-bracket text-aubergine-600"></i> Provider Login
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center items-center gap-2.5 sm:gap-6 pt-1 text-[11px] sm:text-xs font-medium text-slate-500 text-left sm:text-center">
            <span className="flex items-center gap-1.5"><i className="fas fa-shield-halved text-emerald-600"></i> Verified Credentials</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-circle-dollar-to-slot text-emerald-600"></i> Direct Weekly Payout</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-lock text-emerald-600"></i> Clinical Autonomy</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-users text-emerald-600"></i> 8+ Specialties</span>
          </div>

          {/* 4 Key Practice Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 text-left">
            <div className="bg-white/95 border border-sand-300/90 rounded-2xl p-4 shadow-xs hover:border-aubergine-300 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-aubergine-50 text-aubergine-700 flex items-center justify-center text-sm font-black mb-2.5 group-hover:scale-105 transition-transform">
                <i className="fas fa-hand-holding-dollar" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">Zero Platform Rent</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Set your own consult fees. 100% net earnings deposited weekly into your registered bank account.
              </p>
            </div>

            <div className="bg-white/95 border border-sand-300/90 rounded-2xl p-4 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-black mb-2.5 group-hover:scale-105 transition-transform">
                <i className="fas fa-file-waveform" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">AI Scribe &amp; 1-Click Rx</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Auto-generate standard SOAP notes in 15 seconds. Built-in drug contraindication checks.
              </p>
            </div>

            <div className="bg-white/95 border border-sand-300/90 rounded-2xl p-4 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-black mb-2.5 group-hover:scale-105 transition-transform">
                <i className="fas fa-earth-americas" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">NRI &amp; Global Patients</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Consult pre-screened patients from India, UAE, UK, and USA in both INR (₹) and USD ($).
              </p>
            </div>

            <div className="bg-white/95 border border-sand-300/90 rounded-2xl p-4 shadow-xs hover:border-rose-300 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm font-black mb-2.5 group-hover:scale-105 transition-transform">
                <i className="fas fa-user-shield" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">100% Clinical Autonomy</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Total independent clinical judgment. Governed under NMC Telemedicine Guidelines.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Clinic Dashboard Showcase (Light, Premium, High-Fidelity) */}
        <div className="mt-8 sm:mt-12 md:mt-16 w-full max-w-5xl mx-auto min-w-0">
          <Reveal delay={150}>
            <Tilt3D max={3} className="w-full min-w-0">
              <div className="rounded-2xl sm:rounded-[2rem] bg-white border border-sand-300 shadow-xl sm:shadow-2xl p-3 sm:p-5 md:p-7 relative overflow-hidden w-full min-w-0 max-w-full box-border">
                
                {/* Top Control Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3.5 sm:pb-5 mb-3.5 sm:mb-5 border-b border-slate-100 w-full min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-aubergine-100 text-aubergine-700 font-black flex items-center justify-center text-xs sm:text-sm shrink-0">
                      HN
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">Doctor Command Center</span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                          ● LIVE CLINIC
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">Dr. Ananya Mehta • Reproductive Endocrinology</p>
                    </div>
                  </div>

                  {/* Interactive Workflow Switcher */}
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto hide-scrollbar shrink-0">
                    <button
                      onClick={() => setActiveWorkflow('queue')}
                      className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-center text-[11px] sm:text-xs ${activeWorkflow === 'queue' ? 'bg-white text-aubergine-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <i className="fas fa-hospital-user mr-1"></i> Live Queue
                    </button>
                    <button
                      onClick={() => setActiveWorkflow('rx')}
                      className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-center text-[11px] sm:text-xs ${activeWorkflow === 'rx' ? 'bg-white text-aubergine-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <i className="fas fa-prescription mr-1 text-teal-600"></i> Smart Rx &amp; Scribe
                    </button>
                    <button
                      onClick={() => setActiveWorkflow('cdss')}
                      className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-center text-[11px] sm:text-xs ${activeWorkflow === 'cdss' ? 'bg-white text-aubergine-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <i className="fas fa-wand-magic-sparkles mr-1 text-indigo-500"></i> AI Insights
                    </button>
                    <button
                      onClick={() => setActiveWorkflow('earnings')}
                      className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-center text-[11px] sm:text-xs ${activeWorkflow === 'earnings' ? 'bg-white text-aubergine-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <i className="fas fa-wallet mr-1 text-emerald-500"></i> Earnings
                    </button>
                  </div>
                </div>

                {/* 2-Identifier Patient Safety Banner */}
                <div className="bg-gradient-to-r from-aubergine-900 via-slate-900 to-aubergine-900 text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 mb-3.5 sm:mb-5 flex flex-wrap items-center justify-between gap-1.5 text-xs shadow-md w-full min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                    <span className="bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] border border-emerald-500/30 shrink-0">
                      Active
                    </span>
                    <strong className="text-white text-xs sm:text-sm truncate">{activeSession.patient}</strong>
                    <span className="text-aubergine-300 font-mono text-[10px] sm:text-xs shrink-0">[{activeSession.token}]</span>
                    <span className="text-slate-300 hidden xs:inline text-[10px] sm:text-xs">• {activeSession.age}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-rose-950/80 border border-rose-600/40 text-rose-300 px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold whitespace-nowrap">
                      <i className="fas fa-hand-dots mr-1"></i> Allergies: Penicillin
                    </span>
                  </div>
                </div>

                {/* Dynamic Content Body based on Workflow Tab */}
                {activeWorkflow === 'queue' && (
                  <div className="grid sm:grid-cols-12 gap-3 sm:gap-4 animate-fade-in w-full min-w-0">
                    
                    {/* Left: Live Patient Timeline */}
                    <div className="sm:col-span-8 space-y-2 sm:space-y-3 min-w-0">
                      <div className="flex justify-between items-center text-[11px] sm:text-xs font-bold text-slate-700 px-0.5">
                        <span className="truncate pr-2">
                          Today's Queue ({queueList.length + 1})
                        </span>
                        {queueList.length > 0 ? (
                          <span className="text-emerald-600 font-extrabold shrink-0 whitespace-nowrap">
                            Next: {queueList[0].token}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold shrink-0">All seen</span>
                        )}
                      </div>

                      {/* Active Patient Card */}
                      <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-all w-full min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <span className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg sm:rounded-xl bg-emerald-600 text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm">
                            {activeSession.token}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <span className="truncate">{activeSession.patient}</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[8px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shrink-0 whitespace-nowrap">● LIVE</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{activeSession.concern}</p>
                          </div>
                        </div>
                        <span className="bg-emerald-600 text-white font-bold px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap">
                          <i className="fas fa-video text-[9px] sm:text-[10px]"></i> Live Call
                        </span>
                      </div>

                      {/* Next Patient Card in Queue */}
                      {queueList.map((item, i) => (
                        <div key={item.token} className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 transition-all w-full min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg sm:rounded-xl bg-slate-800 text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center">
                              {item.token}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">{item.patient}</div>
                              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{item.concern} • {item.time}</p>
                            </div>
                          </div>
                          {i === 0 && (
                            <button
                              onClick={handleCallNext}
                              className="bg-slate-900 hover:bg-aubergine-700 text-white font-bold px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs transition-all flex items-center justify-center gap-1 shadow-sm hover:scale-105 shrink-0 whitespace-nowrap"
                            >
                              <i className="fas fa-bullhorn text-[9px]"></i> Call Next
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Right: Quick Action Widget */}
                    <div className="sm:col-span-4 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between space-y-2.5 sm:space-y-3 min-w-0">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                          <i className="fas fa-triangle-exclamation"></i> Action Required
                        </div>
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">Urgent Hormone Panel</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Priya Sharma's fasting insulin &amp; DHEAS uploaded by partner lab.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          if (toast) {
                            if (typeof toast.info === 'function') toast.info("Viewing patient lab report details.");
                            else if (typeof toast === 'function') toast("Viewing patient lab report details.", 'info');
                          }
                        }}
                        className="w-full bg-rose-600 text-white font-bold py-2 rounded-lg sm:rounded-xl text-xs hover:bg-rose-700 shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <i className="fas fa-flask"></i> Review Biomarkers
                      </button>
                    </div>

                  </div>
                )}

                {/* Smart Rx & Scribe Tab */}
                {activeWorkflow === 'rx' && (
                  <div className="space-y-3 animate-fade-in text-left">
                    <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-3">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2 text-teal-950 font-extrabold text-sm">
                          <i className="fas fa-file-signature text-teal-600"></i> AI Clinical Scribe &amp; Digital Rx
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">
                          SOAP Note Auto-Generated
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        {/* Auto-Drafted SOAP Note */}
                        <div className="bg-white p-3.5 rounded-xl border border-teal-100 space-y-1.5 text-slate-700 leading-relaxed">
                          <p className="font-extrabold text-teal-950 text-xs flex items-center gap-1">
                            <i className="fas fa-notes-medical text-teal-600" /> Subjective &amp; Objective
                          </p>
                          <p className="text-[11px] text-slate-600">
                            <strong>S:</strong> 28F presenting with 45-day oligomenorrhea, progressive adult acne &amp; fatigue. <br />
                            <strong>O:</strong> Fasting Insulin 18.2 µIU/mL, LH/FSH 2.8. Pelvic USG reveals bilateral polycystic morphology.
                          </p>
                          <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                            <strong>A:</strong> Polycystic Ovarian Syndrome (Insulin-Resistant Phenotype).
                          </p>
                        </div>

                        {/* Prescribed Medications */}
                        <div className="bg-white p-3.5 rounded-xl border border-teal-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="font-extrabold text-teal-950 text-xs flex items-center gap-1">
                              <i className="fas fa-capsules text-teal-600" /> Digital Prescription (Rx)
                            </p>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ Drug Interaction Verified
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px] text-slate-700">
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                              <span><strong>1. Myo-Inositol + D-Chiro-Inositol (40:1)</strong> — 2000mg</span>
                              <span className="text-slate-500 font-medium">1-0-1 (B.F.)</span>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                              <span><strong>2. Metformin SR</strong> — 500mg</span>
                              <span className="text-slate-500 font-medium">0-0-1 (Dinner)</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                            <span>Dr. Ananya Mehta (Reg: NMC-15201)</span>
                            <span className="text-emerald-600 font-bold">● Digitally Signed</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkflow === 'cdss' && (
                  <div className="space-y-3 animate-fade-in text-left">
                    <div className="p-4 bg-indigo-50/90 border border-indigo-200/80 rounded-2xl space-y-3">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-sm">
                          <i className="fas fa-wand-magic-sparkles text-indigo-600"></i> AI Clinical Decision Support System (CDSS)
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200" title="Non-prescriptive diagnostic assistance">
                          Diagnostic Intelligence
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100/80 space-y-2 text-xs text-slate-700 leading-relaxed">
                        <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                          <i className="fas fa-clipboard-user text-indigo-500"></i> Patient: {activeSession.patient} ({activeSession.age}) • Token {activeSession.token}
                        </p>
                        <p>
                          • <strong>Symptoms:</strong> Menstrual cycles ~45 days, progressive hirsutism (Ferriman-Gallwey Score: 9), persistent adult acne. <br />
                          • <strong>Biomarkers:</strong> LH/FSH ratio 2.8, Fasting Insulin 18.2 µIU/mL (High Insulin Resistance), Normal Thyroid Profile (TSH: 2.1). <br />
                          • <strong>Provisional Suggestion:</strong> Insulin-Resistant PCOS phenotype. Recommended Inositol 40:1 ratio &amp; Metformin evaluation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkflow === 'earnings' && (
                  <div className="grid sm:grid-cols-3 gap-4 animate-fade-in text-center">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 hover:border-aubergine-200 transition-all">
                      <p className="text-xs text-slate-500 font-extrabold uppercase">This Month (Net Payout)</p>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-sans">₹1,48,500</p>
                      <p className="text-[11px] text-indigo-600 font-bold mt-0.5">Incl. $1,420 from US/NRI Patients</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 hover:border-indigo-200 transition-all">
                      <p className="text-xs text-slate-500 font-extrabold uppercase">Completed Consults</p>
                      <p className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1 font-sans">124 Patients</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Global Patients (INR • USD • AED)</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 hover:border-emerald-200 transition-all">
                      <p className="text-xs text-slate-500 font-extrabold uppercase">Next Bank Settlement</p>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-sans">Monday</p>
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Automated Weekly Direct Deposit</p>
                    </div>
                  </div>
                )}

              </div>
            </Tilt3D>
          </Reveal>
        </div>

        {/* Platform Metrics Ticker */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
          <div className="p-3.5 rounded-2xl bg-white/80 border border-sand-200/80 shadow-2xs">
            <p className="text-2xl sm:text-3xl font-black text-aubergine-800 font-display">₹0</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">Upfront Platform Cost</p>
            <p className="text-[10px] text-slate-400">No software fees</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-sand-200/80 shadow-2xs">
            <p className="text-2xl sm:text-3xl font-black text-indigo-700 font-display">3 Mins</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">Paperless Onboarding</p>
            <p className="text-[10px] text-slate-400">Fast digital KYC check</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-sand-200/80 shadow-2xs">
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 font-display">Every Mon</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">Direct Bank Payouts</p>
            <p className="text-[10px] text-slate-400">INR &amp; USD settlements</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 border border-sand-200/80 shadow-2xs">
            <p className="text-2xl sm:text-3xl font-black text-rose-700 font-display">15 Secs</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">AI SOAP Scribe Speed</p>
            <p className="text-[10px] text-slate-400">Save 80% admin time</p>
          </div>
        </div>

      </div>
    </section>
  );
}

export default ProviderHero;
