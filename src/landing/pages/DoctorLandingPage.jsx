import React, { useState, useEffect, Suspense, lazy } from 'react';
import ProviderHeader from '../components/ProviderHeader.jsx';
import ProviderHero from '../components/ProviderHero.jsx';
import ProviderApplyModal from '../components/ProviderApplyModal.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import AuthModal from '../../tools/AuthModal.jsx';
import Reveal from '../../components/Reveal.jsx';
import PromoBanner from '../components/PromoBanner.jsx';
import { apiFetch } from '../../lib/apiClient.js';

// Lazy load below-the-fold components
const ProviderBenefits = lazy(() => import('../components/ProviderBenefits.jsx'));
const DoctorAiShowcase = lazy(() => import('../components/DoctorAiShowcase.jsx'));
const ProviderCalculator = lazy(() => import('../components/ProviderCalculator.jsx'));
const ProviderComparison = lazy(() => import('../components/ProviderComparison.jsx'));
const ProviderTestimonials = lazy(() => import('../components/ProviderTestimonials.jsx'));
const ProviderFooter = lazy(() => import('../components/ProviderFooter.jsx'));
const AiChatWidget = lazy(() => import('../../tools/AiChatWidget.jsx'));

function DoctorLandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);

  // Dynamic SEO, OpenGraph & Structured Data Schema Injection
  useEffect(() => {
    import('../../lib/analytics.js').then(({ trackEvent, AnalyticsEvents }) => {
      trackEvent(AnalyticsEvents.DOCTOR_LANDING_VIEWED, { funnel: 'provider' });
    });

    const originalTitle = document.title;
    const docTitle = "Telemedicine Platform for Gynecologists & Doctors | 90% Net Payout + AI EMR | HealNari";
    const docDesc = "Grow your clinical practice with zero clinic overhead. HealNari connects verified Gynecologists, Endocrinologists, Dermatologists, Dietitians & Yoga Therapists with high-intent patients. Built-in AI EMR, digital Rx & weekly 90% payouts.";
    const docUrl = "https://healnari.care/for-doctors";

    document.title = docTitle;

    // Helper to update meta tag content
    const updateMeta = (selector, content, attr = 'content') => {
      let el = document.querySelector(selector);
      const original = el ? el.getAttribute(attr) : null;
      if (el) {
        el.setAttribute(attr, content);
      }
      return { el, original };
    };

    const prevDesc = updateMeta('meta[name="description"]', docDesc);
    const prevOgTitle = updateMeta('meta[property="og:title"]', docTitle);
    const prevOgDesc = updateMeta('meta[property="og:description"]', docDesc);
    const prevOgUrl = updateMeta('meta[property="og:url"]', docUrl);
    const prevCanonical = updateMeta('link[rel="canonical"]', docUrl, 'href');
    const prevTwTitle = updateMeta('meta[name="twitter:title"]', docTitle);
    const prevTwDesc = updateMeta('meta[name="twitter:description"]', docDesc);

    // Scroll listener for mobile sticky CTA
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowMobileBar(true);
      } else {
        setShowMobileBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // JSON-LD Structured Data Schema for Provider Network & EMR Application
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-doctor-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalOrganization",
          "@id": "https://healnari.care/for-doctors#organization",
          "name": "HealNari Provider Network",
          "url": "https://healnari.care/for-doctors",
          "logo": "https://healnari.care/brand/logo-full.jpg",
          "medicalSpecialty": [
            "https://schema.org/Gynecologic",
            "https://schema.org/Endocrine",
            "https://schema.org/Dermatology",
            "https://schema.org/DietNutrition"
          ],
          "description": "Multi-specialty digital clinic platform enabling licensed Gynaecologists, Endocrinologists, Dermatologists, Trichologists, Dietitians, and Movement Therapists to deliver root-cause care with integrated AI-assisted EMR.",
          "knowsAbout": ["Women's Health", "PCOS", "Endocrine Disorders", "Trichology", "Dermatology", "Clinical Nutrition", "Telemedicine"],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.96",
            "reviewCount": "184"
          }
        },
        {
          "@type": "SoftwareApplication",
          "name": "HealNari Doctor Clinical EMR & Telehealth Suite",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web, iOS, Android, PWA",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR",
            "description": "Zero upfront setup fees and zero monthly software subscriptions."
          }
        }
      ]
    });
    document.head.appendChild(schemaScript);

    return () => {
      document.title = originalTitle;
      if (prevDesc.el && prevDesc.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle.el && prevOgTitle.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc.el && prevOgDesc.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl.el && prevOgUrl.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical.el && prevCanonical.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
      if (prevTwTitle.el && prevTwTitle.original) prevTwTitle.el.setAttribute('content', prevTwTitle.original);
      if (prevTwDesc.el && prevTwDesc.original) prevTwDesc.el.setAttribute('content', prevTwDesc.original);
      window.removeEventListener('scroll', handleScroll);
      const existingSchema = document.getElementById('healnari-doctor-schema');
      if (existingSchema) existingSchema.remove();
    };
  }, []);

  useEffect(() => {
    // Fetch landing settings
    apiFetch('/admin/public/landing-settings')
      .then(d => setAdminSettings(d))
      .catch(console.error);
  }, []);

  const toggleFaq = (idx) => {
    setActiveFaq(prev => (prev === idx ? null : idx));
  };

  const doctorFaqs = [
    {
      q: "What exactly is HealNari and which specialists can join?",
      a: "HealNari is a dedicated digital clinic ecosystem for women's health specialists. We actively onboard licensed Gynaecologists, Endocrinologists, Dermatologists, Trichologists, Clinical Dietitians, Yoga/Movement Therapists, and Fertility Experts. Patients with menstrual irregularities, PCOS, thyroid disorders, hormonal acne, hair loss, and metabolic concerns connect directly with you."
    },
    {
      q: "How much can I earn and how does the payout model work?",
      a: "You set your own consultation fee (starting ₹799). You keep 90% of every completed consultation — the 10% platform fee covers HIPAA video servers, payment gateway processing, and EMR/AI infrastructure. Earnings are tracked in real-time in your dashboard and paid directly to your registered bank account every Monday. There are no hidden commissions, deductions, or caps."
    },
    {
      q: "Are there any upfront fees, monthly software subscriptions, or lock-in contracts?",
      a: "Zero. No setup fees, no monthly software subscription, no annual contract. You simply apply, get verified, and start practicing. You can pause or deactivate your account at any time. We only succeed when you succeed."
    },
    {
      q: "How do I get patients? Do I need to bring my own?",
      a: "No — we bring pre-screened patients to you. Every patient completes a detailed intake (symptoms, menstrual history, medications, past labs, AI triage summary) before booking. You receive a structured clinical summary before each session so you can walk in prepared. You may also share your HealNari profile link to manage your existing patients."
    },
    {
      q: "Do I retain full clinical autonomy over my prescriptions and treatment protocols?",
      a: "Yes, completely. You have 100% clinical decision-making authority — all diagnoses, lab recommendations, prescriptions, and lifestyle protocols are entirely yours. HealNari's AI tools provide non-prescriptive diagnostic intelligence and clinical summaries to support your judgment, never override it."
    },
    {
      q: "How does HealNari's AI EMR and SOAP note generator work?",
      a: "Our AI clinical scribe analyzes your consultation notes or audio dictation to auto-draft standard Subjective, Objective, Assessment & Plan (SOAP) documentation in under 15 seconds. It also flags drug-drug interactions and allergy contraindications in real time. You retain 100% editing authority and sign every prescription digitally."
    },
    {
      q: "Can I consult international patients and how are multi-currency payments settled?",
      a: "Yes! HealNari provides international telemedicine with built-in multi-currency conversion (USD, AED, EUR, GBP, INR). Patients abroad pay in their preferred currency, and you receive your full 90% net earnings deposited directly into your Indian bank account every Monday."
    },
    {
      q: "What documents do I need to get verified?",
      a: "The verification process is simple and completed within 48 hours. You'll need: your Medical Registration Certificate (NMC, State Medical Council, IDA, or relevant professional council), degree credentials, and a valid government photo ID. Our clinical credentialing team reviews and activates your account."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-aubergine-100 selection:text-aubergine-900 overflow-x-hidden w-full max-w-[100vw] bg-[#FDFBF7]">
      <ScrollProgressBar />

      {adminSettings?.toggles?.showEmergencyBanner && (
        <PromoBanner text="Emergency telemedicine slots are currently available." type="emergency" />
      )}
      {adminSettings?.promoText && (
        <PromoBanner text={adminSettings.promoText} type="promo" />
      )}

      {/* Dedicated Doctor Header */}
      <ProviderHeader
        onApply={() => setIsApplyOpen(true)} 
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      
      <main className="flex-grow pb-28 md:pb-0">
        
        {/* Luminous Warm Hero with Interactive Live Clinic Demo */}
        <ProviderHero 
          onApply={() => setIsApplyOpen(true)} 
          onOpenLogin={() => setIsAuthOpen(true)}
          title={adminSettings?.providerHeroTitle}
          subtitle={adminSettings?.providerHeroSubtitle}
        />
        
        <Suspense fallback={<div className="h-32 flex items-center justify-center text-slate-400 text-sm">Loading Platform Features...</div>}>
          
          {/* Authentic Codebase Features Grid */}
          <ProviderBenefits />

          {/* Dedicated AI Clinical Suite Showcase */}
          <DoctorAiShowcase 
            onApply={() => setIsApplyOpen(true)} 
            onOpenLogin={() => setIsAuthOpen(true)} 
          />

          {/* Interactive Earnings Calculator */}
          {adminSettings?.toggles?.showProviderCalculator !== false && (
            <ProviderCalculator onApply={() => setIsApplyOpen(true)} />
          )}

          {/* Comparison Matrix: Physical Clinic vs HealNari Digital Practice */}
          {adminSettings?.toggles?.showProviderComparison !== false && (
            <div id="comparison" className="scroll-mt-20">
              <ProviderComparison />
            </div>
          )}

          {/* Peer Testimonials with Real Verified Doctors */}
          {adminSettings?.toggles?.showProviderTestimonials !== false && (
            <div id="testimonials" className="scroll-mt-20">
              <ProviderTestimonials />
            </div>
          )}

          {/* Clinical Security & Standards Section */}
          <section id="security" className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16 scroll-mt-20">
            <Reveal>
              <div className="bg-gradient-to-br from-aubergine-900 via-slate-900 to-slate-950 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 md:p-14 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute -right-16 -top-16 w-80 h-80 bg-magenta-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="max-w-3xl space-y-4 relative z-10">
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-1 rounded-full">
                    Clinical Standards & Data Security
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display leading-tight text-white">
                    Engineered to the Highest Global Telemedicine Standards
                  </h2>
                  <p className="text-slate-300 text-sm md:text-base leading-relaxed font-normal">
                    Patient confidentiality and medical compliance are non-negotiable. All telemedicine sessions, electronic health records, and laboratory data are protected with bank-grade 256-bit encryption.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 text-xs font-semibold text-slate-200">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <i className="fas fa-lock text-emerald-400 text-xl mb-2 block"></i>
                      <span>256-Bit TLS & AES Encryption</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <i className="fas fa-certificate text-indigo-400 text-xl mb-2 block"></i>
                      <span>NMC, GMC &amp; Board Verified</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <i className="fas fa-file-shield text-amber-400 text-xl mb-2 block"></i>
                      <span>HIPAA & GDPR Aligned</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <i className="fas fa-headset text-rose-400 text-xl mb-2 block"></i>
                      <span>24/7 Dedicated Partner Care</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          {/* Provider FAQ Section */}
          <section id="faq" className="max-w-4xl mx-auto px-5 md:px-8 py-16 scroll-mt-20">
            <Reveal className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3.5 py-1.5 rounded-full border border-aubergine-100">
                Frequently Asked Questions
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 font-display">
                Everything You Need to Know as a Provider
              </h2>
            </Reveal>

            <div className="space-y-3">
              {doctorFaqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <Reveal key={idx} delay={idx * 50}>
                    <div className={`border rounded-2xl transition-all duration-300 ${isOpen ? 'bg-white border-aubergine-300 shadow-md p-5' : 'bg-white/80 border-sand-200/80 p-4 hover:border-aubergine-200'}`}>
                      <button
                        onClick={() => toggleFaq(idx)}
                        aria-expanded={isOpen}
                        className="w-full flex justify-between items-center text-left font-bold text-slate-800 text-sm md:text-base leading-snug focus:outline-none"
                      >
                        <span className="pr-4">{faq.q}</span>
                        <div className={`w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 bg-aubergine-100 text-aubergine-700' : ''}`}>
                          <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-slate-600 text-xs md:text-sm leading-relaxed animate-fade-in font-normal">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {/* Final Call to Action Card */}
          <section className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-20 text-center">
            <Reveal>
              <div className="bg-gradient-to-r from-aubergine-700 via-magenta-700 to-indigo-800 rounded-[2rem] sm:rounded-[2.5rem] p-7 sm:p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                  <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    <i className="fas fa-stethoscope text-emerald-300"></i> Join 200+ Verified Specialists
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-tight">
                    Start Your Digital Clinic Today
                  </h2>
                  <p className="text-pink-100 text-base md:text-lg leading-relaxed font-normal">
                    No upfront fees. No monthly subscriptions. Apply in 3 minutes, get verified in 48 hours, and start seeing pre-screened patients from Day 1. Keep 90% of every consultation — paid weekly.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                    <button 
                      onClick={() => setIsApplyOpen(true)}
                      className="bg-white text-aubergine-900 font-bold px-6 py-3.5 rounded-xl shadow-xl hover:bg-slate-50 transition-all text-sm sm:text-base hover:scale-105"
                    >
                      <i className="fas fa-user-plus mr-2 text-aubergine-700"></i> Apply as a Specialist
                    </button>
                    <button 
                      onClick={() => setIsAuthOpen(true)}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-all text-sm sm:text-base"
                    >
                      Provider Sign In
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

        </Suspense>
      </main>

      {/* Floating Bottom Sticky Bar on Mobile (Natural Thumb Zone) */}
      {showMobileBar && (
        <div className="md:hidden fixed bottom-4 inset-x-4 z-40 animate-slide-up">
          <div className="bg-slate-950/90 backdrop-blur-lg border border-purple-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="min-w-0 pl-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">90% Net Payout</span>
              <p className="text-xs font-bold text-slate-200 truncate">Zero Clinic Rent</p>
            </div>
            <button
              onClick={() => setIsApplyOpen(true)}
              className="bg-gradient-to-r from-aubergine-600 to-magenta-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md hover:scale-105 transition-transform shrink-0 flex items-center gap-1.5"
            >
              <i className="fas fa-stethoscope"></i> Apply Now
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={<div className="h-32 bg-[#160B28]"></div>}>
        <ProviderFooter 
          onApply={() => setIsApplyOpen(true)} 
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      </Suspense>

      {/* Multi-Step Provider Application Modal */}
      <ProviderApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onOpenLogin={() => setIsAuthOpen(true)}
      />

      {/* Authentication Modal for existing doctors */}
      {isAuthOpen && (
        <AuthModal 
          onClose={() => setIsAuthOpen(false)} 
          onSuccess={() => setIsAuthOpen(false)}
        />
      )}

      {/* Floating AI Assistant for Doctors */}
      <Suspense fallback={null}>
        <AiChatWidget context="doctor" />
      </Suspense>
    </div>
  );
}

export default DoctorLandingPage;
