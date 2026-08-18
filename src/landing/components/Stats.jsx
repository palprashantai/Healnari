import React from 'react';

function Stats() {
  const stats = [
    { value: '50,000+', label: 'Women treated globally', icon: 'fa-users' },
    { value: '87%', label: 'Symptom improvement within 90 days*', icon: 'fa-chart-line' },
    { value: '4.98★', label: 'Average doctor rating', icon: 'fa-star' },
    { value: '40+', label: 'Specialist doctors & nutrition coaches', icon: 'fa-user-md' }
  ];

  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 rounded-3xl p-5 md:p-8 shadow-sm border border-sand-200" style={{ backgroundColor: 'var(--color-surface-card)' }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`text-center space-y-2 p-3 ${idx !== stats.length - 1 ? 'md:border-r border-slate-100' : ''
              }`}
          >
            {/* Visual Icon Accent */}
            <div className="w-9 h-9 rounded-full bg-aubergine-50 text-aubergine-600 flex items-center justify-center mx-auto text-sm mb-1">
              <i className={`fas ${stat.icon}`}></i>
            </div>

            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-aubergine-800 tracking-tight bg-gradient-to-r from-aubergine-800 to-aubergine-600 bg-clip-text text-transparent">
              {stat.value}
            </div>

            <div className="text-xs md:text-sm font-semibold text-slate-500 max-w-[150px] mx-auto leading-snug">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 font-semibold text-center mt-3">
        *Based on self-reported outcomes from HealNari patients who completed a minimum 12-week personalised protocol (n=patients on record). Outcomes are self-assessed and individual results vary significantly based on condition severity, adherence, and baseline health status. This is not a clinical trial result.
      </p>
    </section>
  );
}

export default Stats;
