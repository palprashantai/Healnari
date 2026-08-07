import React from 'react';
import Tilt3D from '../../components/Tilt3D.jsx';
import Reveal from '../../components/Reveal.jsx';

function Conditions() {
  const list = [
    { name: 'PCOS / PCOD', icon: 'fa-venus-double', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { name: 'Hair fall & thinning', icon: 'fa-spa', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'Irregular periods', icon: 'fa-calendar-days', color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { name: 'Hormonal imbalance', icon: 'fa-sliders', color: 'text-violet-600 bg-violet-50 border-violet-100' },
    { name: 'Weight & metabolic health', icon: 'fa-weight-scale', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { name: 'Acne & hirsutism', icon: 'fa-face-rolling-eyes', color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100' },
    { name: 'Thyroid disorders', icon: 'fa-shield-heart', color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { name: 'Preconception planning', icon: 'fa-baby-carriage', color: 'text-sage-600 bg-sage-50 border-sage-100' }
  ];

  return (
    <section id="conditions" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 scroll-mt-20">
      {/* Title Header */}
      <Reveal className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
          Clinical Focus
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          Women's health concerns we treat
        </h2>
        <p className="text-slate-500 text-sm md:text-base">
          Our specialized team is trained in root-cause clinical gynaecology, reproductive medicine, and nutritional science.
        </p>
      </Reveal>

      {/* Responsive Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {list.map((cond, idx) => (
          <Reveal key={idx} delay={(idx % 4) * 70}>
          <Tilt3D max={4}>
          <div
            className="group rounded-3xl p-5 border border-sand-200 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-aubergine-100" style={{ backgroundColor: 'var(--color-surface-card)' }}
          >
            {/* Visual Icon Shield */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg border flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${cond.color}`}>
              <i className={`fas ${cond.icon}`}></i>
            </div>

            <span className="font-bold text-slate-700 text-base group-hover:text-aubergine-700 transition-colors leading-tight">
              {cond.name}
            </span>
          </div>
          </Tilt3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Conditions;
