import React, { useState } from 'react';
import Reveal from '../../components/Reveal.jsx';

export default function DoctorAiShowcase({ onApply, onOpenLogin }) {
  const [activeTab, setActiveTab] = useState('soap');

  const tabs = [
    {
      id: 'soap',
      label: 'AI SOAP Notes',
      icon: 'fa-file-medical',
      tag: '80% Faster',
    },
    {
      id: 'rx',
      label: 'Smart Rx & Safety',
      icon: 'fa-prescription-bottle-medical',
      tag: 'Safety AI',
    },
    {
      id: 'brief',
      label: 'Intake Synthesizer',
      icon: 'fa-clipboard-user',
      tag: 'Zero Prep',
    },
  ];

  const clinicalCapabilities = [
    {
      icon: 'fa-file-lines',
      title: 'Automated Clinical SOAP Scribe',
      desc: 'Transforms raw teleconsult notes or voice dictation into standard EMR SOAP notes in under 15 seconds. Saves 20+ minutes per appointment.',
      badge: 'Documentation AI',
      color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-200',
    },
    {
      icon: 'fa-shield-halved',
      title: 'Real-Time Drug Interaction Checks',
      desc: 'Instant formulation autocomplete with automatic cross-referencing against allergies, renal markers, and contraindications.',
      badge: 'Patient Safety',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      icon: 'fa-wand-magic-sparkles',
      title: '1-Click Patient Care Briefs',
      desc: 'Auto-generates empathetic, plain-language takeaway summaries and dietary milestones for patients, boosting compliance.',
      badge: 'Adherence AI',
      color: 'text-magenta-600 bg-magenta-50 border-magenta-200',
    },
    {
      icon: 'fa-globe',
      title: 'Global Multi-Currency Practice',
      desc: 'Consult patients from India, USA, UK, UAE and Europe. Patients pay in local currencies (INR, USD, AED, GBP); you receive weekly 90% payouts.',
      badge: 'Global Telehealth',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <section id="ai-clinical-suite" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative scroll-mt-20">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-gradient-to-r from-aubergine-100/40 via-purple-100/30 to-sand-200/50 blur-3xl pointer-events-none -z-10 rounded-full"></div>

      {/* Header */}
      <Reveal className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 bg-aubergine-50 border border-aubergine-200 px-4 py-1.5 rounded-full shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-aubergine-600 animate-pulse"></span>
          <span className="text-xs font-black uppercase tracking-wider text-aubergine-800">
            Clinical AI &amp; Smart EMR Suite
          </span>
          <span className="text-[10px] font-bold bg-aubergine-700 text-white px-2 py-0.2 rounded-full">
            Included Free
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.15]">
          Practice at the Top of Your License. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-aubergine-700 via-magenta-600 to-indigo-700">
            Let AI Handle the Paperwork.
          </span>
        </h2>

        <p className="text-slate-600 text-base sm:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
          HealNari's AI EMR empowers doctors to focus 100% on clinical diagnosis and patient rapport. You retain absolute medical decision-making while our AI drafts your notes, checks drug safety, and briefs you on patients.
        </p>
      </Reveal>

      {/* Interactive EMR AI Showcase */}
      <Reveal delay={100} className="mb-14">
        <div className="bg-white rounded-3xl border border-sand-300 shadow-2xl overflow-hidden max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-sand-200 bg-sand-50/70 p-1.5 sm:p-2.5 gap-1.5 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-white text-aubergine-900 shadow-md border border-aubergine-100 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <i className={`fas ${tab.icon} shrink-0 ${isActive ? 'text-aubergine-600' : 'text-slate-400'}`}></i>
                  <span className="truncate">{tab.label}</span>
                  {tab.tag && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 hidden md:inline-block ${
                        isActive
                          ? 'bg-aubergine-100 text-aubergine-800'
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

          {/* Interactive Screen Content */}
          <div className="p-4 sm:p-7 lg:p-9 bg-[#FAFAF8]">
            {activeTab === 'soap' && (
              <div className="grid lg:grid-cols-12 gap-6 items-center animate-fade-in">
                {/* Left: Raw Consultation Input Mock */}
                <div className="lg:col-span-5 space-y-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                    <span className="flex items-center gap-1.5 text-aubergine-800">
                      <i className="fas fa-microphone text-rose-500 animate-pulse"></i> Teleconsult Dictation / Notes
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                      Session #T-01
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono text-slate-700 leading-relaxed max-h-56 overflow-y-auto">
                    "Patient Priya Sharma, 28F. Reports period delayed by 48 days. Moderate facial acne and thinning hair along crown. Weight up 4kg in 6 months despite gym. Labs show LH 14.2, FSH 5.1 (ratio 2.8), Fasting insulin 18.2, normal thyroid. No pregnancy. Initiating Inositol 40:1 ratio, low carb lifestyle protocol, review with 2hr OGTT in 30 days."
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span><i className="fas fa-check-double text-emerald-500 mr-1"></i> Audio &amp; Text Capturing</span>
                    <span className="text-aubergine-600 font-bold">1-Click Convert ➔</span>
                  </div>
                </div>

                {/* Right: Clean Generated SOAP Note */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-white border border-sand-300 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sand-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <strong className="text-slate-900 text-xs sm:text-sm font-display">
                          Clinical SOAP Documentation (Ready for Signature)
                        </strong>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        HIPAA &amp; EMR Aligned
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="bg-slate-50 p-2.5 rounded-xl border-l-3 border-aubergine-600">
                        <strong className="text-aubergine-900 font-bold block mb-0.5">S (Subjective)</strong>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          28 yo female with oligomenorrhea (cycle 48 days), adult hormonal acne, and androgenic alopecia. Reports unexplained 4kg weight gain over 6 months.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border-l-3 border-indigo-600">
                        <strong className="text-indigo-950 font-bold block mb-0.5">O (Objective)</strong>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          LH/FSH ratio 2.8:1 (LH 14.2 mIU/mL, FSH 5.1 mIU/mL), Fasting Insulin 18.2 µIU/mL (Elevated HOMA-IR), TSH 2.1 mIU/L (Euthyroid), Urine β-hCG: Negative.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border-l-3 border-magenta-600">
                        <strong className="text-magenta-900 font-bold block mb-0.5">A (Assessment)</strong>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          Insulin-Resistant Polycystic Ovary Syndrome (ICD-10 E28.2) with cutaneous hyperandrogenism.
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border-l-3 border-emerald-600">
                        <strong className="text-emerald-900 font-bold block mb-0.5">P (Plan)</strong>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          1. Myo-Inositol &amp; D-Chiro Inositol (40:1) 2000mg BD.<br />
                          2. Low-glycemic dietary protocol via HealNari clinical nutritionist.<br />
                          3. 2-Hour Oral Glucose Tolerance Test (OGTT) &amp; review in 30 days.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-slate-500">
                      <i className="fas fa-lock text-emerald-500 mr-1"></i> Edit &amp; sign with your digital medical credentials
                    </span>
                    <button
                      onClick={onApply}
                      className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      Join Network &amp; Try EMR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rx' && (
              <div className="grid lg:grid-cols-12 gap-6 items-center animate-fade-in">
                {/* Left: Prescription Builder */}
                <div className="lg:col-span-6 space-y-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                    <span className="flex items-center gap-1.5 text-aubergine-800">
                      <i className="fas fa-prescription text-emerald-600"></i> Smart Rx Autocomplete
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      Live Dose Intelligence
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 block font-sans">Myo-Inositol + D-Chiro Inositol (40:1)</strong>
                        <span className="text-slate-500 text-[11px]">2000mg + 50mg • Sachet in 150ml water</span>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-700">
                        1-0-1 (BD) • 90 Days
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 block font-sans">Metformin Hydrochloride (Extended Release)</strong>
                        <span className="text-slate-500 text-[11px]">500mg • Post-dinner with water</span>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-700">
                        0-0-1 (HS) • 30 Days
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 block font-sans">Cholecalciferol (Vitamin D3)</strong>
                        <span className="text-slate-500 text-[11px]">60,000 IU • Once weekly with milk</span>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-700">
                        Weekly • 8 Weeks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Safety Guardrails */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="bg-white border border-sand-300 rounded-2xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <i className="fas fa-shield-check text-emerald-600 text-sm"></i>
                      <span>Automated Clinical Safety Check: Passed</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                        <i className="fas fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
                        <div>
                          <strong className="text-slate-800 block text-xs">Zero Known Drug Interactions</strong>
                          <span className="text-[11px] text-slate-500">
                            Combined Inositol + Metformin regimen verified safe for insulin sensitization.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                        <i className="fas fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
                        <div>
                          <strong className="text-slate-800 block text-xs">Allergy Cross-Reference</strong>
                          <span className="text-[11px] text-slate-500">
                            Patient allergy (Penicillin) verified. No beta-lactam components present.
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                        <i className="fas fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
                        <div>
                          <strong className="text-slate-800 block text-xs">Instant Digital Signature &amp; WhatsApp Rx</strong>
                          <span className="text-[11px] text-slate-500">
                            Delivers encrypted PDF Rx directly to patient with your council reg number and QR code.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'brief' && (
              <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
                <div className="bg-white border border-sand-300 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-sand-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-aubergine-100 text-aubergine-700 font-bold text-xs flex items-center justify-center">
                        T-01
                      </span>
                      <div>
                        <strong className="text-slate-900 text-sm block">Priya Sharma (28F)</strong>
                        <span className="text-[11px] text-slate-500">Video call starts in 3 minutes • 45-Min Consult</span>
                      </div>
                    </div>
                    <span className="bg-aubergine-50 text-aubergine-700 border border-aubergine-200 text-xs font-bold px-3 py-1 rounded-full">
                      AI Pre-Call Brief
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                      <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Chief Complaint</span>
                      <strong className="text-slate-800 block break-words">48-day oligomenorrhea + hormonal acne</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                      <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Key Biomarker</span>
                      <strong className="text-rose-600 block break-words">LH/FSH 2.8, Fasting Insulin 18.2</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                      <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Patient Goal</span>
                      <strong className="text-emerald-700 block break-words">Cycle restoration without birth control</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-sand-50/80 p-3 rounded-xl border border-sand-200 leading-relaxed">
                    <strong>AI Clinical Summary:</strong> Patient presents with high phenotypic likelihood of Rotterdam PCOS Phenotype B (Oligomenorrhea + Hyperandrogenism without ultrasound polycystic ovaries confirmed yet). Elevated insulin resistance likely driving LH hypersecretion. Suggest discussing insulin sensitizers, pelvic ultrasound confirmation, and cycle-synced nutrition.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span><i className="fas fa-video text-aubergine-600 mr-1.5"></i> One click to launch encrypted HD telehealth room</span>
                  <button
                    onClick={onApply}
                    className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    Start Practicing with HealNari EMR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* 4 Feature Pillars Grid for Providers */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
        {clinicalCapabilities.map((cap, idx) => (
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
                <span>Zero Software Subscriptions</span>
                <i className="fas fa-check-circle text-emerald-500 ml-auto"></i>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
