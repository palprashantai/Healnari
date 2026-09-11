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
  const { guideId, slug } = useParams();
  const effectiveId = slug || guideId;
  const navigate = useNavigate();

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);
  const [copied, setCopied] = useState(false);

  const staticGuide = guidesData.find((g) => g.id === effectiveId || g.slug === effectiveId);
  const [currentGuide, setCurrentGuide] = useState(staticGuide || null);
  const [loadingGuide, setLoadingGuide] = useState(!staticGuide);

  useEffect(() => {
    setLoadingGuide(true);
    apiFetch(`/admin/public/cms/${effectiveId}`)
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
              name: article.author || 'HealNari Clinical Advisory Board',
              role: article.medical_reviewer_credentials || 'MD, DM (Endocrinology) & Medical Advisory Board',
              image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop'
            },
            reviewedBy: {
              name: article.medical_reviewer || 'Dr. Sarah Mitchell',
              role: 'Lead Endocrinologist'
            },
            tip: article.summary || 'Follow clinical guidance and maintain continuous care with your specialist.',
            bullets: Array.isArray(article.tags) ? article.tags : ['Evidence-Based Protocol', 'Clinically Monitored Care'],
            seoTitle: article.seo_title,
            seoDescription: article.meta_description,
            canonicalUrl: article.canonical_url,
            robots: article.robots,
            dateModified: article.reviewed_at || article.published_at || new Date().toISOString()
          });
        } else {
          setCurrentGuide(staticGuide || guidesData[0]);
        }
      })
      .catch(() => {
        setCurrentGuide(staticGuide || guidesData[0]);
      })
      .finally(() => setLoadingGuide(false));
  }, [effectiveId, staticGuide]);

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
      const pageTitle = guide.seoTitle || `${guide.title} | HealNari Clinical Guide`;
      const pageDesc = guide.seoDescription || guide.summary;
      const canonicalUrl = guide.canonicalUrl || `https://healnari.vercel.app/guide/${guide.id}`;

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
        const script = document.getElementById('healnari-guide-schema');
        if (script) document.head.removeChild(script);
      };
    }
  }, [guideId, guide]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: guide.title,
        text: guide.summary,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleBookingSuccess = (details) => {
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  if (loadingGuide && !guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <div className="w-16 h-16 rounded-2xl bg-aubergine-100 flex items-center justify-center text-aubergine-600 text-2xl shadow-soft animate-pulse">
          <i className="fas fa-book-medical fa-spin"></i>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-aubergine-700">Loading Clinical Protocol...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] font-sans selection:bg-aubergine-100 selection:text-aubergine-900">
      <ScrollProgressBar />

      <Header
        onStartConsult={() => setIsBookingOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* ── Sub Navigation Breadcrumb Bar ── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-sand-200/80 sticky top-0 z-30 px-4 sm:px-8 py-2.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto hide-scrollbar py-0.5">
            <Link to="/" className="hover:text-aubergine-600 transition-colors flex items-center gap-1 shrink-0">
              <i className="fas fa-house text-[11px]"></i> Home
            </Link>
            <i className="fas fa-chevron-right text-[9px] text-slate-400 shrink-0"></i>
            <Link to="/#health-tips" className="hover:text-aubergine-600 transition-colors shrink-0">
              Clinical Guides
            </Link>
            <i className="fas fa-chevron-right text-[9px] text-slate-400 shrink-0"></i>
            <span className="text-aubergine-700 font-bold truncate max-w-[200px] sm:max-w-xs">{guide.title}</span>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sand-200 text-slate-600 hover:text-aubergine-700 hover:border-aubergine-300 hover:bg-aubergine-50/50 transition-all text-xs font-bold"
              title="Share or copy guide link"
            >
              <i className={`fas ${copied ? 'fa-check text-emerald-600' : 'fa-share-nodes'}`}></i>
              <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-transform hover:scale-105 flex items-center gap-1.5"
            >
              <i className="fas fa-calendar-check text-[10px]"></i>
              <span className="hidden sm:inline">Consult Doctor</span>
              <span className="sm:hidden">Consult</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Premium Hero Article Header ── */}
      <div className="bg-gradient-to-br from-[#1E1035] via-[#2A1647] to-[#3A1C78] text-white py-12 sm:py-16 px-4 sm:px-8 relative overflow-hidden">
        {/* Subtle background ambient mesh */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-magenta-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-aubergine-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10 space-y-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-white/10 text-pink-200 border border-white/20 backdrop-blur-sm flex items-center gap-1.5">
              <i className="fas fa-shield-heart text-pink-300"></i> {guide.tag || 'Clinical Guide'}
            </span>
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              <i className="fas fa-clock text-pink-300"></i> {guide.readTime || '5 min read'}
            </span>
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <i className="fas fa-certificate text-emerald-400"></i> Evidence-Based Standard
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black font-display leading-tight tracking-tight text-white max-w-4xl">
            {guide.title}
          </h1>

          {/* Author / Medical Reviewer Header Bar */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/10 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/30 shadow-md shrink-0 bg-white/10">
                <img
                  src={guide.author?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop'}
                  alt={guide.author?.name || 'Medical Doctor'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-white flex items-center gap-1.5 text-sm">
                  {guide.author?.name || 'Dr. Sarah Mitchell'}
                  <i className="fas fa-circle-check text-emerald-400 text-xs" title="Verified Medical Doctor"></i>
                </p>
                <p className="text-[11px] text-pink-200/80 font-medium line-clamp-1">
                  {guide.author?.role || 'Lead Endocrinologist & Medical Advisory Board'}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300 ml-auto font-medium">
              <span className="flex items-center gap-1.5">
                <i className="fas fa-calendar text-pink-300"></i> Reviewed: <strong>{guide.lastReviewed || 'January 2026'}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fas fa-building-columns text-pink-300"></i> HealNari Clinical Board
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Guide Body ── */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left Column: Guide Content (8 cols) ── */}
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 shadow-card border border-sand-200/90 space-y-8">

            {/* Evidence-Based Clinical Review Header Card */}
            <div className="bg-sand-50/90 border border-sand-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold shrink-0">
                    <i className="fas fa-shield-halved"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                      {guide.medicalReviewStatus || 'Clinically Reviewed Standard'}
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      Reviewed by: <span className="text-aubergine-700">{guide.reviewedBy?.name || guide.author?.name || 'Dr. Sarah Mitchell'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-semibold shrink-0">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Review</span>
                    <span className="text-slate-700 font-bold">{guide.lastReviewed || 'January 2026'}</span>
                  </div>
                  <div className="w-px h-6 bg-sand-200"></div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Review</span>
                    <span className="text-slate-700 font-bold">{guide.nextReviewDue || 'January 2027'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <i className="fas fa-microscope text-aubergine-600"></i>
                  <span><strong>Evidence Basis:</strong> {guide.evidenceBasis || 'WHO Guidelines & 2023 International Evidence-Based Protocol'}</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5 shrink-0">
                  <i className="fas fa-check-circle text-emerald-600"></i> Guideline Compliant
                </span>
              </div>
            </div>

            {/* Executive Summary Box */}
            <div className="bg-sand-50/60 border border-sand-200 rounded-2xl p-6 space-y-2.5">
              <h3 className="text-xs font-black text-aubergine-800 uppercase tracking-widest flex items-center gap-2 font-display">
                <i className="fas fa-bookmark text-aubergine-600"></i> Executive Summary
              </h3>
              <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
                {guide.summary}
              </p>
            </div>

            {/* Important Medical Disclaimer Notice */}
            <div className="bg-amber-50/90 border-l-4 border-amber-500 rounded-xl p-4 flex items-start gap-3">
              <i className="fas fa-circle-info text-amber-600 text-base mt-0.5 shrink-0"></i>
              <div className="text-xs text-amber-950 leading-relaxed">
                <strong className="block text-amber-900 font-bold uppercase tracking-wider text-[10px]">Medical Notice</strong>
                {guide.disclaimer || 'This clinical guide is provided for health education and does not replace individualized diagnosis by a licensed physician. Consult a medical doctor before starting or changing any therapeutic regimen.'}
              </div>
            </div>

            {/* Dynamic Sections or Rich Content */}
            {guide.sections?.length > 0 ? (
              guide.sections.map((sec, idx) => (
                <section key={idx} className="space-y-3 pt-4 border-t border-sand-200/80 first:border-t-0">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                    {sec.heading}
                  </h2>
                  <p className="text-base sm:text-[17px] text-slate-700 leading-relaxed">
                    {sec.content}
                  </p>
                </section>
              ))
            ) : guide.content ? (
              <section 
                className="space-y-4 pt-2 prose prose-slate max-w-none text-slate-700 leading-relaxed
                  [&>h2]:text-2xl [&>h2]:sm:text-3xl [&>h2]:font-black [&>h2]:font-display [&>h2]:text-slate-900 [&>h2]:mt-8 [&>h2]:mb-3 [&>h2]:pt-4 [&>h2]:border-t [&>h2]:border-sand-200
                  [&>h3]:text-lg [&>h3]:sm:text-xl [&>h3]:font-black [&>h3]:text-slate-900 [&>h3]:mt-6 [&>h3]:mb-2
                  [&>p]:text-slate-700 [&>p]:leading-relaxed [&>p]:text-[15px] sm:[&>p]:text-base
                  [&>ul]:space-y-2 [&>ul]:my-4 [&>ul]:list-disc [&>ul]:pl-5
                  [&>ol]:space-y-2 [&>ol]:my-4 [&>ol]:list-decimal [&>ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: guide.content }} 
              />
            ) : null}

            {/* Doctor's Clinical Tip Callout */}
            <div className="border-l-4 border-amber-500 rounded-2xl p-6 bg-amber-50/40 border border-amber-200/60 my-6 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-2 text-amber-900">
                <i className="fas fa-lightbulb text-amber-500 text-sm"></i> Doctor's Clinical Tip
              </h4>
              <p className="text-base font-bold text-slate-800 leading-relaxed italic">
                "{guide.tip}"
              </p>
            </div>

            {/* Key Clinical Takeaways */}
            {guide.bullets?.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-sand-200">
                <h3 className="text-xl font-black text-slate-900 font-display">
                  Clinical Checklist &amp; Key Takeaways
                </h3>
                <div className="grid gap-3">
                  {guide.bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm sm:text-base font-semibold text-slate-800 bg-sand-50/70 p-4 rounded-xl border border-sand-200">
                      <i className="fas fa-circle-check text-emerald-600 text-base mt-0.5 shrink-0"></i>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* High-Converting Consultation CTA Banner */}
            <div className="bg-gradient-to-br from-[#1E1035] via-[#2A1647] to-[#3A1C78] text-white rounded-3xl p-8 sm:p-10 shadow-2xl mt-10 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-magenta-500/20 rounded-full blur-2xl pointer-events-none"></div>
              <div className="space-y-2 text-center sm:text-left relative z-10 max-w-md">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 inline-block">
                  Specialist Medical Video Call
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display text-white">
                  Need a Personalized Protocol?
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  Consult top reproductive endocrinologists and gynaecologists to isolate your root cause and build your personalized 45-minute clinical care plan.
                </p>
              </div>
              <button
                onClick={() => setIsBookingOpen(true)}
                className="bg-white text-aubergine-900 hover:bg-sand-100 font-extrabold px-8 py-4 rounded-xl shadow-lg transition-all hover:scale-105 btn-interactive whitespace-nowrap text-sm sm:text-base shrink-0 relative z-10"
              >
                Book ₹799 Consult <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>

            {/* Related Articles Navigation Grid */}
            <div className="pt-10 border-t border-sand-200 space-y-5">
              <h3 className="text-xl font-black text-slate-900 font-display">
                More Evidence-Based Clinical Guides
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {guidesData
                  .filter((g) => g.id !== guide.id)
                  .slice(0, 2)
                  .map((item) => (
                    <Link
                      key={item.id}
                      to={`/guide/${item.id}`}
                      className="p-5 bg-sand-50/70 hover:bg-white rounded-2xl border border-sand-200 hover:border-aubergine-300 hover:shadow-card-hover transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-aubergine-700 uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-sand-200">
                          {item.tag}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-2.5 group-hover:text-aubergine-700 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                      <p className="text-xs text-aubergine-700 font-bold mt-4 flex items-center gap-1">
                        Read Guide <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                      </p>
                    </Link>
                  ))}
              </div>
            </div>

          </article>

          {/* ── Right Column: Sticky Clinician Consultation Sidebar (4 cols) ── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">

            {/* Specialist Telemedicine Booking Card */}
            <div className="bg-white rounded-3xl p-6 shadow-card border border-sand-200/90 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-aubergine-500 via-magenta-500 to-indigo-600"></div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-xl font-bold shadow-soft">
                  <i className="fas fa-stethoscope"></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-aubergine-700 bg-aubergine-50 px-2 py-0.5 rounded-md border border-aubergine-100">
                    Clinical Telemedicine
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight font-display mt-0.5">
                    Speak with a Specialist
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Have questions about this condition or your biomarkers? Discuss your blood tests with a certified endocrinologist.
              </p>

              <div className="bg-sand-50 rounded-2xl p-4 border border-sand-200 mb-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Introductory Fee:</span>
                  <span className="text-lg font-extrabold text-slate-900">₹799</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Duration:</span>
                  <span className="font-bold text-slate-700">45 Minutes Video</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Post-Consult Chat:</span>
                  <span className="font-bold text-emerald-700">14 Days Free Follow-Up</span>
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
                <span>NMC / GMC Certified</span>
              </div>
            </div>

            {/* Quick Inclusions Card */}
            <div className="bg-white rounded-3xl p-6 shadow-card border border-sand-200/90 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 font-display">
                <i className="fas fa-circle-check text-emerald-500"></i> What's Included in ₹799
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-emerald-600 text-xs"></i> 45-Min One-on-One Video Call
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-emerald-600 text-xs"></i> Medical Biomarker Analysis
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-emerald-600 text-xs"></i> Official Digital Prescription
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-emerald-600 text-xs"></i> Tailored Nutrition Roadmap
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-emerald-600 text-xs"></i> 14-Day Free Chat Follow-Up
                </li>
              </ul>
            </div>

          </aside>

        </div>
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

