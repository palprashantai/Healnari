import React, { useState, useEffect } from 'react';

function FloatingCTA({ onBook }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappNumber = '919999999999'; // Placeholder
  const whatsappMsg = encodeURIComponent('Hi, I would like to book a consultation for my health concern.');

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-4 md:left-5 z-50 flex flex-col items-start gap-3 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
    >
      {/* Expandable Action Buttons */}
      {isExpanded && (
        <div className="flex flex-col items-start gap-2.5 animate-fade-in">
          {/* WhatsApp */}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-200 transition-all btn-interactive"
          >
            <i className="fab fa-whatsapp text-lg"></i>
            Chat on WhatsApp
          </a>

          {/* Call */}
          <a
            href="tel:+919999999999"
            className="flex items-center gap-2.5 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-aubergine-500/20 transition-all btn-interactive"
          >
            <i className="fas fa-phone text-sm"></i>
            Call Now
          </a>

          {/* Book Consultation */}
          <button
            onClick={() => { onBook(''); setIsExpanded(false); }}
            className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-aubergine-200 text-aubergine-700 font-bold text-sm px-4 py-2.5 rounded-2xl shadow-lg transition-all btn-interactive"
          >
            <i className="fas fa-calendar-check text-sm text-aubergine-600"></i>
            Book Consultation
          </button>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white text-xl transition-all duration-300 btn-interactive ${
          isExpanded
            ? 'bg-slate-700 hover:bg-slate-800 rotate-45 shadow-slate-200'
            : 'bg-gradient-to-tr from-aubergine-600 to-magenta-600 hover:scale-110 shadow-aubergine-500/25 animate-pulse-subtle'
        }`}
        aria-label="Contact options"
      >
        <i className={`fas ${isExpanded ? 'fa-times' : 'fa-comment-medical'}`}></i>
      </button>

      {/* Tooltip label when not expanded */}
      {!isExpanded && (
        <span className="text-[10px] font-bold text-slate-400 text-center -mt-1">Get Help</span>
      )}
    </div>
  );
}

export default FloatingCTA;
