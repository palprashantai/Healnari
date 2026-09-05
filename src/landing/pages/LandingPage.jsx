import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import Reveal from '../../components/Reveal.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import PromoBanner from '../components/PromoBanner.jsx';
import LazyRender from '../../components/LazyRender.jsx';
import AppInstallToast from '../components/AppInstallToast.jsx';
import { apiFetch } from '../../lib/apiClient.js';

// Lazy load modals and heavy tools to drastically reduce main thread blocking (INP)
const BookingModal = lazy(() => import('../../tools/BookingModal.jsx'));
const SuccessModal = lazy(() => import('../../tools/SuccessModal.jsx'));
const AuthModal = lazy(() => import('../../tools/AuthModal.jsx'));
const ExitIntentModal = lazy(() => import('../components/ExitIntentModal.jsx'));
const FloatingCTA = lazy(() => import('../../tools/FloatingCTA.jsx'));

// Lazy load below-the-fold and modal components
const Stats = lazy(() => import('../components/Stats.jsx'));
const HowItWorks = lazy(() => import('../components/HowItWorks.jsx'));
const Conditions = lazy(() => import('../components/Conditions.jsx'));
const PcosDiagram = lazy(() => import('../components/PcosDiagram.jsx'));
const Doctors = lazy(() => import('../components/Doctors.jsx'));
const Outcomes = lazy(() => import('../components/Outcomes.jsx'));
const Testimonials = lazy(() => import('../components/Testimonials.jsx'));
const Faq = lazy(() => import('../components/Faq.jsx'));
const Footer = lazy(() => import('../components/Footer.jsx'));
const SymptomChecker = lazy(() => import('../../tools/SymptomChecker.jsx'));
const HealthTips = lazy(() => import('../../tools/HealthTips.jsx'));
const CycleTracker = lazy(() => import('../../tools/CycleTracker.jsx'));
const NewsletterSignup = lazy(() => import('../components/NewsletterSignup.jsx'));
const LabTests = lazy(() => import('../components/LabTests.jsx'));
const HolisticApproach = lazy(() => import('../components/HolisticApproach.jsx'));
const PatientAiShowcase = lazy(() => import('../components/PatientAiShowcase.jsx'));
const AiChatWidget = lazy(() => import('../../tools/AiChatWidget.jsx'));

function LandingPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);

  useEffect(() => {
    // Analytics
    
    // Analytics
    import('../../lib/analytics.js').then(({ trackEvent, AnalyticsEvents }) => {
      trackEvent(AnalyticsEvents.LANDING_VIEWED, { funnel: 'patient' });
    });

    // Dynamic SEO, OpenGraph & Structured Data Schema Injection
    const originalTitle = document.title;
    const docTitle = "Consult Gynecologists, PCOS Specialists & Women's Health Doctors Online | HealNari";
    const docDesc = "Book 45-min video consultations with verified Gynecologists, PCOS Specialists, Endocrinologists, Dermatologists & Dietitians. Personalized root-cause care, lab roadmap, custom diet/yoga & 14-day free chat follow-up.";
    const docUrl = "https://healnari.care";

    document.title = docTitle;

    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      const original = el ? el.getAttribute(attr) : null;
      if (el) el.setAttribute(attr, content);
      return { el, original };
    };

    const prevDesc = updateMeta('meta[name="description"]', docDesc);
    const prevOgTitle = updateMeta('meta[property="og:title"]', docTitle);
    const prevOgDesc = updateMeta('meta[property="og:description"]', docDesc);
    const prevOgUrl = updateMeta('meta[property="og:url"]', docUrl);
    const prevCanonical = updateMeta('link[rel="canonical"]', docUrl, 'href');

    // JSON-LD Structured Data Schema for Medical Clinic & Mobile Health Platform
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-patient-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MedicalClinic",
      "name": "HealNari",
      "url": "https://healnari.care",
      "logo": "https://healnari.care/brand/logo-full.jpg",
      "description": "Multi-specialty digital healthcare platform connecting patients with qualified specialists in Gynaecology, PCOS, Endocrinology, Dermatology, Hair & Scalp (Trichology), Clinical Nutrition, and Yoga.",
      "medicalSpecialty": [
        "https://schema.org/Gynecologic",
        "https://schema.org/Endocrine",
        "https://schema.org/Dermatology",
        "https://schema.org/DietNutrition"
      ],
      "availableService": [
        {
          "@type": "MedicalTest",
          "name": "Comprehensive Hormonal & Metabolic Blood Panels"
        },
        {
          "@type": "MedicalConsultation",
          "name": "Multi-Specialty Telemedicine Video Consultation"
        }
      ]
    });
    document.head.appendChild(schemaScript);

    const handleScroll = () => {
      setShowMobileBar(window.scrollY > 450);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Fetch landing settings
    apiFetch('/admin/public/landing-settings')
      .then(d => setAdminSettings(d))
      .catch(console.error);
      
    // Auto-open booking if requested via URL params
    const params = new URLSearchParams(window.location.search);
    const doctorParam = params.get('doctor') || params.get('book') || params.get('bookDoc');
    if (doctorParam) {
      openBooking(doctorParam);
    }
      
    return () => {
      document.title = originalTitle;
      if (prevDesc.el && prevDesc.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle.el && prevOgTitle.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc.el && prevOgDesc.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl.el && prevOgUrl.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical.el && prevCanonical.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
      window.removeEventListener('scroll', handleScroll);
      const existingSchema = document.getElementById('healnari-patient-schema');
      if (existingSchema) existingSchema.remove();
    };
  }, []);

  // Update SEO dynamically if configured in admin landing manager
  useEffect(() => {
    if (!adminSettings) return;
    const seo = adminSettings?.seoMetadata?.patient || adminSettings?.seoMetadata;
    if (seo?.metaTitle) {
      document.title = seo.metaTitle;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', seo.metaTitle);
    }
    if (seo?.metaDesc) {
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', seo.metaDesc);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', seo.metaDesc);
    }
  }, [adminSettings]);

  const openBooking = (docName = '') => {
    import('../../lib/analytics.js').then(({ trackEvent, AnalyticsEvents }) => {
      trackEvent(AnalyticsEvents.BOOKING_MODAL_OPENED, { doctor: docName, source: 'patient_landing' });
    });
    setSelectedDoctor(docName);
    setIsBookingOpen(true);
  };

  const closeBooking = () => {
    setIsBookingOpen(false);
    setSelectedDoctor('');
  };

  const handleBookingSuccess = (details) => {
    import('../../lib/analytics.js').then(({ trackEvent, AnalyticsEvents }) => {
      trackEvent(AnalyticsEvents.BOOKING_SUCCESS, { doctor: details?.doctor, appointmentId: details?.id });
    });
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  const resetFlow = () => {
    setConfirmedDetails(null);
    setIsSuccessOpen(false);
  };

  // Smoothly scroll to anchor if URL has hash (e.g. /#conditions or /#how-it-works)
  useEffect(() => {
    const scrollToHash = () => {
      if (window.location.hash) {
        const targetId = window.location.hash.replace('#', '');
        const element = document.getElementById(targetId);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  const dynamicPricing = adminSettings?.pricingAmount || 799;

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden w-full max-w-[100vw]">
      <ScrollProgressBar />

      {adminSettings?.toggles?.showEmergencyBanner && (
        <PromoBanner text={adminSettings?.announcements?.emergencyText || "Emergency telemedicine slots are currently available."} type="emergency" />
      )}
      {(adminSettings?.toggles?.showPromoBanner !== false && adminSettings?.promoText) && (
        <PromoBanner text={adminSettings.promoText} type="promo" />
      )}

      <Header
        onStartConsult={() => openBooking('')} 
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      
      <main className="flex-grow">
        <Hero 
          onStartConsult={() => openBooking('')} 
          onOpenChecker={() => setIsSymptomOpen(true)} 
          title={adminSettings?.heroTitle}
          subtitle={adminSettings?.heroSubtitle}
        />
        
        <Suspense fallback={<div className="h-32 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}>
          {adminSettings?.toggles?.showStats !== false && (
            <Reveal><Stats /></Reveal>
          )}

          {adminSettings?.toggles?.showConditions !== false && (
            <Conditions />
          )}

          {adminSettings?.toggles?.showFeaturedDoctors !== false && (
            <Doctors onSelectDoctor={openBooking} />
          )}

          {adminSettings?.toggles?.showPcosDiagram !== false && (
            <Reveal><PcosDiagram /></Reveal>
          )}

          {adminSettings?.toggles?.showHolisticApproach !== false && (
            <Reveal><HolisticApproach /></Reveal>
          )}

          {adminSettings?.toggles?.showHowItWorks !== false && (
            <Reveal><HowItWorks /></Reveal>
          )}

          {/* Dedicated AI Health Suite Showcase */}
          {adminSettings?.toggles?.showAiShowcase !== false && (
            <PatientAiShowcase 
              onStartConsult={() => openBooking('')} 
              onOpenChecker={() => setIsSymptomOpen(true)} 
            />
          )}

          {adminSettings?.toggles?.showOutcomes !== false && (
            <Reveal><Outcomes /></Reveal>
          )}

          {adminSettings?.toggles?.showTestimonials !== false && (
            <Reveal><Testimonials reviews={adminSettings?.testimonials?.patient} /></Reveal>
          )}

          {adminSettings?.toggles?.showCycleTracker !== false && (
            <Reveal><CycleTracker /></Reveal>
          )}

          {adminSettings?.toggles?.showLabTests !== false && (
            <Reveal><LabTests onBook={openBooking} /></Reveal>
          )}

          {adminSettings?.toggles?.showHealthTips !== false && (
            <Reveal><HealthTips onStartConsult={() => openBooking('')} /></Reveal>
          )}

          {/* Customized Premium Inline CTA Section */}
          {adminSettings?.toggles?.showPricing !== false && (
            <section className="max-w-6xl mx-auto px-5 md:px-8 py-10">
              <Reveal>
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-10 sm:px-8 sm:py-12 md:p-16 text-center text-white shadow-xl glow-purple">
                  {/* Background design accents */}
                  <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 rounded-full bg-violet-600/10 blur-2xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 rounded-full bg-indigo-500/15 blur-2xl"></div>
                  
                  <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 bg-brand-800/60 backdrop-blur border border-brand-700 text-brand-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      <i className="fas fa-percent text-emerald-400"></i> Introductory Offer
                    </span>
                    <div className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white font-display">
                      Discuss your concerns with an expert for just <span className="underline decoration-white/40 decoration-wavy">₹{dynamicPricing}</span>
                    </div>
                    <p className="text-white/90 text-base max-w-xl mx-auto leading-relaxed font-medium">
                      Includes: <strong>45-min video call</strong> with a specialist doctor + personalised <strong>lab-test roadmap</strong> + <strong>diet & lifestyle protocol</strong> + <strong>digital prescription</strong> + 14-day free chat follow-up. No surprise charges. <br/> <span className="text-brand-100 text-sm mt-1 inline-block"><i className="fas fa-globe-americas"></i> Available globally across all timezones.</span>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
                      <button 
                        onClick={() => openBooking('')}
                        className="w-full sm:w-auto bg-white text-brand-900 hover:bg-indigo-50 font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all btn-interactive flex items-center justify-center gap-2 text-base md:text-lg"
                      >
                        <i className="fas fa-calendar-check"></i> Book My ₹{dynamicPricing} Consult
                      </button>
                      <button
                        onClick={() => setIsSymptomOpen(true)}
                        className="w-full sm:w-auto bg-brand-800/40 hover:bg-brand-800/60 border border-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all btn-interactive flex items-center justify-center gap-2 text-base md:text-lg"
                      >
                        <i className="fas fa-heart-pulse"></i> Not sure? Check symptoms free
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 pt-4 text-xs font-semibold text-white/90">
                      <span className="flex items-center gap-1.5"><i className="fas fa-video text-brand-100"></i> 45-Min Video Consult</span>
                      <span className="flex items-center gap-1.5"><i className="fas fa-shield-halved text-brand-100"></i> Encrypted & Confidential</span>
                      <span className="flex items-center gap-1.5"><i className="fas fa-comment-medical text-brand-100"></i> 14-Day Free Chat Follow-Up</span>
                    </div>

                  </div>
                </div>
              </Reveal>
            </section>
          )}

          {adminSettings?.toggles?.showFaq !== false && (
            <Reveal><Faq faqs={adminSettings?.faqs?.patient} /></Reveal>
          )}

          {adminSettings?.toggles?.showNewsletter !== false && (
            <Reveal><NewsletterSignup /></Reveal>
          )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      {/* Floating WhatsApp / Call CTA */}
      {adminSettings?.toggles?.showFloatingCTA !== false && (
        <Suspense fallback={null}>
          <FloatingCTA onBook={openBooking} />
        </Suspense>
      )}

      {/* Floating Bottom Sticky Bar on Mobile (Natural Thumb Zone for Patients) */}
      {showMobileBar && (
        <div className="md:hidden fixed bottom-4 inset-x-4 z-40 animate-slide-up">
          <div className="bg-slate-900/95 backdrop-blur-lg border border-sand-200/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="min-w-0 pl-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">Next Slot: Today</span>
              <p className="text-xs font-bold text-slate-200 truncate">45-Min Detailed Video Call</p>
            </div>
            <button
              onClick={() => openBooking('')}
              className="bg-gradient-to-r from-aubergine-500 to-magenta-600 hover:from-aubergine-600 hover:to-magenta-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-transform hover:scale-105 shrink-0 flex items-center gap-1.5"
            >
              <i className="fas fa-stethoscope text-[10px]"></i> Book ₹{dynamicPricing}
            </button>
          </div>
        </div>
      )}

      {/* Booking Form Overlay */}
      {isBookingOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        }>
          <BookingModal 
            selectedDoc={selectedDoctor} 
            onClose={closeBooking} 
            onSuccess={handleBookingSuccess} 
          />
        </Suspense>
      )}

      {/* Success Booking Overlay */}
      {isSuccessOpen && confirmedDetails && (
        <Suspense fallback={null}>
          <SuccessModal 
            details={confirmedDetails} 
            onClose={resetFlow} 
          />
        </Suspense>
      )}

      {/* Authentication Modal */}
      {isAuthOpen && (
        <Suspense fallback={null}>
          <AuthModal 
            onClose={() => setIsAuthOpen(false)} 
            onSuccess={() => setIsAuthOpen(false)}
          />
        </Suspense>
      )}

      {/* Dynamic Symptom Checker / Health Assessment Wizard */}
      {isSymptomOpen && (
        <Suspense fallback={null}>
          <SymptomChecker 
            onClose={() => setIsSymptomOpen(false)} 
            onBook={openBooking} 
          />
        </Suspense>
      )}

      {/* Exit Intent Lead Capture */}
      {!isBookingOpen && !isSuccessOpen && !isAuthOpen && !isSymptomOpen && (
        <Suspense fallback={null}>
          <ExitIntentModal />
        </Suspense>
      )}

      {/* Install-the-app prompt */}
      {!isBookingOpen && !isSuccessOpen && !isAuthOpen && !isSymptomOpen && (
        <AppInstallToast />
      )}

      {/* AI Assistant */}
      <Suspense fallback={null}>
        <AiChatWidget context="landing" />
      </Suspense>
    </div>
  );
}

export default LandingPage;
