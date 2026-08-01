import React, { useState } from 'react';
import GuideModal from './GuideModal.jsx';

function HealthTips() {
  const [activeTag, setActiveTag] = useState('All');
  const [selectedGuide, setSelectedGuide] = useState(null);

  const tags = ['All', 'PCOS', 'Hair Fall', 'Hormones', 'Diet & Lifestyle'];

  const tips = [
    {
      tag: 'PCOS',
      icon: 'fa-venus-double',
      color: 'indigo',
      title: 'Why PCOS Makes Weight Loss Harder',
      summary:
        'Insulin resistance — a hallmark of PCOS — makes your body store fat more readily, especially around your abdomen. A low-GI diet combined with inositol supplementation shows clinical evidence of improving insulin sensitivity and restoring cycle regularity.',
      readTime: '3 min read',
      tip: 'Swap white rice for millets or quinoa to keep blood sugar stable through the day.',
    },
    {
      tag: 'Hair Fall',
      icon: 'fa-spa',
      color: 'emerald',
      title: 'The Hormonal Triggers Behind Hair Thinning',
      summary:
        'Elevated DHT (dihydrotestosterone) miniaturizes follicles over time, causing androgenic alopecia. This is closely linked to PCOS, thyroid imbalances, and elevated prolactin. Early intervention prevents permanent follicle loss.',
      readTime: '4 min read',
      tip: 'Get a hormone panel: DHT, TSH, T3, T4, and Prolactin before starting any hair treatment.',
    },
    {
      tag: 'Hormones',
      icon: 'fa-sliders',
      color: 'violet',
      title: 'Signs Your Cortisol Is Out of Balance',
      summary:
        'Chronic stress elevates cortisol, which directly suppresses progesterone and disrupts your LH/FSH ratio — leading to missed periods, fat gain, and insomnia. Managing cortisol is foundational to hormonal health.',
      readTime: '4 min read',
      tip: 'Avoid intense workouts during the late luteal phase of your cycle — opt for yoga or walks instead.',
    },
    {
      tag: 'Diet & Lifestyle',
      icon: 'fa-utensils',
      color: 'amber',
      title: '5 Anti-Inflammatory Foods for Hormonal Balance',
      summary:
        'Chronic inflammation amplifies estrogen dominance and androgen excess. Incorporating turmeric, fatty fish, walnuts, leafy greens, and fermented foods can significantly reduce systemic inflammation markers within 8 weeks.',
      readTime: '3 min read',
      tip: 'Add 1 tsp of turmeric + a pinch of black pepper to warm milk each night — curcumin absorbs 2000% better with piperine.',
    },
    {
      tag: 'PCOS',
      icon: 'fa-circle-nodes',
      color: 'rose',
      title: 'Seed Cycling to Restore Hormonal Rhythm',
      summary:
        'Seed cycling involves eating specific seeds during each half of your menstrual cycle. While clinical research is still emerging and lacks robust RCT evidence, many integrative nutritionists recommend it as a gentle, holistic adjunct to your medical protocol.',
      readTime: '5 min read',
      tip: 'Holistic Habit: Days 1–14 (flax + pumpkin seeds). Days 15–28 (sesame + sunflower seeds).',
    },
    {
      tag: 'Hormones',
      icon: 'fa-moon',
      color: 'sky',
      title: 'How Poor Sleep Destroys Hormonal Health',
      summary:
        'Less than 7 hours of sleep spikes ghrelin (hunger hormone), lowers leptin, crashes GH and testosterone, and dysregulates cortisol rhythm. Women are 40% more susceptible to hormone disruption from sleep debt than men.',
      readTime: '4 min read',
      tip: 'Avoid screens 1 hour before bed. Dim lights to signal melatonin production naturally.',
    },
  ];

  const colorMap = {
    indigo: {
      icon: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      tag: 'bg-indigo-50 text-indigo-700',
      tip: 'bg-indigo-50/50 border-indigo-100 text-indigo-700',
    },
    emerald: {
      icon: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      tag: 'bg-emerald-50 text-emerald-700',
      tip: 'bg-emerald-50/50 border-emerald-100 text-emerald-700',
    },
    violet: {
      icon: 'text-violet-600 bg-violet-50 border-violet-100',
      tag: 'bg-violet-50 text-violet-700',
      tip: 'bg-violet-50/50 border-violet-100 text-violet-700',
    },
    amber: {
      icon: 'text-amber-600 bg-amber-50 border-amber-100',
      tag: 'bg-amber-50 text-amber-700',
      tip: 'bg-amber-50/50 border-amber-100 text-amber-700',
    },
    rose: {
      icon: 'text-rose-600 bg-rose-50 border-rose-100',
      tag: 'bg-rose-50 text-rose-700',
      tip: 'bg-rose-50/50 border-rose-100 text-rose-700',
    },
    sky: {
      icon: 'text-sky-600 bg-sky-50 border-sky-100',
      tag: 'bg-sky-50 text-sky-700',
      tip: 'bg-sky-50/50 border-sky-100 text-sky-700',
    },
  };

  const filtered = activeTag === 'All' ? tips : tips.filter((t) => t.tag === activeTag);

  return (
    <section id="health-tips" className="max-w-6xl mx-auto px-5 md:px-8 py-16 scroll-mt-20">
      {/* Title Block */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">
          Health Education
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight font-display">
          Know your body better
        </h2>
        <p className="text-slate-500 text-sm md:text-base">
          Clinical insights from our specialist team — because understanding your health is the first step to healing it.
        </p>
      </div>

      {/* Filter Tags */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 btn-interactive border ${
              activeTag === tag
                ? 'bg-brand-700 border-brand-700 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item, idx) => {
          const c = colorMap[item.color];
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 card-premium"
            >
              {/* Icon + Tag row */}
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border text-lg ${c.icon}`}>
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${c.tag}`}>
                  {item.tag}
                </span>
              </div>

              {/* Title & Summary */}
              <div className="space-y-2 flex-grow">
                <h3 className="font-extrabold text-slate-900 text-base leading-snug font-display">
                  {item.title}
                </h3>
                <p className="text-slate-505 text-xs leading-relaxed font-medium">
                  {item.summary}
                </p>
              </div>

              {/* Clinical Tip */}
              <div className={`border rounded-xl p-3 flex gap-2 items-start ${c.tip}`}>
                <i className="fas fa-lightbulb text-sm flex-shrink-0 mt-0.5"></i>
                <p className="text-xs font-semibold leading-snug">
                  <strong>Doctor Tip:</strong> {item.tip}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-50 pt-3">
                <span><i className="fas fa-clock mr-1"></i>{item.readTime}</span>
                <span 
                  onClick={() => setSelectedGuide(item)}
                  className="text-brand-600 hover:text-brand-800 cursor-pointer transition-colors flex items-center"
                >
                  Read full guide <i className="fas fa-arrow-right text-[9px] ml-1"></i>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Guide Modal Overlay */}
      <GuideModal 
        isOpen={!!selectedGuide} 
        onClose={() => setSelectedGuide(null)} 
        guide={selectedGuide} 
      />
    </section>
  );
}

export default HealthTips;
