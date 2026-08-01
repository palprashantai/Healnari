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
  const scrollContainerRef = useRef(null);

  /* IntersectionObserver — fires when a step enters the "sweet spot" */
  useEffect(() => {
    const observers = steps.map((_, idx) => {
      const el = stepRefs.current[idx];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(idx);
        },
        {
          root: scrollContainerRef.current,
          threshold: 0.5,
          rootMargin: '0px',
        }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  const active = steps[activeStep];

  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-5 md:px-8 py-20 scroll-mt-20">

      {/* ── Title ── */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full">
          The Journey
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          How the FemHealth journey works
        </h2>
        <p className="text-slate-500 text-base">
          From precise diagnosis to guided, doctor-led clinical recovery.
        </p>
      </div>

      {/* ── Sticky scroll layout ── */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

        {/* ── LEFT: Fixed image panel ── */}
        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden aspect-square shadow-2xl bg-slate-100">
            {/* All images stacked; only active is visible */}
            {steps.map((step, idx) => (
              <img
                key={idx}
                src={step.image}
                alt={step.imageAlt}
                loading="lazy"
                decoding="async"
                width="800"
                height="800"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                  activeStep === idx ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />

            {/* Active step badge on image */}
            <div className="absolute bottom-5 left-5 right-5">
              <div
                key={activeStep}
                className="inline-flex items-center gap-2 bg-white/90 backdrop-blur text-slate-800 text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-lg animate-fade-in"
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

            {/* Step progress dots */}
            <div className="absolute top-5 right-5 flex gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: activeStep >= idx ? active.accent : '#e2e8f0',
                    width: activeStep === idx ? 20 : 8,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Scrollable steps (Internal Scrollbar) ── */}
        <div 
          ref={scrollContainerRef}
          className="relative lg:h-[550px] overflow-y-auto overflow-x-hidden pr-2 md:pr-6 custom-scrollbar-minimal pb-20"
        >
          {/* Vertical connecting line */}
          <div className="absolute left-[19px] top-8 bottom-8 w-[2px] bg-slate-100" />

          <div className="space-y-0">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={idx}
                  ref={(el) => (stepRefs.current[idx] = el)}
                  onClick={() => setActiveStep(idx)}
                  className={`relative flex gap-6 py-10 transition-all duration-500 cursor-pointer ${
                    idx !== steps.length - 1 ? 'border-b border-slate-100' : ''
                  } ${isActive ? 'opacity-100' : 'opacity-30'}`}
                >
                  {/* Step number circle */}
                  <div className="flex-shrink-0 relative z-10">
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
                  <div className="flex-grow min-w-0 pt-1.5 space-y-3">
                    {/* Tag */}
                    <span className={`inline-flex text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${step.tagBg}`}>
                      {step.tag}
                    </span>

                    {/* Title */}
                    <h3 className="font-extrabold text-slate-900 text-xl leading-snug font-display">
                      {step.title}
                      {step.price && (
                        <span
                          className="ml-2 text-base font-black"
                          style={{ color: step.accent }}
                        >
                          ({step.price})
                        </span>
                      )}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-500 text-sm leading-relaxed mt-3">{step.desc}</p>

                    {/* Bullet list */}
                    <ul className="space-y-2 pt-1">
                      {step.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm font-semibold text-slate-600">
                          <i
                            className="fas fa-circle-check text-sm flex-shrink-0 mt-0.5"
                            style={{ color: step.accent }}
                          />
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
      </div>
    </section>
  );
}

export default HowItWorks;
