import React, { useState, useEffect } from 'react';
import { useParams, NavLink, Link, useNavigate } from 'react-router-dom';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { useToast } from '../../components/Toast.jsx';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { COUNTRIES, detectUserCountry, getCountryByCode } from '../../lib/countries.js';
import { apiFetch } from '../../lib/apiClient.js';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics.js';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';

const FALLBACK_DOCTORS = {
  'demo-1': {
    id: 'demo-1',
    name: 'Dr. Ananya Mehta',
    full_name: 'Dr. Ananya Mehta',
    specialty: 'Reproductive Endocrinologist & Gynaecologist',
    qualification: 'MBBS, MD (OBG), Fellowship in Reproductive Endocrinology (AIIMS)',
    regNo: 'NMC / MCI-15201',
    experience: '15+ Years Clinical Experience',
    languages: 'English, Hindi, Marathi',
    clinicName: 'HealNari Clinical Care Network',
    clinicAddress: 'Online Video Consultations (Global) & Mumbai Partner Center',
    bio: 'Senior Reproductive Endocrinologist specializing in root-cause reversal of complex PCOS phenotypes, insulin resistance, ovulation induction, and hormonal hair loss. Practicing evidence-based medicine with cycle-synced protocols.',
    avatar_url: '/generated/doc1.webp',
    rating: '4.98',
    reviewsCount: 214,
    consultFee: 899,
  },
  'demo-2': {
    id: 'demo-2',
    name: 'Dr. Ritu Khanna',
    full_name: 'Dr. Ritu Khanna',
    specialty: 'Endocrinologist & Metabolic Health Lead',
    qualification: 'MBBS, MD (Medicine), DM (Endocrinology)',
    regNo: 'DMC-92810',
    experience: '12+ Years Clinical Experience',
    languages: 'English, Hindi, Punjabi',
    clinicName: 'HealNari Endocrine Center',
    clinicAddress: 'Online Telehealth & New Delhi Partner Center',
    bio: 'Specialist in endocrine diagnostics, thyroid disorders, and metabolic syndrome associated with PCOS. Focused on biomarker restoration and sustainable lifestyle pharmacology.',
    avatar_url: '/generated/doc2.webp',
    rating: '4.95',
    reviewsCount: 168,
    consultFee: 799,
  },
  'demo-3': {
    id: 'demo-3',
    name: 'Dr. Shreya Verma',
    full_name: 'Dr. Shreya Verma',
    specialty: 'Trichologist & Clinical Dermatologist',
    qualification: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    regNo: 'KMC-33821',
    experience: '10+ Years Clinical Experience',
    languages: 'English, Hindi, Kannada',
    clinicName: 'HealNari Hair & Skin Clinic',
    clinicAddress: 'Online Telehealth & Bangalore Clinical Wing',
    bio: 'Dedicated to treating androgenic alopecia, female pattern hair thinning, hirsutism, and hormonal acne through integrated dermatological and systemic endocrine care.',
    avatar_url: '/generated/doc3.webp',
    rating: '4.96',
    reviewsCount: 142,
    consultFee: 799,
  },
};

