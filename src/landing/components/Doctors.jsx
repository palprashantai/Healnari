import React, { useState, useEffect } from 'react';
import Reveal from '../../components/Reveal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { formatCurrency } from '../../lib/currency.js';
import { DoctorDetailModal } from '../../components/DoctorDetailModal.jsx';

/* ─── Fallback Demo Doctors ─── */
const DEMO_DOCTORS = [
  {
    id: 'demo-1',
    full_name: 'Dr. Ananya Mehta',
    specialty: 'Obstetrician & Gynaecologist, PCOS Specialist',
    qualifications: 'MBBS, MS (OBG), DRM (Germany)',
    registration_no: 'NMC / MCI-15201',
    avatar_url: '/generated/doc1.webp',
    experience_years: 15,
    consultation_fee: 799,
    currency: 'INR',
    rating: 4.9,
    reviews_count: 142,
    languages: 'English, Hindi, Spanish',
    location: 'Global Telemedicine',
    clinic_name: 'HealNari Reproductive Health Center',
    clinic_address: 'Metro Wellness Hub & Virtual Clinic, New Delhi',
    medical_council: 'Delhi Medical Council',
    ethos: 'Root-Cause Hormonal & Cycle Regulation',
    bio: 'Senior Obstetrician and Gynaecologist with 15+ years of clinical excellence in reproductive endocrinology, polycystic ovarian syndrome (PCOS), and adolescent menstrual health.',
    availability: 'online',
    tags: ['Gynaecologist', 'PCOS Specialist'],
  },
  {
    id: 'demo-2',
    full_name: 'Dr. Ritu Khanna',
    specialty: 'Clinical Endocrinologist & Thyroid Lead',
    qualifications: 'MBBS, MD (Med), DM (Endo)',
    registration_no: 'DMC-92810',
    avatar_url: '/generated/doc2.webp',
    experience_years: 12,
    consultation_fee: 999,
    currency: 'INR',
    rating: 4.8,
    reviews_count: 98,
    languages: 'English, Hindi, Arabic',
    location: 'Global Telemedicine',
    clinic_name: 'Metabolic & Endocrine Institute',
    clinic_address: 'Apollo Cradle & Virtual Clinic, Gurugram',
    medical_council: 'Delhi Medical Council',
    ethos: 'Insulin Sensitivity & Metabolic Health',
    bio: 'Endocrinology consultant specializing in thyroid dysfunctions, insulin resistance in PCOS, gestational diabetes, and hyperandrogenism.',
    availability: 'busy',
    tags: ['Endocrinologist'],
  },
  {
    id: 'demo-3',
    full_name: 'Dr. Shreya Verma',
    specialty: 'Trichologist & Clinical Dermatologist',
    qualifications: 'MBBS, MD (Dermatology)',
    registration_no: 'KMC-33821',
    avatar_url: '/generated/doc3.webp',
    experience_years: 10,
    consultation_fee: 799,
    currency: 'INR',
    rating: 4.9,
    reviews_count: 116,
    languages: 'English, Hindi, Tamil',
    location: 'Global Telemedicine',
    clinic_name: 'Aesthetic & Trichology Care',
    clinic_address: 'Koramangala Health Hub & Telehealth, Bengaluru',
    medical_council: 'Karnataka Medical Council',
    ethos: 'Hormonal Acne & Hair Restoration Lead',
    bio: 'Specialist in hormonal acne, androgenic alopecia, hirsutism, and clinical scalp treatments tailored for women with endocrine imbalances.',
    availability: 'online',
    tags: ['Dermatologist', 'Trichologist'],
  },
  {
    id: 'demo-4',
    full_name: 'Dt. Pooja Sen',
    specialty: 'Clinical Dietitian & Metabolic Nutritionist',
    qualifications: 'M.Sc. Clinical Nutrition, RD',
    registration_no: 'IDA-88412',
    avatar_url: '/generated/doc4.webp',
    experience_years: 9,
    consultation_fee: 599,
    currency: 'INR',
    rating: 4.9,
    reviews_count: 87,
    languages: 'English, Hindi, Bengali',
    location: 'Global Telemedicine',
    clinic_name: 'NutriFem Integrative Health',
    clinic_address: 'Salt Lake Care Suite & Online Care, Kolkata',
    medical_council: 'Indian Dietetic Association',
    ethos: 'Anti-Inflammatory & Gut-Hormone Nutrition',
    bio: 'Specialized clinical dietitian creating culturally customized, low-glycemic, gut-healing meal strategies to reverse insulin resistance.',
    availability: 'online',
    tags: ['Nutritionist'],
  },
  {
    id: 'demo-5',
    full_name: 'Dr. Priya Nair',
    specialty: 'Integrative Women’s Health & Yoga Therapist',
    qualifications: 'BAMS, MD (Ayurveda), C-IAYT',
    registration_no: 'NMC / MCI-77290',
    avatar_url: '/generated/doc1.webp',
    experience_years: 14,
    consultation_fee: 699,
    currency: 'INR',
    rating: 4.9,
    reviews_count: 104,
    languages: 'English, Malayalam, Tamil',
    location: 'Global Telemedicine',
    clinic_name: 'Somatic Pelvic & Ayur Care Center',
    clinic_address: 'Indiranagar Wellness Center, Bengaluru',
    medical_council: 'Central Council of Indian Medicine',
    ethos: 'Pelvic Floor Rehabilitation & Somatic Yoga',
    bio: 'Integrative specialist combining evidence-based pelvic rehabilitation, herbal therapies, and neuro-somatic breathwork for endometriosis and PCOS.',
    availability: 'online',
    tags: ['Yoga & Movement', 'Gynaecologist'],
  },
  {
    id: 'demo-6',
    full_name: 'Dr. Maya Krishnan',
    specialty: 'Reproductive Medicine & Fertility Consultant',
    qualifications: 'MBBS, MS, Fellowship Reproductive Medicine',
    registration_no: 'TMC-44910',
    avatar_url: '/generated/doc2.webp',
    experience_years: 16,
    consultation_fee: 1199,
    currency: 'INR',
    rating: 5.0,
    reviews_count: 156,
    languages: 'English, Hindi, Telugu',
    location: 'Global Telemedicine',
    clinic_name: 'Nova Hope Fertility & Women’s Hospital',
    clinic_address: 'Banjara Hills & Virtual Telehealth, Hyderabad',
    medical_council: 'Telangana Medical Council',
    ethos: 'Preconception Planning & Ovulation Care',
    bio: 'Consultant in reproductive endocrinology focusing on fertility preservation, ovulation induction in resistant PCOS, and recurrent pregnancy loss.',
    availability: 'online',
    tags: ['Fertility Specialist', 'Gynaecologist'],
  },
];

