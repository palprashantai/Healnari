import Link from 'next/link';

export const metadata = {
  title: 'Healnari - Complete Women\'s Healthcare & Telemedicine',
  description: 'Track your menstrual cycle, manage PCOS symptoms, and consult board-certified gynecologists online—all in one secure, HIPAA-compliant app.',
  openGraph: {
    title: 'Healnari - The Complete Period Tracker & Telehealth Clinic for Women',
    description: 'Track your menstrual cycle, manage PCOS symptoms, and consult board-certified gynecologists online.',
  }
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="font-black text-2xl tracking-tighter text-aubergine-600">
            Healnari<span className="text-emerald-500">.</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 font-bold text-sm">
            <Link href="/doctors/search" className="text-slate-600 hover:text-aubergine-600 transition-colors">Find a Doctor</Link>
            <Link href="/calculators/ovulation" className="text-slate-600 hover:text-aubergine-600 transition-colors">Ovulation Calculator</Link>
            <Link href="/calculators/pcos-risk" className="text-slate-600 hover:text-aubergine-600 transition-colors">PCOS Assessment</Link>
          </nav>
          <div className="flex items-center gap-4">
            <a href="http://localhost:5173" className="font-bold text-sm text-slate-600 hover:text-aubergine-600">Login</a>
            <a href="http://localhost:5173" className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2 px-5 rounded-full text-sm transition-colors shadow-lg shadow-aubergine-200">
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="relative pt-20 pb-32 overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-bold text-sm mb-8 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              HIPAA & DPDP Act Compliant
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
              The Complete Period Tracker & Telehealth Clinic for Women
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Track your menstrual cycle, manage PCOS symptoms, and consult board-certified gynecologists online—all in one secure, HIPAA-compliant app.
            </p>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <a href="http://localhost:5173" className="w-full sm:w-auto bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all shadow-xl shadow-aubergine-200 hover:-translate-y-0.5">
                  Get Started Free
                </a>
                <Link href="/doctors/search" className="w-full sm:w-auto bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-4 px-8 rounded-full text-lg transition-all">
                  Browse Doctors
                </Link>
              </div>
              <div className="mt-2 text-sm text-slate-500 font-medium flex items-center gap-2">
                <span className="text-amber-400">★★★★★</span> Trusted by 50,000+ women. No credit card required.
              </div>
            </div>
          </div>
        </section>

        {/* Free Tools Section (SEO Drivers) */}
        <section className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-4">Free Clinical Tools</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Scientifically backed calculators and assessments to help you understand your body better.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Link href="/calculators/ovulation" className="group block bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-rose-600 transition-colors">Ovulation Calculator</h3>
                <p className="text-slate-600">Find your most fertile days and predict your next period with our clinically accurate calculator.</p>
              </Link>
              <Link href="/calculators/pcos-risk" className="group block bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-aubergine-200 transition-all">
                <div className="w-14 h-14 bg-aubergine-50 rounded-2xl flex items-center justify-center text-aubergine-600 mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-aubergine-600 transition-colors">PCOS Risk Assessment</h3>
                <p className="text-slate-600">Take a short quiz to understand your symptoms and see if you should consult a specialist for PCOS.</p>
              </Link>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions (GEO / AI Optimization) */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-slate-600">Everything you need to know about the Healnari healthcare platform.</p>
            </div>
            
            {/* FAQ Schema for AI Overviews */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [{
                "@type": "Question",
                "name": "What is Healnari?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Healnari is a complete women's healthcare platform that combines a period and ovulation tracker with a native telemedicine clinic, allowing users to consult board-certified gynecologists directly within the app."
                }
              }, {
                "@type": "Question",
                "name": "Is Healnari HIPAA compliant?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, Healnari is fully HIPAA and DPDP Act compliant. Your health data and clinical records are encrypted and kept strictly confidential."
                }
              }]
            })}} />

            <div className="space-y-6">
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-900 mb-2">What makes Healnari different from Flo or Clue?</h3>
                <p className="text-slate-600 leading-relaxed">Unlike standard period tracking apps that only provide algorithmic predictions, Healnari bridges the gap between tracking and treatment. If your cycle is irregular, you can share your clinical history directly with a verified gynecologist and book a telehealth consultation instantly within the same app.</p>
              </div>
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-900 mb-2">Are the doctors on Healnari verified?</h3>
                <p className="text-slate-600 leading-relaxed">Yes. Every doctor on the Healnari platform undergoes a rigorous KYC and board-certification verification process. All medical educational content is also reviewed and approved by our Medical Review Board.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-center text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="font-black text-2xl tracking-tighter text-white mb-6">
            Healnari<span className="text-emerald-500">.</span>
          </div>
          <p className="mb-6 max-w-xl mx-auto">Healnari is a digital health platform and does not replace professional medical advice. Always consult a healthcare provider for medical decisions.</p>
          <div className="flex justify-center gap-6 mb-8 text-sm font-bold">
            <Link href="/doctors/search" className="hover:text-white transition-colors">Doctors</Link>
            <Link href="/calculators/ovulation" className="hover:text-white transition-colors">Calculators</Link>
            <a href="http://localhost:5173" className="hover:text-white transition-colors">Login</a>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Healnari Healthcare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