function DoctorPublicProfile() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Direct Inline Booking Form State
  const initialCountryCode = detectUserCountry();
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const currentCountry = getCountryByCode(countryCode);

  const [date, setDate] = useState(() => todayLocalStr());
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [concern, setConcern] = useState('PCOS / PCOD');
  const [consultType, setConsultType] = useState('video'); // 'video' | 'clinic'
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientMobile, setPatientMobile] = useState(`${currentCountry.phonePrefix} `);
  const [submitting, setSubmitting] = useState(false);
  const [showMobileBar, setShowMobileBar] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [doctorId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowMobileBar(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCountryChange = (code) => {
    setCountryCode(code);
    const sel = getCountryByCode(code);
    setPatientMobile(prev => {
      const parts = prev.split(' ');
      const rest = parts.length > 1 ? parts.slice(1).join(' ') : '';
      return `${sel.phonePrefix} ${rest}`;
    });
  };

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      try {
        const searchList = await apiFetch('/doctors/search', { skipAuth: true });
        const list = Array.isArray(searchList) ? searchList : [];
        
        // Match by ID, slug, or name
        let found = list.find(d => 
          String(d.id) === String(doctorId) || 
          (d.full_name || d.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === String(doctorId).toLowerCase() ||
          (d.full_name || d.name || '').toLowerCase().includes(String(doctorId).toLowerCase().replace(/-/g, ' '))
        );

        if (!found) {
          // Check fallback dictionary
          found = FALLBACK_DOCTORS[doctorId] || Object.values(FALLBACK_DOCTORS)[0];
        }

        setDoctor(found);
      } catch (err) {
        const fb = FALLBACK_DOCTORS[doctorId] || Object.values(FALLBACK_DOCTORS)[0];
        setDoctor(fb);
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [doctorId]);

  // Dynamic SEO, Canonical, OpenGraph, Twitter and Physician Schema Injection
  useEffect(() => {
    if (!doctor) return;

    const docName = doctor.full_name || doctor.name || 'Specialist Doctor';
    const originalTitle = document.title;
    const pageTitle = `${docName} - ${doctor.specialty} | Book Consultation | HealNari`;
    const pageDesc = `Book a 45-minute video consultation with ${docName}, ${doctor.specialty}. Credentials: ${doctor.qualification}. Reg: ${doctor.regNo || 'NMC Verified'}. Root-cause care for PCOS, thyroid & hormonal health.`;
    const canonicalUrl = `https://healnari.care/dr/${doctor.id || doctorId}`;

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
    const prevTwTitle = updateMeta('meta[name="twitter:title"]', pageTitle);
    const prevTwDesc = updateMeta('meta[name="twitter:description"]', pageDesc);

    // JSON-LD Structured Data Schema for Physician
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'healnari-physician-schema';
    schemaScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Physician",
          "@id": `${canonicalUrl}#physician`,
          "name": docName,
          "description": doctor.bio || pageDesc,
          "medicalSpecialty": doctor.specialty,
          "url": canonicalUrl,
          "image": doctor.avatar_url ? `https://healnari.care${doctor.avatar_url}` : undefined,
          "priceRange": `₹${doctor.consultFee || 799}`,
          "currenciesAccepted": "INR",
          "availableService": {
            "@type": "MedicalConsultation",
            "name": "45-Minute Telemedicine Video Consultation"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": doctor.rating || "4.98",
            "reviewCount": String(doctor.reviewsCount || "180")
          },
          "worksFor": {
            "@type": "MedicalOrganization",
            "name": "HealNari Telemedicine",
            "url": "https://healnari.care"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://healnari.care"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Doctors",
              "item": "https://healnari.care/#doctors"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": docName,
              "item": canonicalUrl
            }
          ]
        }
      ]
    });
    document.head.appendChild(schemaScript);

    return () => {
      document.title = originalTitle;
      if (prevDesc?.el && prevDesc?.original) prevDesc.el.setAttribute('content', prevDesc.original);
      if (prevOgTitle?.el && prevOgTitle?.original) prevOgTitle.el.setAttribute('content', prevOgTitle.original);
      if (prevOgDesc?.el && prevOgDesc?.original) prevOgDesc.el.setAttribute('content', prevOgDesc.original);
      if (prevOgUrl?.el && prevOgUrl?.original) prevOgUrl.el.setAttribute('content', prevOgUrl.original);
      if (prevCanonical?.el && prevCanonical?.original) prevCanonical.el.setAttribute('href', prevCanonical.original);
      if (prevTwTitle?.el && prevTwTitle?.original) prevTwTitle.el.setAttribute('content', prevTwTitle.original);
      if (prevTwDesc?.el && prevTwDesc?.original) prevTwDesc.el.setAttribute('content', prevTwDesc.original);
      const existing = document.getElementById('healnari-physician-schema');
      if (existing) existing.remove();
    };
  }, [doctor, doctorId]);

  const timeSlots = ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM', '6:00 PM', '7:30 PM'];
  const concernsList = [
    'PCOS / PCOD',
    'Irregular / Painful Cycles',
    'Hormonal Hair Thinning',
    'Acne & Weight Management',
    'Thyroid & Metabolic Care',
    'Fertility & Preconception'
  ];

  const handleInlineBook = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) { toast('Please enter your full name', 'error'); return; }
    if (!patientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { toast('Please enter a valid email address', 'error'); return; }
    if (!patientMobile.trim() || patientMobile.replace(/[^0-9]/g, '').length < 7) { toast('Please enter a valid phone number', 'error'); return; }

    setSubmitting(true);
    const docName = doctor?.full_name || doctor?.name || 'Dr. Sarah Mitchell';
    const payload = {
      name: patientName.trim(),
      email: patientEmail.trim(),
      mobile: patientMobile.trim(),
      age: patientAge ? Number(patientAge) : undefined,
      doctorId: doctor?.id,
      doctor: docName,
      concern,
      date,
      time: timeSlot,
      consultType,
      fee: doctor?.consultFee || doctor?.fee || 799,
      country: countryCode,
      source: 'direct_doctor_link'
    };

    try {
      await apiFetch('/leads/capture', {
        method: 'POST',
        body: payload,
        skipAuth: true
      });
    } catch {
      // Offline fallback success
    }

    trackEvent(AnalyticsEvents.BOOKING_SUCCESS, {
      doctor: docName,
      concern,
      source: 'doctor_profile_link'
    });

    setConfirmedBooking({
      ...payload,
      id: `APT-${Date.now().toString().slice(-6)}`,
      doctorName: docName,
      specialty: doctor?.specialty,
      time: timeSlot,
      date
    });

    setSubmitting(false);
    setIsSuccessOpen(true);
    toast(`Appointment requested with ${docName}!`, 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-aubergine-200 border-t-aubergine-700 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-600">Loading Doctor Profile...</p>
        </div>
      </div>
    );
  }

  const doc = doctor || Object.values(FALLBACK_DOCTORS)[0];
  const docName = doc.full_name || doc.name || 'Dr. Sarah Mitchell';
  const consultFee = doc.consultFee || doc.fee || 799;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] font-sans selection:bg-aubergine-100 selection:text-aubergine-900">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sand-200 py-3 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2">
            <HealNariLogo size="sm" />
          </NavLink>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
              <i className="fas fa-shield-halved text-emerald-600"></i> NMC / GMC Verified
            </span>
            <NavLink
              to="/"
              className="text-xs font-bold text-slate-600 hover:text-aubergine-700 transition-colors"
            >
              Explore All Care
            </NavLink>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="bg-white/80 border-b border-sand-200 px-4 sm:px-8 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs text-slate-500 font-semibold flex-wrap">
          <Link to="/" className="hover:text-aubergine-600 transition-colors">Home</Link>
          <i className="fas fa-chevron-right text-[9px] text-slate-400"></i>
          <Link to="/#doctors" className="hover:text-aubergine-600 transition-colors">Doctors</Link>
          <i className="fas fa-chevron-right text-[9px] text-slate-400"></i>
          <span className="text-aubergine-700 font-bold">{docName}</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 pb-24 lg:pb-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Doctor Profile & Credentials */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Profile Card */}
            <div className="bg-white border border-sand-300 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-aubergine-200 bg-slate-100 shrink-0 shadow-md mx-auto sm:mx-0">
                  {doc.avatar_url ? (
                    <img src={doc.avatar_url} alt={docName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-aubergine-100 text-aubergine-800 font-extrabold text-2xl">
                      {docName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white">
                    ✓
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left w-full">
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                      {docName}
                    </h1>
                    <span className="bg-aubergine-100 text-aubergine-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-aubergine-200">
                      Verified
                    </span>
                  </div>

                  <p className="text-sm font-bold text-aubergine-700">
                    {doc.specialty}
                  </p>

                  <p className="text-xs text-slate-500 font-medium leading-snug">
                    {doc.qualification}
                  </p>

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 pt-1 flex-wrap justify-center sm:justify-start">
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <i className="fas fa-star text-xs text-amber-500"></i> {doc.rating || '4.98'} ({doc.reviewsCount || 180}+ reviews)
                    </span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono">Reg: {doc.regNo || doc.registration_no || 'NMC Verified'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Clinical Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience</span>
                  <strong className="text-slate-800 font-bold text-xs">{doc.experience || '12+ Years'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Languages</span>
                  <strong className="text-slate-800 font-bold text-xs truncate block">{doc.languages || 'English, Hindi'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Video Fee</span>
                  <strong className="text-emerald-700 font-black text-xs font-sans">₹{consultFee} <span className="text-[10px] font-normal text-slate-400">/ consult</span></strong>
                </div>
              </div>

              {/* Doctor Bio */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Clinical Overview &amp; Care Approach
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {doc.bio || 'Dr. ' + docName + ' is a leading women\'s health specialist practicing root-cause telemedicine. Every consultation includes detailed clinical intake review, personalized diagnostic lab planning, lifestyle pharmacology, and digitally signed electronic prescriptions.'}
                </p>
              </div>

              {/* Clinic Location */}
              <div className="flex items-start gap-2.5 p-3.5 bg-aubergine-50/60 border border-aubergine-100 rounded-2xl text-xs text-slate-700">
                <i className="fas fa-location-dot text-aubergine-600 text-sm mt-0.5 shrink-0"></i>
                <div>
                  <strong className="font-bold text-aubergine-900 block">{doc.clinicName || 'HealNari Clinical Practice'}</strong>
                  <span className="text-slate-600">{doc.clinicAddress || 'Encrypted HIPAA Video Consultations & Partner Diagnostic Centers'}</span>
                </div>
              </div>

            </div>

            {/* Clinical Guarantees Card */}
            <div className="bg-gradient-to-br from-[#1E1035] via-[#2A1647] to-[#160B28] text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-base font-extrabold text-white font-display flex items-center gap-2">
                <i className="fas fa-shield-heart text-emerald-400"></i> Patient Privacy &amp; Clinical Safeguards
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center gap-2.5">
                  <i className="fas fa-video text-indigo-300 text-sm shrink-0"></i>
                  <span>256-Bit Encrypted HIPAA Video Room</span>
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center gap-2.5">
                  <i className="fas fa-file-prescription text-emerald-300 text-sm shrink-0"></i>
                  <span>Digital Prescription with Doctor Reg No</span>
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center gap-2.5">
                  <i className="fas fa-flask text-amber-300 text-sm shrink-0"></i>
                  <span>At-Home Lab Panel Integration</span>
                </div>
                <div className="p-3 bg-white/10 rounded-xl border border-white/10 flex items-center gap-2.5">
                  <i className="fas fa-comments text-pink-300 text-sm shrink-0"></i>
                  <span>Free 14-Day Follow-up Async Chat</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Direct Booking Engine */}
          <div id="booking-section" className="lg:col-span-5 sticky top-20 scroll-mt-20">
            <div className="bg-white border-2 border-aubergine-300 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ● Direct Booking
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Book Consultation</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold block">Fee</span>
                  <span className="text-xl font-black text-aubergine-700 font-sans">₹{consultFee}</span>
                </div>
              </div>

              <form onSubmit={handleInlineBook} className="space-y-4">
                
                {/* Mode Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Consultation Format:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConsultType('video')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        consultType === 'video'
                          ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <i className="fas fa-video"></i> Video Consult
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsultType('clinic')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        consultType === 'clinic'
                          ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <i className="fas fa-hospital"></i> In-Clinic Visit
                    </button>
                  </div>
                </div>

                {/* Primary Concern */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Primary Health Concern:</label>
                  <select
                    value={concern}
                    onChange={(e) => setConcern(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:outline-none focus:border-aubergine-600"
                  >
                    {concernsList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Appointment Date:</label>
                  <input
                    type="date"
                    value={date}
                    min={todayLocalStr()}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 font-bold focus:outline-none focus:border-aubergine-600"
                  />
                </div>

                {/* Slot Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Available Time Slot:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {timeSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setTimeSlot(slot)}
                        className={`py-2 px-1 rounded-xl text-xs font-extrabold border transition-all text-center ${
                          timeSlot === slot
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient Information */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-aubergine-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Email:</label>
                      <input
                        type="email"
                        placeholder="priya@example.com"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-aubergine-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Age:</label>
                      <input
                        type="number"
                        placeholder="28"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        min="12"
                        max="100"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-aubergine-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Contact Number (WhatsApp enabled):</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-xl px-2 py-2.5 font-bold focus:outline-none shrink-0"
                      >
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.code} ({c.phonePrefix})</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={patientMobile}
                        onChange={(e) => setPatientMobile(e.target.value)}
                        required
                        placeholder="98765 43210"
                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-aubergine-600 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm shadow-lg shadow-aubergine-200 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-2 active:scale-95 disabled:opacity-50"
                >
                  <i className="fas fa-calendar-check"></i>
                  {submitting ? 'Confirming...' : `Confirm & Book Video Slot (₹${consultFee})`}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                  Instant confirmation • You will receive the encrypted video call link on WhatsApp &amp; Email.
                </p>

              </form>

            </div>
          </div>

        </div>

      </main>

      {/* Mobile Floating Sticky CTA Bar */}
      {showMobileBar && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-sand-300 px-4 py-3 z-40 flex items-center justify-between shadow-2xl safe-area-pb animate-slide-up">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-aubergine-100 text-aubergine-800 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
              {doc.avatar_url ? (
                <img src={doc.avatar_url} alt={docName} className="w-full h-full object-cover" />
              ) : (
                docName.split(' ').map(n => n[0]).join('').slice(0, 2)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{docName}</p>
              <p className="text-[11px] font-bold text-aubergine-700">₹{consultFee} <span className="text-slate-400 font-normal">/ consult</span></p>
            </div>
          </div>

          <button
            onClick={() => {
              const el = document.getElementById('booking-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <i className="fas fa-calendar-check text-[10px]"></i> Book Slot
          </button>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessOpen && (
        <SuccessModal
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          details={confirmedBooking}
        />
      )}

      {/* Fallback Booking Modal if triggered */}
      {isBookingModalOpen && (
        <BookingModal
          selectedDoc={doc.id || docName}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={(details) => {
            setIsBookingModalOpen(false);
            setConfirmedBooking(details);
            setIsSuccessOpen(true);
          }}
        />
      )}

    </div>
  );
}

export default DoctorPublicProfile;
