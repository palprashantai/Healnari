import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { guidesData } from '../../data/guidesData.js';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';

function GuidePage() {
  const { guideId } = useParams();
  const navigate = useNavigate();

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [guideId]);

  const guide = guidesData.find((g) => g.id === guideId || g.slug === guideId) || guidesData[0];

  const colorThemes = {
    indigo: {
      gradient: 'from-indigo-900 via-indigo-800 to-purple-900',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      accentText: 'text-indigo-600',
      accentBg: 'bg-indigo-50 border-indigo-100',
      tipBorder: 'border-indigo-500',
    },
    emerald: {
      gradient: 'from-emerald-900 via-teal-800 to-slate-900',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      accentText: 'text-emerald-600',
      accentBg: 'bg-emerald-50 border-emerald-100',
      tipBorder: 'border-emerald-500',
    },
    violet: {
      gradient: 'from-violet-900 via-purple-800 to-aubergine-900',
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      accentText: 'text-violet-600',
      accentBg: 'bg-violet-50 border-violet-100',
      tipBorder: 'border-violet-500',
    },
    amber: {
      gradient: 'from-amber-900 via-orange-800 to-slate-900',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      accentText: 'text-amber-600',
      accentBg: 'bg-amber-50 border-amber-100',
      tipBorder: 'border-amber-500',
    },
    rose: {
      gradient: 'from-rose-900 via-pink-800 to-aubergine-900',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      accentText: 'text-rose-600',
      accentBg: 'bg-rose-50 border-rose-100',
      tipBorder: 'border-rose-500',
    },
    sky: {
      gradient: 'from-sky-900 via-blue-800 to-slate-900',
      badge: 'bg-sky-100 text-sky-800 border-sky-200',
      accentText: 'text-sky-600',
      accentBg: 'bg-sky-50 border-sky-100',
      tipBorder: 'border-sky-500',
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
      <Header
        onStartConsult={() => setIsBookingOpen(true)}
        onOpenAuth={() => navigate('/')}
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

          {/* Executive Summary Box */}
          <div className="bg-sand-50/80 border border-sand-200 rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm">
            <h3 className="text-xs font-extrabold text-aubergine-800 uppercase tracking-widest flex items-center gap-2 font-display">
              <i className="fas fa-bookmark text-aubergine-600"></i> Executive Summary
            </h3>
            <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
              {guide.summary}
            </p>
          </div>

          {/* Dynamic Article Sections */}
          {guide.sections?.map((sec, idx) => (
            <section key={idx} className="space-y-4 pt-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display break-words">
                {sec.heading}
              </h2>
              <p className="text-base sm:text-lg text-slate-650 leading-relaxed font-normal break-words">
                {sec.content}
              </p>
            </section>
          ))}

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

          {/* Consultation CTA Banner */}
          <div className="bg-gradient-to-r from-aubergine-900 via-aubergine-800 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl mt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left max-w-md">
              <h3 className="text-2xl sm:text-3xl font-black font-display">
                Need a Personalized Medical Protocol?
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                Consult top endocrinologists & gynecologists to diagnose your root cause and start your clinical recovery plan.
              </p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-white text-aubergine-900 hover:bg-sand-100 font-extrabold px-8 py-4 rounded-xl shadow-lg transition-all btn-interactive whitespace-nowrap text-sm sm:text-base shrink-0"
            >
              Book ₹299 Consult <i className="fas fa-arrow-right ml-2"></i>
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
    </div>
  );
}

export default GuidePage;
