import React from 'react';

function Footer() {
  return (
    <footer className="border-t border-sand-200 py-10 mt-16 text-slate-500 text-xs md:text-sm" style={{ backgroundColor: 'var(--color-surface-card)' }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand identity */}
        <div className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left">
          <div className="w-8 h-8 rounded-lg bg-aubergine-50 flex items-center justify-center text-aubergine-600 text-sm">
            <i className="fas fa-leaf"></i>
          </div>
          <div>
            <span className="font-extrabold text-slate-800 text-base font-display">
              FemCare
            </span>
            <p className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5">
              © {new Date().getFullYear()} FemCare — Doctor-led women's hormonal & hair wellness.
            </p>
          </div>
        </div>

        {/* Lock indicators & statements */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 font-semibold text-slate-400 text-xs">
          <span className="flex items-center gap-1.5 hover:text-slate-650 transition-colors">
            <i className="fas fa-shield-halved text-emerald-500"></i> HIPAA Compliant
          </span>
          <span className="hidden md:inline text-slate-200">|</span>
          <span className="flex items-center gap-1.5 hover:text-slate-650 transition-colors">
            <i className="fas fa-lock text-aubergine-500/80"></i> 100% Secure
          </span>
          <span className="hidden md:inline text-slate-200">|</span>
          <a href="#" className="hover:text-aubergine-600 transition-colors underline decoration-slate-200 underline-offset-4">Terms of Service</a>
          <span className="hidden md:inline text-slate-200">|</span>
          <a href="#" className="hover:text-aubergine-600 transition-colors underline decoration-slate-200 underline-offset-4">Privacy Policy</a>
        </div>

      </div>
      
      {/* Medical Disclaimer */}
      <div className="max-w-4xl mx-auto px-5 md:px-8 mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-relaxed">
          <span className="font-bold text-slate-500">Medical Disclaimer:</span> FemHealth provides digital health consultations and structured wellness protocols. The content on this platform is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or emergency care. If you are experiencing severe pain, heavy bleeding, or a medical emergency, please visit your nearest hospital or call emergency services immediately.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
