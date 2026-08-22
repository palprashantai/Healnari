import React from 'react';
import { Link } from 'react-router-dom';
import { HealNariLogo } from '../../components/HealNariLogo.jsx';
import { useToast } from '../../components/Toast.jsx';

function Footer() {
  const toast = useToast();

  const specialties = [
    { label: "Women's Health & Gynaecology", href: '/gynecology-womens-health' },
    { label: "PCOS & Hormonal Health", href: '/pcos-treatment-online' },
    { label: "Endocrinology & Thyroid", href: '/thyroid-consultation' },
    { label: "Dermatology & Hormonal Acne", href: '/hormonal-dermatology-acne' },
    { label: "Hair & Scalp / Trichology", href: '/hair-loss-trichology' },
    { label: "Clinical Nutrition & Dietetics", href: '/clinical-nutrition-dietetics' },
    { label: "Yoga & Movement Therapy", href: '/yoga-movement-therapy' },
    { label: "Fertility & Preconception", href: '/fertility-preconception-care' },
    { label: "Hormonal Weight Protocol", href: '/hormonal-weight-loss' },
  ];

  const clinicalGuides = [
    { label: "PCOS vs PCOD Terminology", href: '/guide/pcos-vs-pcod-terminology' },
    { label: "Evidence-Based PCOS Nutrition", href: '/guide/pcos-personalized-nutrition' },
    { label: "Managing PCOS & Metabolism", href: '/guide/pcos-weight-loss' },
    { label: "Hormonal Hair Loss Triggers", href: '/guide/hair-fall-triggers' },
    { label: "Cortisol & Cycle Balance", href: '/guide/cortisol-balance' },
    { label: "Anti-Inflammatory Nutrition", href: '/guide/anti-inflammatory-foods' },
    { label: "Seed Cycling Clinical Guide", href: '/guide/seed-cycling-guide' },
    { label: "Sleep Architecture & Hormones", href: '/guide/sleep-hormonal-health' },
  ];

  const diagnosticGlossary = [
    { label: "High Testosterone in Women", href: '/learn/what-is-high-testosterone-in-women' },
    { label: "Insulin Resistance Symptoms", href: '/learn/insulin-resistance-symptoms' },
    { label: "Normal LH to FSH Ratio", href: '/learn/normal-lh-fsh-ratio' },
    { label: "For Healthcare Providers", href: '/for-doctors' },
  ];

  const legalLinks = [
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Refund & Cancellation', href: '/legal/refund' },
    { label: 'Global Compliance & Security', href: '/legal/compliance' },
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

  const notReady = (label) => (e) => {
    e.preventDefault();
    toast(`${label} page is coming soon. Connect with us on Instagram!`, 'info');
  };

  return (
    <footer className="mt-12 sm:mt-16 bg-gradient-to-b from-[#1E1035] via-[#2A1647] to-[#120824] text-aubergine-100 relative overflow-hidden border-t border-sand-200/20">
      {/* Decorative ambient lighting */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-aubergine-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-magenta-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-12 pb-8">
        
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 pb-10 border-b border-white/10">
          
          {/* Brand column */}
          <div className="space-y-4 lg:col-span-2">
            <HealNariLogo size="sm" variant="dark" />
            <p className="text-xs text-aubergine-200 leading-relaxed max-w-sm font-normal">
              HealNari is the connected women's health platform connecting patients with qualified specialists across Gynaecology, PCOS, Endocrinology, Dermatology, Hair &amp; Scalp, Nutrition, and Yoga. 
            </p>

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

            <div className="pt-2">
              <Link
                to="/for-doctors"
                className="inline-flex items-center gap-2 text-xs font-extrabold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 rounded-xl transition-all"
              >
                <i className="fas fa-stethoscope text-emerald-400"></i> Join as a Specialist Doctor
              </Link>
            </div>
          </div>

          {/* Specialties Column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3.5">
              Specialist Domains
            </h3>
            <ul className="space-y-2 text-xs">
              {specialties.map((s) => (
                <li key={s.href}>
                  <Link to={s.href} className="text-aubergine-200 hover:text-white transition-colors block py-0.5">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinical Guides Column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3.5">
              Clinical Guides
            </h3>
            <ul className="space-y-2 text-xs">
              {clinicalGuides.map((g) => (
                <li key={g.href}>
                  <Link to={g.href} className="text-aubergine-200 hover:text-white transition-colors block py-0.5">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Diagnostics & Trust Column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3.5">
              Diagnostics &amp; Trust
            </h3>
            <ul className="space-y-2 text-xs">
              {diagnosticGlossary.map((d) => (
                <li key={d.href}>
                  <Link to={d.href} className="text-aubergine-200 hover:text-white transition-colors block py-0.5">
                    {d.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-5 mb-2.5">
              Legal &amp; Compliance
            </h3>
            <ul className="space-y-1.5 text-xs">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith('/') ? (
                    <Link to={l.href} className="text-aubergine-200 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="text-aubergine-200 hover:text-white transition-colors">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Global Compliance Badges */}
        <div className="pt-6 pb-4 flex flex-wrap items-center justify-between gap-4 text-xs text-aubergine-300">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5"><i className="fas fa-shield-virus text-emerald-400"></i> HIPAA Aligned</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-user-lock text-emerald-400"></i> GDPR Compliant</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-certificate text-emerald-400"></i> DHA &amp; GCC Aligned</span>
            <span className="flex items-center gap-1.5"><i className="fas fa-lock text-emerald-400"></i> 256-Bit Encrypted WebRTC</span>
          </div>
          <span className="text-[11px] text-aubergine-400">Available across India, UAE, UK, US, Germany &amp; Worldwide</span>
        </div>

        {/* Compact Medical Disclaimer */}
        <div id="medical-disclaimer" className="pt-4 border-t border-white/10 text-[10.5px] text-aubergine-300 leading-relaxed">
          <p>
            <strong className="text-aubergine-100">Medical Notice:</strong> HealNari provides digital telehealth consultations, diagnostic coordination, and evidence-based wellness protocols. Telehealth consultations are not an alternative to emergency medical services. If you are experiencing acute pain, severe hemorrhage, or any clinical emergency, please call your local emergency services (112 / 999 / 911) or visit the nearest hospital emergency room.
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
              Serving women worldwide with <i className="fas fa-heart text-magenta-400 text-[10px]"></i>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
