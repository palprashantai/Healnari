import React, { useState } from 'react';
import Reveal from '../../components/Reveal.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { triggerHaptic } from '../../lib/haptics.js';

const CONCERN_CATEGORIES = [
  {
    id: 'general',
    label: 'Everyday Illness & Fatigue',
    icon: 'fa-user-doctor',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    activeBg: 'bg-blue-600 text-white',
    specialty: 'General Medicine / Physician',
    description: 'Fever, cough/cold, blood pressure, persistent fatigue, digestive upset, and preventative health checks.',
    recommendedSpecialist: 'General Physician / Internal Medicine MD',
    actionText: 'Find General Physicians',
    specialtyTag: 'General Medicine',
    timeframe: 'Same-day video consults available',
    popularReasons: ['Viral fever / flu', 'High BP & cholesterol monitoring', 'Chronic exhaustion & weakness', 'Routine medical review']
  },
  {
    id: 'skin-hair',
    label: 'Skin & Hair Concerns',
    icon: 'fa-wand-magic-sparkles',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    activeBg: 'bg-amber-600 text-white',
    specialty: 'Dermatology & Trichology',
    description: 'Adult acne, chronic hair loss, scalp inflammation, eczema, pigmentation, and hormonal skin flares.',
    recommendedSpecialist: 'Clinical Dermatologist & Trichologist',
    actionText: 'Find Skin & Hair Specialists',
    specialtyTag: 'Dermatology',
    timeframe: 'Next slot today in 45 mins',
    popularReasons: ['Hormonal / cystic acne', 'Widening hair partition & shedding', 'Stubborn pigmentation / melasma', 'Dry, inflamed scalp']
  },
  {
    id: 'hormones',
    label: 'Thyroid & Hormones',
    icon: 'fa-dna',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    activeBg: 'bg-indigo-600 text-white',
    specialty: 'Endocrinology & Metabolism',
    description: 'Hypo/hyperthyroidism, insulin resistance, pre-diabetes, Hashimoto’s, and metabolic energy crashes.',
    recommendedSpecialist: 'Clinical Endocrinologist',
    actionText: 'Find Endocrinologists',
    specialtyTag: 'Endocrinology',
    timeframe: '45-min comprehensive video consult',
    popularReasons: ['Unexplained weight gain / difficulty losing', 'Thyroid lab report review (TSH, T3, T4)', 'Post-meal energy crashes', 'Insulin sensitivity check']
  },
  {
    id: 'womens-health',
    label: 'Reproductive & Cycle Care',
    icon: 'fa-venus',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    activeBg: 'bg-rose-600 text-white',
    specialty: 'Gynaecology & Reproductive Health',
    description: 'Irregular cycles, dysmenorrhea (painful cramps), heavy bleeding, PCOS management, and fertility planning.',
    recommendedSpecialist: 'Obstetrician & Gynaecologist',
    actionText: 'Find Gynaecologists',
    specialtyTag: 'Gynaecologist',
    timeframe: 'Confidential 1-on-1 private video call',
    popularReasons: ['Irregular or delayed cycles', 'Severe period cramps', 'PCOS / PCOD root-cause care', 'Preconception planning']
  },
  {
    id: 'nutrition',
    label: 'Diet, Gut & Metabolism',
    icon: 'fa-apple-whole',
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    activeBg: 'bg-teal-600 text-white',
    specialty: 'Clinical Nutrition & Dietetics',
    description: 'Personalized anti-inflammatory meal planning, gut microbiome support, and sustainable lifestyle nutrition.',
    recommendedSpecialist: 'Registered Clinical Dietitian',
    actionText: 'Find Clinical Dietitians',
    specialtyTag: 'Nutritionist',
    timeframe: 'Includes custom 14-day meal roadmap',
    popularReasons: ['Anti-inflammatory diet plans', 'Gut health & bloating relief', 'Metabolic weight management', 'Cycle-synced nutrition']
  },
  {
    id: 'wellness',
    label: 'Mindful Movement & Stress',
    icon: 'fa-person-praying',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    activeBg: 'bg-purple-600 text-white',
    specialty: 'Movement Therapy & Somatic Wellness',
    description: 'Somatic stress release, gentle hormone-supportive yoga, pelvic floor conditioning, and sleep regulation.',
    recommendedSpecialist: 'Certified Yoga & Movement Therapist',
    actionText: 'Find Movement Specialists',
    specialtyTag: 'Yoga & Movement',
    timeframe: 'Guided somatic movement routines',
    popularReasons: ['Pelvic floor strengthening', 'Nervous system down-regulation', 'Cycle-synced restorative yoga', 'Sleep restoration']
  }
];

