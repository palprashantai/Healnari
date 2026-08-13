import React, { useState } from 'react';

function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  const reviews = [
    {
      quote: "After 3 years of severe PCOS-induced hair thinning and irregular cycles, Dr. Mehta’s root-cause protocol restored my natural cycle in exactly 4 months. My hair density has visibly improved.",
      author: "Sneha K.",
      age: 32,
      stars: 5,
      role: "PCOS & Hair Fall Patient",
      image: "/generated/patient1.webp",
      tags: ['Diagnosed: PCOD', 'Outcome: 4 Months']
    },
    {
      quote: "The holistic plan—combining safe medical supplements with specialized diet and stress management—brought my insulin resistance and acne under control within 12 weeks. Completely judgment-free clinical guidance.",
      author: "Ritika P.",
      age: 27,
      stars: 5,
      role: "Metabolic & Acne Patient",
      image: "/generated/patient2.webp",
      tags: ['Diagnosed: Insulin Resistance', 'Outcome: 12 Weeks']
    },
    {
      quote: "After seeing my own transformational recovery from hormonal and metabolic issues under their care, I believed in their high-fidelity clinical model so much that I joined as an angel investor.",
      author: "Nidhi S.",
      age: 35,
      stars: 5,
      role: "Patient turned Angel Investor",
      image: "/generated/patient3.webp",
      tags: ['Diagnosed: Hormonal Imbalance', 'Outcome: Investor']
    }
  ];

  const handleNext = () => {
    setActiveIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-bold text-aubergine-600 uppercase tracking-widest bg-aubergine-50 px-3 py-1 rounded-full">
          Success Stories
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          Hear real experiences from women who chose HealNari
        </h2>
      </div>

      {/* Interactive Carousel Panel */}
      <div className="relative max-w-3xl mx-auto">

        {/* Carousel Card Container */}
        <div className="rounded-3xl p-8 md:p-12 border border-sand-200 shadow-lg relative overflow-hidden transition-all duration-300" style={{ backgroundColor: 'var(--color-surface-card)' }}>
          {/* Quote Mark Accent */}
          <div className="absolute top-6 left-6 text-aubergine-50 text-7xl font-serif pointer-events-none select-none">
            “
          </div>

          <div className="relative z-10 space-y-6 flex flex-col md:flex-row gap-6 items-center">

            {/* User Profile Image with UGC Video Overlay */}
            <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full flex-shrink-0 group cursor-pointer mx-auto md:mx-0">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-aubergine-50 shadow-md bg-slate-100">
                <img
                  src={reviews[activeIndex].image}
                  alt={reviews[activeIndex].author}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              {/* Play Button Mockup */}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 rounded-full opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/95 flex items-center justify-center text-aubergine-600 shadow-lg backdrop-blur-sm">
                  <i className="fas fa-play text-[10px] md:text-xs ml-0.5"></i>
                </div>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div className="space-y-4 text-center md:text-left flex-grow">

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                {/* Stars */}
                <div className="flex justify-center md:justify-start gap-1 text-amber-400 text-sm">
                  {[...Array(reviews[activeIndex].stars)].map((_, i) => (
                    <i key={i} className="fas fa-star"></i>
                  ))}
                </div>
                
                {/* Clinical Condition Tags */}
                <div className="flex flex-wrap justify-center md:justify-end gap-1.5">
                  {reviews[activeIndex].tags.map((tag, idx) => (
                    <span key={idx} className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quote Copy */}
              <p className="text-slate-700 text-base md:text-lg font-medium leading-relaxed relative z-10 italic">
                “{reviews[activeIndex].quote}”
              </p>

              {/* Patient Meta Info */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">
                  {reviews[activeIndex].author}, <span className="text-slate-500">Age {reviews[activeIndex].age}</span>
                </h4>
                <p className="text-aubergine-600 text-xs font-bold uppercase tracking-wider mt-0.5">
                  {reviews[activeIndex].role}
                </p>
              </div>

            </div>

          </div>

          {/* Slide Indicator Dots */}
          <div className="flex justify-center gap-1.5 mt-8 md:mt-4">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${activeIndex === idx ? 'bg-aubergine-600 w-6' : 'bg-slate-200'
                  }`}
                aria-label={`Go to slide ${idx + 1}`}
              ></button>
            ))}
          </div>

          {/* Testimonial Legal Disclaimer */}
          <div className="text-center mt-6 pt-4 border-t border-slate-50">
            <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold italic">
              * Results vary based on individual metabolic conditions and strict adherence to the prescribed clinical protocols.
            </p>
          </div>
        </div>

        {/* Carousel Control Buttons */}
        <div className="absolute inset-y-1/2 -left-4 md:-left-16 right-auto hidden md:flex items-center z-20">
          <button
            onClick={handlePrev}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-sand-200 shadow-md flex items-center justify-center text-slate-500 hover:text-aubergine-600 hover:border-aubergine-200 transition-colors btn-interactive" style={{ backgroundColor: 'var(--color-surface-card)' }}
            aria-label="Previous review"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
        </div>
        <div className="absolute inset-y-1/2 -right-4 md:-right-16 left-auto hidden md:flex items-center z-20">
          <button
            onClick={handleNext}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-sand-200 shadow-md flex items-center justify-center text-slate-500 hover:text-aubergine-600 hover:border-aubergine-200 transition-colors btn-interactive" style={{ backgroundColor: 'var(--color-surface-card)' }}
            aria-label="Next review"
          >
            <i className="fas fa-arrow-right text-sm"></i>
          </button>
        </div>
      </div>

      {/* Special Patient Investor Callout */}
      <div className="mt-12 bg-gradient-to-r from-aubergine-50/50 to-sage-50/50 rounded-3xl p-6 md:p-8 text-center border border-aubergine-100/60 max-w-4xl mx-auto space-y-2.5 shadow-sm">
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-aubergine-700 bg-aubergine-100 px-2.5 py-1 rounded-full inline-block">
          Patient to Investor Story
        </span>
        <h4 className="text-lg md:text-xl font-bold text-slate-800 font-display">
          "Our patient became an investor — because clinical results speak louder."
        </h4>
        <p className="text-slate-600 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed font-semibold italic">
          “After seeing my own transformational recovery from hormonal and metabolic issues under Dr. Mehta, I believed in their high-fidelity model so much that I joined as an angel investor to support other women.” — Nidhi S.
        </p>
      </div>

      {/* Scientific Foundations */}
      <div className="pt-16 max-w-4xl mx-auto">
        <h3 className="text-[10px] md:text-xs text-slate-400 font-bold text-center uppercase tracking-widest mb-8">
          Clinical protocols aligned with global health guidelines
        </h3>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          
          {/* ACOG Replica */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-default text-slate-800">
            <i className="fas fa-notes-medical text-2xl text-blue-800"></i>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg md:text-xl tracking-tight text-blue-900">ACOG</span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Guidelines</span>
            </div>
          </div>
          
          {/* Endocrine Society Replica */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-default text-slate-800">
            <i className="fas fa-dna text-2xl text-emerald-700"></i>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg md:text-xl tracking-tight text-emerald-800">Endocrine</span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Society Standards</span>
            </div>
          </div>
          
          {/* WHO Replica */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-default text-slate-800">
            <i className="fas fa-globe text-2xl text-sky-600"></i>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg md:text-xl tracking-tighter text-sky-700">WHO</span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Health Criteria</span>
            </div>
          </div>
          
          {/* ICMR Replica */}
          <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-default text-slate-800">
            <i className="fas fa-microscope text-2xl text-rose-700"></i>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg md:text-xl tracking-tight text-rose-800">ICMR</span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">Research Aligned</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default Testimonials;
