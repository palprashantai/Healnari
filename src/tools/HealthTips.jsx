import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { guidesData } from '../data/guidesData.js';

function HealthTips() {
  const [activeTag, setActiveTag] = useState('All');
  const navigate = useNavigate();

  const tags = ['All', 'PCOS', 'Hair Fall', 'Hormones', 'Diet & Lifestyle'];

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

  const filtered = activeTag === 'All' ? guidesData : guidesData.filter((t) => t.tag === activeTag);

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
        {filtered.map((item) => {
          const c = colorMap[item.color] || colorMap.indigo;
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/guide/${item.id}`)}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 card-premium cursor-pointer group hover:border-aubergine-200 hover:shadow-md transition-all"
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
                <h3 className="font-extrabold text-slate-900 text-base leading-snug font-display group-hover:text-aubergine-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-550 text-xs leading-relaxed font-medium line-clamp-3">
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

              {/* Footer Link */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-50 pt-3">
                <span><i className="fas fa-clock mr-1"></i>{item.readTime}</span>
                <Link 
                  to={`/guide/${item.id}`}
                  className="text-brand-600 group-hover:text-aubergine-700 transition-colors flex items-center font-extrabold"
                >
                  Read full guide <i className="fas fa-arrow-right text-[9px] ml-1 group-hover:translate-x-1 transition-transform"></i>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default HealthTips;
