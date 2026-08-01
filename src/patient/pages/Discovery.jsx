import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

/* ─── Data ───────────────────────────────────── */
const TEAM_MEMBERS = [
  { id: 1, name: 'Dr. Ananya Mehta',   role: 'Reproductive Endocrinologist', specialty: 'Endocrinology', regNo: 'MCI-15201', exp: '15 Years', rating: 4.9, reviews: 184, fee: 799, lang: ['English', 'Hindi'], image: 'https://randomuser.me/api/portraits/women/68.jpg', about: 'Specializes in PCOS/PCOD reversal, insulin resistance protocols, and metabolic restoration.', ethos: ['Unmarried-Friendly', 'Weight-Neutral Care', 'Queer-Allied'], collab: 'Works alongside Dr. Sarah Mitchell to coordinate hormonal therapy and cycle restoration.', slots: ['Today 4:30 PM', 'Tomorrow 10:00 AM', 'Tomorrow 2:00 PM'], online: true },
  { id: 2, name: 'Dr. Sarah Mitchell', role: 'Lead Obstetrician & Gynaecologist', specialty: 'Gynaecology', regNo: 'MCI-29402', exp: '12 Years', rating: 4.9, reviews: 215, fee: 799, lang: ['English'], image: 'https://ui-avatars.com/api/?name=Sarah+Mitchell&background=e0e7ff&color=4338ca', about: 'Expert in menstrual irregularities, endometriosis management, and adolescent gynaecology.', ethos: ['Non-Judgmental Care', 'Trauma-Informed', 'Confidential Care'], collab: 'Coordinates metabolic lab panels with Dr. Ritu Khanna for holistic PCOS diagnosis.', slots: ['Today 5:00 PM', 'Thu 10:30 AM', 'Fri 11:00 AM'], online: true },
  { id: 3, name: 'Dr. Ritu Khanna',    role: 'Consultant Endocrinologist', specialty: 'Endocrinology', regNo: 'MCI-92810', exp: '12 Years', rating: 4.8, reviews: 142, fee: 899, lang: ['English', 'Hindi', 'Punjabi'], image: 'https://randomuser.me/api/portraits/women/45.jpg', about: 'Specialist in Thyroid disorders, insulin sensitizing therapy, and hormonal profile management.', ethos: ['Evidence-Based', 'Root-Cause Focus', 'Body-Positive'], collab: 'Works with Dr. Shreya Verma to address hormone-induced alopecia and severe acne.', slots: ['Tomorrow 9:00 AM', 'Fri 3:00 PM'], online: false },
  { id: 4, name: 'Dr. Shreya Verma',   role: 'Dermatologist & Trichologist', specialty: 'Dermatology', regNo: 'MCI-33821', exp: '10 Years', rating: 4.7, reviews: 98,  fee: 699, lang: ['English', 'Hindi'], image: 'https://randomuser.me/api/portraits/women/32.jpg', about: 'Expert in androgenetic alopecia (hair thinning) and hormonal cystic acne management.', ethos: ['Trauma-Informed', 'Clinical Skin Health', 'Confidential Care'], collab: 'Coordinates thyroid-related hair fall treatments alongside Dr. Ritu Khanna.', slots: ['Thu 1:00 PM', 'Fri 4:00 PM', 'Sat 10:00 AM'], online: true },
  { id: 5, name: 'Dr. Priya Nair',     role: 'Reproductive & Sexual Health Expert', specialty: 'Sexual Health', regNo: 'MCI-77290', exp: '18 Years', rating: 4.9, reviews: 310, fee: 799, lang: ['English', 'Malayalam'], image: 'https://randomuser.me/api/portraits/women/89.jpg', about: 'Specializes in sexual health, pre-conception counselling, and fertility management.', ethos: ['LGBTQ+ Allied', 'Sex-Positive Care', 'Non-Judgmental Care'], collab: 'Works with Dr. Ananya Mehta to align ovulation tracking with fertility windows.', slots: ['Today 6:00 PM', 'Tomorrow 11:00 AM'], online: true },
];

const SPECIALTIES = ['All', 'Gynaecology', 'Endocrinology', 'Dermatology', 'Sexual Health'];

