import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
import { apiFetch } from '../../lib/apiClient.js';

const Footer = lazy(() => import('../components/Footer.jsx'));

function GlossaryArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/public/cms/${slug}`)
      .then(dbArticle => {
        if (dbArticle) {
          setArticle({
            title: dbArticle.title,
            seoTitle: dbArticle.seo_title || dbArticle.title,
            seoDescription: dbArticle.meta_description || dbArticle.summary || '',
            author: { name: dbArticle.author || 'Dr. Sarah Mitchell', credentials: dbArticle.medical_reviewer_credentials || 'MD, DM (Endocrinology)' },
            reviewedBy: { name: dbArticle.medical_reviewer || 'HealNari Clinical Advisory Board' },
            lastReviewed: dbArticle.reviewed_at ? new Date(dbArticle.reviewed_at).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) : new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'}),
            content: dbArticle.content,
            relatedConditions: dbArticle.related_conditions || [],
            relatedGuideKeys: []
          });
        } else {
          setArticle(glossaryData[slug]);
        }
      })
      .catch(() => setArticle(glossaryData[slug]))
      .finally(() => setLoading(false));
  }, [slug]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);

  // Extract H2 headings and inject IDs for seamless Table of Contents navigation
  const { processedContent, headings } = useMemo(() => {
    if (!article?.content) return { processedContent: '', headings: [] };
    const foundHeadings = [];
    let counter = 0;
    const replaced = article.content.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (match, attrs, innerText) => {
      const cleanText = innerText.replace(/<[^>]*>/g, '').trim();
      const id = `section-${counter++}`;
      foundHeadings.push({ id, text: cleanText });
      return `<h2 id="${id}" ${attrs}>${innerText}</h2>`;
    });
    return { processedContent: replaced, headings: foundHeadings };
  }, [article?.content]);

  // Active section observer on scroll
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeadingId(entry.target.id);
          }
        });
      },
      { rootMargin: '-70px 0% -65% 0%' }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.seoDescription,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveHeadingId(id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F6FC]">
        <div className="w-16 h-16 rounded-2xl bg-aubergine-100 flex items-center justify-center text-aubergine-600 text-2xl shadow-soft animate-pulse">
          <i className="fas fa-dna fa-spin"></i>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-aubergine-700">Loading Medical Resource...</p>
      </div>
    );
  }

  if (!article) {
    return <Navigate to="/" replace />;
  }

  const handleBookingSuccess = (details) => {
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  return (
    <div className="bg-[#F8F6FC] min-h-screen font-sans flex flex-col selection:bg-aubergine-100 selection:text-aubergine-900 relative">
      <ScrollProgressBar />

      <Header 
        onStartConsult={() => setIsBookingOpen(true)} 
        onOpenAuth={() => setIsAuthOpen(true)} 
      />

      {/* ── Sub Navigation Breadcrumb Bar ── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-sand-200/80 sticky top-0 z-30 px-4 sm:px-8 py-2.5 transition-all shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto hide-scrollbar py-0.5">
            <Link to="/" className="hover:text-aubergine-600 transition-colors flex items-center gap-1 shrink-0">
              <i className="fas fa-house text-[11px]"></i> Home
            </Link>
            <i className="fas fa-chevron-right text-[9px] text-slate-400 shrink-0"></i>
            <span className="text-slate-400 shrink-0">Clinical Knowledge</span>
            <i className="fas fa-chevron-right text-[9px] text-slate-400 shrink-0"></i>
            <span className="text-aubergine-700 font-bold truncate max-w-[200px] sm:max-w-xs">{article.title}</span>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sand-200 text-slate-600 hover:text-aubergine-700 hover:border-aubergine-300 hover:bg-aubergine-50/50 transition-all text-xs font-bold"
              title="Share or copy article link"
            >
              <i className={`fas ${copied ? 'fa-check text-emerald-600' : 'fa-share-nodes'}`}></i>
              <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-transform hover:scale-105 flex items-center gap-1.5"
            >
              <i className="fas fa-video text-[10px]"></i>
              <span className="hidden sm:inline">Ask a Doctor</span>
              <span className="sm:hidden">Consult</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Ambient Radial Glow Backdrop ── */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none overflow-hidden -z-10 opacity-70">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-aubergine-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-magenta-200/30 rounded-full blur-3xl"></div>
      </div>
      
      {/* ── Main Two-Column Container ── */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── Left Column: Article Content (8 cols) ── */}
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 md:p-12 shadow-card border border-sand-200/90 relative">
            
            {/* Header / Meta Block */}
            <header className="mb-8 border-b border-sand-200 pb-7">
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-aubergine-100 text-aubergine-800 border border-aubergine-200 px-3 py-1 rounded-full">
                  <i className="fas fa-book-medical text-aubergine-600"></i> Medical Glossary &amp; Diagnostics
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-sand-100 border border-sand-200 px-2.5 py-1 rounded-full">
                  <i className="fas fa-clock text-slate-400"></i> 4 min read
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <i className="fas fa-circle-check text-emerald-500"></i> Peer Reviewed
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4.5xl font-black text-slate-900 leading-tight font-display tracking-tight">
                {article.title}
              </h1>

              {/* Medical Reviewer Authority Card */}
              <div className="mt-6 bg-sand-50/80 border border-sand-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-aubergine-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                    <i className="fas fa-user-doctor"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900">
                        {article.author?.name || 'Dr. Sarah Mitchell'}
                      </span>
                      <i className="fas fa-circle-check text-emerald-600 text-xs" title="Board-Certified Specialist"></i>
                    </div>
                    <p className="text-[11px] font-semibold text-aubergine-700">
                      {article.author?.credentials || 'MD, DM (Endocrinology)'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Reviewed by {article.reviewedBy?.name || 'HealNari Clinical Advisory Board'}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-sand-200 pt-2 sm:pt-0 text-[11px] text-slate-500 font-medium">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Last Reviewed</span>
                  <span className="text-slate-800 font-bold flex items-center gap-1">
                    <i className="fas fa-calendar-check text-aubergine-600"></i> {article.lastReviewed || 'January 2026'}
                  </span>
                </div>
              </div>
            </header>
          
            {/* HTML Article Content with Enhanced Medical Prose Styling */}
            <div 
              className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-base font-normal space-y-6
                [&>h2]:text-2xl [&>h2]:sm:text-3xl [&>h2]:font-black [&>h2]:font-display [&>h2]:text-slate-900 [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:pt-6 [&>h2]:border-t [&>h2]:border-sand-200 [&>h2]:scroll-mt-24
                [&>h3]:text-lg [&>h3]:sm:text-xl [&>h3]:font-black [&>h3]:text-slate-900 [&>h3]:mt-6 [&>h3]:mb-2 [&>h3]:scroll-mt-24
                [&>p]:text-slate-700 [&>p]:leading-relaxed [&>p]:text-[15px] sm:[&>p]:text-base
                [&>ul]:space-y-3 [&>ul]:my-5 [&>ul]:pl-0 [&>ul]:list-none
                [&>ul>li]:relative [&>ul>li]:pl-7 [&>ul>li]:text-slate-700 [&>ul>li]:leading-relaxed [&>ul>li]:text-[15px] sm:[&>ul>li]:text-base
                [&>ul>li]:before:content-[''] [&>ul>li]:before:absolute [&>ul>li]:before:left-1.5 [&>ul>li]:before:top-2.5 [&>ul>li]:before:w-2 [&>ul>li]:before:h-2 [&>ul>li]:before:rounded-full [&>ul>li]:before:bg-aubergine-500
                [&>ul>li>strong]:text-slate-900 [&>ul>li>strong]:font-extrabold
                [&>ol]:space-y-3 [&>ol]:my-5 [&>ol]:pl-5 [&>ol]:list-decimal
                [&>ol>li]:text-slate-700 [&>ol>li]:leading-relaxed
                [&>table]:w-full [&>table]:my-6 [&>table]:border-collapse [&>table]:border [&>table]:border-sand-200 [&>table]:rounded-2xl [&>table]:overflow-hidden
                [&>table_th]:bg-aubergine-50 [&>table_th]:text-aubergine-900 [&>table_th]:p-3.5 [&>table_th]:font-extrabold [&>table_th]:text-xs [&>table_th]:uppercase [&>table_th]:tracking-wider [&>table_th]:border-b [&>table_th]:border-sand-200
                [&>table_td]:p-3.5 [&>table_td]:text-xs sm:[&>table_td]:text-sm [&>table_td]:border-b [&>table_td]:border-sand-150 [&>table_td]:text-slate-700
                [&>table_tr:nth-child(even)]:bg-sand-50/50
                [&>blockquote]:border-l-4 [&>blockquote]:border-aubergine-500 [&>blockquote]:bg-aubergine-50/50 [&>blockquote]:p-4 [&>blockquote]:rounded-r-2xl [&>blockquote]:italic [&>blockquote]:text-slate-700 [&>blockquote]:my-6
                [&>.bg-amber-50]:border [&>.bg-amber-50]:border-amber-200 [&>.bg-amber-50]:rounded-2xl [&>.bg-amber-50]:p-5 [&>.bg-amber-50]:my-6"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Clinician Quality Stamp */}
            <div className="mt-12 pt-6 border-t border-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sand-50/60 p-5 rounded-2xl">
              <div className="flex items-center gap-3">
                <i className="fas fa-shield-heart text-2xl text-emerald-600"></i>
                <div className="text-xs text-slate-600">
                  <strong className="text-slate-900 block font-bold">HealNari Clinical Editorial Standard</strong>
                  This article conforms to international clinical guidelines (ACOG, Endocrine Society, WHO).
                </div>
              </div>
              <button 
                onClick={handleShare}
                className="text-xs font-bold text-aubergine-700 hover:text-aubergine-900 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <i className="fas fa-share-nodes"></i> Share with someone
              </button>
            </div>

            {/* Related Conditions & Guides Interlinking */}
            {(() => {
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
              const condKeys = article.relatedConditions?.length > 0 ? article.relatedConditions : (legacyConditions[slug] || []);
              const guideKeys = article.relatedGuideKeys?.length > 0 ? article.relatedGuideKeys : (legacyGuides[slug] || []);
              if (condKeys.length === 0 && guideKeys.length === 0) return null;
              return (
                <div className="mt-12 border-t border-sand-200 pt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-aubergine-700 bg-aubergine-50 px-2.5 py-0.5 rounded-full border border-aubergine-100">
                        Explore Care Pathways
                      </span>
                      <h3 className="text-xl font-black text-slate-900 font-display mt-1">
                        Related Clinical Specialities &amp; Guides
                      </h3>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {condKeys.map((key) => {
                      const cond = conditionsData[key];
                      if (!cond) return null;
                      return (
                        <Link
                          key={key}
                          to={`/conditions/${key}`}
                          className="p-5 bg-sand-50/70 hover:bg-white rounded-2xl border border-sand-200 hover:border-aubergine-300 hover:shadow-card-hover transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-aubergine-700 uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-sand-200">
                                Specialty Clinic
                              </span>
                              <i className="fas fa-arrow-right text-xs text-sand-300 group-hover:text-aubergine-600 group-hover:translate-x-1 transition-all"></i>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-2 group-hover:text-aubergine-700 transition-colors">
                              {cond.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {cond.subtitle}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-aubergine-600 mt-3 pt-2 border-t border-sand-200/60 inline-flex items-center gap-1">
                            Book ₹799 Consultation →
                          </span>
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
                          className="p-5 bg-sand-50/70 hover:bg-white rounded-2xl border border-sand-200 hover:border-aubergine-300 hover:shadow-card-hover transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-magenta-700 uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-sand-200">
                                {guide.tag || 'Clinical Guide'}
                              </span>
                              <i className="fas fa-arrow-right text-xs text-sand-300 group-hover:text-magenta-600 group-hover:translate-x-1 transition-all"></i>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-2 group-hover:text-magenta-700 transition-colors">
                              {guide.title}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {guide.summary}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-magenta-600 mt-3 pt-2 border-t border-sand-200/60 inline-flex items-center gap-1">
                            Read Full Protocol →
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* High-Converting Clinical CTA Box */}
            <div className="mt-12 bg-gradient-to-br from-[#1E1035] via-[#2A1647] to-[#3A1C78] text-white p-7 sm:p-10 rounded-3xl text-center shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-magenta-500/20 rounded-full blur-2xl"></div>
              <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Specialist Doctors Online Now
                </div>
                <h3 className="text-2xl sm:text-3xl font-black font-display text-white">
                  Confused by your symptoms or lab biomarkers?
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Our licensed endocrinologists and gynaecologists review your complete medical history and blood reports in a confidential 45-minute video consultation.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button 
                    onClick={() => setIsBookingOpen(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-magenta-500 to-aubergine-500 hover:from-magenta-600 hover:to-aubergine-600 text-white font-extrabold py-3.5 px-8 rounded-xl shadow-lg transition-all hover:scale-105 btn-interactive flex items-center justify-center gap-2 text-sm"
                  >
                    <i className="fas fa-calendar-check"></i> Book ₹799 Consultation
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300 pt-2 font-medium">
                  <span>✓ 45-min Video Call</span>
                  <span>•</span>
                  <span>✓ Root-Cause Diet Roadmap</span>
                  <span>•</span>
                  <span>✓ 14-Day Free Chat Follow-Up</span>
                </div>
              </div>
            </div>

          </article>

          {/* ── Right Column: Persistent Sticky Navigation & Specialist Rail (4 cols) ── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            
            {/* Table of Contents ("On This Page") */}
            {headings.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-card border border-sand-200/90">
                <div className="flex items-center justify-between mb-3 border-b border-sand-200 pb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 font-display">
                    <i className="fas fa-list-ul text-aubergine-600"></i> On This Page
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{headings.length} Sections</span>
                </div>
                <nav className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                  {headings.map((h) => {
                    const isActive = activeHeadingId === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => scrollToSection(h.id)}
                        className={`w-full text-left py-1.5 px-2.5 rounded-xl text-xs transition-all flex items-start gap-2 ${
                          isActive 
                            ? 'bg-aubergine-50 text-aubergine-900 font-extrabold border-l-2 border-aubergine-600' 
                            : 'text-slate-600 hover:text-aubergine-700 hover:bg-sand-50/80 font-medium'
                        }`}
                      >
                        <i className={`fas fa-chevron-right text-[8px] mt-1 shrink-0 ${isActive ? 'text-aubergine-600' : 'text-slate-300'}`}></i>
                        <span className="line-clamp-1 leading-snug">{h.text}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Quick Consult Booking Card */}
            <div className="bg-white rounded-3xl p-6 shadow-card border border-sand-200/90 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-aubergine-500 via-magenta-500 to-indigo-600"></div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-xl font-bold shadow-soft">
                  <i className="fas fa-stethoscope"></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                    ● Doctors Available Now
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight font-display mt-1">
                    Speak with an Endocrinologist
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Have your androgen &amp; hormone labs interpreted by a specialist in a 45-minute video call.
              </p>

              <div className="bg-sand-50 rounded-2xl p-4 border border-sand-200 mb-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Introductory Consult:</span>
                  <span className="text-lg font-extrabold text-slate-900">₹799</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Duration:</span>
                  <span className="font-bold text-slate-700">45 Minutes Video</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Care Follow-up:</span>
                  <span className="font-bold text-emerald-700">14 Days Free Chat</span>
                </div>
              </div>

              <button
                onClick={() => setIsBookingOpen(true)}
                className="w-full bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3.5 rounded-xl shadow-soft transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
              >
                <i className="fas fa-calendar-plus"></i>
                Book Consultation Now
              </button>

              <div className="mt-4 pt-4 border-t border-sand-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <i className="fas fa-shield-check"></i> 100% Confidential
                </span>
                <span>Verified MD Doctors</span>
              </div>
            </div>

            {/* Quick Diagnostic Checklist Box */}
            <div className="bg-white rounded-3xl p-6 shadow-card border border-sand-200/90 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 font-display">
                <i className="fas fa-clipboard-list text-aubergine-600"></i> What Doctors Evaluate
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
                  <span>Fasting Blood Sugar &amp; Insulin Resistance</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
                  <span>LH/FSH Ratio &amp; Ovulation Predictors</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
                  <span>Free &amp; Total Testosterone Levels</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
                  <span>Lipid Profile &amp; Thyroid Markers (TSH)</span>
                </li>
              </ul>
              <Link 
                to="/#doctors"
                className="block text-center text-xs font-extrabold text-aubergine-700 hover:text-aubergine-900 pt-2 border-t border-sand-200"
              >
                Browse Our Clinical Board →
              </Link>
            </div>

          </aside>

        </div>
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

