import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';

const DEFAULT_PATIENT_FAQS = [
  {
    q: "What exactly do I get in a ₹799 consultation?",
    a: "Your ₹799 consultation includes a full 45-minute 1-on-1 video call with a specialist doctor, a personalised lab-test roadmap, custom diet & yoga protocol, digital prescription, and 14 days of free chat follow-up."
  },
  {
    q: "How does HealNari combine lifestyle interventions with medical therapy?",
    a: "Our specialists combine structured lifestyle protocols (nutrition, movement, circadian rhythm) with targeted, evidence-based medications whenever clinically indicated to treat root metabolic causes."
  },
  {
    q: "How is HealNari different from a regular hospital or clinic visit?",
    a: "Unlike a 5-minute OPD visit, HealNari gives you 45 minutes with a specialist who actually listens, with a comprehensive root-cause approach combining gynaecology, endocrinology, nutrition, and yoga."
  },
  {
    q: "Which conditions do your doctors treat?",
    a: "Our specialists treat PCOS, irregular/painful periods, hormonal hair loss, acne, thyroid disorders, insulin resistance, fertility planning, and perimenopause."
  },
  {
    q: "Can PCOS be cured or managed?",
    a: "According to WHO guidelines, PCOS has no cure, but its symptoms and metabolic risks can be effectively managed with lifestyle, nutritional, and medical support."
  },
  {
    q: "Is the video consultation completely secure & confidential?",
    a: "Yes — all consultations, health records, and laboratory data are 256-bit end-to-end encrypted and HIPAA compliant."
  }
];

const DEFAULT_PROVIDER_FAQS = [
  {
    q: "What exactly is HealNari and which specialists can join?",
    a: "HealNari is a digital clinic ecosystem for women's health specialists. We onboard licensed Gynaecologists, Endocrinologists, Dermatologists, Dietitians, and Yoga Therapists."
  },
  {
    q: "How much can I earn and how does the payout model work?",
    a: "You set your consultation fee. You retain your net earnings from every completed consultation, paid directly to your registered bank account every Monday."
  },
  {
    q: "Are there any upfront fees or lock-in contracts?",
    a: "Zero. No setup fees, no monthly software subscriptions, and no lock-in contracts. You can pause or deactivate your account at any time."
  },
  {
    q: "Do I retain full clinical autonomy?",
    a: "Yes, completely. You have 100% decision-making authority on diagnoses, lab recommendations, prescriptions, and treatment protocols."
  }
];

const DEFAULT_PATIENT_TESTIMONIALS = [
  {
    quote: "I had PCOS for 6 years. HealNari was the first place that actually ran the right tests, designed my diet around insulin resistance, and gave me a yoga plan. In 4 months, my cycle is regular for the first time since college.",
    author: "Sneha K.",
    age: 32,
    stars: 5,
    role: "PCOS & Irregular Cycles Patient",
    image: "/generated/patient1.webp",
    tags: ["Diagnosed: PCOS & Insulin Resistance", "Outcome: Regular Cycle in 4 Months"]
  },
  {
    quote: "The difference here is the holistic plan. My doctor combined the right supplements with a detailed anti-inflammatory diet and yoga routine. My hormonal acne cleared up in 10 weeks and hair fall stopped.",
    author: "Ritika P.",
    age: 27,
    stars: 5,
    role: "Hormonal Acne & Hair Fall Patient",
    image: "/generated/patient2.webp",
    tags: ["Diagnosed: Androgenic Alopecia", "Outcome: 10 Weeks"]
  },
  {
    quote: "What HealNari does differently is treat you as a whole person. After recovering from severe thyroid imbalance, I believed in their model so deeply that I joined as an angel investor.",
    author: "Nidhi S.",
    age: 35,
    stars: 5,
    role: "Patient turned Angel Investor",
    image: "/generated/patient3.webp",
    tags: ["Diagnosed: Thyroid Imbalance", "Outcome: Energy Restored"]
  }
];

