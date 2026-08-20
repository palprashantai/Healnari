import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import { conditionsData } from '../data/conditions.js';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';
import AuthModal from '../../tools/AuthModal.jsx';
import FloatingCTA from '../../tools/FloatingCTA.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';

// Lazy load below-the-fold components
const HowItWorks = lazy(() => import('../components/HowItWorks.jsx'));
const Faq = lazy(() => import('../components/Faq.jsx'));
const Footer = lazy(() => import('../components/Footer.jsx'));
const SymptomChecker = lazy(() => import('../../tools/SymptomChecker.jsx'));

function ConditionPage() {
  const { conditionId } = useParams();
  const condition = conditionsData[conditionId];

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);

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

    const canonicalUrl = `https://healnari.care/${conditionId}`;
    const prevDesc = updateMeta('meta[name="description"]', condition.seoDescription);
    const prevOgTitle = updateMeta('meta[property="og:title"]', condition.seoTitle);
    const prevOgDesc = updateMeta('meta[property="og:description"]', condition.seoDescription);
    const prevOgUrl = updateMeta('meta[property="og:url"]', canonicalUrl);
    const prevCanonical = updateMeta('link[rel="canonical"]', canonicalUrl, 'href');

    // Schema
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-condition-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": condition.schemaType || "MedicalCondition",
      "name": condition.schemaDisease,
      "description": condition.seoDescription,
      "url": canonicalUrl,
      "possibleTreatment": [
        {
          "@type": "TherapeuticProcedure",
          "name": "Specialist Video Medical Consultation"
        },
        {
          "@type": "DietarySupplement",
          "name": "Personalized Diet, Nutrition & Lifestyle Protocol"
        }
      ]
    });
    document.head.appendChild(schemaScript);

    return () => {
      document.title = originalTitle;
      if (prevDesc?.el && prevDesc?.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle?.el && prevOgTitle?.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc?.el && prevOgDesc?.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl?.el && prevOgUrl?.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical?.el && prevCanonical?.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
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

  return (
    <div className="bg-slate-50 min-h-screen font-sans selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
      <ScrollProgressBar />

      <Header 
        onStartConsult={() => openBooking('')} 
        onOpenAuth={() => setIsAuthOpen(true)} 
      />

      <Hero 
        title={condition.title} 
        subtitle={condition.subtitle} 
        onStartConsult={() => openBooking('')} 
        onOpenChecker={() => setIsSymptomOpen(true)} 
      />

      <Suspense fallback={<div className="py-20 text-center"><i className="fas fa-spinner fa-spin text-aubergine-500 text-3xl"></i></div>}>
        <HowItWorks />
        <Faq />
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
