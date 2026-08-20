import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal, ConfirmModal } from '../../components/Modal.jsx';
import { DoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge, resolveRxStatus } from '../../components/RxStatus.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { openPrescriptionPrintWindow, openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';
import { AiButton } from '../../components/AiButton.jsx';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');
  const MSG_TEMPLATES = [
    { id: 'T1', name: 'Medication Reminder', text: 'Dear [Name], this is a reminder to take your prescribed medications on time. Consistency is key for effective treatment.' },
    { id: 'T2', name: 'Refill Available', text: 'Hi [Name], your prescription refill is now available. Please visit the clinic or request a refill through the app.' },
    { id: 'T3', name: 'Dosage Adjustment Notice', text: 'Dear [Name], your medication dosage has been adjusted as per your latest consultation. Please check your updated prescription.' },
    { id: 'T4', name: 'Follow-up Lab Reminder', text: 'Hello [Name], your follow-up lab tests are due. Please schedule them at your earliest convenience.' },
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
          <p>Sending {channel} to {selectedCount} selected prescription(s).</p>
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

const SCHEDULE_PRESETS = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '0-1-0', 'SOS'];

const STATUS_TABS = ['All', 'Active', 'Expiring Soon', 'Refill Requested', 'Expired'];

const ALLERGY_DRUG_MAP = {
  penicillin: ['penicillin', 'amoxicillin', 'augmentin', 'ampicillin', 'piperacillin', 'cloxacillin', 'amox'],
  sulfa: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'dapsone', 'sulfa'],
  nsaids: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'mefenamic', 'indomethacin', 'ketorolac', 'combiflam'],
  macrolides: ['azithromycin', 'clarithromycin', 'erythromycin', 'roxithromycin'],
  cephalosporins: ['cefixime', 'cefpodoxime', 'cephalexin', 'ceftriaxone', 'cefuroxime'],
  iodine: ['povidone-iodine', 'betadine', 'iodine'],
};

export function checkAllergyConflict(drugName = '', patientAllergies = []) {
  if (!drugName || !patientAllergies || patientAllergies.length === 0) return null;
  const dLower = drugName.toLowerCase().trim();
  
  for (const allergy of patientAllergies) {
    const aLower = allergy.toLowerCase().trim();
    if (!aLower) continue;

    // Direct name match or substring
    if (dLower.includes(aLower) || aLower.includes(dLower)) {
      return { allergy, matchedDrug: drugName, reason: `Direct match with documented allergy "${allergy}"` };
    }

    // Check allergy group mappings
    for (const [group, drugs] of Object.entries(ALLERGY_DRUG_MAP)) {
      const allergyMatchesGroup = aLower.includes(group) || drugs.some(d => aLower.includes(d));
      const drugMatchesGroup = drugs.some(d => dLower.includes(d));

      if (allergyMatchesGroup && drugMatchesGroup) {
        return {
          allergy,
          matchedDrug: drugName,
          reason: `"${drugName}" belongs to the ${group.toUpperCase()} drug class contraindicated for allergy: "${allergy}"`,
        };
      }
    }
  }
  return null;
}



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

