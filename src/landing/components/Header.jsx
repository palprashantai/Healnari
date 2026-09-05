import React, { useState, useEffect } from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { NavLink } from 'react-router-dom';

function Header({ onStartConsult, onOpenAuth }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDiscreet, setIsDiscreet] = useState(() => {
    return document.body.classList.contains('discreet-blur') || localStorage.getItem('discreet_mode') === 'true';
  });

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

  useEffect(() => {
    if (localStorage.getItem('discreet_mode') === 'true') {
      document.body.classList.add('discreet-blur');
      setIsDiscreet(true);
    }
    const handleDiscreetChange = () => {
      setIsDiscreet(document.body.classList.contains('discreet-blur') || localStorage.getItem('discreet_mode') === 'true');
    };
    window.addEventListener('discreet_mode_changed', handleDiscreetChange);
    return () => window.removeEventListener('discreet_mode_changed', handleDiscreetChange);
  }, []);

  const toggleDiscreet = () => {
    const next = !isDiscreet;
    setIsDiscreet(next);
    if (next) {
      document.body.classList.add('discreet-blur');
      localStorage.setItem('discreet_mode', 'true');
    } else {
      document.body.classList.remove('discreet-blur');
      localStorage.setItem('discreet_mode', 'false');
    }
    window.dispatchEvent(new Event('discreet_mode_changed'));
  };

  const navLinks = [
    { label: 'AI Health Suite', href: '#ai-features', isAi: true },
    { label: 'Conditions', href: '#conditions' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Doctors', href: '#doctors' },
    { label: 'Cycle Tracker', href: '#cycle-tracker' },
    { label: 'Lab Tests', href: '#lab-tests' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleNavClick = (e, href) => {
    setIsMobileMenuOpen(false);

    // If currently on a different page (e.g. /for-doctors, /conditions/pcos), navigate to /#hash
    if (window.location.pathname !== '/') {
      e.preventDefault();
      window.location.href = `/${href}`;
      return;
    }

    // If already on the home page, scroll directly and smoothly to the section
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      e.preventDefault();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', href);
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-sand-200/80 shadow-md py-2.5'
          : 'border-b border-transparent py-3'
      }`}
      style={{ backgroundColor: isScrolled ? 'rgba(253,251,247,0.93)' : 'rgba(253,251,247,0.98)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 lg:gap-4">
        
        {/* Left Section: Logo + Nav */}
        <div className="flex items-center gap-3 lg:gap-5 xl:gap-6 shrink-0">
          {/* Brand Logo */}
          <NavLink to="/" className="shrink-0">
            <HealNariLogo size="md" />
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-2 xl:gap-2.5 2xl:gap-3.5">
            {navLinks.map((link) => (
              <a 
                key={link.label}
                href={link.href} 
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-xs 2xl:text-[13px] font-semibold transition-colors relative py-1 px-1 whitespace-nowrap shrink-0 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:transition-all hover:after:w-full flex items-center gap-1 ${
                  link.isAi
                    ? 'text-magenta-600 hover:text-magenta-700 font-bold after:bg-magenta-500'
                    : 'text-slate-600 hover:text-aubergine-600 after:bg-aubergine-500'
                }`}
              >
                {link.isAi && <i className="fas fa-wand-magic-sparkles text-[10px] text-magenta-500 animate-pulse"></i>}
                <span>{link.label}</span>
                {link.isAi && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-magenta-100 text-magenta-700 px-1.5 py-0.2 rounded-full">
                    AI
                  </span>
                )}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <NavLink
            to="/for-doctors"
            className="hidden xl:inline-flex text-xs font-bold text-aubergine-700 bg-aubergine-50/90 hover:bg-aubergine-100 border border-aubergine-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Join or login as a Healthcare Provider"
          >
            <i className="fas fa-stethoscope text-[11px] text-aubergine-600"></i>
            <span>For Doctors</span>
          </NavLink>

          <button 
            onClick={toggleDiscreet}
            className={`hidden xl:flex w-8 h-8 rounded-xl font-bold text-xs border transition-all btn-interactive items-center justify-center shrink-0 ${
              isDiscreet 
                ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-700 shadow-inner' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={isDiscreet ? "Disable Discreet Mode" : "Discreet Mode (Blur screen for privacy)"}
            aria-label="Toggle discreet mode"
          >
            <i className={`fas ${isDiscreet ? 'fa-eye' : 'fa-eye-slash'}`}></i>
          </button>
          <button 
            onClick={onOpenAuth}
            className="hidden sm:flex bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm border border-slate-200 transition-all btn-interactive items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <i className="fas fa-user-circle text-slate-400"></i> Login
          </button>
          <button 
            onClick={onStartConsult}
            className="hidden sm:flex bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-aubergine-100 transition-all btn-interactive items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <i className="fas fa-calendar-plus text-xs"></i> Start Consultation
          </button>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-colors btn-interactive touch-target"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-base`}></i>
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

      {/* Mobile Menu Dropdown */}
      <div 
        className={`xl:hidden absolute inset-x-0 top-full bg-white border-b border-slate-200 shadow-xl transition-all duration-300 ease-out overflow-y-auto z-40 max-h-[calc(100dvh-4.5rem)] ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'max-h-0 opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="px-5 py-6 space-y-3 flex flex-col safe-area-pb">
          {navLinks.map((link) => (
            <a 
              key={link.label}
              href={link.href} 
              onClick={(e) => handleNavClick(e, link.href)}
              className={`text-base font-semibold transition-colors py-2 px-1 border-b border-slate-50 flex items-center justify-between ${
                link.isAi ? 'text-magenta-600 font-bold' : 'text-slate-700 hover:text-aubergine-600'
              }`}
            >
              <span className="flex items-center gap-2">
                {link.isAi && <i className="fas fa-wand-magic-sparkles text-xs text-magenta-500 animate-pulse"></i>}
                <span>{link.label}</span>
                {link.isAi && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-magenta-100 text-magenta-700 px-1.5 py-0.2 rounded-full">
                    NEW AI
                  </span>
                )}
              </span>
              <i className="fas fa-chevron-right text-xs text-slate-300"></i>
            </a>
          ))}
          <NavLink
            to="/for-doctors"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-base font-semibold text-aubergine-700 hover:text-aubergine-800 transition-colors py-2 px-1 flex items-center gap-2 border-b border-slate-50"
          >
            <i className="fas fa-stethoscope text-xs"></i> For Healthcare Providers
          </NavLink>
          <div className="pt-2 space-y-2.5">
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onStartConsult();
              }}
              className="w-full bg-aubergine-600 hover:bg-aubergine-700 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all btn-interactive flex items-center justify-center gap-2 touch-target"
            >
              <i className="fas fa-calendar-plus"></i> Start Consultation
            </button>
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all btn-interactive flex items-center justify-center gap-2 touch-target"
            >
              <i className="fas fa-user-circle"></i> Login / Register
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
