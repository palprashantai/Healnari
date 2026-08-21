import React, { useState, useEffect } from 'react';
import Reveal from '../../components/Reveal.jsx';
import { apiFetch } from '../../lib/apiClient.js';

/* ─── Fallback Demo Doctors ─── */
const DEMO_DOCTORS = [
  {
    id: 'demo-1',
    full_name: 'Dr. Ananya Mehta',
    specialty: 'Reproductive Endocrinologist',
    registration_no: 'NMC / MCI-15201',
    avatar_url: '/generated/doc1.webp',
    experience_years: 15,
    languages: 'English, Hindi, Spanish',
    location: 'Global Telemedicine',
    ethos: 'Root-Cause & Fertility Focus',
    availability: 'online',
    tags: ['Gynaecologist', 'Endocrinologist'],
  },
  {
    id: 'demo-2',
    full_name: 'Dr. Ritu Khanna',
    specialty: 'Endocrinologist & Metabolic Specialist',
    registration_no: 'DMC-92810',
    avatar_url: '/generated/doc2.webp',
    experience_years: 12,
    languages: 'English, Hindi, Arabic',
    location: 'Global Telemedicine',
    ethos: 'Insulin Resistance Specialist',
    availability: 'busy',
    tags: ['Endocrinologist'],
  },
  {
    id: 'demo-3',
    full_name: 'Dr. Shreya Verma',
    specialty: 'Trichologist & Clinical Dermatologist',
    registration_no: 'KMC-33821',
    avatar_url: '/generated/doc3.webp',
    experience_years: 10,
    languages: 'English, Hindi, Tamil',
    location: 'Global Telemedicine',
    ethos: 'Hormonal Acne & Hair Loss Lead',
    availability: 'online',
    tags: ['Trichologist'],
  },
  {
    id: 'demo-4',
    full_name: 'Dr. Priya Nair',
    specialty: 'Reproductive & Sexual Health Expert',
    registration_no: 'NMC / MCI-77290',
    avatar_url: '/generated/doc4.webp',
    experience_years: 18,
    languages: 'English, Malayalam, Tamil',
    location: 'Global Telemedicine',
    ethos: 'LGBTQ+ Allied & Evidence-Based Care',
    availability: 'online',
    tags: ['Gynaecologist'],
  },
];

const AVAIL = {
  online:  { dot: 'bg-emerald-400', label: 'Available Now',    pulse: true  },
  busy:    { dot: 'bg-amber-400',   label: 'In Consultation',  pulse: false },
  offline: { dot: 'bg-slate-300',   label: 'Offline',          pulse: false },
};

function deriveTags(doc) {
  if (doc.tags) return doc.tags;
  const sp = (doc.specialty || '').toLowerCase();
  const tags = [];
  if (sp.includes('gynaecol') || sp.includes('gynecol') || sp.includes('reproductive') || sp.includes('fertility') || sp.includes('sexual')) tags.push('Gynaecologist');
  if (sp.includes('endocrin') || sp.includes('metabolic') || sp.includes('thyroid') || sp.includes('insulin')) tags.push('Endocrinologist');
  if (sp.includes('trichol') || sp.includes('hair') || sp.includes('dermatol')) tags.push('Trichologist');
  if (sp.includes('nutrition') || sp.includes('dietit')) tags.push('Nutritionist');
  return tags.length ? tags : ['Specialist'];
}

