import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
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

// Lazy load modals for peak initial load performance
const BookingModal = lazy(() => import('../../tools/BookingModal.jsx'));
const AuthModal = lazy(() => import('../../tools/AuthModal.jsx'));
const SuccessModal = lazy(() => import('../../tools/SuccessModal.jsx'));

// Fast high-frequency quick-select problem suggestion pills (Problem-first language)
const POPULAR_CONCERNS = [
  { label: 'Irregular Periods', id: 'irregular_periods', icon: 'fa-calendar-xmark' },
  { label: 'Period Pain', id: 'painful_periods', icon: 'fa-circle-exclamation' },
  { label: 'Heavy Periods', id: 'heavy_periods', icon: 'fa-droplet' },
  { label: 'Vaginal Itching', id: 'vaginal_itching', icon: 'fa-hand-dots' },
  { label: 'Unusual Discharge', id: 'unusual_discharge', icon: 'fa-water' },
  { label: 'Acne & Pimples', id: 'acne', icon: 'fa-spa' },
  { label: 'Hair Fall', id: 'hair_fall', icon: 'fa-wind' },
  { label: 'Hair Thinning', id: 'hair_thinning', icon: 'fa-scissors' },
  { label: 'Weight Changes', id: 'weight_gain', icon: 'fa-scale-unbalanced' },
  { label: 'Feeling Tired', id: 'fatigue', icon: 'fa-battery-quarter' },
  { label: 'Mood Changes', id: 'mood_swings', icon: 'fa-cloud-rain' },
  { label: 'Stress', id: 'stress', icon: 'fa-brain' },
  { label: 'Poor Sleep', id: 'poor_sleep', icon: 'fa-moon' },
  { label: 'Fertility Concerns', id: 'difficulty_conceiving', icon: 'fa-seedling' },
  { label: 'PCOS Concerns', id: 'pcos_concerns', icon: 'fa-dna' },
  { label: 'Pelvic Pain', id: 'pelvic_pain', icon: 'fa-shield-heart' },
  { label: 'Something Else', id: 'something_else', icon: 'fa-comment-medical' }
];

