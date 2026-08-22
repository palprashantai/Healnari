import React from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { NavLink } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';

function ProviderFooter({ onApply, onOpenAuth }) {
  const toast = useToast();

  const handleInfo = (label) => (e) => {
    e.preventDefault();
    toast(`${label} details are available during provider credentialing review.`, 'info');
  };

  const providerLinks = [
    { label: 'Clinical EMR Features', href: '#benefits' },
    { label: 'Practice Calculator', href: '#calculator' },
    { label: 'Clinic Comparison', href: '#comparison' },
    { label: 'Peer Reviews', href: '#testimonials' },
    { label: 'Security & CDSS', href: '#security' },
    { label: 'Provider FAQs', href: '#faq' },
  ];

  const governanceLinks = [
    { label: 'NMC Telemedicine Guidelines' },
    { label: 'Weekly Payout Terms (90/10)' },
    { label: 'Provider Privacy & EMR Protection' },
    { label: 'Physician Code of Conduct' },
  ];

  const complianceBadges = [
    { icon: 'fa-shield-halved', label: '256-Bit AES / TLS Encryption' },
    { icon: 'fa-user-lock', label: 'HIPAA & GDPR Aligned' },
    { icon: 'fa-certificate', label: 'NMC Verified Specialists' },
    { icon: 'fa-server', label: 'ISO 27001 Cloud' },
  ];

  return (
    <footer 
      className="mt-12 sm:mt-16 bg-[#160B28] text-white relative overflow-hidden border-t border-purple-900/40"
      style={{ backgroundColor: '#160B28' }}
    >
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 md:gap-8">
          
          {/* Brand Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <HealNariLogo size="sm" variant="dark" />
              <span className="text-[9px] font-black uppercase tracking-wider bg-purple-900/90 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-full">
                Provider Network
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              Full-stack digital clinic, AI-assisted EMR, and pre-screened patient practice for Gynaecologists &amp; Endocrinologists.
            </p>

            {/* Social & Community Links */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://www.instagram.com/healnarii/"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow @healnarii on Instagram"
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-xs hover:scale-105 transition-transform"
              >
                <i className="fab fa-instagram text-sm"></i>
              </a>
              <a
                href="https://www.instagram.com/healnarii/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-pink-300 hover:text-pink-100 transition-colors"
              >
                @healnarii
              </a>
            </div>

            {/* Quick Actions */}
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={onApply}
                className="bg-aubergine-600 hover:bg-aubergine-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
              >
                <i className="fas fa-stethoscope text-[11px]"></i> Apply as Provider
              </button>
              <button
                onClick={onOpenAuth}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all border border-white/20 active:scale-95"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Provider Portal Links */}
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <i className="fas fa-compass text-purple-400 text-[11px]"></i> Provider Portal
            </p>
            <ul className="space-y-2 text-xs">
              {providerLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
                    <span className="text-purple-400 font-bold">›</span> {l.label}
                  </a>
                </li>
              ))}
              <li className="pt-1">
                <NavLink to="/" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors flex items-center gap-1">
                  <i className="fas fa-arrow-left text-[10px]"></i> Switch to Patient Portal
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Clinical Governance & Legal */}
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <i className="fas fa-scale-balanced text-indigo-400 text-[11px]"></i> Clinical Governance
            </p>
            <ul className="space-y-2 text-xs">
              {governanceLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href="#"
                    onClick={handleInfo(l.label)}
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance & Security */}
          <div>
            <p className="text-xs font-black text-white uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <i className="fas fa-shield-virus text-emerald-400 text-[11px]"></i> Data Security
            </p>
            <ul className="space-y-2 text-xs">
              {complianceBadges.map((b) => (
                <li key={b.label} className="flex items-center gap-2 text-slate-200 font-medium">
                  <i className={`fas ${b.icon} text-emerald-400 shrink-0 text-xs`}></i>
                  <span>{b.label}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Compact Clinical Disclaimer for Providers */}
        <div className="mt-8 pt-4 border-t border-white/10 text-[10.5px] text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-200">Clinical Autonomy:</strong> Doctors on the HealNari network practice independently and maintain 100% clinical discretion over all diagnoses, prescriptions, and lab protocols in compliance with NMC Telemedicine Practice Guidelines.
          </p>
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} HealNari Provider Network. All rights reserved.</p>
          <div className="flex items-center gap-3 text-slate-400 text-xs font-medium flex-wrap">
            <a
              href="https://www.instagram.com/healnarii/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-pink-200 transition-colors flex items-center gap-1 font-bold"
            >
              <i className="fab fa-instagram text-xs"></i> @healnarii
            </a>
            <span>•</span>
            <span>256-Bit TLS Secured</span>
            <span>•</span>
            <span>NMC Verified</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default ProviderFooter;
