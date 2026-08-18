import React, { useEffect, Suspense, lazy } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { glossaryData } from '../data/glossary.js';

const Footer = lazy(() => import('../components/Footer.jsx'));

function GlossaryArticle() {
  const { slug } = useParams();
  const article = glossaryData[slug];

  useEffect(() => {
    if (!article) return;
    
    // Dynamic SEO
    const originalTitle = document.title;
    document.title = article.seoTitle;

    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      if (el) el.setAttribute(attr, content);
    };

    updateMeta('meta[name="description"]', article.seoDescription);
    updateMeta('meta[property="og:title"]', article.seoTitle);
    updateMeta('meta[property="og:description"]', article.seoDescription);

    // Schema
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-article-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "headline": article.title,
      "description": article.seoDescription,
      "url": window.location.href,
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
      const script = document.getElementById('healnari-article-schema');
      if (script) document.head.removeChild(script);
    };
  }, [article]);

  if (!article) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col">
      <Header onOpenLogin={() => {}} onOpenChecker={() => {}} />
      
      <main className="flex-grow max-w-3xl mx-auto px-5 py-12 md:py-20 w-full">
        <div className="mb-8">
          <Link to="/" className="text-sm font-bold text-aubergine-600 hover:text-aubergine-800 transition-colors flex items-center gap-2">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
        </div>

        <article className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-sand-200">
          <header className="mb-8 border-b border-slate-100 pb-8">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight font-display">
              {article.title}
            </h1>
          </header>
          
          <div 
            className="prose prose-slate prose-aubergine max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Soft CTA */}
          <div className="mt-16 bg-gradient-to-r from-aubergine-50 to-indigo-50 p-6 md:p-8 rounded-2xl border border-aubergine-100 text-center">
            <h4 className="text-xl font-bold text-slate-900 mb-2">Confused by your symptoms or lab results?</h4>
            <p className="text-sm text-slate-600 mb-5 max-w-lg mx-auto">
              Our specialist doctors take a root-cause approach. Have an expert explain your condition and build a personalised treatment protocol in a 45-minute video call.
            </p>
            <button className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all">
              Book a ₹799 Consultation
            </button>
          </div>
        </article>
      </main>

      <Suspense fallback={<div className="py-20 text-center"><i className="fas fa-spinner fa-spin text-aubergine-500 text-3xl"></i></div>}>
        <Footer />
      </Suspense>
    </div>
  );
}

export default GlossaryArticle;
