import React, { useState } from 'react';

function LabTests({ onBook }) {
  const [selectedConcern, setSelectedConcern] = useState('PCOS / PCOD');

  const concerns = ['PCOS / PCOD', 'Hair Fall', 'Irregular Periods', 'Hormonal Imbalance', 'Thyroid'];

  const labData = {
    'PCOS / PCOD': {
      icon: 'fa-venus-double',
      color: 'indigo',
      urgency: 'Recommended',
      tests: [
        { name: 'LH & FSH Ratio', desc: 'Detects ovarian dysfunction. LH:FSH > 2:1 indicates PCOS.', importance: 'Critical' },
        { name: 'Fasting Insulin + HOMA-IR', desc: 'Assesses insulin resistance, a core driver of PCOS symptoms.', importance: 'Critical' },
        { name: 'Testosterone (Free & Total)', desc: 'Elevated levels explain acne, hair loss, and hirsutism.', importance: 'Critical' },
        { name: 'AMH (Anti-Müllerian Hormone)', desc: 'Measures ovarian reserve and follicle count.', importance: 'Important' },
        { name: 'Pelvic Ultrasound', desc: 'Visualizes ovarian cysts and uterine lining.', importance: 'Important' },
        { name: 'HbA1c + Fasting Glucose', desc: 'Rules out pre-diabetes linked to insulin resistance.', importance: 'Recommended' },
        { name: 'Vitamin D3 + B12', desc: 'Deficiencies are highly correlative with insulin resistance and PCOS severity.', importance: 'Recommended' },
      ],
    },
    'Hair Fall': {
      icon: 'fa-spa',
      color: 'emerald',
      urgency: 'Recommended',
      tests: [
        { name: 'DHT (Dihydrotestosterone)', desc: 'Primary androgen responsible for follicle miniaturization.', importance: 'Critical' },
        { name: 'TSH, T3, T4 (Thyroid Panel)', desc: 'Thyroid imbalance is a top reversible cause of hair fall.', importance: 'Critical' },
        { name: 'Serum Ferritin', desc: 'Low ferritin starves the hair follicle of iron — very common in women.', importance: 'Critical' },
        { name: 'Vitamin D3 + B12', desc: 'Deficiencies in both are strongly correlated with diffuse hair loss.', importance: 'Important' },
        { name: 'DHEA-S', desc: 'Adrenal androgen that triggers scalp hair loss from the crown.', importance: 'Important' },
        { name: 'Prolactin', desc: 'Elevated prolactin disrupts hormonal balance causing shedding.', importance: 'Recommended' },
      ],
    },
    'Irregular Periods': {
      icon: 'fa-calendar-days',
      color: 'rose',
      urgency: 'High Priority',
      tests: [
        { name: 'FSH + LH + Estradiol (Day 2/3)', desc: 'Baseline reproductive hormones must be drawn on specific cycle days.', importance: 'Critical' },
        { name: 'Progesterone (Day 21)', desc: 'Confirms whether ovulation is occurring in your cycle.', importance: 'Critical' },
        { name: 'Prolactin', desc: 'High prolactin suppresses ovulation and causes period irregularity.', importance: 'Critical' },
        { name: 'TSH (Thyroid)', desc: 'Hypothyroidism is a leading cause of delayed and heavy periods.', importance: 'Important' },
        { name: 'AMH', desc: 'Assesses ovarian reserve and age-related fertility status.', importance: 'Important' },
        { name: 'Pelvic Ultrasound', desc: 'Rules out fibroids, polyps, and structural causes.', importance: 'Recommended' },
      ],
    },
    'Hormonal Imbalance': {
      icon: 'fa-sliders',
      color: 'violet',
      urgency: 'Recommended',
      tests: [
        { name: 'Cortisol (Morning Serum)', desc: 'Chronic stress-driven cortisol imbalance disrupts all downstream hormones.', importance: 'Critical' },
        { name: 'DHEA-S', desc: 'Adrenal stress marker linked to fatigue, mood, and weight gain.', importance: 'Critical' },
        { name: 'Estrogen & Progesterone', desc: 'Key sex hormones; imbalance explains PMS, anxiety, and weight gain.', importance: 'Critical' },
        { name: 'Full Thyroid Panel (TSH, T3, T4)', desc: 'Thyroid hormones regulate mood, metabolism, and energy.', importance: 'Important' },
        { name: 'Fasting Insulin', desc: 'Insulin dysregulation underlies many hormonal cascades.', importance: 'Important' },
        { name: 'Vitamin D3', desc: 'Acts as a steroid hormone; deficiency worsens fatigue and immunity.', importance: 'Recommended' },
      ],
    },
    'Thyroid': {
      icon: 'fa-shield-heart',
      color: 'sky',
      urgency: 'Urgent',
      tests: [
        { name: 'TSH (Thyroid-Stimulating Hormone)', desc: 'Primary screening marker. Ideal range: 0.5–2.5 mIU/L for women.', importance: 'Critical' },
        { name: 'Free T3 (Triiodothyronine)', desc: 'Active form of thyroid hormone controlling metabolism and energy.', importance: 'Critical' },
        { name: 'Free T4 (Thyroxine)', desc: 'Precursor converted to T3; reflects thyroid production capacity.', importance: 'Critical' },
        { name: 'Anti-TPO Antibodies', desc: 'Detects Hashimoto\'s thyroiditis, the most common autoimmune thyroid condition.', importance: 'Important' },
        { name: 'Thyroid Ultrasound', desc: 'Visualizes nodules, cysts, and gland size changes.', importance: 'Important' },
        { name: 'Vitamin D3 + Selenium', desc: 'Both nutrients are essential for proper thyroid hormone conversion.', importance: 'Recommended' },
      ],
    },
  };

  const importanceStyle = {
    Critical: 'bg-rose-50 text-rose-700 border-rose-100',
    Important: 'bg-amber-50 text-amber-700 border-amber-100',
    Recommended: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };

  const colorMap = {
    indigo: { icon: 'text-indigo-600 bg-indigo-50', header: 'from-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
    emerald: { icon: 'text-emerald-600 bg-emerald-50', header: 'from-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
    rose: { icon: 'text-rose-600 bg-rose-50', header: 'from-rose-50', badge: 'bg-rose-100 text-rose-700' },
    violet: { icon: 'text-violet-600 bg-violet-50', header: 'from-violet-50', badge: 'bg-violet-100 text-violet-700' },
    sky: { icon: 'text-sky-600 bg-sky-50', header: 'from-sky-50', badge: 'bg-sky-100 text-sky-700' },
  };

  const current = labData[selectedConcern];
  const c = colorMap[current.color];

  return (
    <section id="lab-tests" className="max-w-6xl mx-auto px-5 md:px-8 py-16 scroll-mt-20">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full">
          Diagnostic Guide
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          Which lab tests do I actually need?
        </h2>
        <p className="text-slate-500 text-sm md:text-base">
          Select your primary concern below — our clinical team has mapped the essential blood tests and investigations for each condition.
        </p>
      </div>

      {/* Concern Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {concerns.map((concern) => (
          <button
            key={concern}
            onClick={() => setSelectedConcern(concern)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 btn-interactive border ${
              selectedConcern === concern
                ? 'bg-brand-700 border-brand-700 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {concern}
          </button>
        ))}
      </div>

      {/* Results Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
        {/* Panel Header */}
        <div className={`bg-gradient-to-r ${c.header} to-white border-b border-slate-100 p-6 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${c.icon}`}>
              <i className={`fas ${current.icon}`}></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommended Tests for</p>
              <h3 className="font-extrabold text-slate-900 text-xl font-display">{selectedConcern}</h3>
            </div>
          </div>
          <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider border ${importanceStyle[current.urgency] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {current.urgency}
          </span>
        </div>

        {/* Tests List */}
        <div className="p-6 space-y-3">
          {current.tests.map((test, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-black text-xs flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800 text-sm">{test.name}</h4>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${importanceStyle[test.importance]}`}>
                    {test.importance}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{test.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Footer */}
        <div className="border-t border-slate-100 p-6 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 font-semibold max-w-sm">
            <i className="fas fa-circle-info text-brand-500 mr-1.5"></i>
            Our doctors will interpret your results and create a personalized treatment plan.
          </p>
          <button
            onClick={() => onBook('')}
            className="flex-shrink-0 bg-brand-700 hover:bg-brand-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all btn-interactive shadow-md shadow-brand-100 flex items-center gap-2"
          >
            <i className="fas fa-stethoscope text-xs"></i> Consult a Doctor
          </button>
        </div>
      </div>
    </section>
  );
}

export default LabTests;
