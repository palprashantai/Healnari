import React, { useEffect, useRef, useState } from 'react';

/* ── Step data ─────────────────────────────────────────── */
const steps = [
  {
    num: 1,
    title: 'Smart Screening & Specialist Matching',
    price: '₹799',
    desc: 'Take a 2-minute symptom check or choose your specialist across Gynecology, Endocrinology, Dermatology, Nutrition, or Movement. Book your confidential video slot in seconds with zero waiting room hassle.',
    bullets: [
      'Choose from verified Gynaecologists, Endocrinologists, Trichologists & Dietitians',
      'AI symptom triage and instant intake history preparation',
      'Flexible morning, afternoon and evening telemedicine slots',
    ],
    image: '/generated/step1.webp',
    imageAlt: 'Woman booking a specialist consultation on her phone',
    accent: '#5A7A5A',
    tagBg: 'bg-sage-50 text-sage-800 border-sage-100',
    tag: 'Step 1 · Discover & Book',
  },
  {
    num: 2,
    title: '45-Min Deep-Dive Video Consult & Digital Rx',
    desc: 'Your specialist actually listens. In a secure, encrypted video call, your doctor conducts a root-cause evaluation of your hormonal history, lifestyle, and symptoms, issuing a diagnostic lab roadmap and legally supported digital prescription.',
    bullets: [
      'Thorough symptom and reproductive health history review',
      'Root-cause diagnostic assessment and targeted lab orders',
      'Legally compliant digital prescription & supplement roadmap',
    ],
    image: '/generated/step2.webp',
    imageAlt: 'Female doctor in a video consultation with a patient',
    accent: '#8B7355',
    tagBg: 'bg-sand-50 text-sand-600 border-sand-100',
    tag: 'Step 2 · Diagnose & Prescribe',
  },
  {
    num: 3,
    title: 'Personalized Health Journey, Tracking & Follow-up',
    desc: 'Receive your customized 360° protocol within 24 hours — personalized nutrition roadmap, cycle-synced yoga exercises, and integrated health tracking in your PWA. Enjoy 14 days of free chat follow-up with your care team.',
    bullets: [
      'Custom nutrition support & cycle-synced movement routines',
      'PWA health & menstrual tracking with smart reminders',
      '14-day free chat follow-up and clinical progress check-ins',
    ],
    image: '/generated/step3.webp',
    imageAlt: 'Happy healthy woman managing her lifestyle protocol',
    accent: '#7a3e65',
    tagBg: 'bg-brand-50 text-brand-700 border-brand-100',
    tag: 'Step 3 · Track & Thrive',
  },
];


/* ── Component ──────────────────────────────────────────── */
function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef([]);

  /* IntersectionObserver — updates active step as user scrolls */
  useEffect(() => {
    const observers = steps.map((_, idx) => {
      const el = stepRefs.current[idx];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(idx);
        },
        // We use a tighter threshold so it triggers when the card is nicely in view
        { root: null, rootMargin: '-20% 0px -40% 0px', threshold: 0.1 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  const active = steps[activeStep];

  return (
    <section id="how-it-works" className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">

      {/* ── Title ── */}
      <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16 space-y-3">
        <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 border border-aubergine-100 px-3.5 py-1.5 rounded-full shadow-2xs">
          The Clinical Journey
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          How Your HealNari Care Works
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
          From precise diagnosis to guided, doctor-led clinical recovery.
        </p>
      </div>

      {/* ── Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
        
        {/* ── LEFT: Dynamic Image Showcase ── */}
        <div className="lg:col-span-5 order-1 lg:order-1 hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/5] sm:aspect-square lg:aspect-[3/4] shadow-2xl bg-slate-100 border border-slate-100 group">
            {steps.map((step, idx) => (
              <img
                key={idx}
                src={step.image}
                alt={step.imageAlt}
                loading="lazy"
                decoding="async"
                width="800"
                height="1000"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${
                  activeStep === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                }`}
              />
            ))}

            {/* Subtle inner shadow for depth */}
            <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)] pointer-events-none" />

            {/* Active step badge (floats over image) */}
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
              <div
                key={activeStep}
                className="inline-flex items-center gap-3 bg-white/95 backdrop-blur text-slate-900 text-sm font-extrabold px-5 py-3.5 rounded-2xl shadow-xl animate-fade-in"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm"
                  style={{ background: active.accent }}
                >
                  {active.num}
                </span>
                {active.tag}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Interactive Accordion ── */}
        <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-5 order-2 lg:order-2 lg:py-4">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            
            return (
              <button
                type="button"
                key={idx}
                ref={(el) => (stepRefs.current[idx] = el)}
                onClick={() => setActiveStep(idx)}
                onMouseEnter={() => setActiveStep(idx)}
                className={`w-full text-left relative overflow-hidden flex flex-col p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl transition-all duration-500 ease-out cursor-pointer border-2 hover:-translate-y-1 ${
                  isActive
                    ? 'bg-white shadow-card-hover border-brand-200'
                    : 'bg-slate-50/50 hover:bg-white border-transparent hover:border-brand-200/60 opacity-70 hover:opacity-100 hover:shadow-soft'
                }`}
                aria-expanded={isActive}
              >
                {/* Header (Always Visible) */}
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Step Number */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm transition-all duration-500 flex-shrink-0"
                    style={{
                      background: isActive ? step.accent : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#64748b',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {step.num}
                  </div>
                  
                  {/* Title */}
                  <div className="flex-grow">
                    <h3 className={`font-extrabold text-lg sm:text-xl md:text-2xl leading-tight font-display transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : 'text-slate-600'
                    }`}>
                      {step.title}
                      {step.price && isActive && (
                        <span className="ml-2 text-base sm:text-lg font-black" style={{ color: step.accent }}>
                          ({step.price})
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Body (Expandable) */}
                <div 
                  className={`grid transition-all duration-500 ease-in-out ${
                    isActive ? 'grid-rows-[1fr] opacity-100 mt-5 sm:mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pl-10 sm:pl-14 md:pl-16">
                      {/* Description */}
                      <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-5">
                        {step.desc}
                      </p>

                      {/* Bullet points */}
                      <ul className="space-y-3">
                        {step.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                            <i className="fas fa-check-circle text-base flex-shrink-0 mt-0.5" style={{ color: step.accent }} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Active indicator bar on the left edge */}
                {isActive && (
                  <div 
                    className="absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full"
                    style={{ background: step.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