export default function CheckSymptomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchInputRef = useRef(null);

  // Wizard state: Step 1 (Concerns), Step 2 (Clinical Context), Step 3 (Care Snapshot)
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

  // Custom concern state for "Something Else"
  const [customConcernText, setCustomConcernText] = useState('');
  const [isCustomConcernOpen, setIsCustomConcernOpen] = useState(false);

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
  const [copiedQuestions, setCopiedQuestions] = useState(false);
  const [checkedDoctorQuestions, setCheckedDoctorQuestions] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);

  // Red Flag Alert Banner State
  const [hasImmediateRedFlag, setHasImmediateRedFlag] = useState(false);

  // Handle URL query parameter pre-selection (?concern=...)
  useEffect(() => {
    const concernParam = searchParams.get('concern');
    if (concernParam) {
      if (concernParam === 'something_else') {
        setIsCustomConcernOpen(true);
        setSelectedSymptoms(prev => prev.includes('something_else') ? prev : [...prev, 'something_else']);
      } else {
        const resolvedId = ALL_SYMPTOMS_MAP[concernParam] ? concernParam : null;
        if (resolvedId) {
          setSelectedSymptoms(prev => prev.includes(resolvedId) ? prev : [...prev, resolvedId]);
        }
      }
    }
  }, [searchParams]);

  // SEO, Canonical, OpenGraph & Analytics on mount
  useEffect(() => {
    const originalTitle = document.title;
    const pageTitle = "Free Online Symptom Checker & Specialist Triage | HealNari";
    const pageDesc = "Check your symptoms online in 2 minutes. Free clinical triage for irregular periods, hormonal acne, hair loss, thyroid, and fatigue with specialist care recommendations.";
    const canonicalUrl = "https://healnari.vercel.app/check-symptoms";

    document.title = pageTitle;

    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      const original = el ? el.getAttribute(attr) : null;
      if (el) el.setAttribute(attr, content);
      return { el, original };
    };

    const prevDesc = updateMeta('meta[name="description"]', pageDesc);
    const prevOgTitle = updateMeta('meta[property="og:title"]', pageTitle);
    const prevOgDesc = updateMeta('meta[property="og:description"]', pageDesc);
    const prevOgUrl = updateMeta('meta[property="og:url"]', canonicalUrl);
    const prevCanonical = updateMeta('link[rel="canonical"]', canonicalUrl, 'href');

    // JSON-LD Schema: MedicalWebPage + BreadcrumbList
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-symptom-checker-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalWebPage",
          "@id": `${canonicalUrl}#webpage`,
          "url": canonicalUrl,
          "name": pageTitle,
          "description": pageDesc,
          "isPartOf": {
            "@type": "WebSite",
            "@id": "https://healnari.vercel.app/#website",
            "name": "HealNari",
            "url": "https://healnari.vercel.app"
          },
          "about": {
            "@type": "MedicalSpecialty",
            "name": "Clinical Symptom Assessment & Telemedicine Triage"
          },
          "professionallyReviewedBy": {
            "@type": "MedicalOrganization",
            "name": "HealNari Clinical Advisory Board",
            "url": "https://healnari.vercel.app"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://healnari.vercel.app" },
            { "@type": "ListItem", "position": 2, "name": "Check Symptoms", "item": canonicalUrl }
          ]
        }
      ]
    });
    document.head.appendChild(schemaScript);

    trackEvent(AnalyticsEvents.ASSESSMENT_STARTED, {
      source: 'check_symptoms_page',
      isLoggedIn: Boolean(user)
    });

    return () => {
      document.title = originalTitle;
      if (prevDesc?.el && prevDesc?.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle?.el && prevOgTitle?.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc?.el && prevOgDesc?.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl?.el && prevOgUrl?.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical?.el && prevCanonical?.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
      const s = document.getElementById('healnari-symptom-checker-schema');
      if (s) document.head.removeChild(s);
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
          if (parsed.customConcernText) {
            setCustomConcernText(parsed.customConcernText);
            setIsCustomConcernOpen(true);
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
          followUpAnswers,
          customConcernText
        }));
      }
    } catch {
      // Storage unavailable fallback
    }
  }, [selectedSymptoms, followUpAnswers, customConcernText]);

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
    setCustomConcernText('');
    setIsCustomConcernOpen(false);
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

  // Copy doctor questions to clipboard
  const handleCopyDoctorQuestions = () => {
    triggerHaptic('light');
    const questions = assessmentResult.clinicalEvaluationOverview?.questionsToAskDoctor || [];
    const questionsText = `HealNari - Questions to Ask My Doctor at Consultation:
${questions.map((q, idx) => `${idx + 1}. ${q} ${checkedDoctorQuestions[idx] ? '[PRIORITY]' : ''}`).join('\n')}

Reported Symptoms: ${selectedSymptoms.map(id => ALL_SYMPTOMS_MAP[id]?.label || id).join(', ')}`;

    navigator.clipboard.writeText(questionsText).then(() => {
      setCopiedQuestions(true);
      setTimeout(() => setCopiedQuestions(false), 3000);
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

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-slate-800 flex flex-col font-sans selection:bg-purple-100 selection:text-healnari-purple relative overflow-x-clip">
      
      {/* ── Soft Ambient Healthcare Glows ── */}
      <div 
        aria-hidden="true" 
        className="fixed -top-24 right-1/4 w-[550px] h-[550px] bg-gradient-to-br from-purple-200/35 via-pink-200/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" 
      />
      <div 
        aria-hidden="true" 
        className="fixed top-80 -left-20 w-[450px] h-[450px] bg-gradient-to-tr from-indigo-200/25 via-purple-100/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" 
      />

      {/* ── PRINT-SPECIFIC CSS ── */}
      <style>{`
        @media print {
          header, .no-print, button, .mobile-dock, .smart-dock {
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

      {/* ── TOP APP BAR / HEADER (Refined High-End Healthcare Navbar) ──── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-purple-100/90 transition-all shadow-[0_2px_15px_rgba(107,70,193,0.04)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          
          {/* Left: Back Button & Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-purple-50 border border-slate-200/80 hover:border-purple-300 text-slate-600 hover:text-healnari-purple flex items-center justify-center transition-all active:scale-95 shadow-2xs group"
              aria-label="Go back"
              title="Return to previous screen"
            >
              <i className="fas fa-arrow-left text-xs transition-transform group-hover:-translate-x-0.5" />
            </button>

            <NavLink to="/" className="shrink-0 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-healnari-purple rounded-lg group">
              <HealNariLogo size="sm" />
              <span className="hidden md:inline-flex items-center gap-1.5 ml-1 pl-2.5 border-l border-slate-200 text-[11px] font-bold tracking-wider uppercase text-purple-900/60">
                <span>Care Navigator</span>
              </span>
            </NavLink>
          </div>

          {/* Center: Integrated Stepper Capsule */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100/80 p-1 rounded-full border border-slate-200/70 flex items-center gap-1 shadow-inner">
              {[
                { num: 1, label: 'Concerns', step: 1, icon: 'fa-list-check' },
                { num: 2, label: 'Context', step: 2, icon: 'fa-sliders' },
                { num: 3, label: 'Care Plan', step: 3, icon: 'fa-clipboard-medical' }
              ].map(st => {
                const isCurrent = currentStep === st.step;
                const isPast = currentStep > st.step;
                return (
                  <div
                    key={st.step}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm ring-1 ring-purple-500/30'
                        : isPast
                          ? 'bg-emerald-100/90 text-emerald-800'
                          : 'text-slate-400 hidden sm:flex'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isPast ? '✓' : st.num}
                    </span>
                    <span className="text-[11px]">{st.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-purple-900 bg-purple-50/90 px-2.5 py-1 rounded-full border border-purple-200/80 shadow-2xs">
              <i className="far fa-clock text-healnari-purple text-[10px]" />
              <span>~2 min</span>
            </div>
          </div>

          {/* Right: Actions & Auth */}
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleResetAssessment}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-full transition-colors hidden sm:flex items-center gap-1.5 hover:bg-rose-50"
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
                className="text-xs font-bold text-healnari-purple bg-purple-50/90 hover:bg-purple-100 border border-purple-200/90 px-3.5 py-1.5 rounded-full transition-all shadow-2xs flex items-center gap-1.5"
              >
                <i className="fas fa-user-circle text-xs" />
                <span className="hidden sm:inline">Log In</span>
              </button>
            ) : (
              <NavLink
                to="/patient-dashboard"
                className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <i className="fas fa-columns text-[10px]" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* Silky 2px Progress Accent Line */}
        <div className="w-full bg-slate-100 h-[2.5px] relative overflow-hidden">
          <div 
            className="bg-gradient-to-r from-healnari-purple via-healnari-magenta to-indigo-600 h-[2.5px] transition-all duration-500 ease-out shadow-[0_0_8px_rgba(226,62,140,0.5)]"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </header>

      {/* Draft Restored Toast Notification */}
      {draftRestored && (
        <div className="fixed top-16 right-4 z-50 bg-white/95 backdrop-blur-md border border-purple-200 shadow-xl rounded-2xl px-4 py-2.5 text-xs text-slate-800 flex items-center gap-2.5 animate-slide-up">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Restored your in-progress concerns</span>
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
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-9 pb-36 md:pb-32">
        
        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: HEALTH CONCERN TAXONOMY & SYMPTOM SELECTION
        ════════════════════════════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: PROBLEM-FIRST SYMPTOM EXPLORATION & SELECTION
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-6 sm:space-y-7 animate-fade-in text-left">
            
            {/* ── Problem-First Hero Presentation Banner ── */}
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30 border border-purple-100/90 shadow-[0_4px_25px_rgba(107,70,193,0.05)] overflow-hidden">
              <div 
                aria-hidden="true" 
                className="absolute right-0 top-0 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" 
              />
              
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold bg-white/90 text-purple-900 border border-purple-200/80 shadow-2xs mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <i className="fas fa-heart-pulse text-[11px] text-healnari-purple" />
                  <span>Problem-First Care Navigation • Patient Intake</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                  What are you <span className="bg-gradient-to-r from-purple-700 via-healnari-magenta to-indigo-600 bg-clip-text text-transparent">experiencing?</span>
                </h1>
                
                <p className="text-slate-600 text-sm sm:text-base mt-2.5 leading-relaxed font-normal">
                  Start with the problem you're noticing. Select all that apply — you don't need to know any medical specialty or diagnosis to begin.
                </p>

                {/* Micro Clinical Reassurance */}
                <div className="mt-4 pt-3.5 border-t border-purple-100/80 flex items-center gap-2 text-xs text-slate-600">
                  <i className="fas fa-shield-halved text-healnari-purple text-sm shrink-0" />
                  <span className="leading-normal">
                    <strong>Care Navigation, Not Automated Diagnosis:</strong> HealNari maps your symptoms to relevant clinical evaluation pathways and specialist consultations without diagnosing you automatically.
                  </span>
                </div>
              </div>
            </div>

            {/* PCOD Clarification Banner (If searching for PCOD/PCOS) */}
            {isPcodSearch && (
              <div className="bg-fuchsia-50/90 border border-fuchsia-200 rounded-3xl p-5 text-xs text-fuchsia-950 animate-slide-up flex items-start gap-3.5 shadow-sm">
                <i className="fas fa-circle-info text-fuchsia-600 text-lg mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <strong className="font-extrabold text-fuchsia-900 text-sm block">
                    PCOD vs. PCOS: Clarifying the Terminology
                  </strong>
                  <p className="leading-relaxed text-fuchsia-900/90">
                    In South Asia, <strong>PCOD</strong> (Polycystic Ovarian Disease) is commonly used colloquially to describe ovaries with multiple immature follicles. In modern evidence-based medicine, <strong>PCOS</strong> (Polycystic Ovary Syndrome) is the recognized medical term for an endocrine and metabolic condition characterized by ovulatory variations, androgen sensitivity, and metabolic factors. PCOD is not a separate automated diagnosis. Neither can be diagnosed from symptoms alone—a full clinical assessment by a Gynaecologist or Endocrinologist is required.
                  </p>
                </div>
              </div>
            )}

            {/* Search Console & Popular Pills */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-purple-100/90 shadow-[0_8px_30px_rgba(107,70,193,0.06)] focus-within:border-healnari-purple focus-within:ring-4 focus-within:ring-purple-200/50 transition-all">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-grow">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 text-sm" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search problems (e.g. hair fall, acne, cramps, itching, feeling tired, pelvic pain)..."
                    className="w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl pl-11 pr-9 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-purple-300 transition-all"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 px-1">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap bg-purple-50/60 px-3 py-1.5 rounded-xl border border-purple-100/80">
                    Selected: <strong className="text-healnari-purple font-black">{selectedSymptoms.length}</strong> concerns
                  </span>
                  {selectedSymptoms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSymptoms([]);
                        setCustomConcernText('');
                        setIsCustomConcernOpen(false);
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Fast Quick-Filter Problem Pills */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <i className="fas fa-bolt text-amber-500 text-[10px]" />
                  <span>Popular:</span>
                </span>
                {POPULAR_CONCERNS.map(item => {
                  const isSelected = selectedSymptoms.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'something_else') {
                          setIsCustomConcernOpen(true);
                          if (!selectedSymptoms.includes('something_else')) {
                            toggleSymptom('something_else');
                          }
                        } else {
                          toggleSymptom(item.id);
                        }
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm ring-2 ring-purple-400/40'
                          : 'bg-slate-100/80 hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/60 hover:-translate-y-0.5'
                      }`}
                    >
                      <i className={`fas ${item.icon} text-[10px]`} />
                      <span>{item.label}</span>
                      {isSelected && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Friendly Problem Categories Segmented Tab Bar ── */}
            <div className="bg-white rounded-3xl p-3 sm:p-4 border border-purple-100/90 shadow-[0_4px_20px_rgba(107,70,193,0.04)]">
              <div className="flex items-center justify-between gap-2 px-1 mb-2.5">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-shapes text-healnari-purple text-xs" />
                  <span>Browse by Health Area</span>
                </span>
                {activeCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryFilter('all');
                      triggerHaptic('light');
                    }}
                    className="text-xs font-bold text-healnari-purple hover:underline flex items-center gap-1"
                  >
                    <span>View All ({totalSymptomsCount})</span>
                    <i className="fas fa-arrow-rotate-left text-[10px]" />
                  </button>
                )}
              </div>

              {/* Scrollable Horizontal Pill Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryFilter('all');
                    triggerHaptic('light');
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-2 ${
                    activeCategoryFilter === 'all'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md ring-2 ring-purple-400/40'
                      : 'bg-slate-100/80 hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/60'
                  }`}
                >
                  <i className="fas fa-asterisk text-[10px]" />
                  <span>All Concerns</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200/90 text-slate-600'
                  }`}>
                    {totalSymptomsCount}
                  </span>
                </button>

                {SYMPTOM_CATEGORIES.map(cat => {
                  const isSelected = activeCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategoryFilter(cat.id);
                        triggerHaptic('light');
                      }}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md ring-2 ring-purple-400/40'
                          : 'bg-slate-100/80 hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/60'
                      }`}
                    >
                      <i className={`fas ${cat.icon} text-[10px]`} />
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/90 text-slate-600'
                      }`}>
                        {cat.symptoms.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Symptoms Chips Bar (Quick Review Drawer) */}
            {selectedSymptoms.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-200/90 rounded-3xl p-4 sm:p-5 animate-slide-up shadow-card">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[11px] font-extrabold text-healnari-purple uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Your Selected Problems ({selectedSymptoms.length}):</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    Click any chip to remove
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map(id => {
                    const info = id === 'something_else' && customConcernText
                      ? { label: `Something Else: "${customConcernText}"` }
                      : ALL_SYMPTOMS_MAP[id] || { label: id };
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (id === 'something_else') {
                            setCustomConcernText('');
                            setIsCustomConcernOpen(false);
                          }
                          toggleSymptom(id);
                        }}
                        className="inline-flex items-center gap-1.5 bg-white text-slate-800 border border-purple-200 px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-sm hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all active:scale-95 group"
                        title="Click to remove"
                      >
                        <span>{info.label}</span>
                        <i className="fas fa-times text-[10px] text-slate-400 group-hover:text-rose-600 ml-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Search State */}
            {searchFilter && filteredCategories.length === 0 && (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 text-center space-y-3 shadow-card">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-healnari-purple flex items-center justify-center mx-auto text-xl shadow-sm">
                  <i className="fas fa-magnifying-glass" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  No symptoms matching "{searchFilter}"
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try checking the spelling, browsing by health area above, or selecting from popular concerns.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="bg-purple-50 hover:bg-purple-100 text-healnari-purple font-bold text-xs px-4 py-2 rounded-xl transition-all inline-block mt-2 shadow-sm"
                >
                  Clear Search Filter
                </button>
              </div>
            )}

            {/* Large Problem Cards Grid Grouped by Friendly Health Area */}
            <div className="space-y-6">
              {filteredCategories.map(cat => (
                <div key={cat.id} className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/90 shadow-card text-left transition-all">
                  
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm border shadow-sm ${cat.color}`}>
                      <i className={`fas ${cat.icon}`} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{cat.label}</span>
                        <span className="text-xs font-semibold text-slate-400">({cat.symptoms.length})</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Scannable Problem Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {cat.symptoms.map(sym => {
                      const isSelected = selectedSymptoms.includes(sym.id);
                      const isSomethingElse = sym.id === 'something_else';
                      return (
                        <div key={sym.id} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSomethingElse) {
                                setIsCustomConcernOpen(prev => !prev);
                                if (!selectedSymptoms.includes('something_else')) {
                                  toggleSymptom('something_else');
                                }
                              } else {
                                toggleSymptom(sym.id);
                              }
                            }}
                            aria-pressed={isSelected}
                            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 flex items-start justify-between gap-3.5 group active:scale-[0.99] relative overflow-hidden ${
                              isSelected
                                ? 'bg-gradient-to-br from-purple-50/95 via-fuchsia-50/40 to-white border-healnari-purple ring-2 ring-purple-400/50 shadow-[0_4px_20px_rgba(107,70,193,0.12)]'
                                : 'bg-white hover:bg-purple-50/30 border-slate-200/90 hover:border-purple-300 shadow-sm hover:shadow-card-hover hover:-translate-y-0.5'
                            }`}
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-base shadow-sm transition-transform group-hover:scale-105 ${
                                isSelected ? 'bg-healnari-purple text-white shadow-purple-300/50' : 'bg-purple-50 text-healnari-purple border border-purple-100'
                              }`}>
                                <i className={`fas ${sym.icon || 'fa-notes-medical'}`} />
                              </div>
                              <div className="min-w-0">
                                <h3 className={`text-base sm:text-lg font-black tracking-tight transition-colors ${
                                  isSelected ? 'text-purple-950' : 'text-slate-900 group-hover:text-healnari-purple'
                                }`}>
                                  {sym.label}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 leading-relaxed">
                                  {sym.subtitle}
                                </p>
                                
                                <div className="mt-2.5 flex items-center gap-2">
                                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 transition-all ${
                                    isSelected
                                      ? 'bg-purple-600 text-white shadow-2xs'
                                      : 'text-purple-800 bg-purple-50 group-hover:bg-purple-100'
                                  }`}>
                                    {isSelected ? (
                                      <>
                                        <i className="fas fa-check text-[9px]" />
                                        <span>Selected</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Check this problem</span>
                                        <i className="fas fa-arrow-right text-[8px] opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                              isSelected
                                ? 'bg-healnari-purple border-healnari-purple text-white shadow-sm scale-110'
                                : 'border-slate-300 group-hover:border-purple-400 bg-white'
                            }`}>
                              {isSelected ? <i className="fas fa-check text-xs" /> : <span className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-purple-300" />}
                            </div>
                          </button>

                          {/* Inline Drawer for Something Else */}
                          {isSomethingElse && (isSelected || isCustomConcernOpen) && (
                            <div className="mt-2 bg-purple-50/90 border border-purple-200 rounded-2xl p-3.5 sm:p-4 text-xs space-y-2 animate-slide-up">
                              <label className="font-bold text-purple-950 block">
                                Tell us what you're experiencing in your own words:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customConcernText}
                                  onChange={(e) => {
                                    setCustomConcernText(e.target.value);
                                    handleAnswerChange('additional_notes', `Custom concern reported: ${e.target.value}`);
                                  }}
                                  placeholder="e.g. Sharp pain in right lower abdomen during ovulation, extreme breast swelling..."
                                  className="flex-grow bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-healnari-purple"
                                />
                                {customConcernText && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('light');
                                      if (!selectedSymptoms.includes('something_else')) {
                                        setSelectedSymptoms(prev => [...prev, 'something_else']);
                                      }
                                    }}
                                    className="bg-healnari-purple text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0"
                                  >
                                    Save
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 2: RELEVANT CLINICAL CONTEXT & SAFETY SCREEN
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-7 sm:space-y-8 animate-fade-in text-left">
            
            {/* ── Persistent Selected Problems Banner (Step Continuity) ── */}
            <div className="bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-200/90 rounded-3xl p-5 sm:p-6 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-purple-950">
                    Your Selected Concern{selectedSymptoms.length > 1 ? 's' : ''} ({selectedSymptoms.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    triggerHaptic('light');
                  }}
                  className="text-xs font-bold text-healnari-purple hover:underline flex items-center gap-1.5 self-start sm:self-auto bg-white px-3.5 py-1.5 rounded-full border border-purple-200 shadow-2xs hover:bg-purple-50 transition-colors"
                >
                  <i className="fas fa-pencil text-[10px]" />
                  <span>Change / Add concerns</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map(id => {
                  const symInfo = id === 'something_else' && customConcernText
                    ? { label: `Something Else: "${customConcernText}"`, icon: 'fa-comment-medical' }
                    : ALL_SYMPTOMS_MAP[id] || { label: id, icon: 'fa-notes-medical' };
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 bg-white text-slate-800 border border-purple-200/90 px-3.5 py-1.5 rounded-full text-xs font-black shadow-2xs"
                    >
                      <i className={`fas ${symInfo.icon || 'fa-notes-medical'} text-healnari-purple text-[11px]`} />
                      <span>{symInfo.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-200/80 mb-2.5 shadow-sm">
                <i className="fas fa-sliders text-[11px] text-healnari-purple" />
                Step 2 of 3: Clinical Context &amp; Safety Triage
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                Tell us a little more
              </h1>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                We only ask relevant follow-up questions tailored to your selected concerns ({selectedSymptoms.length} reported). Unrelated questions are skipped.
              </p>
            </div>

            {/* Context Questions Progress Meter */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-purple-100/90 shadow-card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-healnari-purple flex items-center justify-center font-bold text-sm shadow-sm">
                  <i className="fas fa-clipboard-check" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {contextualQuestions.length} Contextual Questions
                  </span>
                  <span className="text-xs text-slate-500">
                    Tailored specifically to your selected symptom pattern
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-healnari-purple bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200/80">
                  {selectedSymptoms.length} Concerns Under Review
                </span>
              </div>
            </div>

            {/* Dynamic Questions List */}
            <div className="space-y-6">
              {contextualQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/90 shadow-card text-left">
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
                    <div className="space-y-2.5">
                      {q.options.map(opt => {
                        const isChecked = followUpAnswers[q.id] === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-gradient-to-r from-purple-50/95 to-indigo-50/40 border-healnari-purple shadow-sm ring-2 ring-purple-300/40'
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
                              <p className={`text-xs sm:text-sm font-extrabold ${isChecked ? 'text-purple-900' : 'text-slate-800'}`}>
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
                    <div className="space-y-2.5">
                      {q.options.map(opt => {
                        const isChecked = (followUpAnswers[q.id] || []).includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                              isChecked
                                ? opt.isRedFlag
                                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300/40'
                                  : 'bg-purple-50/90 border-healnari-purple ring-2 ring-purple-300/40'
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
                              <p className={`text-xs sm:text-sm font-extrabold ${
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
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/90 shadow-card text-left">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Anything else you'd like to share? (Optional)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Share previous lab values, doctor advice, cycle dates, or specific questions you have for the clinician.
                </p>
                <textarea
                  rows={3}
                  value={followUpAnswers.additional_notes || ''}
                  onChange={(e) => handleAnswerChange('additional_notes', e.target.value)}
                  placeholder="e.g. My symptoms seem to peak during week 3 of my cycle, previous ultrasound was normal..."
                  className="w-full bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-healnari-purple focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 3: RESULTS / MEDICAL CARE SNAPSHOT & NAVIGATION
        ════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fade-in text-left">
            
            {/* ── PROMPT MEDICAL ATTENTION / RED FLAG SCREEN ─────────────── */}
            {assessmentResult.isEmergency ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl text-left relative overflow-hidden">
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                      <i className="fas fa-triangle-exclamation text-2xl text-white" />
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-white text-rose-700 uppercase tracking-wider inline-block mb-2 shadow-2xs">
                        Prompt Medical Attention Recommended
                      </span>
                      <h2 className="text-xl sm:text-3xl font-extrabold font-display">
                        Please get medical help promptly
                      </h2>
                      <p className="text-xs sm:text-sm text-rose-100 mt-2 leading-relaxed max-w-2xl font-medium">
                        Some symptoms need prompt medical attention. Please contact a healthcare professional or local emergency service if you are experiencing severe symptoms such as sudden severe pain, heavy bleeding, or high fever with pelvic pain.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Directives */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-card space-y-4">
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
                
                {/* ── High-Impact Executive Care Route Hero Card ── */}
                <div className="bg-gradient-to-br from-white via-purple-50/40 to-fuchsia-50/30 rounded-3xl p-6 sm:p-8 border border-purple-200/90 shadow-card relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm">
                          <i className="fas fa-star text-[10px]" />
                          Primary Recommended Specialist
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <i className="fas fa-check-circle text-[10px]" />
                          Assessment Complete
                        </span>
                        {savedToProfile && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <i className="fas fa-cloud text-[10px]" />
                            Saved to Profile
                          </span>
                        )}
                      </div>

                      <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
                        Your Care Navigation Snapshot
                      </h1>
                      
                      <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                        Based on your {selectedSymptoms.length} reported symptoms, your recommended starting point for medical evaluation is a{' '}
                        <strong className="text-purple-900 font-extrabold">
                          {assessmentResult.primarySpecialist?.name || 'Gynaecologist'}
                        </strong>.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
                        <span className="bg-white/80 border border-purple-100 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
                          <i className="fas fa-heart-pulse text-healnari-purple" />
                          <span>{selectedSymptoms.length} Reported Concerns</span>
                        </span>
                        <span className="bg-white/80 border border-purple-100 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
                          <i className="fas fa-dna text-healnari-magenta" />
                          <span>{assessmentResult.relevantHealthAreaLabels?.length || 2} Connected Areas</span>
                        </span>
                        <span className="bg-white/80 border border-purple-100 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5">
                          <i className="fas fa-user-doctor text-indigo-600" />
                          <span>{assessmentResult.recommendedSpecialists?.length || 1} Mapped Specialists</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleBookSpecialist(assessmentResult.primarySpecialist || { name: 'Specialist' })}
                        className="bg-gradient-to-r from-purple-700 via-healnari-purple to-magenta-600 hover:from-purple-800 hover:to-magenta-700 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-calendar-check text-xs" />
                        <span>Book Starting Specialist</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePrintSummary}
                          className="bg-white hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/90 font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 flex-1"
                          title="Print or save as PDF"
                        >
                          <i className="fas fa-print text-xs" />
                          <span>Print PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopySummary}
                          className={`font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 flex-1 ${
                            copiedSummary
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-healnari-purple border border-slate-200/90'
                          }`}
                          title="Copy summary text"
                        >
                          <i className={`fas ${copiedSummary ? 'fa-check' : 'fa-copy'} text-xs`} />
                          <span>{copiedSummary ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Non-Diagnostic Clinical Disclaimer Banner */}
                <div className="bg-white/95 border border-purple-100/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-700 shadow-card">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-healnari-purple border border-purple-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
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

                {/* 1. SECTION: YOU TOLD US */}
                <section className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/90 shadow-card space-y-4">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-black text-healnari-purple uppercase tracking-wider block mb-0.5">
                        Step 1 • Your Selected Problems
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                        <i className="fas fa-clipboard-list text-healnari-purple text-sm" />
                        <span>YOU TOLD US</span>
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetAssessment}
                      className="text-xs font-bold text-healnari-purple hover:underline flex items-center gap-1"
                    >
                      <i className="fas fa-rotate-left text-[10px]" />
                      <span>Re-take Assessment</span>
                    </button>
                  </div>

                  {/* Reported Concerns Cards Grid */}
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                      Reported Concerns ({assessmentResult.selectedSymptomsInfo.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assessmentResult.selectedSymptomsInfo.map(sym => {
                        const isCustom = sym.id === 'something_else' && customConcernText;
                        return (
                          <div
                            key={sym.id}
                            className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/90 flex items-start gap-3 shadow-2xs"
                          >
                            <div className="w-8 h-8 rounded-xl bg-healnari-purple text-white flex items-center justify-center shrink-0 text-xs shadow-sm mt-0.5">
                              <i className={`fas ${sym.icon || 'fa-notes-medical'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-black text-purple-950">
                                {isCustom ? `Something Else: "${customConcernText}"` : sym.label}
                              </p>
                              {sym.subtitle && !isCustom && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                  {sym.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-Concern Clinical Pattern Explanation */}
                  <div className="bg-gradient-to-r from-purple-50/90 via-pink-50/50 to-purple-50/90 border border-purple-200 rounded-2xl p-4 sm:p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-purple-900 uppercase tracking-wider">
                      <i className="fas fa-link text-healnari-purple" />
                      <span>
                        {selectedSymptoms.length > 1
                          ? `Your concerns: ${assessmentResult.selectedSymptomsInfo.map(s => s.id === 'something_else' && customConcernText ? customConcernText : s.label).join(' + ')}`
                          : `Understanding your concern`}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                      {assessmentResult.multiSymptomExplanation}
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 border-t border-purple-100">
                      <i className="fas fa-shield-halved text-healnari-purple text-xs shrink-0" />
                      <span>
                        PCOS is one condition that can sometimes be associated with this group of symptoms. A doctor needs to evaluate your symptoms and medical history.
                      </span>
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

                {/* 2. SECTION: THIS MAY BE RELATED TO */}
                <section className="bg-white rounded-3xl p-5 sm:p-7 border border-purple-100/90 shadow-card space-y-4">
                  <div>
                    <span className="text-xs font-black text-healnari-purple uppercase tracking-wider block mb-0.5">
                      Step 2 • Understand Possible Causes
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                      <i className="fas fa-dna text-healnari-magenta text-sm" />
                      <span>THIS MAY BE RELATED TO</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Symptoms can have different causes. Below are common health areas and possible reasons associated with what you reported. <strong>These are possible reasons, NOT a diagnosis:</strong>
                    </p>
                  </div>

                  {/* Grid of Possible Reasons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(assessmentResult.possibleReasons || [
                      'Hormone changes',
                      'Nutrition or low iron',
                      'Thyroid-related problems',
                      'Scalp conditions',
                      'Stress or recent illness',
                      'Family-related hair loss',
                      'Medicines'
                    ]).map((reason, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3 hover:bg-purple-50/40 hover:border-purple-200 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-healnari-purple flex items-center justify-center shrink-0 text-xs font-black mt-0.5">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900">
                            {reason}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">Possible contributing factor</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Connected Health Domains Badges */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                      Connected Health Domains:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {assessmentResult.relevantHealthAreaLabels.map((areaLabel, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-900 border border-purple-200/90 flex items-center gap-1.5 shadow-2xs"
                        >
                          <i className="fas fa-link text-[10px] text-healnari-purple" />
                          <span>{areaLabel}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 3. SECTION: WHO CAN HELP */}
                <section className="space-y-4 pt-2">
                  <div>
                    <span className="text-xs font-black text-healnari-purple uppercase tracking-wider block mb-0.5">
                      Step 3 • Find the Right Doctor
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                      WHO CAN HELP
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      You do not need to guess which doctor to see. Here are the healthcare professionals who specialize in these concerns, with our <strong>recommended starting point</strong>:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessmentResult.recommendedSpecialists.map(spec => (
                      <div
                        key={spec.id}
                        className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between text-left ${
                          spec.isPrimaryStartingPoint
                            ? 'border-healnari-purple ring-2 ring-purple-400/40'
                            : 'border-purple-100/90'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            {spec.isPrimaryStartingPoint ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm flex items-center gap-1">
                                <i className="fas fa-star text-[9px]" />
                                Recommended Starting Point
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {spec.tag || 'Specialist'}
                              </span>
                            )}
                            <i className={`fas ${spec.icon} text-healnari-purple text-sm`} />
                          </div>

                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                            {spec.name}
                          </h3>
                          
                          {/* Plain Language Specialist Description */}
                          <p className="text-xs sm:text-sm text-purple-900 font-bold italic mt-0.5">
                            {spec.plainLanguageDescription || spec.title}
                          </p>

                          <div className="mt-3 bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100/80">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900/70 block mb-0.5">
                              Why this specialist is relevant for you:
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
                            <span>Talk to a {spec.name}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. SECTION: WHAT YOU CAN DO NEXT (5-STEP CARE PATHWAY) */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100/90 shadow-card space-y-6">
                  <div>
                    <span className="text-xs font-black text-healnari-purple uppercase tracking-wider block mb-0.5">
                      Step 4 • Actionable Plan
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                      WHAT YOU CAN DO NEXT
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Follow these 5 clear steps to move from symptom awareness to personalized clinical care:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      { step: '1', title: 'Talk to a specialist', desc: `Book a consultation with a recommended ${assessmentResult.primarySpecialist?.name || 'Doctor'} to assess your symptoms.` },
                      { step: '2', title: 'Learn more', desc: 'Read the patient education guides below to understand why these symptoms happen and what to expect.' },
                      { step: '3', title: 'Prepare for consultation', desc: 'Review the questions to ask your doctor and note down your cycle dates and timeline.' },
                      { step: '4', title: 'Get general wellness guidance', desc: 'Explore gentle, evidence-based movement routines tailored to your comfort.' },
                      { step: '5', title: 'Book a consultation', desc: 'Schedule a confidential video appointment with a verified healthcare professional.' }
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
                        className="bg-gradient-to-r from-purple-700 via-healnari-purple to-magenta-600 hover:from-purple-800 hover:to-magenta-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 flex-grow sm:flex-grow-0"
                      >
                        <i className="fas fa-calendar-check" />
                        <span>Talk to a Specialist</span>
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
                        className="bg-purple-50 hover:bg-purple-100 text-healnari-purple font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0 border border-purple-200"
                      >
                        <i className="fas fa-bookmark text-healnari-purple" />
                        <span>Save My Results</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintSummary}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 flex-grow sm:flex-grow-0"
                        title="Print or save as PDF"
                      >
                        <i className="fas fa-print" />
                        <span>Print Summary</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 5. SECTION: WHAT A DOCTOR MAY EVALUATE */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100/90 shadow-card space-y-5">
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
                  <div className="bg-purple-50/80 border border-purple-200 rounded-3xl p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                          <i className="fas fa-circle-question text-healnari-purple" />
                          Questions you can ask your doctor at your consultation:
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                          Check off to remember or copy to take to your appointment
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyDoctorQuestions}
                        className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-1.5 shrink-0 ${
                          copiedQuestions
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-purple-100 text-healnari-purple border border-purple-200'
                        }`}
                      >
                        <i className={`fas ${copiedQuestions ? 'fa-check' : 'fa-copy'} text-[11px]`} />
                        <span>{copiedQuestions ? 'Questions Copied!' : 'Copy Questions'}</span>
                      </button>
                    </div>

                    <ul className="space-y-2">
                      {assessmentResult.clinicalEvaluationOverview.questionsToAskDoctor.map((q, idx) => {
                        const isChecked = Boolean(checkedDoctorQuestions[idx]);
                        return (
                          <li
                            key={idx}
                            onClick={() => toggleDoctorQuestion(idx)}
                            className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                              isChecked ? 'bg-white text-purple-900 font-bold shadow-sm' : 'text-slate-700 hover:bg-white/60'
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

                {/* 6. SECTION: CONDITIONS WORTH DISCUSSING (PATIENT EDUCATION GUIDES) */}
                <section className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-healnari-purple uppercase tracking-wider block mb-1">
                      Patient Education Guides
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
                        className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100/90 shadow-card hover:shadow-card-hover hover:border-purple-300 transition-all flex flex-col justify-between"
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
                            <span>Read 5-Question Education Guide</span>
                            <i className="fas fa-chevron-right text-[10px]" />
                          </button>
                        </div>
                      </div>
                    ))}
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
                      <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-white/10 text-magenta-300 border border-white/10">
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
                          className="bg-gradient-to-r from-healnari-purple to-magenta-600 hover:from-aubergine-600 hover:to-magenta-700 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm flex items-center gap-2"
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

      {/* ── FLOATING SMART ACTION DOCK (Luxury Glass Capsule) ─────────── */}
      {currentStep === 1 && selectedSymptoms.length > 0 && (
        <div className="fixed bottom-5 inset-x-3 sm:inset-x-6 z-40 max-w-4xl mx-auto smart-dock animate-slide-up">
          <div className="bg-white/95 backdrop-blur-xl border border-purple-200/90 shadow-[0_16px_50px_rgba(42,22,71,0.2)] rounded-3xl p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-md">
                {selectedSymptoms.length}
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  {selectedSymptoms.length} {selectedSymptoms.length === 1 ? 'health concern' : 'health concerns'} selected
                </p>
                <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                  Ready to review clinical context and relevant health areas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSymptoms([])}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-full transition-colors hidden sm:inline-block hover:bg-slate-100"
              >
                Clear
              </button>
              
              <button
                type="button"
                onClick={handleProceedToStep2}
                className="bg-gradient-to-r from-purple-700 via-healnari-purple to-magenta-600 hover:from-purple-800 hover:to-magenta-700 text-white font-extrabold text-xs sm:text-sm px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl shadow-lg shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>Continue to Context (Step 2)</span>
                <i className="fas fa-arrow-right text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="fixed bottom-5 inset-x-3 sm:inset-x-6 z-40 max-w-4xl mx-auto smart-dock animate-slide-up">
          <div className="bg-white/95 backdrop-blur-xl border border-purple-200/90 shadow-[0_16px_50px_rgba(42,22,71,0.2)] rounded-3xl p-3 sm:p-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-arrow-left text-xs" />
              <span>Back to Symptoms</span>
            </button>

            <button
              type="button"
              onClick={handleProceedToStep3}
              className="bg-gradient-to-r from-purple-700 via-healnari-purple to-magenta-600 hover:from-purple-800 hover:to-magenta-700 text-white font-extrabold text-xs sm:text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl shadow-lg shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>View My Health Snapshot</span>
              <i className="fas fa-arrow-right text-xs" />
            </button>
          </div>
        </div>
      )}

      {/* ── EXPANDABLE PATIENT-FRIENDLY CONDITION MODAL (5 QUESTIONS) ───── */}
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

            {/* 1. What is this problem? */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-black uppercase tracking-wider text-healnari-purple mb-1 flex items-center gap-1.5">
                <i className="fas fa-circle-question text-[11px]" />
                <span>1. What is this problem?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {activeConditionModal.patientEducation?.whatIsIt || activeConditionModal.description}
              </p>
            </div>

            {/* 2. What can cause it? */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <h4 className="text-xs font-black uppercase tracking-wider text-healnari-purple mb-1.5 flex items-center gap-1.5">
                <i className="fas fa-dna text-[11px]" />
                <span>2. What can cause it?</span>
              </h4>
              {activeConditionModal.possibleCauses && activeConditionModal.possibleCauses.length > 0 ? (
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                  {activeConditionModal.possibleCauses.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-healnari-purple font-bold">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {activeConditionModal.patientEducation?.whyMightItRelateToMySymptoms || 'Several interconnected hormonal, nutritional, lifestyle, or environmental factors can contribute.'}
                </p>
              )}
            </div>

            {/* 3. When should I talk to a doctor? */}
            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1.5">
                <i className="fas fa-triangle-exclamation text-[11px] text-rose-600" />
                <span>3. When should I talk to a doctor?</span>
              </h4>
              <p className="text-xs sm:text-sm text-rose-950 leading-relaxed font-medium">
                {activeConditionModal.patientEducation?.whenShouldISeekMedicalAttention || 'Seek medical consultation if symptoms persist for several cycles, worsen over time, or interfere with daily comfort.'}
              </p>
            </div>

            {/* 4. Which specialist may help? */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 mb-1 flex items-center gap-1.5">
                <i className="fas fa-user-doctor text-[11px] text-healnari-purple" />
                <span>4. Which specialist may help?</span>
              </h4>
              <p className="text-sm font-extrabold text-slate-900">
                {activeConditionModal.specialist?.primary || 'Gynaecologist'}
              </p>
              <p className="text-xs text-slate-600 mt-1 italic leading-relaxed">
                {activeConditionModal.patientEducation?.whatSpecialistEvaluatesIt || 'A doctor who specializes in evaluating and treating these specific symptoms safely.'}
              </p>
            </div>

            {/* 5. What can I do next? */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-200 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                <i className="fas fa-arrow-right-long text-[11px] text-healnari-purple" />
                <span>5. What can I do next?</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consult a verified clinician to evaluate your symptoms, order relevant tests, and establish a personalized care plan.
              </p>
              <button
                type="button"
                onClick={() => {
                  const specName = activeConditionModal.specialist?.primary || 'Specialist';
                  setActiveConditionModal(null);
                  handleBookSpecialist({ name: specName, title: specName });
                }}
                className="w-full bg-gradient-to-r from-purple-700 via-healnari-purple to-magenta-600 hover:from-purple-800 hover:to-magenta-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <i className="fas fa-calendar-check" />
                <span>Talk to a {activeConditionModal.specialist?.primary || 'Specialist'}</span>
              </button>
            </div>

            {/* Non-Diagnostic Disclaimer */}
            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <i className="fas fa-shield-halved text-amber-600 mt-0.5 shrink-0" />
              <span>
                {activeConditionModal.disclaimer || 'This guide is for patient education only and does not constitute a medical diagnosis. Only a qualified clinician can determine if criteria are met.'}
              </span>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActiveConditionModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close Guide
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
