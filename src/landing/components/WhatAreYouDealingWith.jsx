import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Reveal from '../../components/Reveal.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { triggerHaptic } from '../../lib/haptics.js';

// The comprehensive patient problems specified in the UX requirement
const ALL_PROBLEMS = [
  {
    id: 'irregular_periods',
    label: 'Irregular Periods',
    category: 'periods',
    emoji: '🩸',
    icon: 'fa-calendar-xmark',
    question: 'Are your periods coming earlier, later, or sometimes not at all?',
    gradient: 'from-rose-500/10 via-pink-500/5 to-white',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'painful_periods',
    label: 'Period Pain',
    category: 'periods',
    emoji: '😣',
    icon: 'fa-circle-exclamation',
    question: 'Pain or severe cramps that make daily activities difficult?',
    gradient: 'from-rose-500/10 via-amber-500/5 to-white',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'heavy_periods',
    label: 'Very Heavy Periods',
    category: 'periods',
    emoji: '🩸',
    icon: 'fa-droplet',
    question: 'Excessive bleeding, large clots, or periods lasting >7 days?',
    gradient: 'from-red-500/10 via-rose-500/5 to-white',
    badgeColor: 'bg-red-50 text-red-700 border-red-200'
  },
  {
    id: 'hair_fall',
    label: 'Hair Fall',
    category: 'hair',
    emoji: '💇',
    icon: 'fa-wind',
    question: 'Losing more hair than usual while washing, brushing, or waking up?',
    gradient: 'from-teal-500/10 via-emerald-500/5 to-white',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'hair_thinning',
    label: 'Hair Thinning',
    category: 'hair',
    emoji: '👩‍🦱',
    icon: 'fa-scissors',
    question: 'Noticeable widening of the partition line, thinning crown, or low volume?',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-white',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'acne',
    label: 'Acne & Pimples',
    category: 'skin',
    emoji: '😣',
    icon: 'fa-spa',
    question: 'New, frequent, or stubborn pimples on chin, cheeks, jawline, or back?',
    gradient: 'from-amber-500/10 via-orange-500/5 to-white',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'vaginal_itching',
    label: 'Vaginal Itching',
    category: 'vaginal',
    emoji: '🩷',
    icon: 'fa-hand-dots',
    question: 'Itching, burning, redness, or irritation in your intimate area?',
    gradient: 'from-pink-500/10 via-rose-500/5 to-white',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200'
  },
  {
    id: 'abnormal_discharge',
    label: 'Unusual Vaginal Discharge',
    category: 'vaginal',
    emoji: '💧',
    icon: 'fa-water',
    question: 'Noticeable change in discharge color (yellow/green/grey), smell, or texture?',
    gradient: 'from-sky-500/10 via-blue-500/5 to-white',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  {
    id: 'vaginal_burning',
    label: 'Burning or Irritation',
    category: 'vaginal',
    emoji: '🔥',
    icon: 'fa-fire-flame-simple',
    question: 'Stinging sensation during urination, post-intercourse, or intimate soreness?',
    gradient: 'from-orange-500/10 via-amber-500/5 to-white',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  {
    id: 'weight_gain',
    label: 'Weight Gain',
    category: 'weight',
    emoji: '⚖️',
    icon: 'fa-scale-unbalanced',
    question: 'Unexpected weight gain or stubborn fat that is difficult to lose?',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-white',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'fatigue',
    label: 'Feeling Tired',
    category: 'weight',
    emoji: '😴',
    icon: 'fa-battery-quarter',
    question: 'Persistent exhaustion, brain fog, or low stamina despite resting?',
    gradient: 'from-violet-500/10 via-indigo-500/5 to-white',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  {
    id: 'pcos_concerns',
    label: 'PCOS Concerns',
    category: 'periods',
    emoji: '🧬',
    icon: 'fa-dna',
    question: 'Questions about cycles, hormones, facial hair, stubborn acne, or fertility?',
    gradient: 'from-fuchsia-500/10 via-purple-500/5 to-white',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
  },
  {
    id: 'hormonal_imbalance',
    label: 'Hormone Changes',
    category: 'periods',
    emoji: '🔄',
    icon: 'fa-rotate',
    question: 'Shifts in cycle regularity, skin changes, mood fluctuations, or hot flashes?',
    gradient: 'from-purple-500/10 via-pink-500/5 to-white',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'mood_swings',
    label: 'Mood Changes',
    category: 'mind',
    emoji: '😔',
    icon: 'fa-cloud-rain',
    question: 'Feeling emotionally low, sudden mood swings, anxiety, or irritability?',
    gradient: 'from-indigo-500/10 via-blue-500/5 to-white',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'stress',
    label: 'Stress & Overwhelm',
    category: 'mind',
    emoji: '😰',
    icon: 'fa-brain',
    question: 'High stress, racing thoughts, muscle tension, or emotional burnout?',
    gradient: 'from-purple-500/10 via-indigo-500/5 to-white',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'poor_sleep',
    label: 'Poor Sleep',
    category: 'mind',
    emoji: '🌙',
    icon: 'fa-moon',
    question: 'Trouble falling asleep, frequent waking, or waking up unrefreshed?',
    gradient: 'from-blue-500/10 via-indigo-500/5 to-white',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'difficulty_conceiving',
    label: 'Fertility Concerns',
    category: 'fertility',
    emoji: '🤰',
    icon: 'fa-seedling',
    question: 'Trying to conceive, irregular ovulation, or pre-pregnancy health questions?',
    gradient: 'from-rose-500/10 via-purple-500/5 to-white',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'pelvic_pain',
    label: 'Pelvic Pain',
    category: 'periods',
    emoji: '🫃',
    icon: 'fa-heart-crack',
    question: 'Dull ache, heaviness, or sharp pain in your lower pelvis or abdomen?',
    gradient: 'from-rose-500/10 via-amber-500/5 to-white',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 'something_else',
    label: 'Something Else',
    category: 'other',
    emoji: '🩺',
    icon: 'fa-stethoscope',
    question: "Can't find your problem? Tell us what's bothering you in your own words.",
    gradient: 'from-aubergine-500/10 via-purple-500/5 to-white',
    badgeColor: 'bg-aubergine-50 text-aubergine-700 border-aubergine-200'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Concerns', emoji: '✨' },
  { id: 'periods', label: 'Periods & Hormones', emoji: '🩸' },
  { id: 'hair', label: 'Hair & Scalp', emoji: '💇' },
  { id: 'skin', label: 'Skin & Acne', emoji: '😣' },
  { id: 'vaginal', label: 'Vaginal Health', emoji: '🩷' },
  { id: 'weight', label: 'Weight & Energy', emoji: '⚖️' },
  { id: 'mind', label: 'Mind & Sleep', emoji: '🌙' },
  { id: 'fertility', label: 'Fertility', emoji: '🤰' }
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
    <section id="what-are-you-dealing-with" className="py-12 sm:py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
      {/* Ambient background glows */}
      <div 
        aria-hidden="true" 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-purple-200/40 via-pink-100/30 to-indigo-100/40 blur-3xl rounded-full pointer-events-none -z-10" 
      />

      <Reveal>
        <div className="max-w-3xl mx-auto space-y-3.5">
          {/* Eye-catching Problem-First badge */}
          <div className="inline-flex items-center gap-2 bg-aubergine-50 border border-aubergine-200/80 px-4 py-1.5 rounded-full text-xs font-bold text-aubergine-900 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>START WITH YOUR SYMPTOM • NO SPECIALTY GUESSWORK</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight font-display">
            What are you dealing with?
          </h2>

          <p className="text-base sm:text-lg text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Select what you are experiencing. You don't need to know medical specialties before starting — HealNari guides you through what could be related and who can help.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-8 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full">
            <i className="fas fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your symptom (e.g. hair fall, late period, severe pain, acne, itching)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-aubergine-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
              >
                <i className="fas fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-5 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 px-2 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveCategory(cat.id);
              }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-aubergine-600 text-white shadow-md shadow-aubergine-600/20 scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Problem Cards Grid — HIGH VISUAL PROMINENCE */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
          {filteredProblems.map((problem) => (
            <div
              key={problem.id}
              onClick={() => handleProblemClick(problem.id)}
              className={`group relative bg-gradient-to-b ${problem.gradient} bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-aubergine-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between`}
            >
              <div>
                {/* Header: Emoji & Icon */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl select-none group-hover:scale-110 transition-transform duration-200">
                    {problem.emoji}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${problem.badgeColor}`}>
                    <i className={`fas ${problem.icon} mr-1`} />
                    Symptom
                  </span>
                </div>

                {/* PROBLEM NAME — Large & Dominant */}
                <h3 className="text-lg font-black text-slate-900 group-hover:text-aubergine-600 transition-colors tracking-tight font-display mb-1.5">
                  {problem.label}
                </h3>

                {/* Short relatable question */}
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic mb-4">
                  {problem.question}
                </p>
              </div>

              {/* Action Link Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-aubergine-600 group-hover:text-aubergine-800">
                <span className="group-hover:underline">Check this problem</span>
                <i className="fas fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* 3-Step Mental Model Ribbon */}
        <div className="mt-12 bg-white/80 backdrop-blur-md border border-purple-100 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-sm">
          <div className="text-xs font-bold text-aubergine-600 uppercase tracking-wider mb-2">
            The HealNari Care Pathway
          </div>
          <h4 className="text-lg sm:text-xl font-black text-slate-900 font-display mb-4">
            How we help you solve your problem safely
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="text-xs font-bold text-slate-400 mb-1">STEP 1</div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>🩸</span> Your Concern
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Select the symptoms you are actually experiencing.</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="text-xs font-bold text-slate-400 mb-1">STEP 2</div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>💬</span> Tell Us More
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Answer only relevant questions about timeline & context.</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="text-xs font-bold text-slate-400 mb-1">STEP 3</div>
              <div className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>🧬</span> Possible Reasons
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Understand health areas like hormones, thyroid, or nutrition.</p>
            </div>

            <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200/80">
              <div className="text-xs font-bold text-purple-700 mb-1">STEP 4</div>
              <div className="text-sm font-extrabold text-purple-900 flex items-center gap-1.5">
                <span>🩺</span> Who Can Help
              </div>
              <p className="text-[11px] text-purple-700 mt-1">Connect with verified doctors who specialize in your problem.</p>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleGeneralCheckClick}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-700 via-healnari-purple to-magenta-600 hover:from-purple-800 hover:to-magenta-700 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <i className="fas fa-stethoscope text-base" />
            <span>Check My Symptoms (Free &amp; Confidential)</span>
            <i className="fas fa-arrow-right text-xs" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Takes ~2 minutes • Plain language • No self-diagnosis, safe doctor triage
        </p>
      </Reveal>
    </section>
  );
}
