import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Tilt3D from '../../components/Tilt3D.jsx';
import Reveal from '../../components/Reveal.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';

function Conditions() {
  const scrollRef = useRef(null);

  const specialties = [
    {
      name: "General Medicine & Primary Care",
      desc: "Fever, acute infections, blood pressure, fatigue, routine health checks & preventative medicine.",
      icon: "fa-user-doctor",
      color: "text-blue-600 bg-blue-50 border-blue-100",
      badge: "General Physician",
      href: "/conditions/pcos-treatment-online",
      actionTag: "General Medicine"
    },
    {
      name: "Dermatology & Skin Care",
      desc: "Hormonal acne, adult breakouts, eczema, melasma, hyperpigmentation & barrier repair.",
      icon: "fa-wand-magic-sparkles",
      color: "text-amber-600 bg-amber-50 border-amber-100",
      badge: "Dermatologist",
      href: "/conditions/hormonal-dermatology-acne",
      actionTag: "Dermatology"
    },
    {
      name: "Endocrinology & Thyroid",
      desc: "Hypo/hyperthyroidism, Hashimoto's, insulin resistance, adrenal health & metabolic balance.",
      icon: "fa-dna",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      badge: "Endocrinologist",
      href: "/conditions/thyroid-consultation",
      actionTag: "Endocrinology"
    },
    {
      name: "Gynaecology & Reproductive Health",
      desc: "Irregular cycles, painful periods (dysmenorrhea), heavy bleeding, pelvic care & PCOS.",
      icon: "fa-venus",
      color: "text-rose-600 bg-rose-50 border-rose-100",
      badge: "Gynaecologist",
      href: "/conditions/gynecology-womens-health",
      actionTag: "Gynaecologist"
    },
    {
      name: "Hair & Scalp / Trichology",
      desc: "Androgenic alopecia, sudden shedding (telogen effluvium), scalp health & follicle revival.",
      icon: "fa-spa",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      badge: "Trichologist",
      href: "/conditions/hair-loss-trichology",
      actionTag: "Trichologist"
    },
    {
      name: "Clinical Nutrition & Dietetics",
      desc: "Personalized anti-inflammatory meal plans, metabolic nutrition, gut health & lifestyle diets.",
      icon: "fa-seedling",
      color: "text-teal-600 bg-teal-50 border-teal-100",
      badge: "Clinical Dietitian",
      href: "/conditions/clinical-nutrition-dietetics",
      actionTag: "Nutritionist"
    },
    {
      name: "Mindful Movement & Yoga",
      desc: "Somatic stress release, pelvic floor conditioning, restorative breathwork & therapeutic movement.",
      icon: "fa-person-praying",
      color: "text-purple-600 bg-purple-50 border-purple-100",
      badge: "Movement Coach",
      href: "/conditions/yoga-movement-therapy",
      actionTag: "Yoga & Movement"
    },
    {
      name: "Fertility & Preconception",
      desc: "Ovulation tracking, egg quality guidance, fertility prep & comprehensive preconception care.",
      icon: "fa-baby-carriage",
      color: "text-violet-600 bg-violet-50 border-violet-100",
      badge: "Fertility Specialist",
      href: "/conditions/fertility-preconception-care",
      actionTag: "Fertility Specialist"
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
          Specialist Care Domains
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Trusted Care Across Multiple Medical Specialties
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
          Access an interconnected clinical network across General Medicine, Dermatology, Endocrinology, Gynaecology, Clinical Nutrition, and Lifestyle Health.
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
                onClick={() => {
                  trackEvent(AnalyticsEvents.SPECIALTY_CLICKED, {
                    specialty: spec.name,
                    badge: spec.badge,
                    href: spec.href
                  });
                }}
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
