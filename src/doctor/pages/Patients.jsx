import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const PATIENTS = [
  { id: 1,  name: 'Priya Sharma',   age: 28, blood: 'B+', phone: '+91 98765 43210', email: 'priya@mail.com', since: 'Jan 2023', visits: 12, diagnosis: 'PCOS — IR Subtype', lastVisit: '25 Jun 2026', nextVisit: '5 Jul 2026', meds: ['Metformin 500mg BD', 'Myo-Inositol 2g OD'], alert: 'Elevated TSH (5.2 mIU/L) — review pending', height: '163cm', weight: '64.5kg', bmi: '24.2', allergies: ['Penicillin'], status: 'active' },
  { id: 2,  name: 'Anita Desai',    age: 34, blood: 'A+', phone: '+91 97654 32109', email: 'anita@mail.com', since: 'Mar 2023', visits: 7,  diagnosis: 'Primary Infertility', lastVisit: '20 Jun 2026', nextVisit: '10 Jul 2026', meds: ['Clomiphene 50mg OD', 'Folic Acid 5mg'],  alert: null,  height: '158cm', weight: '58kg', bmi: '23.2', allergies: [], status: 'active' },
  { id: 3,  name: 'Kavita Patel',   age: 22, blood: 'O+', phone: '+91 96543 21098', email: 'kavita@mail.com', since: 'Jun 2024', visits: 4,  diagnosis: 'Oligomenorrhea', lastVisit: '10 Jun 2026', nextVisit: '30 Jun 2026', meds: ['Norethisterone 5mg OD'], alert: null, height: '160cm', weight: '55kg', bmi: '21.5', allergies: [], status: 'active' },
  { id: 4,  name: 'Aisha Khan',     age: 29, blood: 'AB-',phone: '+91 95432 10987', email: 'aisha@mail.com', since: 'Sep 2022', visits: 18, diagnosis: 'Endometriosis Gr.2', lastVisit: '1 Jun 2026',  nextVisit: null, meds: ['Dienogest 2mg OD', 'Mefenamic Acid 500mg PRN'], alert: 'Pain score 7/10 reported. Consider escalating therapy.', height: '155cm', weight: '52kg', bmi: '21.6', allergies: ['Aspirin'], status: 'active' },
  { id: 5,  name: 'Sunita Desai',   age: 38, blood: 'B-', phone: '+91 94321 09876', email: 'sunita@mail.com', since: 'Nov 2021', visits: 24, diagnosis: 'PCOS + Type 2 DM', lastVisit: '15 May 2026', nextVisit: null, meds: ['Metformin 1g BD', 'Sitagliptin 50mg OD'], alert: null, height: '161cm', weight: '72kg', bmi: '27.7', allergies: [], status: 'inactive' },
  { id: 6,  name: 'Divya Menon',    age: 26, blood: 'A-', phone: '+91 93210 98765', email: 'divya@mail.com', since: 'Feb 2024', visits: 3,  diagnosis: 'Low AMH / DOR', lastVisit: '18 Jun 2026', nextVisit: '20 Jul 2026', meds: ['DHEA 25mg OD', 'CoQ10 600mg OD'], alert: null, height: '165cm', weight: '60kg', bmi: '22.0', allergies: [], status: 'active' },
];

