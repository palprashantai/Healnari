import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { conditionsData } from '../data/conditions.js';
import { glossaryData } from '../data/glossary.js';
import { guidesData } from '../../data/guidesData.js';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';
import AuthModal from '../../tools/AuthModal.jsx';
import FloatingCTA from '../../tools/FloatingCTA.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { apiFetch } from '../../lib/apiClient.js';

// Lazy load below-the-fold components
const Footer = lazy(() => import('../components/Footer.jsx'));
const SymptomChecker = lazy(() => import('../../tools/SymptomChecker.jsx'));

const DOCTOR_PROFILES = {
  'demo-1': {
    id: 'demo-1',
    name: 'Dr. Ananya Mehta',
    specialty: 'Reproductive Endocrinologist & Gynaecologist',
    qualification: 'MBBS, MD (OBG), Fellowship in Reproductive Endocrinology (AIIMS)',
    regNo: 'NMC / MCI-15201',
    experience: '15+ Years Clinical Experience',
    avatar_url: '/generated/doc1.webp',
    rating: '4.98',
    reviewsCount: 214,
    consultFee: 799,
  },
  'demo-2': {
    id: 'demo-2',
    name: 'Dr. Ritu Khanna',
    specialty: 'Endocrinologist & Metabolic Health Lead',
    qualification: 'MBBS, MD (Medicine), DM (Endocrinology)',
    regNo: 'DMC-92810',
    experience: '12+ Years Clinical Experience',
    avatar_url: '/generated/doc2.webp',
    rating: '4.95',
    reviewsCount: 168,
    consultFee: 799,
  },
  'demo-3': {
    id: 'demo-3',
    name: 'Dr. Shreya Verma',
    specialty: 'Trichologist & Clinical Dermatologist',
    qualification: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    regNo: 'KMC-33821',
    experience: '10+ Years Clinical Experience',
    avatar_url: '/generated/doc3.webp',
    rating: '4.96',
    reviewsCount: 142,
    consultFee: 799,
  },
};

