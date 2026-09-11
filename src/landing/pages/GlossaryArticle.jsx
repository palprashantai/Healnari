import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { glossaryData } from '../data/glossary.js';
import { conditionsData } from '../data/conditions.js';
import { guidesData } from '../../data/guidesData.js';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';
import AuthModal from '../../tools/AuthModal.jsx';
import FloatingCTA from '../../tools/FloatingCTA.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';

const Footer = lazy(() => import('../components/Footer.jsx'));

function GlossaryArticle() {
  const { slug } = useParams();
  const article = glossaryData[slug];

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);

  useEffect(() => {
    if (!article) return;

    trackEvent(AnalyticsEvents.ARTICLE_VIEWED, {
      type: 'glossary',
      slug,
      title: article.title,
    });
    
    // Dynamic SEO, Canonical & Meta
    const originalTitle = document.title;
    document.title = article.seoTitle;

    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      const original = el ? el.getAttribute(attr) : null;
      if (el) el.setAttribute(attr, content);
      return { el, original };
    };

    const canonicalUrl = `https://healnari.vercel.app/learn/${slug}`;
    const prevDesc = updateMeta('meta[name="description"]', article.seoDescription);
    const prevOgTitle = updateMeta('meta[property="og:title"]', article.seoTitle);
    const prevOgDesc = updateMeta('meta[property="og:description"]', article.seoDescription);
    const prevOgUrl = updateMeta('meta[property="og:url"]', canonicalUrl);
    const prevCanonical = updateMeta('link[rel="canonical"]', canonicalUrl, 'href');

    // Schema
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-article-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "headline": article.title,
      "description": article.seoDescription,
      "url": canonicalUrl,
      "dateModified": article.lastReviewed || "2026-01-15",
      "author": {
        "@type": "Person",
        "name": article.author?.name || "Dr. Sarah Mitchell",
        "jobTitle": article.author?.role || "Lead Endocrinologist & Medical Advisory Board"
      },
      "reviewedBy": {
        "@type": "Person",
        "name": article.reviewedBy?.name || article.author?.name || "Dr. Sarah Mitchell",
        "jobTitle": article.reviewedBy?.role || "Lead Endocrinologist"
      },
      "publisher": {
        "@type": "MedicalOrganization",
        "name": "HealNari",
        "logo": {
          "@type": "ImageObject",
          "url": "https://healnari.vercel.app/brand/logo-full.jpg"
        }
      }
    });
    document.head.appendChild(schemaScript);

    return () => {
      document.title = originalTitle;
      if (prevDesc?.el && prevDesc?.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle?.el && prevOgTitle?.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc?.el && prevOgDesc?.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl?.el && prevOgUrl?.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical?.el && prevCanonical?.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
      const script = document.getElementById('healnari-article-schema');
      if (script) document.head.removeChild(script);
    };
  }, [article, slug]);

  if (!article) {
    return <Navigate to="/" replace />;
  }

  const handleBookingSuccess = (details) => {
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col selection:bg-brand-100 selection:text-brand-900">
      <ScrollProgressBar />

      <Header 
        onStartConsult={() => setIsBookingOpen(true)} 
        onOpenAuth={() => setIsAuthOpen(true)} 
      />
      
      <main className="flex-grow max-w-3xl mx-auto px-5 py-10 md:py-16 w-full">
        <div className="mb-6">
          <Link to="/" className="text-sm font-bold text-aubergine-600 hover:text-aubergine-800 transition-colors inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-sand-200 shadow-2xs">
            <i className="fas fa-arrow-left text-xs"></i> Back to Platform
          </Link>
        </div>

          <article className="bg-white rounded-3xl p-6 sm:p-8 md:p-12 shadow-sm border border-sand-200">
            <header className="mb-8 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-aubergine-600 uppercase tracking-widest mb-3">
                <i className="fas fa-book-medical"></i> Medical Glossary &amp; Diagnostics
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 leading-tight font-display">
                {article.title}
              </h1>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-semibold">
                <i className="fas fa-circle-check text-emerald-500"></i> Medically reviewed by HealNari Clinical Advisory Board
              </div>
              <div className="pt-4 flex items-center gap-4 text-[11px] text-slate-500 font-semibold">
                <span className="flex items-center gap-1"><i className="fas fa-user-md text-aubergine-600"></i> By: {article.author?.name || 'Dr. Sarah Mitchell'} ({article.author?.credentials || 'MD, DM (Endocrinology)'})</span>
                <span className="flex items-center gap-1"><i className="fas fa-clipboard-check text-aubergine-600"></i> Reviewed: {article.reviewedBy?.name || 'Dr. Sarah Mitchell'}</span>
                <span className="flex items-center gap-1"><i className="fas fa-calendar text-aubergine-600"></i> Last reviewed: {article.lastReviewed || 'January 2026'}</span>
              </div>
            </header>
          
          <div 
            className="prose prose-slate prose-aubergine max-w-none text-slate-700 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Related Conditions & Guides Interlinking */}
          {(() => {
            // Prefer data-driven links from the article object (relatedConditions / relatedGuideKeys),
            // fall back to the legacy slug-based map for articles that haven't been migrated yet.
            const legacyConditions = {
              'what-is-high-testosterone-in-women': ['pcos-treatment-online', 'gynecology-womens-health', 'hormonal-dermatology-acne', 'hair-loss-trichology', 'thyroid-consultation'],
              'insulin-resistance-symptoms': ['pcos-treatment-online', 'hormonal-weight-loss', 'clinical-nutrition-dietetics'],
              'normal-lh-fsh-ratio': ['pcos-treatment-online', 'gynecology-womens-health', 'fertility-preconception-care'],
              'prolactin-and-hair-loss': ['hair-loss-trichology', 'hormonal-dermatology-acne', 'thyroid-consultation'],
            };
            const legacyGuides = {
              'what-is-high-testosterone-in-women': ['pcos-vs-pcod-terminology', 'pcos-weight-loss'],
              'insulin-resistance-symptoms': ['pcos-personalized-nutrition', 'pcos-weight-loss'],
              'normal-lh-fsh-ratio': ['pcos-vs-pcod-terminology', 'cortisol-balance'],
              'prolactin-and-hair-loss': ['hair-fall-triggers', 'cortisol-balance'],
            };
            const condKeys = article.relatedConditions || legacyConditions[slug] || [];
            const guideKeys = article.relatedGuideKeys || legacyGuides[slug] || [];
            if (condKeys.length === 0 && guideKeys.length === 0) return null;
            return (
              <div className="mt-10 border-t border-slate-200 pt-8 space-y-5">
                <h3 className="text-lg font-extrabold text-slate-900 font-display">
                  Related Clinical Resources
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {condKeys.map((key) => {
                    const cond = conditionsData[key];
                    if (!cond) return null;
                    return (
                      <Link
                        key={key}
                        to={`/conditions/${key}`}
                        className="p-4 bg-sand-50 hover:bg-white rounded-2xl border border-sand-200 hover:border-aubergine-200 hover:shadow-md transition-all group flex flex-col"
                      >
                        <span className="text-[10px] font-bold text-aubergine-600 uppercase tracking-widest">
                          Specialty
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1 group-hover:text-aubergine-600 transition-colors">
                          {cond.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {cond.subtitle}
                        </p>
                      </Link>
                    );
                  })}
                  {guideKeys.map((key) => {
                    const guide = guidesData.find((g) => g.id === key);
                    if (!guide) return null;
                    return (
                      <Link
                        key={key}
                        to={`/guide/${key}`}
                        className="p-4 bg-sand-50 hover:bg-white rounded-2xl border border-sand-200 hover:border-aubergine-200 hover:shadow-md transition-all group flex flex-col"
                      >
                        <span className="text-[10px] font-bold text-aubergine-600 uppercase tracking-widest">
                          {guide.tag}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1 group-hover:text-aubergine-600 transition-colors">
                          {guide.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {guide.summary}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* High-Converting Clinical CTA */}
          <div className="mt-14 bg-gradient-to-r from-aubergine-50 via-indigo-50/50 to-pink-50/30 p-6 sm:p-8 rounded-3xl border border-aubergine-100 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-aubergine-700 text-white flex items-center justify-center text-xl mx-auto mb-3 shadow-md">
              <i className="fas fa-stethoscope"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 font-display">Confused by your symptoms or lab results?</h3>
            <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">
              Our specialist doctors take a root-cause approach. Have a verified gynaecologist or endocrinologist explain your biomarkers and build a personalised treatment protocol in a 45-minute video call.
            </p>
            <button 
              onClick={() => setIsBookingOpen(true)}
              className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg shadow-aubergine-200 transition-all hover:scale-105 btn-interactive flex items-center justify-center gap-2 mx-auto text-sm sm:text-base"
            >
              <i className="fas fa-calendar-check"></i> Book a ₹799 Consultation
            </button>
            <p className="text-[11px] text-slate-400 font-bold mt-3">Includes 45-min video call • Diet roadmap • 14-day free chat follow-up</p>
          </div>
        </article>
      </main>

      <Suspense fallback={<div className="py-20 text-center"><i className="fas fa-spinner fa-spin text-aubergine-500 text-3xl"></i></div>}>
        <Footer />
      </Suspense>

      {/* Floating CTA */}
      <FloatingCTA onBook={() => setIsBookingOpen(true)} />

      {/* Modals */}
      {isBookingOpen && (
        <BookingModal 
          selectedDoc="" 
          onClose={() => setIsBookingOpen(false)} 
          onSuccess={handleBookingSuccess} 
        />
      )}

      {isSuccessOpen && confirmedDetails && (
        <SuccessModal 
          details={confirmedDetails} 
          onClose={() => {
            setConfirmedDetails(null);
            setIsSuccessOpen(false);
          }} 
        />
      )}

      {isAuthOpen && (
        <AuthModal 
          onClose={() => setIsAuthOpen(false)} 
          onSuccess={() => setIsAuthOpen(false)}
        />
      )}
    </div>
  );
}

export default GlossaryArticle;
