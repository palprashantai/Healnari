import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../lib/apiClient.js';
import { useToast } from '../../components/Toast.jsx';

/* ── Helpers ─────────────────────────────────── */
function parseNote(text = '') {
  const grab = (label) => {
    const m = text.match(new RegExp(`${label}: ([\\s\\S]*?)(?:\\n(?:Subjective|Assessment|Plan):|$)`));
    return m ? m[1].trim() : '';
  };
  return { subjective: grab('Subjective'), assessment: grab('Assessment'), plan: grab('Plan') };
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── Chip ────────────────────────────────────── */
function Chip({ label, color = 'slate' }) {
  const c = { slate:'bg-slate-100 text-slate-600', emerald:'bg-emerald-50 text-emerald-700', amber:'bg-amber-50 text-amber-700', rose:'bg-rose-50 text-rose-600', aubergine:'bg-purple-50 text-purple-700' }[color] || 'bg-slate-100 text-slate-600';
  return <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${c}`}>{label}</span>;
}

/* ── Card ────────────────────────────────────── */
function Card({ title, icon, children, action }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <i className={`fas ${icon} text-slate-400 text-sm`}></i>
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* ── Row ─────────────────────────────────────── */
function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide w-24 shrink-0">{label}</span>
      <span className={`text-sm text-slate-700 flex-1 ${mono ? 'font-mono text-xs text-slate-500 break-all' : ''}`}>
        {value || <span className="text-slate-300 italic">—</span>}
      </span>
    </div>
  );
}

/* ── SOAP block ──────────────────────────────── */
function SoapBlock({ label, value, dot }) {
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`}></span>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed pl-3.5 whitespace-pre-wrap">
        {value || <span className="text-slate-300 italic">Not recorded</span>}
      </p>
    </div>
  );
}

