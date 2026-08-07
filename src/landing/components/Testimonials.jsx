import React, { useState } from 'react';

function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  const reviews = [
    {
      quote: "I had almost given up after years of PCOS and severe hair fall. Dr. Ananya Mehta’s root-cause approach changed everything. My periods are regular, my skin has cleared, and my hair density is finally improving.",
      author: "Sneha K.",
      age: 32,
      stars: 5,
      role: "PCOS & Hair Fall Patient",
      image: "https://randomuser.me/api/portraits/women/22.jpg"
    },
    {
      quote: "The holistic plan combining safe medical supplements with specialized diet and stress management brought my PCOD symptoms under control within 4 months. I am so grateful for the judgment-free, expert clinical guidance.",
      author: "Ritika P.",
      age: 27,
      stars: 5,
      role: "Metabolic & Acne Patient",
      image: "https://randomuser.me/api/portraits/women/55.jpg"
    },
    {
      quote: "After seeing my own transformation under their care, I believed in their clinical model so much that I joined as an angel investor! This is the future of compassionate, high-fidelity women’s healthcare.",
      author: "Nidhi S.",
      age: 35,
      stars: 5,
      role: "Patient turned Angel Investor",
      image: "https://randomuser.me/api/portraits/women/62.jpg"
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

            {/* User Profile Image */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-aubergine-50/50 shadow-md flex-shrink-0">
              <img
                src={reviews[activeIndex].image}
                alt={reviews[activeIndex].author}
                loading="lazy"
                decoding="async"
                width="96"
                height="96"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Testimonial Quote */}
            <div className="space-y-3.5 text-center md:text-left flex-grow">

              {/* Stars */}
              <div className="flex justify-center md:justify-start gap-1 text-amber-400 text-sm">
                {[...Array(reviews[activeIndex].stars)].map((_, i) => (
                  <i key={i} className="fas fa-star"></i>
                ))}
              </div>

              {/* Quote Copy */}
              <p className="text-slate-655 text-base md:text-lg font-medium italic leading-relaxed">
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
        <div className="absolute inset-y-1/2 -left-4 md:-left-16 right-auto flex items-center z-20">
          <button
            onClick={handlePrev}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-sand-200 shadow-md flex items-center justify-center text-slate-500 hover:text-aubergine-600 hover:border-aubergine-200 transition-colors btn-interactive" style={{ backgroundColor: 'var(--color-surface-card)' }}
            aria-label="Previous review"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
        </div>
        <div className="absolute inset-y-1/2 -right-4 md:-right-16 left-auto flex items-center z-20">
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

      {/* Media Platforms */}
      <div className="pt-16 max-w-4xl mx-auto">
        <h3 className="text-xs text-slate-400 font-bold text-center uppercase tracking-wider mb-6">
          Recognized by Leading Media Platforms
        </h3>
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center opacity-50">
          <span className="font-extrabold text-slate-500 tracking-tight text-base hover:opacity-100 transition-opacity">ZEENEWS</span>
          <span className="font-extrabold text-slate-500 tracking-tight text-base hover:opacity-100 transition-opacity">Hans India</span>
          <span className="font-extrabold text-slate-500 tracking-tight text-base hover:opacity-100 transition-opacity">YOURSTORY</span>
          <span className="font-extrabold text-slate-500 tracking-tight text-base hover:opacity-100 transition-opacity">Startup Leaders</span>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
