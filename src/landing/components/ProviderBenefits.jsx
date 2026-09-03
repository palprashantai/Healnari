import React from 'react';
import Reveal from '../../components/Reveal.jsx';

function ProviderBenefits() {
  const clinicalFeatures = [
    {
      title: 'AI SOAP Notes & Clinical Scribe',
      subtitle: '80% Faster Charting',
      description: 'Automatically transform teleconsult notes or voice recordings into formatted Subjective, Objective, Assessment & Plan documentation in under 15 seconds.',
      icon: 'fa-file-medical',
      badge: 'AI Documentation',
      color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-200'
    },
    {
      title: 'Smart Rx & Drug Safety Guardrails',
      subtitle: 'Real-Time Interaction Checks',
      description: 'Prescribe with instant formulation autocomplete, pre-set dosage schedules (e.g. Inositol 40:1 BD, Metformin), and automated drug-drug interaction alerts.',
      icon: 'fa-prescription-bottle-medical',
      badge: 'Safety AI',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      title: 'Global Multi-Currency Practice',
      subtitle: 'India, US, UK & UAE Telehealth',
      description: 'Consult patients worldwide with automatic currency localization (INR, USD, EUR, GBP, AED). Receive your 90% net earnings deposited directly into your bank every Monday.',
      icon: 'fa-globe',
      badge: 'Multi-Currency',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      title: 'Tokenized Live Patient Queue',
      subtitle: 'Zero Waiting Room Friction',
      description: 'Streamline your daily clinic with automated patient tokens (T-01, T-02), real-time status tracking (Waiting, In Session, No Show), and a 1-click "Call Next" patient workflow.',
      icon: 'fa-hospital-user',
      badge: 'Queue Engine',
      color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-200'
    },
    {
      title: 'Priority Action Inbox & Lab Triage',
      subtitle: 'Abnormal Biomarker Interventions',
      description: 'Triage abnormal lab values (LH/FSH ratio, AMH, DHEAS, Thyroid) in a consolidated inbox. Trigger urgent patient notifications or approve/reject prescription refills with one tap.',
      icon: 'fa-clipboard-list',
      badge: 'Lab Triage',
      color: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      title: 'Verified Doctor Public Profile',
      subtitle: 'Direct Patient Booking Link',
      description: 'Receive your personalized public profile link (healnari.care/doctor/your-name) showcasing your NMC credentials, verified reviews, specialties, and 1-click slot booking.',
      icon: 'fa-id-card-clip',
      badge: 'Public Profile',
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    }
  ];

  return (
    <section id="benefits" className="py-20 md:py-28 bg-white max-w-7xl mx-auto px-5 md:px-8">
      <Reveal className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3.5 py-1 rounded-full border border-aubergine-100 shadow-xs">
          What You Get on Day 1
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Your Full Digital Clinic — Included Free
        </h2>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed font-normal">
          No software license fees. No setup costs. Every feature below is available from Day 1, included as part of your HealNari provider account at zero additional cost.
        </p>
      </Reveal>

      {/* 3-Step Join Process Strip */}
      <Reveal>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14 text-center list-none p-0 m-0">
          {[
            { step: '01', icon: 'fa-file-medical', label: 'Apply in 3 Minutes', desc: 'Fill a short form with your specialty & registration number. No long paperwork.' },
            { step: '02', icon: 'fa-certificate', label: 'Credential Verified (48 hrs)', desc: 'Our clinical team verifies your NMC / State Medical Council registration.' },
            { step: '03', icon: 'fa-circle-play', label: 'Go Live & Start Earning', desc: 'Your profile goes live, patients start booking, payouts go weekly to your bank.' },
          ].map((s) => (
            <li key={s.step} className="flex flex-col items-center gap-3 bg-aubergine-50/60 border border-aubergine-100 rounded-3xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-aubergine-700 text-white flex items-center justify-center text-lg">
                <i className={`fas ${s.icon}`}></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-aubergine-400">Step {s.step}</span>
              <h3 className="font-bold text-slate-900 text-base">{s.label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
        {clinicalFeatures.map((feat, idx) => (
          <Reveal key={idx} delay={idx * 80}>
            <div className="h-full bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-aubergine-200 rounded-3xl p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg border ${feat.color} shadow-xs group-hover:scale-105 transition-transform`}>
                    <i className={`fas ${feat.icon}`}></i>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-slate-600 border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {feat.badge}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-aubergine-700 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs font-semibold text-aubergine-600 mb-3 tracking-wide">
                  {feat.subtitle}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {feat.description}
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-aubergine-600 transition-colors">
                <span>Included in Provider Portal</span>
                <i className="fas fa-check text-emerald-500 ml-auto"></i>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default ProviderBenefits;