/* ── Edit form ───────────────────────────────── */
function EditForm({ appointmentId, initialNotes, onSaved, onCancel }) {
  const toast = useToast();
  const [subj, setSubj] = useState(initialNotes.subjective || '');
  const [asse, setAsse] = useState(initialNotes.assessment || '');
  const [plan, setPlan] = useState(initialNotes.plan || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const combined = [subj && `Subjective: ${subj}`, asse && `Assessment: ${asse}`, plan && `Plan: ${plan}`].filter(Boolean).join('\n');
    if (!combined) { toast('Add at least one note.', 'error'); return; }
    setSaving(true);
    try {
      await apiFetch(`/telemedicine/${appointmentId}/notes`, { method: 'POST', body: { note: combined } });
      toast('Notes saved.', 'success');
      onSaved({ subjective: subj, assessment: asse, plan });
    } catch (err) { toast(err.message || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const base = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white placeholder:text-slate-300 resize-none';
  const fields = [
    { lbl: 'Subjective / Chief Complaint', val: subj, set: setSubj, rows: 2, ph: 'Patient reported…' },
    { lbl: 'Diagnosis / Assessment',       val: asse, set: setAsse, rows: 1, ph: 'e.g. PCOS — Insulin Resistance Subtype' },
    { lbl: 'Follow-up Plan',               val: plan, set: setPlan, rows: 2, ph: 'e.g. Repeat labs in 6 weeks' },
  ];

  return (
    <div className="space-y-4">
      {fields.map(({ lbl, val, set, rows, ph }) => (
        <div key={lbl}>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{lbl}</label>
          {rows === 1
            ? <input value={val} onChange={e => set(e.target.value)} placeholder={ph} className={base} />
            : <textarea rows={rows} value={val} onChange={e => set(e.target.value)} placeholder={ph} className={base} />}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
        <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
          {saving ? <><i className="fas fa-circle-notch animate-spin text-xs"></i> Saving</> : 'Save to EMR'}
        </button>
      </div>
    </div>
  );
}

/* ── Print ───────────────────────────────────── */
function printSummary(apt, notes) {
  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write(`<!DOCTYPE html><html><head><title>Consultation — ${apt.name||'Patient'}</title>
<style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:48px;color:#1e293b;max-width:720px;margin:auto;line-height:1.6}h1{font-size:20px;font-weight:700;margin:0 0 4px}.meta{color:#64748b;font-size:12px;margin-bottom:28px}h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:5px 0;vertical-align:top}td:first-child{color:#64748b;width:140px;font-weight:500}.note{background:#f8fafc;border-radius:8px;padding:16px;font-size:13px}.nl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:12px 0 4px}.nl:first-child{margin-top:0}hr{border:none;border-top:1px solid #e2e8f0;margin:20px 0}.foot{font-size:10px;color:#cbd5e1;text-align:center;margin-top:40px}</style>
</head><body>
<h1>Consultation Summary</h1><p class="meta">Generated ${new Date().toLocaleString('en-IN')} · HealNari EMR</p><hr>
<h2>Patient</h2><table><tr><td>Name</td><td>${apt.name||'—'}</td></tr><tr><td>Age</td><td>${apt.age||'—'}</td></tr><tr><td>Type</td><td>${apt.type||'—'}</td></tr><tr><td>Date</td><td>${apt.date||'—'}</td></tr><tr><td>Mode</td><td>${apt.mode||'—'}</td></tr><tr><td>Status</td><td>${apt.status||'—'}</td></tr></table><hr>
<h2>SOAP Notes</h2><div class="note"><div class="nl">Subjective</div><p>${notes?.subjective||'Not recorded'}</p><div class="nl">Assessment</div><p>${notes?.assessment||'Not recorded'}</p><div class="nl">Plan</div><p>${notes?.plan||'Not recorded'}</p></div>
<p class="foot">Confidential · HealNari · Authorised personnel only</p></body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),500);
}

/* ══ Page ════════════════════════════════════ */
export default function ConsultationSummary() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passedApt = location.state?.appointment || null;

  const [apt, setApt]         = useState(passedApt || {});
  const [allNotes, setAll]    = useState([]);
  const [parsed, setParsed]   = useState({ subjective: '', assessment: '', plan: '' });
  const [rxList, setRxList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!appointmentId) { setLoading(false); return; }
    const n = apiFetch(`/telemedicine/${appointmentId}/notes`)
      .then(list => { setAll(list||[]); if(list?.length) setParsed(parseNote(list[0].note)); })
      .catch(()=>{});
    const r = apiFetch(`/prescriptions?appointmentId=${appointmentId}`)
      .then(d => setRxList(Array.isArray(d)?d:[]))
      .catch(()=>{});
    Promise.allSettled([n,r]).finally(()=>setLoading(false));
  }, [appointmentId]);

  const onSaved = u => { setParsed(u); setEditing(false); };
  const hasNote = parsed.subjective || parsed.assessment || parsed.plan;

  const statusCls = { Done:'bg-slate-100 text-slate-600', Completed:'bg-emerald-50 text-emerald-700', Cancelled:'bg-rose-50 text-rose-600', 'In Progress':'bg-amber-50 text-amber-700' }[apt.status] || 'bg-slate-100 text-slate-600';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={()=>navigate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-slate-400 hover:text-slate-600 cursor-pointer" onClick={()=>navigate(-1)}>Appointments</span>
              <i className="fas fa-chevron-right text-[9px] text-slate-300"></i>
              <span className="text-slate-700 font-medium truncate">{apt.name || 'Summary'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={()=>printSummary(apt,parsed)} className="h-8 px-3 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5">
              <i className="fas fa-print text-slate-400"></i> Print
            </button>
            {!editing && (
              <button onClick={()=>setEditing(true)} className="h-8 px-3 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-1.5">
                <i className="fas fa-pen text-[10px]"></i> Edit Notes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-5 py-7">

        {/* Patient strip */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg shrink-0">
            {apt.name?.charAt(0) || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-slate-800">{apt.name || '—'}</h1>
              {apt.status && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusCls}`}>{apt.status}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-slate-500">
              {apt.age  && <span><i className="fas fa-user mr-1 text-slate-300"></i>{apt.age}</span>}
              {apt.type && <span><i className="fas fa-tag mr-1 text-slate-300"></i>{apt.type}</span>}
              {apt.mode && <span><i className={`fas ${apt.mode==='Video'?'fa-video':'fa-hospital'} mr-1 text-slate-300`}></i>{apt.mode}</span>}
              {apt.date && <span><i className="fas fa-calendar mr-1 text-slate-300"></i>{apt.date}</span>}
              {apt.time && <span><i className="fas fa-clock mr-1 text-slate-300"></i>{apt.time}</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-base font-bold text-slate-700">{allNotes.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Notes</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-base font-bold text-slate-700">{rxList.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Rx</div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left (2/3) */}
            <div className="lg:col-span-2 space-y-5">

              {/* SOAP */}
              <Card icon="fa-file-medical" title="Clinical Notes (SOAP)"
                action={!editing && (
                  <button onClick={()=>setEditing(true)} className="text-[11px] font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1">
                    <i className="fas fa-pen text-[9px]"></i> Edit
                  </button>
                )}
              >
                {editing ? (
                  <EditForm appointmentId={appointmentId} initialNotes={parsed} onSaved={onSaved} onCancel={()=>setEditing(false)} />
                ) : hasNote ? (
                  <>
                    <SoapBlock label="Subjective" value={parsed.subjective} dot="bg-purple-400" />
                    <SoapBlock label="Assessment" value={parsed.assessment} dot="bg-emerald-400" />
                    <SoapBlock label="Plan"       value={parsed.plan}       dot="bg-sky-400" />
                  </>
                ) : (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                      <i className="fas fa-file-pen text-slate-300 text-lg"></i>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No notes recorded</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Document this visit with SOAP notes.</p>
                    <button onClick={()=>setEditing(true)} className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline underline-offset-2">Add notes</button>
                  </div>
                )}
                {allNotes.length > 1 && !editing && (
                  <details className="mt-4 border-t border-slate-100 pt-4">
                    <summary className="text-[11px] text-slate-400 font-medium cursor-pointer select-none hover:text-slate-600">
                      <i className="fas fa-history mr-1.5"></i>{allNotes.length - 1} earlier revision{allNotes.length>2?'s':''}
                    </summary>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {allNotes.slice(1).map((n,i)=>(
                        <div key={n.id||i} className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 border border-slate-100">
                          <p className="font-mono text-[10px] text-slate-400 mb-1">{fmtDate(n.created_at)}</p>
                          <pre className="whitespace-pre-wrap font-sans">{n.note}</pre>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </Card>

              {/* Prescriptions */}
              <Card icon="fa-prescription-bottle-medical" title="Prescriptions">
                {rxList.length > 0 ? (
                  <div className="space-y-1">
                    {rxList.map((rx,i)=>(
                      <div key={rx.id||i} className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{rx.medicine_name||rx.name||`Item ${i+1}`}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {rx.dosage   && <Chip label={rx.dosage}   color="emerald" />}
                            {rx.duration && <Chip label={rx.duration} color="slate" />}
                          </div>
                          {rx.instructions && <p className="text-[11px] text-slate-400 mt-1 italic">{rx.instructions}</p>}
                        </div>
                        <i className="fas fa-capsules text-slate-200 text-base shrink-0 mt-0.5"></i>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <i className="fas fa-prescription-bottle text-2xl text-slate-200 mb-2"></i>
                    <p className="text-sm text-slate-400">No prescriptions linked</p>
                  </div>
                )}
              </Card>

              {/* Note history */}
              {allNotes.length > 0 && (
                <Card icon="fa-clock-rotate-left" title="Note History">
                  <div className="space-y-3">
                    {allNotes.map((n,i)=>(
                      <div key={n.id||i} className="relative pl-4 border-l-2 border-slate-100">
                        <p className="text-[10px] text-slate-400 mb-1 font-mono">
                          {i===0 && <span className="text-purple-500 font-semibold not-mono mr-1">Latest ·</span>}
                          {fmtDate(n.created_at)}
                        </p>
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          {n.note||'(empty)'}
                        </pre>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar (1/3) */}
            <div className="space-y-5">

              <Card icon="fa-calendar-days" title="Appointment Details">
                <Row label="Patient" value={apt.name} />
                <Row label="Age"     value={apt.age} />
                <Row label="Date"    value={apt.date} />
                <Row label="Time"    value={apt.time} />
                <Row label="Type"    value={apt.type} />
                <Row label="Mode"    value={apt.mode} />
                <Row label="Status"  value={apt.status} />
                <Row label="ID"      value={appointmentId} mono />
              </Card>

              <Card icon="fa-timeline" title="Visit Timeline">
                {[
                  { label:'Appointment booked', sub:apt.type,                               dot:'bg-purple-300' },
                  { label:'Check-in / Waiting',  sub:apt.mode==='Video'?'Virtual room':'In-clinic', dot:'bg-amber-300' },
                  { label:'Consultation',         sub:apt.status,                            dot:apt.status==='Cancelled'?'bg-rose-300':'bg-emerald-300' },
                  ...(allNotes.length?[{ label:'Notes documented', sub:`${allNotes.length} entry`, dot:'bg-sky-300' }]:[]),
                ].map((item,i,arr)=>(
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.dot}`}></div>
                      {i<arr.length-1 && <div className="w-px flex-1 bg-slate-100 my-1 min-h-[12px]"></div>}
                    </div>
                    <div className="pb-3">
                      <p className="text-[13px] font-medium text-slate-700">{item.label}</p>
                      {item.sub && <p className="text-[11px] text-slate-400 mt-0.5">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </Card>

              <Card icon="fa-bolt" title="Actions">
                <div className="space-y-0.5">
                  {[
                    { icon:'fa-pen',                         label:'Edit notes',          fn:()=>setEditing(true) },
                    { icon:'fa-prescription-bottle-medical', label:'View prescriptions',  fn:()=>navigate('/doctor-dashboard/prescriptions') },
                    { icon:'fa-user',                        label:'Patient profile',      fn:()=>navigate('/doctor-dashboard/patients') },
                    { icon:'fa-arrow-left',                  label:'Back',                 fn:()=>navigate(-1) },
                  ].map(({icon,label,fn})=>(
                    <button key={label} onClick={fn} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors text-left">
                      <i className={`fas ${icon} w-4 text-center text-slate-400 text-[12px]`}></i>
                      {label}
                    </button>
                  ))}
                </div>
              </Card>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