/* ─── Doctor Card ─── */
function DoctorCard({ doc, onSelect }) {
  const avail = AVAIL[doc.availability] || AVAIL.online;
  const nextSlot = doc.availability === 'online'
    ? 'Next slot: Today'
    : doc.availability === 'busy'
    ? 'Next slot: ~1 hr'
    : 'Next slot: Tomorrow';

  return (
    <div className="flex flex-col rounded-2xl border border-sand-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full">

      {/* Top section with soft aubergine bg */}
      <div className="bg-aubergine-50 px-5 pt-6 pb-5 flex flex-col items-center text-center gap-3">
        {/* Availability */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${avail.dot} ${avail.pulse ? 'animate-pulse' : ''}`} />
          {avail.label}
        </div>

        {/* Avatar */}
        <div className="relative w-20 h-20">
          {doc.avatar_url ? (
            <img
              src={doc.avatar_url}
              alt={doc.full_name}
              loading="lazy"
              decoding="async"
              width="80"
              height="80"
              className="w-full h-full rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-aubergine-200 border-4 border-white shadow-md flex items-center justify-center text-aubergine-700 font-black text-2xl">
              {(doc.full_name || 'D').charAt(0)}
            </div>
          )}
          <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${avail.dot} ${avail.pulse ? 'animate-pulse' : ''}`} />
        </div>

        {/* Name & specialty */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 font-display leading-snug">
            {doc.full_name}
          </h3>
          <p className="text-aubergine-600 text-[11px] font-bold mt-0.5 uppercase tracking-wider">
            {doc.specialty}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-3">
        {/* Ethos */}
        {doc.ethos && (
          <p className="text-center text-xs text-slate-500 font-medium leading-snug">
            {doc.ethos}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-600">
          {doc.experience_years && (
            <span className="flex items-center gap-1">
              <i className="fas fa-award text-aubergine-400 text-[10px]" />
              {doc.experience_years}+ yrs
            </span>
          )}
          {doc.experience_years && doc.languages && (
            <span className="w-px h-3 bg-slate-200" />
          )}
          {doc.languages && (
            <span className="flex items-center gap-1">
              <i className="fas fa-language text-aubergine-400 text-[10px]" />
              {doc.languages.split(',')[0].trim()}
            </span>
          )}
        </div>

        {/* Reg No */}
        {doc.registration_no && (
          <p className="text-center font-mono text-[10px] text-slate-400">
            Reg: {doc.registration_no}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Next slot */}
        <p className="text-center text-[10px] text-slate-400 font-semibold">
          <i className="fas fa-calendar-day text-aubergine-300 mr-1" />
          {nextSlot}
        </p>

        {/* CTA */}
        <button
          onClick={() => onSelect(doc.full_name)}
          className="w-full mt-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <i className="fas fa-stethoscope text-xs" />
          Consult
        </button>
      </div>
    </div>
  );
}

/* ─── Skeleton ─── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white overflow-hidden animate-pulse">
      <div className="bg-aubergine-50 px-5 pt-6 pb-5 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-aubergine-100" />
        <div className="w-32 h-4 bg-aubergine-100 rounded-full" />
        <div className="w-24 h-3 bg-aubergine-50 rounded-full" />
      </div>
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="w-full h-3 bg-slate-100 rounded-full" />
        <div className="w-20 h-3 bg-slate-100 rounded-full mx-auto" />
        <div className="w-full h-9 bg-aubergine-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}

/* ─── Main ─── */
function Doctors({ onSelectDoctor }) {
  const [doctors,      setDoctors]      = useState([]);
  const [specialties,  setSpecialties]  = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/public/doctors').catch(() => null),
      apiFetch('/admin/public/specialties').catch(() => null),
    ]).then(([docRes, spRes]) => {
      const docs = Array.isArray(docRes?.data) ? docRes.data
        : Array.isArray(docRes) ? docRes : [];
      setDoctors(docs.length > 0 ? docs : DEMO_DOCTORS);

      const sps = Array.isArray(spRes?.data) ? spRes.data
        : Array.isArray(spRes) ? spRes : [];
      setSpecialties(sps);
    }).catch(() => {
      setDoctors(DEMO_DOCTORS);
    }).finally(() => setLoading(false));
  }, []);

  /* Build filter tabs from DB specialties, fallback to derived tags */
  const filterTabs = React.useMemo(() => {
    if (specialties.length > 0) return ['All', ...specialties.map(s => s.name)];
    const tagSet = new Set();
    doctors.forEach(d => deriveTags(d).forEach(t => tagSet.add(t)));
    return ['All', ...Array.from(tagSet)];
  }, [specialties, doctors]);

  const filteredDoctors = React.useMemo(() => {
    if (activeFilter === 'All') return doctors;
    return doctors.filter(d =>
      deriveTags(d).some(t =>
        t.toLowerCase() === activeFilter.toLowerCase() ||
        t.toLowerCase().includes(activeFilter.toLowerCase().replace(/s$/, ''))
      )
    );
  }, [doctors, activeFilter]);

  return (
    <section id="doctors" className="max-w-6xl mx-auto py-16 md:py-20 scroll-mt-20 overflow-hidden">
      {/* Header */}
      <Reveal className="text-center max-w-2xl mx-auto mb-10 space-y-3 px-5 md:px-8">
        <span className="text-xs font-semibold text-aubergine-700 uppercase tracking-wider bg-aubergine-50 px-3.5 py-1.5 rounded-full border border-aubergine-100">
          Our Specialist Team
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight font-display">
          Care Led by Experienced Specialists
        </h2>
        <p className="text-slate-500 text-sm md:text-base leading-relaxed">
          Gynaecologists, endocrinologists &amp; trichologists — all NMC-verified, all committed to root-cause care.
        </p>
      </Reveal>

      {/* Filter Tabs — dynamic from DB */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-10 px-5 md:px-8">
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-semibold transition-all duration-200 border ${
              activeFilter === tab
                ? 'bg-aubergine-600 border-aubergine-600 text-white shadow-md shadow-aubergine-100'
                : 'bg-white border-sand-200 text-slate-600 hover:bg-aubergine-50 hover:border-aubergine-200 hover:text-aubergine-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-16 text-slate-400 space-y-3">
          <i className="fas fa-user-doctor text-4xl opacity-20 block" />
          <p className="font-semibold">No specialists found for this filter.</p>
          <button
            onClick={() => setActiveFilter('All')}
            className="text-aubergine-600 font-bold text-sm underline"
          >
            Show all doctors
          </button>
        </div>
      ) : (
        /* Mobile: horizontal scroll snap showing ~1.15 cards; sm+: 2-col grid; lg+: 4-col grid */
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-5 px-5 md:px-8 sm:overflow-visible hide-scrollbar">
          {filteredDoctors.map((doc, idx) => (
            <Reveal
              key={doc.id || idx}
              delay={(idx % 4) * 80}
              className="w-[80vw] max-w-[17rem] sm:w-auto sm:max-w-none flex-shrink-0 snap-start sm:flex-shrink sm:flex-1 h-full"
            >
              <DoctorCard doc={doc} onSelect={onSelectDoctor} />
            </Reveal>
          ))}
        </div>
      )}

      {/* Trust line */}
      <Reveal className="text-center mt-10">
        <p className="text-xs text-slate-400 font-semibold">
          <i className="fas fa-shield-halved text-emerald-500 mr-1.5" />
          All doctors NMC / State Medical Council verified &amp; credentialed.
        </p>
      </Reveal>
    </section>
  );
}

export default Doctors;