export default function CareDiscovery({ onSelectSpecialty, onStartConsult }) {
  const [activeConcern, setActiveConcern] = useState(CONCERN_CATEGORIES[0]);

  const handleSelect = (category) => {
    triggerHaptic('light');
    setActiveConcern(category);
    trackEvent(AnalyticsEvents.SPECIALTY_CLICKED, {
      specialty: category.specialty,
      category_id: category.id,
      source: 'care_discovery_wizard'
    });
  };

  const handleActionClick = () => {
    triggerHaptic('medium');
    trackEvent(AnalyticsEvents.FIND_SPECIALIST_CLICKED, {
      specialty: activeConcern.specialty,
      action: 'explore_doctors_clicked'
    });

    if (onSelectSpecialty) {
      onSelectSpecialty(activeConcern.specialtyTag);
    }

    const doctorsEl = document.getElementById('doctors');
    if (doctorsEl) {
      doctorsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (onStartConsult) {
      onStartConsult('');
    }
  };

  return (
    <section id="care-discovery" className="py-14 sm:py-20 bg-gradient-to-b from-sand-50/50 via-white to-sand-50/30 border-y border-sand-200/60 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-aubergine-50 border border-aubergine-200/80 px-3.5 py-1.5 rounded-full shadow-2xs">
            <i className="fas fa-compass text-aubergine-600 text-xs"></i>
            <span className="text-xs font-bold text-aubergine-800 uppercase tracking-wider">
              Interactive Care Discovery
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
            Not Sure Which Specialist You Need?
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
            Choose what you would like help with today. We will guide you to the right verified medical department and specialist doctor.
          </p>
        </Reveal>

        {/* 1-Tap Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-4xl mx-auto mb-8 sm:mb-10">
          {CONCERN_CATEGORIES.map((cat) => {
            const isSelected = activeConcern.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-md shadow-aubergine-200 scale-102'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300'
                }`}
              >
                <i className={`fas ${cat.icon} ${isSelected ? 'text-white' : 'text-aubergine-600'} text-xs sm:text-sm`}></i>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Specialty Match Display Card */}
        <Reveal key={activeConcern.id} className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-sand-300 shadow-xl overflow-hidden p-6 sm:p-8 md:p-10 transition-all">
            <div className="grid md:grid-cols-12 gap-6 sm:gap-8 items-center">
              
              {/* Left Column: Specialty Details */}
              <div className="md:col-span-7 space-y-4 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${activeConcern.color}`}>
                    <i className={`fas ${activeConcern.icon}`}></i>
                    Recommended Department
                  </span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <i className="fas fa-circle-check text-[10px] mr-1"></i>
                    {activeConcern.timeframe}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                    {activeConcern.specialty}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                    {activeConcern.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Common Reasons Patients Consult This Specialist:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
                    {activeConcern.popularReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <i className="fas fa-check text-emerald-500 text-[10px] shrink-0"></i>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Action Box */}
              <div className="md:col-span-5 bg-sand-50/80 rounded-2xl p-5 sm:p-6 border border-sand-200 flex flex-col justify-between gap-4 text-left">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Qualified Clinicians
                  </span>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">
                    {activeConcern.recommendedSpecialist}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    NMC / Board-verified clinicians offering 45-min detailed video consultations with digital prescriptions.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleActionClick}
                    className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <span>{activeConcern.actionText}</span>
                    <i className="fas fa-arrow-right text-xs"></i>
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartConsult?.(activeConcern.recommendedSpecialist)}
                    className="w-full bg-white hover:bg-slate-50 text-aubergine-800 border border-slate-200 font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <i className="fas fa-calendar-check text-aubergine-500"></i>
                    <span>Instant Booking (From ₹799)</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Non-Diagnostic Disclaimer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
              <i className="fas fa-shield-halved text-slate-400 shrink-0"></i>
              <span>
                <strong>HealNari Clinical Care Protocol:</strong> This tool assists with navigating clinical departments and does not provide an automated medical diagnosis. All treatment plans are determined by licensed medical doctors.
              </span>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
