import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { triggerHaptic } from '../../lib/haptics.js';
import { apiFetch } from '../../lib/apiClient.js';

// Multi-Specialty Clinical Specialties Ribbon
const SPECIALTIES_RIBBON = [
  { icon: 'fa-user-doctor', label: 'General Medicine', color: 'text-blue-700 bg-blue-50/80 border-blue-200' },
  { icon: 'fa-wand-magic-sparkles', label: 'Dermatology & Skin', color: 'text-amber-700 bg-amber-50/80 border-amber-200' },
  { icon: 'fa-dna', label: 'Endocrinology & Thyroid', color: 'text-indigo-700 bg-indigo-50/80 border-indigo-200' },
  { icon: 'fa-venus', label: 'Gynaecology & PCOS', color: 'text-rose-700 bg-rose-50/80 border-rose-200' },
  { icon: 'fa-apple-whole', label: 'Clinical Nutrition', color: 'text-teal-700 bg-teal-50/80 border-teal-200' },
  { icon: 'fa-brain', label: 'Mental Health', color: 'text-purple-700 bg-purple-50/80 border-purple-200' },
  { icon: 'fa-seedling', label: 'Trichology & Scalp', color: 'text-emerald-700 bg-emerald-50/80 border-emerald-200' },
];

const DEFAULT_SPECIALTIES_DROPDOWN = [
  { id: 'all', name: 'All Specialties' },
  { id: 'general', name: 'General Medicine', subtitle: 'Fever, Infections, BP, Fatigue' },
  { id: 'derma', name: 'Dermatology & Hair', subtitle: 'Acne, Eczema, Hair Fall' },
  { id: 'endo', name: 'Endocrinology', subtitle: 'Thyroid, Diabetes, Hormones' },
  { id: 'gynae', name: 'Gynaecology', subtitle: 'Menstrual Care, PCOS, Fertility' },
  { id: 'nutrition', name: 'Clinical Nutrition', subtitle: 'Weight, Gut Health, Diet Plans' },
];