const DEFAULT_PROVIDER_TESTIMONIALS = [
  {
    quote: "HealNari has transformed how I practice reproductive endocrinology. The AI clinical scribe saves me over 2 hours of charting every single day, and structured intakes mean I walk in fully prepared.",
    author: "Dr. Ananya Sharma",
    role: "MD, Senior Reproductive Endocrinologist",
    image: "/generated/doctor1.webp",
    stars: 5,
    tags: ["Reproductive Endocrinology", "350+ Consults"]
  },
  {
    quote: "As a gynaecologist focusing on PCOS, having an integrated platform with digital prescriptions, lab test roadmaps, and automated Monday payouts has streamlined my private practice.",
    author: "Dr. Rajesh Kulkarni",
    role: "MS (OB-GYN), Gynaecological Surgeon",
    image: "/generated/doctor2.webp",
    stars: 5,
    tags: ["Gynaecology & Surgery", "500+ Patients Treated"]
  }
];

function AdminLandingManager() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePortal, setActivePortal] = useState('patient'); // 'patient' | 'provider'
  const [activeSubTab, setActiveSubTab] = useState('content'); // 'content' | 'toggles' | 'faqs' | 'testimonials' | 'banners' | 'seo'

  // Form State
  const [heroTitle, setHeroTitle] = useState("Your Premier Partner in Women's Health");
  const [heroSubtitle, setHeroSubtitle] = useState("Empowering women through comprehensive, compassionate, and cutting-edge medical care. Book consultations instantly.");
  const [providerHeroTitle, setProviderHeroTitle] = useState("Empower Your Practice with HealNari");
  const [providerHeroSubtitle, setProviderHeroSubtitle] = useState("Join the leading digital platform for women's endocrinology and reproductive health. Focus on what you do best while our AI EMR and automated patient acquisition handles the rest.");
  const [pricingAmount, setPricingAmount] = useState(799);
  const [platformCommissionRate, setPlatformCommissionRate] = useState(10);
  const [promoText, setPromoText] = useState("Use code HEALTH20 for 20% off your first consultation!");

  // Extended Section Toggles
  const [toggles, setToggles] = useState({
    // Patient Landing Sections
    showPromoBanner: true,
    showEmergencyBanner: false,
    showStats: true,
    showConditions: true,
    showPcosDiagram: true,
    showHolisticApproach: true,
    showHowItWorks: true,
    showAiShowcase: true,
    showFeaturedDoctors: true,
    showOutcomes: true,
    showTestimonials: true,
    showCycleTracker: true,
    showLabTests: true,
    showHealthTips: true,
    showPricing: true,
    showFaq: true,
    showNewsletter: true,
    showFloatingCTA: true,

    // Provider Landing Sections
    showProviderHero: true,
    showProviderBenefits: true,
    showDoctorAiShowcase: true,
    showProviderCalculator: true,
    showProviderComparison: true,
    showProviderTestimonials: true,
    showProviderSecurity: true,
    showProviderFaq: true,
  });

  // FAQs State
  const [faqs, setFaqs] = useState({
    patient: DEFAULT_PATIENT_FAQS,
    provider: DEFAULT_PROVIDER_FAQS,
  });
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaqIndex, setEditingFaqIndex] = useState(null);
  const [faqForm, setFaqForm] = useState({ q: '', a: '' });

  // Testimonials State
  const [testimonials, setTestimonials] = useState({
    patient: DEFAULT_PATIENT_TESTIMONIALS,
    provider: DEFAULT_PROVIDER_TESTIMONIALS,
  });
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTestIndex, setEditingTestIndex] = useState(null);
  const [testForm, setTestForm] = useState({
    quote: '',
    author: '',
    role: '',
    stars: 5,
    image: '',
    tagsString: '',
  });

  // SEO State
  const [seoMetadata, setSeoMetadata] = useState({
    patient: {
      metaTitle: "Consult Gynecologists, PCOS Specialists & Women's Health Doctors Online | HealNari",
      metaDescription: "Book 45-min video consultations with verified Gynecologists, PCOS Specialists, Endocrinologists, Dermatologists & Dietitians.",
      keywords: "gynaecologist online, PCOS doctor, hormonal acne, telemedicine India",
      ogTitle: "HealNari — Women's Health & Hormonal Care Platform",
      ogDescription: "Integrated medical and lifestyle care for women.",
      canonicalUrl: "https://healnari.care",
    },
    provider: {
      metaTitle: "Join HealNari as a Doctor | Telemedicine Platform for Women's Health Specialists",
      metaDescription: "Grow your private telemedicine practice. AI clinical scribe, automated scheduling, direct weekly payouts.",
      keywords: "doctor onboarding, gynaecologist practice, telemedicine partner",
      ogTitle: "Practice with HealNari — Elevate Your Clinical Reach",
      ogDescription: "Join verified physicians delivering high-impact hormonal care.",
      canonicalUrl: "https://healnari.care/for-doctors",
    },
  });

  // Hero CTAs Customization
  const [heroCta, setHeroCta] = useState({
    patient: {
      ctaButtonText: "Book Consultation",
      ctaSecondaryText: "Check Symptoms Free",
      pricingOfferBadge: "Introductory Offer",
      pricingSectionHeadline: "Discuss your concerns with an expert for just",
    },
    provider: {
      ctaButtonText: "Apply as Specialist Doctor",
      ctaSecondaryText: "Clinician Login",
      badgeText: "Clinician Onboarding Open",
    },
  });

  useEffect(() => {
    apiFetch('/admin/landing-settings')
      .then(d => {
        if (d) {
          if (d.heroTitle) setHeroTitle(d.heroTitle);
          if (d.heroSubtitle) setHeroSubtitle(d.heroSubtitle);
          if (d.providerHeroTitle) setProviderHeroTitle(d.providerHeroTitle);
          if (d.providerHeroSubtitle) setProviderHeroSubtitle(d.providerHeroSubtitle);
          if (d.pricingAmount !== undefined) setPricingAmount(d.pricingAmount);
          if (d.platformCommissionRate !== undefined) setPlatformCommissionRate(d.platformCommissionRate);
          if (d.promoText) setPromoText(d.promoText);
          if (d.toggles) setToggles(prev => ({ ...prev, ...d.toggles }));

          if (d.faqs?.patient?.length) {
            setFaqs(d.faqs);
          }
          if (d.testimonials?.patient?.length) {
            setTestimonials(d.testimonials);
          }
          if (d.seoMetadata) {
            setSeoMetadata(prev => ({
              patient: { ...prev.patient, ...(d.seoMetadata.patient || {}) },
              provider: { ...prev.provider, ...(d.seoMetadata.provider || {}) },
            }));
          }
          if (d.heroCta) {
            setHeroCta(prev => ({
              patient: { ...prev.patient, ...(d.heroCta.patient || {}) },
              provider: { ...prev.provider, ...(d.heroCta.provider || {}) },
            }));
          }
        }
      })
      .catch(() => toast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key) => {
    setToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      toast(`${key.replace('show', '').replace(/([A-Z])/g, ' $1').trim()} section is now ${next[key] ? 'VISIBLE' : 'HIDDEN'}.`, 'info');
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/landing-settings', {
        method: 'PUT',
        body: {
          heroTitle,
          heroSubtitle,
          providerHeroTitle,
          providerHeroSubtitle,
          pricingAmount: Number(pricingAmount),
          platformCommissionRate: Number(platformCommissionRate),
          promoText,
          toggles,
          faqs,
          testimonials,
          seoMetadata,
          heroCta,
        }
      });
      toast('Platform & Landing settings published successfully! Changes are live immediately.', 'success');
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // FAQ Modal Handlers
  const openAddFaq = () => {
    setEditingFaqIndex(null);
    setFaqForm({ q: '', a: '' });
    setFaqModalOpen(true);
  };

  const openEditFaq = (index) => {
    const list = faqs[activePortal] || [];
    setEditingFaqIndex(index);
    setFaqForm({ q: list[index].q, a: list[index].a });
    setFaqModalOpen(true);
  };

  const saveFaq = () => {
    if (!faqForm.q.trim() || !faqForm.a.trim()) {
      toast('Question and Answer are required', 'error');
      return;
    }
    const currentList = [...(faqs[activePortal] || [])];
    if (editingFaqIndex !== null) {
      currentList[editingFaqIndex] = { ...faqForm };
    } else {
      currentList.push({ ...faqForm });
    }
    setFaqs(prev => ({ ...prev, [activePortal]: currentList }));
    setFaqModalOpen(false);
    toast('FAQ updated in staging. Click "Publish Changes" to push live.', 'info');
  };

  const deleteFaq = (index) => {
    const currentList = (faqs[activePortal] || []).filter((_, i) => i !== index);
    setFaqs(prev => ({ ...prev, [activePortal]: currentList }));
    toast('FAQ removed.', 'info');
  };

  const moveFaq = (index, direction) => {
    const currentList = [...(faqs[activePortal] || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;
    setFaqs(prev => ({ ...prev, [activePortal]: currentList }));
  };

  // Testimonial Modal Handlers
  const openAddTestimonial = () => {
    setEditingTestIndex(null);
    setTestForm({
      quote: '',
      author: '',
      role: '',
      stars: 5,
      image: activePortal === 'patient' ? '/generated/patient1.webp' : '/generated/doctor1.webp',
      tagsString: 'Diagnosed: PCOS, Outcome: Recovered',
    });
    setTestModalOpen(true);
  };

  const openEditTestimonial = (index) => {
    const list = testimonials[activePortal] || [];
    const item = list[index];
    setEditingTestIndex(index);
    setTestForm({
      quote: item.quote,
      author: item.author,
      role: item.role,
      stars: item.stars || 5,
      image: item.image || '',
      tagsString: (item.tags || []).join(', '),
    });
    setTestModalOpen(true);
  };

  const saveTestimonial = () => {
    if (!testForm.quote.trim() || !testForm.author.trim()) {
      toast('Author name and quote are required', 'error');
      return;
    }
    const tags = testForm.tagsString.split(',').map(t => t.trim()).filter(Boolean);
    const newItem = {
      quote: testForm.quote,
      author: testForm.author,
      role: testForm.role,
      stars: Number(testForm.stars),
      image: testForm.image || (activePortal === 'patient' ? '/generated/patient1.webp' : '/generated/doctor1.webp'),
      tags,
    };
    const currentList = [...(testimonials[activePortal] || [])];
    if (editingTestIndex !== null) {
      currentList[editingTestIndex] = newItem;
    } else {
      currentList.push(newItem);
    }
    setTestimonials(prev => ({ ...prev, [activePortal]: currentList }));
    setTestModalOpen(false);
    toast('Testimonial updated. Click "Publish Changes" to deploy.', 'info');
  };

  const deleteTestimonial = (index) => {
    const currentList = (testimonials[activePortal] || []).filter((_, i) => i !== index);
    setTestimonials(prev => ({ ...prev, [activePortal]: currentList }));
    toast('Testimonial removed.', 'info');
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all landing copy, FAQs, and testimonials to recommended clinical defaults?')) {
      setFaqs({ patient: DEFAULT_PATIENT_FAQS, provider: DEFAULT_PROVIDER_FAQS });
      setTestimonials({ patient: DEFAULT_PATIENT_TESTIMONIALS, provider: DEFAULT_PROVIDER_TESTIMONIALS });
      toast('Reset to default presets. Save to apply.', 'info');
    }
  };

  const patientSections = [
    { key: 'showPromoBanner', label: 'Top Promotional Banner', desc: 'Custom announcement bar across top of screen' },
    { key: 'showEmergencyBanner', label: 'Emergency Telemedicine Alert', desc: 'Urgent slot availability banner' },
    { key: 'showStats', label: 'Key Impact Statistics', desc: 'Verified recovery rates & consult volume metric cards' },
    { key: 'showConditions', label: 'Treated Clinical Conditions', desc: 'PCOS, Hormonal Acne, Hair Loss, Thyroid diagnosis cards' },
    { key: 'showPcosDiagram', label: 'Interactive Hormonal Biology Diagram', desc: 'Deep dive into insulin resistance & cycle mechanics' },
    { key: 'showHolisticApproach', label: 'Integrative Root-Cause Framework', desc: 'Combining medical protocols with diet & yoga therapy' },
    { key: 'showHowItWorks', label: '3-Step Telemedicine Process', desc: 'Intake, 45-min video call, digital prescription & follow-up' },
    { key: 'showAiShowcase', label: 'AI Health Companion Suite', desc: 'Cycle tracker, lab decoder, consult prep assistant' },
    { key: 'showFeaturedDoctors', label: 'Verified Specialist Physicians Grid', desc: 'Physician credentials, specialties, and 1-click booking' },
    { key: 'showOutcomes', label: 'Clinical Proof & Patient Outcomes', desc: 'Real before-and-after hormonal stabilization charts' },
    { key: 'showTestimonials', label: 'Patient Reviews & Success Stories', desc: 'Interactive carousel with verified patient experiences' },
    { key: 'showCycleTracker', label: 'Interactive Cycle & Fertile Window Tool', desc: 'Self-service period calculation widget' },
    { key: 'showLabTests', label: 'At-Home Hormonal Lab Roadmap', desc: 'Diagnostic panel guidance & home sample collection' },
    { key: 'showHealthTips', label: 'Health Education & Clinical Guides', desc: 'Articles and evidence-based guides managed via CMS' },
    { key: 'showPricing', label: 'Introductory Pricing & CTA Section', desc: 'Transparent consultation fee offer box' },
    { key: 'showFaq', label: 'Frequently Asked Questions (FAQ)', desc: 'Accordion with medical & booking questions' },
    { key: 'showNewsletter', label: 'Hormonal Health Newsletter', desc: 'Email subscription box' },
    { key: 'showFloatingCTA', label: 'Floating Mobile Sticky Bar', desc: 'Thumb-friendly booking bar at bottom of mobile screen' },
  ];

  const providerSections = [
    { key: 'showProviderHero', label: 'Doctor Hero & Practice Demo', desc: 'Headline, video EMR preview, and clinician apply CTA' },
    { key: 'showProviderBenefits', label: 'Core Clinician Benefits Grid', desc: 'Autonomy, pre-screened patients, weekly payouts, AI EMR' },
    { key: 'showDoctorAiShowcase', label: 'AI Clinical Scribe & SOAP Assistant', desc: 'Voice dictation, drug-interaction checker showcase' },
    { key: 'showProviderCalculator', label: 'Interactive Earnings Calculator', desc: 'Real-time slider calculating monthly physician take-home' },
    { key: 'showProviderComparison', label: 'Physical Clinic vs HealNari Matrix', desc: 'Detailed side-by-side overhead & schedule comparison' },
    { key: 'showProviderTestimonials', label: 'Peer Physician Testimonials', desc: 'Quotes and reviews from verified registered doctors' },
    { key: 'showProviderSecurity', label: 'Clinical Standards & Data Security', desc: '256-bit encryption, NMC board compliance badges' },
    { key: 'showProviderFaq', label: 'Provider Frequently Asked Questions', desc: 'Doctor credentialing, payout, and malpractice FAQs' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Public Portal Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Landing Page &amp; Portal Manager</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Control live content, section visibility, FAQs, testimonials, and SEO metadata</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={activePortal === 'patient' ? '/' : '/for-doctors'}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-xs"
          >
            <i className="fas fa-external-link-alt text-slate-500"></i>
            <span>View Live Site</span>
          </a>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-arrow-up"></i>}
            <span>{saving ? 'Publishing...' : 'Publish Changes Live'}</span>
          </button>
        </div>
      </div>

      {/* Portal Tab Switcher */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActivePortal('patient')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activePortal === 'patient' ? 'bg-white text-aubergine-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="fas fa-hospital-user text-aubergine-600"></i>
          <span>Patient Portal (/)</span>
        </button>
        <button
          onClick={() => setActivePortal('provider')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activePortal === 'provider' ? 'bg-white text-aubergine-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <i className="fas fa-user-doctor text-aubergine-600"></i>
          <span>Doctor Portal (/for-doctors)</span>
        </button>
      </div>

      {/* Feature Subtabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-none">
        {[
          ['content', 'Hero & Content', 'fa-pen-nib'],
          ['toggles', 'Section Visibility', 'fa-toggle-on'],
          ['faqs', 'FAQs Manager', 'fa-circle-question'],
          ['testimonials', 'Reviews & Stories', 'fa-star'],
          ['banners', 'Promos & Announcements', 'fa-bullhorn'],
          ['seo', 'SEO & Metadata', 'fa-magnifying-glass-chart'],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSubTab === id
                ? 'bg-aubergine-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className={`fas ${icon}`}></i>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Subtab 1: Hero & Content ────────────────────────────────────────── */}
      {activeSubTab === 'content' && (
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <i className="fas fa-heading text-aubergine-600"></i>
                <span>Hero Banner Headlines ({activePortal === 'patient' ? 'Patient Portal' : 'Doctor Portal'})</span>
              </h2>

              {activePortal === 'patient' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Main Hero Headline</label>
                    <input
                      value={heroTitle}
                      onChange={e => setHeroTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Hero Subtitle &amp; Value Proposition</label>
                    <textarea
                      rows={3}
                      value={heroSubtitle}
                      onChange={e => setHeroSubtitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1.5 block">Consultation Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                        <input
                          type="number"
                          value={pricingAmount}
                          onChange={e => setPricingAmount(Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Updates all pricing CTA badges across landing page</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1.5 block">Primary Button CTA Label</label>
                      <input
                        value={heroCta.patient?.ctaButtonText || 'Book Consultation'}
                        onChange={e => setHeroCta(prev => ({ ...prev, patient: { ...prev.patient, ctaButtonText: e.target.value } }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Provider Hero Headline</label>
                    <input
                      value={providerHeroTitle}
                      onChange={e => setProviderHeroTitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Provider Subtitle</label>
                    <textarea
                      rows={3}
                      value={providerHeroSubtitle}
                      onChange={e => setProviderHeroSubtitle(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1.5 block">Universal Platform Commission (%)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={platformCommissionRate}
                          onChange={e => setPlatformCommissionRate(Number(e.target.value))}
                          className="w-full accent-aubergine-600"
                        />
                        <span className="font-mono font-black text-slate-900 w-12 text-right">{platformCommissionRate}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Doctor keeps {100 - platformCommissionRate}% of consultation fee</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1.5 block">Clinician Onboard CTA Label</label>
                      <input
                        value={heroCta.provider?.ctaButtonText || 'Apply as Specialist Doctor'}
                        onChange={e => setHeroCta(prev => ({ ...prev, provider: { ...prev.provider, ctaButtonText: e.target.value } }))}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-200"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                Live Preview Output
              </span>
              <h3 className="text-lg font-black leading-snug">
                {activePortal === 'patient' ? heroTitle : providerHeroTitle}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activePortal === 'patient' ? heroSubtitle : providerHeroSubtitle}
              </p>
              <div className="pt-2">
                <span className="inline-block bg-white text-slate-900 font-extrabold text-xs px-4 py-2 rounded-xl">
                  {activePortal === 'patient' ? `${heroCta.patient?.ctaButtonText || 'Book'} — ₹${pricingAmount}` : (heroCta.provider?.ctaButtonText || 'Apply as Specialist Doctor')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subtab 2: Section Visibility ────────────────────────────────────── */}
      {activeSubTab === 'toggles' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {activePortal === 'patient' ? 'Patient Portal Sections' : 'Doctor Portal Sections'}
              </h2>
              <p className="text-xs text-slate-500">Toggle sections off to hide them immediately from the public website</p>
            </div>
            <span className="text-xs font-bold text-aubergine-700 bg-aubergine-50 px-3 py-1 rounded-full border border-aubergine-100">
              {activePortal === 'patient' ? `${patientSections.length} Sections Managed` : `${providerSections.length} Sections Managed`}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            {(activePortal === 'patient' ? patientSections : providerSections).map(sec => {
              const isVisible = toggles[sec.key] !== false;
              return (
                <div
                  key={sec.key}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isVisible ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-50/30 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm">{sec.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sec.desc}</p>
                    <span className={`text-[10px] font-mono font-bold mt-1 inline-block ${isVisible ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isVisible ? '● VISIBLE TO VISITORS' : '○ HIDDEN FROM VIEW'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggle(sec.key)}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                      isVisible ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${isVisible ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Subtab 3: FAQs Manager ─────────────────────────────────────────── */}
      {activeSubTab === 'faqs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Frequently Asked Questions ({activePortal === 'patient' ? 'Patient' : 'Provider'})
              </h2>
              <p className="text-xs text-slate-500">Edit, add, delete, or reorder questions. Automatically generates JSON-LD Schema for SEO.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDefaults}
                className="text-xs text-slate-500 hover:text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-200"
              >
                Reset Defaults
              </button>
              <button
                onClick={openAddFaq}
                className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <i className="fas fa-plus"></i>
                <span>Add Question</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {(faqs[activePortal] || []).map((f, idx) => (
              <div key={idx} className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-aubergine-300 transition-colors">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-aubergine-100 text-aubergine-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">{f.q}</h4>
                  </div>
                  <p className="text-xs text-slate-600 pl-7 line-clamp-2">{f.a}</p>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => moveFaq(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 text-xs flex items-center justify-center"
                    title="Move Up"
                  >
                    <i className="fas fa-arrow-up"></i>
                  </button>
                  <button
                    onClick={() => moveFaq(idx, 1)}
                    disabled={idx === (faqs[activePortal]?.length || 0) - 1}
                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 text-xs flex items-center justify-center"
                    title="Move Down"
                  >
                    <i className="fas fa-arrow-down"></i>
                  </button>
                  <button
                    onClick={() => openEditFaq(idx)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-aubergine-700 text-xs flex items-center justify-center"
                    title="Edit"
                  >
                    <i className="fas fa-pen"></i>
                  </button>
                  <button
                    onClick={() => deleteFaq(idx)}
                    className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs flex items-center justify-center"
                    title="Delete"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subtab 4: Testimonials Manager ─────────────────────────────────── */}
      {activeSubTab === 'testimonials' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {activePortal === 'patient' ? 'Patient Reviews & Success Stories' : 'Peer Physician Testimonials'}
              </h2>
              <p className="text-xs text-slate-500">Real patient recovery narratives and physician peer recommendations displayed on live carousel.</p>
            </div>
            <button
              onClick={openAddTestimonial}
              className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
            >
              <i className="fas fa-plus"></i>
              <span>Add Review</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            {(testimonials[activePortal] || []).map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      {Array.from({ length: t.stars || 5 }).map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditTestimonial(idx)} className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-aubergine-600 text-xs flex items-center justify-center">
                        <i className="fas fa-pen text-[10px]"></i>
                      </button>
                      <button onClick={() => deleteTestimonial(idx)} className="w-6 h-6 rounded bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs flex items-center justify-center">
                        <i className="fas fa-trash text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed">"{t.quote}"</p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{t.author}</h5>
                    <p className="text-[10px] text-slate-500">{t.role || 'Verified Patient'}</p>
                  </div>
                  {t.tags && t.tags.length > 0 && (
                    <span className="text-[9px] bg-aubergine-100 text-aubergine-800 font-bold px-2 py-0.5 rounded-full max-w-[150px] truncate">
                      {t.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subtab 5: Promos & Announcements ────────────────────────────────── */}
      {activeSubTab === 'banners' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in max-w-2xl">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <i className="fas fa-bullhorn text-amber-500"></i>
            <span>Top Notification &amp; Promo Banners</span>
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Top Promotional Banner Text</label>
            <input
              value={promoText}
              onChange={e => setPromoText(e.target.value)}
              placeholder="e.g. Use code HEALTH20 for 20% off your first consultation!"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-amber-50/50 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-200 font-medium"
            />
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-xs">Emergency Telemedicine Alert Banner</p>
                <p className="text-[11px] text-slate-500">Displays urgent red banner across the very top of the portal</p>
              </div>
              <button
                onClick={() => handleToggle('showEmergencyBanner')}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                  toggles.showEmergencyBanner ? 'bg-rose-500' : 'bg-slate-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute transition-all ${toggles.showEmergencyBanner ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subtab 6: SEO & Metadata ───────────────────────────────────────── */}
      {activeSubTab === 'seo' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fade-in max-w-3xl">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <i className="fas fa-globe text-indigo-600"></i>
            <span>Search Engine Optimization &amp; Social Tags ({activePortal === 'patient' ? 'Patient' : 'Provider'})</span>
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Browser Page Title &amp; &lt;title&gt;</label>
            <input
              value={seoMetadata[activePortal]?.metaTitle || ''}
              onChange={e => {
                const val = e.target.value;
                setSeoMetadata(prev => ({ ...prev, [activePortal]: { ...prev[activePortal], metaTitle: val } }));
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Meta Description (150–160 chars recommended)</label>
            <textarea
              rows={3}
              value={seoMetadata[activePortal]?.metaDescription || ''}
              onChange={e => {
                const val = e.target.value;
                setSeoMetadata(prev => ({ ...prev, [activePortal]: { ...prev[activePortal], metaDescription: val } }));
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200 text-slate-700"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Keywords (comma separated)</label>
              <input
                value={seoMetadata[activePortal]?.keywords || ''}
                onChange={e => {
                  const val = e.target.value;
                  setSeoMetadata(prev => ({ ...prev, [activePortal]: { ...prev[activePortal], keywords: val } }));
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Canonical URL</label>
              <input
                value={seoMetadata[activePortal]?.canonicalUrl || ''}
                onChange={e => {
                  const val = e.target.value;
                  setSeoMetadata(prev => ({ ...prev, [activePortal]: { ...prev[activePortal], canonicalUrl: val } }));
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ──────────────────────────────────────────────────────── */}
      <Modal isOpen={faqModalOpen} onClose={() => setFaqModalOpen(false)} title={editingFaqIndex !== null ? 'Edit FAQ' : 'Add New FAQ'} size="md">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Question *</label>
            <input
              value={faqForm.q}
              onChange={e => setFaqForm({ ...faqForm, q: e.target.value })}
              placeholder="e.g. How does the 14-day free follow-up work?"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Answer (Clinical Guidance) *</label>
            <textarea
              rows={4}
              value={faqForm.a}
              onChange={e => setFaqForm({ ...faqForm, a: e.target.value })}
              placeholder="Provide a clear, reassuring answer..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setFaqModalOpen(false)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={saveFaq} className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2 rounded-xl text-xs shadow-xs">
              Save FAQ
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Testimonial Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={testModalOpen} onClose={() => setTestModalOpen(false)} title={editingTestIndex !== null ? 'Edit Review' : 'Add Review'} size="md">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Quote / Feedback *</label>
            <textarea
              rows={3}
              value={testForm.quote}
              onChange={e => setTestForm({ ...testForm, quote: e.target.value })}
              placeholder="Patient or doctor recovery experience..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Author Name *</label>
              <input
                value={testForm.author}
                onChange={e => setTestForm({ ...testForm, author: e.target.value })}
                placeholder="e.g. Sneha K."
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Role / Specialty</label>
              <input
                value={testForm.role}
                onChange={e => setTestForm({ ...testForm, role: e.target.value })}
                placeholder="e.g. PCOS Patient"
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Highlight Tags (comma separated)</label>
            <input
              value={testForm.tagsString}
              onChange={e => setTestForm({ ...testForm, tagsString: e.target.value })}
              placeholder="e.g. Diagnosed: PCOS, Outcome: Regular Cycles"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-200"
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setTestModalOpen(false)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={saveTestimonial} className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2 rounded-xl text-xs shadow-xs">
              Save Review
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminLandingManager;
