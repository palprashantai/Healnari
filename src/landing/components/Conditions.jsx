import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Tilt3D from '../../components/Tilt3D.jsx';
import Reveal from '../../components/Reveal.jsx';

function Conditions() {
  const scrollRef = useRef(null);

  const specialties = [
    {
      name: "Women's Health & Gynecology",
      desc: "Irregular cycles, dysmenorrhea, heavy bleeding, pelvic pain & preventative care.",
      icon: "fa-venus",
      color: "text-aubergine-600 bg-aubergine-50 border-aubergine-100",
      badge: "Gynaecologist",
      href: "/gynecology-womens-health"
    },
    {
      name: "PCOS & Hormonal Health",
      desc: "Root-cause metabolic care, androgen balancing, insulin sensitivity & cystic ovaries.",
      icon: "fa-venus-double",
      color: "text-magenta-600 bg-magenta-50 border-magenta-100",
      badge: "Hormone Specialist",
      href: "/pcos-treatment-online"
    },
    {
      name: "Endocrinology & Thyroid",
      desc: "Hypo/hyperthyroidism, Hashimoto's, adrenal health & metabolic endocrine balance.",
      icon: "fa-dna",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      badge: "Endocrinologist",
      href: "/thyroid-consultation"
    },
    {
      name: "Dermatology & Skin Care",
      desc: "Hormonal acne, hirsutism, melasma, hyperpigmentation & skin barrier restoration.",
      icon: "fa-wand-magic-sparkles",
      color: "text-rose-600 bg-rose-50 border-rose-100",
      badge: "Dermatologist",
      href: "/hormonal-dermatology-acne"
    },
    {
      name: "Hair & Scalp Health",
      desc: "Female pattern hair loss, telogen effluvium, scalp inflammation & follicle revitalization.",
      icon: "fa-spa",
      color: "text-amber-600 bg-amber-50 border-amber-100",
      badge: "Trichologist",
      href: "/hair-loss-trichology"
    },
    {
      name: "Nutrition & Dietetics",
      desc: "Clinical anti-inflammatory meal planning, gut-hormone axis & metabolic nutrition.",
      icon: "fa-seedling",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      badge: "Clinical Dietitian",
      href: "/clinical-nutrition-dietetics"
    },
    {
      name: "Yoga & Movement Support",
      desc: "Cycle-synced movement, pelvic floor conditioning, somatic yoga & stress relief.",
      icon: "fa-person-praying",
      color: "text-teal-600 bg-teal-50 border-teal-100",
      badge: "Movement Coach",
      href: "/yoga-movement-therapy"
    },
    {
      name: "Fertility & Preconception",
      desc: "Ovulation mapping, egg quality optimization & holistic reproductive guidance.",
      icon: "fa-baby-carriage",
      color: "text-purple-600 bg-purple-50 border-purple-100",
      badge: "Fertility Specialist",
      href: "/fertility-preconception-care"
    }
  ];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let intervalId;
    let isPaused = false;

    const slide = () => {
      if (isPaused || window.innerWidth >= 640) return;
      
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const firstChild = container.firstElementChild;
        const scrollAmount = firstChild ? firstChild.clientWidth + 20 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    const startInterval = () => {
      clearInterval(intervalId);
      intervalId = setInterval(slide, 3200);
    };

    const handleTouchStart = () => {
      isPaused = true;
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        isPaused = false;
      }, 1500);
    };

    const handleMouseEnter = () => {
      isPaused = true;
    };

    const handleMouseLeave = () => {
      isPaused = false;
    };

    startInterval();

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (window.innerWidth >= 640) {
        clearInterval(intervalId);
      } else {
        startInterval();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section id="conditions" className="max-w-7xl mx-auto py-16 md:py-24 scroll-mt-20 overflow-hidden">
      {/* Title Header */}
      <Reveal className="text-center max-w-3xl mx-auto mb-12 space-y-3 px-5 md:px-8">
        <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3.5 py-1.5 rounded-full border border-aubergine-100">
          Specialist Domains
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Comprehensive Women's Healthcare Specialties
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
          Access an interconnected multi-specialty clinical network dedicated to treating the root cause of hormonal, reproductive, metabolic, dermatological, and lifestyle conditions.
        </p>
      </Reveal>

      {/* Responsive Grid / Horizontal Scroll */}
      <div 
        ref={scrollRef}
        className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto snap-x snap-mandatory pb-6 px-5 md:px-8 sm:overflow-visible hide-scrollbar"
      >
        {specialties.map((spec, idx) => (
          <Reveal key={idx} delay={(idx % 4) * 60} className="w-[85vw] max-w-[18rem] sm:w-auto sm:max-w-none flex-shrink-0 snap-start sm:flex-shrink-1">
            <Tilt3D max={4}>
              <Link
                to={spec.href}
                className="group rounded-3xl p-6 border border-sand-200 shadow-sm flex flex-col justify-between h-full transition-all duration-300 hover:shadow-xl hover:border-aubergine-300 hover:-translate-y-1 bg-white block text-left"
              >
                <div>
                  {/* Top Bar with Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg border flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${spec.color}`}>
                      <i className={`fas ${spec.icon}`}></i>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200/80 px-2.5 py-1 rounded-full">
                      {spec.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base sm:text-lg group-hover:text-aubergine-700 transition-colors leading-snug m-0 mb-2 font-display">
                    {spec.name}
                  </h3>
                  
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {spec.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-aubergine-600 group-hover:text-aubergine-800">
                  <span>Explore Care Protocol</span>
                  <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                </div>
              </Link>
            </Tilt3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Conditions;
