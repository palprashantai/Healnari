import React from 'react';
import Reveal from '../../components/Reveal.jsx';

function ProviderComparison() {
  const comparisonRows = [
    {
      feature: 'Practice Overhead & Rent',
      traditional: '$500 - $2,500/mo (₹40k - ₹1.5L) clinic rent, utility bills & receptionist staff',
      healnari: '$0 / ₹0 Overhead. Practice from anywhere with 100% cloud EMR infrastructure',
      highlight: true
    },
    {
      feature: 'Patient Acquisition',
      traditional: 'Costly local ads, word-of-mouth, unverified walk-ins',
      healnari: 'Continuous stream of pre-screened patients seeking root-cause care',
      highlight: true
    },
    {
      feature: 'EMR & Clinical Documentation',
      traditional: 'Manual paper files or clunky desktop software',
      healnari: 'AI-assisted EMR with CDSS alerts, 2-identifier safety bar & digital Rx',
      highlight: true
    },
    {
      feature: 'Administrative & Staff Burden',
      traditional: 'Hiring receptionists, managing cash payments & appointment books',
      healnari: 'Automated tokenized queue, online booking & automatic reminder system',
      highlight: false
    },
    {
      feature: 'Fee Collection & Settlement',
      traditional: 'Chasing pending payments, POS machine fees & cash handling',
      healnari: 'Guaranteed upfront payments with weekly automated direct bank deposits',
      highlight: true
    },
    {
      feature: 'Patient Follow-up Management',
      traditional: 'Unpaid phone calls, WhatsApp chaos at odd hours',
      healnari: 'Structured async chat window & scheduled follow-up visits',
      highlight: false
    }
  ];

  return (
    <section className="py-16 md:py-24 max-w-7xl mx-auto px-5 md:px-8">
      <Reveal className="text-center max-w-3xl mx-auto mb-14 space-y-3">
        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full">
          The Modern Alternative
        </span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 font-display">
          Traditional Clinic vs. HealNari Digital Practice
        </h2>
        <p className="text-slate-600 text-base md:text-lg font-normal leading-relaxed">
          Compare the freedom, economics, and efficiency of running your clinical practice on HealNari.
        </p>
      </Reveal>

      <Reveal delay={100}>
        <div className="overflow-x-auto rounded-3xl border border-sand-200 shadow-lg bg-white">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-sand-200 bg-slate-50/70">
                <th className="py-5 px-6 font-bold text-slate-700 text-sm w-1/3">Clinical Feature</th>
                <th className="py-5 px-6 font-semibold text-slate-500 text-sm w-1/3 bg-slate-100/50">
                  <i className="fas fa-building text-slate-400 mr-2"></i> Traditional Physical Clinic
                </th>
                <th className="p-5 font-bold text-slate-900 bg-aubergine-50/70 border-b border-sand-200">
                  <i className="fas fa-wand-magic-sparkles text-aubergine-600 mr-2"></i> HealNari Provider Portal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-800">
                    {row.feature}
                  </td>
                  <td className="py-4 px-6 text-slate-500 bg-slate-50/30">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-times-circle text-rose-400 mt-1 shrink-0"></i>
                      <span>{row.traditional}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800 bg-aubergine-50/20 border-l-2 border-aubergine-500">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-circle-check text-emerald-500 mt-1 shrink-0"></i>
                      <span className="font-semibold text-slate-900">{row.healnari}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}

export default ProviderComparison;
