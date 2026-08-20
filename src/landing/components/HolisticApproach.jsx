import React from 'react';

function HolisticApproach() {
  const pillars = [
    {
      id: 1,
      icon: "fas fa-leaf",
      color: "emerald",
      title: "Personalized Nutrition",
      subtitle: "Sustainable Nourishment",
      desc: "There is no single diet that works best for everyone with PCOS. We guide you toward a sustainable eating pattern tailored to your preferences, culture, lifestyle, and health goals."
    },
    {
      id: 2,
      icon: "fas fa-om",
      color: "amber",
      title: "Yoga & Mindful Movement",
      subtitle: "Sustainable Physical Activity",
      desc: "Yoga can be part of an active lifestyle and may support movement, flexibility, relaxation, and stress management. Choose physical activities you can perform safely and sustain over time."
    },
    {
      id: 3,
      icon: "fas fa-stethoscope",
      color: "aubergine",
      title: "Medical Guidance",
      subtitle: "Evidence-Based Care",
      desc: "Registered gynaecologists and endocrinologists prescribe targeted medications, lab panels, and clinical supplements when indicated, ensuring safe and comprehensive clinical oversight."
    },
    {
      id: 4,
      icon: "fas fa-bed",
      color: "indigo",
      title: "Lifestyle & Sleep",
      subtitle: "Stress & Circadian Rhythm",
      desc: "Chronic stress and circadian disruption directly impact metabolic and ovulatory health. We guide you with structured sleep hygiene and mindfulness practices for long-term hormonal resilience."
    }
  ];

  const getColorClasses = (color) => {
    switch(color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50';
      case 'amber': return 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50';
      case 'aubergine': return 'bg-aubergine-50 text-aubergine-600 border-aubergine-100 shadow-aubergine-100/50';
      case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50';
      default: return 'bg-slate-50 text-slate-600 border-slate-100 shadow-slate-100/50';
    }
  };

  return (
    <section className="py-16 md:py-24 max-w-7xl mx-auto px-5 md:px-8 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl rounded-full bg-gradient-to-tr from-emerald-100/30 via-amber-100/20 to-aubergine-100/30 blur-3xl -z-10 pointer-events-none"></div>

      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 animate-slide-up">
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
          <i className="fas fa-seedling"></i> Integrative Women's Health
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-display">
          Our <span className="text-emerald-600">Holistic</span> Care Approach
        </h2>
        <p className="text-slate-600 text-lg md:text-xl font-normal leading-relaxed">
          Sustainable management of PCOS and hormonal health requires a 360° collaborative approach — combining specialist medical care with nourishing food, restorative movement, and healthy daily habits.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative z-10">
        {pillars.map((pillar, idx) => (
          <div 
            key={pillar.id} 
            className="group bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg border ${getColorClasses(pillar.color)} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
              <i className={pillar.icon}></i>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">{pillar.title}</h3>
            {pillar.subtitle && (
              <span className={`inline-block text-[11px] font-bold uppercase tracking-wider mb-3 ${getColorClasses(pillar.color).split(' ')[1]}`}>
                {pillar.subtitle}
              </span>
            )}
            <p className="text-slate-600 leading-relaxed font-medium">
              {pillar.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HolisticApproach;