/* ─── EMR Detail Modal ───────────────────────── */
function EMRModal({ patient, isOpen, onClose, toast }) {
  const [noteText, setNoteText] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [tab, setTab] = useState('overview');

  if (!patient) return null;

  const addNote = () => {
    if (!noteText.trim()) return;
    setSavedNotes(prev => [{ text: noteText, ts: new Date().toLocaleTimeString() }, ...prev]);
    setNoteText('');
    toast('Clinical note added to EMR.', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Custom Header */}
      <div className="-mx-6 -mt-6 px-6 py-5 mb-5 rounded-t-3xl" style={{ background: 'linear-gradient(135deg,#251121,#3b1c32)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 text-white font-black text-lg flex items-center justify-center border border-white/20">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-lg">{patient.name}</h3>
            <p className="text-aubergine-200 text-xs">{patient.age}F • {patient.blood} • {patient.diagnosis}</p>
          </div>
          {patient.alert && (
            <span className="bg-rose-500/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-400/50 hidden sm:block">⚠ Alert</span>
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white ml-2"><i className="fas fa-xmark text-xl"></i></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 mb-5 text-xs font-bold overflow-x-auto">
        {['overview', 'medications', 'history', 'notes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 capitalize whitespace-nowrap transition-all border-b-2 ${tab === t ? 'border-aubergine-600 text-aubergine-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {patient.alert && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
              <i className="fas fa-triangle-exclamation text-amber-500 flex-shrink-0 mt-0.5"></i>
              <p className="text-xs text-amber-800 font-medium">{patient.alert}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              ['Age', `${patient.age}F`], ['Blood Group', patient.blood], ['BMI', patient.bmi],
              ['Height', patient.height], ['Weight', patient.weight], ['Allergies', patient.allergies.join(', ') || 'None'],
              ['Patient Since', patient.since], ['Total Visits', patient.visits], ['Last Visit', patient.lastVisit],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-slate-400 font-bold mb-0.5">{k}</p>
                <p className="font-bold text-slate-800">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => { toast('Opening prescription writer...', 'info'); onClose(); }}
              className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              <i className="fas fa-file-prescription"></i> Write Prescription
            </button>
            <button onClick={() => { toast('Lab order created.', 'success'); }}
              className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors border border-sky-200">
              <i className="fas fa-flask"></i> Order Labs
            </button>
          </div>
        </div>
      )}

      {tab === 'medications' && (
        <div className="space-y-3">
          {patient.meds.map((m, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <p className="font-bold text-slate-800 text-sm">{m}</p>
                <p className="text-xs text-slate-400">Active • Prescribed by Dr. Sarah Mitchell</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toast(`${m.split(' ')[0]} modified.`, 'success')} className="text-xs font-bold text-aubergine-600 px-3 py-1.5 rounded-lg hover:bg-aubergine-50 border border-aubergine-100 transition-colors">Modify</button>
                <button onClick={() => toast(`${m.split(' ')[0]} discontinued.`, 'info')} className="text-xs font-bold text-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-rose-100 transition-colors">Stop</button>
              </div>
            </div>
          ))}
          <button onClick={() => toast('Add medication panel opened.', 'info')} className="w-full border-2 border-dashed border-aubergine-200 text-aubergine-600 font-bold py-3 rounded-xl text-sm hover:bg-aubergine-50 transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-plus"></i> Add Medication
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3 text-xs">
          {[
            { date: 'Jun 25, 2026', type: 'PCOS Follow-up',   note: 'TSH elevated 5.2. Adjusted Metformin. Repeat in 6 weeks.' },
            { date: 'May 10, 2026', type: 'PCOS Review',      note: 'Weight stable. Insulin resistance improving. Continue current meds.' },
            { date: 'Mar 8, 2026',  type: 'Cycle Assessment', note: 'Cycle regularizing. LH:FSH ratio 2.1. Positive trend.' },
          ].map((h, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-aubergine-200 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-slate-800">{h.type}</span>
                <span className="text-slate-400">{h.date}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{h.note}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a clinical note..."
              rows={3} className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
            <button onClick={addNote} className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0">Add</button>
          </div>
          <div className="space-y-2">
            {savedNotes.map((n, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-800">{n.text}</p>
                <p className="text-[10px] text-slate-400 mt-1">Dr. Sarah Mitchell • {n.ts}</p>
              </div>
            ))}
            {savedNotes.length === 0 && <p className="text-slate-400 text-xs text-center py-6">No notes yet. Add the first clinical note above.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorPatients() {
  const toast = useToast();
  const [patients, setPatients] = useState(PATIENTS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const filtered = patients.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.diagnosis.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Patients & EMR</h1>
          <p className="text-sm text-slate-500">{patients.length} patients in your registry</p>
        </div>
        <button onClick={() => toast('New patient registration form opened.', 'info')}
          className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
          <i className="fas fa-user-plus"></i> Add Patient
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name or diagnosis..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50" />
        </div>
        <div className="flex gap-1.5">
          {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterStatus === v ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 font-medium">{filtered.length} results</p>
      </div>

      {/* Patient Cards */}
      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-aubergine-200 transition-all overflow-hidden group">
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-aubergine-100 text-aubergine-700 font-black text-lg flex items-center justify-center">
                  {p.name.split(' ').map(n => n[0]).join('')}
                </div>
                {p.status === 'active' && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-800">{p.name}</h3>
                  {p.alert && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">⚠ Alert</span>}
                </div>
                <p className="text-xs text-aubergine-700 font-bold mt-0.5">{p.diagnosis}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-500">
                  <span><i className="fas fa-user mr-1"></i>{p.age}F • {p.blood}</span>
                  <span><i className="fas fa-calendar-check mr-1"></i>Last: {p.lastVisit}</span>
                  <span><i className="fas fa-clock-rotate-left mr-1"></i>{p.visits} visits</span>
                  {p.nextVisit && <span className="text-aubergine-600 font-bold"><i className="fas fa-calendar-plus mr-1"></i>Next: {p.nextVisit}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => toast(`Calling ${p.name}...`, 'info')}
                  className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center transition-colors" title="Call patient">
                  <i className="fas fa-phone text-sm"></i>
                </button>
                <button onClick={() => setSelectedPatient(p)}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm">
                  <i className="fas fa-folder-open"></i> Open EMR
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
              <i className="fas fa-users-slash text-4xl text-slate-300"></i>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">No Patients Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              We couldn't find any patients matching your current filters or search query. 
            </p>
            <button onClick={() => { setSearch(''); setFilterStatus('all'); }} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-6 py-2.5 rounded-xl shadow-sm transition-all btn-interactive">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <EMRModal patient={selectedPatient} isOpen={!!selectedPatient} onClose={() => setSelectedPatient(null)} toast={toast} />
    </div>
  );
}

export default DoctorPatients;