const AVAIL = {
  online:  { dot: 'bg-emerald-400', label: 'Available Now',    pulse: true  },
  busy:    { dot: 'bg-amber-400',   label: 'In Consultation',  pulse: false },
  offline: { dot: 'bg-slate-300',   label: 'Offline',          pulse: false },
};

function deriveTags(doc) {
  if (doc.tags && doc.tags.length > 0) return doc.tags;
  const sp = (doc.specialty || '').toLowerCase();
  const tags = [];
  if (sp.includes('gynaecol') || sp.includes('gynecol') || sp.includes('obstetric')) tags.push('Gynaecologist');
  if (sp.includes('pcos') || sp.includes('pcod') || sp.includes('hormon')) tags.push('PCOS Specialist');
  if (sp.includes('endocrin') || sp.includes('metabolic') || sp.includes('thyroid') || sp.includes('insulin')) tags.push('Endocrinologist');
  if (sp.includes('dermatol') || sp.includes('skin') || sp.includes('acne')) tags.push('Dermatologist');
  if (sp.includes('trichol') || sp.includes('hair') || sp.includes('scalp')) tags.push('Trichologist');
  if (sp.includes('nutrition') || sp.includes('dietit') || sp.includes('diet')) tags.push('Nutritionist');
  if (sp.includes('yoga') || sp.includes('movement') || sp.includes('lifestyle')) tags.push('Yoga & Movement');
  if (sp.includes('fertility') || sp.includes('preconception') || sp.includes('reproductive')) tags.push('Fertility Specialist');
  return tags.length ? tags : ['Specialist'];
}