function Hero({ onStartConsult, onOpenChecker, title, subtitle }) {
  const [specialties, setSpecialties] = useState(DEFAULT_SPECIALTIES_DROPDOWN);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  // Progressive background hydration: Fetch real database specialties if available
  useEffect(() => {
    let isMounted = true;
    apiFetch('/admin/public/specialties')
      .then((spRes) => {
        if (!isMounted) return;
        const spData = Array.isArray(spRes?.data) ? spRes.data : Array.isArray(spRes) ? spRes : [];
        if (spData.length > 0) {
          const formattedSp = [
            { id: 'all', name: 'All Specialties' },
            ...spData.map((s) => ({
              id: s.id || s.slug || s.name.toLowerCase().replace(/\s+/g, '-'),
              name: s.name,
              subtitle: s.description || s.subtitle || '',
            })),
          ];
          setSpecialties(formattedSp);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    triggerHaptic('medium');
    
    // Smooth scroll to doctors section or trigger consultation
    const doctorsSection = document.getElementById('doctors');
    if (doctorsSection) {
      doctorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (onStartConsult) {
      onStartConsult('');
    }
  };

  return (
    <section className="relative pt-6 pb-8 md:pt-10 md:pb-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle ambient lighting backdrops */}
      <div 
        aria-hidden="true" 
        className="absolute top-1/4 left-1/10 w-80 h-80 rounded-full bg-aubergine-200/30 blur-3xl -z-10 pointer-events-none"
      />
      <div 
        aria-hidden="true" 
        className="absolute top-1/3 right-1/10 w-96 h-96 rounded-full bg-violet-200/25 blur-3xl -z-10 pointer-events-none"
      />

      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Multi-Specialty Positioning & Triage Gateway */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left order-2 lg:order-1 min-w-0">
          
          {/* Eyebrow & AI Feature Announcement Pills */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <div className="inline-flex items-center gap-2 bg-aubergine-50/90 border border-aubergine-200/80 px-3.5 py-1.5 rounded-full shadow-2xs text-xs font-semibold text-aubergine-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <span className="font-bold">Multi-Specialty Telehealth</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">Verified Specialists</span>
            </div>

            <a
              href="#ai-features"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-magenta-50 via-purple-50 to-indigo-50 hover:from-magenta-100 hover:via-purple-100 hover:to-indigo-100 border border-magenta-200/90 px-3.5 py-1.5 rounded-full shadow-2xs text-xs font-bold text-magenta-900 transition-all hover:scale-[1.02]"
            >
              <i className="fas fa-wand-magic-sparkles text-magenta-600 text-[11px] animate-pulse" aria-hidden="true" />
              <span>✨ <strong>AI Health Suite:</strong> Lab Analyzer &amp; 24/7 Triage</span>
              <i className="fas fa-arrow-right text-[10px] text-magenta-600 ml-0.5" aria-hidden="true" />
            </a>
          </div>

          {/* H1 Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.15]">
              {title && !title.toLowerCase().includes("women") ? (
                title
              ) : (
                <>
                  Specialized Medical Care, <br className="hidden sm:inline" />
                  <span className="text-aubergine-600">Delivered with Precision.</span>
                </>
              )}
            </h1>

            {/* Subheadline (Concise, multi-specialty, scannable, featuring AI capability) */}
            <p className="text-slate-600 text-base sm:text-lg lg:text-xl font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {subtitle && subtitle.toLowerCase().includes("ai") ? (
                subtitle
              ) : (
                <>
                  Consult verified <strong>General Physicians, Dermatologists, Gynecologists, Endocrinologists, and Nutritionists</strong> with built-in <strong>AI Lab Report Analysis</strong> and 24/7 symptom triage. Comprehensive 45-minute video consultations, digital prescriptions, and free 14-day follow-up.
                </>
              )}
            </p>
          </div>

          {/* Specialties Ribbon */}
          <div className="pt-1 pb-1 flex flex-wrap justify-center lg:justify-start gap-1.5 sm:gap-2 max-w-2xl">
            {SPECIALTIES_RIBBON.map(s => (
              <span 
                key={s.label} 
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border shadow-2xs ${s.color}`}
              >
                <i className={`fas ${s.icon} text-[10px]`} aria-hidden="true" />
                {s.label}
              </span>
            ))}
          </div>

          {/* Strict 2-CTA Hierarchy (Prompt Section 5) */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 max-w-xl">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                const careSection = document.getElementById('care-discovery');
                if (careSection) {
                  careSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (onStartConsult) {
                  onStartConsult('');
                }
              }}
              className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold px-7 py-3.5 rounded-xl shadow-lg shadow-aubergine-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 text-base"
            >
              <i className="fas fa-stethoscope text-sm" aria-hidden="true" />
              <span>Find a Specialist</span>
            </button>

            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('how-it-works');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 py-3.5 rounded-xl border border-sand-300 shadow-xs transition-all hover:border-aubergine-300 flex items-center justify-center gap-2 text-base"
            >
              <span>How HealNari Works</span>
              <i className="fas fa-arrow-down text-xs text-slate-400" aria-hidden="true" />
            </a>
          </div>

          {/* Micro-Reassurance Tagline */}
          <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <i className="fas fa-check-circle text-emerald-500 text-xs" />
              <span>No waiting rooms</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fas fa-video text-aubergine-500 text-xs" />
              <span>45-min video visits</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fas fa-comment-medical text-indigo-500 text-xs" />
              <span>14-day free chat follow-up</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fas fa-shield-halved text-purple-500 text-xs" />
              <span>100% Confidential</span>
            </span>
          </div>

          {/* Verifiable Clinical Proof Badges */}
          <div className="pt-4 border-t border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="flex items-start gap-2">
              <i className="fas fa-circle-check text-emerald-600 text-sm mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">Council-Verified</p>
                <p className="text-[11px] text-slate-500 font-medium">Licensed MD/MS doctors</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <i className="fas fa-wand-magic-sparkles text-magenta-600 text-sm mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">AI Diagnostic Suite</p>
                <p className="text-[11px] text-slate-500 font-medium">Lab reports &amp; biomarker analysis</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <i className="fas fa-shield-halved text-aubergine-600 text-sm mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">100% Private</p>
                <p className="text-[11px] text-slate-500 font-medium">Encrypted video &amp; records</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <i className="fas fa-clock-rotate-left text-indigo-600 text-sm mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-800">From ₹799</p>
                <p className="text-[11px] text-slate-500 font-medium">45-min consult + 14-d chat</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Exact Circular Doctor Visual with Floating Badges (Zero Collisions) */}
        <div className="lg:col-span-5 relative order-1 lg:order-2 flex flex-col items-center lg:items-end">
          
          {/* Main Circular Visual Frame with Ambient Radial Glow */}
          <div className="relative w-52 h-52 sm:w-72 sm:h-72 lg:w-84 lg:h-84 mx-auto lg:ml-auto lg:mr-0">
            {/* Ambient Radial Gradient Glow */}
            <div 
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-aubergine-600 via-magenta-400 to-indigo-300 opacity-25 blur-2xl animate-pulse-subtle"
            />
            
            {/* Circular Doctor Portrait */}
            <div className="w-full h-full rounded-full overflow-hidden border-4 sm:border-8 border-white shadow-2xl relative bg-slate-100">
              <img
                src="/generated/hero.webp"
                alt="Licensed specialist doctor in clinical consultation at HealNari"
                width="340"
                height="340"
                fetchpriority="high"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Top-Left Floating Badge: 100% Doctor-Led */}
            <div className="absolute -top-1 sm:-top-3 -left-1 sm:-left-3 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-sand-200 p-1.5 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 animate-bounce-subtle z-10 scale-90 sm:scale-100 origin-top-left">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px] sm:text-xs shrink-0">
                <i className="fas fa-shield-heart" aria-hidden="true" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 whitespace-nowrap">
                100% Doctor-Led
              </span>
            </div>

            {/* Bottom-Right Floating Badge: 4.98 / 5.0 Rating */}
            <div className="absolute -bottom-2 sm:-bottom-4 -right-2 sm:right-4 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-sand-200 p-2 sm:p-3.5 flex items-center gap-1.5 sm:gap-3 animate-float z-10 scale-90 sm:scale-100 origin-bottom-right">
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 text-xs sm:text-lg shrink-0">
                <i className="fas fa-star" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="font-extrabold text-slate-800 text-xs sm:text-base leading-none">4.98</span>
                  <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold">/ 5.0</span>
                </div>
                <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold mt-0.5 whitespace-nowrap">
                  2,000+ verified consults
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

export default Hero;
