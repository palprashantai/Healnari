import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Reveal from '../../components/Reveal.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { triggerHaptic } from '../../lib/haptics.js';

// Curated high-end clinical problems with modern vector iconography & bespoke palettes
const ALL_PROBLEMS = [
  {
    id: 'irregular_periods',
    label: 'Irregular Periods',
    category: 'periods',
    domainLabel: 'Cycle Health',
    icon: 'fa-calendar-days',
    iconColor: 'text-rose-600 bg-rose-50/90 border-rose-200/80',
    question: 'Cycles arriving too early, unpredictable delays, or missed months altogether.',
  },
  {
    id: 'painful_periods',
    label: 'Period Pain & Cramps',
    category: 'periods',
    domainLabel: 'Menstrual Care',
    icon: 'fa-bolt-lightning',
    iconColor: 'text-amber-600 bg-amber-50/90 border-amber-200/80',
    question: 'Severe abdominal cramps, lower back pain, or nausea that disrupts your day.',
  },
  {
    id: 'heavy_periods',
    label: 'Very Heavy Bleeding',
    category: 'periods',
    domainLabel: 'Cycle Health',
    icon: 'fa-droplet',
    iconColor: 'text-red-600 bg-red-50/90 border-red-200/80',
    question: 'Soaking through protection rapidly, passing clots, or bleeding over 7 days.',
  },
  {
    id: 'hair_fall',
    label: 'Hair Fall & Shedding',
    category: 'hair',
    domainLabel: 'Hair & Scalp',
    icon: 'fa-wind',
    iconColor: 'text-teal-600 bg-teal-50/90 border-teal-200/80',
    question: 'Excessive hair strands on pillow, while washing, brushing, or sudden shedding.',
  },
  {
    id: 'hair_thinning',
    label: 'Hair Thinning & Density',
    category: 'hair',
    domainLabel: 'Trichology',
    icon: 'fa-scissors',
    iconColor: 'text-emerald-600 bg-emerald-50/90 border-emerald-200/80',
    question: 'Noticeable widening of the partition line, thinning crown, or low volume.',
  },
  {
    id: 'acne',
    label: 'Acne & Breakouts',
    category: 'skin',
    domainLabel: 'Dermatology',
    icon: 'fa-wand-magic-sparkles',
    iconColor: 'text-orange-600 bg-orange-50/90 border-orange-200/80',
    question: 'Stubborn, cystic, or hormonal pimples along the jawline, chin, or cheeks.',
  },
  {
    id: 'vaginal_itching',
    label: 'Vaginal Itching & Redness',
    category: 'vaginal',
    domainLabel: 'Intimate Care',
    icon: 'fa-shield-heart',
    iconColor: 'text-pink-600 bg-pink-50/90 border-pink-200/80',
    question: 'Persistent itching, soreness, redness, or burning in intimate areas.',
  },
  {
    id: 'abnormal_discharge',
    label: 'Unusual Discharge',
    category: 'vaginal',
    domainLabel: 'Intimate Care',
    icon: 'fa-water',
    iconColor: 'text-sky-600 bg-sky-50/90 border-sky-200/80',
    question: 'Noticeable shift in discharge color, consistency, thickness, or odor.',
  },
  {
    id: 'vaginal_burning',
    label: 'Burning or Irritation',
    category: 'vaginal',
    domainLabel: 'Intimate Care',
    icon: 'fa-fire',
    iconColor: 'text-rose-600 bg-rose-50/90 border-rose-200/80',
    question: 'Stinging sensation during urination, post-intercourse, or friction soreness.',
  },
  {
    id: 'weight_gain',
    label: 'Unexplained Weight Gain',
    category: 'weight',
    domainLabel: 'Metabolic Care',
    icon: 'fa-weight-scale',
    iconColor: 'text-emerald-600 bg-emerald-50/90 border-emerald-200/80',
    question: 'Rapid weight increase, stubborn visceral fat, or inability to lose weight.',
  },
  {
    id: 'fatigue',
    label: 'Constant Exhaustion',
    category: 'weight',
    domainLabel: 'Energy & Health',
    icon: 'fa-battery-half',
    iconColor: 'text-indigo-600 bg-indigo-50/90 border-indigo-200/80',
    question: 'Persistent low energy, sluggishness, morning fatigue, or mental brain fog.',
  },
  {
    id: 'pcos_concerns',
    label: 'PCOS Concerns',
    category: 'periods',
    domainLabel: 'Hormone Care',
    icon: 'fa-dna',
    iconColor: 'text-purple-600 bg-purple-50/90 border-purple-200/80',
    question: 'Irregular cycles paired with acne, facial hair, weight resistance, or cysts.',
  },
  {
    id: 'hormonal_imbalance',
    label: 'Hormone Fluctuations',
    category: 'periods',
    domainLabel: 'Endocrinology',
    icon: 'fa-repeat',
    iconColor: 'text-fuchsia-600 bg-fuchsia-50/90 border-fuchsia-200/80',
    question: 'Shifts in skin, sudden hot flashes, irregular cycle timing, or mood swings.',
  },
  {
    id: 'mood_swings',
    label: 'Mood & Emotional Changes',
    category: 'mind',
    domainLabel: 'Mental Wellbeing',
    icon: 'fa-heart-pulse',
    iconColor: 'text-blue-600 bg-blue-50/90 border-blue-200/80',
    question: 'Emotional lows, heightened anxiety, premenstrual irritability, or mood shifts.',
  },
  {
    id: 'stress',
    label: 'Chronic Stress & Burnout',
    category: 'mind',
    domainLabel: 'Mental Wellbeing',
    icon: 'fa-brain',
    iconColor: 'text-violet-600 bg-violet-50/90 border-violet-200/80',
    question: 'Overwhelming mental pressure, physical tension, restlessness, or exhaustion.',
  },
  {
    id: 'poor_sleep',
    label: 'Sleep Disturbances',
    category: 'mind',
    domainLabel: 'Lifestyle Care',
    icon: 'fa-moon',
    iconColor: 'text-slate-700 bg-slate-100 border-slate-200/80',
    question: 'Trouble falling asleep, frequent nighttime awakenings, or unrefreshing rest.',
  },
  {
    id: 'difficulty_conceiving',
    label: 'Fertility & Conception',
    category: 'fertility',
    domainLabel: 'Preconception',
    icon: 'fa-baby-carriage',
    iconColor: 'text-rose-600 bg-rose-50/90 border-rose-200/80',
    question: 'Questions about ovulation timing, cycle irregular fertility, or conceiving.',
  },
  {
    id: 'pelvic_pain',
    label: 'Pelvic Discomfort',
    category: 'periods',
    domainLabel: 'Reproductive Care',
    icon: 'fa-shield-halved',
    iconColor: 'text-amber-600 bg-amber-50/90 border-amber-200/80',
    question: 'Dull ache, heavy pressure, or recurring discomfort in the lower pelvis.',
  },
  {
    id: 'something_else',
    label: 'Something Else',
    category: 'other',
    domainLabel: 'Guided Care',
    icon: 'fa-stethoscope',
    iconColor: 'text-aubergine-600 bg-aubergine-50/90 border-aubergine-200/80',
    question: 'Describe your symptoms in your own words. Our clinical AI will guide you.',
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Concerns', icon: 'fa-border-all' },
  { id: 'periods', label: 'Periods & Hormones', icon: 'fa-calendar-days' },
  { id: 'hair', label: 'Hair & Scalp', icon: 'fa-wind' },
  { id: 'skin', label: 'Skin & Acne', icon: 'fa-wand-magic-sparkles' },
  { id: 'vaginal', label: 'Intimate Health', icon: 'fa-shield-heart' },
  { id: 'weight', label: 'Weight & Energy', icon: 'fa-battery-half' },
  { id: 'mind', label: 'Mind & Sleep', icon: 'fa-moon' },
  { id: 'fertility', label: 'Fertility', icon: 'fa-baby-carriage' }
];

export default function WhatAreYouDealingWith() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProblems = useMemo(() => {
    return ALL_PROBLEMS.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory || p.id === 'something_else';
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;
      const matchesSearch = p.label.toLowerCase().includes(q) || p.question.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleProblemClick = (problemId) => {
    triggerHaptic('medium');
    trackEvent(AnalyticsEvents.SYMPTOM_SELECTED, {
      source: 'landing_problem_card',
      problem_id: problemId
    });
    navigate(`/check-symptoms?concern=${problemId}`);
  };

  const handleGeneralCheckClick = () => {
    triggerHaptic('medium');
    trackEvent(AnalyticsEvents.CHECK_SYMPTOMS_CLICKED, {
      source: 'landing_problem_primary_cta'
    });
    navigate('/check-symptoms');
  };

  return (
    <section id="what-are-you-dealing-with" className="py-10 sm:py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden font-sans">
      {/* Soft, premium ambient illumination */}
      <div 
        aria-hidden="true" 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] lg:w-[700px] h-[300px] sm:h-[350px] bg-gradient-to-r from-aubergine-100/30 via-magenta-50/20 to-indigo-50/30 blur-3xl rounded-full pointer-events-none -z-10" 
      />

      <Reveal>
        {/* Header Block */}
        <div className="max-w-3xl mx-auto space-y-2.5 sm:space-y-3.5">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-aubergine-50/90 border border-aubergine-200/70 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-aubergine-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wide uppercase">Clinical Triage &amp; Navigation</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight px-1">
            What are you experiencing?
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed px-2">
            Select your symptom to explore possible root causes and connect with specialized doctors. No medical specialty knowledge needed.
          </p>
        </div>

        {/* Search Bar — Apple/Stripe-level Minimalist Pill (Prevents iOS Safari auto-zoom) */}
        <div className="mt-6 sm:mt-8 max-w-xl mx-auto px-1 sm:px-0">
          <div className="relative group">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-aubergine-600 transition-colors text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symptom (e.g. hair fall, late period, cramps, acne)..."
              className="w-full pl-11 pr-10 py-3 sm:py-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-aubergine-500/20 focus:border-aubergine-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 w-7 h-7 flex items-center justify-center text-xs"
                aria-label="Clear search"
              >
                <i className="fas fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Clean Segmented Category Tabs with Smooth Touch Scrolling */}
        <div className="mt-5 sm:mt-6 relative max-w-full">
          <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto pb-2 px-1 sm:px-2 hide-scrollbar touch-pan-x">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveCategory(cat.id);
                  }}
                  className={`shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 active:scale-95 touch-manipulation ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <i className={`fas ${cat.icon} text-[10px] ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Premium Healthcare Problem Cards Grid — Responsive on Mobile & Touch */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 text-left">
          {filteredProblems.map((problem) => (
            <div
              key={problem.id}
              onClick={() => handleProblemClick(problem.id)}
              className="group relative bg-white rounded-2xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_-8px_rgba(42,22,71,0.10)] hover:border-aubergine-300 hover:-translate-y-1 active:scale-[0.99] transition-all duration-200 cursor-pointer flex flex-col justify-between touch-manipulation"
            >
              <div>
                {/* Card Top: Sleek Icon Squircle + Action Arrow */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm sm:text-base border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${problem.iconColor}`}>
                    <i className={`fas ${problem.icon}`} />
                  </div>
                  
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 group-hover:bg-aubergine-600 group-hover:text-white group-hover:border-aubergine-600 group-hover:translate-x-0.5 transition-all duration-200 shadow-2xs">
                    <i className="fas fa-arrow-right text-[10px] sm:text-[11px]" />
                  </div>
                </div>

                {/* Problem Title — Modern Clean Sans */}
                <h3 className="font-sans font-bold text-slate-900 text-base sm:text-[17px] group-hover:text-aubergine-600 transition-colors tracking-tight leading-snug mb-1 sm:mb-1.5">
                  {problem.label}
                </h3>

                {/* Relatable Conversational Text — Clean Sans Body */}
                <p className="font-sans text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed mb-3 sm:mb-4">
                  {problem.question}
                </p>
              </div>

              {/* Card Footer: Clinical Domain Pill + Action Prompt (Visible on mobile touch screens) */}
              <div className="pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 sm:px-2.5 py-0.5 rounded-md border border-slate-150">
                  {problem.domainLabel}
                </span>
                
                <span className="text-xs font-semibold text-aubergine-600 flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                  <span>Explore</span>
                  <i className="fas fa-chevron-right text-[9px]" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty Search Fallback */}
        {filteredProblems.length === 0 && (
          <div className="mt-8 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-md mx-auto">
            <i className="fas fa-search text-slate-300 text-2xl mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No matching symptoms found</h4>
            <p className="text-xs text-slate-500 mt-1">Try another search term or click "Something Else" to describe your concern directly.</p>
            <button
              type="button"
              onClick={() => handleProblemClick('something_else')}
              className="mt-3 text-xs font-bold text-aubergine-600 hover:underline"
            >
              Describe custom concern →
            </button>
          </div>
        )}

        {/* 4-Step Clinical Care Roadmap Banner — Responsive Grid on Mobile */}
        <div className="mt-10 sm:mt-12 bg-gradient-to-b from-slate-50/90 to-purple-50/40 border border-slate-200/80 rounded-2xl p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-aubergine-700 tracking-wider uppercase mb-1">
            The HealNari Mental Model
          </div>
          <h4 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight mb-4 sm:mb-5">
            How we guide you from symptom to solution
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/70 shadow-2xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">STEP 01</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">Your Concern</div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-relaxed">Select the symptom you are experiencing.</p>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/70 shadow-2xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">STEP 02</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">Tell Us More</div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-relaxed">Answer concise questions on timing &amp; pattern.</p>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/70 shadow-2xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">STEP 03</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">Possible Reasons</div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-relaxed">Learn about hormones, nutrition, or stress.</p>
            </div>

            <div className="bg-aubergine-600 text-white p-3 sm:p-4 rounded-xl shadow-xs">
              <div className="text-[9px] sm:text-[10px] font-extrabold text-purple-200 uppercase tracking-wider mb-0.5 sm:mb-1">STEP 04</div>
              <div className="text-xs sm:text-sm font-bold text-white">Who Can Help</div>
              <p className="text-[11px] sm:text-xs text-purple-100 mt-0.5 sm:mt-1 leading-relaxed">Direct connection to verified specialists.</p>
            </div>
          </div>
        </div>

        {/* Primary CTA — Mobile Full-Width Touch Friendly */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 px-2 sm:px-0">
          <button
            type="button"
            onClick={handleGeneralCheckClick}
            className="w-full sm:w-auto bg-gradient-to-r from-aubergine-700 via-healnari-purple to-magenta-600 hover:from-aubergine-800 hover:to-magenta-700 text-white font-bold text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 touch-manipulation"
          >
            <i className="fas fa-stethoscope text-sm" />
            <span>Check My Symptoms — Free 2-Min Triage</span>
            <i className="fas fa-arrow-right text-xs" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400 px-4">
          Takes ~2 minutes • 100% Confidential • Non-diagnostic clinical navigation
        </p>
      </Reveal>
    </section>
  );
}
