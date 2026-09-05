import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { guidesData } from '../data/guidesData.js';
import { apiFetch } from '../lib/apiClient.js';

function HealthTips() {
  const [activeTag, setActiveTag] = useState('All');
  const [combinedGuides, setCombinedGuides] = useState(guidesData);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/admin/public/cms')
      .then(res => {
        const publicArticles = Array.isArray(res) ? res : (res?.data || []);
        if (publicArticles.length > 0) {
          const cmsGuides = publicArticles.map(a => ({
            id: a.slug || a.id,
            slug: a.slug || a.id,
            title: a.title,
            summary: a.summary || (a.content ? a.content.replace(/<[^>]*>/g, '').slice(0, 160) + '...' : ''),
            tag: a.category === 'Symptom Checker' ? 'Hormones' : (a.category || 'PCOS'),
            icon: a.category === 'Symptom Checker' ? 'fa-stethoscope' : (a.category === 'Announcement' ? 'fa-bullhorn' : 'fa-book-medical'),
            tip: a.summary ? (a.summary.slice(0, 95) + '...') : 'Consult your specialist for a personalized clinical roadmap.',
            readTime: a.read_time || a.readTime || '4 min read',
            author: { name: a.author || 'HealNari Clinical Team', role: 'Medical Advisory Board' },
            isCms: true,
          }));

          // Merge without duplicate titles/slugs
          const existingSlugs = new Set(guidesData.map(g => g.slug || g.id));
          const newItems = cmsGuides.filter(cg => !existingSlugs.has(cg.id) && !existingSlugs.has(cg.slug));
          setCombinedGuides([...newItems, ...guidesData]);
        }
      })
      .catch(() => {}); // Resilient fallback to static guidesData
  }, []);

  const tags = ['All', 'PCOS', 'Hair Fall', 'Hormones', 'Diet & Lifestyle'];

  const colorMap = {
    brand: {
      icon: 'text-aubergine-600 bg-aubergine-50 border-aubergine-100',
      tag: 'bg-aubergine-50 text-aubergine-700',
      tip: 'bg-aubergine-50/50 border-aubergine-100 text-aubergine-800',
    },
    magenta: {
      icon: 'text-magenta-600 bg-magenta-50 border-magenta-100',
      tag: 'bg-magenta-50 text-magenta-700',
      tip: 'bg-magenta-50/50 border-magenta-100 text-magenta-800',
    },
  };

  const filtered = activeTag === 'All' ? combinedGuides : combinedGuides.filter((t) => t.tag === activeTag);

  return (
    <section id="health-tips" className="max-w-6xl mx-auto px-5 md:px-8 py-16 scroll-mt-20">
      {/* Title Block */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3.5 py-1 rounded-full border border-aubergine-100">
          Health Education &amp; Clinical Guides
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Understand Your Hormonal Body
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
          Clinical insights from our specialist team — because understanding your biological root cause is the first step to healing it.
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
                ? 'bg-gradient-to-r from-aubergine-600 to-magenta-600 border-transparent text-white shadow-md'
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
          const c = idx % 2 === 0 ? colorMap.brand : colorMap.magenta;
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/guide/${item.id}`)}
              className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-6 flex flex-col gap-4 card-premium cursor-pointer group hover:border-aubergine-200 hover:shadow-md transition-all"
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

              {/* Clinical Tip & Review Badge */}
              <div className={`border rounded-xl p-3 flex gap-2 items-start ${c.tip}`}>
                <i className="fas fa-lightbulb text-sm flex-shrink-0 mt-0.5"></i>
                <p className="text-xs font-semibold leading-snug">
                  <strong>Doctor Tip:</strong> {item.tip}
                </p>
              </div>

              {/* Medical Review Stamp */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold bg-sand-50 px-3 py-1.5 rounded-lg border border-sand-100">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <i className="fas fa-certificate text-emerald-600"></i> Medically Reviewed
                </span>
                <span className="text-slate-400">
                  {item.lastReviewed || 'Jan 2026'}
                </span>
              </div>

              {/* Footer Link */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-3">
                <span><i className="fas fa-clock mr-1"></i>{item.readTime}</span>
                <Link 
                  to={`/guide/${item.id}`}
                  className="text-aubergine-600 group-hover:text-aubergine-800 transition-colors flex items-center font-extrabold"
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
