import React, { useState } from 'react';
import Reveal from '../../components/Reveal.jsx';

function ProviderTestimonials() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  const testimonials = [
    {
      name: 'Dr. Ananya Mehta',
      category: 'endocrine',
      specialty: 'Reproductive Endocrinologist',
      experience: '15+ yrs exp',
      regNo: 'NMC / MCI-15201',
      hospital: 'Ex-AIIMS Fellow',
      image: '/generated/doc1.webp',
      quote: "HealNari has transformed how I manage complex PCOS and hormonal cases. Having the AI summarize biomarker histories before I even enter the video call saves me 20 minutes per consultation.",
      stat: '420+ Consultations Completed',
      statIcon: 'fa-user-check',
      highlightBadge: 'Top Endocrinologist 2026'
    },
    {
      name: 'Dr. Ritu Khanna',
      category: 'gynae',
      specialty: 'Endocrinologist & Gynaecology Specialist',
      experience: '12+ yrs exp',
      regNo: 'DMC-92810',
      hospital: 'Apollo Health Alum',
      image: '/generated/doc2.webp',
      quote: "The ability to practice functional, root-cause gynaecology with zero clinic overhead and weekly automated payouts has given me complete autonomy over my work hours.",
      stat: '₹1.6L Avg Monthly Payout',
      statIcon: 'fa-wallet',
      highlightBadge: '98% Patient Adherence'
    },
    {
      name: 'Dr. Shreya Verma',
      category: 'derma',
      specialty: 'Trichologist & Clinical Dermatologist',
      experience: '10+ yrs exp',
      regNo: 'KMC-33821',
      hospital: 'Manipal Hospital Alum',
      image: '/generated/doc3.webp',
      quote: "The patient quality is night and day compared to other teleconsult platforms. HealNari pre-screens patients with detailed symptom audits, meaning I see motivated, high-compliance patients.",
      stat: '4.98 / 5.0 Provider Rating',
      statIcon: 'fa-star',
      highlightBadge: 'Hormonal Hair & Skin Lead'
    }
  ];

  const filterTabs = [
    { label: 'All Specialties', value: 'all' },
    { label: 'Endocrinology', value: 'endocrine' },
    { label: 'Gynaecology', value: 'gynae' },
    { label: 'Dermatology & Hair', value: 'derma' },
  ];

  const filteredDocs = selectedSpecialty === 'all' 
    ? testimonials 
    : testimonials.filter(doc => doc.category === selectedSpecialty);

  return (
    <section className="py-12 sm:py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <Reveal className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 space-y-3">
        <span className="text-[11px] sm:text-xs font-bold text-aubergine-800 uppercase tracking-wider bg-aubergine-50 border border-aubergine-200 px-3.5 py-1 rounded-full shadow-2xs inline-block">
          Peer Clinical Endorsements
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-display">
          Trusted by Leading Women's Health Specialists
        </h2>
        <p className="text-slate-600 text-sm sm:text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
          Read why top gynaecologists and endocrinologists chose HealNari to expand their digital practice.
        </p>

        {/* Filter Pills — cleanly scrollable on mobile */}
        <div className="pt-3 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 pb-1 min-w-max mx-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedSpecialty(tab.value)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap active:scale-95 ${
                  selectedSpecialty === tab.value
                    ? 'bg-aubergine-700 text-white border-aubergine-700 shadow-md scale-102'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-aubergine-300 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8">
        {filteredDocs.map((doc, idx) => (
          <Reveal key={doc.name} delay={idx * 100}>
            <div className="bg-white border border-sand-200/80 hover:border-aubergine-300 rounded-3xl p-5 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full group relative overflow-hidden">
              
              {/* Highlight Tag */}
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-aubergine-50 text-aubergine-700 px-2.5 py-1 rounded-lg border border-aubergine-100/80">
                  {doc.highlightBadge}
                </span>
                <span className="text-[11px] font-black text-amber-500 flex items-center gap-1">
                  <i className="fas fa-star text-xs"></i> 5.0
                </span>
              </div>

              {/* Quote */}
              <div className="space-y-3 flex-grow">
                <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium italic">
                  "{doc.quote}"
                </p>
              </div>

              {/* Impact Metric Pill */}
              <div className="my-3.5 py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-800">
                <i className={`fas ${doc.statIcon} text-emerald-600 text-sm shrink-0`}></i>
                <span className="truncate">{doc.stat}</span>
              </div>

              {/* Doctor Avatar & Identity */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-aubergine-100 shadow-sm shrink-0 bg-slate-100">
                  <img
                    src={doc.image}
                    alt={doc.name}
                    className="w-12 h-12 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                    ✓
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-900 text-sm truncate">{doc.name}</h4>
                  <p className="text-[11px] text-aubergine-700 font-bold truncate">{doc.specialty}</p>
                  <p className="text-[10.5px] text-slate-400 font-medium truncate">{doc.hospital} • {doc.experience}</p>
                  <p className="text-[9.5px] text-slate-400 font-mono">Reg: {doc.regNo}</p>
                </div>
              </div>

            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default ProviderTestimonials;
