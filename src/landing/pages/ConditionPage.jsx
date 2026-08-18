import React, { useEffect, Suspense, lazy } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import { conditionsData } from '../data/conditions.js';

// Lazy load below-the-fold components
const HowItWorks = lazy(() => import('../components/HowItWorks.jsx'));
const Faq = lazy(() => import('../components/Faq.jsx'));
const Footer = lazy(() => import('../components/Footer.jsx'));

function ConditionPage() {
  const { conditionId } = useParams();
  const condition = conditionsData[conditionId];

  useEffect(() => {
    if (!condition) return;
    
    // Dynamic SEO
    const originalTitle = document.title;
    document.title = condition.seoTitle;

    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      if (el) el.setAttribute(attr, content);
    };

    updateMeta('meta[name="description"]', condition.seoDescription);
    updateMeta('meta[property="og:title"]', condition.seoTitle);
    updateMeta('meta[property="og:description"]', condition.seoDescription);

    // Schema
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-condition-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": condition.schemaType,
      "name": condition.schemaDisease,
      "description": condition.seoDescription,
      "url": window.location.href,
      "possibleTreatment": [
        {
          "@type": "TherapeuticProcedure",
          "name": "Medical Consultation"
        },
        {
          "@type": "DietarySupplement",
          "name": "Personalized Diet & Nutrition Protocol"
        }
      ]
    });
    document.head.appendChild(schemaScript);

    return () => {
      document.title = originalTitle;
      const script = document.getElementById('healnari-condition-schema');
      if (script) document.head.removeChild(script);
    };
  }, [condition]);

  if (!condition) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <Header onOpenLogin={() => {}} onOpenChecker={() => {}} />
      <Hero title={condition.title} subtitle={condition.subtitle} onStartConsult={() => {}} onOpenChecker={() => {}} />
      <Suspense fallback={<div className="py-20 text-center"><i className="fas fa-spinner fa-spin text-aubergine-500 text-3xl"></i></div>}>
        <HowItWorks />
        <Faq />
        <Footer />
      </Suspense>
    </div>
  );
}

export default ConditionPage;
