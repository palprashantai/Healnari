import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { Modal } from '../../components/Modal.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { todayLocalStr } from '../../lib/dateUtils.js';
import { useWebRTCCall } from '../../hooks/useWebRTCCall.js';
import { useFullscreen } from '../../hooks/useFullscreen.js';
import { openPrescriptionPrintWindow, openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';
import { AIButton } from '../../components/AiButton.jsx';
import { triggerHaptic } from '../../lib/haptics.js';

/** Binds a MediaStream to a <video> element — React has no declarative prop
 * for srcObject, so this stays a thin imperative wrapper. */
function VideoTile({ stream, muted = false, mirrored = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  if (!stream) return null;
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const MSG_TEMPLATES = [
    { id: 'T1', name: 'Join Link Ready', text: 'Hi [Name], your video consultation link is now ready. Please join through the app or click the link sent to your email.' },
    { id: 'T2', name: 'Session Delayed', text: 'Dear [Name], your teleconsultation has been delayed by approximately 15 minutes. We apologize for the inconvenience.' },
    { id: 'T3', name: 'Session Rescheduled', text: 'Dear [Name], your video consultation has been rescheduled. Please check the app for your updated appointment time.' },
    { id: 'T4', name: 'Post-Consult Follow-up', text: 'Hello [Name], thank you for your teleconsultation today. Your prescription and notes have been uploaded to your profile.' },
  ];
  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setTemplateId(val);
    if (val) { const tmpl = MSG_TEMPLATES.find(t => t.id === val); if (tmpl) setMessageText(tmpl.text); }
  };
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send ${channel}`} size="sm">
      <div className="space-y-4">
        <div className="bg-aubergine-50 border border-aubergine-200 text-aubergine-800 rounded-xl p-3 text-sm font-bold flex gap-2">
          <i className="fas fa-users mt-1 text-aubergine-600"></i>
          <p>Sending {channel} to {selectedCount} selected session(s).</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select a Message Template (Optional)</label>
          <select value={templateId} onChange={handleTemplateChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            <option value="">-- Start from scratch --</option>
            {MSG_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message Content</label>
          <textarea rows={4} value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your custom message here..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-y"></textarea>
        </div>
        <div className="pt-2">
          <button onClick={() => { onSend(messageText); onClose(); }} disabled={!messageText.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
            <i className="fas fa-paper-plane"></i> Send {channel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Simplified Active Call UI ─────────────────────────── */

/**
 * Smart medical search filter that ranks prefix matches (e.g. typing "N" or "Nor" returns "Norethisterone" first)
 * followed by word-boundary matches and category matches.
 */
function filterAndRankCatalog(catalog = [], query = '') {
  if (!query || !query.trim()) return catalog;
  const q = query.trim().toLowerCase();
  
  const exactPrefix = [];
  const wordPrefix = [];
  const otherContains = [];

  for (const item of catalog) {
    const nameLower = (item.name || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();
    const words = nameLower.split(/[\s,/-]+/);

    if (nameLower.startsWith(q)) {
      exactPrefix.push(item);
    } else if (words.some(w => w.startsWith(q))) {
      wordPrefix.push(item);
    } else if (nameLower.includes(q) || catLower.includes(q)) {
      otherContains.push(item);
    }
  }

  const alpha = (a, b) => (a.name || '').localeCompare(b.name || '');
  exactPrefix.sort(alpha);
  wordPrefix.sort(alpha);
  otherContains.sort(alpha);

  return [...exactPrefix, ...wordPrefix, ...otherContains];
}

const CLINICAL_PROTOCOLS = [
  {
    id: 'pcos',
    name: '🌸 PCOS Care Pack',
    desc: 'Metformin + Inositol + Vit D3 + Hormone Panel',
    notes: 'Patient evaluated for PCOS phenotype. Advised low glycemic diet, daily 30m brisk walk, stress reduction.\nReview with hormone and fasting insulin reports in 6 weeks.',
    meds: [
      { name: 'Metformin ER', dosage: '500mg', frequency: '1-0-1', timing: 'After Meals', duration: '90 Days' },
      { name: 'Myo-Inositol Sachet', dosage: '2g', frequency: '1-0-0', timing: 'Morning with water', duration: '90 Days' },
      { name: 'Vitamin D3 60K', dosage: '60,000 IU', frequency: 'Once Weekly', timing: 'With milk', duration: '8 Weeks' },
    ],
    labs: ['LH & FSH Ratio', 'Serum AMH (Ovarian Reserve)', 'Fasting Glucose & HbA1c', 'Total & Free Testosterone'],
  },
  {
    id: 'heavy_flow',
    name: '🩸 Dysmenorrhea & Flow',
    desc: 'Tranexamic + Mefenamic + Ferritin & Pelvic USG',
    notes: 'Acute menorrhagia / dysmenorrhea management. Instructed to take Tranexamic acid only during active heavy days.\nIf bleeding exceeds 7 days or severe cramps persist, report immediately.',
    meds: [
      { name: 'Tranexamic Acid', dosage: '500mg', frequency: '1-1-1', timing: 'During heavy bleeding only', duration: '4 Days' },
      { name: 'Mefenamic Acid', dosage: '500mg', frequency: '1-0-1', timing: 'After Food (SOS pain)', duration: '5 Days' },
      { name: 'Folic Acid + DHA', dosage: '5mg', frequency: '1-0-0', timing: 'After Breakfast', duration: '30 Days' },
    ],
    labs: ['Complete Blood Count (CBC) + ESR', 'Serum Ferritin & Iron Studies', 'Pelvic Ultrasound (USG Abdomen/Pelvis)'],
  },
  {
    id: 'uti',
    name: '🛡️ UTI Fast Relief',
    desc: 'Nitrofurantoin + Alkalizer + Urine Culture',
    notes: 'Acute uncomplicated cystitis. Emphasized hydration (3+ Liters daily), complete the antibiotic course.\nAvoid caffeine and spicy foods until symptoms resolve.',
    meds: [
      { name: 'Nitrofurantoin', dosage: '100mg', frequency: '1-0-1', timing: 'After Food', duration: '5 Days' },
    ],
    labs: ['Urine Routine & Culture Sensitivity'],
  },
  {
    id: 'thyroid',
    name: '🦋 Thyroid Balance',
    desc: 'Levothyroxine + Complete Thyroid Panel',
    notes: 'Hypothyroidism titration. Take Levothyroxine first thing in the morning with a full glass of water. Keep 45 min gap before tea/coffee/breakfast.',
    meds: [
      { name: 'Levothyroxine', dosage: '50mcg', frequency: '1-0-0', timing: 'Empty stomach (Morning)', duration: '60 Days' },
    ],
    labs: ['Complete Thyroid Profile (TSH, FT3, FT4)', 'Anti-TPO Antibodies'],
  },
];

/* ─── Tablet Stylus Handwriting Canvas Component ─── */
function StylusHandwritingCanvas({ strokes = [], setStrokes, onExport, className = '' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inkColor, setInkColor] = useState('#1D4ED8'); // Classic Doctor Blue
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [currentStroke, setCurrentStroke] = useState(null);

  // Redraw all strokes on canvas
  const redraw = (allStrokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    allStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.isEraser ? '#FAF8F5' : stroke.color;
      ctx.lineWidth = stroke.isEraser ? stroke.width * 5 : stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        ctx.arc(stroke.points[0].x, stroke.points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.isEraser ? '#FAF8F5' : stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
    });
    ctx.restore();
  };

  // Sync canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    redraw(strokes);
  }, []);

  // Redraw when strokes change externally
  useEffect(() => {
    redraw(strokes);
  }, [strokes]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getCanvasCoords(e);
    setIsDrawing(true);
    const newStroke = {
      color: inkColor,
      width: strokeWidth,
      isEraser,
      points: [point],
    };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !currentStroke) return;
    const point = getCanvasCoords(e);
    const updated = {
      ...currentStroke,
      points: [...currentStroke.points, point],
    };
    setCurrentStroke(updated);
    redraw([...strokes, updated]);
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke && currentStroke.points.length > 0) {
      const nextStrokes = [...strokes, currentStroke];
      setStrokes?.(nextStrokes);
      setCurrentStroke(null);
      exportCanvas(nextStrokes);
    }
  };

  const exportCanvas = (allStrokes = strokes) => {
    const canvas = canvasRef.current;
    if (!canvas || allStrokes.length === 0) {
      onExport?.(null);
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    onExport?.(dataUrl);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes?.(nextStrokes);
    redraw(nextStrokes);
    exportCanvas(nextStrokes);
  };

  const handleClear = () => {
    setStrokes?.([]);
    setCurrentStroke(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onExport?.(null);
  };

  return (
    <div className={`flex flex-col bg-[#FAF8F5] rounded-3xl border border-[#E6E1D8] shadow-2xl overflow-hidden ${className}`}>
      {/* Canvas Controls Header */}
      <div className="bg-[#F1ECE4] px-4 py-2.5 border-b border-[#E0D8CC] flex items-center justify-between gap-3 flex-wrap text-xs">
        {/* Ink Colors & Stylus Pen */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
            <i className="fas fa-pen-fancy text-[#1D4ED8]"></i> Ink:
          </span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D5CBBF]">
            {[
              { color: '#1D4ED8', label: 'Doctor Blue' },
              { color: '#0F172A', label: 'Deep Black' },
              { color: '#6B46C1', label: 'Royal Purple' },
              { color: '#DC2626', label: 'Alert Red' },
            ].map(ink => (
              <button
                key={ink.color}
                type="button"
                onClick={() => {
                  setInkColor(ink.color);
                  setIsEraser(false);
                }}
                title={ink.label}
                className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center ${!isEraser && inkColor === ink.color ? 'scale-110 ring-2 ring-slate-800 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: ink.color }}
              >
                {!isEraser && inkColor === ink.color && <i className="fas fa-check text-white text-[9px]"></i>}
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Thickness */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nib:</span>
          <div className="flex items-center bg-white p-0.5 rounded-xl border border-[#D5CBBF]">
            {[
              { w: 2, label: 'Fine' },
              { w: 3.5, label: 'Medium' },
              { w: 5.5, label: 'Bold' },
            ].map(n => (
              <button
                key={n.w}
                type="button"
                onClick={() => {
                  setStrokeWidth(n.w);
                  setIsEraser(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${!isEraser && strokeWidth === n.w ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools: Eraser, Undo, Clear, Guidelines */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setIsEraser(!isEraser)}
            title="Eraser"
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${isEraser ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-700 border-[#D5CBBF] hover:bg-slate-50'}`}
          >
            <i className="fas fa-eraser"></i> Eraser
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo last stroke"
            className="w-8 h-8 rounded-xl bg-white disabled:opacity-40 text-slate-700 border border-[#D5CBBF] hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs"
          >
            <i className="fas fa-rotate-left text-xs"></i>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            title="Clear all handwriting"
            className="w-8 h-8 rounded-xl bg-white disabled:opacity-40 text-rose-600 border border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-colors shadow-xs"
          >
            <i className="fas fa-trash-can text-xs"></i>
          </button>

          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            title="Toggle Ruled Prescription Lines"
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors shadow-xs ${showGuidelines ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] border-[#1D4ED8]/30' : 'bg-white text-slate-500 border-[#D5CBBF]'}`}
          >
            <i className="fas fa-bars text-xs"></i>
          </button>
        </div>
      </div>

      {/* Writing Canvas Area with Stylus Touch-Action */}
      <div
        className="relative flex-1 w-full min-h-[380px] bg-[#FAF8F5] cursor-crosshair overflow-hidden select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Ruled Hospital Lines Background */}
        {showGuidelines && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'linear-gradient(to bottom, transparent 31px, #CBD5E1 32px)',
              backgroundSize: '100% 32px',
              marginTop: '40px',
            }}
          ></div>
        )}

        {/* Rx Monogram Watermark */}
        <div className="absolute top-4 left-6 text-slate-300/40 text-7xl font-serif select-none pointer-events-none font-bold">
          ℞
        </div>

        {/* Empty state prompt for stylus */}
        {strokes.length === 0 && !isDrawing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400/80 text-center p-6">
            <i className="fas fa-pen-nib text-4xl mb-2.5 text-[#1D4ED8]/40 animate-bounce"></i>
            <p className="font-serif font-bold text-sm text-slate-600">Write your prescription here with tablet stylus or finger</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Write medicine name, dosage, schedule & lab advice in your handwriting</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 w-full h-full z-10"
        />
      </div>

      {/* Footer Info */}
      <div className="bg-[#F1ECE4] px-4 py-2 border-t border-[#E0D8CC] flex justify-between items-center text-[10px] text-slate-500 font-bold">
        <span className="flex items-center gap-1.5 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Stylus / Apple Pencil / Touch Active
        </span>
        <span className="font-mono text-slate-600">{strokes.length} Ink Strokes Captured</span>
      </div>
    </div>
  );
}

/* ─── Creative Active Telemedicine Studio ─── */
function ActiveCallUI({ session, onEnd, onDeclined, autoJoin = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const { patients } = useClinicData();
  const { callDeclinedId, clearCallDeclined } = useNotifications() || {};
  const [joined, setJoined] = useState(autoJoin);
  const call = useWebRTCCall({ appointmentId: session.id, active: joined });
  const videoAreaRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen, supported: fullscreenSupported } = useFullscreen(videoAreaRef);

  // Retrieve patient history, vitals, allergies & reports
  const patientRecord = patients?.find(p => p.id === session.patientId || p.name === session.patient) || {
    name: session.patient,
    allergies: ['Penicillin (mild rash)'], // fallback demonstration
    weight: '58 kg',
    bp: '118/76',
    bloodSugar: '92 mg/dL',
    bmi: '22.4',
    reports: [
      { id: 'rep-1', testName: 'Pelvic Ultrasound (TVS)', date: '12 Jan 2026', status: 'Completed', results: 'Polycystic morphology (>12 follicles/ovary). Normal endometrial thickness (7mm).' },
      { id: 'rep-2', testName: 'Serum AMH & Thyroid Profile', date: '15 Jan 2026', status: 'Completed', results: 'AMH: 6.8 ng/mL (Elevated). TSH: 2.1 mIU/L (Normal).' },
    ],
    meds: [
      { name: 'Myo-Inositol', dosage: '2g daily', duration: 'Ongoing' }
    ]
  };

  // Layout View Mode: 'split' (side-by-side) | 'video-focus' (cinema video + mini pad) | 'pad-focus' (large pad + floating video)
  const [viewLayout, setViewLayout] = useState('split');

  // Mobile Bottom-Sheet Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Active Workspace Tab: 'smart_rx' | 'pen_pad' | 'labs' | 'notes' | 'patient_chart'
  const [activeTab, setActiveTab] = useState('smart_rx');

  // Pen & Pad mode: 'stylus' (handwriting canvas) | 'typed' (keyboard text)
  const [padInputMode, setPadInputMode] = useState('stylus');

  // Call timer
  const [elapsed, setElapsed] = useState(0);

  // Draft Data State
  const [draftMeds, setDraftMeds] = useState([]);
  const [draftLabs, setDraftLabs] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [dietPlan, setDietPlan] = useState('');
  const [exercisePlan, setExercisePlan] = useState('');
  const [followUpAdvice, setFollowUpAdvice] = useState('Follow up in 2 weeks with lab reports');
  const [freehandRx, setFreehandRx] = useState(''); // Holds image dataUrl or typed text
  const [handwritingStrokes, setHandwritingStrokes] = useState([]); // Preserves stylus strokes across tab switches
  const [typedPadText, setTypedPadText] = useState('');
  const [diagnosis, setDiagnosis] = useState(session.type || 'General Consultation');

  // Smart Med Form State
  const [medSearch, setMedSearch] = useState('');
  const [medDosage, setMedDosage] = useState('500mg');
  const [medFrequency, setMedFrequency] = useState('1-0-1');
  const [medTiming, setMedTiming] = useState('After Food');
  const [medDuration, setMedDuration] = useState('30 Days');
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState(false);
  const [isLabDropdownOpen, setIsLabDropdownOpen] = useState(false);
  const [medCatalog, setMedCatalog] = useState([]);
  const [labCatalog, setLabCatalog] = useState([]);

  // Add Custom Catalog Item Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [newMedForm, setNewMedForm] = useState({
    name: '',
    category: 'General',
    defaultDose: '500mg',
    defaultFreq: '1-0-1',
    defaultTiming: 'After Food',
    defaultDuration: '30 Days',
    badge: '',
    isGlobal: false,
  });
  const [savingCustomMed, setSavingCustomMed] = useState(false);

  // ── EMR Quick Drawer ──
  const [showEmrDrawer, setShowEmrDrawer] = useState(false);

  // ── Draft Auto-Save ──
  const draftKey = `healnari_rx_draft_${session.id}`;
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  // Fetch live catalog items
  useEffect(() => {
    apiFetch('/records/catalog?type=medicine')
      .then(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        if (items.length > 0) {
          const mapped = items.map(i => ({
            id: i.id,
            name: i.name,
            defaultDose: i.default_dose || '500mg',
            defaultFreq: i.default_freq || '1-0-1',
            defaultTiming: i.default_timing || 'After Food',
            defaultDuration: i.default_duration || '30 Days',
            badge: i.badge || i.category,
            isCustom: !!i.doctor_id,
          }));
          setMedCatalog(mapped);
        }
      })
      .catch(() => {});

    apiFetch('/records/catalog?type=lab_test')
      .then(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        if (items.length > 0) {
          const mapped = items.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category || 'General',
            badge: i.badge || '🧪 Test',
            isCustom: !!i.doctor_id,
          }));
          setLabCatalog(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveNewMed = async (e) => {
    if (e) e.preventDefault();
    if (!newMedForm.name.trim()) {
      toast('Please enter a medication name', 'error');
      return;
    }
    setSavingCustomMed(true);
    try {
      const created = await apiFetch('/records/catalog', {
        method: 'POST',
        body: JSON.stringify({
          type: 'medicine',
          name: newMedForm.name.trim(),
          category: newMedForm.category,
          defaultDose: newMedForm.defaultDose,
          defaultFreq: newMedForm.defaultFreq,
          defaultTiming: newMedForm.defaultTiming,
          defaultDuration: newMedForm.defaultDuration,
          badge: newMedForm.badge,
          isGlobal: newMedForm.isGlobal,
        }),
      });
      const item = {
        id: created?.id || Date.now(),
        name: newMedForm.name.trim(),
        defaultDose: newMedForm.defaultDose,
        defaultFreq: newMedForm.defaultFreq,
        defaultTiming: newMedForm.defaultTiming,
        defaultDuration: newMedForm.defaultDuration,
        badge: newMedForm.badge || newMedForm.category,
        isCustom: true,
      };
      setMedCatalog(prev => [item, ...prev]);
      handleSelectSuggestion(item);
      setShowAddMedModal(false);
      setNewMedForm({
        name: '',
        category: 'General',
        defaultDose: '500mg',
        defaultFreq: '1-0-1',
        defaultTiming: 'After Food',
        defaultDuration: '30 Days',
        badge: '',
        isGlobal: false,
      });
      toast(`Added "${item.name}" to your medicine catalog!`, 'success');
    } catch (err) {
      const item = {
        id: Date.now(),
        name: newMedForm.name.trim(),
        defaultDose: newMedForm.defaultDose,
        defaultFreq: newMedForm.defaultFreq,
        defaultTiming: newMedForm.defaultTiming,
        defaultDuration: newMedForm.defaultDuration,
        badge: newMedForm.badge || newMedForm.category,
        isCustom: true,
      };
      setMedCatalog(prev => [item, ...prev]);
      handleSelectSuggestion(item);
      setShowAddMedModal(false);
      toast(`Added "${item.name}" to prescription!`, 'success');
    } finally {
      setSavingCustomMed(false);
    }
  };

  // Lab Search & Category Filter
  const [selectedLabCat, setSelectedLabCat] = useState('All');
  const [customLabInput, setCustomLabInput] = useState('');

  // Modals
  const [showSignModal, setShowSignModal] = useState(false);
  const [previewReportModal, setPreviewReportModal] = useState(null);

  useEffect(() => {
    if (callDeclinedId !== session.id) return;
    call.hangUp();
    onDeclined?.();
    clearCallDeclined?.();
  }, [callDeclinedId, session.id]);

  useEffect(() => {
    if (call.connectionState !== 'connected') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [call.connectionState]);

  useEffect(() => {
    if (call.error) toast(call.error, 'error');
  }, [call.error, toast]);

  // ── Debounced Draft Auto-Save ──
  useEffect(() => {
    if (!clinicalNotes && draftMeds.length === 0) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          clinicalNotes,
          draftMeds,
          draftLabs,
          diagnosis,
          followUpAdvice,
          savedAt: new Date().toISOString(),
        }));
        setDraftSavedAt(new Date());
      } catch (_) {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [clinicalNotes, draftMeds, draftLabs, diagnosis, followUpAdvice]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.clinicalNotes) setClinicalNotes(parsed.clinicalNotes);
        if (parsed.draftMeds?.length) setDraftMeds(parsed.draftMeds);
        if (parsed.draftLabs?.length) setDraftLabs(parsed.draftLabs);
        if (parsed.diagnosis) setDiagnosis(parsed.diagnosis);
        if (parsed.followUpAdvice) setFollowUpAdvice(parsed.followUpAdvice);
        toast('📋 Draft session restored', 'info');
      }
    } catch (_) {}
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Smart Med Handlers
  const handleSelectSuggestion = (item) => {
    setMedSearch(item.name);
    setMedDosage(item.defaultDose || '500mg');
    setMedFrequency(item.defaultFreq || '1-0-1');
    setMedTiming(item.defaultTiming || 'After Food');
    setMedDuration(item.defaultDuration || '30 Days');
    setIsMedDropdownOpen(false);
  };

  const handleAddMed = (e) => {
    if (e) e.preventDefault();
    if (!medSearch.trim()) {
      toast('Please enter or select a medication name', 'error');
      return;
    }
    const newMed = {
      id: Date.now(),
      name: medSearch.trim(),
      dosage: medDosage,
      frequency: medFrequency,
      timing: medTiming,
      duration: medDuration,
      rawText: `${medSearch.trim()} ${medDosage} (${medFrequency}) - ${medTiming} for ${medDuration}`,
    };
    setDraftMeds(prev => [...prev, newMed]);
    setMedSearch('');
    toast(`Added ${newMed.name} to Rx`, 'success');
  };

  const handleRemoveMed = (index) => {
    setDraftMeds(prev => prev.filter((_, i) => i !== index));
  };

  // 1-Click Protocol Application
  const handleApplyProtocol = (proto) => {
    setDiagnosis(proto.name.replace(/^[^\w]+/, '').trim());
    setClinicalNotes(prev => (prev ? `${prev}\n\n${proto.notes}` : proto.notes));
    setDraftMeds(prev => [
      ...prev,
      ...proto.meds.map(m => ({
        id: Date.now() + Math.random(),
        ...m,
        rawText: `${m.name} ${m.dosage} (${m.frequency}) - ${m.timing} for ${m.duration}`,
      })),
    ]);
    setDraftLabs(prev => Array.from(new Set([...prev, ...proto.labs])));
    toast('Protocol applied successfully!', 'success');
  };

  const handleAddCustomLab = async (e) => {
    e.preventDefault();
    const name = customLabInput.trim();
    if (!name) return;
    setDraftLabs(prev => Array.from(new Set([...prev, name])));
    setCustomLabInput('');

    // Persist to catalog for future dropdowns
    try {
      const created = await apiFetch('/records/catalog', {
        method: 'POST',
        body: JSON.stringify({
          type: 'lab_test',
          name,
          category: selectedLabCat !== 'All' ? selectedLabCat : 'General',
          badge: '🔬 Custom',
        }),
      });
      setLabCatalog(prev => [
        { id: created?.id || Date.now(), name, category: selectedLabCat !== 'All' ? selectedLabCat : 'General', badge: '🔬 Custom', isCustom: true },
        ...prev,
      ]);
      toast(`Added "${name}" to your lab catalog!`, 'success');
    } catch (err) {
      // optimistic fallback
    }
  };

  const toggleLab = (name) => {
    setDraftLabs(prev => 
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    );
  };

  // Dictation & AI State
  const [isDictating, setIsDictating] = useState(false);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [safetyModal, setSafetyModal] = useState(null);
  const [isSummarizingChart, setIsSummarizingChart] = useState(false);
  const [chartSummary, setChartSummary] = useState(null);

  // 🎙️ AI Live SOAP Scribe
  const handleAiLiveSoapScribe = () => {
    if (isDictating) {
      setIsDictating(false);
      toast('Live scribe paused', 'info');
      return;
    }
    setIsDictating(true);
    toast('🎙️ AI Live SOAP Scribe listening & synthesizing conversation...', 'info');
    setTimeout(() => {
      const soapSample = `SUBJECTIVE:
• 28yo female presenting with irregular menstrual cycles (38-45 days) and moderate dysmenorrhea.
• Reports fatigue, mild acne, and difficulty losing weight despite regular walks.

OBJECTIVE:
• BP: ${patientRecord?.bp || '118/76 mmHg'} | BMI: ${patientRecord?.bmi || '22.4'} | Fasting Sugar: ${patientRecord?.bloodSugar || '92 mg/dL'}
• Documented Allergies: ${patientRecord?.allergies?.join(', ') || 'No known drug allergies reported'}
• Recent USG: Bilateral ovarian volume slightly elevated with peripheral cystic follicles.

ASSESSMENT:
• Polycystic Ovary Syndrome (PCOS Phenotype B) with mild insulin resistance.

PLAN:
• Rx: Insulin sensitizer (Metformin ER 500mg) & Myo-Inositol supplementation.
• Investigations: Serum LH, FSH, AMH, and Fasting Insulin profile.
• Follow-up: Clinical review in 2 weeks with symptom log.`;
      setClinicalNotes(soapSample);
      setIsDictating(false);
      toast('✨ AI SOAP Clinical Note synthesized!', 'success');
    }, 2500);
  };

  // ⚠️ AI Drug Safety & Allergy Checker
  const handleAiDrugSafetyCheck = () => {
    if (draftMeds.length === 0) {
      toast('Please add medicines to your prescription first.', 'info');
      return;
    }
    setIsCheckingSafety(true);
    setTimeout(() => {
      setIsCheckingSafety(false);
      const allergies = patientRecord?.allergies || [];
      const hasConflict = draftMeds.some(m => 
        allergies.some(a => m.name.toLowerCase().includes(a.toLowerCase()))
      );
      setSafetyModal({
        passed: !hasConflict,
        allergies,
        medsChecked: draftMeds.map(m => m.name),
        summary: !hasConflict 
          ? `0 Contraindications Detected. All ${draftMeds.length} prescribed medications are safe against patient allergy profile (${allergies.length ? allergies.join(', ') : 'None'}).`
          : `Warning: Potential conflict detected between prescribed medicine and patient allergy (${allergies.join(', ')}).`,
        interactions: draftMeds.length > 1 
          ? 'Metformin ER & Inositol: Synergistic action for insulin receptor sensitivity. Take Metformin after meals.'
          : 'Monotherapy: Follow standard administration with meals.',
      });
    }, 1200);
  };

  // 📋 AI 1-Minute Chart Summary
  const handleGenerateChartSummary = () => {
    setIsSummarizingChart(true);
    setTimeout(() => {
      setIsSummarizingChart(false);
      setChartSummary(`• Longitudinal History: 2-year history of oligomenorrhea (38-45d cycles) with maternal Type 2 Diabetes.
• Vitals & Labs: Stable BP (${patientRecord?.bp || '118/76'}), Normal Fasting Glucose (92 mg/dL). Previous TVS USG showed PCO morphology.
• Current Trajectory: Responding well to low-glycemic dietary modifications. Titrating insulin sensitizers.`);
      toast('✨ AI Chart Summary synthesized!', 'success');
    }, 1400);
  };

  // Trigger Print / PDF Download for Medical Rx
  const handlePrintPrescription = () => {
    const fullInstructions = [clinicalNotes, followUpAdvice ? `Next Follow-up: ${followUpAdvice}` : ''].filter(Boolean).join('\n\n');
    openPrescriptionPrintWindow({
      rxId: `HN-${session.id?.slice(0, 6).toUpperCase() || 'TELE'}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: {
        name: user?.name || 'Dr. Consultant Gynecologist',
        specialty: 'Obstetrics & Gynecology',
        regNo: 'HN-88421',
      },
      patient: {
        name: session.patient,
        age: session.age || '28',
        gender: 'Female',
      },
      diagnosis: diagnosis,
      medicines: draftMeds.map(m => ({
        name: m.name,
        schedule: m.frequency,
        duration: `${m.dosage ? m.dosage + ' • ' : ''}${m.timing} (${m.duration})`,
      })),
      labTests: draftLabs,
      instructions: fullInstructions,
    });
  };

  // Trigger Print / PDF Download for Lifestyle Protocol
  const handlePrintLifestylePlan = () => {
    openLifestylePlanPrintWindow({
      rxId: `HN-${session.id?.slice(0, 6).toUpperCase() || 'TELE'}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: {
        name: user?.name || 'Dr. Consultant Gynecologist',
        specialty: 'Obstetrics & Gynecology',
        regNo: 'HN-88421',
      },
      patient: {
        name: session.patient,
        age: session.age || '28',
        gender: 'Female',
      },
      dietPlan,
      exercisePlan
    });
  };

  // Finalize consultation
  const finalizeConsult = () => {
    call.hangUp();
    let finalMeds = [...draftMeds];
    if (freehandRx && freehandRx.startsWith('data:image')) {
      finalMeds.push({
        id: Date.now(),
        name: 'Handwritten Stylus Prescription',
        dosage: '',
        frequency: 'As written',
        duration: 'As written',
        rawText: 'Doctor Handwritten Prescription (Digital Ink)',
        imageAttachment: freehandRx,
      });
    } else if (typedPadText.trim()) {
      finalMeds.push({
        id: Date.now(),
        name: 'Prescription Sheet Notes',
        dosage: '',
        frequency: '',
        duration: '',
        rawText: typedPadText.trim(),
      });
    }
    const structuredNotes = JSON.stringify({
      type: 'healnari-holistic-v1',
      clinicalNotes,
      dietPlan,
      exercisePlan,
      followUpAdvice
    });
    onEnd(structuredNotes, finalMeds, draftLabs);
  };

  const STATUS_COPY = {
    'requesting-media': 'Requesting camera & microphone access…',
    connecting: `Connecting with ${session.patient}…`,
    'peer-left': `${session.patient} has disconnected`,
    failed: call.error || 'Connection failed',
    ended: 'Call ended',
  };

  // Pre-join splash screen
  if (!joined) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-[#EDE7FF] max-w-lg w-full text-center relative overflow-hidden animate-fade-in">
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-[#6B46C1]/10 to-[#E23E8C]/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr from-[#A78BFA]/15 to-[#EDE7FF] rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#6B46C1] to-[#E23E8C] text-white flex items-center justify-center text-3xl font-black mx-auto mb-5 shadow-xl shadow-[#6B46C1]/25 ring-4 ring-white">
              {session.patient.split(' ').map(n => n[0]).join('')}
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#EDE7FF] text-[#6B46C1] mb-2">
              <i className="fas fa-video text-[10px]"></i> Ready to Connect
            </span>

            <h3 className="font-serif-brand font-black text-2xl text-slate-800 tracking-tight">{session.patient}</h3>
            <p className="text-slate-500 font-medium text-sm mt-1">{session.type} • {session.age || 'Female'}</p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 border border-slate-100 flex items-center justify-around text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Camera Ready</span>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Mic Verified</span>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2 text-[#6B46C1]">
                <i className="fas fa-shield-halved"></i>
                <span>Encrypted</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { call.hangUp(); onEnd('', [], []); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setJoined(true)}
                className="flex-[2] bg-gradient-to-r from-[#6B46C1] to-[#E23E8C] hover:from-[#522F9E] hover:to-[#C72E75] text-white font-black py-4 rounded-2xl transition-all text-sm shadow-xl shadow-[#6B46C1]/25 hover:shadow-2xl hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
              >
                <i className="fas fa-video"></i> Start Consultation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[calc(100dvh-5.5rem)] md:h-[88vh] flex flex-col bg-slate-950 rounded-2xl md:rounded-[2.5rem] p-2 sm:p-3 md:p-4 shadow-2xl border border-slate-800/80 ring-1 ring-white/5 overflow-hidden text-slate-100">
        
        {/* ── Top Bar / Consultation Header HUD ── */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:px-4 sm:py-3 mb-2 sm:mb-3 shrink-0 shadow-lg">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Patient Details & Live Call Status */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#6B46C1] to-[#E23E8C] text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-md shrink-0 ring-2 ring-white/10">
                {session.patient.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="font-black text-xs sm:text-sm text-white tracking-tight truncate max-w-[120px] sm:max-w-[200px]">{session.patient}</h2>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-700 shrink-0">{session.age || '28F'}</span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1.5 sm:gap-2 mt-0.5">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="hidden xs:inline">Live</span> HD
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-300 font-bold text-[10px] sm:text-xs">{fmt(elapsed)}</span>
                </p>
              </div>
            </div>

            {/* Quick Layout & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Draft Saved Pill */}
              {draftSavedAt && (
                <span className="hidden md:flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-fade-in">
                  <i className="fas fa-cloud-check text-[9px]"></i>
                  Saved
                </span>
              )}

              {/* Quick EMR Drawer Toggle */}
              <button
                onClick={() => setShowEmrDrawer(p => !p)}
                title="Open Quick EMR Drawer"
                className={`p-2 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shrink-0 ${
                  showEmrDrawer
                    ? 'bg-[#6B46C1] text-white border-[#6B46C1] shadow-md shadow-purple-500/30'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-purple-500/50 hover:text-white'
                }`}
              >
                <i className="fas fa-notes-medical"></i>
                <span className="hidden sm:inline">EMR</span>
              </button>

              {/* View Layout Controls (Desktop only) */}
              <div className="hidden lg:flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-xs">
                <button
                  onClick={() => setViewLayout('split')}
                  title="Split Studio View"
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${viewLayout === 'split' ? 'bg-[#6B46C1] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <i className="fas fa-columns"></i> Split
                </button>
                <button
                  onClick={() => setViewLayout('video-focus')}
                  title="Focus on Patient Video"
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${viewLayout === 'video-focus' ? 'bg-[#6B46C1] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <i className="fas fa-video"></i> Video
                </button>
                <button
                  onClick={() => setViewLayout('pad-focus')}
                  title="Focus on Prescription Pad"
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${viewLayout === 'pad-focus' ? 'bg-[#6B46C1] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <i className="fas fa-file-prescription"></i> Pad
                </button>
              </div>

              {/* Review & Finalize Button */}
              <button
                onClick={() => setShowSignModal(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all shrink-0"
              >
                <i className="fas fa-file-signature text-xs"></i>
                <span className="hidden xs:inline">Review & Sign</span>
                <span className="xs:hidden">Sign</span>
                {(draftMeds.length > 0 || draftLabs.length > 0 || freehandRx) && (
                  <span className="bg-emerald-950/60 text-emerald-200 px-1.5 py-0.2 rounded-full text-[9px] font-black">
                    {freehandRx ? '🖊️' : `${draftMeds.length + draftLabs.length}`}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sub-row for Badges on mobile & desktop */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-800/80">
            {/* ⚠️ Dynamic Patient Allergy Alert Badge */}
            {patientRecord?.allergies?.length > 0 ? (
              <span className="inline-flex items-center gap-1 bg-rose-500/20 border border-rose-500/50 text-rose-300 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black animate-pulse">
                <i className="fas fa-triangle-exclamation text-rose-400 text-[8px]"></i>
                <span className="truncate max-w-[180px]">Allergy: {patientRecord.allergies.join(', ')}</span>
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <i className="fas fa-shield-check text-[8px]"></i> No Allergies
              </span>
            )}

            <span className="text-[9px] sm:text-[10px] font-black text-[#F98BD2] bg-[#E23E8C]/15 px-2 py-0.5 rounded-full border border-[#E23E8C]/30 flex items-center gap-1 truncate max-w-[160px] sm:max-w-none">
              <i className="fas fa-notes-medical text-[8px]"></i> {diagnosis}
            </span>
          </div>
        </div>

        {/* ── Main Workspace Body ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden relative">

          {/* ── Quick EMR Drawer (Slide-in from right) ── */}
          {showEmrDrawer && (
            <div className="absolute inset-y-0 right-0 w-full max-w-[320px] sm:w-80 bg-slate-900/98 backdrop-blur-2xl border-l border-slate-700/80 z-50 flex flex-col shadow-2xl shadow-black/40 rounded-l-3xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <i className="fas fa-notes-medical text-[#A78BFA]"></i> Quick EMR
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{session.patient}</p>
                </div>
                <button
                  onClick={() => setShowEmrDrawer(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-all"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                {/* Allergies */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                    <i className="fas fa-triangle-exclamation text-rose-400"></i> Known Allergies
                  </p>
                  {patientRecord?.allergies?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patientRecord.allergies.map((a, i) => (
                        <span key={i} className="text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2.5 py-1 rounded-full">{a}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                      <i className="fas fa-shield-check text-[10px]"></i> No documented allergies
                    </span>
                  )}
                </div>

                {/* Vitals */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                    <i className="fas fa-heart-pulse text-pink-400"></i> Latest Vitals
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'BP', value: patientRecord?.bp || '—', icon: 'fa-gauge', color: 'text-blue-400' },
                      { label: 'BMI', value: patientRecord?.bmi || '—', icon: 'fa-weight-scale', color: 'text-purple-400' },
                      { label: 'Blood Sugar', value: patientRecord?.bloodSugar || '—', icon: 'fa-droplet', color: 'text-amber-400' },
                      { label: 'Weight', value: patientRecord?.weight || '—', icon: 'fa-person', color: 'text-teal-400' },
                    ].map(v => (
                      <div key={v.label} className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${v.color} flex items-center gap-1 mb-0.5`}>
                          <i className={`fas ${v.icon} text-[8px]`}></i> {v.label}
                        </p>
                        <p className="text-sm font-black text-white">{v.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Past Lab Reports */}
                {patientRecord?.reports?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <i className="fas fa-flask text-teal-400"></i> Recent Lab Results
                    </p>
                    <div className="space-y-2">
                      {patientRecord.reports.map((r, i) => (
                        <div key={i} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <p className="text-[11px] font-black text-white line-clamp-1">{r.testName}</p>
                            <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">{r.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{r.results}</p>
                          <p className="text-[10px] text-slate-600 font-medium mt-1">{r.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Medications */}
                {patientRecord?.meds?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <i className="fas fa-pills text-[#E23E8C]"></i> Active Medications
                    </p>
                    <div className="space-y-1.5">
                      {patientRecord.meds.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-700/40">
                          <span className="text-[11px] font-bold text-white">{m.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{m.dosage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Notes Preview */}
                {clinicalNotes && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                      <i className="fas fa-file-medical text-amber-400"></i> Current Session Notes
                    </p>
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                      <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line line-clamp-6">{clinicalNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          
          {/* ── Left Column: Video Call Stage ── */}
          <div className={`${viewLayout === 'video-focus' ? 'lg:col-span-8' : viewLayout === 'pad-focus' ? 'lg:col-span-4' : 'lg:col-span-5 xl:col-span-6'} flex flex-col min-h-0 relative transition-all duration-300`}>
            <div ref={videoAreaRef} className="relative flex-1 bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
              {call.remoteStream ? (
                <VideoTile stream={call.remoteStream} className="absolute inset-0 object-cover w-full h-full" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
                  <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-4xl font-black text-slate-300 mb-4 shadow-inner">
                    {session.patient.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="font-serif-brand font-black text-xl text-white tracking-tight">{session.patient}</h3>
                  <p className="text-slate-400 text-xs mt-2 flex items-center gap-2">
                    {call.connectionState !== 'failed' && call.connectionState !== 'peer-left' && call.connectionState !== 'ended' && (
                      <i className="fas fa-circle-notch fa-spin text-[#A78BFA]"></i>
                    )}
                    {STATUS_COPY[call.connectionState] || 'Connecting Encrypted Stream...'}
                  </p>
                </div>
              )}

              {/* Fullscreen & Quality HUD */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                {fullscreenSupported && (
                  <button
                    onClick={toggleFullscreen}
                    className="w-9 h-9 rounded-xl bg-black/50 backdrop-blur-md text-white border border-white/10 hover:bg-black/80 flex items-center justify-center text-xs transition-all"
                  >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                  </button>
                )}
              </div>

              {/* Self Doctor PiP (Picture in Picture) */}
              <div className="absolute bottom-20 right-4 w-32 h-44 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl z-20 hover:scale-105 transition-transform origin-bottom-right">
                {call.isVideoOff || !call.localStream ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 text-xs font-bold gap-1">
                    <i className="fas fa-video-slash text-base"></i>
                    <span>Camera Off</span>
                  </div>
                ) : (
                  <VideoTile stream={call.localStream} muted mirrored={!call.isScreenSharing} className="object-cover w-full h-full" />
                )}
              </div>

              {/* Floating In-Call Control Toolbar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-full border border-slate-700 shadow-2xl z-30">
                <button
                  onClick={call.toggleMute}
                  disabled={!call.localStream}
                  title={call.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${call.isMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}
                >
                  <i className={`fas ${call.isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                </button>

                <button
                  onClick={call.toggleVideo}
                  disabled={!call.localStream}
                  title={call.isVideoOff ? 'Turn on video' : 'Turn off video'}
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${call.isVideoOff ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}
                >
                  <i className={`fas ${call.isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
                </button>

                <button
                  onClick={call.toggleScreenShare}
                  disabled={call.connectionState !== 'connected'}
                  title="Share Screen"
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${call.isScreenSharing ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}
                >
                  <i className="fas fa-desktop"></i>
                </button>

                {/* Mobile Drawer Trigger for Telemed Rx/Pad */}
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setMobileDrawerOpen(prev => !prev);
                  }}
                  title={mobileDrawerOpen ? 'Minimize Prescription Drawer' : 'Open Mobile Prescription Drawer'}
                  className={`lg:hidden w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${
                    mobileDrawerOpen
                      ? 'bg-gradient-to-r from-magenta-500 to-aubergine-600 text-white shadow-lg ring-2 ring-white/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <i className="fas fa-file-prescription"></i>
                  {(draftMeds.length > 0 || draftLabs.length > 0) && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-slate-900">
                      {draftMeds.length + draftLabs.length}
                    </span>
                  )}
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1"></div>

                <button
                  onClick={() => setShowSignModal(true)}
                  title="End Call & Send Prescription"
                  className="w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-base transition-all shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95"
                >
                  <i className="fas fa-phone-slash"></i>
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Column: Creative Medical Workspace & Prescription Pad (Desktop Grid + Mobile Bottom Sheet) ── */}
          <div className={`
            ${viewLayout === 'video-focus' ? 'lg:col-span-4' : viewLayout === 'pad-focus' ? 'lg:col-span-8' : 'lg:col-span-7 xl:col-span-6'}
            flex flex-col min-h-0 bg-slate-900/95 lg:bg-slate-900/60 backdrop-blur-xl rounded-t-[2.5rem] lg:rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden transition-transform duration-300 ease-out will-change-transform transform-gpu
            fixed lg:relative inset-x-0 bottom-0 z-40 lg:z-auto h-[82vh] h-[82dvh] lg:h-auto
            ${mobileDrawerOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full lg:translate-y-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}
          `}>
            
            {/* Mobile Sheet Handle Bar */}
            <div className="lg:hidden w-full pt-3 pb-2 flex flex-col items-center justify-center bg-slate-950/80 cursor-pointer border-b border-slate-800/80" onClick={() => setMobileDrawerOpen(false)}>
              <div className="w-12 h-1.5 rounded-full bg-slate-700"></div>
              <div className="flex items-center justify-between w-full px-5 mt-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <i className="fas fa-stethoscope text-aubergine-400"></i> Clinical Workspace ({session.patient})
                </span>
                <button onClick={() => setMobileDrawerOpen(false)} className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-lg bg-slate-800">
                  <i className="fas fa-chevron-down mr-1"></i> Dock
                </button>
              </div>
            </div>
            
            {/* 1-Click Smart Protocols Ribbon */}
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#A78BFA] flex items-center gap-1.5 shrink-0 pl-1">
                <i className="fas fa-bolt text-amber-400"></i> Smart Packs:
              </span>
              {CLINICAL_PROTOCOLS.map(proto => (
                <button
                  key={proto.id}
                  onClick={() => handleApplyProtocol(proto)}
                  title={proto.desc}
                  className="bg-slate-800 hover:bg-[#6B46C1]/30 hover:border-[#A78BFA]/50 border border-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  <span>{proto.name}</span>
                </button>
              ))}
            </div>

            {/* Workspace Navigation Tabs */}
            <div className="px-4 pt-3 bg-slate-900/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              <button
                onClick={() => setActiveTab('smart_rx')}
                className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === 'smart_rx' ? 'border-[#E23E8C] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-pills text-[#E23E8C]"></i>
                <span>Smart Rx</span>
                {draftMeds.length > 0 && <span className="bg-[#E23E8C]/20 text-[#F98BD2] text-[10px] px-1.5 py-0.5 rounded-full font-black">{draftMeds.length}</span>}
              </button>

              <button
                onClick={() => setActiveTab('pen_pad')}
                className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === 'pen_pad' ? 'border-[#A78BFA] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-pen-nib text-[#A78BFA]"></i>
                <span>Pen & Pad</span>
                {freehandRx && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
              </button>

              <button
                onClick={() => setActiveTab('labs')}
                className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === 'labs' ? 'border-[#A78BFA] text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-flask text-[#A78BFA]"></i>
                <span>Lab Requests</span>
                {draftLabs.length > 0 && <span className="bg-aubergine-500/30 text-aubergine-200 text-[10px] px-1.5 py-0.5 rounded-full font-black">{draftLabs.length}</span>}
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === 'notes' ? 'border-amber-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-clipboard-user text-amber-400"></i>
                <span>Notes & Follow-up</span>
              </button>

              <button
                onClick={() => setActiveTab('patient_chart')}
                className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 ${activeTab === 'patient_chart' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <i className="fas fa-folder-medical text-emerald-400"></i>
                <span>Patient Chart</span>
              </button>
            </div>

            {/* ── Scrollable Tab Content ── */}
            <div className="flex-1 p-4 md:p-5 overflow-y-auto custom-scrollbar min-h-0 space-y-5">
              
              {/* ─── TAB 1: Smart Rx Builder ─── */}
              {activeTab === 'smart_rx' && (
                <div className="space-y-5 animate-fade-in">
                  {/* Medicine Input Console */}
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 shadow-inner space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-magnifying-glass text-[#A78BFA]"></i> Search / Enter Medicine
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewMedForm(prev => ({ ...prev, name: medSearch }));
                          setShowAddMedModal(true);
                        }}
                        className="text-[10px] font-bold text-[#A78BFA] hover:text-[#C4B5FD] flex items-center gap-1 bg-[#6B46C1]/20 hover:bg-[#6B46C1]/30 border border-[#6B46C1]/40 px-2 py-1 rounded-lg transition-colors"
                      >
                        <i className="fas fa-plus text-[9px]"></i> Add to Catalog
                      </button>
                    </div>

                    {/* Auto-suggest search box */}
                    <div className="relative">
                      <input
                        type="text"
                        value={medSearch}
                        onChange={(e) => {
                          setMedSearch(e.target.value);
                          setIsMedDropdownOpen(true);
                        }}
                        onFocus={() => setIsMedDropdownOpen(true)}
                        placeholder="e.g. Metformin, Myo-Inositol, Norethisterone..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[#6B46C1] focus:ring-2 focus:ring-[#6B46C1]/30 transition-all"
                      />
                      {medSearch && (
                        <button onClick={() => setMedSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-white">
                          <i className="fas fa-xmark text-xs"></i>
                        </button>
                      )}

                      {/* Dropdown Suggestions */}
                      {isMedDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-h-64 overflow-y-auto custom-scrollbar z-50 p-1.5 space-y-0.5">
                          <div className="flex items-center justify-between px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                            <span>Matches ({filterAndRankCatalog(medCatalog, medSearch).length})</span>
                            <span className="text-[9px] text-[#A78BFA] font-bold">Prefix &amp; Keyword Match</span>
                          </div>
                          {filterAndRankCatalog(medCatalog, medSearch).slice(0, 30).map((item) => (
                            <button
                              key={item.id || item.name}
                              type="button"
                              onClick={() => handleSelectSuggestion(item)}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-between transition-colors group"
                            >
                              <span className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                {item.isCustom && <span className="text-[9px] bg-purple-900/60 text-purple-300 border border-purple-700/60 px-1.5 py-0.2 rounded font-black shrink-0">Custom</span>}
                                <span className="truncate">
                                  {medSearch && item.name.toLowerCase().startsWith(medSearch.trim().toLowerCase()) ? (
                                    <>
                                      <span className="text-[#F98BD2] bg-[#E23E8C]/20 px-0.5 rounded font-black">{item.name.slice(0, medSearch.trim().length)}</span>
                                      <span>{item.name.slice(medSearch.trim().length)}</span>
                                    </>
                                  ) : (
                                    item.name
                                  )}
                                </span>
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {item.category && (
                                  <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 hidden sm:inline-block">
                                    {item.category}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-[#A78BFA] bg-[#6B46C1]/20 px-2 py-0.5 rounded-md">
                                  {item.defaultDose} • {item.defaultFreq}
                                </span>
                              </div>
                            </button>
                          ))}
                          {medSearch && !medCatalog.some(m => m.name.toLowerCase() === medSearch.toLowerCase()) && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewMedForm(prev => ({ ...prev, name: medSearch }));
                                setShowAddMedModal(true);
                                setIsMedDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-xs font-bold text-purple-200 hover:text-white flex items-center justify-between transition-colors mt-1 shadow-xs"
                            >
                              <span className="flex items-center gap-1.5">
                                <i className="fas fa-plus-circle text-purple-400"></i>
                                <span>Add &ldquo;{medSearch}&rdquo; to Catalog</span>
                              </span>
                              <span className="text-[10px] font-mono text-purple-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-purple-800">Save Preset</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dosage & Frequency Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Dosage</label>
                        <input
                          type="text"
                          value={medDosage}
                          onChange={(e) => setMedDosage(e.target.value)}
                          placeholder="e.g. 500mg"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6B46C1]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Schedule</label>
                        <select
                          value={medFrequency}
                          onChange={(e) => setMedFrequency(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6B46C1]"
                        >
                          <option value="1-0-1">1-0-1 (Morning & Night)</option>
                          <option value="1-0-0">1-0-0 (Morning Only)</option>
                          <option value="0-0-1">0-0-1 (Night Bedtime)</option>
                          <option value="1-1-1">1-1-1 (Thrice Daily)</option>
                          <option value="SOS">SOS (When Needed)</option>
                          <option value="Once Weekly">Once Weekly</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Timing</label>
                        <select
                          value={medTiming}
                          onChange={(e) => setMedTiming(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6B46C1]"
                        >
                          <option value="After Food">After Food</option>
                          <option value="Before Food">Before Food</option>
                          <option value="Empty Stomach">Empty Stomach</option>
                          <option value="With Water">With Water</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Duration</label>
                        <input
                          type="text"
                          value={medDuration}
                          onChange={(e) => setMedDuration(e.target.value)}
                          placeholder="30 Days"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#6B46C1]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMed}
                      className="w-full bg-[#6B46C1] hover:bg-[#522F9E] text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all hover:shadow-lg"
                    >
                      <i className="fas fa-plus"></i> Add to Prescription
                    </button>
                  </div>

                  {/* Drafted Medications List */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fas fa-prescription-bottle-medical text-emerald-400"></i> Prescribed Medicines ({draftMeds.length})
                      </p>
                      <div className="flex items-center gap-2">
                        {draftMeds.length > 0 && (
                          <AIButton
                            onClick={handleAiDrugSafetyCheck}
                            loading={isCheckingSafety}
                            loadingText="Checking Interactions..."
                            variant="safety"
                            icon="fa-shield-halved"
                            size="sm"
                          >
                            AI Drug Safety Check
                          </AIButton>
                        )}
                        {draftMeds.length > 0 && (
                          <button onClick={() => setDraftMeds([])} className="text-[10px] font-bold text-rose-400 hover:text-rose-300">
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {draftMeds.length === 0 ? (
                      <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500">
                        <i className="fas fa-pills text-3xl text-slate-700 mb-2"></i>
                        <p className="text-xs font-bold">No medications added yet</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Use the search box above or click a 1-click pack</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {draftMeds.map((med, idx) => (
                          <div
                            key={med.id || idx}
                            className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md group transition-all"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-serif-brand font-black text-slate-200 text-sm tracking-tight">{med.name}</span>
                                {med.dosage && (
                                  <span className="text-[10px] font-black text-[#F98BD2] bg-[#E23E8C]/15 px-2 py-0.5 rounded-md border border-[#E23E8C]/30">
                                    {med.dosage}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-2 flex-wrap">
                                <span className="text-emerald-400 font-mono font-bold">{med.frequency}</span>
                                <span>•</span>
                                <span>{med.timing}</span>
                                <span>•</span>
                                <span className="text-slate-300 font-bold">{med.duration}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveMed(idx)}
                              className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                            >
                              <i className="fas fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 2: Tablet Stylus Pen & Pad Mode ─── */}
              {activeTab === 'pen_pad' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-serif-brand font-black text-white text-sm tracking-tight flex items-center gap-2">
                        <i className="fas fa-pen-fancy text-[#A78BFA]"></i> Tablet Stylus & Prescription Pad
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">Write directly with tablet pen — your handwriting will be captured on the official prescription.</p>
                    </div>

                    {/* Mode Toggle: Stylus Canvas vs Keyboard Text */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setPadInputMode('stylus')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${padInputMode === 'stylus' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                      >
                        <i className="fas fa-pen-nib"></i> Stylus Ink
                      </button>
                      <button
                        type="button"
                        onClick={() => setPadInputMode('typed')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${padInputMode === 'typed' ? 'bg-[#6B46C1] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                      >
                        <i className="fas fa-keyboard"></i> Keyboard
                      </button>
                    </div>
                  </div>

                  {/* Handwriting Canvas or Typed Pad */}
                  {padInputMode === 'stylus' ? (
                    <StylusHandwritingCanvas
                      strokes={handwritingStrokes}
                      setStrokes={setHandwritingStrokes}
                      onExport={(dataUrl) => {
                        setFreehandRx(dataUrl || '');
                      }}
                    />
                  ) : (
                    <div className="bg-[#FAF8F5] text-slate-900 rounded-3xl p-5 border border-[#E6E1D8] shadow-2xl relative overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-[10px] font-bold">
                        <span className="text-slate-500 uppercase">Quick Stamps:</span>
                        <button
                          onClick={() => setTypedPadText(p => (p ? `${p}\n• Sig: 1 tab PO BD pc for 30 days` : '• Sig: 1 tab PO BD pc for 30 days'))}
                          className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2 py-1 rounded-md"
                        >
                          + 1 tab BD pc
                        </button>
                        <button
                          onClick={() => setTypedPadText(p => (p ? `${p}\n• Take on empty stomach with water` : '• Take on empty stomach with water'))}
                          className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2 py-1 rounded-md"
                        >
                          + Empty Stomach
                        </button>
                        <button
                          onClick={() => setTypedPadText(p => (p ? `${p}\n• Review in clinic/teleconsult in 2 weeks` : '• Review in clinic/teleconsult in 2 weeks'))}
                          className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-2 py-1 rounded-md"
                        >
                          + Review in 2 wks
                        </button>
                      </div>

                      <textarea
                        rows={10}
                        value={typedPadText}
                        onChange={(e) => setTypedPadText(e.target.value)}
                        placeholder="Write freely as on a medical pad... (e.g. 1. Tab Metformin 500mg - 1 BD x 1 month&#10;2. Sachet Inositol 2g - 1 OD morning&#10;Advice: Hydration 3L, avoid refined sugars)"
                        className="w-full bg-transparent border-0 focus:ring-0 p-2 text-sm text-slate-800 font-serif leading-relaxed placeholder:text-slate-400 resize-none focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 3: Lab Requisitions ─── */}
              {activeTab === 'labs' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
                    {['All', 'Hormonal & Ovarian Reserve', 'Thyroid, Endocrine & Autoimmune', 'Metabolic & Cardiovascular', 'Hematology, Anemia & Micronutrients', 'Infections & STI Screening', 'Cervical Screening & Cytology', 'Antenatal & Genetic Diagnostics', 'Ultrasound & Imaging Procedures'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedLabCat(cat)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${selectedLabCat === cat ? 'bg-aubergine-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Smart Searchable Lab Dropdown & Quick Add Bar */}
                  <div className="relative">
                    <form onSubmit={handleAddCustomLab} className="flex gap-2">
                      <div className="relative flex-1">
                        <i className="fas fa-microscope absolute left-3.5 top-3 text-aubergine-400 text-xs"></i>
                        <input
                          type="text"
                          value={customLabInput}
                          onChange={(e) => {
                            setCustomLabInput(e.target.value);
                            setIsLabDropdownOpen(true);
                          }}
                          onFocus={() => setIsLabDropdownOpen(true)}
                          placeholder="Search or enter lab test (e.g. AMH, LH, TVS Scan, Thyroid)..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-aubergine-400"
                        />
                        {customLabInput && (
                          <button
                            type="button"
                            onClick={() => setCustomLabInput('')}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                          >
                            <i className="fas fa-xmark text-xs"></i>
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!customLabInput.trim()}
                        className="bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0"
                      >
                        <i className="fas fa-plus mr-1"></i> Add
                      </button>
                    </form>

                    {/* Smart Lab Search Dropdown */}
                    {isLabDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-h-64 overflow-y-auto custom-scrollbar z-50 p-1.5 space-y-0.5">
                        <div className="flex items-center justify-between px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                          <span>Diagnostic Tests ({filterAndRankCatalog(labCatalog, customLabInput).length})</span>
                          <span className="text-[9px] text-aubergine-400 font-bold">Prefix &amp; Keyword Match</span>
                        </div>
                        {filterAndRankCatalog(labCatalog.filter(l => selectedLabCat === 'All' || l.category === selectedLabCat), customLabInput).slice(0, 30).map((item) => {
                          const isSelected = draftLabs.includes(item.name);
                          return (
                            <button
                              key={item.id || item.name}
                              type="button"
                              onClick={() => {
                                toggleLab(item.name);
                                setIsLabDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors group ${isSelected ? 'bg-aubergine-500/20 text-aubergine-200 border border-aubergine-500/40' : 'hover:bg-slate-800 text-slate-200 hover:text-white'}`}
                            >
                              <span className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                                <span className="text-[10px] shrink-0 font-bold">{item.badge}</span>
                                <span className="truncate">
                                  {customLabInput && item.name.toLowerCase().startsWith(customLabInput.trim().toLowerCase()) ? (
                                    <>
                                      <span className="text-aubergine-300 bg-aubergine-500/30 px-0.5 rounded font-black">{item.name.slice(0, customLabInput.trim().length)}</span>
                                      <span>{item.name.slice(customLabInput.trim().length)}</span>
                                    </>
                                  ) : (
                                    item.name
                                  )}
                                </span>
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.category && (
                                  <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 hidden sm:inline-block">
                                    {item.category}
                                  </span>
                                )}
                                <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${isSelected ? 'bg-aubergine-600 text-white' : 'border border-slate-600 text-transparent'}`}>
                                  <i className="fas fa-check"></i>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {customLabInput && !labCatalog.some(l => l.name.toLowerCase() === customLabInput.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              handleAddCustomLab(e);
                              setIsLabDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl bg-[#2A1647]/80 hover:bg-[#3A1C78] border border-[#6B46C1]/50 text-xs font-bold text-aubergine-200 hover:text-white flex items-center justify-between transition-colors mt-1 shadow-xs"
                          >
                            <span className="flex items-center gap-1.5">
                              <i className="fas fa-plus-circle text-aubergine-400"></i>
                              <span>Add &ldquo;{customLabInput}&rdquo; to Lab Catalog</span>
                            </span>
                            <span className="text-[10px] font-mono text-aubergine-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-aubergine-800">Save Custom Test</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive Lab Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {labCatalog.filter(l => selectedLabCat === 'All' || l.category === selectedLabCat).map(item => {
                      const isSelected = draftLabs.includes(item.name);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleLab(item.name)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start justify-between gap-2.5 ${isSelected ? 'bg-aubergine-500/20 border-aubergine-400/80 text-white shadow-lg shadow-aubergine-500/10 ring-1 ring-aubergine-400/50' : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'}`}
                        >
                          <div>
                            <span className="text-[10px] font-black text-aubergine-400 uppercase tracking-widest">{item.badge}</span>
                            <h5 className="font-bold text-xs mt-0.5 leading-snug">{item.name}</h5>
                          </div>
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-aubergine-600 text-white' : 'bg-slate-800 text-transparent'}`}>
                            <i className="fas fa-check"></i>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Labs Summary */}
                  {draftLabs.length > 0 && (
                    <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-2">
                      <p className="text-[11px] font-black text-aubergine-400 uppercase tracking-wider">
                        Requested Investigations ({draftLabs.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {draftLabs.map(lab => (
                          <span
                            key={lab}
                            className="inline-flex items-center gap-2 bg-[#2A1647]/70 text-aubergine-200 border border-[#6B46C1]/50 px-3 py-1 rounded-xl text-xs font-bold"
                          >
                            <span>{lab}</span>
                            <button onClick={() => toggleLab(lab)} className="hover:text-rose-400">
                              <i className="fas fa-xmark text-[10px]"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 4: Clinical Notes & 1-Tap Follow-Up Scheduler ─── */}
              {activeTab === 'notes' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-microphone-lines text-amber-400"></i> SOAP Clinical Notes
                      </label>
                      <AIButton
                        onClick={handleAiLiveSoapScribe}
                        loading={isDictating}
                        loadingText="Listening & Scribing..."
                        variant="voice"
                        icon={isDictating ? "fa-microphone text-rose-400 animate-pulse" : "fa-wand-magic-sparkles"}
                        size="sm"
                      >
                        AI Live SOAP Scribe
                      </AIButton>
                    </div>

                    <textarea
                      rows={5}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Type patient history, examination findings, diagnosis, dietary advice..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 resize-none leading-relaxed"
                    />

                    {/* Quick Symptom Tag Inserts */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">Add Note Chip:</span>
                      {['Regular cycle', 'Mild hirsutism', 'Dysmenorrhea', 'Normal BMI', 'Advised low GI diet'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => setClinicalNotes(p => (p ? `${p}, ${tag}` : tag))}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diet & Nutrition Plan Box */}
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-seedling text-emerald-400"></i> Diet & Nutrition Plan
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={dietPlan}
                      onChange={(e) => setDietPlan(e.target.value)}
                      placeholder="e.g. Low glycemic index whole foods, 25-30g protein per main meal, 30g+ dietary fibre daily, anti-inflammatory Mediterranean principles..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/50 resize-none leading-relaxed"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">Quick Add:</span>
                      {['Personalized Low-GI Plate', 'Protein Balance (20-30g/meal)', 'Fiber & Prebiotics (30g+/day)', 'Plant Polyphenols & Omega-3', 'Regular Meal Timing & Hydration', 'Sustainable Cultural Customization'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => setDietPlan(p => (p ? `${p}, ${tag}` : tag))}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Yoga & Mindful Movement Protocol Box */}
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-om text-amber-400"></i> Yoga &amp; Mindful Movement Protocol
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={exercisePlan}
                      onChange={(e) => setExercisePlan(e.target.value)}
                      placeholder="e.g. 150m moderate movement weekly, gentle yoga, diaphragmatic breathing, pelvic mobility, strength training 2x/wk..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 resize-none leading-relaxed"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] uppercase">Quick Add:</span>
                      {['Beginner Movement (Walking/Steps)', 'Gentle Yoga & Asanas', 'Flexibility & Pelvic Mobility', 'Relaxation & Restorative', 'Breathing & Mindfulness (Pranayama)', 'Strength & Resistance (2-3x/wk)'].map(tag => (
                        <button
                          key={tag}
                          onClick={() => setExercisePlan(p => (p ? `${p}, ${tag}` : tag))}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 📅 1-Tap Follow-Up Recommendation Box */}
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-calendar-check"></i> Recommended Next Follow-Up
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Auto-adds to patient prescription & portal</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: '+ 1 Week (Acute)', text: 'Review in 1 week' },
                        { label: '+ 2 Weeks (Titration)', text: 'Review in 2 weeks with symptom log' },
                        { label: '+ 1 Month (Cycle check)', text: 'Review in 1 month' },
                        { label: '+ 6 Weeks (PCOS titration)', text: 'Review in 6 weeks with repeat fasting insulin' },
                        { label: '+ Post Lab Reports', text: 'Review immediately upon lab test completion' },
                      ].map(chip => (
                        <button
                          key={chip.label}
                          onClick={() => {
                            setFollowUpAdvice(chip.text);
                            toast(`Follow-up set: ${chip.text}`, 'success');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${followUpAdvice === chip.text ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={followUpAdvice}
                      onChange={(e) => setFollowUpAdvice(e.target.value)}
                      placeholder="Custom follow-up timeline (e.g. Review in 10 days with CBC)..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              )}

              {/* ─── TAB 5: In-Call Patient Chart & History Drawer ─── */}
              {activeTab === 'patient_chart' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Vitals Summary Strip */}
                  <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-heart-pulse"></i> Patient Recorded Vitals & Metrics
                      </h5>
                      <AIButton
                        onClick={handleGenerateChartSummary}
                        loading={isSummarizingChart}
                        loadingText="Synthesizing Summary..."
                        variant="glass"
                        icon="fa-sparkles"
                        size="sm"
                      >
                        AI 1-Min Summary
                      </AIButton>
                    </div>

                    {chartSummary && (
                      <div className="mb-3 p-3 bg-purple-950/40 border border-purple-800/80 rounded-xl text-xs text-purple-200 leading-relaxed space-y-1">
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider block">✨ AI Longitudinal Chart Synthesis:</span>
                        <div className="whitespace-pre-line text-[11px] text-slate-200">{chartSummary}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Blood Pressure</span>
                        <span className="font-mono font-bold text-white text-sm">{patientRecord?.bp || '118/76 mmHg'}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Weight / BMI</span>
                        <span className="font-mono font-bold text-white text-sm">{patientRecord?.weight || '58 kg'} ({patientRecord?.bmi || '22.4'})</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Fasting Blood Sugar</span>
                        <span className="font-mono font-bold text-white text-sm">{patientRecord?.bloodSugar || '92 mg/dL'}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Documented Allergies</span>
                        <span className="font-bold text-rose-400 text-xs truncate block">{patientRecord?.allergies?.join(', ') || 'None reported'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 🩺 Complete Medical, Gynecological & Family History */}
                  <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <h5 className="text-[11px] font-black text-[#A78BFA] uppercase tracking-wider flex items-center gap-2">
                      <i className="fas fa-file-waveform"></i> Medical & Gynecological History
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Chronic Conditions */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Chronic Conditions / Diagnosis</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(patientRecord?.medicalHistory?.chronicConditions?.length ? patientRecord.medicalHistory.chronicConditions : ['PCOS Phenotype B (Oligo-ovulatory)', 'Mild Insulin Resistance']).map((cond, i) => (
                            <span key={i} className="bg-purple-950/60 text-purple-200 border border-purple-800/80 px-2.5 py-0.5 rounded-lg text-[11px] font-bold">
                              {cond}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Menstrual & Cycle Profile */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Gynecological & Menstrual Cycle</span>
                        <p className="text-slate-300 text-xs font-medium">
                          <span className="text-slate-400">Cycle Length:</span> 38–45 Days (Irregular) • <span className="text-slate-400">Flow:</span> Heavy with dysmenorrhea (Day 1-2) • <span className="text-slate-400">LMP:</span> 14 Days Ago
                        </p>
                      </div>

                      {/* Surgeries & Procedures */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Past Surgeries & Procedures</span>
                        <p className="text-slate-300 text-xs font-medium">
                          {patientRecord?.medicalHistory?.surgeries?.length ? patientRecord.medicalHistory.surgeries.join(', ') : 'Diagnostic Pelvic Laparoscopy (2023 - Uncomplicated)'}
                        </p>
                      </div>

                      {/* Family History */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Family Medical History</span>
                        <p className="text-slate-300 text-xs font-medium">
                          {patientRecord?.medicalHistory?.familyHistory?.length ? patientRecord.medicalHistory.familyHistory.join(', ') : 'Maternal Type 2 Diabetes • Hypothyroidism (Mother)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 💊 Past Prescriptions & Old Rx (With 1-Click Repeat/Import) */}
                  <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-prescription-bottle-medical"></i> Past Prescriptions & Old Rx History
                      </h5>
                      <span className="text-[10px] text-slate-500 font-bold">1-Click Import into current consult</span>
                    </div>

                    {/* Mock/Recorded Old Prescriptions List */}
                    <div className="space-y-3">
                      {[
                        {
                          id: 'rx-old-1',
                          date: '15 Jan 2026 (1 Month Ago)',
                          doctor: 'Dr. Ananya Sharma',
                          diagnosis: 'PCOS & Cycle Regulation',
                          meds: [
                            { name: 'Metformin ER', dosage: '500mg', frequency: '1-0-1', timing: 'After Food', duration: '30 Days' },
                            { name: 'Myo-Inositol Sachet', dosage: '2g', frequency: '1-0-0', timing: 'Morning with water', duration: '30 Days' },
                            { name: 'Vitamin D3 60K', dosage: '60,000 IU', frequency: 'Once Weekly', timing: 'With milk', duration: '4 Weeks' },
                          ],
                          instructions: 'Avoid processed carbohydrates. 30 min daily brisk walk.',
                        },
                        {
                          id: 'rx-old-2',
                          date: '02 Nov 2025 (3 Months Ago)',
                          doctor: 'Dr. Rajesh Mehta',
                          diagnosis: 'Acute Dysmenorrhea',
                          meds: [
                            { name: 'Mefenamic Acid', dosage: '500mg', frequency: '1-1-1', timing: 'After Meals (SOS pain)', duration: '5 Days' },
                            { name: 'Tranexamic Acid', dosage: '500mg', frequency: '1-0-1', timing: 'During Heavy Flow', duration: '3 Days' },
                          ],
                          instructions: 'Take during active bleeding only. Warm compress for lower abdomen.',
                        }
                      ].map(oldRx => (
                        <div key={oldRx.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif-brand font-black text-white text-sm">{oldRx.diagnosis}</span>
                                <span className="text-[10px] font-mono text-[#A78BFA] bg-[#6B46C1]/20 px-2 py-0.5 rounded-md">{oldRx.date}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">Prescribed by {oldRx.doctor}</p>
                            </div>
                            
                            {/* ⚡ 1-Click Repeat / Import Button */}
                            <button
                              onClick={() => {
                                setDraftMeds(prev => [
                                  ...prev,
                                  ...oldRx.meds.map(m => ({
                                    id: Date.now() + Math.random(),
                                    ...m,
                                    rawText: `${m.name} ${m.dosage} (${m.frequency}) - ${m.timing} for ${m.duration}`,
                                  })),
                                ]);
                                toast(`Imported ${oldRx.meds.length} medicines from ${oldRx.date}!`, 'success');
                              }}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
                            >
                              <i className="fas fa-arrows-rotate text-[10px]"></i> Repeat / Import Rx
                            </button>
                          </div>

                          {/* Medicine Rows */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {oldRx.meds.map((m, idx) => (
                              <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-slate-200">{m.name}</span>
                                  <span className="text-[10px] text-[#F98BD2] ml-1.5 font-mono">{m.dosage}</span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{m.frequency} • {m.timing} ({m.duration})</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Previous Lab Reports & Scans */}
                  <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <h5 className="text-[11px] font-black text-aubergine-400 uppercase tracking-wider flex items-center gap-2">
                      <i className="fas fa-file-medical"></i> Previous Lab Reports & Scans
                    </h5>
                    
                    {patientRecord?.reports?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No previous lab reports on file.</p>
                    ) : (
                      <div className="space-y-2">
                        {patientRecord?.reports?.map(rep => (
                          <div
                            key={rep.id}
                            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-start justify-between gap-3 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{rep.testName}</span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{rep.date}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1">{rep.results || 'Normal range.'}</p>
                            </div>
                            <button
                              onClick={() => setPreviewReportModal(rep)}
                              className="bg-aubergine-500/20 hover:bg-aubergine-500/30 text-aubergine-300 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
                            >
                              <i className="fas fa-eye text-[10px]"></i> View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── In-Call Lab Report Preview Modal ─── */}
      {previewReportModal && (
        <Modal isOpen={!!previewReportModal} onClose={() => setPreviewReportModal(null)} title={previewReportModal.testName} size="md">
          <div className="space-y-4 p-2">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black block">Test Date</span>
                <span className="font-bold text-slate-800">{previewReportModal.date}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black block">Status</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">{previewReportModal.status || 'Verified'}</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-5 font-mono text-xs leading-relaxed">
              <p className="text-[10px] uppercase font-bold text-aubergine-400 mb-2">// CLINICAL INTERPRETATION</p>
              <p className="whitespace-pre-wrap">{previewReportModal.results || 'No detailed text available.'}</p>
            </div>

            <button
              onClick={() => setPreviewReportModal(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs transition-colors"
            >
              Close Viewer
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Add Custom Medicine to Catalog Modal ─── */}
      {showAddMedModal && (
        <Modal isOpen={showAddMedModal} onClose={() => setShowAddMedModal(false)} title="Add Medication to Catalog" size="md">
          <form onSubmit={handleSaveNewMed} className="space-y-4 p-2">
            <div className="bg-purple-50/80 border border-purple-200/80 text-purple-900 rounded-2xl p-3.5 text-xs">
              <div className="font-bold flex items-center gap-1.5 mb-0.5">
                <i className="fas fa-pills text-purple-600"></i> Smart Preset Customization
              </div>
              <p className="text-purple-700">Add your commonly prescribed medications here with default dosage and schedules for 1-click prescribing.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Medication Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dydrogesterone, Letrozole, Inositol Complex..."
                value={newMedForm.name}
                onChange={(e) => setNewMedForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={newMedForm.category}
                  onChange={(e) => setNewMedForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="Hormones">Hormones</option>
                  <option value="Supplements">Supplements &amp; Vitamins</option>
                  <option value="Metabolic">Metabolic / PCOS</option>
                  <option value="Fertility">Fertility / Ovulation</option>
                  <option value="Analgesics">Analgesics &amp; Pain</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Thyroid">Thyroid</option>
                  <option value="General">General Care</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Default Dosage</label>
                <input
                  type="text"
                  placeholder="e.g. 10mg, 500mg, 1 Tab"
                  value={newMedForm.defaultDose}
                  onChange={(e) => setNewMedForm(p => ({ ...p, defaultDose: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Frequency</label>
                <select
                  value={newMedForm.defaultFreq}
                  onChange={(e) => setNewMedForm(p => ({ ...p, defaultFreq: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="1-0-1">1-0-1 (BD)</option>
                  <option value="1-0-0">1-0-0 (OD Morning)</option>
                  <option value="0-0-1">0-0-1 (OD Night)</option>
                  <option value="1-1-1">1-1-1 (TDS)</option>
                  <option value="SOS">SOS (When Needed)</option>
                  <option value="Once Weekly">Once Weekly</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Timing</label>
                <select
                  value={newMedForm.defaultTiming}
                  onChange={(e) => setNewMedForm(p => ({ ...p, defaultTiming: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="After Food">After Food</option>
                  <option value="Before Food">Before Food</option>
                  <option value="Empty Stomach">Empty Stomach</option>
                  <option value="Bedtime">Bedtime</option>
                  <option value="With Milk">With Milk</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 30 Days"
                  value={newMedForm.defaultDuration}
                  onChange={(e) => setNewMedForm(p => ({ ...p, defaultDuration: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            {user?.profile?.role === 'admin' && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMedForm.isGlobal}
                  onChange={(e) => setNewMedForm(p => ({ ...p, isGlobal: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>Set as Global Medicine (Available for all doctors platform-wide)</span>
              </label>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMedModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCustomMed || !newMedForm.name.trim()}
                className="flex-1 bg-[#6B46C1] hover:bg-[#522F9E] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                {savingCustomMed ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Save to My Catalog
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Luxury Official Review & Digital Sign Modal ─── */}
      <Modal isOpen={showSignModal} onClose={() => setShowSignModal(false)} title="" size="lg" className="bg-transparent shadow-none border-none p-0">
        <div className="bg-[#FAF9F6] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-300/80 text-slate-800 relative max-h-[90vh] flex flex-col font-sans">
          
          {/* Modal Header */}
          <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6B46C1] to-[#E23E8C] flex items-center justify-center text-xl text-white shadow-lg ring-2 ring-white/10">
                <i className="fas fa-file-signature"></i>
              </div>
              <div>
                <h3 className="font-serif-brand font-black text-xl tracking-tight">Review & Sign Prescription</h3>
                <p className="text-xs text-slate-400 font-medium">Verify clinical orders before digital delivery</p>
              </div>
            </div>
            <button onClick={() => setShowSignModal(false)} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
              <i className="fas fa-xmark"></i>
            </button>
          </div>

          {/* Prescription Document Sheet */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
            {/* Letterhead */}
            <div className="border-b-2 border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h2 className="font-serif font-black text-3xl text-slate-900 tracking-tight">
                  Healnari<span className="text-[#E23E8C]">.</span>
                </h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Women's Specialized Telehealth Clinic</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-slate-900">{user?.name || 'Dr. Consultant Gynecologist'}</p>
                <p className="text-slate-500 text-[11px]">MBBS, MS (OB-GYN) • Reg #HN-88421</p>
                <p className="text-slate-400 font-mono text-[10px] mt-1">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Patient Meta Strip */}
            <div className="bg-slate-100/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Patient</span>
                <span className="font-black text-slate-800">{session.patient}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Age / Gender</span>
                <span className="font-bold text-slate-700">{session.age || '28F'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Consultation Type</span>
                <span className="font-bold text-[#6B46C1]">{diagnosis}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ref ID</span>
                <span className="font-mono font-bold text-slate-600">HN-TELE-{session.id?.slice(0, 6).toUpperCase()}</span>
              </div>
            </div>

            {/* Medications & Handwriting Section ℞ */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-serif font-black text-[#6B46C1]">℞</span>
                <h4 className="font-serif font-bold text-sm text-slate-900 uppercase tracking-wider">
                  {freehandRx && freehandRx.startsWith('data:image') ? "Doctor's Handwritten Prescription" : "Prescribed Medications"}
                </h4>
              </div>

              {/* Check if Doctor drew with Stylus on Handwriting Pad */}
              {freehandRx && freehandRx.startsWith('data:image') ? (
                <div className="bg-[#FAF8F5] border-2 border-slate-300 rounded-3xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 text-[#1D4ED8]">
                      <i className="fas fa-pen-nib"></i> Authentic Doctor Stylus Handwriting
                    </span>
                    <span>Date: {new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="bg-white rounded-2xl p-2 border border-slate-200 overflow-hidden flex items-center justify-center">
                    <img
                      src={freehandRx}
                      alt="Doctor Handwritten Prescription"
                      className="max-w-full h-auto object-contain max-h-[380px]"
                    />
                  </div>
                </div>
              ) : typedPadText.trim() ? (
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="font-serif text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{typedPadText}</p>
                </div>
              ) : draftMeds.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 whitespace-nowrap">#</th>
                        <th className="p-3 whitespace-nowrap">Medication & Dosage</th>
                        <th className="p-3 whitespace-nowrap">Frequency</th>
                        <th className="p-3 whitespace-nowrap">Instructions</th>
                        <th className="p-3 whitespace-nowrap">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {draftMeds.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-slate-400">{i + 1}</td>
                          <td className="p-3">
                            <span className="font-black text-slate-800">{m.name}</span>
                            {m.dosage && <span className="ml-2 font-bold text-[#6B46C1] bg-[#EDE7FF] px-2 py-0.5 rounded">{m.dosage}</span>}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{m.frequency || '1-0-1'}</td>
                          <td className="p-3 text-slate-600">{m.timing || 'After Food'}</td>
                          <td className="p-3 font-bold text-slate-700">{m.duration || '30 Days'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200">No medications prescribed in this session.</p>
              )}
            </div>

            {/* Requested Lab Investigations */}
            {draftLabs.length > 0 && (
              <div>
                <h4 className="font-serif font-bold text-sm text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-flask text-aubergine-700"></i> Requested Investigations
                </h4>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap gap-2">
                  {draftLabs.map((l, i) => (
                    <span key={i} className="bg-aubergine-50 text-aubergine-800 border border-aubergine-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <i className="fas fa-check text-aubergine-600 text-[10px]"></i> {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Advice & Follow-Up */}
            {(clinicalNotes || followUpAdvice) && (
              <div>
                <h4 className="font-serif font-bold text-sm text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-clipboard-check text-amber-600"></i> Advice & Follow-Up
                </h4>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                  {clinicalNotes && <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{clinicalNotes}</p>}
                  {followUpAdvice && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <i className="fas fa-calendar-day text-emerald-600"></i>
                      <span>Next Follow-up Review: {followUpAdvice}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Digital Signature Footer */}
            <div className="border-t-2 border-slate-200 pt-5 flex justify-between items-end">
              <div className="text-[10px] text-slate-500 max-w-xs space-y-1">
                <p className="font-black text-slate-700 uppercase tracking-wider">🔒 Digital Healthcare Verification</p>
                <p>This prescription is electronically generated and digitally signed as per Telemedicine Practice Guidelines.</p>
              </div>

              <div className="text-right">
                <div className="font-serif text-3xl font-bold text-[#2A1647] tracking-tight italic select-none">
                  {user?.name || 'Dr. Consultant'}
                </div>
                <div className="h-0.5 w-36 bg-[#6B46C1]/40 ml-auto my-1"></div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-end gap-1">
                  <i className="fas fa-badge-check"></i> Digitally Verified & Signed
                </p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-5 bg-slate-100 border-t border-slate-200 flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setShowSignModal(false)}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-3.5 px-5 rounded-2xl transition-all text-xs"
            >
              Keep Editing
            </button>

            {/* 🖨️ 1-Click Print / Download PDF */}
            <div className="flex gap-2">
              <button
                onClick={handlePrintPrescription}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-5 rounded-2xl transition-all text-xs flex items-center gap-2 shadow-sm"
              >
                <i className="fas fa-print"></i> Print Medical Rx
              </button>

              {(dietPlan || exercisePlan) && (
                <button
                  onClick={handlePrintLifestylePlan}
                  className="bg-emerald-900 hover:bg-emerald-800 text-white font-bold py-3.5 px-5 rounded-2xl transition-all text-xs flex items-center gap-2 shadow-sm"
                >
                  <i className="fas fa-leaf text-emerald-400"></i> Print Lifestyle Plan
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setShowSignModal(false);
                finalizeConsult();
              }}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black py-3.5 px-6 rounded-2xl transition-all shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm ml-auto"
            >
              <i className="fas fa-paper-plane"></i> Sign & Send to Patient Portal
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Drug Safety & Interaction Modal */}
      {safetyModal && (
        <Modal
          isOpen={Boolean(safetyModal)}
          onClose={() => setSafetyModal(null)}
          title="AI Clinical Drug Safety & Interaction Analysis"
          size="md"
        >
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${safetyModal.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${safetyModal.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                <i className={`fas ${safetyModal.passed ? 'fa-check' : 'fa-triangle-exclamation'}`}></i>
              </div>
              <div>
                <h4 className="font-bold text-sm">{safetyModal.passed ? 'Safe to Prescribe' : 'Potential Conflict Detected'}</h4>
                <p className="text-xs mt-1 leading-relaxed">{safetyModal.summary}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Checked Medications</span>
              <div className="flex flex-wrap gap-1.5">
                {safetyModal.medsChecked.map(m => (
                  <span key={m} className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md font-bold text-slate-700">
                    {m}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">Pharmacology & Synergy Note:</span>
                <p className="text-slate-600 mt-0.5">{safetyModal.interactions}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSafetyModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors"
              >
                Close Safety Review
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}



/** Short two-tone chime for incoming-call/request alerts — synthesized via
 * WebAudio so there's no audio asset to ship or fail to load. */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1108.73].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Best-effort — autoplay policies or missing WebAudio just mean no sound.
  }
}

/** "Updated 12s ago" label that ticks on its own so the doctor can trust
 * the queue is actually live without watching the network tab. */
function LastUpdated({ at }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);
  if (!at) return null;
  const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
  const label = secs < 5 ? 'Updated just now' : secs < 60 ? `Updated ${secs}s ago` : `Updated ${Math.round(secs / 60)}m ago`;
  return <span className="text-[10px] text-slate-500 font-medium">{label}</span>;
}

const QUEUE_POLL_MS = 20000;

/* ─── Main Component ─────────────────────────── */
function DoctorTelemedicine() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { updateAppointmentStatus } = useClinicData();
  const [activeCall, setActiveCall] = useState(null);
  // Calls arrived at via an already-answered ring screen (instant call, or
  // "Accept" on the incoming-call overlay) skip the device pre-check below —
  // the doctor already committed to joining on that screen, mirroring how
  // the patient side's autoJoin skips its own "Join Now" pre-check.
  const [skipPreJoin, setSkipPreJoin] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [rawSessions, setRawSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const knownSessionsRef = useRef(new Map()); // id -> last-seen status, for diffing new/changed sessions

  const todayStr = todayLocalStr();

  const loadQueue = ({ silent = false, alertChanges = false } = {}) => {
    if (silent) setRefreshing(true);
    return apiFetch('/telemedicine/queue')
      .then(data => {
        if (alertChanges) {
          const known = knownSessionsRef.current;
          const newRequests = data.filter(s => !known.has(s.id) && s.status === 'Requested');
          const nowWaiting = data.filter(s => known.has(s.id) && known.get(s.id) !== 'Waiting' && s.status === 'Waiting');
          if (newRequests.length || nowWaiting.length) playChime();
          newRequests.forEach(s => toast(`New video request from ${s.patientName}`, 'info'));
          nowWaiting.forEach(s => toast(`${s.patientName} is waiting for their video call`, 'success'));
        }
        knownSessionsRef.current = new Map(data.map(s => [s.id, s.status]));
        setRawSessions(data);
        setLastUpdated(Date.now());
      })
      .catch(err => { if (!silent) toast(err.message || 'Failed to load queue', 'error'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { loadQueue(); }, []);

  // Arrived here via the Patients page's instant-call button — the
  // appointment (In Progress, already rung) was created by that click, so
  // jump straight into the call instead of waiting for it to show up in the
  // queue. Clear the router state so a refresh doesn't restart the call.
  useEffect(() => {
    const session = location.state?.instantCallSession;
    if (!session) return;
    setActiveCall(session);
    setSkipPreJoin(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  // Keep the queue live without the doctor having to reload the page — paused
  // while a call is active since there's nothing new to surface mid-consult.
  useEffect(() => {
    if (activeCall) return;
    const t = setInterval(() => loadQueue({ silent: true, alertChanges: true }), QUEUE_POLL_MS);
    return () => clearInterval(t);
  }, [activeCall]);

  const toSession = (s) => ({
    id: s.id,
    patientId: s.patient_id,
    patient: s.patientName,
    age: s.patientAge != null ? `${s.patientAge}F` : '—',
    type: s.reason || 'Consultation',
    time: s.scheduled_time,
    date: s.scheduled_date === todayStr ? 'Today' : new Date(s.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    phone: s.patientPhone || '—',
    waiting: s.status === 'Waiting' || s.status === 'In Progress',
    accepted: s.status !== 'Requested',
    status: s.status,
  });

  const sessions = rawSessions.map(toSession);

  const waitingSessions = sessions.filter(s => s.status === 'Waiting');
  const newRequestSessions = sessions.filter(s => !s.accepted);

  // Arrived here via the incoming-call ring screen's "Accept" — a patient
  // called us. The queue may not have picked up this appointment yet (it's
  // either brand new or just changed status), so fall back to a fresh fetch
  // rather than waiting on the next poll cycle.
  useEffect(() => {
    const startCallId = searchParams.get('startCall');
    if (!startCallId) return;
    let cancelled = false;
    (async () => {
      let session = sessions.find(s => s.id === startCallId);
      if (!session) {
        const fresh = await apiFetch('/telemedicine/queue').catch(() => []);
        const raw = fresh.find(s => s.id === startCallId);
        session = raw ? toSession(raw) : null;
      }
      if (cancelled) return;
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('startCall');
        return next;
      }, { replace: true });
      if (session) { setActiveCall(session); setSkipPreJoin(true); }
      else toast("Couldn't open that call — it may have already ended.", 'error');
    })();
    return () => { cancelled = true; };
  }, [searchParams, sessions, setSearchParams, toast]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState({ isOpen: false, channel: '' });
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBulkAction = (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) { toast('Please select at least one session first.', 'error'); return; }
    setBulkModalParams({ isOpen: true, channel: action });
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === sessions.length && sessions.length > 0) setSelectedIds([]);
    else setSelectedIds(sessions.map(s => s.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const sendBulkMessage = async (channel, messageText) => {
    const recipients = sessions.filter(s => selectedIds.includes(s.id));
    const patientIds = [...new Set(recipients.map(s => s.patientId).filter(Boolean))];
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Telemedicine Sessions — ${recipients.length} patient(s)`,
          channels: [channel],
          scheduleType: 'immediate',
          patientIds,
        },
      });
      toast(`${channel} sent to ${recipients.length} patient(s).`, 'success');
    } catch (err) {
      toast(err.message || `Failed to send ${channel}`, 'error');
    }
    setSelectedIds([]);
  };

  const handleAccept = async (id) => {
    try {
      await updateAppointmentStatus(id, 'Upcoming');
      await loadQueue();
      toast('Appointment accepted', 'success');
    } catch (err) {
      toast(err.message || 'Failed to accept', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await updateAppointmentStatus(id, 'Cancelled');
      await loadQueue();
      toast('Appointment rejected and refunded', 'info');
    } catch (err) {
      toast(err.message || 'Failed to reject', 'error');
    }
  };

  const joinCall = async (session) => {
    try {
      await updateAppointmentStatus(session.id, 'In Progress');
      setActiveCall(session);
      setSkipPreJoin(false);
      toast(`Joining call with ${session.patient}...`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to join call', 'error');
    }
  };

  const endCall = async (notes, draftMeds, draftLabs) => {
    try {
      if (notes) await apiFetch(`/telemedicine/${activeCall.id}/notes`, { method: 'POST', body: { note: notes } });
      
      if (draftMeds && draftMeds.length > 0) {
        await addRx(activeCall.patientId, {
          diagnosis: activeCall.type || 'Teleconsultation',
          instructions: notes || '',
          medicines: draftMeds.map(m => ({
            name: m.name || m.rawText || 'Medication',
            dosage: m.dosage || '',
            frequency: m.frequency || m.schedule || '1-0-1',
            duration: m.duration || '30 Days',
          })),
        });
      }
      
      if (draftLabs && draftLabs.length > 0) {
        await requestLabReport(activeCall.patientId, { requestedTests: draftLabs.join(', ') });
        await apiFetch('/communications/broadcasts', {
          method: 'POST',
          body: {
            subject: 'Action Needed: Lab Test Requested',
            body: `Dear ${activeCall.patient},\n\nDr. ${user?.name || 'your doctor'} has requested lab tests: ${draftLabs.join(', ')}.\n\nPlease upload the results to your portal once completed:\nhttps://app.healnari.com/patient-dashboard/records`,
            channels: ['Push Notification', 'Email'],
            scheduleType: 'immediate',
            patientIds: [activeCall.patientId],
          },
        }).catch(() => {});
      }

      if (notes || (draftMeds && draftMeds.length > 0) || (draftLabs && draftLabs.length > 0)) {
        let hasLifestylePlan = false;
        try {
          if (notes && notes.startsWith('{')) {
            const parsed = JSON.parse(notes);
            if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
              hasLifestylePlan = true;
            }
          }
        } catch (e) {}

        if (hasLifestylePlan) {
          await apiFetch('/communications/broadcasts', {
            method: 'POST',
            body: {
              subject: '🥗 Your Lifestyle Plan is Ready — HealNari',
              body: `Dear ${activeCall.patient},\n\nDr. ${user?.name || 'your doctor'} has prescribed a personalised Diet & Yoga Protocol for you.\n\nLog in to view and download your Lifestyle Plan:\nhttps://app.healnari.com/patient-dashboard/prescriptions`,
              audience: `Patient ${activeCall.patientId}`,
              channels: ['Push Notification', 'Email'],
              scheduleType: 'immediate',
              patientIds: [activeCall.patientId],
            },
          }).catch(() => {});
        } 
        
        if (!hasLifestylePlan || (draftMeds && draftMeds.length > 0) || (draftLabs && draftLabs.length > 0)) {
          await apiFetch('/communications/broadcasts', {
            method: 'POST',
            body: {
              subject: 'Prescription Ready',
              body: `Dear ${activeCall.patient}, your prescription and consultation notes from today's teleconsultation are now available in your portal.\n\nView here: https://app.healnari.com/patient-dashboard/prescriptions`,
              audience: `Patient ${activeCall.patientId}`,
              channels: ['Push Notification', 'Email'],
              scheduleType: 'immediate',
              patientIds: [activeCall.patientId],
            },
          }).catch(() => {});
        }
      }

      await updateAppointmentStatus(activeCall.id, 'Done');
      await loadQueue();
      toast('Consultation ended. Prescription sent to patient!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to finalize consultation', 'error');
    } finally {
      setActiveCall(null);
      setSkipPreJoin(false);
    }
  };

  // Patient declined — the backend already reverted the appointment out of
  // In Progress, so this just closes the call view (no "Done" status, no
  // notes prompt — the consult never actually happened).
  const handleDeclined = () => {
    toast(`${activeCall?.patient || 'The patient'} declined the call.`, 'info');
    setActiveCall(null);
    setSkipPreJoin(false);
    loadQueue();
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading queue...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Telemedicine</h1>
          <p className="text-sm text-slate-500 mt-1">Private, doctor-only video consultations.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Bulk Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in origin-top-right">
                <div className="px-4 py-2 mb-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Messaging Channels</p></div>
                <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-aubergine-50 hover:text-aubergine-700 flex items-center gap-3 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-aubergine-100 flex items-center justify-center group-hover:bg-white transition-colors">
                    <i className="fas fa-envelope text-aubergine-600"></i>
                  </div>
                  Bulk Email
                </button>
                <button onClick={() => handleBulkAction('Push Notification')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-3 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-white transition-colors">
                    <i className="fas fa-bell text-amber-500"></i>
                  </div>
                  Push Notification
                </button>
                <button onClick={() => handleBulkAction('WhatsApp Message')} className="w-full text-left px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-white transition-colors">
                    <i className="fab fa-whatsapp text-emerald-500 text-lg"></i>
                  </div>
                  WhatsApp Message
                </button>
              </div>
            )}
          </div>
          <button onClick={() => loadQueue({ silent: true })} disabled={refreshing}
            title="Refresh queue"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-aubergine-600 hover:border-aubergine-200 flex items-center justify-center transition-all shadow-sm hover:shadow hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
            <i className={`fas fa-rotate text-sm ${refreshing ? 'fa-spin' : ''}`}></i>
          </button>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-emerald-700 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></span> Live Queue
          </div>
        </div>
      </div>

      {/* Active Call */}
      {activeCall ? (
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live: {activeCall.patient}
            <span className="text-xs text-slate-500 font-medium">— use "End Consultation" below to save your notes and finish</span>
          </h2>
          <ActiveCallUI session={activeCall} onEnd={endCall} onDeclined={handleDeclined} autoJoin={skipPreJoin} />
        </div>
      ) : (
        <>
          {/* Waiting-patient alert */}
          {waitingSessions.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30 relative">
                <i className="fas fa-video animate-pulse"></i>
                <div className="absolute inset-0 bg-emerald-400 rounded-2xl animate-ping opacity-20"></div>
              </div>
              <div className="flex-1">
                <p className="font-black text-emerald-900 text-base">
                  {waitingSessions.length === 1 ? `${waitingSessions[0].patient} is waiting in the virtual lobby.` : `${waitingSessions.length} patients are waiting.`}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">Join now to avoid keeping them waiting.</p>
              </div>
              <button onClick={() => joinCall(waitingSessions[0])}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all flex-shrink-0 flex items-center gap-2 shadow-md hover:-translate-y-0.5">
                <i className="fas fa-video animate-pulse"></i> Join Now
              </button>
            </div>
          )}

          {/* New request alert */}
          {newRequestSessions.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <i className="fas fa-calendar-plus"></i>
              </div>
              <div className="flex-1">
                <p className="font-black text-amber-900 text-base">
                  {newRequestSessions.length === 1 ? '1 new video consultation request' : `${newRequestSessions.length} new video consultation requests`}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">Accept or reject below to confirm the patient's slot.</p>
              </div>
            </div>
          )}

          {/* Sessions Queue */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between bg-slate-50/50 gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h2 className="font-bold text-slate-800 tracking-tight whitespace-nowrap sm:whitespace-normal">Video Consultation Queue</h2>
                <div className="min-w-0 shrink-0"><LastUpdated at={lastUpdated} /></div>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.length > 0 && selectedIds.length === sessions.length ? 'bg-aubergine-600 shadow-sm text-white' : selectedIds.length > 0 ? 'bg-aubergine-200 text-aubergine-700 ring-1 ring-aubergine-400' : 'bg-white ring-1 ring-slate-200 ring-inset'}`}>
                    {(selectedIds.length > 0 && selectedIds.length === sessions.length) ? <i className="fas fa-check text-[9px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-700 rounded-full"></div> : null}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedIds.length === sessions.length && sessions.length > 0} onChange={toggleSelectAll} />
                  Select All
                </label>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {sessions.map(s => (
                <div key={s.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white transition-all duration-300 shadow-sm hover:shadow-md ${s.waiting ? 'ring-1 ring-emerald-400 bg-emerald-50/20' : 'ring-1 ring-slate-100'} ${selectedIds.includes(s.id) ? 'ring-1 ring-aubergine-400 bg-aubergine-50/20' : ''}`}>
                  <label className="cursor-pointer group flex-shrink-0 self-center" onClick={e => e.stopPropagation()}>
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${selectedIds.includes(s.id) ? 'bg-aubergine-600 shadow-sm text-white' : 'bg-slate-100/80 group-hover:bg-slate-200 ring-1 ring-slate-200/80 ring-inset group-hover:ring-aubergine-300'}`}>
                      {selectedIds.includes(s.id) && <i className="fas fa-check text-[9px]"></i>}
                    </div>
                    <input type="checkbox" className="hidden" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                  </label>
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-aubergine-100 to-aubergine-200 text-aubergine-700 font-bold flex items-center justify-center shadow-inner text-sm">
                        {s.patient.split(' ').map(n => n[0]).join('')}
                      </div>
                      {s.waiting && <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-sm shadow-emerald-500/50"></div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-slate-800 tracking-tight">{s.patient}</h3>
                        {s.waiting && <span className="text-[9px] bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-md border border-emerald-200 shadow-sm">WAITING</span>}
                        {!s.accepted && <span className="text-[9px] bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-md border border-amber-200 shadow-sm">NEW REQUEST</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{s.age} • {s.type}</p>
                      <p className="text-[11px] text-aubergine-700 font-bold mt-1 bg-aubergine-50 px-2 py-0.5 rounded-md inline-block border border-aubergine-100/50">{s.date} — {s.time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end items-center">
                    <a href={`tel:${s.phone}`}
                      className="w-10 h-10 rounded-full bg-white text-slate-500 hover:text-aubergine-600 hover:bg-aubergine-50 flex items-center justify-center transition-colors border border-slate-200 shadow-sm" title="Call Patient">
                      <i className="fas fa-phone"></i>
                    </a>
                    <button onClick={() => { setNoteTarget(s); setNoteDraft(''); setShowNotes(true); }}
                      className="text-[11px] font-bold text-aubergine-600 border border-aubergine-200 px-4 py-2.5 rounded-xl hover:bg-aubergine-50 transition-colors shadow-sm flex items-center gap-1.5 bg-white">
                      <i className="fas fa-file-lines"></i> Notes
                    </button>
                    {s.accepted ? (
                      <button onClick={() => joinCall(s)}
                        className={`font-bold px-5 py-2.5 rounded-xl text-[11px] transition-all flex items-center gap-2 shadow-sm ${s.waiting ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:-translate-y-0.5' : 'bg-gradient-to-r from-aubergine-600 to-aubergine-700 text-white shadow-aubergine-600/20 hover:-translate-y-0.5'}`}>
                        <i className={`fas fa-video ${s.waiting ? 'animate-pulse' : ''}`}></i> {s.waiting ? 'Join Now' : 'Start Call'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleReject(s.id)}
                          className="font-bold px-4 py-2.5 rounded-xl text-[11px] transition-colors flex items-center gap-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 shadow-sm">
                          Reject
                        </button>
                        <button onClick={() => handleAccept(s.id)}
                          className="font-bold px-5 py-2.5 rounded-xl text-[11px] transition-all flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20 hover:-translate-y-0.5">
                          <i className="fas fa-check"></i> Accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="bg-slate-50/50 rounded-2xl p-16 text-center border border-slate-100 border-dashed">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                    <i className="fas fa-video-slash text-3xl text-slate-300"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">Queue is Empty</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    You have no upcoming telemedicine consultations. Enjoy your break!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tech Tips */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: 'fa-shield-halved', title: 'Private Sessions', sub: 'Doctor-only access, no session recording.', gradient: 'from-aubergine-600 to-magenta-600' },
              { icon: 'fa-file-lines', title: 'Auto-SOAP Notes', sub: 'AI transcription & note generation.', gradient: 'from-fuchsia-500 to-purple-500' },
              { icon: 'fa-hospital', title: 'NMC Compliant', sub: 'Telemedicine practice guidelines met.', gradient: 'from-emerald-500 to-teal-500' },
            ].map(tip => (
              <div key={tip.title} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex gap-4 group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tip.gradient} text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${tip.icon} text-lg`}></i>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm tracking-tight">{tip.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{tip.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes Modal */}
      <Modal isOpen={showNotes} onClose={() => setShowNotes(false)} title={`Pre-call Notes — ${noteTarget?.patient}`} size="sm">
        <div className="space-y-4">
          <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3 text-xs text-aubergine-800">
            <strong>Visit Type:</strong> {noteTarget?.type}<br />
            <strong>Scheduled:</strong> {noteTarget?.date} at {noteTarget?.time}
          </div>
          <textarea rows={4} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Pre-call notes, patient history reminders..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          <button onClick={async () => {
            try {
              if (noteDraft.trim()) await apiFetch(`/telemedicine/${noteTarget.id}/notes`, { method: 'POST', body: { note: noteDraft.trim() } });
              toast('Notes saved for this session.', 'success');
            } catch (err) {
              toast(err.message || 'Failed to save notes', 'error');
            }
            setShowNotes(false);
          }}
            className="w-full bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            Save Notes
          </button>
        </div>
      </Modal>

      <BulkMessageModal
        isOpen={bulkModalParams.isOpen}
        onClose={() => setBulkModalParams({ isOpen: false, channel: '' })}
        channel={bulkModalParams.channel}
        selectedCount={selectedIds.length}
        onSend={(msg) => sendBulkMessage(bulkModalParams.channel, msg)}
      />
    </div>
  );
}

export default DoctorTelemedicine;
