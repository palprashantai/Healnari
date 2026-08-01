import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';

/* ─── Dummy Data ──────────────────────────────── */
const PENDING_LABS = [
  { id: 1, patient: 'Priya Sharma', tests: ['TSH', 'Free T4', 'Anti-TPO Ab'], lab: 'Dr. Lal PathLabs', received: '10 mins ago', urgent: true,
    results: { TSH: '5.2 mIU/L ↑ (ref: 0.4–4.0)', 'Free T4': '1.1 ng/dL (Normal)', 'Anti-TPO Ab': '98 IU/mL ↑ (ref: <35)' },
    interpretation: 'Elevated TSH with high Anti-TPO suggests Hashimoto\'s thyroiditis. Consider Levothyroxine initiation.' },
  { id: 2, patient: 'Meera Nair',  tests: ['AMH', 'LH', 'FSH'], lab: 'Apollo Diagnostics', received: '2 hrs ago', urgent: false,
    results: { AMH: '1.2 ng/mL (Low-Normal)', LH: '8.2 mIU/mL', FSH: '6.4 mIU/mL' },
    interpretation: 'AMH is low-normal suggesting diminished ovarian reserve. LH:FSH ratio normal. Recommend fertility counselling.' },
  { id: 3, patient: 'Sunita Desai', tests: ['HbA1c', 'Fasting Insulin', 'HOMA-IR'], lab: 'SRL Diagnostics', received: 'Yesterday', urgent: false,
    results: { HbA1c: '7.2% ↑ (ref: <5.7%)', 'Fasting Insulin': '24 μIU/mL ↑', 'HOMA-IR': '5.4 ↑ (ref: <2.5)' },
    interpretation: 'Poor glycaemic control. HOMA-IR suggests significant insulin resistance. Escalate Metformin and add lifestyle counselling.' },
];

const REVIEWED = [
  { id: 'R1', patient: 'Kavita Patel', tests: 'LH, FSH, Prolactin', lab: 'Dr. Lal PathLabs', date: '20 Jun 2026', action: 'Norethisterone continued. Follow-up in 2 months.' },
  { id: 'R2', patient: 'Aisha Khan', tests: 'CA-125, TVS', lab: 'City Scans', date: '15 Jun 2026', action: 'Endometriosis Gr.2 confirmed. Dienogest initiated.' },
];

/* ─── Lab Review Modal ───────────────────────── */
function LabReviewModal({ lab, isOpen, onClose, onAction }) {
  const [action, setAction] = useState('');
  const [orderMore, setOrderMore] = useState('');

  if (!lab) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lab Report — ${lab.patient}`} size="lg">
      <div className="space-y-5">
        {lab.urgent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 flex-shrink-0 mt-0.5"></i>
            <p className="text-xs text-amber-800 font-medium">Marked as urgent. Please review immediately.</p>
          </div>
        )}

        {/* Result Values */}
        <div>
          <h4 className="font-bold text-slate-700 text-sm mb-2">Test Results</h4>
          <div className="space-y-2">
            {Object.entries(lab.results).map(([test, value]) => (
              <div key={test} className={`flex justify-between items-center px-4 py-3 rounded-xl border text-sm ${value.includes('↑') ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
                <span className="font-bold text-slate-700">{test}</span>
                <span className={`font-bold ${value.includes('↑') ? 'text-rose-700' : 'text-emerald-700'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Interpretation */}
        <div className="bg-slate-900 rounded-2xl p-4">
          <p className="text-xs text-aubergine-300 font-bold mb-2 flex items-center gap-1.5"><i className="fas fa-sparkles"></i> AI Clinical Interpretation</p>
          <p className="text-sm text-slate-200 leading-relaxed">{lab.interpretation}</p>
        </div>

        {/* Doctor Action */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Your Clinical Action</label>
          <textarea rows={2} value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Start Levothyroxine 25mcg OD. Repeat TSH in 6 weeks..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Order Additional Tests (optional)</label>
          <input value={orderMore} onChange={e => setOrderMore(e.target.value)} placeholder="e.g. Serum Cortisol, OGTT"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onAction(lab, action, orderMore); onClose(); }}
            className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            <i className="fas fa-check-circle"></i> Mark Reviewed & Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorReports() {
  const toast = useToast();
  const [pending, setPending] = useState(PENDING_LABS);
  const [reviewed, setReviewed] = useState(REVIEWED);
  const [tab, setTab] = useState('pending');
  const [selectedLab, setSelectedLab] = useState(null);

  const handleAction = (lab, action, orderMore) => {
    const reviewedEntry = {
      id: `R${Date.now()}`,
      patient: lab.patient,
      tests: lab.tests.join(', '),
      lab: lab.lab,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      action: action || 'Reviewed. No immediate action required.',
    };
    setPending(prev => prev.filter(p => p.id !== lab.id));
    setReviewed(prev => [reviewedEntry, ...prev]);
    if (orderMore) toast(`New labs ordered for ${lab.patient}: ${orderMore}`, 'success');
    toast(`Report for ${lab.patient} reviewed and action saved.`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Lab & Reports</h1>
          <p className="text-sm text-slate-500">Review diagnostic reports and record clinical actions.</p>
        </div>
        <div className="flex gap-2">
          {pending.some(l => l.urgent) && (
            <span className="bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
              <i className="fas fa-circle-exclamation"></i> {pending.filter(l => l.urgent).length} Urgent
            </span>
          )}
          <button onClick={() => toast('Lab order form opened.', 'info')}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
            <i className="fas fa-flask"></i> Order Labs
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          {[['pending', 'Pending Review', pending.length], ['reviewed', 'Reviewed', reviewed.length]].map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-6 py-4 text-sm font-bold transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-aubergine-700 border-t-2 border-t-aubergine-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-aubergine-100 text-aubergine-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-50">
          {tab === 'pending' && pending.map(lab => (
            <div key={lab.id} className={`p-5 flex flex-col sm:flex-row gap-4 hover:bg-slate-50 transition-colors ${lab.urgent ? 'bg-amber-50/30' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-black text-slate-800">{lab.patient}</h3>
                  {lab.urgent && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1"><i className="fas fa-circle-exclamation text-[8px]"></i> Urgent</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {lab.tests.map(t => <span key={t} className="text-[10px] bg-sky-50 border border-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
                <p className="text-xs text-slate-500">{lab.lab} • Received: {lab.received}</p>
              </div>
              <button onClick={() => setSelectedLab(lab)}
                className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0 ${lab.urgent ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 border border-aubergine-200'}`}>
                <i className="fas fa-microscope"></i> Review Report
              </button>
            </div>
          ))}

          {tab === 'pending' && pending.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-circle-check text-4xl mb-3 block text-emerald-400"></i>
              <p className="font-bold">All reports reviewed!</p>
            </div>
          )}

          {tab === 'reviewed' && reviewed.map(r => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-black text-slate-800">{r.patient}</h3>
                  <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Reviewed</span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{r.tests} • {r.lab} • {r.date}</p>
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{r.action}</p>
              </div>
              <button onClick={() => toast(`Downloading report for ${r.patient}...`, 'info')}
                className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm text-aubergine-600 border border-aubergine-200 hover:bg-aubergine-50 transition-colors flex-shrink-0 h-max">
                <i className="fas fa-download"></i> Download
              </button>
            </div>
          ))}
        </div>
      </div>

      <LabReviewModal lab={selectedLab} isOpen={!!selectedLab} onClose={() => setSelectedLab(null)} onAction={handleAction} />
    </div>
  );
}

export default DoctorReports;
