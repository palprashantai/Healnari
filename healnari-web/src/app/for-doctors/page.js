import Link from 'next/link';
import { APP_URL } from '@/config/env';

export const metadata = {
  title: 'Healnari for Doctors | Grow Your Telemedicine Practice',
  description: 'Join Healnari to consult with verified patients, manage clinical records securely, and grow your digital women\'s healthcare practice.',
};

export default function ForDoctors() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter text-aubergine-600">
            Healnari<span className="text-emerald-500">.</span>
            <span className="text-sm text-slate-500 ml-2 font-bold tracking-normal">For Doctors</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href={APP_URL} className="font-bold text-sm text-slate-600 hover:text-aubergine-600">Patient Portal</a>
            <a href={`${APP_URL}/for-doctors`} className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2 px-5 rounded-full text-sm transition-colors shadow-lg">
              Doctor Login
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs mb-6 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Now accepting board-certified Gynecologists
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
            The modern clinic for <br/> women's healthcare.
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Join thousands of experts using Healnari to provide continuous, data-driven care to women. We handle the technology and compliance, so you can focus on medicine.
          </p>
          <div className="flex justify-center gap-4">
            <a href={`${APP_URL}/for-doctors`} className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all shadow-xl hover:-translate-y-0.5">
              Apply to Join Network
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-aubergine-50 text-aubergine-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Grow Your Practice</h3>
            <p className="text-slate-600">Access a vast network of patients actively seeking specialized women's health consultations and continuous care.</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">HIPAA Compliant</h3>
            <p className="text-slate-600">Bank-grade encryption, DPDP Act compliance, and automated PHI audit logs keep you and your patients completely secure.</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Unified Records</h3>
            <p className="text-slate-600">No more fragmented histories. View your patient's cycle logs, lab results, and previous prescriptions in one unified clinical timeline.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
