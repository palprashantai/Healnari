import React, { useEffect } from 'react';

function GuideModal({ isOpen, onClose, guide, onBookConsult }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !guide) return null;

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
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto w-full h-full min-h-screen animate-fade-in flex flex-col">
      {/* ── Sticky Top Header Bar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-aubergine-600 font-bold text-sm bg-sand-100 hover:bg-aubergine-50 px-4 py-2 rounded-xl transition-colors"
        >
          <i className="fas fa-arrow-left text-xs"></i>
          <span>Back to Articles</span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 max-w-md truncate">
          <span className="text-slate-700 truncate">{guide.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5"
            title="Share Guide"
          >
            <i className="fas fa-share-nodes text-sm"></i>
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            aria-label="Close Full Article"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>
      </header>

      {/* ── Hero Banner Section ── */}
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
              • Updated August 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display leading-tight tracking-tight">
            {guide.title}
          </h1>

          {/* Author / Medical Reviewer Byline */}
          <div className="flex items-center gap-3 pt-2">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/40 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop"
                alt="Dr. Sarah Mitchell"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                Medically reviewed by Dr. Sarah Mitchell
                <i className="fas fa-circle-check text-emerald-400 text-xs"></i>
              </p>
              <p className="text-[11px] text-slate-300 font-medium">
                Lead Endocrinologist & HealNari Medical Advisory Board
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Article Reader Body ── */}
      <main className="flex-grow bg-white py-10 sm:py-16 px-5 sm:px-8">
        <article className="max-w-4xl mx-auto space-y-8 text-slate-700">

          {/* Key Executive Summary Box */}
          <div className="bg-sand-50/80 border border-sand-200 rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm">
            <h3 className="text-sm font-extrabold text-aubergine-800 uppercase tracking-wider flex items-center gap-2 font-display">
              <i className="fas fa-bookmark text-aubergine-600"></i> Executive Summary
            </h3>
            <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
              {guide.summary}
            </p>
          </div>

          {/* Article Section 1: Biological Root Cause */}
          <section className="space-y-4 pt-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              1. Understanding the Underlying Biological Mechanism
            </h2>
            <p className="text-base sm:text-lg text-slate-650 leading-relaxed">
              In modern gynecology and endocrinology, symptoms like persistent weight gain, sudden hair thinning, adult acne, and menstrual irregularity are rarely isolated issues. They are physiological distress signals originating from systemic hormonal dysregulation.
            </p>
            <p className="text-base sm:text-lg text-slate-650 leading-relaxed">
              When insulin resistance or elevated cortisol persists, it interrupts the pituitary gland's secretion of Luteinizing Hormone (LH) and Follicle-Stimulating Hormone (FSH). This disrupts ovarian follicle maturation and drives excess androgen conversion.
            </p>
          </section>

          {/* Doctor's Clinical Tip Callout */}
          <div className={`border-l-4 rounded-2xl p-6 bg-slate-50/80 border ${theme.tipBorder} ${theme.accentBg}`}>
            <h4 className="text-sm font-extrabold uppercase tracking-wider mb-1 flex items-center gap-2 text-slate-900">
              <i className="fas fa-lightbulb text-amber-500"></i> Key Clinical Recommendation
            </h4>
            <p className="text-base font-bold text-slate-800 leading-relaxed">
              "{guide.tip}"
            </p>
          </div>

          {/* Article Section 2: Clinical Action Protocol */}
          <section className="space-y-5 pt-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              2. Evidence-Based Clinical Action Steps
            </h2>
            <p className="text-base sm:text-lg text-slate-650 leading-relaxed">
              Overcoming hormonal imbalance requires a structured, multi-phase clinical strategy rather than temporary quick fixes:
            </p>

            <div className="grid sm:grid-cols-3 gap-5 pt-2">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-8 h-8 rounded-lg bg-aubergine-50 text-aubergine-600 flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Comprehensive Lab Diagnostic</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Evaluate fasting insulin, total & free testosterone, DHEAS, TSH, and 17-OH progesterone.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Metabolic & Anti-Inflammatory Diet</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Focus on high-fiber, low-glycemic index whole foods paired with clean protein sources.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Targeted Medical Protocol</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Partner with a specialist endocrinologist to monitor cellular turnover every 90 days.
                </p>
              </div>
            </div>
          </section>

          {/* Bottom Consultation CTA Banner */}
          <div className="bg-gradient-to-r from-aubergine-900 via-aubergine-800 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-2xl mt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left max-w-md">
              <h3 className="text-2xl font-black font-display">
                Need a Personalized Medical Protocol?
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                Book a 1-on-1 consultation with top endocrinologists and gynecologists to get your custom recovery plan.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onBookConsult) onBookConsult();
              }}
              className="bg-white text-aubergine-900 hover:bg-sand-100 font-extrabold px-8 py-4 rounded-xl shadow-lg transition-all btn-interactive whitespace-nowrap text-sm"
            >
              Book ₹299 Consultation <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>

        </article>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-6 px-5 text-center text-xs text-slate-400">
        <p className="max-w-3xl mx-auto">
          <strong>Medical Disclaimer:</strong> This guide is for educational purposes only and should not replace professional medical advice. Always consult a qualified physician for clinical diagnosis.
        </p>
      </footer>
    </div>
  );
}

export default GuideModal;
