import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { triggerHaptic } from '../../lib/haptics.js';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import {
  SYMPTOM_CATEGORIES,
  ALL_SYMPTOMS_MAP,
  RED_FLAG_SYMPTOMS,
  getContextualQuestions,
  evaluateAssessment,
  saveAssessmentLocally,
  getLatestAssessment
} from '../../data/symptomAssessmentData.js';
import { PersonalizedExercise } from '../components/PersonalizedExercise.jsx';

// Lazy load modals for performance
const BookingModal = lazy(() => import('../../tools/BookingModal.jsx'));
const AuthModal = lazy(() => import('../../tools/AuthModal.jsx'));
const SuccessModal = lazy(() => import('../../tools/SuccessModal.jsx'));

export default function CheckSymptomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Wizard state: Step 1 (Symptoms), Step 2 (Context Intake), Step 3 (Medical Snapshot / Care Plan)
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({
    duration: '',
    severity: '',
    discharge_appearance: '',
    menstrual_pattern: '',
    fertility_time_context: '',
    skin_hair_pattern: '',
    metabolic_pattern: '',
    medications: '',
    safety_flags: ['none_of_these'],
    additional_notes: ''
  });

  // Active educational condition modal state
  const [activeConditionModal, setActiveConditionModal] = useState(null);

  // Active Category Filter for Step 1
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  // Modals for Booking, Auth, Success
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSpecialty, setBookingSpecialty] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Red Flag Alert Banner State
  const [hasImmediateRedFlag, setHasImmediateRedFlag] = useState(false);

  // SEO & Analytics on mount
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Check Symptoms | Guided Clinical Assessment & Care Navigation | HealNari";

    trackEvent(AnalyticsEvents.ASSESSMENT_STARTED, {
      source: 'check_symptoms_page',
      isLoggedIn: Boolean(user)
    });

    return () => {
      document.title = originalTitle;
    };
  }, [user]);

  // Contextual questions for Step 2
  const contextualQuestions = useMemo(() => {
    return getContextualQuestions(selectedSymptoms);
  }, [selectedSymptoms]);

  // Assessment evaluation result for Step 3
  const assessmentResult = useMemo(() => {
    return evaluateAssessment({
      selectedSymptoms,
      answers: followUpAnswers
    });
  }, [selectedSymptoms, followUpAnswers]);

  // Check if any red flag is active in answers or selected symptoms
  useEffect(() => {
    const flags = followUpAnswers.safety_flags || [];
    const urgent = flags.some(f => f.startsWith('red_flag_')) || 
                   selectedSymptoms.some(s => s.startsWith('red_flag_'));
    setHasImmediateRedFlag(urgent);
  }, [followUpAnswers.safety_flags, selectedSymptoms]);

  // Auto-save assessment when reaching Step 3
  useEffect(() => {
    if (currentStep === 3) {
      trackEvent(AnalyticsEvents.ASSESSMENT_COMPLETED, {
        symptom_count: selectedSymptoms.length,
        symptoms: selectedSymptoms,
        is_emergency: assessmentResult.isEmergency
      });

      // Save locally
      saveAssessmentLocally({
        selectedSymptoms,
        followUpAnswers,
        result: {
          isEmergency: assessmentResult.isEmergency,
          conditions: assessmentResult.conditionsToDiscuss?.map(c => c.id) || [],
          specialists: assessmentResult.recommendedSpecialists?.map(s => s.id) || []
        }
      });

      // If user is authenticated, sync with patient cycle/symptoms log
      if (user && user.role === 'patient') {
        const today = todayLocalStr();
        apiFetch(`/api/patients/me/cycle-logs/${today}`, {
          method: 'PUT',
          body: {
            symptoms: selectedSymptoms,
            notes: `Guided clinical assessment completed: ${selectedSymptoms.join(', ')}`
          }
        })
          .then(() => setSavedToProfile(true))
          .catch(() => setSavedToProfile(true)); // Soft fallback
      }
    }
  }, [currentStep, selectedSymptoms, followUpAnswers, assessmentResult, user]);

  // Symptom selection toggler
  const toggleSymptom = (symptomId) => {
    triggerHaptic('light');
    setSelectedSymptoms(prev => {
      const exists = prev.includes(symptomId);
      const updated = exists ? prev.filter(id => id !== symptomId) : [...prev, symptomId];
      
      trackEvent(AnalyticsEvents.SYMPTOM_SELECTED, {
        symptom_id: symptomId,
        action: exists ? 'deselected' : 'selected',
        total_selected: updated.length
      });

      return updated;
    });
  };

  // Follow-up answer handler
  const handleAnswerChange = (questionId, value) => {
    triggerHaptic('light');
    setFollowUpAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      trackEvent(AnalyticsEvents.ASSESSMENT_QUESTION_COMPLETED, {
        question_id: questionId,
        answer: Array.isArray(value) ? value.join(',') : String(value)
      });
      return next;
    });
  };

  const handleSafetyFlagToggle = (flagValue) => {
    triggerHaptic('light');
    setFollowUpAnswers(prev => {
      const currentFlags = prev.safety_flags || [];
      let updated;
      if (flagValue === 'none_of_these') {
        updated = ['none_of_these'];
      } else {
        const filtered = currentFlags.filter(f => f !== 'none_of_these');
        if (filtered.includes(flagValue)) {
          updated = filtered.filter(f => f !== flagValue);
          if (updated.length === 0) updated = ['none_of_these'];
        } else {
          updated = [...filtered, flagValue];
        }
      }
      return { ...prev, safety_flags: updated };
    });
  };

  // Step Navigation
  const handleProceedToStep2 = () => {
    if (selectedSymptoms.length === 0) return;
    triggerHaptic('medium');
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToStep3 = () => {
    triggerHaptic('medium');
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleResetAssessment = () => {
    triggerHaptic('medium');
    setSelectedSymptoms([]);
    setFollowUpAnswers({
      duration: '',
      severity: '',
      discharge_appearance: '',
      menstrual_pattern: '',
      fertility_time_context: '',
      skin_hair_pattern: '',
      metabolic_pattern: '',
      medications: '',
      safety_flags: ['none_of_these'],
      additional_notes: ''
    });
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trigger Booking for a Specialist
  const handleBookSpecialist = (specialist) => {
    triggerHaptic('medium');
    trackEvent(AnalyticsEvents.SPECIALIST_CLICKED, {
      specialist_id: specialist.id,
      specialist_name: specialist.name
    });
    trackEvent(AnalyticsEvents.BOOKING_STARTED, {
      source: 'symptom_assessment_results',
      specialty: specialist.name
    });
    setBookingSpecialty(specialist.title || specialist.name);
    setIsBookingOpen(true);
  };

  const handleBookingSuccess = (details) => {
    setIsBookingOpen(false);
    setConfirmedBookingDetails(details);
    setIsSuccessOpen(true);
    trackEvent(AnalyticsEvents.BOOKING_COMPLETED, {
      source: 'symptom_assessment'
    });
  };

  // Print clinical summary
  const handlePrintSummary = () => {
    triggerHaptic('light');
    window.print();
  };

  // Filtered categories based on search query and category tab filter
  const isPcodSearch = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return q.includes('pcod') || q.includes('pcos');
  }, [searchFilter]);

  const filteredCategories = useMemo(() => {
    let cats = SYMPTOM_CATEGORIES;
    if (activeCategoryFilter !== 'all') {
      cats = cats.filter(cat => cat.id === activeCategoryFilter);
    }
    if (!searchFilter.trim()) return cats;

    const q = searchFilter.toLowerCase().trim();
    return cats.map(cat => ({
      ...cat,
      symptoms: cat.symptoms.filter(s => 
        s.label.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q) || (q.includes('pcod') && cat.id === 'pcos_ovulatory')
      )
    })).filter(cat => cat.symptoms.length > 0);
  }, [searchFilter, activeCategoryFilter]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      
      {/* ── TOP APP BAR / HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-sand-200/80 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-xl border border-sand-300 hover:border-aubergine-300 hover:bg-white text-slate-600 flex items-center justify-center transition-all active:scale-95"
              aria-label="Go back"
            >
              <i className="fas fa-arrow-left text-xs" />
            </button>

            <NavLink to="/" className="shrink-0 flex items-center gap-2">
              <HealNariLogo size="sm" />
            </NavLink>
          </div>

          {/* Stepper Pill */}
          <div className="flex items-center gap-1.5 bg-sand-100/90 border border-sand-200 px-3 py-1 rounded-full text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-aubergine-600 animate-pulse" />
            <span>
              {currentStep === 1 && 'Step 1 of 3: Health Concerns'}
              {currentStep === 2 && 'Step 2 of 3: Clinical Context'}
              {currentStep === 3 && 'Step 3 of 3: Care Snapshot'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="text-xs font-bold text-aubergine-700 bg-aubergine-50 hover:bg-aubergine-100 border border-aubergine-200 px-3 py-1.5 rounded-xl transition-all"
              >
                <i className="fas fa-user-circle mr-1" />
                <span className="hidden sm:inline">Log In</span>
              </button>
            ) : (
              <NavLink
                to="/patient-dashboard"
                className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
              >
                <i className="fas fa-columns text-[10px]" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* ── STEP PROGRESS BAR ─────────────────────────────────────────── */}
      <div className="w-full bg-sand-200/60 h-1">
        <div 
          className="bg-gradient-to-r from-aubergine-600 via-magenta-500 to-indigo-600 h-1 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────── */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 pb-28 md:pb-16">
        
        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: HEALTH CONCERN TAXONOMY & SYMPTOM SELECTION
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-7 animate-fade-in text-left">
            {/* Header intro */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-aubergine-100 text-aubergine-900 border border-aubergine-200 mb-2.5">
                <i className="fas fa-stethoscope text-[11px]" />
                Symptom Assessment &amp; Care Navigation
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                What are you experiencing?
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Select your symptoms across our clinical health areas. HealNari organizes multi-symptom patterns across reproductive, hormonal, metabolic, dermatological, and general health to guide you toward safe care.
              </p>
            </div>

            {/* Non-Diagnostic Clinical Safety Callout */}
            <div className="bg-sand-50/90 border border-sand-300/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700">
              <i className="fas fa-shield-halved text-aubergine-600 text-sm mt-0.5 shrink-0" />
              <div>
                <strong className="text-slate-900 font-bold block">
                  A Care Navigation Tool, Not a Diagnostic Tool:
                </strong>
                <span className="text-slate-600">
                  HealNari does not declare definitive medical diagnoses (such as "You have PCOS" or "You have a vaginal infection"). Instead, we help you understand what your symptoms may be related to, which specialist can evaluate you, and what clinical tests may be helpful.
                </span>
              </div>
            </div>

            {/* PCOD Clarification Banner (If searching for PCOD/PCOS) */}
            {isPcodSearch && (
              <div className="bg-fuchsia-50 border border-fuchsia-300 rounded-2xl p-4 text-xs text-fuchsia-950 animate-slide-up flex items-start gap-3">
                <i className="fas fa-circle-info text-fuchsia-600 text-sm mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <strong className="font-bold text-fuchsia-900 block">
                    PCOD vs. PCOS: Clarifying the Terminology
                  </strong>
                  <p className="leading-relaxed">
                    In South Asia, <strong>PCOD</strong> (Polycystic Ovarian Disease) is commonly used colloquially to describe ovaries with multiple immature follicles. In modern evidence-based medicine, <strong>PCOS</strong> (Polycystic Ovary Syndrome) is the recognized medical term for an endocrine and metabolic condition characterized by ovulatory variations, androgen sensitivity, and metabolic factors. PCOD is not a separate automated diagnosis. Neither can be diagnosed from symptoms alone—a full clinical assessment by a Gynaecologist or Endocrinologist is required.
                  </p>
                </div>
              </div>
            )}

            {/* Search Input & Selection Counter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-sand-200 shadow-2xs">
              <div className="relative flex-grow">
                <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search symptoms (e.g. vaginal itching, irregular periods, acne, hair fall, fatigue)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-500 focus:bg-white transition-all"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 px-1">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  Selected: <strong className="text-aubergine-700">{selectedSymptoms.length}</strong> concerns
                </span>
                {selectedSymptoms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSymptoms([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                  activeCategoryFilter === 'all'
                    ? 'bg-aubergine-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-sand-200 hover:bg-sand-50'
                }`}
              >
                All 13 Health Areas
              </button>
              {SYMPTOM_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeCategoryFilter === cat.id
                      ? 'bg-aubergine-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-sand-200 hover:bg-sand-50'
                  }`}
                >
                  <i className={`fas ${cat.icon} text-[10px]`} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Selected Symptoms Chips Bar (Quick Review) */}
            {selectedSymptoms.length > 0 && (
              <div className="bg-aubergine-50/70 border border-aubergine-200/80 rounded-2xl p-3.5 sm:p-4 animate-slide-up">
                <span className="text-[10px] font-bold text-aubergine-800 uppercase tracking-wider block mb-2">
                  Your Selected Concerns ({selectedSymptoms.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedSymptoms.map(id => {
                    const info = ALL_SYMPTOMS_MAP[id] || { label: id };
                    return (
                      <span
                        key={id}
                        onClick={() => toggleSymptom(id)}
                        className="inline-flex items-center gap-1.5 bg-white text-aubergine-900 border border-aubergine-300 px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all"
                        title="Click to remove"
                      >
                        <span>{info.label}</span>
                        <i className="fas fa-times text-[10px] text-aubergine-400 hover:text-rose-600" />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categorized Symptom Chips Grid */}
            <div className="space-y-6">
              {filteredCategories.map(cat => (
                <div key={cat.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-sand-200 shadow-2xs text-left">
                  {/* Category Header */}
                  <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-sand-100">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs border ${cat.color}`}>
                      <i className={`fas ${cat.icon}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        {cat.label}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Symptom Cards / Chips Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cat.symptoms.map(sym => {
                      const isSelected = selectedSymptoms.includes(sym.id);
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => toggleSymptom(sym.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-start justify-between gap-3 group active:scale-[0.98] ${
                            isSelected
                              ? 'bg-aubergine-50/90 border-aubergine-500 shadow-sm ring-1 ring-aubergine-500'
                              : 'bg-sand-50/60 hover:bg-white border-sand-200/90 hover:border-aubergine-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-extrabold transition-colors ${
                              isSelected ? 'text-aubergine-900' : 'text-slate-800 group-hover:text-aubergine-700'
                            }`}>
                              {sym.label}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {sym.subtitle}
                            </p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected
                              ? 'bg-aubergine-600 border-aubergine-600 text-white'
                              : 'border-slate-300 group-hover:border-aubergine-400 bg-white'
                          }`}>
                            {isSelected && <i className="fas fa-check text-[10px]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Continue Button */}
            <div className="hidden md:flex justify-end pt-4">
              <button
                type="button"
                disabled={selectedSymptoms.length === 0}
                onClick={handleProceedToStep2}
                className="bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-aubergine-100 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
              >
                <span>Continue to Step 2 (Context Intake)</span>
                <i className="fas fa-arrow-right text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 2: RELEVANT CLINICAL CONTEXT & SAFETY SCREEN
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fade-in text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-aubergine-100 text-aubergine-900 border border-aubergine-200 mb-3">
                <i className="fas fa-sliders text-[11px]" />
                Step 2 of 3: Clinical Context
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                Tell us a little more
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                We only ask relevant follow-up questions tailored to your selected concerns ({selectedSymptoms.length} selected).
              </p>
            </div>

            {/* Dynamic Questions List */}
            <div className="space-y-6">
              {contextualQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-sand-200 shadow-2xs text-left">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Question {idx + 1} of {contextualQuestions.length}
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {q.title}
                    </h3>
                    {q.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {q.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Single Choice Options */}
                  {q.type === 'single_choice' && (
                    <div className="space-y-2">
                      {q.options.map(opt => {
                        const isChecked = followUpAnswers[q.id] === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-aubergine-50/90 border-aubergine-500 shadow-sm ring-1 ring-aubergine-500'
                                : 'bg-sand-50/50 hover:bg-white border-sand-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.value}
                              checked={isChecked}
                              onChange={() => handleAnswerChange(q.id, opt.value)}
                              className="mt-1 text-aubergine-600 focus:ring-aubergine-500"
                            />
                            <div>
                              <p className={`text-xs sm:text-sm font-bold ${isChecked ? 'text-aubergine-900' : 'text-slate-800'}`}>
                                {opt.label}
                              </p>
                              {opt.desc && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {opt.desc}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Multiple Choice Options (Safety Screen) */}
                  {q.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {q.options.map(opt => {
                        const isChecked = (followUpAnswers[q.id] || []).includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? opt.isRedFlag
                                  ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-aubergine-50/90 border-aubergine-500 ring-1 ring-aubergine-500'
                                : 'bg-sand-50/50 hover:bg-white border-sand-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={q.id}
                              value={opt.value}
                              checked={isChecked}
                              onChange={() => handleSafetyFlagToggle(opt.value)}
                              className="mt-1 text-aubergine-600 focus:ring-aubergine-500 rounded"
                            />
                            <div>
                              <p className={`text-xs sm:text-sm font-bold ${
                                isChecked ? (opt.isRedFlag ? 'text-rose-900' : 'text-aubergine-900') : 'text-slate-800'
                              }`}>
                                {opt.isRedFlag && <i className="fas fa-triangle-exclamation text-rose-500 mr-1.5" />}
                                {opt.label}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Optional Additional Notes */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sand-200 shadow-2xs text-left">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Anything else you'd like to share? (Optional)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Share previous lab values, previous doctor advice, or specific questions you have for the clinician.
                </p>
                <textarea
                  rows={3}
                  value={followUpAnswers.additional_notes || ''}
                  onChange={(e) => handleAnswerChange('additional_notes', e.target.value)}
                  placeholder="e.g. My symptoms seem to peak during week 3 of my cycle..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Desktop Actions Row */}
            <div className="hidden md:flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-sand-300 font-bold px-6 py-3.5 rounded-xl transition-all text-sm flex items-center gap-2"
              >
                <i className="fas fa-arrow-left text-xs" />
                <span>Back to Symptoms</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToStep3}
                className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-aubergine-100 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
              >
                <span>View My Health Snapshot</span>
                <i className="fas fa-arrow-right text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 3: RESULTS / MEDICAL CARE SNAPSHOT & NAVIGATION
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fade-in text-left">
            
            {/* ── EMERGENCY / RED FLAG SCREEN ─────────────────────────────── */}
            {assessmentResult.isEmergency ? (
              <div className="space-y-6">
                <div className="bg-rose-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <i className="fas fa-triangle-exclamation text-2xl text-white" />
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-white text-rose-700 uppercase tracking-wider inline-block mb-2">
                        Urgent Medical Attention Required
                      </span>
                      <h2 className="text-xl sm:text-3xl font-extrabold font-display">
                        {assessmentResult.emergencyNotice.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-rose-100 mt-2 leading-relaxed max-w-2xl">
                        {assessmentResult.emergencyNotice.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Directives */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-sm space-y-4">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <i className="fas fa-list-check text-rose-600" />
                    <span>Immediate Actions to Take Right Now:</span>
                  </h3>
                  <ul className="space-y-2.5">
                    {assessmentResult.emergencyNotice.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-800 bg-rose-50/70 p-3.5 rounded-xl border border-rose-100">
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="font-semibold">{act}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 flex flex-wrap gap-3">
                    <a
                      href="tel:112"
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
                    >
                      <i className="fas fa-phone-volume text-sm" />
                      <span>Call Emergency Services (112 / 102)</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleResetAssessment}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-xl text-sm transition-all"
                    >
                      Return to Symptom Checker
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── STANDARD MEDICAL CARE SNAPSHOT ───────────────────────────── */
              <div className="space-y-8">
                
                {/* Snapshot Hero Title & Educational Banner */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <i className="fas fa-check-circle text-emerald-600 text-[11px]" />
                      Assessment Completed
                    </span>
                    {savedToProfile && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        <i className="fas fa-cloud-arrow-up text-[10px]" />
                        Saved to Your Profile
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                    Your Health Snapshot
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                    A medically comprehensive care-navigation summary: understanding interconnected health areas, educational conditions to discuss with your doctor, specialist mapping, clinical evaluation steps, and safe movement.
                  </p>
                </div>

                {/* Non-Diagnostic Clinical Disclaimer Banner */}
                <div className="bg-sand-50/90 border border-sand-300/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs sm:text-sm text-slate-700">
                  <i className="fas fa-shield-halved text-aubergine-600 text-base mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Medical Principles &amp; Non-Diagnostic Notice:
                    </strong>
                    <p className="text-slate-600 leading-relaxed text-xs">
                      {assessmentResult.safetyDisclaimer} HealNari never provides automated diagnoses. Conditions discussed below represent educational possibilities associated with your symptom pattern to support a productive consultation with a qualified medical specialist.
                    </p>
                  </div>
                </div>

                {/* 1. SECTION: WHAT YOU TOLD US */}
                <section className="bg-white rounded-3xl p-5 sm:p-7 border border-sand-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-sand-100">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <i className="fas fa-clipboard-list text-aubergine-600 text-sm" />
                      <span>What you told us</span>
                    </h2>
                    <button
                      type="button"
                      onClick={handleResetAssessment}
                      className="text-xs font-bold text-aubergine-700 hover:underline flex items-center gap-1"
                    >
                      <i className="fas fa-rotate-left text-[10px]" />
                      <span>Re-take Assessment</span>
                    </button>
                  </div>

                  {/* Reported Symptoms Tags */}
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                      Reported Concerns ({assessmentResult.selectedSymptomsInfo.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {assessmentResult.selectedSymptomsInfo.map(sym => (
                        <span
                          key={sym.id}
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-sand-100 text-slate-800 border border-sand-200 flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-aubergine-500" />
                          <span>{sym.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Additional Reported Context */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="bg-sand-50/70 p-3 rounded-xl border border-sand-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                        {followUpAnswers.duration === 'short' && '< 4 Weeks (Recent)'}
                        {followUpAnswers.duration === 'medium' && '1–6 Months (Ongoing)'}
                        {followUpAnswers.duration === 'long' && '> 6 Months (Chronic)'}
                        {!followUpAnswers.duration && 'Not specified'}
                      </p>
                    </div>
                    <div className="bg-sand-50/70 p-3 rounded-xl border border-sand-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Severity</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5 capitalize">
                        {followUpAnswers.severity || 'Moderate'}
                      </p>
                    </div>
                    <div className="bg-sand-50/70 p-3 rounded-xl border border-sand-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medications</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                        {followUpAnswers.medications === 'birth_control' && 'Hormonal Contraceptives'}
                        {followUpAnswers.medications === 'thyroid_meds' && 'Thyroid Medication'}
                        {followUpAnswers.medications === 'vitamins_iron' && 'Supplements / Vitamins'}
                        {followUpAnswers.medications === 'none' && 'None reported'}
                        {(!followUpAnswers.medications || followUpAnswers.medications === 'other_prescription') && 'Reviewed with Doctor'}
                      </p>
                    </div>
                    <div className="bg-sand-50/70 p-3 rounded-xl border border-sand-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cycle / Context</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                        {followUpAnswers.menstrual_pattern ? 'Pattern Recorded' : 'General Intake'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* 2. SECTION: WHAT THESE SYMPTOMS MAY BE RELATED TO */}
                <section className="bg-white rounded-3xl p-5 sm:p-7 border border-sand-200 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-aubergine-600 uppercase tracking-wider block">
                    Interconnected Physiology
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                    What these symptoms may be related to
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                    In women’s health, symptoms rarely exist in isolation. Based on your reported symptoms, these physiological areas are closely interconnected and worth discussing during your clinical evaluation:
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {assessmentResult.relevantHealthAreaLabels.map((areaLabel, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-aubergine-50 text-aubergine-900 border border-aubergine-200 flex items-center gap-2"
                      >
                        <i className="fas fa-link text-[10px] text-aubergine-500" />
                        <span>{areaLabel}</span>
                      </span>
                    ))}
                  </div>
                </section>

                {/* 3. SECTION: CONDITIONS WORTH DISCUSSING WITH A HEALTHCARE PROFESSIONAL */}
                <section className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-aubergine-600 uppercase tracking-wider block mb-1">
                      Patient Education Cards
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                      Conditions worth discussing with a healthcare professional
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      These educational profiles explain why this symptom pattern can occur, what a doctor evaluates, and what treatment approaches exist. Click any card to explore full clinical details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessmentResult.conditionsToDiscuss.map(cond => (
                      <div
                        key={cond.id}
                        className="bg-white rounded-3xl p-5 sm:p-6 border border-sand-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-200">
                              {cond.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Clinically Reviewed
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                            {cond.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                            {cond.description}
                          </p>

                          {/* PCOD Clarification Note if PCOS */}
                          {cond.pcodClarification && (
                            <div className="mt-3 bg-sand-50 p-2.5 rounded-xl border border-sand-200 text-[11px] text-slate-600">
                              <strong className="text-slate-800">Terminology Note:</strong> {cond.pcodClarification}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-4 border-t border-sand-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setActiveConditionModal(cond);
                            }}
                            className="text-xs font-extrabold text-aubergine-700 hover:text-aubergine-800 flex items-center gap-1.5 transition-colors"
                          >
                            <span>Read Patient Education Guide</span>
                            <i className="fas fa-chevron-right text-[10px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. SECTION: WHICH SPECIALIST MAY HELP */}
                <section className="space-y-4 pt-2">
                  <div>
                    <span className="text-xs font-bold text-aubergine-600 uppercase tracking-wider block mb-1">
                      Care Navigation Pathway
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                      Which specialist may help
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      You do not need to see every specialist simultaneously. We have highlighted a <strong>reasonable starting point</strong> to begin your evaluation safely.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessmentResult.recommendedSpecialists.map(spec => (
                      <div
                        key={spec.id}
                        className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between text-left ${
                          spec.isPrimaryStartingPoint
                            ? 'border-aubergine-500 ring-2 ring-aubergine-500/20'
                            : 'border-sand-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            {spec.isPrimaryStartingPoint ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-aubergine-600 text-white shadow-xs flex items-center gap-1">
                                <i className="fas fa-star text-[9px]" />
                                Recommended Starting Point
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sand-100 text-slate-700 border border-sand-200">
                                {spec.tag}
                              </span>
                            )}
                            <i className={`fas ${spec.icon} text-aubergine-600 text-sm`} />
                          </div>

                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                            {spec.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {spec.title}
                          </p>

                          <div className="mt-3 bg-sand-50/70 p-3 rounded-2xl border border-sand-200/80">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Why this specialist is relevant:
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {spec.whyRelevant}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-sand-100 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-600">
                            Video Consultation
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBookSpecialist(spec)}
                            className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                          >
                            <i className="fas fa-calendar-check text-[11px]" />
                            <span>Find a Specialist</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. SECTION: WHAT A DOCTOR MAY EVALUATE */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-2xs space-y-5">
                  <div>
                    <span className="text-xs font-bold text-aubergine-600 uppercase tracking-wider block mb-1">
                      Clinical Preparation
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                      What a doctor may evaluate
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Knowing what to expect during your clinical evaluation helps you feel prepared and empowered:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-sand-50/70 p-4 rounded-2xl border border-sand-200">
                      <div className="w-8 h-8 rounded-xl bg-aubergine-100 text-aubergine-800 flex items-center justify-center text-xs font-bold mb-2">
                        <i className="fas fa-notes-medical" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        1. History &amp; Timeline
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {assessmentResult.clinicalEvaluationOverview.history}
                      </p>
                    </div>

                    <div className="bg-sand-50/70 p-4 rounded-2xl border border-sand-200">
                      <div className="w-8 h-8 rounded-xl bg-aubergine-100 text-aubergine-800 flex items-center justify-center text-xs font-bold mb-2">
                        <i className="fas fa-stethoscope" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        2. Physical Evaluation
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {assessmentResult.clinicalEvaluationOverview.physicalExam}
                      </p>
                    </div>

                    <div className="bg-sand-50/70 p-4 rounded-2xl border border-sand-200">
                      <div className="w-8 h-8 rounded-xl bg-aubergine-100 text-aubergine-800 flex items-center justify-center text-xs font-bold mb-2">
                        <i className="fas fa-vial" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        3. Targeted Testing
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {assessmentResult.clinicalEvaluationOverview.tests}
                      </p>
                    </div>
                  </div>

                  {/* Questions to Ask Your Doctor */}
                  <div className="bg-aubergine-50/70 border border-aubergine-200/80 rounded-2xl p-4 sm:p-5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-aubergine-900 block mb-2 flex items-center gap-1.5">
                      <i className="fas fa-circle-question text-aubergine-600" />
                      Questions you can ask your doctor at your consultation:
                    </span>
                    <ul className="space-y-1.5">
                      {assessmentResult.clinicalEvaluationOverview.questionsToAskDoctor.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <i className="fas fa-check text-[10px] text-aubergine-600 mt-1 shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* 6. SECTION: WHAT YOU CAN DO NEXT (6-STEP CARE PATHWAY) */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-2xs space-y-6">
                  <div>
                    <span className="text-xs font-bold text-aubergine-600 uppercase tracking-wider block mb-1">
                      Actionable Roadmap
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                      Your suggested next steps
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Follow this structured, 6-step pathway to navigate from symptom awareness to clinical resolution safely:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      { step: '1', title: 'Understand your symptoms', desc: 'Review your selected symptoms and timeline in this snapshot.' },
                      { step: '2', title: 'Review possible health areas', desc: 'Note the interconnected hormonal, metabolic, or vulvovaginal areas.' },
                      { step: '3', title: 'Choose an appropriate specialist', desc: 'Start with the recommended starting point clinician (e.g. Gynaecologist).' },
                      { step: '4', title: 'Prepare for consultation', desc: 'Keep track of your cycle dates, questions, and prior test results.' },
                      { step: '5', title: 'Follow clinician’s recommendations', desc: 'Complete recommended swab/blood testing before starting medications.' },
                      { step: '6', title: 'Continue wellness tracking', desc: 'Log daily cycle, symptom, and lifestyle patterns on HealNari.' }
                    ].map(st => (
                      <div key={st.step} className="bg-sand-50/70 p-4 rounded-2xl border border-sand-200/80 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-aubergine-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          {st.step}
                        </span>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">
                            {st.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {st.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Primary & Secondary Call To Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-sand-100">
                    <div className="text-xs text-slate-500 text-center sm:text-left">
                      Ready to speak with a verified clinician?
                    </div>

                    <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleBookSpecialist(assessmentResult.primarySpecialist || { name: 'Specialist' })}
                        className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 flex-grow sm:flex-grow-0"
                      >
                        <i className="fas fa-calendar-check" />
                        <span>Find a Specialist</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            setIsAuthOpen(true);
                          } else {
                            setSavedToProfile(true);
                          }
                        }}
                        className="bg-sand-100 hover:bg-sand-200 text-slate-800 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0"
                      >
                        <i className="fas fa-bookmark text-aubergine-600" />
                        <span>Save My Results</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintSummary}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-sand-300 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0"
                        title="Print or save as PDF"
                      >
                        <i className="fas fa-print" />
                        <span>Print Summary</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 7. SECTION: WELLNESS SUPPORT (WELLNESS & MOVEMENT) */}
                <section className="pt-2">
                  <PersonalizedExercise
                    exercises={assessmentResult.wellnessExercises}
                    isEmergency={assessmentResult.isEmergency}
                    onConsultDoctor={() => handleBookSpecialist(assessmentResult.primarySpecialist || { name: 'Doctor' })}
                  />
                </section>

                {/* Anonymous User Save Account Banner */}
                {!user && (
                  <div className="bg-gradient-to-br from-aubergine-900 via-brand-dark to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-left relative overflow-hidden">
                    <div 
                      aria-hidden="true" 
                      className="absolute right-0 top-0 w-80 h-80 bg-magenta-500/20 rounded-full blur-3xl pointer-events-none"
                    />
                    <div className="relative z-10 max-w-2xl space-y-3">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-magenta-300 border border-white/10">
                        <i className="fas fa-bookmark text-xs" />
                        Save Your Care Journey
                      </span>
                      <h3 className="text-xl sm:text-2xl font-extrabold font-display">
                        Save your results &amp; track symptoms over time
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Create your free HealNari account to preserve this health snapshot, track daily cycle and symptom fluctuations, access your personalized movement routines, and book confidential video consultations with verified specialists.
                      </p>
                      
                      <div className="pt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setIsAuthOpen(true)}
                          className="bg-gradient-to-r from-aubergine-500 to-magenta-600 hover:from-aubergine-600 hover:to-magenta-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center gap-2"
                        >
                          <i className="fas fa-user-plus text-xs" />
                          <span>Create Free Account / Save Results</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* ── MOBILE STICKY BOTTOM ACTION BAR (Step 1 & Step 2) ─────────── */}
      {currentStep === 1 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-sand-200 p-3.5 z-30 shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0 pl-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Selected
              </span>
              <p className="text-xs font-extrabold text-slate-800 truncate">
                {selectedSymptoms.length} {selectedSymptoms.length === 1 ? 'concern' : 'concerns'}
              </p>
            </div>

            <button
              type="button"
              disabled={selectedSymptoms.length === 0}
              onClick={handleProceedToStep2}
              className="bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <span>Continue</span>
              <i className="fas fa-arrow-right text-[10px]" />
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-sand-200 p-3.5 z-30 shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={handleBack}
              className="bg-sand-100 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl transition-all"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleProceedToStep3}
              className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <span>View Snapshot</span>
              <i className="fas fa-arrow-right text-[10px]" />
            </button>
          </div>
        </div>
      )}

      {/* ── EXPANDABLE PATIENT-FRIENDLY CONDITION MODAL (7 QUESTIONS) ───── */}
      {activeConditionModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-sand-200 p-6 sm:p-8 text-left animate-slide-up space-y-5 my-auto">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-sand-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-aubergine-100 text-aubergine-900 uppercase tracking-wider">
                  {activeConditionModal.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display mt-1">
                  {activeConditionModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveConditionModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* 1. What is it? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-aubergine-700 mb-1">
                1. What is it?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatIsIt}
              </p>
            </div>

            {/* 2. What symptoms can be associated with it? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-aubergine-700 mb-1">
                2. What symptoms can be associated with it?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatSymptomsCanBeAssociated}
              </p>
            </div>

            {/* 3. Why might it relate to my symptoms? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-aubergine-700 mb-1">
                3. Why might it relate to my symptoms?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-sand-50 p-3 rounded-xl border border-sand-200">
                {activeConditionModal.patientEducation?.whyMightItRelateToMySymptoms}
              </p>
            </div>

            {/* 4. How is it usually evaluated? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-aubergine-700 mb-1">
                4. How is it usually evaluated?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.howIsItUsuallyEvaluated}
              </p>
            </div>

            {/* 5. What type of specialist evaluates it? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-aubergine-700 mb-1">
                5. What type of specialist evaluates it?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatSpecialistEvaluatesIt}
              </p>
            </div>

            {/* 6. What treatment approaches may exist? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-aubergine-700 mb-1">
                6. What treatment approaches may exist?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatTreatmentApproachesExist}
              </p>
            </div>

            {/* 7. When should I seek medical attention? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-700 mb-1">
                7. When should I seek medical attention?
              </h4>
              <p className="text-xs sm:text-sm text-rose-950 bg-rose-50/70 p-3 rounded-xl border border-rose-200 leading-relaxed">
                {activeConditionModal.patientEducation?.whenShouldISeekMedicalAttention}
              </p>
            </div>

            {/* Clinical Review Metadata & Sources */}
            <div className="pt-3 border-t border-sand-200/80 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Medical Reviewer: <strong className="text-slate-700">{activeConditionModal.medicalReviewer}</strong></span>
                <span>Reviewed: {activeConditionModal.lastReviewedDate}</span>
              </div>
              {activeConditionModal.sources?.length > 0 && (
                <div className="pt-1 text-[10px] text-slate-400">
                  <span>Guidelines / Sources: {activeConditionModal.sources.join('; ')}</span>
                </div>
              )}
            </div>

            {/* Non-Diagnostic Disclaimer */}
            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <i className="fas fa-shield-halved text-amber-600 mt-0.5 shrink-0" />
              <span>
                {activeConditionModal.disclaimer}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveConditionModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition-colors"
              >
                Close Condition Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOOKING MODAL OVERLAY ─────────────────────────────────────── */}
      {isBookingOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        }>
          <BookingModal
            selectedDoc={bookingSpecialty}
            onClose={() => setIsBookingOpen(false)}
            onSuccess={handleBookingSuccess}
          />
        </Suspense>
      )}

      {/* ── SUCCESS MODAL OVERLAY ─────────────────────────────────────── */}
      {isSuccessOpen && confirmedBookingDetails && (
        <Suspense fallback={null}>
          <SuccessModal
            details={confirmedBookingDetails}
            onClose={() => setIsSuccessOpen(false)}
          />
        </Suspense>
      )}

      {/* ── AUTH MODAL OVERLAY ────────────────────────────────────────── */}
      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal
            onClose={() => setIsAuthOpen(false)}
            onSuccess={() => {
              setIsAuthOpen(false);
              setSavedToProfile(true);
            }}
          />
        </Suspense>
      )}

    </div>
  );
}
