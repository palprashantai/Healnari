import React, { useState, useEffect } from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { NavLink } from 'react-router-dom';

function ProviderHeader({ onApply, onOpenAuth }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const doctorNavLinks = [
    { label: 'AI Suite', href: '#ai-clinical-suite', isAi: true },
    { label: 'Features', href: '#benefits' },
    { label: 'Calculator', href: '#calculator' },
    { label: 'Comparison', href: '#comparison' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-sand-200/80 shadow-md py-2.5'
          : 'border-b border-sand-200/40 py-3.5'
      }`}
      style={{ backgroundColor: isScrolled ? 'rgba(253,251,247,0.96)' : 'rgba(253,251,247,0.98)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Left Section: Logo + For Doctors Tag */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <NavLink to="/" className="shrink-0 flex items-center">
            <HealNariLogo size="sm" />
          </NavLink>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-aubergine-100/80 text-aubergine-800 border border-aubergine-200/80 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
            For Doctors
          </span>
        </div>

        {/* Center Section: Desktop Doctor Navigation */}
        <nav className="hidden xl:flex items-center justify-center gap-5 2xl:gap-7 flex-1 min-w-0 px-4">
          {doctorNavLinks.map((link) => (
            <a 
              key={link.label}
              href={link.href} 
              className={`text-xs font-extrabold transition-colors whitespace-nowrap py-1 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:transition-all hover:after:w-full flex items-center gap-1.5 ${
                link.isAi
                  ? 'text-aubergine-800 hover:text-aubergine-900 font-black after:bg-aubergine-600'
                  : 'text-slate-600 hover:text-aubergine-700 after:bg-aubergine-600'
              }`}
            >
              {link.isAi && <i className="fas fa-wand-magic-sparkles text-[10px] text-magenta-500 animate-pulse"></i>}
              <span>{link.label}</span>
              {link.isAi && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-aubergine-100 text-aubergine-700 border border-aubergine-200 px-1.5 py-0.2 rounded-full">
                  AI
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Right Section: Doctor Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NavLink
            to="/"
            className="hidden 2xl:inline-flex text-xs font-bold text-slate-500 hover:text-aubergine-700 bg-sand-100/70 hover:bg-sand-200/70 border border-sand-200/80 px-2.5 py-1.5 rounded-xl transition-colors whitespace-nowrap"
          >
            ← Patient Site
          </NavLink>

          <button 
            onClick={onOpenAuth}
            className="hidden sm:flex bg-white hover:bg-slate-50 text-slate-700 font-extrabold px-3.5 py-2 rounded-xl text-xs border border-sand-300 transition-all shadow-xs items-center gap-1.5 whitespace-nowrap"
          >
            <i className="fas fa-lock text-slate-400 text-[10px]"></i> Provider Login
          </button>
          
          <button 
            onClick={onApply}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-md shadow-aubergine-100 transition-all hover:scale-105 items-center gap-1.5 flex whitespace-nowrap"
          >
            <i className="fas fa-stethoscope text-xs"></i>
            <span className="hidden sm:inline">Apply as Specialist</span>
            <span className="sm:hidden">Apply</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-sand-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-sm`}></i>
          </button>
        </div>

      </div>

      {/* Backdrop Scrim */}
      {isMobileMenuOpen && (
        <div
          className="xl:hidden fixed inset-0 top-16 bg-slate-900/40 backdrop-blur-xs z-30 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div 
        className={`xl:hidden absolute inset-x-0 top-full bg-white border-b border-sand-200 shadow-xl transition-all duration-300 ease-out overflow-y-auto z-40 ${
          isMobileMenuOpen ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-6 py-6 space-y-4 flex flex-col">
          <div className="text-xs font-black text-aubergine-700 uppercase tracking-widest pb-2 border-b border-slate-100">
            Provider Navigation
          </div>
          {doctorNavLinks.map((link) => (
            <a 
              key={link.label}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-bold transition-colors py-1 flex items-center justify-between ${
                link.isAi ? 'text-aubergine-800 font-extrabold' : 'text-slate-700 hover:text-aubergine-700'
              }`}
            >
              <span className="flex items-center gap-2">
                {link.isAi && <i className="fas fa-wand-magic-sparkles text-[11px] text-magenta-500 animate-pulse"></i>}
                <span>{link.label}</span>
                {link.isAi && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-aubergine-100 text-aubergine-700 border border-aubergine-200 px-1.5 py-0.2 rounded-full">
                    AI EMR
                  </span>
                )}
              </span>
              <i className="fas fa-chevron-right text-[10px] text-slate-300"></i>
            </a>
          ))}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onApply();
              }}
              className="w-full bg-aubergine-700 hover:bg-aubergine-800 text-white font-extrabold py-3 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-stethoscope"></i> Apply as Specialist
            </button>
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-lock"></i> Provider Login
            </button>
            <NavLink
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full text-center text-xs font-bold text-slate-500 hover:text-aubergine-700 py-2 block"
            >
              ← Back to Patient Site
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
}

export default ProviderHeader;
