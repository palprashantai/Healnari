import React, { useState } from 'react';
import Tilt3D from '../../components/Tilt3D.jsx';
import Reveal from '../../components/Reveal.jsx';

function Doctors({ onSelectDoctor }) {
  const [activeFilter, setActiveFilter] = useState('All');

  const doctorsList = [
    {
      name: 'Dr. Ananya Mehta',
      specialty: 'Reproductive Endocrinologist',
      degree: 'MBBS, MD, Fellowship in Reproductive Endocrinology (Ex-AIIMS)',
      location: 'Global Telemedicine • English, Hindi, Spanish',
      experience: '15+ years experience',
      patients: '12k+ global patients',
      image: '/generated/doc1.webp',
      tags: ['Gynaecologist', 'Endocrinologist'],
      availability: 'online',
      nextSlot: 'Today in your timezone',
      regNo: 'NMC / MCI-15201',
      ethos: 'Root-Cause & Fertility Focus'
    },
    {
      name: 'Dr. Ritu Khanna',
      specialty: 'Endocrinologist & Metabolic Specialist',
      degree: 'MBBS, MD (Endocrinology), Apollo Health Fellow',
      location: 'Global Telemedicine • English, Hindi, Arabic',
      experience: '12+ years experience',
      patients: '8k+ global patients',
      image: '/generated/doc2.webp',
      tags: ['Endocrinologist'],
      availability: 'busy',
      nextSlot: 'Today in your timezone',
      regNo: 'DMC-92810',
      ethos: 'Insulin Resistance Specialist'
    },
    {
      name: 'Dr. Shreya Verma',
      specialty: 'Trichologist & Clinical Dermatologist',
      degree: 'MBBS, DDVL, Diploma in Trichology (UK Affil)',
      location: 'Global Telemedicine • English, Hindi, Tamil',
      experience: '10+ years experience',
      patients: '6k+ global patients',
      image: '/generated/doc3.webp',
      tags: ['Trichologist'],
      availability: 'online',
      nextSlot: 'Today in your timezone',
      regNo: 'KMC-33821',
      ethos: 'Hormonal Acne & Hair Loss Lead'
    },
    {
      name: 'Dr. Priya Nair',
      specialty: 'Reproductive & Sexual Health Expert',
      degree: 'MBBS, DGO, Fellowship in Reproductive Medicine (Ex-CMC)',
      location: 'Global Telemedicine • English, Malayalam, Tamil',
      experience: '18+ years experience',
      patients: '15k+ global patients',
      image: '/generated/doc4.webp',
      tags: ['Gynaecologist'],
      availability: 'online',
      nextSlot: 'Tomorrow in your timezone',
      regNo: 'NMC / MCI-77290',
      ethos: 'LGBTQ+ Allied & Evidence-Based Care'
    }
  ];

  const availabilityConfig = {
    online:  { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Available Now' },
    busy:    { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-100',     label: 'In Consultation' },
    offline: { dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 border-slate-100',     label: 'Offline' },
  };

  const filterTabs = ['All', 'Gynaecologists', 'Endocrinologists', 'Trichologists'];

  const filteredDoctors = doctorsList.filter((doc) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Gynaecologists') return doc.tags.includes('Gynaecologist');
    if (activeFilter === 'Endocrinologists') return doc.tags.includes('Endocrinologist');
    if (activeFilter === 'Trichologists') return doc.tags.includes('Trichologist');
    return true;
  });

  return (
    <section id="doctors" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 scroll-mt-20">
      {/* Head block */}
      <Reveal className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3.5 py-1 rounded-full border border-aubergine-100">
          Our Specialist Team
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Care Led by Experienced Specialists
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed">
          Gynaecologists, endocrinologists &amp; trichologists — collaborating under one digital roof to trace your concerns back to their root cause.
        </p>
      </Reveal>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 btn-interactive border ${
              activeFilter === tab
                ? 'bg-aubergine-600 border-aubergine-600 text-white shadow-md shadow-aubergine-100'
                : 'border-sand-200 text-slate-600 hover:bg-sand-100 hover:text-slate-900 bg-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Doctors Grid / Horizontal Scroll */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 overflow-x-auto snap-x snap-mandatory pb-8 -mx-5 px-5 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar sm:overflow-visible">
        {filteredDoctors.map((doc, idx) => (
          <Reveal key={idx} delay={(idx % 4) * 80} className="w-[18rem] sm:w-auto flex-shrink-0 snap-center sm:flex-shrink-1 h-full">
          <Tilt3D max={6} className="h-full">
          <div
            className="rounded-3xl overflow-hidden border border-sand-200 shadow-sm p-6 text-center card-premium flex flex-col justify-between h-full" style={{ backgroundColor: 'var(--color-surface-card)' }}
          >
            <div>
              {/* Availability Badge */}
              {(() => {
                const avail = availabilityConfig[doc.availability];
                return (
                  <div className={`inline-flex items-center gap-1.5 border text-[10px] font-extrabold px-2.5 py-1 rounded-full mb-3 ${avail.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${avail.dot} ${doc.availability === 'online' ? 'animate-pulse' : ''}`}></span>
                    {avail.label}
                  </div>
                );
              })()}

              {/* Doctor Avatar */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-aubergine-500 to-aubergine-200 opacity-20 blur-sm"></div>
                <img
                  src={doc.image}
                  alt={doc.name}
                  loading="lazy"
                  decoding="async"
                  width="96"
                  height="96"
                  className="w-full h-full rounded-full object-cover border-4 border-aubergine-50/50 shadow-md relative"
                />
                {/* Online indicator dot */}
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${availabilityConfig[doc.availability].dot} ${doc.availability === 'online' ? 'animate-pulse' : ''}`}></span>
              </div>

              {/* Title & Specialties */}
              <h3 className="text-xl font-bold text-slate-900 font-display">
                {doc.name}
              </h3>
              <p className="text-aubergine-700 text-xs font-bold mt-1 uppercase tracking-wider">
                {doc.specialty}
              </p>
              
              <div className="mt-3 text-[11px] font-semibold text-slate-500 bg-sand-100 rounded-xl p-2.5 leading-normal flex flex-col gap-1">
                <span>{doc.degree}</span>
                <span className="font-mono text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-1.5 mt-1 block">Reg No: {doc.regNo}</span>
              </div>

              <p className="text-[11px] text-slate-400 font-bold mt-3.5">
                <i className="fas fa-location-dot text-aubergine-400 mr-1.5"></i> {doc.location}
              </p>

              {/* Stats badges */}
              <div className="flex justify-center gap-1.5 mt-4 text-[10px] font-bold">
                <span className="bg-aubergine-50 text-aubergine-700 px-2.5 py-1 rounded-full">
                  <i className="fas fa-award mr-1"></i> {doc.experience}
                </span>
                <span className="bg-sage-50 text-sage-700 px-2.5 py-1 rounded-full">
                  <i className="fas fa-hand-holding-hand mr-1"></i> {doc.ethos}
                </span>
              </div>
            </div>

            {/* Next available slot */}
            <p className="text-[10px] font-bold text-slate-400 text-center mt-4">
              <i className="fas fa-clock mr-1 text-aubergine-400"></i>Next slot: {doc.nextSlot}
            </p>

            {/* Quick Action Button */}
            <button 
              onClick={() => onSelectDoctor(doc.name)}
              className="mt-3 w-full border-2 border-aubergine-600 text-aubergine-700 font-bold py-2.5 rounded-xl hover:bg-aubergine-50 transition btn-interactive text-sm flex items-center justify-center gap-1"
            >
              Consult <i className="fas fa-chevron-right text-[10px] ml-0.5"></i>
            </button>
          </div>
          </Tilt3D>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Doctors;