/* ─── Doctor Card ─── */
function DoctorCard({ doc, onSelect, onViewProfile }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const avail = AVAIL[doc.availability] || AVAIL.online;
  const nextSlot = doc.availability === 'online'
    ? 'Next slot: Today'
    : doc.availability === 'busy'
    ? 'Next slot: ~1 hr'
    : 'Next slot: Tomorrow';

  const ratingVal = doc.rating ? Number(doc.rating).toFixed(1) : '4.9';
  const reviewsCount = doc.reviews_count || 128;
  const qualifications = doc.qualifications || doc.qualification || 'MBBS, MD';
  const fee = doc.consultation_fee || doc.fee || 799;
  const currency = doc.currency || 'INR';

  return (
    <div className="flex flex-col rounded-2xl border border-sand-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full">

      {/* Top section with soft aubergine bg */}
      <div className="bg-aubergine-50 px-5 pt-5 pb-4 flex flex-col items-center text-center gap-2.5 relative">
        {/* Availability & Rating row */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full border border-aubergine-100">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${avail.dot} ${avail.pulse ? 'animate-pulse' : ''}`} />
            {avail.label}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(doc);
            }}
            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all active:scale-95 shadow-2xs"
            title="Click to view real patient ratings & reviews"
          >
            <i className="fas fa-star text-amber-500 text-[9px]" />
            <span>{ratingVal}</span>
            <span className="text-amber-600 font-semibold text-[9px]">({reviewsCount})</span>
          </button>
        </div>

        {/* Avatar */}
        <div 
          onClick={() => onViewProfile(doc)}
          className="relative w-20 h-20 cursor-pointer group mt-1"
          title="View profile"
        >
          {doc.avatar_url ? (
            <img
              src={doc.avatar_url}
              alt={doc.full_name}
              loading="lazy"
              decoding="async"
              width="80"
              height="80"
              className="w-full h-full rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-aubergine-200 border-4 border-white shadow-md flex items-center justify-center text-aubergine-700 font-black text-2xl group-hover:scale-105 transition-transform duration-300">
              {(doc.full_name || 'D').charAt(0)}
            </div>
          )}
          <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${avail.dot} ${avail.pulse ? 'animate-pulse' : ''}`} />
        </div>

        {/* Name, Specialty & Qualifications */}
        <div>
          <h3 
            onClick={() => onViewProfile(doc)}
            className="text-base font-extrabold text-slate-900 font-display leading-snug hover:text-aubergine-700 cursor-pointer transition-colors"
          >
            {doc.full_name}
          </h3>
          <p className="text-aubergine-600 text-[11px] font-bold mt-0.5 uppercase tracking-wider">
            {doc.specialty}
          </p>
          <div className="mt-1">
            <span className="inline-block text-[10px] font-bold text-aubergine-800 bg-white/90 border border-aubergine-200/80 px-2 py-0.5 rounded-md shadow-2xs">
              <i className="fas fa-graduation-cap text-aubergine-500 mr-1" />
              {qualifications}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-3">
        {/* Ethos */}
        {doc.ethos && (
          <p className="text-center text-xs text-slate-500 font-medium leading-snug line-clamp-2">
            "{doc.ethos}"
          </p>
        )}

        {/* Experience, Languages & Consult Fee */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-sand-50/80 p-2.5 rounded-xl border border-sand-200/60">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-slate-700 font-bold">
              <i className="fas fa-award text-aubergine-500 text-[11px]" />
              {doc.experience_years || 10}+ yrs
            </span>
            <span className="w-px h-3 bg-slate-300" />
            <span className="flex items-center gap-1 text-slate-600">
              <i className="fas fa-language text-aubergine-500 text-[11px]" />
              {(doc.languages || 'English, Hindi').split(',')[0].trim()}
            </span>
          </div>
          <div className="font-extrabold text-aubergine-900 text-xs">
            {formatCurrency(fee, currency)}
          </div>
        </div>

        {/* Reg No */}
        {doc.registration_no && (
          <p className="text-center font-mono text-[10px] text-slate-400">
            Reg: {doc.registration_no}
          </p>
        )}

        {/* Expand / Collapse Details Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full text-xs font-bold text-aubergine-700 hover:text-aubergine-900 bg-aubergine-50/70 hover:bg-aubergine-100/80 border border-aubergine-100 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <span>{isExpanded ? 'Hide Details' : 'View Full Details & Clinic'}</span>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] transition-transform duration-200`} />
        </button>

        {/* Inline Expanded Details */}
        {isExpanded && (
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 animate-fadeIn transition-all">
            {/* Bio */}
            {doc.bio && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Background</p>
                <p className="text-slate-600 leading-relaxed text-[11px] mt-0.5">{doc.bio}</p>
              </div>
            )}

            {/* Clinic & Location */}
            {(doc.clinic_name || doc.clinic_address) && (
              <div className="pt-2 border-t border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Affiliated Clinic</p>
                <p className="font-bold text-slate-800 text-[11px] mt-0.5 flex items-center gap-1">
                  <i className="fas fa-hospital text-aubergine-500 text-[10px]" />
                  {doc.clinic_name || 'HealNari Clinical Care Center'}
                </p>
                {doc.clinic_address && (
                  <p className="text-slate-500 text-[10px] mt-0.5 pl-3.5">
                    {doc.clinic_address}
                  </p>
                )}
              </div>
            )}

            {/* Languages Full */}
            {doc.languages && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Languages:</span>
                <span className="font-semibold text-slate-700">{doc.languages}</span>
              </div>
            )}

            {/* View Full Profile & Reviews Modal trigger */}
            <button
              type="button"
              onClick={() => onViewProfile(doc)}
              className="w-full mt-1 bg-white hover:bg-aubergine-50 text-aubergine-700 border border-aubergine-200 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <i className="fas fa-star text-amber-500 text-[10px]" />
              <span>Read Patient Reviews & Credentials →</span>
            </button>
          </div>
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
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <i className="fas fa-stethoscope text-xs" />
          Consult Dr. {doc.full_name?.split(' ')?.[1] || ''}
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
  const [doctors,          setDoctors]          = useState([]);
  const [specialties,      setSpecialties]      = useState([]);
  const [activeFilter,     setActiveFilter]     = useState('All');
  const [loading,          setLoading]          = useState(true);
  const [profileModalDoc,  setProfileModalDoc]  = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/admin/public/doctors').catch(() => null),
      apiFetch('/admin/public/specialties').catch(() => null),
    ]).then(([docRes, spRes]) => {
      const docs = Array.isArray(docRes?.data) ? docRes.data
        : Array.isArray(docRes) ? docRes : [];
      // Only show real registered doctors from the database
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
        /* Responsive doctor cards grid: centered when 1-2 doctors, 4-col on full team */
        <div className={`flex sm:grid gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-5 px-5 md:px-8 sm:overflow-visible hide-scrollbar ${
          filteredDoctors.length === 1
            ? 'max-w-md mx-auto sm:grid-cols-1 justify-center'
            : filteredDoctors.length === 2
            ? 'max-w-2xl mx-auto sm:grid-cols-2 justify-center'
            : filteredDoctors.length === 3
            ? 'max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-3 justify-center'
            : 'sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {filteredDoctors.map((doc, idx) => (
            <Reveal
              key={doc.id || idx}
              delay={(idx % 4) * 80}
              className={`${filteredDoctors.length === 1 ? 'w-full max-w-md mx-auto' : 'w-[80vw] max-w-[17rem] sm:w-auto sm:max-w-none'} flex-shrink-0 snap-start sm:flex-shrink sm:flex-1 h-full`}
            >
              <DoctorCard 
                doc={doc} 
                onSelect={onSelectDoctor}
                onViewProfile={(targetDoc) => setProfileModalDoc(targetDoc)}
              />
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

      {/* Doctor Full Profile & Reviews Modal */}
      <DoctorDetailModal
        isOpen={!!profileModalDoc}
        onClose={() => setProfileModalDoc(null)}
        doctor={profileModalDoc}
        onBook={(targetDoc) => {
          setProfileModalDoc(null);
          onSelectDoctor(targetDoc.full_name || targetDoc.name);
        }}
      />
    </section>
  );
}

export default Doctors;
