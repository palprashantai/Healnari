import React from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { useToast } from '../../components/Toast.jsx';

function Footer() {
  const toast = useToast();

  const notReady = (label) => (e) => {
    e.preventDefault();
    toast(`${label} page is coming soon. Connect with us on Instagram!`, 'info');
  };

  const exploreLinks = [
    { label: 'Conditions We Treat', href: '#conditions' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Our Doctors', href: '#doctors' },
    { label: 'Lab Tests Guide', href: '#lab-tests' },
    { label: 'FAQ', href: '#faq' },
  ];

  const legalLinks = [
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Refund & Cancellation', href: '/legal/refund' },
    { label: 'Medical Disclaimer', href: '#medical-disclaimer' },
  ];

  const socials = [
    { 
      icon: 'fa-instagram', 
      label: 'Instagram', 
      href: 'https://www.instagram.com/healnarii/', 
      isLive: true,
      color: 'hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 hover:text-white hover:border-transparent'
    },
    { icon: 'fa-x-twitter', label: 'Twitter / X', href: '#', isLive: false },
    { icon: 'fa-facebook-f', label: 'Facebook', href: '#', isLive: false },
    { icon: 'fa-linkedin-in', label: 'LinkedIn', href: '#', isLive: false },
  ];

  return (
    <footer className="mt-12 sm:mt-16 bg-gradient-to-b from-aubergine-900 to-indigo-950 text-aubergine-100 relative overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-aubergine-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-magenta-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 md:gap-8">
          
          {/* Brand column */}
          <div className="space-y-3">
            <HealNariLogo size="sm" variant="dark" />
            <p className="text-xs text-aubergine-200 leading-relaxed max-w-xs font-normal">
              Root-cause, doctor-led telemedicine for PCOS, hormonal health, and metabolic wellness worldwide.
            </p>

            {/* Social media icons with Instagram prominent */}
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

            <div className="flex items-center gap-1.5 pt-1">
              {socials.filter(s => !s.isLive).map((s) => (
                <button
                  key={s.label}
                  onClick={notReady(s.label)}
                  aria-label={s.label}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors text-xs text-aubergine-200"
                >
                  <i className={`fab ${s.icon} text-[11px]`}></i>
                </button>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Explore</h4>
            <ul className="space-y-2 text-xs">
              {exploreLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-aubergine-200 hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Legal &amp; Trust</h4>
            <ul className="space-y-2 text-xs">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <a href={l.href} className="text-aubergine-200 hover:text-white transition-colors">{l.label}</a>
                  ) : (
                    <a href="#" onClick={notReady(l.label)} className="text-aubergine-200 hover:text-white transition-colors">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance badges */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Global Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-aubergine-200">
                <i className="fas fa-shield-virus text-emerald-400 text-xs"></i> HIPAA-Aligned Practices
              </li>
              <li className="flex items-center gap-1.5 text-aubergine-200">
                <i className="fas fa-user-lock text-emerald-400 text-xs"></i> GDPR-Aligned Privacy
              </li>
              <li className="flex items-center gap-1.5 text-aubergine-200">
                <i className="fas fa-certificate text-emerald-400 text-xs"></i> DHA &amp; GCC Aligned
              </li>
              <li className="flex items-center gap-1.5 text-aubergine-200">
                <i className="fas fa-lock text-emerald-400 text-xs"></i> 256-Bit TLS Video
              </li>
            </ul>
          </div>
        </div>

        {/* Compact Medical Disclaimer */}
        <div id="medical-disclaimer" className="mt-8 pt-4 border-t border-white/10 text-[10.5px] text-aubergine-300 leading-relaxed">
          <p>
            <strong className="text-aubergine-100">Medical Disclaimer:</strong> HealNari provides digital consultations and wellness protocols for educational and clinical guidance. Not a replacement for local emergency services (911/999/112).
          </p>
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-aubergine-300">
          <p>© {new Date().getFullYear()} HealNari Global Telemedicine. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/healnarii/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-pink-200 transition-colors flex items-center gap-1 font-bold"
            >
              <i className="fab fa-instagram text-xs"></i> @healnarii
            </a>
            <span>•</span>
            <p className="flex items-center gap-1">
              Serving patients worldwide with <i className="fas fa-heart text-magenta-400 text-[10px]"></i>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
