import React from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { NavLink } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';

function ProviderFooter({ onApply, onOpenAuth }) {
  const toast = useToast();

  const handleInfo = (label) => (e) => {
    e.preventDefault();
    toast(`${label} information is available during credentialing review.`, 'info');
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
    { label: 'NMC Telemedicine Guidelines (2020)' },
    { label: 'Weekly Payout Terms (90/10 Split)' },
    { label: 'Provider Privacy & EMR Protection' },
    { label: 'Physician Code of Conduct' },
    { label: 'Malpractice & Clinical Liability' },
  ];

  const complianceBadges = [
    { icon: 'fa-shield-halved', label: '256-Bit AES / TLS Encryption' },
    { icon: 'fa-user-lock', label: 'HIPAA & GDPR Compliant' },
    { icon: 'fa-certificate', label: 'NMC & State Board Verified' },
    { icon: 'fa-server', label: 'ISO 27001 Certified Cloud' },
  ];

  return (
    <footer 
      className="mt-20 bg-[#160B28] text-white relative overflow-hidden border-t border-purple-900/40"
      style={{ backgroundColor: '#160B28' }}
    >
      {/* Decorative ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-5 md:px-8 pt-12 sm:pt-16 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-8">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <HealNariLogo size="md" variant="dark" />
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-900/90 text-purple-200 border border-purple-500/40 px-2.5 py-0.5 rounded-full shadow-xs">
                Provider Network
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm font-normal">
              Empowering Gynaecologists, Endocrinologists, and Women's Health Specialists with full-stack digital clinics, intelligent EMR, and pre-screened patient pipelines.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={onApply}
                className="bg-aubergine-600 hover:bg-aubergine-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 hover:scale-105"
              >
                <i className="fas fa-stethoscope"></i> Apply as Provider
              </button>
              <button
                onClick={onOpenAuth}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-white/20"
              >
                Provider Sign In
              </button>
            </div>
          </div>

          {/* Provider Portal Links */}
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-compass text-purple-400"></i> Provider Portal
            </h3>
            <ul className="space-y-2.5 text-sm">
              {providerLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
                    <span className="text-purple-400 text-xs font-bold">›</span> {l.label}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <NavLink to="/" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors flex items-center gap-1.5 text-xs">
                  <i className="fas fa-arrow-left"></i> Switch to Patient Portal
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Clinical Governance & Legal */}
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-scale-balanced text-indigo-400"></i> Clinical Governance
            </h3>
            <ul className="space-y-2.5 text-sm">
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
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-shield-virus text-emerald-400"></i> Data Security
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm">
              {complianceBadges.map((b) => (
                <li key={b.label} className="flex items-center gap-2 text-slate-200 font-medium">
                  <i className={`fas ${b.icon} text-emerald-400 shrink-0 text-sm`}></i>
                  <span>{b.label}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Clinical Disclaimer for Providers */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-[11px] md:text-xs text-slate-300 leading-relaxed max-w-5xl">
            <span className="font-bold text-white flex items-center gap-1.5 mb-1 text-xs">
              <i className="fas fa-circle-info text-purple-400"></i> Provider Clinical Autonomy &amp; Legal Notice:
            </span>
            HealNari provides digital telehealth software, encrypted video infrastructure, and clinical record management tools. Healthcare practitioners onboarded to the HealNari network practice independently and maintain 100% clinical discretion over patient diagnoses, protocol designs, lab recommendations, and prescriptions. All teleconsultations are conducted in compliance with the National Medical Commission (NMC) Telemedicine Practice Guidelines.
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} HealNari Provider Network. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400 text-xs font-medium">
            <span>256-Bit TLS Secured</span>
            <span>•</span>
            <span>NMC Verified Providers</span>
            <span>•</span>
            <span>Zero Clinic Overhead</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default ProviderFooter;
