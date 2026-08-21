import React, { useEffect, useRef } from 'react';
import Tilt3D from '../../components/Tilt3D.jsx';
import Reveal from '../../components/Reveal.jsx';

function Conditions() {
  const scrollRef = useRef(null);

  const list = [
    { name: 'PCOS (Polycystic Ovary Syndrome)', icon: 'fa-venus-double', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
    { name: 'Hair fall & thinning', icon: 'fa-spa', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'Irregular periods', icon: 'fa-calendar-days', color: 'text-magenta-600 bg-magenta-50 border-magenta-100' },
    { name: 'Hormonal imbalance', icon: 'fa-sliders', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
    { name: 'Weight & metabolic health', icon: 'fa-weight-scale', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { name: 'Acne & hirsutism', icon: 'fa-face-rolling-eyes', color: 'text-magenta-600 bg-magenta-50 border-magenta-100' },
    { name: 'Thyroid disorders', icon: 'fa-shield-heart', color: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100' },
    { name: 'Preconception planning', icon: 'fa-baby-carriage', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
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
        // First child might be a Reveal wrapper, so let's find the inner card or use standard width
        const scrollAmount = firstChild ? firstChild.clientWidth + 20 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    const startInterval = () => {
      clearInterval(intervalId);
      intervalId = setInterval(slide, 3000);
    };

    const handleTouchStart = () => {
      isPaused = true;
    };

    const handleTouchEnd = () => {
      // Resume after a delay
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
    <section id="conditions" className="max-w-6xl mx-auto py-16 md:py-20 scroll-mt-20 overflow-hidden">
      {/* Title Header */}
      <Reveal className="text-center max-w-2xl mx-auto mb-10 space-y-3 px-5 md:px-8">
        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-100">
          Clinical Focus
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Hormonal &amp; Metabolic Conditions We Treat
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
          Our specialized team is trained in root-cause clinical gynaecology, reproductive medicine, and nutritional science.
        </p>
      </Reveal>

      {/* Responsive Grid / Horizontal Scroll */}
      <div 
        ref={scrollRef}
        className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto snap-x snap-mandatory pb-6 px-5 md:px-8 sm:overflow-visible hide-scrollbar"
      >
        {list.map((cond, idx) => (
          <Reveal key={idx} delay={(idx % 4) * 70} className="w-[80vw] max-w-[16rem] sm:w-auto sm:max-w-none flex-shrink-0 snap-start sm:flex-shrink-1">
          <Tilt3D max={4}>
          <div
            className="group rounded-3xl p-5 border border-sand-200 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-aubergine-100" style={{ backgroundColor: 'var(--color-surface-card)' }}
          >
            {/* Visual Icon Shield */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg border flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${cond.color}`}>
              <i className={`fas ${cond.icon}`}></i>
            </div>

            <h3 className="font-bold text-slate-700 text-base group-hover:text-aubergine-700 transition-colors leading-tight m-0">
              {cond.name}
            </h3>
          </div>
          </Tilt3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Conditions;
