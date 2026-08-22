import React from 'react';

function HolisticApproach() {
  const pillars = [
    {
      id: 1,
      icon: "fas fa-stethoscope",
      color: "aubergine",
      title: "Specialist Clinical Care",
      subtitle: "Multi-Disciplinary Medical Team",
      desc: "Licensed Gynaecologists, Endocrinologists, Dermatologists & Trichologists provide comprehensive diagnostic workups, targeted lab panels, and compliant digital prescriptions."
    },
    {
      id: 2,
      icon: "fas fa-leaf",
      color: "emerald",
      title: "Personalized Nutrition",
      subtitle: "Metabolic & Hormonal Nourishment",
      desc: "Clinical dietitians design anti-inflammatory, insulin-sensitizing meal protocols tailored to your metabolic type, dietary preferences, and daily routine."
    },
    {
      id: 3,
      icon: "fas fa-person-praying",
      color: "amber",
      title: "Yoga & Movement Support",
      subtitle: "Cycle-Synced Physical Wellness",
      desc: "Mindful movement and somatic yoga protocols to alleviate pelvic congestion, enhance mobility, regulate autonomic stress, and support metabolic health."
    },
    {
      id: 4,
      icon: "fas fa-chart-line",
      color: "indigo",
      title: "Smart Tracking & AI Guidance",
      subtitle: "Continuous Health Journey",
      desc: "Daily menstrual and symptom tracking, phase predictions, 24/7 AI health guidance, lab trends, and timely notifications keeping your health journey on track."
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
          <i className="fas fa-seedling"></i> 360° Integrative Ecosystem
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-display">
          Our <span className="text-emerald-600">Holistic Care</span> Framework
        </h2>
        <p className="text-slate-600 text-lg md:text-xl font-normal leading-relaxed">
          True women's wellness goes beyond quick fixes. We combine certified medical specialists with personalized nutrition, restorative movement, and intelligent mobile health tracking.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 relative z-10">
        {pillars.map((pillar, idx) => (
          <div 
            key={pillar.id} 
            className="group bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:bg-white flex flex-col justify-between"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg border ${getColorClasses(pillar.color)} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <i className={pillar.icon}></i>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">{pillar.title}</h3>
              {pillar.subtitle && (
                <span className={`inline-block text-[11px] font-bold uppercase tracking-wider mb-3 ${getColorClasses(pillar.color).split(' ')[1]}`}>
                  {pillar.subtitle}
                </span>
              )}
              <p className="text-slate-600 leading-relaxed font-medium text-sm">
                {pillar.desc}
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-aubergine-700 transition-colors">
              <span>Personalized for you</span>
              <i className="fas fa-check-circle text-emerald-500 ml-auto"></i>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HolisticApproach;
