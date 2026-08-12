import React, { useState } from 'react';
import { markLeadCaptured } from '../../tools/leadCapture.js';
import { apiFetch } from '../../lib/apiClient.js';

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/leads/newsletter', { method: 'POST', skipAuth: true, body: { email } });
      setSubmitted(true);
      markLeadCaptured();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { icon: 'fa-flask', text: 'Weekly clinical insights on PCOS, hair, & hormones' },
    { icon: 'fa-heart-pulse', text: 'Personalized cycle & nutrition tips from our doctors' },
    { icon: 'fa-tag', text: 'Exclusive early access to new programs & offers' },
  ];

  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-aubergine-900 via-aubergine-800 to-aubergine-700 p-8 md:p-14 text-white shadow-2xl">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-aubergine-400/10 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sage-500/10 rounded-full blur-3xl -z-0"></div>

        <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
          {/* Left: Copy */}
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 bg-aubergine-700/60 border border-aubergine-500 text-aubergine-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <i className="fas fa-envelope-open-text text-aubergine-200"></i> Free Health Newsletter
            </span>
            <h2 className="text-3xl md:text-4xl font-black leading-tight font-display">
              Get expert women's health insights — delivered weekly
            </h2>
            <p className="text-aubergine-100 text-sm leading-relaxed">
              Join 25,000+ women receiving science-backed health guidance from our clinical team. No spam, ever.
            </p>
            <ul className="space-y-3">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-semibold text-aubergine-50">
                  <div className="w-7 h-7 rounded-lg bg-aubergine-700/60 flex items-center justify-center flex-shrink-0">
                    <i className={`fas ${b.icon} text-aubergine-200 text-xs`}></i>
                  </div>
                  {b.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Form */}
          <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">
            {!submitted ? (
              <>
                <h3 className="font-extrabold text-lg text-white font-display">Subscribe for free</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="Enter your email address"
                      className="w-full bg-white/15 border border-white/20 text-white placeholder-white/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-aubergine-200 focus:outline-none"
                    />
                    {error && <p className="text-rose-300 text-xs font-bold mt-1">{error}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-white text-aubergine-900 hover:bg-sand-50 disabled:opacity-60 font-bold py-3 rounded-xl transition-all btn-interactive text-sm flex items-center justify-center gap-2"
                  >
                    <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-aubergine-600`}></i> {submitting ? 'Subscribing…' : "Subscribe — It's Free"}
                  </button>
                </form>
                <p className="text-[10px] text-white/40 font-semibold text-center">
                  Unsubscribe anytime. We respect your privacy.
                </p>
              </>
            ) : (
              <div className="text-center py-6 space-y-3 animate-fade-in">
                <div className="w-14 h-14 bg-emerald-400/20 text-emerald-300 rounded-full flex items-center justify-center text-2xl mx-auto">
                  <i className="fas fa-circle-check"></i>
                </div>
                <h3 className="font-extrabold text-white text-lg font-display">You're subscribed!</h3>
                <p className="text-aubergine-100 text-sm font-semibold">
                  Welcome to the HealNari community — you'll hear from us with health tips and updates.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default NewsletterSignup;
