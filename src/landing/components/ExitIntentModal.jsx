import React, { useState, useEffect } from 'react';
import { markLeadCaptured, hasLeadCaptured } from '../../tools/leadCapture.js';

function ExitIntentModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Only trigger once per session, and never for a visitor who already gave their email/details
    const previouslyTriggered = sessionStorage.getItem('exit_intent_shown');
    if (previouslyTriggered || hasLeadCaptured()) {
      setHasTriggered(true);
      return;
    }

    const handleMouseLeave = (e) => {
      // Trigger if mouse leaves top of window (towards tabs/address bar)
      if (e.clientY <= 0 && !hasTriggered && !hasLeadCaptured()) {
        setIsVisible(true);
        setHasTriggered(true);
        sessionStorage.setItem('exit_intent_shown', 'true');
        
        // Track event
        if (window.dataLayer) {
          window.dataLayer.push({ event: 'exit_intent_modal_shown' });
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasTriggered]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      markLeadCaptured();
      if (window.dataLayer) {
        window.dataLayer.push({ event: 'lead_captured_exit_intent' });
      }
      setTimeout(() => setIsVisible(false), 3000);
    }, 1200);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm overlay-enter"
        onClick={() => setIsVisible(false)}
      ></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden modal-enter flex flex-col md:flex-row">
        {/* Left Side - Visual */}
        <div className="w-full md:w-2/5 bg-gradient-to-br from-aubergine-600 to-aubergine-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <i className="fas fa-book-medical text-white text-5xl mb-4 relative z-10 drop-shadow-md"></i>
          <h3 className="text-xl font-display font-black text-white leading-tight relative z-10">
            Free PCOS Diet Protocol
          </h3>
        </div>

        {/* Right Side - Content */}
        <div className="w-full md:w-3/5 p-6 md:p-8 relative">
          <button
            onClick={() => setIsVisible(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>

          {!isSuccess ? (
            <>
              <h2 id="exit-intent-title" className="text-2xl font-black text-slate-900 mb-2 font-display">Wait! Don't leave empty handed.</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Before you go, get our free guide: <em>How Diet &amp; Lifestyle Help with PCOS &mdash; A Doctor's Overview</em>. Written by our specialist team.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input 
                    type="email" 
                    placeholder="Enter your email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-aubergine-600 focus:ring-2 focus:ring-aubergine-600/20 transition-all"
                    required
                  />
                </div>
                <div className="flex items-start gap-2 mt-2">
                  <input type="checkbox" id="consent" required className="mt-1" />
                  <label htmlFor="consent" className="text-[10px] text-slate-500 leading-tight">
                    I agree to receive educational content from HealNari. I understand this is not personalised medical advice. Unsubscribe anytime.
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-aubergine-600 hover:bg-aubergine-700 disabled:bg-aubergine-400 text-white font-bold py-3 rounded-xl shadow-md shadow-aubergine-100 transition-all btn-interactive flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                  ) : (
                    <>Send me the Guide <i className="fas fa-arrow-right text-xs"></i></>
                  )}
                </button>
              </form>
              <p className="text-[10px] text-slate-400 text-center mt-4">We respect your privacy. No spam, ever.</p>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
                <i className="fas fa-check"></i>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Guide Sent!</h2>
              <p className="text-sm text-slate-500">Check your inbox in a few minutes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExitIntentModal;
