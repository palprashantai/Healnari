import React from 'react';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { useToast } from '../../components/Toast.jsx';

function Footer() {
  const toast = useToast();

  const notReady = (label) => (e) => {
    e.preventDefault();
    toast(`${label} is coming soon.`, 'info');
  };

  const exploreLinks = [
    { label: 'Conditions We Treat', href: '#conditions' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Our Doctors', href: '#doctors' },
    { label: 'Lab Tests Guide', href: '#lab-tests' },
    { label: 'FAQ', href: '#faq' },
  ];

  const legalLinks = [
    { label: 'Terms of Service' },
    { label: 'Privacy Policy' },
    { label: 'Refund & Cancellation' },
    { label: 'Medical Disclaimer', href: '#medical-disclaimer' },
  ];

  const socials = [
    { icon: 'fa-instagram', label: 'Instagram' },
    { icon: 'fa-x-twitter', label: 'Twitter / X' },
    { icon: 'fa-facebook-f', label: 'Facebook' },
    { icon: 'fa-linkedin-in', label: 'LinkedIn' },
  ];

  return (
    <footer className="mt-16 bg-gradient-to-b from-aubergine-900 to-indigo-950 text-aubergine-100 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-aubergine-500/10 rounded-full blur-3xl -z-0"></div>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-magenta-500/10 rounded-full blur-3xl -z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 pt-16 pb-10">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-8">
          {/* Brand column */}
          <div className="space-y-4">
            <HealNariLogo size="md" variant="dark" />
            <p className="text-sm text-aubergine-200 leading-relaxed max-w-xs">
              Root-cause, doctor-led telemedicine for PCOS, hormonal imbalances, and women's metabolic wellness — serving patients worldwide across the US, UK, UAE, and India.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              {socials.map((s) => (
                <button
                  key={s.label}
                  onClick={notReady(s.label)}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors btn-interactive"
                >
                  <i className={`fab ${s.icon} text-sm`}></i>
                </button>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              {exploreLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-aubergine-200 hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Legal &amp; Trust</h3>
            <ul className="space-y-2.5 text-sm">
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

          {/* Trust badges */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Global Compliance</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-aubergine-200" title="Health Insurance Portability and Accountability Act (USA)">
                <i className="fas fa-shield-virus text-emerald-400"></i> HIPAA Compliant (USA)
              </li>
              <li className="flex items-center gap-2 text-aubergine-200" title="General Data Protection Regulation (UK / EU)">
                <i className="fas fa-user-lock text-emerald-400"></i> GDPR Ready (UK &amp; EU)
              </li>
              <li className="flex items-center gap-2 text-aubergine-200" title="Dubai Health Authority & MOHAP Standards">
                <i className="fas fa-certificate text-emerald-400"></i> DHA &amp; GCC Aligned
              </li>
              <li className="flex items-center gap-2 text-aubergine-200">
                <i className="fas fa-lock text-emerald-400"></i> 256-Bit Encrypted Video
              </li>
            </ul>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div id="medical-disclaimer" className="mt-12 pt-8 border-t border-white/10 scroll-mt-24">
          <p className="text-[11px] md:text-xs text-aubergine-300 leading-relaxed max-w-4xl">
            <span className="font-bold text-aubergine-100">Medical Disclaimer:</span> HealNari provides digital health consultations and structured wellness protocols. The content on this platform is for informational purposes only and is not a substitute for emergency care or local emergency medical services. If you are experiencing acute pain, severe bleeding, or a medical emergency, please visit your nearest hospital or call local emergency services (911 in US, 999 in UK, 998 in UAE, 112 in India).
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-aubergine-300">
          <p>© {new Date().getFullYear()} HealNari Global Telemedicine. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Serving patients globally with <i className="fas fa-heart text-magenta-400 text-[10px]"></i> in US, UK, UAE, India &amp; Worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
