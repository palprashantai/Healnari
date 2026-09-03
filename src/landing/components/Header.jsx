import React, { useState, useEffect } from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { NavLink } from 'react-router-dom';

function Header({ onStartConsult, onOpenAuth }) {
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

  const navLinks = [
    { label: 'Conditions', href: '#conditions' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Our doctors', href: '#doctors' },
    { label: 'Cycle Tracker', href: '#cycle-tracker' },
    { label: 'Lab Tests', href: '#lab-tests' },
    { label: 'FAQ', href: '#faq' },
  ];


  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-sand-200/80 shadow-md py-3'
          : 'border-b border-transparent py-4'
      }`}
      style={{ backgroundColor: isScrolled ? 'rgba(253,251,247,0.93)' : 'rgba(253,251,247,0.98)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between gap-4">
        
        {/* Left Section: Logo + Nav */}
        <div className="flex items-center gap-6 xl:gap-12">
          {/* Brand Logo */}
          <NavLink to="/" className="shrink-0">
            <HealNariLogo size="md" />
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.label}
                href={link.href} 
              className="text-sm font-semibold text-slate-600 hover:text-aubergine-600 transition-colors relative py-1.5 whitespace-nowrap after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-aubergine-500 after:transition-all hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <NavLink
            to="/for-doctors"
            className="hidden xl:inline-flex text-xs font-extrabold text-aubergine-700 bg-aubergine-50 hover:bg-aubergine-100 border border-aubergine-200 px-3 py-2 rounded-xl transition-all shadow-2xs items-center gap-1.5 whitespace-nowrap"
          >
            <i className="fas fa-stethoscope text-[10px]"></i> For Doctors
          </NavLink>

          <button 
            onClick={() => document.body.classList.toggle('discreet-blur')}
            className="hidden lg:flex bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold px-3 py-2 rounded-xl text-sm border border-slate-200 transition-all btn-interactive items-center"
            title="Discreet Mode (Blur screen for privacy)"
            aria-label="Toggle discreet mode"
          >
            <i className="fas fa-eye-slash"></i>
          </button>
          <button 
            onClick={onOpenAuth}
            className="hidden lg:flex bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 transition-all btn-interactive items-center gap-2"
          >
            <i className="fas fa-user-circle text-slate-400"></i> Login
          </button>
          <button 
            onClick={onStartConsult}
            className="hidden sm:flex bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-aubergine-100 transition-all btn-interactive items-center gap-2"
          >
            <i className="fas fa-calendar-plus text-xs"></i> Start Consultation
          </button>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-colors btn-interactive touch-target"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
          </button>
        </div>
      </div>

      {/* Backdrop Scrim */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 bg-slate-900/40 backdrop-blur-xs z-30 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Dropdown */}
      <div 
        className={`lg:hidden absolute inset-x-0 top-full bg-white border-b border-slate-200 shadow-xl transition-all duration-300 ease-out overflow-y-auto z-40 max-h-[calc(100dvh-4.5rem)] ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'max-h-0 opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="px-5 py-6 space-y-3 flex flex-col safe-area-pb">
          {navLinks.map((link) => (
            <a 
              key={link.label}
              href={link.href} 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-700 hover:text-aubergine-600 transition-colors py-2 px-1 border-b border-slate-50 flex items-center justify-between"
            >
              <span>{link.label}</span>
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