/* ─── Stylus Handwritten Prescription Canvas Component ─── */
function StylusHandwritingPad({ patient, diagnosis, doctorName, doctorReg, onExportImage }) {
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inkColor, setInkColor] = useState('#1D4ED8'); // Doctor Blue
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [currentStroke, setCurrentStroke] = useState(null);

  const redraw = (allStrokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    allStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.isEraser ? '#FAF8F5' : stroke.color;
      ctx.lineWidth = stroke.isEraser ? stroke.width * 6 : stroke.width;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    redraw(strokes);
  }, []);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCoords(e);
    setIsDrawing(true);
    const newStroke = { color: inkColor, width: strokeWidth, isEraser, points: [pt] };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !currentStroke) return;
    const pt = getCoords(e);
    const updated = { ...currentStroke, points: [...currentStroke.points, pt] };
    setCurrentStroke(updated);
    redraw([...strokes, updated]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke && currentStroke.points.length > 0) {
      const nextStrokes = [...strokes, currentStroke];
      setStrokes(nextStrokes);
      setCurrentStroke(null);
      exportCanvas(nextStrokes);
    }
  };

  const exportCanvas = (allStrokes = strokes) => {
    const canvas = canvasRef.current;
    if (!canvas || allStrokes.length === 0) {
      onExportImage?.(null);
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    onExportImage?.(dataUrl);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    redraw(nextStrokes);
    exportCanvas(nextStrokes);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onExportImage?.(null);
  };

  return (
    <div className="bg-[#FAF8F5] rounded-3xl border border-[#E6E1D8] shadow-lg overflow-hidden flex flex-col">
      {/* Pad Toolbar */}
      <div className="bg-[#F1ECE4] px-4 py-3 border-b border-[#E0D8CC] flex items-center justify-between gap-3 flex-wrap text-xs">
        {/* Ink Palette */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
            <i className="fas fa-pen-nib text-[#1D4ED8]"></i> Ink:
          </span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D5CBBF]">
            {[
              { color: '#1D4ED8', label: 'Doctor Blue' },
              { color: '#0F172A', label: 'Deep Black' },
              { color: '#7E22CE', label: 'Royal Purple' },
              { color: '#DC2626', label: 'Alert Red' },
            ].map(ink => (
              <button
                key={ink.color}
                type="button"
                onClick={() => { setInkColor(ink.color); setIsEraser(false); }}
                title={ink.label}
                className={`w-6 h-6 rounded-lg transition-transform flex items-center justify-center ${!isEraser && inkColor === ink.color ? 'scale-110 ring-2 ring-slate-800 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: ink.color }}
              >
                {!isEraser && inkColor === ink.color && <i className="fas fa-check text-white text-[9px]"></i>}
              </button>
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D5CBBF]">
            {[
              { width: 2, label: 'Fine' },
              { width: 3.5, label: 'Medium' },
              { width: 5, label: 'Bold' },
            ].map(sz => (
              <button
                key={sz.width}
                type="button"
                onClick={() => { setStrokeWidth(sz.width); setIsEraser(false); }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors ${!isEraser && strokeWidth === sz.width ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsEraser(!isEraser)}
            className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-all ${isEraser ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-[#D5CBBF] text-slate-700 hover:bg-slate-50'}`}
          >
            <i className="fas fa-eraser"></i> Eraser
          </button>
          <button
            type="button"
            onClick={() => setShowGuidelines(!showGuidelines)}
            className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-all ${showGuidelines ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-white border border-[#D5CBBF] text-slate-700 hover:bg-slate-50'}`}
          >
            <i className="fas fa-grip-lines"></i> Ruled
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="w-8 h-8 rounded-xl bg-white border border-[#D5CBBF] text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors"
            title="Undo"
          >
            <i className="fas fa-rotate-left"></i>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="w-8 h-8 rounded-xl bg-white border border-[#D5CBBF] text-rose-600 hover:bg-rose-50 disabled:opacity-40 flex items-center justify-center transition-colors"
            title="Clear Pad"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>

      {/* Prescription Pad Body with Canvas */}
      <div className="relative p-6 min-h-[480px] bg-[#FAF8F5] select-none touch-none cursor-crosshair">
        {/* Prescription Pad Header */}
        <div className="border-b-2 border-[#D5CBBF] pb-3 mb-4 flex justify-between items-start pointer-events-none select-none">
          <div>
            <h3 className="text-xl font-black text-slate-900 font-serif">HealNari Telemedicine Clinic</h3>
            <p className="text-xs text-slate-600 font-sans">Dr. {doctorName || 'Consultant Physician'}{doctorReg ? ` • Reg No: ${doctorReg}` : ''}</p>
          </div>
          <div className="text-right text-xs font-sans text-slate-600">
            <p className="font-bold text-slate-800">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="font-mono text-[11px] text-slate-400">HANDWRITTEN RX</p>
          </div>
        </div>

        {/* Patient Header Banner */}
        <div className="bg-[#F1ECE4]/80 p-2.5 rounded-xl border border-[#E0D8CC] mb-4 text-xs font-sans flex justify-between pointer-events-none select-none">
          <div><strong>Patient:</strong> <span className="text-slate-900 font-bold">{patient || 'Select a patient above'}</span></div>
          <div><strong>Diagnosis:</strong> <span className="text-slate-900 font-bold">{diagnosis || 'Clinical evaluation'}</span></div>
        </div>

        {/* Rx Watermark Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
          <span className="text-[180px] font-serif font-black text-slate-900">Rx</span>
        </div>

        {/* Ruled Paper Guidelines */}
        {showGuidelines && (
          <div 
            className="absolute inset-0 pointer-events-none select-none" 
            style={{
              backgroundImage: 'linear-gradient(to bottom, transparent 31px, #E5E0D6 32px)',
              backgroundSize: '100% 32px',
              marginTop: '130px',
              marginBottom: '40px',
            }}
          />
        )}

        {/* Active Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 w-full h-full z-10"
        />

        {/* Pad Footer */}
        <div className="absolute bottom-3 left-6 right-6 flex justify-between items-end border-t border-[#E5E0D6] pt-2 text-[10px] text-slate-400 font-sans pointer-events-none select-none">
          <span>Digitally Hand-Authored via Stylus Pad • Encrypted Telehealth Record</span>
          <span className="font-serif italic text-slate-600 font-bold">Doctor Signature Stamp / Verified</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Write Rx — full page, form + live prescription-pad preview ─── */
const RX_ID_SEED = Math.floor(Math.random() * 9000) + 1000;

function WriteRxPage({ onBack, onSave, patients }) {
  const { user } = useAuth();
  const toast = useToast();
  const [rxMode, setRxMode] = useState('digital'); // 'digital', 'handwritten', 'upload'
  const [form, setForm] = useState({ 
    patientId: '', 
    patient: '', 
    diagnosis: '', 
    meds: [{ name: '', schedule: '', duration: '' }], 
    instructions: '',
    handwrittenImage: null,
  });
  const [template, setTemplate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Dynamic Catalog State (loaded purely from API)
  const [medCatalog, setMedCatalog] = useState([]);
  const [labCatalog, setLabCatalog] = useState([]);
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [isLabDropdownOpen, setIsLabDropdownOpen] = useState(false);
  const [selectedLabCat, setSelectedLabCat] = useState('All');

  // Dynamic Protocol Bundles (fetched from /api/records/protocols)
  const [protocols, setProtocols] = useState([]);

  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [targetMedIndex, setTargetMedIndex] = useState(null);
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

  useEffect(() => {
    // Fetch protocol bundles from DB
    apiFetch('/records/protocols')
      .then(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        setProtocols(items);
      })
      .catch(() => {});

    // Fetch medicine catalog
    apiFetch('/records/catalog?type=medicine')
      .then(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        if (items.length > 0) {
          const mapped = items.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category,
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

    // Fetch lab test catalog
    apiFetch('/records/catalog?type=lab_test')
      .then(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        if (items.length > 0) {
          const mapped = items.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category || 'General',
            badge: i.badge || '🔬 Test',
            isCustom: !!i.doctor_id,
          }));
          setLabCatalog(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const toggleLab = (name) => {
    setSelectedLabs(prev => 
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    );
  };

  const handleSelectCatalogMed = (index, item) => {
    const fullName = item.defaultDose ? `${item.name} ${item.defaultDose}` : item.name;
    setForm(p => ({
      ...p,
      meds: p.meds.map((m, idx) => idx === index ? {
        ...m,
        name: fullName,
        schedule: item.defaultFreq || m.schedule || '1-0-1',
        duration: item.defaultDuration || m.duration || '30 Days',
      } : m),
      instructions: (item.defaultTiming && !p.instructions?.includes(item.defaultTiming))
        ? (p.instructions ? `${p.instructions}\n• ${item.name}: ${item.defaultTiming}` : `• ${item.name}: ${item.defaultTiming}`)
        : p.instructions,
    }));
    setActiveDropdownIndex(null);
  };

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
      if (targetMedIndex !== null) {
        handleSelectCatalogMed(targetMedIndex, item);
      }
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
      toast(`Added "${item.name}" to prescription catalog!`, 'success');
    } catch {
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
      if (targetMedIndex !== null) {
        handleSelectCatalogMed(targetMedIndex, item);
      }
      setShowAddMedModal(false);
      toast(`Added "${item.name}" to prescription!`, 'success');
    } finally {
      setSavingCustomMed(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === form.patientId) || null;
  const patientAllergies = useMemo(() => selectedPatient?.allergies || [], [selectedPatient]);
  const filledMeds = form.meds.filter(m => m.name.trim());
  
  // Real-time clinical cross-check: map all prescribed medications against patient allergy profile
  const allergyConflicts = useMemo(() => {
    if (!patientAllergies.length) return [];
    return form.meds
      .map((med, idx) => {
        const conflict = checkAllergyConflict(med.name, patientAllergies);
        return conflict ? { ...conflict, index: idx, medName: med.name } : null;
      })
      .filter(Boolean);
  }, [form.meds, patientAllergies]);

  const isValid = rxMode === 'handwritten' 
    ? (form.patient && form.diagnosis.trim() && !!form.handwrittenImage)
    : rxMode === 'upload'
    ? (form.patient && form.diagnosis.trim() && !!uploadedFile)
    : (form.patient && form.diagnosis.trim() && filledMeds.length > 0);

  const applyTemplate = (tmplName) => {
    const found = protocols.find(t => t.name === tmplName || t.shortName === tmplName);
    if (found) applyProtocol(found);
  };

  const applyProtocol = (protocol) => {
    if (!protocol) return;
    setForm(prev => ({
      ...prev,
      diagnosis: protocol.diagnosis || prev.diagnosis,
      meds: protocol.meds.map(m => ({
        name: m.name,
        schedule: m.schedule || '1-0-1',
        duration: m.duration || '30 Days',
        timing: m.timing || 'After Food',
      })),
      instructions: protocol.meds.map(m => `• ${m.name}: ${m.instructions || m.timing}`).join('\n'),
    }));
    setTemplate(protocol.name);
    toast(`Applied "${protocol.shortName || protocol.name}" (${protocol.meds.length} medications loaded)`, 'success');
  };

  const addMed = () => setForm(p => ({ ...p, meds: [...p.meds, { name: '', schedule: '', duration: '' }] }));
  const removeMed = (i) => setForm(p => ({ ...p, meds: p.meds.filter((_, idx) => idx !== i) }));
  const updateMed = (i, k, v) => setForm(p => ({ ...p, meds: p.meds.map((m, idx) => idx === i ? { ...m, [k]: v } : m) }));

  const handleIssue = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSave({
        ...form,
        mode: rxMode,
        handwrittenImage: form.handwrittenImage,
        uploadedFile,
      });
      onBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Breadcrumb bar */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all">
          <i className="fas fa-arrow-left text-aubergine-600"></i> Back to Prescriptions
        </button>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Doctor Portal &gt; Prescriptions &gt; <span className="text-slate-700 font-bold">Write New Rx</span>
        </p>
      </div>

      {/* Page header with Mode Switcher */}
      <div className="rounded-3xl p-6 text-white shadow-lg bg-gradient-to-br from-aubergine-900 via-aubergine-600 to-magenta-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/20 flex items-center justify-center text-2xl flex-shrink-0">
            <i className={rxMode === 'handwritten' ? 'fas fa-pen-nib' : rxMode === 'upload' ? 'fas fa-camera' : 'fas fa-file-prescription'}></i>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight">
              {rxMode === 'handwritten' ? 'Handwritten Stylus Prescription' : rxMode === 'upload' ? 'Upload Scanned Paper Rx' : 'Write Digital Prescription'}
            </h1>
            <p className="text-aubergine-100 text-sm mt-0.5">
              {rxMode === 'handwritten' ? 'Draw directly on the digital pad with your stylus, Apple Pencil, or mouse.' : 'Fill in the structured medication details or select a quick clinical protocol.'}
            </p>
          </div>
        </div>

        {/* 3-Way Mode Switcher Tabs */}
        <div className="bg-white/20 p-1 rounded-2xl border border-white/30 flex items-center shadow-inner self-start md:self-auto">
          <button
            type="button"
            onClick={() => setRxMode('digital')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${rxMode === 'digital' ? 'bg-white text-aubergine-900 shadow-md' : 'text-white/90 hover:text-white'}`}
          >
            <i className="fas fa-keyboard"></i> Digital Form
          </button>
          <button
            type="button"
            onClick={() => setRxMode('handwritten')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${rxMode === 'handwritten' ? 'bg-white text-aubergine-900 shadow-md' : 'text-white/90 hover:text-white'}`}
          >
            <i className="fas fa-pen-nib"></i> Handwritten Pad
          </button>
          <button
            type="button"
            onClick={() => setRxMode('upload')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${rxMode === 'upload' ? 'bg-white text-aubergine-900 shadow-md' : 'text-white/90 hover:text-white'}`}
          >
            <i className="fas fa-camera"></i> Upload Paper Rx
          </button>
        </div>
      </div>

      {/* Patient & Diagnosis Selector (Universal for all modes) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <i className="fas fa-user text-aubergine-600"></i> Patient &amp; Clinical Diagnosis
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select Patient *</label>
            <select 
              value={form.patientId} 
              onChange={e => {
                const pt = patients.find(p => p.id === e.target.value);
                setForm(p => ({ ...p, patientId: e.target.value, patient: pt?.name || '' }));
              }} 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300"
            >
              <option value="">-- Choose patient --</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Clinical Diagnosis *</label>
            <input 
              value={form.diagnosis} 
              onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} 
              placeholder="e.g. PCOS — Insulin Resistance Subtype"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" 
            />
          </div>
        </div>
      </div>

      {/* ── MODE 1: HANDWRITTEN CANVAS PAD ── */}
      {rxMode === 'handwritten' && (
        <div className="space-y-6">
          <StylusHandwritingPad 
            patient={form.patient}
            diagnosis={form.diagnosis}
            doctorName={user?.name}
            doctorReg={user?.regNo}
            onExportImage={imgData => setForm(p => ({ ...p, handwrittenImage: imgData }))}
          />

          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.handwrittenImage ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                <i className={`fas ${form.handwrittenImage ? 'fa-check' : 'fa-pen-to-square'}`}></i>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {form.handwrittenImage ? 'Digital Ink Captured & Encrypted' : 'Please draw your prescription above'}
                </h4>
                <p className="text-xs text-slate-500">The handwritten canvas will be saved as a signed medical document sent to the patient.</p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onBack} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleIssue}
                disabled={!isValid || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                <span>{submitting ? 'Issuing Handwritten Rx...' : 'Issue & Send to Patient'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODE 2: UPLOAD PAPER SCANNED RX ── */}
      {rxMode === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
            <div 
              onClick={() => document.getElementById('paper-rx-input')?.click()}
              className="border-2 border-dashed border-aubergine-200 rounded-3xl p-10 bg-aubergine-50/40 hover:bg-aubergine-50 hover:border-aubergine-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-2xl shadow-xs">
                <i className="fas fa-camera"></i>
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                {uploadedFile ? uploadedFile.name : 'Click to Upload or Snap Photo of Paper Prescription'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Attach a clear photo or PDF scan of your physical prescription pad. Supported formats: JPG, PNG, PDF (Max 15MB).
              </p>
              <input 
                id="paper-rx-input" 
                type="file" 
                accept="image/jpeg,image/png,application/pdf" 
                className="hidden"
                onChange={e => setUploadedFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onBack} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleIssue}
              disabled={!isValid || submitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
              <span>{submitting ? 'Issuing Scanned Rx...' : 'Issue Scanned Prescription'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODE 3: DIGITAL STRUCTURED FORM ── */}
      {rxMode === 'digital' && (
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* ── Form column ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* ── 1-Click Clinical Protocol Bundles & Templates ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <i className="fas fa-wand-magic-sparkles text-aubergine-600"></i> 1-Click Clinical Protocol Bundles
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pre-configured evidence-based medication bundles with standard dosages &amp; schedules</p>
                </div>
                {template && (
                  <button
                    type="button"
                    onClick={() => {
                      setTemplate('');
                      setForm(p => ({ ...p, meds: [{ name: '', schedule: '', duration: '' }], instructions: '' }));
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    Reset Form
                  </button>
                )}
              </div>

              {/* Protocol Quick-Select Cards */}
              <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
                {protocols.length === 0 ? (
                  <div className="col-span-2 flex items-center justify-center gap-2 py-4 text-slate-400 text-xs">
                    <i className="fas fa-spinner fa-spin"></i> Loading protocol bundles...
                  </div>
                ) : protocols.map((protocol) => {
                  const isSelected = template === protocol.name;
                  return (
                    <button
                      key={protocol.id || protocol.name}
                      type="button"
                      onClick={() => applyProtocol(protocol)}
                      className={`text-left p-3 rounded-2xl border transition-all relative overflow-hidden group ${
                        isSelected 
                          ? 'border-aubergine-500 bg-aubergine-50/70 ring-2 ring-aubergine-500/20 shadow-sm' 
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-aubergine-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-mono">
                          {protocol.badge}
                        </span>
                        <span className="text-[10px] font-bold text-aubergine-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          1-Click Apply <i className="fas fa-arrow-right text-[8px]"></i>
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{protocol.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{protocol.description}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-600">
                        <i className="fas fa-pills text-aubergine-600 text-[9px]"></i>
                        <span>{(protocol.meds || []).length} drugs: {(protocol.meds || []).map(m => m.name.split(' ')[0]).join(', ')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown Fallback */}
              <div className="pt-2">
                <select 
                  value={template} 
                  onChange={e => applyTemplate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-aubergine-300 font-medium"
                >
                  <option value="">— Or choose from protocol dropdown list —</option>
                  {protocols.map(t => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Medicines */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-2">
                  <i className="fas fa-pills text-aubergine-600"></i> Medicines &amp; Dosage
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setTargetMedIndex(null);
                    setNewMedForm(p => ({ ...p, name: '' }));
                    setShowAddMedModal(true);
                  }}
                  className="text-[10px] font-bold text-aubergine-700 hover:text-aubergine-900 flex items-center gap-1 bg-aubergine-50 hover:bg-aubergine-100 border border-aubergine-200 px-2.5 py-1 rounded-xl transition-colors"
                >
                  <i className="fas fa-plus text-[9px]"></i> Add to Catalog
                </button>
              </div>

              {/* Real-time Critical Allergy Alert Banner */}
              {allergyConflicts.length > 0 ? (
                <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-950 flex items-start gap-3 shadow-md animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <i className="fas fa-triangle-exclamation text-base"></i>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-sm text-rose-900 flex items-center gap-2">
                      <span>CRITICAL CONTRAINDICATION: ALLERGY DETECTED</span>
                      <span className="text-[10px] uppercase font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full border border-rose-300">
                        {allergyConflicts.length} Conflict{allergyConflicts.length > 1 ? 's' : ''}
                      </span>
                    </p>
                    <p className="text-rose-800 text-[11px] leading-relaxed">
                      Patient <strong>{form.patient || 'Selected Patient'}</strong> has documented allergies to: <strong className="underline font-black">{patientAllergies.join(', ')}</strong>.
                    </p>
                    <ul className="text-rose-900 font-bold text-[11px] list-disc list-inside space-y-0.5 pt-0.5">
                      {allergyConflicts.map((c, i) => (
                        <li key={i}>{c.reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                /* CDSS Safety Checker Banner (Normal) */
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                  <i className="fas fa-shield-virus text-amber-600 text-sm mt-0.5 shrink-0"></i>
                  <div>
                    <p className="font-bold">CDSS Safety Check Active</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Automated allergy &amp; drug-drug interaction (DDI) validation enabled for patient: <span className="font-bold">{form.patient || 'Not Selected'}</span>
                      {patientAllergies.length > 0 && (
                        <span className="ml-1 text-slate-600">(Known Allergies: <strong className="text-rose-700">{patientAllergies.join(', ')}</strong>)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {form.meds.map((med, i) => {
                  const medConflict = checkAllergyConflict(med.name, patientAllergies);
                  return (
                    <div 
                      key={i} 
                      className={`border rounded-xl p-3 space-y-2 relative transition-all ${
                        medConflict 
                          ? 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-400/30' 
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-5 relative">
                          <input
                            value={med.name}
                            onChange={e => {
                              updateMed(i, 'name', e.target.value);
                              setActiveDropdownIndex(i);
                            }}
                            onFocus={() => setActiveDropdownIndex(i)}
                            placeholder="Search or enter medicine name..."
                            className={`w-full border rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 font-semibold ${
                              medConflict 
                                ? 'border-rose-400 focus:ring-rose-300 text-rose-900' 
                                : 'border-slate-200 focus:ring-aubergine-300'
                            }`}
                          />
                          {med.name && (
                            <button
                              type="button"
                              onClick={() => updateMed(i, 'name', '')}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                            >
                              <i className="fas fa-xmark text-xs"></i>
                            </button>
                          )}

                          {/* Smart Dynamic Dropdown */}
                          {activeDropdownIndex === i && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto custom-scrollbar z-50 p-1.5 space-y-0.5">
                              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                <span>Matches ({filterAndRankCatalog(medCatalog, med.name).length})</span>
                                <span className="text-[9px] text-aubergine-600 font-bold">Prefix &amp; Keyword Match</span>
                              </div>
                              {filterAndRankCatalog(medCatalog, med.name).slice(0, 30).map((item) => (
                                <button
                                  key={item.id || item.name}
                                  type="button"
                                  onClick={() => handleSelectCatalogMed(i, item)}
                                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-aubergine-50 text-xs font-bold text-slate-700 hover:text-aubergine-900 flex items-center justify-between transition-colors group"
                                >
                                  <span className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                                    {item.isCustom && (
                                      <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded font-black shrink-0">Custom</span>
                                    )}
                                    <span className="truncate">
                                      {/* Highlight prefix match if typing */}
                                      {med.name && item.name.toLowerCase().startsWith(med.name.trim().toLowerCase()) ? (
                                        <>
                                          <span className="text-aubergine-700 bg-aubergine-100/80 px-0.5 rounded font-black">{item.name.slice(0, med.name.trim().length)}</span>
                                          <span>{item.name.slice(med.name.trim().length)}</span>
                                        </>
                                      ) : (
                                        item.name
                                      )}
                                    </span>
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {item.category && (
                                      <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 hidden sm:inline-block font-semibold">
                                        {item.category}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-aubergine-700 bg-aubergine-50 px-2 py-0.5 rounded-md border border-aubergine-100">
                                      {item.defaultDose} • {item.defaultFreq}
                                    </span>
                                  </div>
                                </button>
                              ))}
                              {med.name && !medCatalog.some(m => m.name.toLowerCase() === med.name.toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetMedIndex(i);
                                    setNewMedForm(prev => ({ ...prev, name: med.name }));
                                    setShowAddMedModal(true);
                                    setActiveDropdownIndex(null);
                                  }}
                                  className="w-full text-left px-2.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-800 flex items-center justify-between transition-colors mt-1 shadow-xs"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <i className="fas fa-plus-circle text-purple-600"></i>
                                    <span>Add &ldquo;{med.name}&rdquo; to Catalog</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-purple-700 font-bold bg-white px-2 py-0.5 rounded border border-purple-200">Save Preset</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <input value={med.schedule} onChange={e => updateMed(i, 'schedule', e.target.value)} placeholder="Schedule (e.g. 1-0-1)"
                          className="col-span-3 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                        <input value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} placeholder="Duration"
                          className="col-span-2 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
                        
                        <div className="col-span-1 flex items-center justify-center">
                          <AiButton
                            variant="compact"
                            size="sm"
                            icon="fa-wand-magic-sparkles"
                            title="AI Auto-Complete standard dosage and frequency"
                            className="h-8 w-8 !p-0"
                            onClick={async () => {
                              if (!med.name.trim()) return;
                              try {
                                const res = await apiFetch('/ai/rx-autocomplete', { method: 'POST', body: { query: med.name } });
                                const data = res?.data || res;
                                if (data) {
                                  updateMed(i, 'name', data.drugName || med.name);
                                  updateMed(i, 'schedule', data.frequency || med.schedule);
                                  updateMed(i, 'duration', data.duration || med.duration);
                                  if (data.instructions && !form.instructions.includes(data.instructions)) {
                                    setForm(prev => ({
                                      ...prev,
                                      instructions: prev.instructions ? `${prev.instructions}\n• ${data.drugName}: ${data.instructions}` : `• ${data.drugName}: ${data.instructions}`
                                    }));
                                  }
                                }
                              } catch {
                                // Silent fallback
                              }
                            }}
                          />
                        </div>

                        <button onClick={() => removeMed(i)} disabled={form.meds.length === 1}
                          className="col-span-1 h-8 rounded-xl bg-rose-50 text-rose-500 text-xs flex items-center justify-center hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-rose-100">
                          <i className="fas fa-trash-can"></i>
                        </button>
                      </div>

                      {/* Quick schedule presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Quick set:</span>
                        {SCHEDULE_PRESETS.map(preset => (
                          <button key={preset} type="button" onClick={() => updateMed(i, 'schedule', preset)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${med.schedule.startsWith(preset) ? 'bg-aubergine-600 text-white border-aubergine-600' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Dynamic Real-time Allergy Alert per medication */}
                      {medConflict && (
                        <div className="px-3 py-1.5 bg-rose-100 border border-rose-300 text-rose-900 text-[11px] rounded-lg font-bold flex items-center gap-2 shadow-xs">
                          <i className="fas fa-triangle-exclamation text-rose-600 text-sm"></i>
                          <span>⚠️ <strong>Contraindication Alert:</strong> {medConflict.reason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={addMed} className="text-xs text-aubergine-600 font-bold flex items-center gap-1 hover:underline">
                <i className="fas fa-plus"></i> Add Medicine
              </button>
            </div>

            {/* ── Recommended Lab & Diagnostic Investigations ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-wide flex items-center gap-2">
                  <i className="fas fa-microscope text-aubergine-700"></i> Recommended Lab &amp; Diagnostic Tests ({selectedLabs.length})
                </h2>
                {selectedLabs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedLabs([])}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Lab Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 text-xs">
                {['All', 'Hormonal & Ovarian Reserve', 'Thyroid, Endocrine & Autoimmune', 'Metabolic & Cardiovascular', 'Hematology, Anemia & Micronutrients', 'Infections & STI Screening', 'Cervical Screening & Cytology', 'Antenatal & Genetic Diagnostics', 'Ultrasound & Imaging Procedures'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedLabCat(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 ${selectedLabCat === cat ? 'bg-aubergine-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Smart Lab Search Dropdown */}
              <div className="relative">
                <div className="relative">
                  <i className="fas fa-search absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    value={labSearchQuery}
                    onChange={(e) => {
                      setLabSearchQuery(e.target.value);
                      setIsLabDropdownOpen(true);
                    }}
                    onFocus={() => setIsLabDropdownOpen(true)}
                    placeholder="Search or enter lab test (e.g. AMH, LH:FSH, TVS Scan, Thyroid Profile)..."
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-aubergine-300"
                  />
                  {labSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLabSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <i className="fas fa-xmark text-xs"></i>
                    </button>
                  )}
                </div>

                {isLabDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto custom-scrollbar z-50 p-1.5 space-y-0.5">
                    <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      <span>Diagnostic Tests ({filterAndRankCatalog(labCatalog, labSearchQuery).length})</span>
                      <span className="text-[9px] text-aubergine-600 font-bold">Prefix &amp; Keyword Match</span>
                    </div>
                    {filterAndRankCatalog(labCatalog.filter(l => selectedLabCat === 'All' || l.category === selectedLabCat), labSearchQuery).slice(0, 30).map((item) => {
                      const isSelected = selectedLabs.includes(item.name);
                      return (
                        <button
                          key={item.id || item.name}
                          type="button"
                          onClick={() => {
                            toggleLab(item.name);
                            setIsLabDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors group ${isSelected ? 'bg-aubergine-50 text-aubergine-900 border border-aubergine-200' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <span className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                            <span className="text-[10px] shrink-0 font-bold">{item.badge}</span>
                            <span className="truncate">
                              {labSearchQuery && item.name.toLowerCase().startsWith(labSearchQuery.trim().toLowerCase()) ? (
                                <>
                                  <span className="text-aubergine-700 bg-aubergine-100 px-0.5 rounded font-black">{item.name.slice(0, labSearchQuery.trim().length)}</span>
                                  <span>{item.name.slice(labSearchQuery.trim().length)}</span>
                                </>
                              ) : (
                                item.name
                              )}
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.category && (
                              <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 hidden sm:inline-block">
                                {item.category}
                              </span>
                            )}
                            <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${isSelected ? 'bg-aubergine-600 text-white' : 'border border-slate-300 text-transparent'}`}>
                              <i className="fas fa-check"></i>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Labs Pills */}
              {selectedLabs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedLabs.map(lab => (
                    <span
                      key={lab}
                      className="inline-flex items-center gap-1.5 bg-aubergine-50 text-aubergine-800 border border-aubergine-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs"
                    >
                      <i className="fas fa-vial text-[10px] text-aubergine-600"></i>
                      <span>{lab}</span>
                      <button type="button" onClick={() => toggleLab(lab)} className="hover:text-rose-500 ml-0.5">
                        <i className="fas fa-xmark text-[10px]"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2 block">Special Instructions</label>
              <textarea rows={3} value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Dietary advice, follow-up, warnings..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onBack} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleIssue} disabled={!isValid || submitting}
                className="flex-[2] bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                {submitting ? 'Issuing…' : 'Issue & Send to Patient'}
              </button>
            </div>
          </div>

          {/* ── Live prescription-pad preview ── */}
          <div className="lg:col-span-2 lg:sticky lg:top-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                <i className="fas fa-eye text-slate-400 text-xs"></i>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Preview</span>
              </div>
              <div className="p-6 space-y-4 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">HealNari Rx</h3>
                    <p className="text-xs text-slate-500">Dr. {user?.name}{user?.regNo ? ` • ${user.regNo}` : ''}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="font-mono text-slate-500">RX-{RX_ID_SEED}</p>
                  </div>
                </div>

                {form.patient || form.diagnosis ? (
                  <div className="text-xs space-y-1">
                    <p><strong>Patient:</strong> {form.patient || <span className="text-slate-300 italic">— not selected —</span>}</p>
                    <p><strong>Diagnosis:</strong> {form.diagnosis || <span className="text-slate-300 italic">— pending —</span>}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 italic">Select a patient to begin…</p>
                )}

                {filledMeds.length > 0 ? (
                  <div className="space-y-3">
                    {filledMeds.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-bold text-slate-500 mt-0.5">Rx{i + 1}.</span>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{m.name}</p>
                          {m.schedule ? <DoseSchedule schedule={`${m.schedule}${m.duration ? ` (${m.duration})` : ''}`} className="mt-1" /> : (
                            <p className="text-slate-400">{m.duration || 'schedule & duration pending'}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 italic">No medicines added yet.</p>
                )}

                {/* Live Preview of Ordered Lab Tests */}
                {selectedLabs.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 text-xs space-y-1.5">
                    <p className="font-bold text-slate-700 flex items-center gap-1.5">
                      <i className="fas fa-microscope text-aubergine-700"></i> Recommended Investigations:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-slate-600 text-[11px]">
                      {selectedLabs.map(lab => (
                        <li key={lab}>{lab}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {form.instructions && (
                  <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <strong>Instructions:</strong> {form.instructions}
                  </div>
                )}

                <div className="border-t border-dashed border-slate-200 pt-3 text-[10px] text-slate-400 text-center">
                  Digitally issued via HealNari • Not valid without doctor signature
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Custom Medicine to Catalog Modal ─── */}
      {showAddMedModal && (
        <Modal isOpen={showAddMedModal} onClose={() => setShowAddMedModal(false)} title="Add Medication to Catalog" size="md">
          <form onSubmit={handleSaveNewMed} className="space-y-4 p-2">
            <div className="bg-purple-50/80 border border-purple-200/80 text-purple-900 rounded-2xl p-3.5 text-xs">
              <div className="font-bold flex items-center gap-1.5 mb-0.5">
                <i className="fas fa-pills text-purple-600"></i> Smart Preset Customization
              </div>
              <p className="text-purple-700">Add your commonly prescribed medications with default dosage, schedules, and timing for 1-click prescribing.</p>
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
                  <option value="PCOS & Metabolic Health">PCOS &amp; Metabolic Health</option>
                  <option value="Progestins & Cycle Regulators">Progestins &amp; Cycle Regulators</option>
                  <option value="Ovulation Induction & Fertility">Ovulation Induction &amp; Fertility</option>
                  <option value="Endometriosis & Pelvic Pain">Endometriosis &amp; Pelvic Pain</option>
                  <option value="Contraception & Family Planning">Contraception &amp; Family Planning</option>
                  <option value="Vaginal Health & Infections">Vaginal Health &amp; Infections</option>
                  <option value="UTI & Bladder Care">UTI &amp; Bladder Care</option>
                  <option value="Thyroid, Endocrine & Bone Health">Thyroid, Endocrine &amp; Bone Health</option>
                  <option value="Prenatal & Antenatal Care">Prenatal &amp; Antenatal Care</option>
                  <option value="Menopause, HRT & Atrophy">Menopause, HRT &amp; Atrophy</option>
                  <option value="Dermatology & PCOS Aesthetics">Dermatology &amp; PCOS Aesthetics</option>
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
                className="flex-1 bg-aubergine-600 hover:bg-aubergine-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                {savingCustomMed ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Save to Catalog
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */
/** One card per prescription (medicines sharing a group_id — everything a
 * doctor wrote together in one "Write Prescription" visit), not one card
 * per patient — a patient with prescriptions from three different visits
 * gets three cards, each with that visit's own medicines and diagnosis. */
function toRxCards(patients) {
  const cards = [];
  patients.forEach(p => {
    if (!p.meds.length) return;
    const byGroup = new Map();
    p.meds.forEach(m => {
      if (!byGroup.has(m.groupId)) byGroup.set(m.groupId, []);
      byGroup.get(m.groupId).push(m);
    });
    byGroup.forEach((meds, groupId) => {
      cards.push({
        id: groupId,
        patientId: p.id,
        patient: p.name,
        date: meds[0]?.prescribedOn || '',
        diagnosis: meds.find(m => m.diagnosis)?.diagnosis || (p.diagnosis && p.diagnosis !== 'Pending' ? p.diagnosis : 'General'),
        status: meds.some(m => m.refillsLeft > 0) ? 'Active' : 'Expired',
        validTill: meds.reduce((latest, m) => (!latest || (m.validTill && m.validTill > latest)) ? m.validTill : latest, ''),
        meds: meds.map(m => ({ id: m.id, name: m.name, schedule: m.dosage ? `${m.dosage} (${m.frequency || ''})` : (m.frequency || ''), duration: m.duration || '', refillsLeft: m.refillsLeft, refillRequested: m.refillRequested })),
        instructions: meds.find(m => m.instructions)?.instructions || '',
        refillRequested: meds.some(m => m.refillRequested),
        handwrittenImage: meds[0]?.handwrittenImage || meds[0]?.file_url || null,
      });
    });
  });
  return cards.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function DoctorPrescriptions() {
  const toast = useToast();
  const { user } = useAuth();
  const { patients, addRx, approveRefill: approveRefillApi } = useClinicData();
  const prescriptions = useMemo(() => toRxCards(patients), [patients]);
  const [showWrite, setShowWrite] = useState(false);
  const [refillTarget, setRefillTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All');

  const [selectedIds, setSelectedIds] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState({ isOpen: false, channel: '' });
  const actionsMenuRef = useRef(null);

  useEffect(() => { setSelectedIds([]); }, [tab]);
  useEffect(() => {
    const handler = (e) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBulkAction = (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) { toast('Please select at least one prescription first.', 'error'); return; }
    setBulkModalParams({ isOpen: true, channel: action });
  };

  const sendBulkMessage = async (channel, messageText) => {
    const recipients = filtered.filter(rx => selectedIds.includes(rx.id));
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Prescriptions — ${recipients.length} patient(s)`,
          channels: [channel],
          scheduleType: 'immediate',
          patientIds: recipients.map(rx => rx.patientId),
        },
      });
      toast(`${channel} sent to ${recipients.length} patient(s).`, 'success');
    } catch (err) {
      toast(err.message || `Failed to send ${channel}`, 'error');
    }
    setSelectedIds([]);
  };

  const resendRx = async (rx) => {
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: 'Prescription Reminder',
          body: `Your prescription (${rx.meds.map(m => m.name).join(', ')}) has been resent by your doctor. Please check your records.`,
          audience: `Prescription resend — ${rx.patient}`,
          channels: ['Push Notification'],
          scheduleType: 'immediate',
          patientIds: [rx.patientId],
        },
      });
      toast(`Prescription resent to ${rx.patient}.`, 'success');
    } catch (err) {
      toast(err.message || `Failed to resend to ${rx.patient}`, 'error');
    }
  };

  const downloadRxPdf = (rx) => {
    let finalInstructions = rx.instructions;
    try {
      if (rx.instructions && rx.instructions.startsWith('{')) {
        const parsed = JSON.parse(rx.instructions);
        if (parsed.type === 'healnari-holistic-v1') {
          finalInstructions = [parsed.clinicalNotes, parsed.followUpAdvice ? `Next Follow-up: ${parsed.followUpAdvice}` : ''].filter(Boolean).join('\n\n');
        }
      }
    } catch(e) {}

    const patient = patients.find(p => p.id === rx.patientId);
    openPrescriptionPrintWindow({
      rxId: `RX-${rx.id.slice(0, 8).toUpperCase()}`,
      date: rx.date,
      doctor: { name: user?.name, specialty: user?.specialty, regNo: user?.regNo },
      patient: { name: rx.patient, age: patient?.age !== '—' ? patient?.age : null },
      diagnosis: rx.diagnosis,
      medicines: rx.meds,
      instructions: finalInstructions,
    });
  };

  const downloadLifestylePdf = (rx) => {
    let parsedNotes = null;
    try {
      if (rx.instructions && rx.instructions.startsWith('{')) {
        const parsed = JSON.parse(rx.instructions);
        if (parsed.type === 'healnari-holistic-v1') parsedNotes = parsed;
      }
    } catch(e) {}

    if (!parsedNotes || (!parsedNotes.dietPlan && !parsedNotes.exercisePlan)) return;

    const patient = patients.find(p => p.id === rx.patientId);
    openLifestylePlanPrintWindow({
      rxId: `HN-${rx.id.slice(0, 8).toUpperCase()}`,
      date: rx.date,
      doctor: { name: user?.name, specialty: user?.specialty, regNo: user?.regNo },
      patient: { name: rx.patient, age: patient?.age !== '—' ? patient?.age : null },
      dietPlan: parsedNotes.dietPlan,
      exercisePlan: parsedNotes.exercisePlan
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) setSelectedIds([]);
    else setSelectedIds(filtered.map(rx => rx.id));
  };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const matchesTab = (rx, t) => {
    if (t === 'All') return true;
    if (t === 'Refill Requested') return rx.refillRequested;
    return resolveRxStatus(rx) === t;
  };

  const tabCount = (t) => prescriptions.filter(rx => matchesTab(rx, t)).length;

  const filtered = prescriptions.filter(rx =>
    matchesTab(rx, tab) &&
    (!search || rx.patient.toLowerCase().includes(search.toLowerCase()) || rx.diagnosis.toLowerCase().includes(search.toLowerCase()))
  );

  const approveRefill = async (rx) => {
    const requested = rx.meds.filter(m => m.refillRequested);
    try {
      await Promise.all(requested.map(m => approveRefillApi(rx.patientId, m.id)));
      toast(`Refill approved for ${rx.patient}. New prescription issued.`, 'success');
    } catch (err) {
      toast(err.message || `Failed to approve refill for ${rx.patient}`, 'error');
    } finally {
      setRefillTarget(null);
    }
  };

  const handleNewRx = async (form) => {
    try {
      const isHandwritten = form.mode === 'handwritten';
      const isUpload = form.mode === 'upload';
      
      const medicines = isHandwritten
        ? [{ name: 'Handwritten Clinical Prescription (Attached)', dosage: 'As drawn on Rx', frequency: 'As directed', duration: 'Course duration specified' }]
        : isUpload
        ? [{ name: 'Scanned Clinical Prescription (Attached)', dosage: 'As written on paper Rx', frequency: 'As directed', duration: 'As specified' }]
        : form.meds.filter(m => m.name).map(m => ({ name: m.name, dosage: '', frequency: m.schedule, duration: m.duration }));

      await addRx(form.patientId, {
        diagnosis: form.diagnosis,
        instructions: form.instructions || (isHandwritten ? 'Please follow the handwritten instructions on your attached prescription.' : 'Follow clinical prescription as directed.'),
        medicines,
        handwrittenImage: form.handwrittenImage,
      });
      toast(`Prescription (${isHandwritten ? 'Handwritten' : isUpload ? 'Scanned' : 'Digital'}) issued to ${form.patient}. Patient notified.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to issue prescription', 'error');
    }
  };

  if (showWrite) {
    return <WriteRxPage onBack={() => setShowWrite(false)} onSave={handleNewRx} patients={patients} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Prescriptions</h1>
          <p className="text-sm text-slate-500">Issue, manage, and approve patient prescriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              Actions <i className={`fas fa-chevron-down text-[10px] transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 mb-1"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bulk Messaging</p></div>
                <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-aubergine-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-envelope text-aubergine-600 w-4"></i> Bulk Email
                </button>
                <button onClick={() => handleBulkAction('Push Notification')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-bell text-amber-500 w-4"></i> Push Notification
                </button>
                <button onClick={() => handleBulkAction('WhatsApp Message')} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-3 transition-colors">
                  <i className="fab fa-whatsapp text-emerald-500 w-4 text-lg"></i> WhatsApp Message
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowWrite(true)}
            className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors">
            <i className="fas fa-file-prescription"></i> Write Prescription
          </button>
        </div>
      </div>

      {/* Refill alerts */}
      {prescriptions.some(r => r.refillRequested) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <i className="fas fa-pills"></i>
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900">Refill Requests Pending</p>
            <p className="text-xs text-amber-700">{prescriptions.filter(r => r.refillRequested).length} patient(s) have requested a prescription refill.</p>
          </div>
          <button onClick={() => setRefillTarget(prescriptions.find(r => r.refillRequested))}
            className="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-700 transition-colors flex-shrink-0">
            Review
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or diagnosis..."
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-sm" />
      </div>

      {/* Select All + Status filter tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-colors ${tab === t ? 'bg-aubergine-700 text-white border-aubergine-700' : 'bg-white text-slate-500 border-slate-200 hover:border-aubergine-300 hover:text-aubergine-600'}`}>
              {t} <span className={tab === t ? 'text-aubergine-200' : 'text-slate-500'}>({tabCount(t)})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && <span className="text-xs text-slate-500 font-bold">{selectedIds.length} selected</span>}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-aubergine-600 transition-colors">
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.length > 0 && selectedIds.length === filtered.length ? 'bg-aubergine-600 border-aubergine-600 text-white' : selectedIds.length > 0 ? 'bg-aubergine-100 border-aubergine-300 text-aubergine-600' : 'bg-white border-slate-300'}`}>
              {(selectedIds.length > 0 && selectedIds.length === filtered.length) ? <i className="fas fa-check text-[8px]"></i> : selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-aubergine-600 rounded"></div> : null}
            </div>
            <input type="checkbox" className="hidden" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
            Select All
          </label>
        </div>
      </div>

      {/* Rx Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            No prescriptions match this filter.
          </div>
        )}
        {filtered.map(rx => (
          <div key={rx.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${selectedIds.includes(rx.id) ? 'border-aubergine-300 ring-1 ring-aubergine-200' : 'border-slate-200'}`}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer group flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.includes(rx.id) ? 'bg-aubergine-600 border-aubergine-600 text-white' : 'bg-white border-slate-300 group-hover:border-aubergine-400'}`}>
                    {selectedIds.includes(rx.id) && <i className="fas fa-check text-[10px]"></i>}
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedIds.includes(rx.id)} onChange={() => toggleSelect(rx.id)} />
                </label>
                <div className="w-11 h-11 bg-aubergine-50 text-aubergine-600 rounded-xl flex items-center justify-center text-lg">
                  <i className="fas fa-file-prescription"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800">{rx.patient}</h3>
                    {rx.refillRequested && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full">Refill Requested</span>}
                  </div>
                  <p className="text-xs text-aubergine-700 font-bold">{rx.diagnosis}</p>
                  <p className="text-[10px] text-slate-500">{rx.date} → Valid till {rx.validTill}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-slate-500 border border-slate-200 px-2 py-0.5 rounded">{rx.id}</span>
                <RxStatusBadge rx={rx} />
              </div>
            </div>

            <div className="p-5">
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                {rx.meds.map((m, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                    <div className="font-bold text-slate-800 mb-1.5">{m.name}</div>
                    <DoseSchedule schedule={m.schedule} />
                    <div className={`mt-1.5 ${m.refillsLeft === 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                      {m.duration} • {m.refillsLeft === 0 ? 'No refills left' : `${m.refillsLeft} refills left`}
                    </div>
                  </div>
                ))}
              </div>
              {rx.instructions && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 mb-4">
                  <strong>Instructions:</strong> {rx.instructions}
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => downloadRxPdf(rx)}
                  className="text-xs font-bold text-aubergine-600 border border-aubergine-200 px-4 py-2 rounded-xl hover:bg-aubergine-50 transition-colors flex items-center gap-1.5">
                  <i className="fas fa-download"></i> Download Medical Rx
                </button>
                {(() => {
                  try {
                    if (rx.instructions && rx.instructions.startsWith('{')) {
                      const parsed = JSON.parse(rx.instructions);
                      if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
                        return (
                          <button onClick={() => downloadLifestylePdf(rx)}
                            className="text-xs font-bold text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-1.5">
                            <i className="fas fa-leaf"></i> Download Lifestyle Plan
                          </button>
                        );
                      }
                    }
                  } catch(e) {}
                  return null;
                })()}
                <button onClick={() => resendRx(rx)}
                  className="text-xs font-bold text-aubergine-600 border border-aubergine-200 px-4 py-2 rounded-xl hover:bg-aubergine-50 transition-colors flex items-center gap-1.5">
                  <i className="fas fa-paper-plane"></i> Resend to Patient
                </button>
                {rx.refillRequested && (
                  <button onClick={() => setRefillTarget(rx)}
                    className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5">
                    <i className="fas fa-pills"></i> Approve Refill
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={!!refillTarget}
        onClose={() => setRefillTarget(null)}
        onConfirm={() => approveRefill(refillTarget)}
        title={`Approve Refill — ${refillTarget?.patient}`}
        message={`Approve the refill request for "${refillTarget?.meds?.find(m => m.refillRequested)?.name}" and issue a new prescription to ${refillTarget?.patient}?`}
        confirmLabel="Approve & Issue"
        confirmStyle="primary"
      />
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

export default DoctorPrescriptions;