/* ─── Stars ──────────────────────────────────── */
function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`fas fa-star text-[10px] ${i <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`}></i>
      ))}
    </span>
  );
}

/* ─── Booking Modal ──────────────────────────── */
function BookingModal({ doc, isOpen, onClose, toast }) {
  const [step, setStep] = useState(1);
  const [slot, setSlot] = useState('');
  const [type, setType] = useState('Video Consult');
  const [notes, setNotes] = useState('');

  const confirm = () => {
    setStep(3);
    toast(`Appointment booked with ${doc?.name}!`, 'success');
  };

  const reset = () => { setStep(1); setSlot(''); setNotes(''); onClose(); };

  if (!doc) return null;
  return (
    <Modal isOpen={isOpen} onClose={reset} size="md">
      {/* Custom Header */}
      <div className="-mx-6 -mt-6 px-6 py-5 bg-gradient-to-r from-aubergine-900 to-aubergine-700 text-white mb-5 rounded-t-3xl">
        <div className="flex items-center gap-4">
          <img src={doc.image} alt={doc.name} className="w-12 h-12 rounded-2xl border-2 border-white/30 object-cover" />
          <div>
            <h3 className="font-black text-lg">{doc.name}</h3>
            <p className="text-xs text-aubergine-200">{doc.role}</p>
          </div>
          <button onClick={reset} className="ml-auto text-white/60 hover:text-white"><i className="fas fa-xmark text-xl"></i></button>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {/* Fee summary */}
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs flex justify-between">
            <span className="text-slate-600 font-medium">Standard Consult (30 mins)</span>
            <span className="font-black text-aubergine-800">₹{doc.fee}</span>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Consult Type</label>
            <div className="flex gap-2">
              {['Video Consult', 'Clinic Visit'].map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${type === t ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  <i className={`fas ${t === 'Video Consult' ? 'fa-video' : 'fa-hospital'}`}></i> {t}
                </button>
              ))}
            </div>
          </div>

          {/* Slots */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Available Slots</label>
            <div className="grid grid-cols-2 gap-2">
              {doc.slots.map(s => (
                <button key={s} onClick={() => setSlot(s)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${slot === s ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-aubergine-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Consultation Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Describe your concerns briefly..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>

          <button disabled={!slot} onClick={() => setStep(2)}
            className="w-full bg-aubergine-600 disabled:opacity-40 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Review & Confirm →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span className="font-bold text-slate-800">{doc.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-bold text-slate-800">{type}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slot</span><span className="font-bold text-slate-800">{slot}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Fee</span><span className="font-black text-aubergine-800">₹{doc.fee}</span></div>
            <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200">
              🔒 HIPAA-compliant. Governed under NMC Telemedicine Guidelines, India.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">← Back</button>
            <button onClick={confirm} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <i className="fas fa-lock text-xs"></i> Pay & Book
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto border-2 border-emerald-200">
            <i className="fas fa-circle-check"></i>
          </div>
          <h4 className="font-black text-slate-800 text-xl">Appointment Booked!</h4>
          <p className="text-sm text-slate-500 leading-relaxed">
            A confirmation SMS and calendar invite has been sent to your registered number.
          </p>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-left space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">With</span><span className="font-bold">{doc.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slot</span><span className="font-bold">{slot}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-bold">{type}</span></div>
          </div>
          <button onClick={reset} className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">Done</button>
        </div>
      )}
    </Modal>
  );
}

/* ─── Doctor Card ────────────────────────────── */
function DoctorCard({ doc, onBook, onFavorite, favorites }) {
  const [expanded, setExpanded] = useState(false);
  const isFav = favorites.includes(doc.id);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="p-6 flex-1">
        {/* Header */}
        <div className="flex gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-aubergine-50 flex-shrink-0 border-2 border-aubergine-100">
              <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
            </div>
            {doc.online && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Online"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-slate-800 text-base truncate">{doc.name}</h3>
              <i className="fas fa-circle-check text-aubergine-600 text-xs flex-shrink-0" title="Verified"></i>
            </div>
            <p className="text-xs text-aubergine-700 font-bold uppercase tracking-wide mt-0.5">{doc.role}</p>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono border border-slate-200 inline-block mt-1">{doc.regNo}</span>
          </div>
          <button onClick={() => onFavorite(doc.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isFav ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-400'}`}>
            <i className={`fas fa-heart text-xs ${isFav ? '' : ''}`}></i>
          </button>
        </div>

        {/* About */}
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{doc.about}</p>

        {/* Expanded details */}
        {expanded && (
          <div className="animate-fade-in space-y-3 mb-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] leading-relaxed text-slate-500">
              <strong className="text-aubergine-800">Care Link:</strong> {doc.collab}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Languages</p>
              <div className="flex gap-1">{doc.lang.map(l => <span key={l} className="text-[10px] bg-sky-50 border border-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">{l}</span>)}</div>
            </div>
          </div>
        )}

        {/* Ethics Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {doc.ethos.map(tag => (
            <span key={tag} className="text-[10px] font-bold bg-indigo-50 border border-indigo-100/50 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between py-3 border-y border-slate-100 mb-4 text-xs font-bold">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Rating</span>
            <span className="flex items-center gap-1 text-slate-700">
              <Stars rating={doc.rating} />
              {doc.rating} <span className="text-slate-400 font-normal">({doc.reviews})</span>
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Experience</span>
            <span className="text-slate-700">{doc.exp}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Consult Fee</span>
            <span className="text-slate-800 font-black text-sm">₹{doc.fee}</span>
          </div>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs text-aubergine-600 hover:text-aubergine-800 font-bold mb-3 flex items-center justify-center gap-1">
          {expanded ? 'Show Less' : 'View Details'}
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`}></i>
        </button>
      </div>

      {/* Book Button */}
      <div className="px-6 pb-6">
        <button onClick={() => onBook(doc)}
          className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
          <i className="fas fa-calendar-check"></i> Book Consultation
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */
function PatientDiscovery() {
  const toast = useToast();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const handleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      toast(next.includes(id) ? 'Added to favourites!' : 'Removed from favourites.', 'info');
      return next;
    });
  };

  const filtered = TEAM_MEMBERS.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.role.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === 'All' || d.specialty === specialty;
    const matchOnline = !onlineOnly || d.online;
    return matchSearch && matchSpec && matchOnline;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Collaborative Care Team</h1>
          <p className="text-sm text-slate-500">FemCare's multidisciplinary team co-treats your PCOS and hormonal concerns.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          All {TEAM_MEMBERS.length} Registers Verified
        </div>
      </div>

      {/* Philosophy Banner */}
      <div className="bg-gradient-to-r from-aubergine-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 text-9xl transform translate-x-10 translate-y-2">
          <i className="fas fa-handshake"></i>
        </div>
        <h2 className="text-lg font-bold mb-2">Why a Collaborative Team?</h2>
        <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed">
          PCOS is not just a gynaecological issue. It affects your metabolism, thyroid, skin, and cycle. Our specialists share notes in a unified EMR to treat root metabolic causes — not just isolated symptoms.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialty..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50" />
        </div>

        {/* Specialty Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {SPECIALTIES.map(s => (
            <button key={s} onClick={() => setSpecialty(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${specialty === s ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Online Filter */}
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={onlineOnly} onChange={e => setOnlineOnly(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
          Online Only
        </label>

        {favorites.length > 0 && (
          <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
            <i className="fas fa-heart"></i> {favorites.length} Favourites
          </span>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500 font-medium">
        Showing {filtered.length} of {TEAM_MEMBERS.length} specialists
        {search && <> matching "<strong>{search}</strong>"</>}
      </p>

      {/* Doctor Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(doc => (
          <DoctorCard key={doc.id} doc={doc} onBook={d => setSelectedDoc(d)} onFavorite={handleFavorite} favorites={favorites} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            <i className="fas fa-user-doctor text-4xl mb-3 block"></i>
            <p className="font-bold">No doctors found matching your filters.</p>
            <button onClick={() => { setSearch(''); setSpecialty('All'); setOnlineOnly(false); }} className="mt-3 text-aubergine-600 font-bold text-sm hover:underline">Reset Filters</button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal doc={selectedDoc} isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} toast={toast} />
    </div>
  );
}

export default PatientDiscovery;