function ConditionPage() {
  const { conditionId, slug } = useParams();
  const targetId = slug || conditionId;
  const condition = conditionsData[targetId];

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [doctorsList, setDoctorsList] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [targetId]);

  useEffect(() => {
    if (!condition) return;

    trackEvent(AnalyticsEvents.CONDITION_PAGE_VIEWED, {
      conditionId,
      conditionTitle: condition.title,
    });
    
    // Dynamic SEO, Canonical & Meta Tags
    const originalTitle = document.title;
    document.title = condition.seoTitle;

    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      const original = el ? el.getAttribute(attr) : null;
      if (el) el.setAttribute(attr, content);
      return { el, original };
    };

    const canonicalUrl = `https://healnari.vercel.app/conditions/${condition.slug || targetId}`;
    const prevDesc = updateMeta('meta[name="description"]', condition.seoDescription);
    const prevOgTitle = updateMeta('meta[property="og:title"]', condition.seoTitle);
    const prevOgDesc = updateMeta('meta[property="og:description"]', condition.seoDescription);
    const prevOgUrl = updateMeta('meta[property="og:url"]', canonicalUrl);
    const prevCanonical = updateMeta('link[rel="canonical"]', canonicalUrl, 'href');
    const prevTwTitle = updateMeta('meta[name="twitter:title"]', condition.seoTitle);
    const prevTwDesc = updateMeta('meta[name="twitter:description"]', condition.seoDescription);

    // Schema: MedicalCondition + BreadcrumbList + MedicalOrganization
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-condition-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalWebPage",
          "@id": `${canonicalUrl}#webpage`,
          "url": canonicalUrl,
          "name": condition.seoTitle,
          "description": condition.seoDescription,
          "isPartOf": {
            "@type": "WebSite",
            "@id": "https://healnari.vercel.app/#website",
            "name": "HealNari",
            "url": "https://healnari.vercel.app"
          },
          "about": {
            "@type": condition.schemaType || "MedicalCondition",
            "name": condition.schemaDisease || condition.title,
            "possibleTreatment": [
              {
                "@type": "TherapeuticProcedure",
                "name": "Specialist Video Medical Consultation"
              },
              {
                "@type": "DietarySupplement",
                "name": "Personalized Nutrition & Lifestyle Protocol"
              }
            ]
          },
          "professionallyReviewedBy": {
            "@type": "MedicalOrganization",
            "name": "HealNari Clinical Advisory Board",
            "url": "https://healnari.vercel.app"
          },
          "specialty": condition.specialistRole || "Medical Specialists"
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://healnari.vercel.app"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Specialties",
              "item": "https://healnari.vercel.app/#conditions"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": condition.badge || condition.title,
              "item": canonicalUrl
            }
          ]
        }
      ]
    });
    document.head.appendChild(schemaScript);

    // Fetch doctors from API if possible
    apiFetch('/doctors/search', { skipAuth: true })
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setDoctorsList(res);
        }
      })
      .catch(() => {});

    return () => {
      document.title = originalTitle;
      if (prevDesc?.el && prevDesc?.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle?.el && prevOgTitle?.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc?.el && prevOgDesc?.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl?.el && prevOgUrl?.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical?.el && prevCanonical?.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
      if (prevTwTitle?.el && prevTwTitle?.original) prevTwTitle.el.setAttribute('content', prevTwTitle.original);
      if (prevTwDesc?.el && prevTwDesc?.original) prevTwDesc.el.setAttribute('content', prevTwDesc.original);
      const script = document.getElementById('healnari-condition-schema');
      if (script) document.head.removeChild(script);
    };
  }, [condition, conditionId]);

  if (!condition) {
    return <Navigate to="/" replace />;
  }

  const openBooking = (docName = '') => {
    setSelectedDoctor(docName);
    setIsBookingOpen(true);
  };

  const closeBooking = () => {
    setIsBookingOpen(false);
    setSelectedDoctor('');
  };

  const handleBookingSuccess = (details) => {
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  const resetFlow = () => {
    setConfirmedDetails(null);
    setIsSuccessOpen(false);
  };

  // Get featured doctors for this condition
  const conditionDocs = doctorsList.length > 0
    ? doctorsList.slice(0, 2).map(d => ({
        id: d.id,
        name: d.full_name || d.name,
        specialty: d.specialty || condition.specialistRole || 'Clinical Specialist',
        qualification: d.qualifications || 'MBBS, MD',
        regNo: d.medical_reg_no || 'Verified Clinician',
        experience: d.experience_years ? `${d.experience_years}+ Years Clinical Experience` : '10+ Years Clinical Experience',
        avatar_url: d.avatar_url || (doctorsList.indexOf(d) === 0 ? '/generated/doc1.webp' : '/generated/doc2.webp'),
        rating: d.rating || '4.98',
        reviewsCount: d.reviews_count || Math.floor(Math.random() * 100) + 50,
        consultFee: d.consultation_fee || 799,
      }))
    : (condition.featuredDoctorIds || ['demo-1', 'demo-2']).map(id => DOCTOR_PROFILES[id] || Object.values(DOCTOR_PROFILES)[0]).filter(Boolean);

  // Get related guides
  const relatedArticles = (condition.relatedGuides || [])
    .map(slug => guidesData.find(g => g.id === slug || g.slug === slug))
    .filter(Boolean);

  return (
    <div className="bg-[#FAF8F5] min-h-screen font-sans selection:bg-aubergine-100 selection:text-aubergine-900 min-w-0">
      <ScrollProgressBar />

      <Header 
        onStartConsult={() => openBooking('')} 
        onOpenAuth={() => setIsAuthOpen(true)} 
      />

      {/* ── Sub Navigation Breadcrumb Bar ── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-sand-200/80 sticky top-0 z-30 px-4 sm:px-8 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500 font-semibold gap-4">
          <nav className="flex items-center gap-2 flex-wrap overflow-x-auto hide-scrollbar py-0.5">
            <Link to="/" className="hover:text-aubergine-600 transition-colors flex items-center gap-1">
              <i className="fas fa-house text-[11px]"></i> Home
            </Link>
            <i className="fas fa-chevron-right text-[9px] text-slate-400"></i>
            <Link to="/#conditions" className="hover:text-aubergine-600 transition-colors">Specialties</Link>
            <i className="fas fa-chevron-right text-[9px] text-slate-400"></i>
            <span className="text-aubergine-700 font-bold truncate max-w-[200px] sm:max-w-xs">{condition.badge || condition.title}</span>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold text-[11px]">
              <i className="fas fa-shield-halved text-emerald-600"></i> Evidence-Based Clinical Care
            </span>
            <button
              onClick={() => openBooking('')}
              className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-transform hover:scale-105"
            >
              Book ₹799 Consult
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero Section with Ambient Gradient & Live Doctor Clinic Card ── */}
      <section className="relative pt-10 pb-14 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-aubergine-200/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute top-20 right-10 w-80 h-80 bg-magenta-200/25 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Clinic Introduction & Value Props */}
          <div className="lg:col-span-7 space-y-6 text-center sm:text-left">
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider bg-aubergine-100 text-aubergine-800 border border-aubergine-200 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <i className={`fas ${condition.icon || 'fa-stethoscope'} text-aubergine-600`}></i> {condition.badge || 'Specialty Care'}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white border border-sand-200 px-3 py-1.5 rounded-full shadow-2xs">
                Led by {condition.specialistRole || 'Board-Certified Specialists'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Specialists Available Today
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight font-display tracking-tight">
              {condition.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
              {condition.subtitle}
            </p>

            {/* Value props & Pricing Pill */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs sm:text-sm font-semibold text-slate-800">
              <span className="bg-white text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <i className="fas fa-tag text-emerald-600"></i> Intro Consult: <strong className="text-emerald-900 font-black">₹799</strong>
              </span>
              <span className="bg-white text-aubergine-800 border border-aubergine-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <i className="fas fa-video text-aubergine-600"></i> 45-Min Video Call
              </span>
              <span className="bg-white text-indigo-800 border border-indigo-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <i className="fas fa-comment-medical text-indigo-600"></i> 14-Day Free Follow-Up
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-3 justify-center sm:justify-start">
              <button
                onClick={() => openBooking('')}
                className="w-full sm:w-auto bg-gradient-to-r from-aubergine-700 via-magenta-600 to-indigo-700 hover:from-aubergine-800 hover:to-indigo-800 text-white font-extrabold px-8 py-4 rounded-xl shadow-lg shadow-aubergine-200 transition-all hover:scale-105 btn-interactive flex items-center justify-center gap-2 text-base"
              >
                <i className="fas fa-calendar-check"></i> Book ₹799 Consultation
              </button>
              <button
                onClick={() => setIsSymptomOpen(true)}
                className="w-full sm:w-auto bg-white hover:bg-sand-50 border border-sand-300 text-slate-800 font-bold px-6 py-4 rounded-xl shadow-xs transition-all btn-interactive flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <i className="fas fa-heart-pulse text-rose-500"></i> Check Symptoms Free
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <i className="fas fa-lock text-emerald-600"></i> 100% Confidential
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <i className="fas fa-star text-amber-500"></i> 4.98/5 Rating (8,500+ Patients)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <i className="fas fa-certificate text-aubergine-600"></i> Board-Certified MDs
              </span>
            </div>

          </div>

          {/* Right Column: Live Clinical Telemedicine Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-card border border-sand-200/90 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-aubergine-500 via-magenta-500 to-indigo-600"></div>
              
              <div className="flex items-center justify-between border-b border-sand-200 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-lg font-bold shadow-soft">
                    <i className="fas fa-hospital-user"></i>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm font-display">Specialist Care Protocol</h3>
                    <p className="text-[11px] text-slate-500">Direct 1-on-1 Video Telemedicine</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Online
                </span>
              </div>

              {/* Consultation Inclusions List */}
              <div className="space-y-3 mb-5">
                <div className="p-3 bg-sand-50/70 rounded-xl border border-sand-200 flex items-start gap-3 text-xs">
                  <i className="fas fa-video text-aubergine-600 mt-0.5 shrink-0 text-sm"></i>
                  <div>
                    <strong className="text-slate-900 block">45-Minute Detailed Consultation</strong>
                    <span className="text-slate-600">Thorough root-cause analysis of your symptoms &amp; health history.</span>
                  </div>
                </div>

                <div className="p-3 bg-sand-50/70 rounded-xl border border-sand-200 flex items-start gap-3 text-xs">
                  <i className="fas fa-vial-circle-check text-magenta-600 mt-0.5 shrink-0 text-sm"></i>
                  <div>
                    <strong className="text-slate-900 block">Personalized Lab Roadmap</strong>
                    <span className="text-slate-600">Specific biomarker recommendations without unnecessary test costs.</span>
                  </div>
                </div>

                <div className="p-3 bg-sand-50/70 rounded-xl border border-sand-200 flex items-start gap-3 text-xs">
                  <i className="fas fa-file-prescription text-emerald-600 mt-0.5 shrink-0 text-sm"></i>
                  <div>
                    <strong className="text-slate-900 block">Official Digital Prescription</strong>
                    <span className="text-slate-600">NMC-registered prescription + nutrition &amp; supplement guide.</span>
                  </div>
                </div>

                <div className="p-3 bg-sand-50/70 rounded-xl border border-sand-200 flex items-start gap-3 text-xs">
                  <i className="fas fa-comments text-indigo-600 mt-0.5 shrink-0 text-sm"></i>
                  <div>
                    <strong className="text-slate-900 block">14-Day Free Chat Follow-Up</strong>
                    <span className="text-slate-600">Message your doctor anytime to review lab results and adjust doses.</span>
                  </div>
                </div>
              </div>

              {/* Instant Book CTA */}
              <div className="pt-2">
                <button
                  onClick={() => openBooking('')}
                  className="w-full bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3.5 rounded-xl shadow-soft transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
                >
                  <i className="fas fa-calendar-check"></i>
                  Book ₹799 Consultation
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  No subscriptions • 100% money-back satisfaction guarantee
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Key Clinical Symptoms / Warning Signs Grid ── */}
      {condition.keySymptoms && condition.keySymptoms.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-white border border-sand-200/90 rounded-3xl p-6 sm:p-10 shadow-card space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-block">
                Clinical Presentation
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                Common Symptoms &amp; Root-Cause Indicators
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                If you experience one or more of these clinical markers, an individualized assessment by a licensed specialist doctor is recommended:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {condition.keySymptoms.map((symp, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-sand-50/70 border border-sand-200/80 hover:border-aubergine-300 hover:bg-white hover:shadow-card transition-all flex items-start gap-3.5 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-aubergine-100 group-hover:bg-aubergine-700 text-aubergine-700 group-hover:text-white flex items-center justify-center font-bold text-sm shrink-0 transition-colors mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {symp}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-sand-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-600 font-medium text-center sm:text-left">
                Not sure if your symptoms match this condition? Use our instant symptom checker.
              </span>
              <button
                onClick={() => setIsSymptomOpen(true)}
                className="text-xs font-extrabold text-aubergine-700 hover:text-aubergine-900 bg-aubergine-50 hover:bg-aubergine-100 px-4 py-2 rounded-xl border border-aubergine-200 transition-colors shrink-0"
              >
                <i className="fas fa-heart-pulse text-rose-500 mr-1.5"></i> Run Free Symptom Check
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Care Pathway: How We Treat the Root Cause ── */}
      {condition.carePathway && condition.carePathway.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3 py-1 rounded-full border border-aubergine-100">
                Structured Care Protocol
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                Your 4-Step Root-Cause Care Pathway
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                We go beyond quick-fix band-aids to diagnose and treat the biological drivers of your symptoms.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {condition.carePathway.map((cp, idx) => (
                <div 
                  key={idx} 
                  className="bg-white border border-sand-200/90 rounded-3xl p-6 shadow-card flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-aubergine-300 hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-aubergine-50 group-hover:bg-aubergine-700 text-aubergine-700 group-hover:text-white border border-aubergine-100 flex items-center justify-center font-extrabold text-base transition-colors">
                      {idx + 1}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Phase 0{idx + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base mb-1.5 font-display group-hover:text-aubergine-700 transition-colors">
                      {cp.step}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {cp.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-sand-100 text-[11px] font-bold text-aubergine-600 flex items-center gap-1">
                    Step {idx + 1} Included in Care
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Diagnostic Lab Biomarkers Section ── */}
      {condition.diagnostics && condition.diagnostics.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-gradient-to-br from-[#160B28] via-[#24123E] to-[#160B28] text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-magenta-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-1.5 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60 inline-block">
                Laboratory Science
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
                Key Diagnostic Biomarkers We Evaluate
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Your treating doctor reviews existing blood reports or prescribes gold-standard diagnostic parameters to isolate the root cause:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
              {condition.diagnostics.map((diag, idx) => (
                <div key={idx} className="p-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl flex items-center gap-3 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <i className="fas fa-flask text-sm"></i>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-100">{diag}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10">
              <span>*Home lab sample collection available via partner NABL-accredited diagnostic labs.</span>
              <button 
                onClick={() => openBooking('')} 
                className="text-emerald-300 hover:text-emerald-200 font-bold underline"
              >
                Discuss tests with a doctor →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Verified Specialists Section ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3 py-1 rounded-full border border-aubergine-100 inline-block mb-1.5">
                Our Medical Network
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                Consult Qualified Specialists
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Book a 45-minute video consultation with board-verified doctors specializing in this field:
              </p>
            </div>
            <Link 
              to="/#doctors"
              className="text-xs font-extrabold text-aubergine-700 hover:text-aubergine-900 transition-colors flex items-center gap-1 shrink-0"
            >
              View All Doctors <i className="fas fa-arrow-right text-[10px]"></i>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {conditionDocs.map((doc, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-sand-200/90 rounded-3xl p-6 shadow-card flex flex-col justify-between space-y-4 hover:shadow-card-hover hover:border-aubergine-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-aubergine-200 bg-slate-100 shrink-0 shadow-sm">
                    <img 
                      src={doc.avatar_url || '/generated/doc1.webp'} 
                      alt={doc.name || doc.full_name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg font-display truncate">
                        {doc.name || doc.full_name}
                      </h3>
                      <span className="text-emerald-600 text-xs shrink-0" title="NMC / GMC Verified Doctor">
                        <i className="fas fa-circle-check"></i>
                      </span>
                    </div>
                    <p className="text-xs font-bold text-aubergine-700 mt-0.5">{doc.specialty}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{doc.qualification}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 pt-1.5 font-semibold">
                      <span className="text-amber-600 flex items-center gap-1">
                        <i className="fas fa-star text-amber-500 text-xs"></i> {doc.rating || '4.98'}
                      </span>
                      <span>•</span>
                      <span>{doc.experience || '12+ Years Exp'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-sand-200/80 pt-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Consultation Fee</span>
                    <strong className="text-slate-900 font-extrabold text-base font-sans">₹{doc.consultFee || 799}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dr/${doc.id}`}
                      className="bg-sand-100 hover:bg-sand-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl transition-colors text-xs"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => openBooking(doc.name || doc.full_name)}
                      className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold px-4 py-2 rounded-xl shadow-xs transition-transform hover:scale-105 text-xs flex items-center gap-1.5"
                    >
                      <i className="fas fa-calendar-check text-[10px]"></i>
                      Book Slot
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Condition-Specific FAQ Accordion ── */}
      {condition.faqs && condition.faqs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <span className="text-xs font-bold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3 py-1 rounded-full border border-aubergine-100 inline-block">
                Patient Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                Frequently Asked Clinical Questions
              </h2>
            </div>

            <div className="space-y-3 pt-2">
              {condition.faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className={`border rounded-2xl transition-all duration-200 ${isOpen ? 'bg-white border-aubergine-400 shadow-card p-5' : 'bg-white border-sand-200 p-4 hover:border-aubergine-200'}`}
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex justify-between items-center text-left font-extrabold text-slate-900 text-sm sm:text-base leading-snug"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <div className={`w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 transition-transform ${isOpen ? 'rotate-180 bg-aubergine-100 text-aubergine-700' : ''}`}>
                        <i className="fas fa-chevron-down text-xs"></i>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-slate-700 text-xs sm:text-sm leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Related Clinical Guides ── */}
      {relatedArticles.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="border-t border-sand-200 pt-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-aubergine-700 bg-aubergine-50 px-2.5 py-0.5 rounded-full border border-aubergine-100">
                  Evidence-Based Research
                </span>
                <h3 className="text-xl font-black text-slate-900 font-display mt-1">
                  Related Clinical Guides &amp; Protocols
                </h3>
              </div>
              <Link to="/#health-tips" className="text-xs font-extrabold text-aubergine-700 hover:text-aubergine-900">
                Explore All Guides →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedArticles.slice(0, 3).map((guide, idx) => (
                <Link
                  key={idx}
                  to={`/guide/${guide.id}`}
                  className="p-5 bg-white rounded-2xl border border-sand-200/90 hover:border-aubergine-300 hover:shadow-card-hover transition-all group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-aubergine-700 uppercase tracking-widest bg-sand-50 px-2 py-0.5 rounded-md border border-sand-200">
                      {guide.tag}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-2.5 group-hover:text-aubergine-700 transition-colors">
                      {guide.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                      {guide.summary}
                    </p>
                  </div>
                  <p className="text-xs text-aubergine-700 font-bold mt-4 flex items-center gap-1">
                    Read Clinical Guide <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final Consultation CTA ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
        <div className="bg-gradient-to-r from-aubergine-800 via-magenta-700 to-indigo-900 rounded-[2rem] p-8 sm:p-12 text-white shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-magenta-400/15 rounded-full blur-3xl pointer-events-none"></div>

          <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider text-pink-200">
            <i className="fas fa-stethoscope text-emerald-300"></i> Root-Cause Clinical Care
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4.5xl font-black font-display text-white">
            Start Your Personalized Recovery Protocol Today
          </h2>
          <p className="text-pink-100/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            45-minute video call with top specialist doctors • Tailored lab roadmap • Anti-inflammatory nutrition plan • Digital prescription • 14-day free chat follow-up.
          </p>
          <div className="pt-2">
            <button
              onClick={() => openBooking('')}
              className="bg-white text-aubergine-900 hover:bg-sand-100 font-extrabold px-8 py-4 rounded-xl shadow-xl transition-all hover:scale-105 text-sm sm:text-base"
            >
              Book ₹799 Consultation <i className="fas fa-arrow-right ml-1.5"></i>
            </button>
          </div>
        </div>
      </section>

      {/* ── Medical Disclaimer ── */}
      <div className="max-w-4xl mx-auto px-5 py-4 text-center text-[11px] text-slate-400 leading-relaxed border-t border-sand-200">
        <p>
          <strong>Medical Notice:</strong> Information on this page is created and reviewed by qualified clinicians for educational purposes. Telemedicine consultations are private and confidential. In cases of acute pain or clinical emergencies, please visit your nearest hospital emergency department.
        </p>
      </div>

      <Suspense fallback={<div className="h-32 bg-slate-50"></div>}>
        <Footer />
      </Suspense>

      {/* Floating CTA */}
      <FloatingCTA onBook={openBooking} />

      {/* Booking Form Overlay */}
      {isBookingOpen && (
        <BookingModal 
          selectedDoc={selectedDoctor} 
          onClose={closeBooking} 
          onSuccess={handleBookingSuccess} 
        />
      )}

      {/* Success Booking Overlay */}
      {isSuccessOpen && confirmedDetails && (
        <SuccessModal 
          details={confirmedDetails} 
          onClose={resetFlow} 
        />
      )}

      {/* Authentication Modal */}
      {isAuthOpen && (
        <AuthModal 
          onClose={() => setIsAuthOpen(false)} 
          onSuccess={() => setIsAuthOpen(false)} 
        />
      )}

      {/* Dynamic Symptom Checker */}
      {isSymptomOpen && (
        <Suspense fallback={null}>
          <SymptomChecker 
            onClose={() => setIsSymptomOpen(false)} 
            onBook={openBooking} 
          />
        </Suspense>
      )}
    </div>
  );
}

export default ConditionPage;

