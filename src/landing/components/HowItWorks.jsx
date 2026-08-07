import React, { useEffect, useRef, useState } from 'react';

/* ── Step data ─────────────────────────────────────────── */
const steps = [
  {
    num: 1,
    title: 'Discover Your Root Cause',
    price: '₹299',
    desc: 'We start by actually listening to you. Your specialist doctor will conduct a deep-dive, 45-minute consultation to validate your symptoms and uncover the true hormonal cause.',
    bullets: [
      'Led by gynaecologists, endocrinologists & trichologists',
      'Conducted 1-on-1 over secure encrypted video call',
      'Doctor-designed root-cause diagnostic process',
    ],
    image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&h=800&fit=crop&q=80',
    imageAlt: 'Woman having a video consultation with a doctor',
    accent: '#5A7A5A',
    tagBg: 'bg-sage-50 text-sage-800 border-sage-100',
    tag: 'Step 1 · Diagnose',
  },
  {
    num: 2,
    title: 'Your Custom Medical Protocol',
    desc: 'No more generic advice. We build a precise protocol targeting your specific biological markers—addressing insulin resistance, hyperandrogenism, and cortisol levels with clinical precision.',
    bullets: [
      'Evidence-based medical & nutritional protocol',
      'Clean, clinically validated supplements if needed',
      'Diet, sleep & exercise plan tailored to your cycle',
    ],
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop&q=80',
    imageAlt: 'Doctor creating a personalised care plan',
    accent: '#8B7355',
    tagBg: 'bg-sand-50 text-sand-600 border-sand-100',
    tag: 'Step 2 · Treat',
  },
  {
    num: 3,
    title: 'Reclaim Your Health',
    desc: 'Watch your symptoms fade. With monthly clinical audits and unlimited chat access to your care team, we adjust your protocol until you feel exactly like yourself again.',
    bullets: [
      'Monthly hormonal & metabolic progress reviews',
      'Unlimited chat access with your dedicated care team',
      'Protocol refined as your body responds and improves',
    ],
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80',
    imageAlt: 'Happy healthy woman after recovery',
    accent: '#7a3e65',
    tagBg: 'bg-brand-50 text-brand-700 border-brand-100',
    tag: 'Step 3 · Recover',
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
        { root: null, rootMargin: '-30% 0px -30% 0px', threshold: 0.1 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  const handleStepClick = (idx) => {
    setActiveStep(idx);
    stepRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const active = steps[activeStep];

  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 scroll-mt-20">

      {/* ── Title ── */}
      <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16 space-y-3">
        <span className="text-xs font-bold text-aubergine-700 uppercase tracking-widest bg-aubergine-50 border border-aubergine-100 px-3.5 py-1.5 rounded-full shadow-sm">
          The Journey
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          How the HealNari journey works
        </h2>
        <p className="text-slate-500 text-sm md:text-base leading-relaxed">
          From precise diagnosis to guided, doctor-led clinical recovery.
        </p>

        {/* Mobile Step Selector Tabs */}
        <div className="flex lg:hidden justify-center gap-2 pt-4">
          {steps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => handleStepClick(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeStep === idx
                  ? 'bg-aubergine-600 text-white shadow-md'
                  : 'bg-sand-100 text-slate-600 hover:bg-sand-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                {step.num}
              </span>
              Step {step.num}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">

        {/* ── LEFT: Sticky Image ── */}
        <div className="w-full lg:w-[42%] shrink-0">
          <div className="lg:sticky lg:top-24">
            <div className="relative rounded-3xl overflow-hidden aspect-square shadow-2xl bg-slate-100 border border-slate-100">
              {steps.map((step, idx) => (
                <img
                  key={idx}
                  src={step.image}
                  alt={step.imageAlt}
                  loading="lazy"
                  decoding="async"
                  width="800"
                  height="800"
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${
                    activeStep === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                  }`}
                />
              ))}

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />

              {/* Active step badge */}
              <div className="absolute bottom-5 left-5 right-5">
                <div
                  key={activeStep}
                  className="inline-flex items-center gap-2 bg-white/95 backdrop-blur text-slate-800 text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-lg animate-fade-in"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: active.accent }}
                  >
                    {active.num}
                  </span>
                  {active.tag}
                </div>
              </div>

              {/* Progress dots */}
              <div className="absolute top-5 right-5 flex gap-1.5">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStepClick(idx)}
                    aria-label={`Go to step ${idx + 1}`}
                    className="h-2 rounded-full transition-all duration-300 cursor-pointer"
                    style={{
                      background: activeStep >= idx ? active.accent : '#e2e8f0',
                      width: activeStep === idx ? 22 : 8,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Step Cards ── */}
        <div className="flex-1 flex flex-col gap-8 lg:gap-10 lg:pt-4 lg:pb-20">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <div
                key={idx}
                ref={(el) => (stepRefs.current[idx] = el)}
                onClick={() => handleStepClick(idx)}
                className={`flex flex-col sm:flex-row gap-5 md:gap-6 p-6 sm:p-8 rounded-3xl transition-all duration-500 cursor-pointer border ${
                  isActive
                    ? 'bg-white shadow-xl border-aubergine-100 ring-2 ring-aubergine-500/10 opacity-100'
                    : 'bg-sand-50/50 hover:bg-white border-transparent hover:border-slate-200 opacity-50 hover:opacity-80'
                }`}
              >
                {/* Step number circle */}
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-md transition-all duration-500"
                    style={{
                      background: isActive ? step.accent : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      boxShadow: isActive ? `0 0 0 4px ${step.accent}22` : 'none',
                    }}
                  >
                    {step.num}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0 space-y-3">
                  <span className={`inline-flex text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${step.tagBg}`}>
                    {step.tag}
                  </span>

                  <h3 className="font-extrabold text-slate-900 text-xl leading-snug font-display">
                    {step.title}
                    {step.price && (
                      <span className="ml-2 text-base font-black" style={{ color: step.accent }}>
                        ({step.price})
                      </span>
                    )}
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>

                  <ul className="space-y-2 pt-1">
                    {step.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm font-semibold text-slate-700">
                        <i className="fas fa-circle-check text-sm flex-shrink-0 mt-0.5" style={{ color: step.accent }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
