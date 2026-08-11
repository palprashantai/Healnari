import React, { useState } from 'react';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import Stats from '../components/Stats.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import Conditions from '../components/Conditions.jsx';
import PcosDiagram from '../components/PcosDiagram.jsx';
import Doctors from '../components/Doctors.jsx';
import Outcomes from '../components/Outcomes.jsx';
import Testimonials from '../components/Testimonials.jsx';
import Faq from '../components/Faq.jsx';
import Footer from '../components/Footer.jsx';
import BookingModal from '../../tools/BookingModal.jsx';
import SuccessModal from '../../tools/SuccessModal.jsx';
import AuthModal from '../../tools/AuthModal.jsx';
import ExitIntentModal from '../components/ExitIntentModal.jsx';
import AppInstallToast from '../components/AppInstallToast.jsx';
import SymptomChecker from '../../tools/SymptomChecker.jsx';
import FloatingCTA from '../../tools/FloatingCTA.jsx';
import HealthTips from '../../tools/HealthTips.jsx';
import CycleTracker from '../../tools/CycleTracker.jsx';
import NewsletterSignup from '../components/NewsletterSignup.jsx';
import LabTests from '../components/LabTests.jsx';
import Reveal from '../../components/Reveal.jsx';
import ScrollProgressBar from '../../components/ScrollProgressBar.jsx';
import AiChatWidget from '../../tools/AiChatWidget.jsx';

function LandingPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isSymptomOpen, setIsSymptomOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [confirmedDetails, setConfirmedDetails] = useState(null);

  const openBooking = (docName = '') => {
    setSelectedDoctor(docName);
    setIsBookingOpen(true);
  };

  const closeBooking = () => {
    setIsBookingOpen(false);
    setSelectedDoctor('');
  };

  const handleBookingSuccess = (details) => {
    setConfirmedDetails(details);
    setIsBookingOpen(false);
    setIsSuccessOpen(true);
  };

  const resetFlow = () => {
    setConfirmedDetails(null);
    setIsSuccessOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden w-full max-w-[100vw]">
      <ScrollProgressBar />

      <Header
        onStartConsult={() => openBooking('')} 
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      
      <main className="flex-grow">
        <Hero 
          onStartConsult={() => openBooking('')} 
          onOpenChecker={() => setIsSymptomOpen(true)} 
        />
        
        <Reveal><Stats /></Reveal>

        <Conditions />

        <Reveal><PcosDiagram /></Reveal>

        <Reveal><HowItWorks /></Reveal>

        <Doctors onSelectDoctor={openBooking} />

        <Reveal><Outcomes /></Reveal>

        <Reveal><Testimonials /></Reveal>

        <Reveal><CycleTracker /></Reveal>

        <Reveal><LabTests onBook={openBooking} /></Reveal>

        <Reveal><HealthTips onStartConsult={() => openBooking('')} /></Reveal>

        {/* Customized Premium Inline CTA Section */}
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-12 md:p-16 text-center text-white shadow-xl glow-purple">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 rounded-full bg-violet-600/10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 rounded-full bg-indigo-500/15 blur-2xl"></div>
            
            <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-1.5 bg-brand-800/60 backdrop-blur border border-brand-700 text-brand-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <i className="fas fa-percent text-emerald-400"></i> Introductory Offer
              </span>
              <h2 className="text-3xl md:text-4xl font-black leading-tight text-white font-display">
                Discuss your concerns with an expert for just <span className="underline decoration-white/40 decoration-wavy">₹299</span>
              </h2>
              <p className="text-white/90 text-base max-w-xl mx-auto leading-relaxed font-medium">
                Receive a provisional clinical assessment, personalized lab-testing roadmap, and initial lifestyle protocols. No judgment, 100% private.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
                <button 
                  onClick={() => openBooking('')}
                  className="w-full sm:w-auto bg-white text-brand-900 hover:bg-indigo-50 font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all btn-interactive flex items-center justify-center gap-2 text-base md:text-lg"
                >
                  <i className="fas fa-calendar-check"></i> Reserve My Slot
                </button>
                <button
                  onClick={() => setIsSymptomOpen(true)}
                  className="w-full sm:w-auto bg-brand-800/40 hover:bg-brand-800/60 border border-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all btn-interactive flex items-center justify-center gap-2 text-base md:text-lg"
                >
                  <i className="fas fa-heart-pulse"></i> Not sure yet? Check symptoms first
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-6 pt-4 text-xs font-semibold text-white/90">
                <span className="flex items-center gap-1.5"><i className="fas fa-microscope text-brand-100"></i> Root-Cause Analysis</span>
                <span className="flex items-center gap-1.5"><i className="fas fa-shield-halved text-brand-100"></i> 100% Secure & Confidential</span>
                <span className="flex items-center gap-1.5"><i className="fas fa-clock-rotate-left text-brand-100"></i> Inclusive & Patient-First Care</span>
              </div>
            </div>
          </div>
        </Reveal>
        </section>

        <Reveal><Faq /></Reveal>

        <Reveal><NewsletterSignup /></Reveal>
      </main>

      <Footer />

      {/* Floating WhatsApp / Call CTA */}
      <FloatingCTA onBook={openBooking} />

      {/* Booking Form Overlay */}
      {isBookingOpen && (
        <BookingModal 
          selectedDoc={selectedDoctor} 
          onClose={closeBooking} 
          onSuccess={handleBookingSuccess} 
        />
      )}

      {/* Success Booking Overlay */}
      {isSuccessOpen && confirmedDetails && (
        <SuccessModal 
          details={confirmedDetails} 
          onClose={resetFlow} 
        />
      )}

      {/* Authentication Modal */}
      {isAuthOpen && (
        <AuthModal 
          onClose={() => setIsAuthOpen(false)} 
          onSuccess={() => setIsAuthOpen(false)}
        />
      )}

      {/* Dynamic Symptom Checker / Health Assessment Wizard */}
      {isSymptomOpen && (
        <SymptomChecker 
          onClose={() => setIsSymptomOpen(false)} 
          onBook={openBooking} 
        />
      )}

      {/* Exit Intent Lead Capture */}
      <ExitIntentModal />

      {/* Install-the-app prompt */}
      <AppInstallToast />

      {/* AI Assistant */}
      <AiChatWidget context="landing" />
    </div>
  );
}

export default LandingPage;
