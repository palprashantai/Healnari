import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
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

// Lazy load modals for maximum initial load performance
const BookingModal = lazy(() => import('../../tools/BookingModal.jsx'));
const AuthModal = lazy(() => import('../../tools/AuthModal.jsx'));
const SuccessModal = lazy(() => import('../../tools/SuccessModal.jsx'));

// Fast high-frequency quick-select suggestion pills
const POPULAR_CONCERNS = [
  { label: 'Irregular periods', id: 'irregular_periods', icon: 'fa-calendar-xmark' },
  { label: 'Vaginal itching', id: 'vaginal_itching', icon: 'fa-hand-dots' },
  { label: 'Severe cramps', id: 'painful_periods', icon: 'fa-droplet' },
  { label: 'Acne breakouts', id: 'acne', icon: 'fa-spa' },
  { label: 'Hair fall & thinning', id: 'scalp_hair_thinning', icon: 'fa-wind' },
  { label: 'Fatigue & exhaustion', id: 'fatigue', icon: 'fa-battery-quarter' },
  { label: 'Pelvic pain', id: 'pelvic_pain', icon: 'fa-shield-heart' },
  { label: 'Difficulty conceiving', id: 'difficulty_conceiving', icon: 'fa-seedling' }
];

export default function CheckSymptomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

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

  // UI Micro-interaction states
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [checkedDoctorQuestions, setCheckedDoctorQuestions] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);

  // Category Dropdown State (Practo App style)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Red Flag Alert Banner State
  const [hasImmediateRedFlag, setHasImmediateRedFlag] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

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

  // Draft auto-restore from sessionStorage
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem('healnari_symptom_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed?.selectedSymptoms?.length > 0) {
          setSelectedSymptoms(parsed.selectedSymptoms);
          if (parsed.followUpAnswers) {
            setFollowUpAnswers(prev => ({ ...prev, ...parsed.followUpAnswers }));
          }
          setDraftRestored(true);
          const t = setTimeout(() => setDraftRestored(false), 5000);
          return () => clearTimeout(t);
        }
      }
    } catch {
      // Ignore parse errors safely
    }
  }, []);

  // Draft auto-save to sessionStorage
  useEffect(() => {
    try {
      if (selectedSymptoms.length > 0) {
        sessionStorage.setItem('healnari_symptom_draft', JSON.stringify({
          selectedSymptoms,
          followUpAnswers
        }));
      }
    } catch {
      // Storage unavailable fallback
    }
  }, [selectedSymptoms, followUpAnswers]);

  // Keyboard accessibility: Escape key to close active condition modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeConditionModal) {
        setActiveConditionModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeConditionModal]);

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
    sessionStorage.removeItem('healnari_symptom_draft');
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

  // Copy clinical summary to clipboard
  const handleCopySummary = () => {
    triggerHaptic('light');
    const symptomsList = selectedSymptoms.map(id => ALL_SYMPTOMS_MAP[id]?.label || id).join(', ');
    const summaryText = `HealNari Clinical Care Navigation Summary
Date: ${new Date().toLocaleDateString()}
Reported Concerns (${selectedSymptoms.length}): ${symptomsList}
Reported Duration: ${followUpAnswers.duration || 'Not specified'}
Reported Severity: ${followUpAnswers.severity || 'Moderate'}
Recommended Primary Starting Specialist: ${assessmentResult.primarySpecialist?.name || 'Gynaecologist'}
Educational Conditions for Discussion: ${assessmentResult.conditionsToDiscuss?.map(c => c.name).join(', ') || 'General evaluation'}
Note: This is a non-diagnostic symptom assessment and care navigation summary prepared for medical consultation.`;

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 3000);
    });
  };

  const toggleDoctorQuestion = (idx) => {
    setCheckedDoctorQuestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Filtered categories based on search query and category tab filter
  const isPcodSearch = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return q.includes('pcod') || q.includes('pcos');
  }, [searchFilter]);

  const totalSymptomsCount = useMemo(() => {
    return SYMPTOM_CATEGORIES.reduce((acc, cat) => acc + cat.symptoms.length, 0);
  }, []);

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

  const totalMatchesCount = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.symptoms.length, 0);
  }, [filteredCategories]);

  // Active Category details for Practo dropdown selector
  const activeCategory = useMemo(() => {
    if (activeCategoryFilter === 'all') {
      return {
        id: 'all',
        label: 'All Health Areas',
        icon: 'fa-layer-group',
        color: 'text-purple-700 bg-purple-50/90 border-purple-200',
        description: 'Viewing all 95 clinical concerns across all 13 specialized departments',
        symptomsCount: totalSymptomsCount
      };
    }
    const cat = SYMPTOM_CATEGORIES.find(c => c.id === activeCategoryFilter);
    return cat ? {
      ...cat,
      symptomsCount: cat.symptoms.length
    } : {
      id: 'all',
      label: 'All Health Areas',
      icon: 'fa-layer-group',
      color: 'text-purple-700 bg-purple-50/90 border-purple-200',
      description: 'Viewing all clinical concerns',
      symptomsCount: totalSymptomsCount
    };
  }, [activeCategoryFilter, totalSymptomsCount]);

  return (
    <div className="min-h-screen bg-[#F8F6FF] text-slate-800 flex flex-col font-sans selection:bg-purple-100 selection:text-healnari-purple relative overflow-x-clip">
      
      {/* ── Ambient Background Lighting (Subtle Glows) ── */}
      <div 
        aria-hidden="true" 
        className="fixed top-0 right-1/4 w-[480px] h-[480px] bg-purple-200/25 rounded-full blur-3xl pointer-events-none -z-10" 
      />
      <div 
        aria-hidden="true" 
        className="fixed top-96 left-10 w-[400px] h-[400px] bg-pink-200/20 rounded-full blur-3xl pointer-events-none -z-10" 
      />

      {/* ── PRINT-SPECIFIC CSS ── */}
      <style>{`
        @media print {
          header, .no-print, button, .mobile-dock {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 2rem;
            border-bottom: 2px solid #6B46C1;
            padding-bottom: 1rem;
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
        @media screen {
          .print-header {
            display: none;
          }
        }
      `}</style>

      {/* ── TOP APP BAR / HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-purple-100/80 px-4 sm:px-6 py-3 transition-all shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left Brand & Back Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-600 hover:text-healnari-purple flex items-center justify-center transition-all active:scale-95"
              aria-label="Go back"
              title="Return to previous screen"
            >
              <i className="fas fa-arrow-left text-xs" />
            </button>

            <NavLink to="/" className="shrink-0 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-healnari-purple rounded-lg">
              <HealNariLogo size="sm" />
            </NavLink>
          </div>

          {/* Stepper Progress Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[
              { num: 1, label: 'Concerns', step: 1 },
              { num: 2, label: 'Context', step: 2 },
              { num: 3, label: 'Care Plan', step: 3 }
            ].map(st => {
              const isCurrent = currentStep === st.step;
              const isPast = currentStep > st.step;
              return (
                <div
                  key={st.step}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs ring-1 ring-purple-300/50'
                      : isPast
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100/70 text-slate-400 border border-transparent hidden sm:flex'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-healnari-purple text-white'
                      : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-600'
                  }`}>
                    {isPast ? '✓' : st.num}
                  </span>
                  <span className="hidden xs:inline">{st.label}</span>
                </div>
              );
            })}

            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-purple-50/80 px-2 py-0.5 rounded-full ml-1 border border-purple-100">
              <i className="far fa-clock text-healnari-purple text-[10px]" /> ~2 min
            </span>
          </div>

          {/* Right Action / Auth Button */}
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleResetAssessment}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2 py-1.5 rounded-lg transition-colors hidden sm:flex items-center gap-1"
                title="Restart assessment"
              >
                <i className="fas fa-rotate-left text-[11px]" />
                <span className="text-[11px]">Restart</span>
              </button>
            )}

            {!user ? (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="text-xs font-bold text-healnari-purple bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs"
              >
                <i className="fas fa-user-circle mr-1" />
                <span className="hidden sm:inline">Log In</span>
              </button>
            ) : (
              <NavLink
                to="/patient-dashboard"
                className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
              >
                <i className="fas fa-columns text-[10px]" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* ── STEP PROGRESS BAR (Multi-Stop Gradient) ─────────────────────── */}
      <div className="w-full bg-purple-100/60 h-1 relative overflow-hidden">
        <div 
          className="bg-gradient-to-r from-healnari-purple via-healnari-magenta to-indigo-600 h-1 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(107,70,193,0.5)]"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>

      {/* Draft Restored Toast Notification */}
      {draftRestored && (
        <div className="fixed top-16 right-4 z-50 bg-white border border-purple-200 shadow-xl rounded-2xl px-4 py-2.5 text-xs text-slate-800 flex items-center gap-2.5 animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Restored your in-progress concerns</span>
          <button
            type="button"
            onClick={() => setDraftRestored(false)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Print-only Clinical Header */}
      <div className="print-header text-left">
        <h1 className="text-2xl font-bold text-slate-900">HealNari Clinical Care Navigation Snapshot</h1>
        <p className="text-sm text-slate-600">Generated on {new Date().toLocaleDateString()} • Patient-Reported Clinical Assessment</p>
      </div>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────── */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-9 pb-32 md:pb-16">
        
        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: HEALTH CONCERN TAXONOMY & SYMPTOM SELECTION
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-6 sm:space-y-7 animate-fade-in text-left">
            
            {/* Header intro & Reassurance */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200/80 shadow-2xs mb-2.5">
                <i className="fas fa-stethoscope text-[11px] text-healnari-purple" />
                <span>Care Navigation &amp; Guided Clinical Intake</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                What are you experiencing?
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Select your symptoms across reproductive, hormonal, metabolic, and general health areas. HealNari analyzes multi-symptom patterns to guide you toward safe, verified medical care.
              </p>
            </div>

            {/* Non-Diagnostic Clinical Safety Callout */}
            <div className="bg-white/95 border border-purple-100/90 rounded-2xl p-4 sm:p-4.5 shadow-2xs flex items-start gap-3.5 text-xs text-slate-700">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-healnari-purple border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <i className="fas fa-shield-halved text-sm" />
              </div>
              <div>
                <strong className="text-slate-900 font-bold block mb-0.5">
                  A Care Navigation Tool, Not a Diagnostic Engine:
                </strong>
                <span className="text-slate-600 leading-relaxed">
                  HealNari does not provide definitive medical diagnoses (such as "You have PCOS" or "You have a vaginal infection"). Instead, we help you understand what your symptoms may be related to, which specialist can evaluate you, and what clinical tests may be helpful.
                </span>
              </div>
            </div>

            {/* PCOD Clarification Banner (If searching for PCOD/PCOS) */}
            {isPcodSearch && (
              <div className="bg-fuchsia-50/90 border border-fuchsia-200 rounded-2xl p-4 text-xs text-fuchsia-950 animate-slide-up flex items-start gap-3">
                <i className="fas fa-circle-info text-fuchsia-600 text-base mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <strong className="font-bold text-fuchsia-900 block">
                    PCOD vs. PCOS: Clarifying the Terminology
                  </strong>
                  <p className="leading-relaxed text-fuchsia-900/90">
                    In South Asia, <strong>PCOD</strong> (Polycystic Ovarian Disease) is commonly used colloquially to describe ovaries with multiple immature follicles. In modern evidence-based medicine, <strong>PCOS</strong> (Polycystic Ovary Syndrome) is the recognized medical term for an endocrine and metabolic condition characterized by ovulatory variations, androgen sensitivity, and metabolic factors. PCOD is not a separate automated diagnosis. Neither can be diagnosed from symptoms alone—a full clinical assessment by a Gynaecologist or Endocrinologist is required.
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Search Input & Live Counter */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs focus-within:border-healnari-purple focus-within:ring-2 focus-within:ring-purple-200 transition-all">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-grow">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search symptoms (e.g. vaginal itching, irregular periods, acne, hair fall, fatigue)..."
                    className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-purple-300 transition-all"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 px-1">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                    Selected: <strong className="text-healnari-purple font-black">{selectedSymptoms.length}</strong> concerns
                  </span>
                  {selectedSymptoms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSymptoms([])}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-1 py-0.5"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Fast Quick-Filter Suggestions */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Popular:
                </span>
                {POPULAR_CONCERNS.map(item => {
                  const isSelected = selectedSymptoms.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSymptom(item.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-100/80 hover:bg-purple-50 text-slate-600 hover:text-healnari-purple'
                      }`}
                    >
                      <i className={`fas ${item.icon} text-[9px]`} />
                      <span>{item.label}</span>
                      {isSelected && <span className="text-[9px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Practo App-Style Category Dropdown Selector ── */}
            <div className="relative z-20" ref={categoryDropdownRef}>
              <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-stethoscope text-healnari-purple text-xs" />
                  <span>Department / Health Area</span>
                </span>
                
                {activeCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryFilter('all');
                      triggerHaptic('light');
                    }}
                    className="text-[11px] font-bold text-healnari-purple hover:underline flex items-center gap-1"
                  >
                    <span>Reset to All</span>
                    <span className="text-[10px]">✕</span>
                  </button>
                )}
              </div>

              {/* Main Practo Dropdown Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsCategoryDropdownOpen(prev => !prev);
                }}
                aria-expanded={isCategoryDropdownOpen}
                className={`w-full bg-white border rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-200 flex items-center justify-between gap-3 shadow-xs hover:shadow-sm ${
                  isCategoryDropdownOpen
                    ? 'border-healnari-purple ring-2 ring-purple-300/40 shadow-md'
                    : 'border-slate-200/90 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    activeCategory.id === 'all'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : activeCategory.color || 'bg-purple-100 text-purple-800 border-purple-200'
                  }`}>
                    <i className={`fas ${activeCategory.icon || 'fa-layer-group'} text-xs`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 truncate">
                        {activeCategory.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-healnari-purple border border-purple-200 shrink-0">
                        {activeCategory.symptomsCount || totalSymptomsCount} concerns
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {activeCategory.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-healnari-purple hidden sm:inline">
                    {isCategoryDropdownOpen ? 'Close' : 'Select'}
                  </span>
                  <div className={`w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? 'rotate-180 bg-purple-100 text-healnari-purple' : ''
                  }`}>
                    <i className="fas fa-chevron-down text-xs" />
                  </div>
                </div>
              </button>

              {/* Practo Floating Dropdown Popover */}
              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl border border-purple-200 shadow-2xl p-2.5 sm:p-3 animate-slide-up max-h-[380px] overflow-y-auto">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                    <span>Select Health Department</span>
                    <span>13 Specialty Areas</span>
                  </div>

                  {/* Option: All Health Areas */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryFilter('all');
                      setIsCategoryDropdownOpen(false);
                      triggerHaptic('light');
                    }}
                    className={`w-full p-2.5 sm:p-3 rounded-2xl text-left transition-all flex items-center justify-between gap-3 ${
                      activeCategoryFilter === 'all'
                        ? 'bg-purple-50 text-purple-900 font-extrabold border border-purple-200 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-healnari-purple flex items-center justify-center shrink-0 border border-purple-200 text-xs">
                        <i className="fas fa-layer-group" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold truncate">All Health Areas</span>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full">
                            {totalSymptomsCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Explore all 95 clinical concerns across all areas
                        </p>
                      </div>
                    </div>
                    {activeCategoryFilter === 'all' && (
                      <span className="w-5 h-5 rounded-full bg-healnari-purple text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                        ✓
                      </span>
                    )}
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  {/* Individual Categories */}
                  <div className="space-y-1">
                    {SYMPTOM_CATEGORIES.map(cat => {
                      const isSelected = activeCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setActiveCategoryFilter(cat.id);
                            setIsCategoryDropdownOpen(false);
                            triggerHaptic('light');
                          }}
                          className={`w-full p-2.5 sm:p-3 rounded-2xl text-left transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-purple-50 text-purple-900 font-extrabold border border-purple-200 shadow-2xs'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs border ${cat.color}`}>
                              <i className={`fas ${cat.icon}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold truncate">{cat.label}</span>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full shrink-0">
                                  {cat.symptoms.length}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {cat.description}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-healnari-purple text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fast 1-Tap Quick Pills for the Most Popular Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-0.5 scrollbar-thin">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Quick:
                </span>
                {[
                  { id: 'all', label: 'All (95)' },
                  { id: 'vaginal_vulvar', label: 'Vaginal & Vulvar (13)' },
                  { id: 'pcos_ovulatory', label: 'PCOS / PCOD (13)' },
                  { id: 'hormonal_health', label: 'Hormonal (6)' },
                  { id: 'menstrual_health', label: 'Menstrual (9)' }
                ].map(chip => {
                  const isSelected = activeCategoryFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setActiveCategoryFilter(chip.id);
                        triggerHaptic('light');
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl shrink-0 transition-all ${
                        isSelected
                          ? 'bg-healnari-purple text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50/50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Symptoms Chips Bar (Quick Review Drawer) */}
            {selectedSymptoms.length > 0 && (
              <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 sm:p-4 animate-slide-up shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-healnari-purple uppercase tracking-wider">
                    Selected Concerns ({selectedSymptoms.length}):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Click any chip to remove
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedSymptoms.map(id => {
                    const info = ALL_SYMPTOMS_MAP[id] || { label: id };
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSymptom(id)}
                        className="inline-flex items-center gap-1.5 bg-white text-slate-800 border border-purple-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all active:scale-95"
                        title="Click to remove"
                      >
                        <span>{info.label}</span>
                        <i className="fas fa-times text-[10px] text-slate-400 hover:text-rose-600 ml-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Search State */}
            {searchFilter && filteredCategories.length === 0 && (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-healnari-purple flex items-center justify-center mx-auto text-xl">
                  <i className="fas fa-magnifying-glass" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  No symptoms matching "{searchFilter}"
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try checking the spelling, browsing by health area, or selecting from popular symptoms above.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="bg-purple-50 hover:bg-purple-100 text-healnari-purple font-bold text-xs px-4 py-2 rounded-xl transition-all inline-block mt-2"
                >
                  Clear Search Filter
                </button>
              </div>
            )}

            {/* Categorized Symptom Chips Grid */}
            <div className="space-y-6">
              {filteredCategories.map(cat => (
                <div key={cat.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100/80 shadow-2xs text-left transition-all">
                  
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm border shadow-2xs ${cat.color}`}>
                      <i className={`fas ${cat.icon}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{cat.label}</span>
                        <span className="text-xs font-semibold text-slate-400">({cat.symptoms.length})</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Symptom Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cat.symptoms.map(sym => {
                      const isSelected = selectedSymptoms.includes(sym.id);
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => toggleSymptom(sym.id)}
                          aria-pressed={isSelected}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-start justify-between gap-3 group active:scale-[0.98] ${
                            isSelected
                              ? 'bg-purple-50/90 border-healnari-purple shadow-sm ring-1 ring-healnari-purple'
                              : 'bg-slate-50/60 hover:bg-purple-50/30 border-slate-200/80 hover:border-purple-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-extrabold transition-colors ${
                              isSelected ? 'text-purple-900' : 'text-slate-800 group-hover:text-healnari-purple'
                            }`}>
                              {sym.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {sym.subtitle}
                            </p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected
                              ? 'bg-healnari-purple border-healnari-purple text-white shadow-2xs'
                              : 'border-slate-300 group-hover:border-purple-400 bg-white'
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

            {/* Desktop Continue Action Banner */}
            <div className="hidden md:flex items-center justify-between pt-4 pb-2 border-t border-purple-100">
              <span className="text-xs text-slate-500 font-medium">
                {selectedSymptoms.length > 0 
                  ? `${selectedSymptoms.length} health concerns selected for review` 
                  : 'Select one or more concerns above to proceed'}
              </span>

              <button
                type="button"
                disabled={selectedSymptoms.length === 0}
                onClick={handleProceedToStep2}
                className="bg-healnari-purple disabled:opacity-40 hover:bg-aubergine-600 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
              >
                <span>Continue to Step 2 (Clinical Context)</span>
                <i className="fas fa-arrow-right text-xs" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 2: RELEVANT CLINICAL CONTEXT & SAFETY SCREEN
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-7 sm:space-y-8 animate-fade-in text-left">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200/80 mb-2.5">
                <i className="fas fa-sliders text-[11px] text-healnari-purple" />
                Step 2 of 3: Clinical Context &amp; Safety Triage
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                Tell us a little more
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                We only ask relevant follow-up questions tailored to your selected concerns ({selectedSymptoms.length} reported).
              </p>
            </div>

            {/* Dynamic Questions List */}
            <div className="space-y-6">
              {contextualQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/80 shadow-2xs text-left">
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-healnari-purple uppercase tracking-wider block mb-1">
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
                                ? 'bg-purple-50/90 border-healnari-purple shadow-sm ring-1 ring-healnari-purple'
                                : 'bg-slate-50/50 hover:bg-purple-50/20 border-slate-200/80'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.value}
                              checked={isChecked}
                              onChange={() => handleAnswerChange(q.id, opt.value)}
                              className="mt-1 text-healnari-purple focus:ring-healnari-purple"
                            />
                            <div>
                              <p className={`text-xs sm:text-sm font-bold ${isChecked ? 'text-purple-900' : 'text-slate-800'}`}>
                                {opt.label}
                              </p>
                              {opt.desc && (
                                <p className="text-xs text-slate-500 mt-0.5">
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
                                  : 'bg-purple-50/90 border-healnari-purple ring-1 ring-healnari-purple'
                                : 'bg-slate-50/50 hover:bg-white border-slate-200/80'
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={q.id}
                              value={opt.value}
                              checked={isChecked}
                              onChange={() => handleSafetyFlagToggle(opt.value)}
                              className="mt-1 text-healnari-purple focus:ring-healnari-purple rounded"
                            />
                            <div>
                              <p className={`text-xs sm:text-sm font-bold ${
                                isChecked ? (opt.isRedFlag ? 'text-rose-900' : 'text-purple-900') : 'text-slate-800'
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

              {/* Optional Additional Notes Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/80 shadow-2xs text-left">
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
                  placeholder="e.g. My symptoms seem to peak during week 3 of my cycle, previous ultrasound was normal..."
                  className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-healnari-purple focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Desktop Actions Row */}
            <div className="hidden md:flex items-center justify-between pt-4 border-t border-purple-100">
              <button
                type="button"
                onClick={handleBack}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-bold px-6 py-3.5 rounded-xl transition-all text-sm flex items-center gap-2"
              >
                <i className="fas fa-arrow-left text-xs" />
                <span>Back to Symptoms</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToStep3}
                className="bg-healnari-purple hover:bg-aubergine-600 text-white font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
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
                <div className="bg-rose-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-left relative overflow-hidden">
                  <div className="flex items-start gap-4 relative z-10">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
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

                  {/* Top Action Pills (Print & Copy) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrintSummary}
                      className="bg-white hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/90 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5"
                      title="Print or save as PDF"
                    >
                      <i className="fas fa-print text-xs" />
                      <span>Print Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className={`font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5 ${
                        copiedSummary
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/90'
                      }`}
                      title="Copy summary text"
                    >
                      <i className={`fas ${copiedSummary ? 'fa-check' : 'fa-copy'} text-xs`} />
                      <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
                    </button>
                  </div>
                </div>

                {/* Non-Diagnostic Clinical Disclaimer Banner */}
                <div className="bg-white/95 border border-purple-100/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-700 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-healnari-purple border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fas fa-shield-halved text-sm" />
                  </div>
                  <div>
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Medical Principles &amp; Non-Diagnostic Notice:
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      {assessmentResult.safetyDisclaimer} HealNari never provides automated diagnoses. Conditions discussed below represent educational possibilities associated with your symptom pattern to support a productive consultation with a qualified medical specialist.
                    </p>
                  </div>
                </div>

                {/* 1. SECTION: WHAT YOU TOLD US */}
                <section className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <i className="fas fa-clipboard-list text-healnari-purple text-sm" />
                      <span>What you told us</span>
                    </h2>
                    <button
                      type="button"
                      onClick={handleResetAssessment}
                      className="text-xs font-bold text-healnari-purple hover:underline flex items-center gap-1"
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
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200/80 flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-healnari-purple" />
                          <span>{sym.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Additional Reported Context */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                        {followUpAnswers.duration === 'short' && '< 4 Weeks (Recent)'}
                        {followUpAnswers.duration === 'medium' && '1–6 Months (Ongoing)'}
                        {followUpAnswers.duration === 'long' && '> 6 Months (Chronic)'}
                        {!followUpAnswers.duration && 'Not specified'}
                      </p>
                    </div>
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Severity</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5 capitalize">
                        {followUpAnswers.severity || 'Moderate'}
                      </p>
                    </div>
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medications</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                        {followUpAnswers.medications === 'birth_control' && 'Hormonal Contraceptives'}
                        {followUpAnswers.medications === 'thyroid_meds' && 'Thyroid Medication'}
                        {followUpAnswers.medications === 'vitamins_iron' && 'Supplements / Vitamins'}
                        {followUpAnswers.medications === 'none' && 'None reported'}
                        {(!followUpAnswers.medications || followUpAnswers.medications === 'other_prescription') && 'Reviewed with Doctor'}
                      </p>
                    </div>
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cycle / Context</span>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                        {followUpAnswers.menstrual_pattern ? 'Pattern Recorded' : 'General Intake'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* 2. SECTION: WHAT THESE SYMPTOMS MAY BE RELATED TO */}
                <section className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/80 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-healnari-purple uppercase tracking-wider block">
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
                        className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-2 shadow-2xs"
                      >
                        <i className="fas fa-link text-[10px] text-healnari-purple" />
                        <span>{areaLabel}</span>
                      </span>
                    ))}
                  </div>
                </section>

                {/* 3. SECTION: CONDITIONS WORTH DISCUSSING WITH A HEALTHCARE PROFESSIONAL */}
                <section className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-healnari-purple uppercase tracking-wider block mb-1">
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
                        className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100/80 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-200">
                              {cond.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <i className="fas fa-user-doctor text-healnari-purple text-[9px]" />
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
                            <div className="mt-3 bg-fuchsia-50/70 p-3 rounded-xl border border-fuchsia-200 text-xs text-fuchsia-950">
                              <strong className="text-fuchsia-900 font-bold block mb-0.5">Terminology Note:</strong> {cond.pcodClarification}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setActiveConditionModal(cond);
                            }}
                            className="text-xs font-extrabold text-healnari-purple hover:text-aubergine-600 flex items-center gap-1.5 transition-colors"
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
                    <span className="text-xs font-bold text-healnari-purple uppercase tracking-wider block mb-1">
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
                            ? 'border-healnari-purple ring-2 ring-purple-400/30'
                            : 'border-purple-100/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            {spec.isPrimaryStartingPoint ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-healnari-purple text-white shadow-xs flex items-center gap-1">
                                <i className="fas fa-star text-[9px]" />
                                Recommended Starting Point
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {spec.tag}
                              </span>
                            )}
                            <i className={`fas ${spec.icon} text-healnari-purple text-sm`} />
                          </div>

                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                            {spec.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {spec.title}
                          </p>

                          <div className="mt-3 bg-purple-50/50 p-3 rounded-2xl border border-purple-100/80">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900/60 block mb-0.5">
                              Why this specialist is relevant:
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {spec.whyRelevant}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <i className="fas fa-video text-healnari-purple text-xs" />
                            <span>Video Consultation</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBookSpecialist(spec)}
                            className="bg-healnari-purple hover:bg-aubergine-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
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
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100/80 shadow-2xs space-y-5">
                  <div>
                    <span className="text-xs font-bold text-healnari-purple uppercase tracking-wider block mb-1">
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
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold mb-2">
                        <i className="fas fa-notes-medical" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        1. History &amp; Timeline
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {assessmentResult.clinicalEvaluationOverview.history}
                      </p>
                    </div>

                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold mb-2">
                        <i className="fas fa-stethoscope" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        2. Physical Evaluation
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {assessmentResult.clinicalEvaluationOverview.physicalExam}
                      </p>
                    </div>

                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold mb-2">
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

                  {/* Interactive Questions to Ask Your Doctor */}
                  <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <i className="fas fa-circle-question text-healnari-purple" />
                        Questions you can ask your doctor at your consultation:
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Check off to remember
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {assessmentResult.clinicalEvaluationOverview.questionsToAskDoctor.map((q, idx) => {
                        const isChecked = Boolean(checkedDoctorQuestions[idx]);
                        return (
                          <li
                            key={idx}
                            onClick={() => toggleDoctorQuestion(idx)}
                            className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                              isChecked ? 'bg-white text-purple-900 font-semibold shadow-2xs' : 'text-slate-700 hover:bg-white/60'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 text-[9px] ${
                              isChecked ? 'bg-healnari-purple border-healnari-purple text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && '✓'}
                            </span>
                            <span className="text-xs leading-relaxed">{q}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>

                {/* 6. SECTION: WHAT YOU CAN DO NEXT (6-STEP CARE PATHWAY) */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100/80 shadow-2xs space-y-6">
                  <div>
                    <span className="text-xs font-bold text-healnari-purple uppercase tracking-wider block mb-1">
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
                      <div key={st.step} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-healnari-purple text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
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
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 text-center sm:text-left">
                      Ready to speak with a verified clinician?
                    </div>

                    <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleBookSpecialist(assessmentResult.primarySpecialist || { name: 'Specialist' })}
                        className="bg-healnari-purple hover:bg-aubergine-600 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 flex-grow sm:flex-grow-0"
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
                        className="bg-purple-50 hover:bg-purple-100 text-healnari-purple font-bold px-4 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0 border border-purple-200"
                      >
                        <i className="fas fa-bookmark text-healnari-purple" />
                        <span>Save My Results</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintSummary}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0"
                        title="Print or save as PDF"
                      >
                        <i className="fas fa-print" />
                        <span>Print Summary</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 7. SECTION: WELLNESS SUPPORT (SUPPORTIVE MOVEMENT & MOBILITY) */}
                <section className="pt-2">
                  <PersonalizedExercise
                    exercises={assessmentResult.wellnessExercises}
                    isEmergency={assessmentResult.isEmergency}
                    onConsultDoctor={() => handleBookSpecialist(assessmentResult.primarySpecialist || { name: 'Doctor' })}
                  />
                </section>

                {/* Anonymous User Save Account Banner */}
                {!user && (
                  <div className="bg-gradient-to-br from-healnari-dark via-brand-dark to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-left relative overflow-hidden">
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
                          className="bg-gradient-to-r from-healnari-purple to-magenta-600 hover:from-aubergine-600 hover:to-magenta-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center gap-2"
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
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-purple-100 p-3.5 z-30 shadow-2xl animate-slide-up mobile-dock safe-area-pb">
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
              className="bg-healnari-purple disabled:opacity-40 hover:bg-aubergine-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <span>Continue</span>
              <i className="fas fa-arrow-right text-[10px]" />
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-purple-100 p-3.5 z-30 shadow-2xl animate-slide-up mobile-dock safe-area-pb">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={handleBack}
              className="bg-slate-100 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl transition-all"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleProceedToStep3}
              className="bg-healnari-purple hover:bg-aubergine-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
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
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-purple-100 p-6 sm:p-8 text-left animate-slide-up space-y-5 my-auto">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 uppercase tracking-wider">
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
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-healnari-purple mb-1">
                1. What is it?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatIsIt}
              </p>
            </div>

            {/* 2. What symptoms can be associated with it? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-healnari-purple mb-1">
                2. What symptoms can be associated with it?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatSymptomsCanBeAssociated}
              </p>
            </div>

            {/* 3. Why might it relate to my symptoms? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-healnari-purple mb-1">
                3. Why might it relate to my symptoms?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                {activeConditionModal.patientEducation?.whyMightItRelateToMySymptoms}
              </p>
            </div>

            {/* 4. How is it usually evaluated? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-healnari-purple mb-1">
                4. How is it usually evaluated?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.howIsItUsuallyEvaluated}
              </p>
            </div>

            {/* 5. What type of specialist evaluates it? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-healnari-purple mb-1">
                5. What type of specialist evaluates it?
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeConditionModal.patientEducation?.whatSpecialistEvaluatesIt}
              </p>
            </div>

            {/* 6. What treatment approaches may exist? */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-healnari-purple mb-1">
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
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
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
