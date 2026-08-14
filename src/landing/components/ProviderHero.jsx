import React, { useState, useEffect } from 'react';
import Reveal from '../../components/Reveal.jsx';
import Tilt3D from '../../components/Tilt3D.jsx';
import { useToast } from '../../components/Toast.jsx';

function ProviderHero({ onApply, onOpenLogin }) {
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

  // 3-Line Typewriter Animation Effect
  const rotatingLines = [
    'Zero Clinic Overhead',
    '100% Clinical Autonomy',
    'Weekly Direct Payouts',
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
    toast.success(`Video room connected with ${nextPatient.patient} (${nextPatient.token})`, {
      icon: 'fa-video',
      duration: 4000
    });
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-gradient-to-b from-aubergine-50/50 via-[#FDFBF7] to-white">
      {/* Decorative Warm Highlights */}
      <div className="absolute top-12 left-1/10 w-96 h-96 rounded-full bg-aubergine-200/30 blur-3xl -z-10"></div>
      <div className="absolute top-24 right-1/10 w-96 h-96 rounded-full bg-pink-100/40 blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-5 md:px-8">
        
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6 animate-slide-up">
          
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 bg-white border border-aubergine-200/80 shadow-xs text-aubergine-800 text-xs font-semibold px-4 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Now Onboarding Gynaecologists, Endocrinologists &amp; Fertility Experts</span>
          </div>

          {/* Dynamic Typewriter Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.14] min-h-[120px] sm:min-h-[145px]">
            Expand Your Clinical Practice with <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-aubergine-700 via-magenta-600 to-indigo-700 inline-block">
              {displayedText}
            </span>
            <span className="inline-block w-[3.5px] h-[0.85em] bg-magenta-600 align-middle ml-1.5 animate-pulse rounded-full shadow-xs"></span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto font-normal">
            HealNari gives women's health specialists a dedicated digital clinic: smart tokenized queues, AI-assisted CDSS, longitudinal patient EMR, and pre-screened patient referrals with weekly direct payouts.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onApply}
              className="w-full sm:w-auto bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-aubergine-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 text-base"
            >
              <i className="fas fa-stethoscope"></i> Apply as a Specialist
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-sand-300 text-slate-700 font-semibold px-7 py-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 text-base"
            >
              <i className="fas fa-arrow-right-to-bracket text-aubergine-600"></i> Provider Login
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap justify-center items-center gap-6 pt-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><i className="fas fa-shield-halved text-emerald-600"></i> NMC &amp; Council Verified</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-circle-dollar-to-slot text-emerald-600"></i> Zero Monthly Software Fees</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-lock text-emerald-600"></i> 100% Clinical Autonomy</span>
          </div>
        </div>

        {/* Interactive Clinic Dashboard Showcase (Light, Premium, High-Fidelity) */}
        <div className="mt-14 md:mt-20 max-w-5xl mx-auto">
          <Reveal delay={150}>
            <Tilt3D max={3}>
              <div className="rounded-[2.5rem] bg-white border border-sand-300 shadow-2xl p-4 sm:p-7 relative overflow-hidden">
                
                {/* Top Control Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-aubergine-100 text-aubergine-700 font-black flex items-center justify-center text-sm">
                      HN
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Doctor Clinical Command Center</span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                          ● LIVE CLINIC
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Dr. Ananya Mehta • Reproductive Endocrinology</p>
                    </div>
                  </div>

                  {/* Interactive Workflow Switcher */}
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setActiveWorkflow('queue')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${activeWorkflow === 'queue' ? 'bg-white text-aubergine-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <i className="fas fa-hospital-user mr-1.5"></i> Live Queue
                    </button>
                    <button
                      onClick={() => setActiveWorkflow('cdss')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${activeWorkflow === 'cdss' ? 'bg-white text-aubergine-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <i className="fas fa-wand-magic-sparkles mr-1.5 text-indigo-500"></i> AI Insights
                    </button>
                    <button
                      onClick={() => setActiveWorkflow('earnings')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${activeWorkflow === 'earnings' ? 'bg-white text-aubergine-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <i className="fas fa-wallet mr-1.5 text-emerald-500"></i> Earnings
                    </button>
                  </div>
                </div>

                {/* 2-Identifier Patient Safety Banner */}
                <div className="bg-gradient-to-r from-aubergine-900 via-slate-900 to-aubergine-900 text-white rounded-2xl p-3.5 mb-5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded text-[10px] border border-emerald-500/30">
                      Active Patient
                    </span>
                    <strong className="text-white text-sm">{activeSession.patient}</strong>
                    <span className="text-aubergine-300 font-mono text-xs">[{activeSession.token}]</span>
                    <span className="text-slate-300 hidden sm:inline">• {activeSession.age} (Blood: O+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-950/80 border border-rose-600/40 text-rose-300 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                      <i className="fas fa-hand-dots mr-1"></i> Allergies: Penicillin
                    </span>
                    <span className="bg-amber-950/80 border border-amber-600/40 text-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold hidden md:inline">
                      <i className="fas fa-triangle-exclamation mr-1"></i> Critical Lab Flag: LH/FSH (2.8)
                    </span>
                  </div>
                </div>

                {/* Dynamic Content Body based on Workflow Tab */}
                {activeWorkflow === 'queue' && (
                  <div className="grid sm:grid-cols-12 gap-4 animate-fade-in">
                    
                    {/* Left: Live Patient Timeline */}
                    <div className="sm:col-span-8 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Today's Consultation Queue ({queueList.length + 1} Patients)</span>
                        {queueList.length > 0 ? (
                          <span className="text-emerald-600 font-extrabold">Next: Token {queueList[0].token}</span>
                        ) : (
                          <span className="text-slate-400 font-bold">All queue seen</span>
                        )}
                      </div>

                      {/* Active Patient Card */}
                      <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-2xl p-3.5 flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-3 shadow-xs transition-all">
                        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                          <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-sm">
                            {activeSession.token}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-2">
                              <span className="truncate">{activeSession.patient}</span>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shrink-0 whitespace-nowrap">● IN VIDEO CALL</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{activeSession.concern} • (Elapsed: {activeSession.elapsed} min)</p>
                          </div>
                        </div>
                        <span className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap ml-auto sm:ml-0">
                          <i className="fas fa-video"></i> Live Call
                        </span>
                      </div>

                      {/* Next Patient Card in Queue */}
                      {queueList.map((item, i) => (
                        <div key={item.token} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-3 transition-all">
                          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                            <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-800 text-white font-mono font-bold text-sm flex items-center justify-center">
                              {item.token}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-sm truncate">{item.patient}</div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{item.concern} • {item.time} (Waiting)</p>
                            </div>
                          </div>
                          {i === 0 && (
                            <button
                              onClick={handleCallNext}
                              className="bg-slate-900 hover:bg-aubergine-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-105 shrink-0 whitespace-nowrap ml-auto sm:ml-0"
                            >
                              <i className="fas fa-bullhorn text-[10px]"></i> Call Next
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Right: Quick Action Widget */}
                    <div className="sm:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1.5">
                          <i className="fas fa-triangle-exclamation"></i> Action Required
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">Urgent Hormone Panel</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Priya Sharma's fasting insulin &amp; DHEAS uploaded by partner lab.
                        </p>
                      </div>
                      <button 
                        onClick={() => toast.info("Viewing patient lab report details.")}
                        className="w-full bg-rose-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-rose-700 shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <i className="fas fa-flask"></i> Review Biomarkers
                      </button>
                    </div>

                  </div>
                )}

                {activeWorkflow === 'cdss' && (
                  <div className="space-y-3 animate-fade-in">
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
                      <p className="text-xs text-slate-400 font-extrabold uppercase">This Month (90% Net)</p>
                      <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-sans">₹1,48,500</p>
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">+18% practice growth</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 hover:border-indigo-200 transition-all">
                      <p className="text-xs text-slate-400 font-extrabold uppercase">Completed Consults</p>
                      <p className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1 font-sans">124 Patients</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Avg 4.96/5.0 Rating</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 hover:border-emerald-200 transition-all">
                      <p className="text-xs text-slate-400 font-extrabold uppercase">Next Bank Settlement</p>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-sans">Monday</p>
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Automated Weekly Payout</p>
                    </div>
                  </div>
                )}

              </div>
            </Tilt3D>
          </Reveal>
        </div>

      </div>
    </section>
  );
}

export default ProviderHero;
