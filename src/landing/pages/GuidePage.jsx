import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { guidesData } from '../../data/guidesData.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';
import AuthModal from '../../tools/AuthModal.jsx';
import FloatingCTA from '../../tools/FloatingCTA.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import { apiFetch } from '../../lib/apiClient.js';

function GuidePage() {
  const { guideId } = useParams();
  const navigate = useNavigate();

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);

  const staticGuide = guidesData.find((g) => g.id === guideId || g.slug === guideId);
  const [currentGuide, setCurrentGuide] = useState(staticGuide || null);
  const [loadingGuide, setLoadingGuide] = useState(!staticGuide);

  useEffect(() => {
    if (staticGuide) {
      setCurrentGuide(staticGuide);
      setLoadingGuide(false);
    } else {
      setLoadingGuide(true);
      apiFetch(`/admin/public/cms/${guideId}`)
        .then(res => {
          const article = res?.data || res;
          if (article && article.title) {
            setCurrentGuide({
              id: article.slug || article.id,
              slug: article.slug || article.id,
              title: article.title,
              summary: article.summary || '',
              content: article.content || '',
              tag: article.category || 'Clinical Guide',
              readTime: article.read_time || article.readTime || '5 min read',
              color: 'indigo',
              author: {
                name: article.author || 'HealNari Clinical Team',
                role: 'Medical Advisory Board',
                image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop'
              },
              reviewedBy: {
                name: 'Dr. Sarah Mitchell',
                role: 'Lead Endocrinologist'
              },
              tip: article.summary || 'Follow clinical guidance and maintain continuous care with your specialist.',
              bullets: Array.isArray(article.tags) ? article.tags : ['Evidence-Based Protocol', 'Clinically Monitored Care']
            });
          } else {
            setCurrentGuide(guidesData[0]);
          }
        })
        .catch(() => {
          setCurrentGuide(guidesData[0]);
        })
        .finally(() => setLoadingGuide(false));
    }
  }, [guideId]);

  const guide = currentGuide || guidesData[0];

  useEffect(() => {
    window.scrollTo(0, 0);

    if (guide) {
      trackEvent(AnalyticsEvents.ARTICLE_VIEWED, {
        type: 'guide',
        guideId: guide.id,
        title: guide.title,
        tag: guide.tag,
      });

      // Dynamic SEO, Canonical & Meta
      const originalTitle = document.title;
      const pageTitle = `${guide.title} | HealNari Clinical Guide`;
      const pageDesc = guide.summary;
      const canonicalUrl = `https://healnari.care/guide/${guide.id}`;

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

      // Structured Data
      const schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      schemaScript.id = 'healnari-guide-schema';
      schemaScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "headline": guide.title,
        "description": guide.summary,
        "url": canonicalUrl,
        "dateModified": guide.lastReviewed || "2026-01-15",
        "author": {
          "@type": "Person",
          "name": guide.author?.name || "Dr. Sarah Mitchell",
          "jobTitle": guide.author?.role || "Lead Endocrinologist"
        },
        "reviewedBy": {
          "@type": "Person",
          "name": guide.reviewedBy?.name || guide.author?.name || "Dr. Sarah Mitchell",
          "jobTitle": guide.reviewedBy?.role || "Lead Endocrinologist"
        },
        "citation": guide.evidenceBasis || "WHO PCOS Fact Sheet & 2023 International Evidence-based Guideline for PCOS",
        "publisher": {
          "@type": "MedicalOrganization",
          "name": "HealNari",
          "logo": {
            "@type": "ImageObject",
            "url": "https://healnari.care/brand/logo-full.jpg"
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
        const script = document.getElementById('healnari-guide-schema');
        if (script) document.head.removeChild(script);
      };
    }
  }, [guideId, guide]);

  const colorThemes = {
    indigo: {
      gradient: 'from-[#2A1647] via-[#3A1C78] to-[#1E1035]',
      badge: 'bg-aubergine-100 text-aubergine-800 border-aubergine-200',
      accentText: 'text-aubergine-600',
      accentBg: 'bg-aubergine-50 border-aubergine-100',
      tipBorder: 'border-aubergine-500',
    },
    emerald: {
      gradient: 'from-[#2A1647] via-[#3A1C78] to-[#1E1035]',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentText: 'text-emerald-600',
      accentBg: 'bg-emerald-50 border-emerald-100',
      tipBorder: 'border-emerald-500',
    },
    violet: {
      gradient: 'from-[#2A1647] via-[#3A1C78] to-[#1E1035]',
      badge: 'bg-aubergine-100 text-aubergine-800 border-aubergine-200',
      accentText: 'text-aubergine-600',
      accentBg: 'bg-aubergine-50 border-aubergine-100',
      tipBorder: 'border-aubergine-500',
    },
    amber: {
      gradient: 'from-[#2A1647] via-[#3A1C78] to-[#1E1035]',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      accentText: 'text-amber-600',
      accentBg: 'bg-amber-50 border-amber-100',
      tipBorder: 'border-amber-500',
    },
    rose: {
      gradient: 'from-[#2A1647] via-[#3A1C78] to-[#1E1035]',
      badge: 'bg-magenta-100 text-magenta-800 border-magenta-200',
      accentText: 'text-magenta-600',
      accentBg: 'bg-magenta-50 border-magenta-100',
      tipBorder: 'border-magenta-500',
    },
    sky: {
      gradient: 'from-[#2A1647] via-[#3A1C78] to-[#1E1035]',
      badge: 'bg-aubergine-100 text-aubergine-800 border-aubergine-200',
      accentText: 'text-aubergine-600',
      accentBg: 'bg-aubergine-50 border-aubergine-100',
      tipBorder: 'border-aubergine-500',
    },
  };

  const theme = colorThemes[guide.color] || colorThemes.indigo;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: guide.title,
        text: guide.summary,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Article link copied to clipboard!');
    }
  };

  const handleBookingSuccess = (details) => {
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900">
      <ScrollProgressBar />

      <Header
        onStartConsult={() => setIsBookingOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* ── Sub Navigation Breadcrumb Bar ── */}
      <div className="bg-white border-b border-slate-200 px-5 md:px-8 py-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/#health-tips')}
            className="inline-flex items-center gap-2 text-slate-700 hover:text-aubergine-600 font-bold text-xs md:text-sm bg-sand-100 hover:bg-aubergine-50 px-4 py-2 rounded-xl transition-colors"
          >
            <i className="fas fa-arrow-left text-xs"></i>
            <span>Back to Health Articles</span>
          </button>

          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5"
          >
            <i className="fas fa-share-nodes text-xs"></i>
            <span className="hidden sm:inline">Share Article</span>
          </button>
        </div>
      </div>

      {/* ── Hero Article Header ── */}
      <div className={`bg-gradient-to-r ${theme.gradient} text-white py-14 sm:py-20 px-5 sm:px-8 relative overflow-hidden`}>
        <div className="max-w-4xl mx-auto relative z-10 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider border ${theme.badge}`}>
              {guide.tag}
            </span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <i className="fas fa-clock"></i> {guide.readTime}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              • Medically Approved
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display leading-tight tracking-tight">
            {guide.title}
          </h1>

          {/* Author / Medical Reviewer Byline */}
          <div className="flex items-center gap-3 pt-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/40 shadow-md">
              <img
                src={guide.author?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop'}
                alt={guide.author?.name || 'Medical Doctor'}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                {guide.author?.name || 'Dr. Sarah Mitchell'}
                <i className="fas fa-circle-check text-emerald-400 text-xs"></i>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium">
                {guide.author?.role || 'Lead Endocrinologist & Medical Advisory Board'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full Article Body Content ── */}
      <main className="flex-grow bg-white py-12 md:py-16 px-5 sm:px-8">
        <article className="max-w-4xl mx-auto space-y-8 text-slate-700">

          {/* Evidence-Based Clinical Review Header Card */}
          <div className="bg-sand-50/90 border border-sand-200 rounded-3xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sand-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block mb-1">
                    {guide.medicalReviewStatus || 'Reviewed by Qualified Clinician'}
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    Reviewed by: <span className="text-aubergine-700">{guide.reviewedBy?.name || guide.author?.name || 'Dr. Sarah Mitchell'}</span> {guide.author?.credentials && <span className="text-slate-500 font-medium">({guide.author.credentials})</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 font-semibold shrink-0">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Reviewed</span>
                  <span className="text-slate-700 font-bold">{guide.lastReviewed || 'January 2026'}</span>
                </div>
                <div className="w-px h-6 bg-sand-200"></div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Review Due</span>
                  <span className="text-slate-700 font-bold">{guide.nextReviewDue || 'January 2027'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <i className="fas fa-microscope text-aubergine-600"></i>
                <span><strong>Evidence Basis:</strong> {guide.evidenceBasis || 'WHO Guidelines & 2023 International PCOS Consensus'}</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 shrink-0">
                <i className="fas fa-check-circle text-emerald-600"></i> Clinical Guideline Compliant
              </span>
            </div>
          </div>

          {/* Important Educational Disclaimer */}
          <div className="bg-amber-50/80 border-l-4 border-amber-500 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <i className="fas fa-circle-info text-amber-600 text-lg mt-0.5 shrink-0"></i>
            <div>
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Important Medical Notice</h4>
              <p className="text-xs font-medium text-amber-950 mt-1 leading-relaxed">
                {guide.disclaimer || 'This information is for education and does not replace personalized medical advice. Always consult a licensed healthcare professional for individual medical evaluation and care.'}
              </p>
            </div>
          </div>

          {/* Executive Summary Box */}
          <div className="bg-white border border-sand-200 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xs">
            <h3 className="text-xs font-extrabold text-aubergine-800 uppercase tracking-widest flex items-center gap-2 font-display">
              <i className="fas fa-bookmark text-aubergine-600"></i> Executive Summary
            </h3>
            <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
              {guide.summary}
            </p>
          </div>

          {/* Dynamic Article Sections / Rich HTML Content */}
          {guide.sections?.length > 0 ? (
            guide.sections.map((sec, idx) => (
              <section key={idx} className="space-y-4 pt-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display break-words">
                  {sec.heading}
                </h2>
                <p className="text-base sm:text-lg text-slate-650 leading-relaxed font-normal break-words">
                  {sec.content}
                </p>
              </section>
            ))
          ) : guide.content ? (
            <section className="space-y-4 pt-2 prose prose-slate max-w-none text-slate-700 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: guide.content }} />
            </section>
          ) : null}

          {/* Doctor's Tip Callout */}
          <div className={`border-l-4 rounded-2xl p-6 bg-slate-50/80 border ${theme.tipBorder} ${theme.accentBg} my-8`}>
            <h4 className="text-xs font-extrabold uppercase tracking-wider mb-1 flex items-center gap-2 text-slate-900">
              <i className="fas fa-lightbulb text-amber-500"></i> Doctor's Clinical Tip
            </h4>
            <p className="text-base font-bold text-slate-800 leading-relaxed">
              "{guide.tip}"
            </p>
          </div>

          {/* Key Clinical Takeaways */}
          {guide.bullets?.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 font-display">
                Clinical Checklist & Key Takeaways
              </h3>
              <ul className="space-y-3">
                {guide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base font-semibold text-slate-700 bg-sand-50/40 p-4 rounded-xl border border-sand-100">
                    <i className="fas fa-circle-check text-emerald-600 text-base mt-0.5 shrink-0"></i>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Consultation CTA Banner — Unified ₹799 pricing */}
          <div className="bg-gradient-to-r from-aubergine-900 via-aubergine-800 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl mt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left max-w-md">
              <h3 className="text-2xl sm:text-3xl font-black font-display">
                Need a Personalized Medical Protocol?
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                Consult top endocrinologists &amp; gynaecologists to diagnose your root cause and start your 45-minute clinical recovery plan.
              </p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-white text-aubergine-900 hover:bg-sand-100 font-extrabold px-8 py-4 rounded-xl shadow-lg transition-all btn-interactive whitespace-nowrap text-sm sm:text-base shrink-0"
            >
              Book ₹799 Consult <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>

          {/* Related Articles Navigation */}
          <div className="pt-12 border-t border-slate-200 space-y-6">
            <h3 className="text-xl font-extrabold text-slate-900 font-display">
              More Clinical Guides
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {guidesData
                .filter((g) => g.id !== guide.id)
                .slice(0, 2)
                .map((item) => (
                  <Link
                    key={item.id}
                    to={`/guide/${item.id}`}
                    className="p-5 bg-sand-50 hover:bg-white rounded-2xl border border-sand-200 hover:border-aubergine-200 hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-bold text-aubergine-600 uppercase tracking-widest">
                      {item.tag}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-2 group-hover:text-aubergine-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-3 font-semibold flex items-center gap-1">
                      Read Guide <i className="fas fa-arrow-right text-[9px] group-hover:translate-x-1 transition-transform"></i>
                    </p>
                  </Link>
                ))}
            </div>
          </div>

        </article>
      </main>

      <Footer />

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
      {isSuccessOpen && (
        <SuccessModal
          details={confirmedDetails}
          onClose={() => setIsSuccessOpen(false)}
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

export default GuidePage;
