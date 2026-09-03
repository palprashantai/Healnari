import React, { useState } from 'react';
import Reveal from '../../components/Reveal.jsx';

export default function PatientAiShowcase({ onStartConsult, onOpenChecker }) {
  const [activeTab, setActiveTab] = useState('lab');

  const tabs = [
    {
      id: 'lab',
      label: 'Lab Report Translator',
      icon: 'fa-flask-vial',
      tag: 'Popular',
      color: 'from-aubergine-600 to-indigo-600',
    },
    {
      id: 'prep',
      label: 'Consultation Prep',
      icon: 'fa-clipboard-question',
      tag: 'Pre-Visit',
      color: 'from-magenta-600 to-rose-600',
    },
    {
      id: 'companion',
      label: '24/7 Companion',
      icon: 'fa-sparkles',
      tag: 'Always On',
      color: 'from-violet-600 to-fuchsia-600',
    },
  ];

  const aiCapabilities = [
    {
      icon: 'fa-file-lines',
      title: 'Hormone Biomarker Translation',
      desc: 'Instant plain-English interpretation of LH/FSH ratios, Fasting Insulin, AMH, Thyroid, and DHEAS without intimidating medical jargon.',
      badge: 'Diagnostics AI',
      color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-200',
    },
    {
      icon: 'fa-calendar-check',
      title: 'Personalized Doctor Prep',
      desc: 'Builds your symptom timeline and auto-generates high-yield questions for your 45-minute video consult so nothing is missed.',
      badge: 'Visit Readiness',
      color: 'text-magenta-600 bg-magenta-50 border-magenta-200',
    },
    {
      icon: 'fa-comments',
      title: 'Private 24/7 Health Companion',
      desc: 'Ask questions anytime regarding cycle delays, supplement timings (Inositol, Vitamin D3), flare-ups, and dietary swaps.',
      badge: 'Instant Guidance',
      color: 'text-violet-600 bg-violet-50 border-violet-200',
    },
    {
      icon: 'fa-chart-pie',
      title: 'Cycle-Syncing Intelligence',
      desc: 'Hormone-aware diet, exercise, and energy forecasts mapped across your Follicular, Ovulatory, Luteal, and Menstrual phases.',
      badge: 'Root-Cause Care',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <section id="ai-features" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-gradient-to-r from-aubergine-200/20 via-pink-200/20 to-indigo-200/20 blur-3xl pointer-events-none -z-10 rounded-full"></div>

      {/* Header */}
      <Reveal className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-aubergine-50 via-magenta-50 to-indigo-50 border border-aubergine-200/80 px-4 py-1.5 rounded-full shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-magenta-500 animate-ping"></span>
          <span className="text-xs font-black uppercase tracking-wider text-aubergine-800">
            HealNari AI Health Suite
          </span>
          <span className="text-[10px] font-bold bg-magenta-600 text-white px-2 py-0.2 rounded-full">
            NEW
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.15]">
          Intelligent Healthcare That <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-aubergine-600 via-magenta-600 to-indigo-600">
            Listens, Explains &amp; Guides You
          </span>
        </h2>

        <p className="text-slate-600 text-base sm:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
          No more confusing lab sheets or waiting days for simple answers. HealNari's clinical AI tools translate your blood work, prepare you for consultations, and provide compassionate 24/7 care alongside your doctor.
        </p>
      </Reveal>

      {/* Interactive Live AI Simulator */}
      <Reveal delay={100} className="mb-14">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-sand-300 shadow-2xl overflow-hidden max-w-5xl mx-auto">
          {/* Top Tab Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-sand-200 bg-sand-50/70 p-1.5 sm:p-2.5 gap-1.5 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${isActive
                      ? 'bg-white text-aubergine-900 shadow-md border border-aubergine-100 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  <i className={`fas ${tab.icon} shrink-0 ${isActive ? 'text-magenta-600' : 'text-slate-400'}`}></i>
                  <span className="truncate">{tab.label}</span>
                  {tab.tag && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 hidden md:inline-block ${isActive
                          ? 'bg-magenta-100 text-magenta-800'
                          : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                      {tab.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Simulator Content Area */}
          <div className="p-4 sm:p-7 lg:p-9 bg-gradient-to-b from-white to-sand-50/40">
            {activeTab === 'lab' && (
              <div className="grid lg:grid-cols-12 gap-6 items-center animate-fade-in">
                {/* Left: Input Mock */}
                <div className="lg:col-span-5 space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-200">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <i className="fas fa-file-pdf text-rose-500"></i> Sample_Hormone_Panel.pdf
                    </span>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                      Scanned &amp; Verified
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-600 font-medium">LH / FSH Ratio</span>
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        2.8 : 1 (Elevated)
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-600 font-medium">Fasting Insulin</span>
                      <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        18.2 µIU/mL (Sub-optimal)
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-600 font-medium">AMH (Anti-Müllerian)</span>
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        6.4 ng/mL (High follicular reserve)
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-600 font-medium">TSH (Thyroid)</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        2.1 mIU/L (Optimal)
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <i className="fas fa-lock text-emerald-500"></i> 100% HIPAA-compliant end-to-end encrypted processing
                  </div>
                </div>

                {/* Right: AI Output Mock */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-gradient-to-r from-aubergine-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-magenta-300 bg-white/10 px-3 py-1 rounded-full">
                        <i className="fas fa-wand-magic-sparkles"></i> AI Clinical Summary (Plain English)
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono">Generated in 1.4s</span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-2 font-display">
                      Key Findings: Insulin Resistance + Anovulatory PCOS Tendency
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
                      Your <strong>LH/FSH ratio (2.8:1)</strong> indicates hormonal signalling imbalance typical of PCOS, explaining delayed follicular maturation and irregular cycles. Your <strong>fasting insulin (18.2)</strong> confirms metabolic resistance, which drives excess androgen production.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-white/15">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <p className="font-bold text-magenta-300 mb-1">
                          <i className="fas fa-carrot mr-1.5"></i> Nutrition Action
                        </p>
                        <p className="text-slate-300 text-[11px]">
                          Prioritize low-glycemic, high-protein breakfast to stabilize glucose curve; discuss Myo-Inositol (40:1) with your doctor.
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <p className="font-bold text-emerald-300 mb-1">
                          <i className="fas fa-clipboard-question mr-1.5"></i> Doctor Discussion
                        </p>
                        <p className="text-slate-300 text-[11px]">
                          Ask your gynecologist whether a 2-hour OGTT or Metformin protocol is indicated for your cycle goals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <i className="fas fa-circle-check text-emerald-500"></i> Reviewed by certified endocrinologists &amp; OB-GYNs
                    </span>
                    <button
                      onClick={onStartConsult}
                      className="w-full sm:w-auto bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-user-md"></i> Discuss Results with a Specialist (₹799)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prep' && (
              <div className="grid lg:grid-cols-12 gap-6 items-center animate-fade-in">
                {/* Left: Patient Inputs */}
                <div className="lg:col-span-5 space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                  <div className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-200 flex items-center justify-between">
                    <span>Your Health Inputs</span>
                    <span className="text-magenta-600 font-bold text-[11px]">Auto-Synced</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Concern</span>
                      <span className="font-semibold text-slate-800">45-day irregular cycles + adult chin acne + hair thinning</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Previous Medication</span>
                      <span className="font-semibold text-slate-800">Oral contraceptives (stopped 6 months ago), Biotin supplements</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Outcome</span>
                      <span className="font-semibold text-slate-800">Restore natural 28-32 day ovulation without dependency on synthetic birth control</span>
                    </div>
                  </div>
                </div>

                {/* Right: Generated Checklist */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-white border border-sand-300 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-magenta-700 bg-magenta-50 border border-magenta-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <i className="fas fa-list-check text-magenta-600"></i> Tailored 45-Min Consult Roadmap
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">3 High-Yield Questions</span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700">
                      <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-aubergine-500">
                        <p className="font-bold text-slate-900 mb-0.5">
                          1. Post-Pill Amenorrhea vs True PCOS
                        </p>
                        <p className="text-slate-600">
                          "Doctor, could my cycle delay be temporary hypothalamic rebound after stopping the pill, or do my lab markers confirm Rotterdam PCOS criteria?"
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-magenta-500">
                        <p className="font-bold text-slate-900 mb-0.5">
                          2. Insulin Sensitizer Strategy
                        </p>
                        <p className="text-slate-600">
                          "Given my fasting insulin is 18.2, should we start with Myo-Inositol/D-Chiro Inositol or is pharmaceutical Metformin advised for my metabolic phenotype?"
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-indigo-500">
                        <p className="font-bold text-slate-900 mb-0.5">
                          3. Androgen Hair Loss Differential
                        </p>
                        <p className="text-slate-600">
                          "Is my hair shedding Telogen Effluvium or androgenetic miniaturization? What topical or nutritional blockers are safe?"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={onStartConsult}
                      className="bg-magenta-600 hover:bg-magenta-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <i className="fas fa-calendar-check"></i> Book Doctor with Pre-Consult Notes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'companion' && (
              <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
                {/* Chat Container */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner">
                  {/* User Message */}
                  <div className="flex items-start justify-end gap-2.5">
                    <div className="bg-aubergine-600 text-white text-xs sm:text-sm p-3.5 rounded-2xl rounded-tr-none max-w-md shadow-sm">
                      <p>
                        "I'm on day 34 of my cycle and still no period. I took a pregnancy test and it was negative. Should I be panicking?"
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-aubergine-200 text-aubergine-800 font-bold text-xs flex items-center justify-center shrink-0">
                      You
                    </div>
                  </div>

                  {/* AI Companion Response */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-magenta-500 to-indigo-500 text-white text-xs flex items-center justify-center shrink-0 shadow-sm">
                      <i className="fas fa-sparkles text-[10px]"></i>
                    </div>
                    <div className="bg-white border border-sand-200 text-slate-700 text-xs sm:text-sm p-4 rounded-2xl rounded-tl-none max-w-lg shadow-sm space-y-2">
                      <p className="font-bold text-aubergine-900">
                        Please don't panic. A cycle delay of 34 days is very common and manageable.
                      </p>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Since pregnancy is ruled out, this is almost always caused by <strong>delayed ovulation</strong> triggered by acute stress, poor sleep, a recent viral episode, or an insulin surge. Your period cannot begin until ~14 days after ovulation occurs.
                      </p>
                      <div className="bg-magenta-50/70 border border-magenta-100 p-2.5 rounded-xl text-[11px] text-magenta-900">
                        <strong className="block mb-0.5">Recommended Next Steps:</strong>
                        • Maintain warm herbal infusions (Spearmint or Ginger tea)<br />
                        • Prioritize 8 hours of sleep to reduce cortisol<br />
                        • If cycle exceeds 45 days, our Gynecologists can initiate a progesterone withdrawal challenge.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-shield-halved text-emerald-500"></i> Private &amp; encrypted. Non-judgmental women's health guidance.
                  </span>
                  <button
                    onClick={onOpenChecker}
                    className="text-magenta-600 hover:text-magenta-800 font-bold flex items-center gap-1"
                  >
                    Try Symptom Checker Tool →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* 4 Feature Pillars Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
        {aiCapabilities.map((cap, idx) => (
          <Reveal key={cap.title} delay={idx * 60}>
            <div className="h-full bg-white hover:bg-aubergine-50/20 border border-sand-200/90 hover:border-aubergine-300 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base border ${cap.color} shadow-xs group-hover:scale-105 transition-transform`}>
                    <i className={`fas ${cap.icon}`}></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                    {cap.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-aubergine-700 transition-colors">
                  {cap.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {cap.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-aubergine-600">
                <span>Included in HealNari Care</span>
                <i className="fas fa-arrow-right text-[10px] ml-auto group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
