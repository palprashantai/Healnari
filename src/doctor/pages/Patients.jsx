import React, { useState, useRef, useEffect, useMemo } from 'react';
import { formatCurrency, getCurrencySymbol } from '../../lib/currency.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast.jsx';
import { useClinicData } from '../../context/ClinicDataContext.jsx';
import { Modal } from '../../components/Modal.jsx';
import { DoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge } from '../../components/RxStatus.jsx';
import { apiFetch } from '../../lib/apiClient.js';
import { buildPatientTimeline } from '../../lib/patientTimeline.js';
import { openPrescriptionPrintWindow, openPatientEmrPrintWindow, openInvoicePrintWindow, openLifestylePlanPrintWindow } from '../../lib/prescriptionPrint.js';
import { AiButton } from '../../components/AiButton.jsx';
import DietAndYogaMakerPage from './DietAndYogaMakerPage.jsx';
import { getProviderCapabilities } from '../../lib/providerCapabilities.js';

/* ─── Bulk Message Modal ──────────────────────── */
function BulkMessageModal({ isOpen, onClose, channel, selectedCount, onSend }) {
  const [templateId, setTemplateId] = useState('');
  const [messageText, setMessageText] = useState('');

  const TEMPLATES = [
    { id: 'T1', name: 'Appointment Reminder', text: 'Dear [Name], this is a friendly reminder for your upcoming appointment.' },
    { id: 'T2', name: 'Follow-up Check-in', text: 'Hi [Name], checking in on your recovery. Please reply if you need any assistance.' },
    { id: 'T3', name: 'Clinic Closed Tomorrow', text: 'Dear [Name], please note that the clinic will be closed tomorrow due to an emergency. We will reschedule your appointment.' },
    { id: 'T4', name: 'General Health Advisory', text: 'Hello [Name], a quick reminder to stay hydrated and take your prescribed supplements.' },
  ];

  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setTemplateId(val);
    if (val) {
      const tmpl = TEMPLATES.find(t => t.id === val);
      if (tmpl) setMessageText(tmpl.text);
    }
  };

  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send ${channel}`} size="sm">
      <div className="space-y-4">
        <div className="bg-aubergine-50 border border-aubergine-200 text-aubergine-800 rounded-xl p-3 text-sm font-bold flex gap-2">
          <i className="fas fa-users mt-1 text-aubergine-600"></i>
          <p>You are about to send a {channel} to {selectedCount} selected patient(s).</p>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Select a Message Template (Optional)</label>
          <select value={templateId} onChange={handleTemplateChange} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300">
            <option value="">-- Start from scratch --</option>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message Content</label>
          <textarea
            rows={4}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder="Type your custom message here..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-y"
          ></textarea>
        </div>
        <div className="pt-2">
          <button
            onClick={() => { onSend(messageText); onClose(); }}
            disabled={!messageText.trim()}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <i className="fas fa-paper-plane"></i> Send {channel}
          </button>
        </div>
      </div>
    </Modal>
  );
}


/* ─── Write Rx — Multi-Medicine Full Prescription Page ─── */
function WriteRxPage({ patient, onBack, onSaveRx }) {
  const { user } = useAuth();
  const toast = useToast();

  const capabilities = useMemo(() => getProviderCapabilities(user), [user]);
  const doctorName = capabilities.displayName;
  const doctorSpecialty = capabilities.specialtyLabel;
  const doctorReg = user?.profile?.registration_no || user?.registrationNo || 'REG-VERIFIED';

  const [diagnosis, setDiagnosis] = useState(
    patient?.diagnosis && patient.diagnosis !== 'Pending'
      ? patient.diagnosis
      : (capabilities.specialtyDef?.commonConditions?.[0] || 'General Consultation')
  );

  const [medicines, setMedicines] = useState([
    {
      id: 1,
      name: '',
      strength: '',
      schedule: '1-0-1',
      timing: 'After Food',
      duration: '30 Days',
      instructions: '',
    },
  ]);

  const [instructions, setInstructions] = useState('');
  const [dietPlan, setDietPlan] = useState('');
  const [exercisePlan, setExercisePlan] = useState('');
  const [followUpAdvice, setFollowUpAdvice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [medCatalog, setMedCatalog] = useState([]);

  // Fetch catalog of medicines for autocompletion
  useEffect(() => {
    apiFetch('/records/catalog?type=medicine')
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.data || [];
        if (items.length > 0) {
          setMedCatalog(
            items.map((i) => ({
              id: i.id,
              name: i.name,
              category: i.category || 'General',
              defaultDose: i.default_dose || '500mg',
              defaultFreq: i.default_freq || '1-0-1',
              defaultTiming: i.default_timing || 'After Food',
              defaultDuration: i.default_duration || '30 Days',
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Quick Diagnosis Chips
  const COMMON_DIAGNOSES = [
    'PCOS (Polycystic Ovary Syndrome)',
    'Irregular Menstrual Cycles',
    'Endometriosis',
    'Dysmenorrhea (Severe Cramps)',
    'Iron Deficiency Anemia',
    'Bacterial Vaginosis / Vaginitis',
    'Urinary Tract Infection (UTI)',
    'Hypothyroidism',
    'Heavy Menstrual Bleeding (Menorrhagia)',
  ];

  // Quick Common Prescribing Medication Templates
  const QUICK_MED_PRESETS = [
    { name: 'Metformin Hydrochloride', strength: '500mg', schedule: '1-0-1', timing: 'After Food', duration: '30 Days', tag: 'PCOS / Insulin' },
    { name: 'Myo-Inositol + D-Chiro Inositol', strength: '2g', schedule: '1-0-1', timing: 'Before Food', duration: '60 Days', tag: 'Ovulation' },
    { name: 'Norethisterone', strength: '5mg', schedule: '1-0-1', timing: 'After Food', duration: '10 Days', tag: 'Cycle Regulation' },
    { name: 'Tranexamic Acid', strength: '500mg', schedule: '1-1-1', timing: 'After Food', duration: '5 Days', tag: 'Heavy Flow SOS' },
    { name: 'Dydrogesterone', strength: '10mg', schedule: '1-0-1', timing: 'After Food', duration: '14 Days', tag: 'Luteal Support' },
    { name: 'Ferrous Ascorbate + Folic Acid', strength: '100mg / 1.5mg', schedule: '0-0-1', timing: 'After Food', duration: '30 Days', tag: 'Anemia' },
    { name: 'Vitamin D3 (Cholecalciferol)', strength: '60,000 IU', schedule: 'Weekly Once', timing: 'After Food', duration: '60 Days', tag: 'Weekly' },
    { name: 'Drospirenone + Ethinylestradiol', strength: '3mg / 0.03mg', schedule: '0-0-1', timing: 'At Bedtime', duration: '28 Days', tag: 'Oral Contraceptive' },
  ];

  // Quick Instructions Chips
  const QUICK_INSTRUCTIONS = [
    'Take all medications with a full glass of water.',
    'Take strictly after meals to prevent gastric discomfort.',
    'Drink at least 2.5 – 3 Litres of water daily.',
    'Follow a low-glycemic, anti-inflammatory whole-foods diet.',
    'Avoid alcohol, tobacco, and sugary beverages.',
    'Repeat pelvic ultrasound scan (USG) in 3 months.',
    'Schedule follow-up consultation in 14 days.',
    'SOS: Seek immediate ER care if excessive bleeding or severe acute pain occurs.',
  ];

  const handleAddMedicine = (preset = null) => {
    if (preset) {
      // If the only current row is untouched & empty, replace it; otherwise append
      if (medicines.length === 1 && !medicines[0].name.trim() && !medicines[0].strength.trim()) {
        setMedicines([
          {
            id: Date.now(),
            name: preset.name,
            strength: preset.strength,
            schedule: preset.schedule,
            timing: preset.timing,
            duration: preset.duration,
            instructions: '',
          },
        ]);
      } else {
        setMedicines((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            name: preset.name,
            strength: preset.strength,
            schedule: preset.schedule,
            timing: preset.timing,
            duration: preset.duration,
            instructions: '',
          },
        ]);
      }
      toast(`Added "${preset.name} ${preset.strength}" to prescription`, 'success');
    } else {
      setMedicines((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: '',
          strength: '',
          schedule: '1-0-1',
          timing: 'After Food',
          duration: '30 Days',
          instructions: '',
        },
      ]);
    }
  };

  const handleRemoveMedicine = (id) => {
    if (medicines.length === 1) {
      setMedicines([
        {
          id: Date.now(),
          name: '',
          strength: '',
          schedule: '1-0-1',
          timing: 'After Food',
          duration: '30 Days',
          instructions: '',
        },
      ]);
      return;
    }
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMedicine = (id, field, value) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSelectCatalogItem = (id, catItem) => {
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              name: catItem.name,
              strength: catItem.defaultDose || m.strength || '',
              schedule: catItem.defaultFreq || m.schedule || '1-0-1',
              timing: catItem.defaultTiming || m.timing || 'After Food',
              duration: catItem.defaultDuration || m.duration || '30 Days',
            }
          : m
      )
    );
    setActiveDropdownIndex(null);
  };

  const handleAddInstructionChip = (chipText) => {
    setInstructions((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return `• ${chipText}`;
      if (trimmed.includes(chipText)) return prev;
      return `${trimmed}\n• ${chipText}`;
    });
  };

  const validMedicines = medicines.filter((m) => m.name.trim().length > 0);

  const handleSubmit = async (isDraft = false) => {
    if (validMedicines.length === 0 && !dietPlan.trim() && !exercisePlan.trim() && !instructions.trim()) {
      toast('Please enter medications, diet & nutrition plan, or clinical instructions.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let formattedMeds = validMedicines.map((m) => {
        const medTitle = m.strength.trim() ? `${m.name.trim()} ${m.strength.trim()}` : m.name.trim();
        const schedWithTiming = m.timing ? `${m.schedule} (${m.timing})` : m.schedule;
        return {
          name: medTitle,
          dosage: m.strength || 'Standard',
          schedule: schedWithTiming,
          frequency: schedWithTiming,
          duration: m.duration || '30 Days',
          instructions: m.instructions || undefined,
        };
      });

      if (formattedMeds.length === 0 && (dietPlan.trim() || exercisePlan.trim() || followUpAdvice.trim())) {
        formattedMeds = [{
          name: 'Clinical Lifestyle & Nutrition Protocol',
          dosage: 'Advisory',
          schedule: 'As directed',
          frequency: 'As directed',
          duration: 'Ongoing',
        }];
      }

      const finalInstructions = (dietPlan.trim() || exercisePlan.trim() || followUpAdvice.trim())
        ? JSON.stringify({
            type: 'healnari-holistic-v1',
            clinicalNotes: instructions.trim() || 'Clinical prescription and lifestyle advice.',
            dietPlan: dietPlan.trim(),
            exercisePlan: exercisePlan.trim(),
            followUpAdvice: followUpAdvice.trim(),
          })
        : (instructions.trim() || 'Take all medications as directed.');

      await onSaveRx(patient.id, {
        diagnosis: diagnosis.trim() || 'General Consultation',
        instructions: finalInstructions,
        medicines: formattedMeds,
        followUpAdvice: followUpAdvice.trim(),
        isDraft,
      });
      onBack();
    } catch (err) {
      toast(err.message || 'Failed to save prescription', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
        >
          <i className="fas fa-arrow-left text-aubergine-600"></i> Back to Patient Chart
        </button>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Doctor Portal &gt; Patients &amp; EMR &gt; {patient.name} &gt; <span className="text-slate-700 font-bold">Write Multi-Medicine Prescription</span>
        </p>
      </div>

      {/* Patient Clinical Info Bar */}
      <div className="bg-gradient-to-r from-aubergine-900 via-aubergine-800 to-indigo-950 text-white rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 text-white flex items-center justify-center font-black text-xl flex-shrink-0 shadow-inner">
            {patient.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-black text-lg md:text-xl tracking-tight">{patient.name}</h1>
              <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {patient.mrn || 'HN-532115'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                ● Active Patient
              </span>
            </div>
            <p className="text-xs text-aubergine-200 mt-1 flex items-center gap-3 flex-wrap">
              <span><strong>Age:</strong> {patient.age} Yrs</span>
              <span>•</span>
              <span><strong>Blood:</strong> {patient.blood}</span>
              <span>•</span>
              <span><strong>Phone:</strong> {patient.phone || '—'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {patient.allergies?.length > 0 ? (
            <div className="bg-rose-500/20 border border-rose-400/40 text-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <i className="fas fa-hand text-rose-300"></i> Allergies: {patient.allergies.join(', ')}
            </div>
          ) : (
            <div className="bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <i className="fas fa-shield-halved text-emerald-300"></i> No known drug allergies
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Clinical Diagnosis */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-stethoscope text-aubergine-600"></i> Clinical Diagnosis / Indication *
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Quick pick or type custom</span>
            </div>

            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. PCOS — Insulin Resistant Phenotype, Irregular Cycles, Dysmenorrhea"
              className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50"
            />

            {/* Quick Diagnosis Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 mr-1">Suggested:</span>
              {COMMON_DIAGNOSES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiagnosis(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                    diagnosis === d
                      ? 'bg-aubergine-700 text-white border-aubergine-800 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {d.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Quick Medication Presets */}
          <div className="bg-gradient-to-br from-aubergine-50/70 to-indigo-50/50 rounded-3xl border border-aubergine-100 p-5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-aubergine-900 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-bolt-lightning text-amber-500"></i> Quick Add Common Medications (1-Click)
              </h3>
              <span className="text-[11px] text-aubergine-600 font-bold">Women's Health Protocol</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_MED_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleAddMedicine(preset)}
                  className="bg-white hover:bg-aubergine-600 hover:text-white text-slate-700 border border-slate-200 hover:border-aubergine-600 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 group"
                >
                  <i className="fas fa-plus text-[10px] text-aubergine-600 group-hover:text-white"></i>
                  <span>{preset.name}</span>
                  <span className="text-[10px] opacity-70">({preset.strength})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Prescribed Medications (Multi-row List) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-aubergine-100 text-aubergine-700 flex items-center justify-center text-sm font-black">
                  {medicines.length}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Prescribed Medications</h3>
                  <p className="text-[11px] text-slate-500">Add multiple medications with individualized directions</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddMedicine()}
                className="bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 font-bold px-3.5 py-1.5 rounded-xl text-xs border border-aubergine-200 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <i className="fas fa-plus"></i> Add Medicine
              </button>
            </div>

            {/* Dynamic Medicine Cards */}
            <div className="space-y-4">
              {medicines.map((med, idx) => {
                const isDropdownOpen = activeDropdownIndex === idx;
                const filteredCatalog = filterAndRankCatalog(medCatalog, med.name);

                return (
                  <div
                    key={med.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-aubergine-200 transition-all space-y-3 relative group"
                  >
                    {/* Medicine Row Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-aubergine-700 text-white font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {med.name.trim() ? med.name : `Medication #${idx + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(med.id)}
                            title="Remove this medication"
                            className="text-slate-400 hover:text-rose-600 font-bold text-xs p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Medication Name & Dosage */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Name with Autocomplete */}
                      <div className="sm:col-span-8 relative">
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                          Medication / Generic Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={med.name}
                            onChange={(e) => {
                              handleUpdateMedicine(med.id, 'name', e.target.value);
                              setActiveDropdownIndex(idx);
                            }}
                            onFocus={() => setActiveDropdownIndex(idx)}
                            placeholder="e.g. Metformin, Myo-Inositol, Norethisterone"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
                          />
                          {med.name && (
                            <button
                              type="button"
                              onClick={() => handleUpdateMedicine(med.id, 'name', '')}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              <i className="fas fa-xmark text-xs"></i>
                            </button>
                          )}
                        </div>

                        {/* Catalog Suggestions Dropdown */}
                        {isDropdownOpen && filteredCatalog.length > 0 && med.name.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 text-xs animate-fade-in">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                              Catalog Suggestions
                            </div>
                            {filteredCatalog.slice(0, 6).map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectCatalogItem(med.id, item)}
                                className="w-full text-left px-3 py-2 hover:bg-aubergine-50 rounded-xl transition-colors flex items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">{item.category}</span>
                                </div>
                                <span className="text-[10px] font-bold text-aubergine-700 bg-aubergine-100/70 px-2 py-0.5 rounded-md">
                                  {item.defaultDose || 'Standard'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Strength / Dosage */}
                      <div className="sm:col-span-4">
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                          Strength / Dosage
                        </label>
                        <input
                          type="text"
                          value={med.strength}
                          onChange={(e) => handleUpdateMedicine(med.id, 'strength', e.target.value)}
                          placeholder="e.g. 500mg, 2g, 5mg"
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Schedule, Timing, and Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                          Dose Frequency
                        </label>
                        <select
                          value={med.schedule}
                          onChange={(e) => handleUpdateMedicine(med.id, 'schedule', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
                        >
                          <option value="1-0-1">1-0-1 (Morning & Night)</option>
                          <option value="1-0-0">1-0-0 (Morning Only)</option>
                          <option value="0-0-1">0-0-1 (Night Only)</option>
                          <option value="1-1-1">1-1-1 (Thrice Daily)</option>
                          <option value="1-0-0-1">1-0-0-1 (Morning & Bedtime)</option>
                          <option value="PRN">PRN (SOS / As Needed)</option>
                          <option value="Weekly Once">Weekly Once</option>
                          <option value="Alternate Days">Alternate Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                          Food Timing
                        </label>
                        <select
                          value={med.timing}
                          onChange={(e) => handleUpdateMedicine(med.id, 'timing', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
                        >
                          <option value="After Food">After Food</option>
                          <option value="Before Food">Before Food</option>
                          <option value="With Food">With Food / Meals</option>
                          <option value="Empty Stomach">Empty Stomach</option>
                          <option value="At Bedtime">At Bedtime</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleUpdateMedicine(med.id, 'duration', e.target.value)}
                          placeholder="e.g. 10 Days, 30 Days"
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Quick Duration Pills */}
                    <div className="flex items-center gap-1.5 text-[10px] overflow-x-auto hide-scrollbar pt-0.5">
                      <span className="text-slate-400 font-bold uppercase shrink-0">Duration:</span>
                      {['5 Days', '10 Days', '14 Days', '21 Days', '30 Days', '60 Days', '90 Days'].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleUpdateMedicine(med.id, 'duration', dur)}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all shrink-0 ${
                            med.duration === dur
                              ? 'bg-aubergine-700 text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>

                    {/* Optional Specific Note for this Med */}
                    <div>
                      <input
                        type="text"
                        value={med.instructions || ''}
                        onChange={(e) => handleUpdateMedicine(med.id, 'instructions', e.target.value)}
                        placeholder="Specific directions (e.g. Dissolve in 100ml water, Take 30 mins before breakfast)..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-aubergine-300 bg-white placeholder-slate-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Another Medicine CTA */}
            <button
              type="button"
              onClick={() => handleAddMedicine()}
              className="w-full border-2 border-dashed border-aubergine-200 hover:border-aubergine-400 bg-aubergine-50/30 hover:bg-aubergine-50 text-aubergine-700 font-bold py-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-plus-circle text-sm"></i>
              <span>+ Add Another Medicine to this Prescription</span>
            </button>
          </div>

          {/* Section 3b: Diet & Clinical Nutrition Plan */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-seedling text-emerald-600 text-sm"></i> Clinical Diet &amp; Nutrition Plan
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Doctor &amp; Nutritionist
              </span>
            </div>
            <textarea
              rows={3}
              value={dietPlan}
              onChange={(e) => setDietPlan(e.target.value)}
              placeholder="e.g. Low glycemic index whole foods, 25-30g protein per main meal, 30g+ dietary fibre daily, anti-inflammatory Mediterranean principles, hydration guidelines..."
              className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50/20 resize-none"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
              <span className="text-slate-400 font-bold text-[10px] uppercase">Quick Add:</span>
              {['Personalized Low-GI Plate', 'Protein Balance (20-30g/meal)', 'Fiber & Prebiotics (30g+/day)', 'Plant Polyphenols & Omega-3', 'Regular Meal Timing & Hydration', 'Sustainable Cultural Customization'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDietPlan((p) => (p ? `${p}, ${tag}` : tag))}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3c: Yoga & Mindful Movement Protocol */}
          <div className="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-om text-amber-600 text-sm"></i> Yoga &amp; Mindful Movement Protocol
              </label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Yoga Specialist &amp; Trainer
              </span>
            </div>
            <textarea
              rows={3}
              value={exercisePlan}
              onChange={(e) => setExercisePlan(e.target.value)}
              placeholder="e.g. 150m moderate movement weekly, gentle pelvic yoga (Badhakonasana, Cat-Cow), diaphragmatic breathing (Pranayama), resistance training 2x/wk..."
              className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/20 resize-none"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
              <span className="text-slate-400 font-bold text-[10px] uppercase">Quick Add:</span>
              {['Beginner Movement (Walking/Steps)', 'Gentle Yoga & Asanas', 'Flexibility & Pelvic Mobility', 'Relaxation & Restorative', 'Breathing & Mindfulness (Pranayama)', 'Strength & Resistance (2-3x/wk)'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setExercisePlan((p) => (p ? `${p}, ${tag}` : tag))}
                  className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3d: Recommended Next Follow-Up */}
          <div className="bg-white rounded-3xl p-6 border border-purple-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-purple-800 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-calendar-check text-purple-600 text-sm"></i> Recommended Next Follow-Up
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Auto-populates to patient reminder</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: '+ 1 Week (Acute)', text: 'Review in 1 week' },
                { label: '+ 2 Weeks (Titration)', text: 'Review in 2 weeks with symptom log' },
                { label: '+ 1 Month (Cycle check)', text: 'Review in 1 month' },
                { label: '+ 6 Weeks (PCOS titration)', text: 'Review in 6 weeks with repeat fasting insulin' },
                { label: '+ Post Lab Reports', text: 'Review immediately upon lab test completion' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setFollowUpAdvice(chip.text)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    followUpAdvice === chip.text
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-purple-50/70 hover:bg-purple-100 text-purple-800 border-purple-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={followUpAdvice}
              onChange={(e) => setFollowUpAdvice(e.target.value)}
              placeholder="Or specify custom follow-up timeframe..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            />
          </div>

          {/* Section 4: General Clinical Instructions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-clipboard-user text-aubergine-600"></i> Additional Clinical Precautions
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Click chips below to auto-insert</span>
            </div>

            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. • Take all medications strictly after food.&#10;• Maintain 3L water intake daily.&#10;• Review in 14 days or SOS if symptoms persist."
              className="w-full border border-slate-200 rounded-2xl p-4 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50/50 resize-y"
            />

            {/* Quick Clinical Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_INSTRUCTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAddInstructionChip(chip)}
                  className="bg-slate-100 hover:bg-aubergine-100 hover:text-aubergine-800 text-slate-600 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border border-slate-200 flex items-center gap-1"
                >
                  <i className="fas fa-plus text-[9px] text-slate-400"></i>
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-2xl text-xs hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || (validMedicines.length === 0 && !dietPlan.trim() && !exercisePlan.trim() && !instructions.trim())}
              className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold py-3 px-5 rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <i className="fas fa-file-pen text-amber-600"></i>
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || (validMedicines.length === 0 && !dietPlan.trim() && !exercisePlan.trim() && !instructions.trim())}
              className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Signing &amp; Saving…</span>
                </>
              ) : (
                <>
                  <i className="fas fa-signature"></i>
                  <span>Finalize &amp; Sign Protocol {validMedicines.length > 0 ? `(${validMedicines.length} Meds)` : '(Lifestyle Regimen)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Prescription Pad Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-slate-800 font-sans">
            {/* Pad Banner */}
            <div className="bg-gradient-to-r from-aubergine-900 to-aubergine-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <i className="fas fa-prescription text-amber-400 text-lg"></i>
                <div>
                  <h3 className="font-black text-sm">Live Prescription Preview</h3>
                  <p className="text-[10px] text-aubergine-200">Real-time digital EMR Rx preview</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-full">
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Simulated Clinical Rx Sheet */}
            <div className="p-5 space-y-4 text-xs bg-[#fdfdfd]">
              {/* Header */}
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <h4 className="font-black text-slate-900 text-sm tracking-tight">HealNari Women's Health Clinic</h4>
                  <p className="text-[10px] text-slate-500">Center for Gynaecology &amp; Reproductive Wellness</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Indiranagar, Bengaluru • Ph: +91 80 4567 8900</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-serif font-black text-aubergine-700">℞</span>
                </div>
              </div>

              {/* Patient Bar */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patient</p>
                  <p className="font-black text-slate-800">{patient.name}</p>
                  <p className="text-slate-500">{patient.age} Yrs / {patient.blood} • {patient.mrn || 'HN-532115'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prescribing Doctor</p>
                  <p className="font-bold text-slate-800">{doctorName}</p>
                  <p className="text-slate-500 text-[10px]">{doctorSpecialty} • {doctorReg}</p>
                </div>
              </div>

              {/* Diagnosis Bar */}
              <div className="px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Diagnosis</span>
                <span className="font-bold text-aubergine-900 text-xs">
                  {diagnosis || 'General Consultation & Health Evaluation'}
                </span>
              </div>

              {/* Prescribed Medications Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Rx Medications ({validMedicines.length})
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                      <tr>
                        <th className="py-1.5 px-2.5">#</th>
                        <th className="py-1.5 px-2.5">Medication &amp; Dose</th>
                        <th className="py-1.5 px-2.5">Frequency</th>
                        <th className="py-1.5 px-2.5">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validMedicines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                            No medications added yet. Type or pick from presets above.
                          </td>
                        </tr>
                      ) : (
                        validMedicines.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2.5 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2 px-2.5 font-bold text-slate-900">
                              <div>{m.name}</div>
                              {m.strength && (
                                <span className="text-[10px] font-semibold text-aubergine-700 bg-aubergine-50 px-1.5 py-0.2 rounded border border-aubergine-100">
                                  {m.strength}
                                </span>
                              )}
                              {m.instructions && (
                                <p className="text-[10px] text-slate-500 font-normal italic mt-0.5">
                                  {m.instructions}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-2.5">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {m.schedule}
                              </span>
                              {m.timing && (
                                <div className="text-[10px] text-slate-500 mt-0.5">{m.timing}</div>
                              )}
                            </td>
                            <td className="py-2 px-2.5 font-semibold text-slate-700">{m.duration}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diet Plan Preview */}
              {dietPlan.trim() && (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-950 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-900 text-[10px] uppercase tracking-wider">
                    <i className="fas fa-seedling text-emerald-600"></i> Clinical Diet &amp; Nutrition Plan:
                  </span>
                  <p className="whitespace-pre-line text-xs font-medium leading-relaxed">{dietPlan}</p>
                </div>
              )}

              {/* Yoga & Movement Preview */}
              {exercisePlan.trim() && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900 text-[10px] uppercase tracking-wider">
                    <i className="fas fa-om text-amber-600"></i> Yoga &amp; Mindful Movement:
                  </span>
                  <p className="whitespace-pre-line text-xs font-medium leading-relaxed">{exercisePlan}</p>
                </div>
              )}

              {/* Follow-up Target Preview */}
              {followUpAdvice.trim() && (
                <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-2.5 text-[11px] text-purple-950 flex items-center gap-2">
                  <i className="fas fa-calendar-check text-purple-600"></i>
                  <span><strong>Next Follow-up Review:</strong> {followUpAdvice}</span>
                </div>
              )}

              {/* Instructions */}
              {instructions.trim() && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-800 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-slate-700 text-[10px] uppercase tracking-wider">
                    <i className="fas fa-circle-info text-slate-500"></i> Additional Clinical Precautions:
                  </span>
                  <p className="whitespace-pre-line text-xs font-medium leading-relaxed">{instructions}</p>
                </div>
              )}

              {/* Signature Block */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-400">
                <div>
                  <p>Digitally signed &amp; secured</p>
                  <p className="font-mono text-[9px] text-slate-400">HealNari Tele-EMR v2.4</p>
                </div>
                <div className="text-right">
                  <div className="font-serif italic font-bold text-slate-700 text-xs mb-0.5">
                    {doctorName}
                  </div>
                  <p className="text-slate-500 font-semibold">{doctorReg}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

/* ─── Request Lab Report Modal ─────────────────────────── */
function RequestLabReportModal({ isOpen, onClose, patient, onRequest }) {
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [labSearchInput, setLabSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('All');
  const [labCatalog, setLabCatalog] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedLabs([]);
      setLabSearchInput('');
      setIsDropdownOpen(false);
      setDueDate('');
      setNotes('');
      
      apiFetch('/records/catalog?type=lab_test')
        .then(res => {
          const items = Array.isArray(res) ? res : (res?.data || []);
          if (items.length > 0) {
            setLabCatalog(items.map(i => ({
              id: i.id,
              name: i.name,
              category: i.category || 'General',
              badge: i.badge || '🔬 Test',
              isCustom: !!i.doctor_id,
            })));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const toggleLab = (name) => {
    setSelectedLabs(prev => 
      prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]
    );
  };

  const handleAddCustomLab = async (e) => {
    if (e) e.preventDefault();
    const name = labSearchInput.trim();
    if (!name) return;
    if (!selectedLabs.includes(name)) {
      setSelectedLabs(prev => [...prev, name]);
    }
    setLabSearchInput('');
    setIsDropdownOpen(false);

    try {
      const created = await apiFetch('/records/catalog', {
        method: 'POST',
        body: JSON.stringify({
          type: 'lab_test',
          name,
          category: selectedCat !== 'All' ? selectedCat : 'General',
          badge: '🔬 Custom',
        }),
      });
      setLabCatalog(prev => [
        { id: created?.id || Date.now(), name, category: selectedCat !== 'All' ? selectedCat : 'General', badge: '🔬 Custom', isCustom: true },
        ...prev,
      ]);
    } catch {
      // optimistic fallback
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalTests = selectedLabs.length > 0 ? selectedLabs.join(', ') : labSearchInput.trim();
    if (!finalTests) return;
    setSubmitting(true);
    try {
      await onRequest(patient.id, { requestedTests: finalTests, dueDate: dueDate || undefined, notes: notes.trim() || undefined });
      setSelectedLabs([]); setLabSearchInput(''); setDueDate(''); setNotes('');
      onClose();
    } catch {
      // already surfaced to the user via toast in the caller
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTests = filterAndRankCatalog(
    labCatalog.filter(l => selectedCat === 'All' || l.category === selectedCat),
    labSearchInput
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Request Lab Report for ${patient.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Smart Searchable Lab Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 block">
              Test(s) / Panel * {selectedLabs.length > 0 && `(${selectedLabs.length} selected)`}
            </label>
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

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 text-xs">
            {['All', 'Hormonal & Ovarian Reserve', 'Thyroid, Endocrine & Autoimmune', 'Metabolic & Cardiovascular', 'Hematology, Anemia & Micronutrients', 'Infections & STI Screening', 'Cervical Screening & Cytology', 'Antenatal & Genetic Diagnostics', 'Ultrasound & Imaging Procedures'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${selectedCat === cat ? 'bg-aubergine-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="relative">
              <i className="fas fa-microscope absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input
                value={labSearchInput}
                onChange={e => {
                  setLabSearchInput(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search or enter lab test (e.g. AMH, LH, TVS Scan, Thyroid)..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-aubergine-300"
              />
              {labSearchInput && (
                <button
                  type="button"
                  onClick={() => setLabSearchInput('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <i className="fas fa-xmark text-xs"></i>
                </button>
              )}
            </div>

            {/* Prefix-Ranked Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto custom-scrollbar z-50 p-1.5 space-y-0.5">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  <span>Diagnostic Tests ({filteredTests.length})</span>
                  <span className="text-[9px] text-aubergine-700 font-bold">Prefix &amp; Keyword Match</span>
                </div>
                {filteredTests.slice(0, 30).map(item => {
                  const isSelected = selectedLabs.includes(item.name);
                  return (
                    <button
                      key={item.id || item.name}
                      type="button"
                      onClick={() => {
                        toggleLab(item.name);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${isSelected ? 'bg-aubergine-50 text-aubergine-900 border border-aubergine-200' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      <span className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                        <span className="text-[10px] shrink-0 font-bold">{item.badge}</span>
                        <span className="truncate">
                          {labSearchInput && item.name.toLowerCase().startsWith(labSearchInput.trim().toLowerCase()) ? (
                            <>
                              <span className="text-aubergine-700 bg-aubergine-100 px-0.5 rounded font-black">{item.name.slice(0, labSearchInput.trim().length)}</span>
                              <span>{item.name.slice(labSearchInput.trim().length)}</span>
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
                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${isSelected ? 'bg-aubergine-700 text-white' : 'border border-slate-300 text-transparent'}`}>
                          <i className="fas fa-check"></i>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {labSearchInput && !labCatalog.some(l => l.name.toLowerCase() === labSearchInput.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleAddCustomLab}
                    className="w-full text-left px-2.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-800 flex items-center justify-between transition-colors mt-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <i className="fas fa-plus-circle text-purple-600"></i>
                      <span>Add &ldquo;{labSearchInput}&rdquo; to Catalog</span>
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">Save Custom Test</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selected Labs Pills */}
          {selectedLabs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedLabs.map(lab => (
                <span
                  key={lab}
                  className="inline-flex items-center gap-1.5 bg-aubergine-50 text-aubergine-900 border border-aubergine-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs"
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
          <p className="text-[11px] text-slate-500 mt-1">The patient will be notified to get this done externally and upload the report here.</p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="crm-input"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Notes for Patient</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Fasting required before the blood draw"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 crm-btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || (!selectedLabs.length && !labSearchInput.trim())} className="flex-1 crm-btn-primary disabled:opacity-50">
            <i className="fas fa-paper-plane mr-1.5"></i> {submitting ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Record Payment / Charge Modal ─────────────────────────── */
function InlineRecordPaymentModal({ isOpen, onClose, patient, onSavePayment }) {
  const { user } = useAuth();
  const userCurrency = user?.profile?.currency || user?.currency || 'INR';
  const [service, setService] = useState('');
  const [category, setCategory] = useState('Consultation Fee');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI (GPay)');
  const [status, setStatus] = useState('Paid');

  if (!isOpen || !patient) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!service.trim() || !amount) return;
    const newPayment = {
      id: `INV-${Math.floor(7800 + Math.random() * 200)}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      service: service.trim(),
      category: category,
      amount: parseFloat(amount),
      status: status,
      method: method,
      txnRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      invoiceUrl: '#',
    };
    onSavePayment(patient.id, newPayment);
    setService('');
    setAmount('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment / Charge for ${patient.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-bold text-slate-500 mb-1 block">Service / Description *</label>
          <input
            type="text"
            required
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. Follow-up Consultation Fee, Ultrasound Scan, Blood Test"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="Consultation Fee">Consultation Fee</option>
              <option value="Lab & Diagnostics">Lab & Diagnostics</option>
              <option value="Ultrasound Scan">Ultrasound Scan</option>
              <option value="Procedure">Procedure / Treatment</option>
              <option value="Medication">Medication / Pharmacy</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Amount ({getCurrencySymbol(userCurrency)}) *</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 799"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aubergine-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="UPI (GPay)">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Health Insurance">Health Insurance</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Payment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="Paid">Paid (Settled)</option>
              <option value="Pending">Pending</option>
              <option value="Insurance Claimed">Insurance Claimed</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 crm-btn-secondary">
            Cancel
          </button>
          <button type="submit" className="flex-1 crm-btn-primary">
            <i className="fas fa-receipt mr-1.5"></i> Save Payment Invoice
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── View Invoice Modal ─────────────────────────── */
function ViewInvoiceModal({ invoice, patient, isOpen, onClose }) {
  const { user } = useAuth();
  const userCurrency = user?.profile?.currency || user?.currency || 'INR';
  if (!isOpen || !invoice || !patient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Payment Invoice" size="md">
      <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-6 text-slate-800 font-sans shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-aubergine-900 tracking-tight">HealNari Clinic</h2>
            <p className="text-xs text-slate-500">Medical Billing &amp; Payment Receipt</p>
            <p className="text-[11px] text-slate-500 mt-0.5">GSTIN: 29AAAAA0000A1Z5</p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              ● {invoice.status}
            </span>
            <p className="text-xs font-mono font-bold text-slate-600 mt-1">{invoice.id}</p>
            <p className="text-[11px] text-slate-500">{invoice.date}</p>
          </div>
        </div>

        {/* Patient Bar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-500 font-bold uppercase text-[10px]">Billed To</p>
            <p className="font-black text-slate-800 text-sm mt-0.5">{patient.name}</p>
            <p className="text-slate-600">{patient.phone}</p>
          </div>
          <div>
            <p className="text-slate-500 font-bold uppercase text-[10px]">Payment Details</p>
            <p className="font-bold text-slate-800 text-xs mt-0.5">{invoice.method}</p>
            <p className="text-slate-500 font-mono text-[11px]">Ref: {invoice.txnRef}</p>
          </div>
        </div>

        {/* Table */}
        <div className="crm-table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Category</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-slate-800">{invoice.service}</td>
                <td>{invoice.category}</td>
                <td className="text-right font-black text-slate-900">{formatCurrency(invoice.amount, invoice.currency || userCurrency)}</td>
              </tr>
            </tbody>
          </table>
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-[14px]">
            <span className="font-bold text-slate-700">Total Billed Amount Paid</span>
            <span className="font-black text-aubergine-900 text-[16px]">{formatCurrency(invoice.amount, invoice.currency || userCurrency)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => openInvoicePrintWindow({
              invoice,
              patient,
              doctor: { name: 'Dr. Sarah Mitchell', regNo: 'KMC-84920' },
              currency: invoice.currency || userCurrency
            })}
            className="flex-1 crm-btn-primary flex items-center justify-center gap-2"
          >
            <i className="fas fa-print mr-2"></i> Print Invoice PDF
          </button>
          <button onClick={onClose} className="flex-1 crm-btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── View Rx Document Modal ─────────────────────────── */
function ViewRxDocModal({ rx, patient, labRequests, isOpen, onClose }) {
  if (!isOpen || !rx || !patient) return null;

  const matchingLabTests = (labRequests || []).filter(
    r => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '') === rx.date
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Prescription Document" size="lg">
      <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-6 text-slate-800 font-sans shadow-sm">
        {/* Clinic Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-aubergine-900 tracking-tight">HealNari Multi-Specialty Clinic</h2>
            <p className="text-xs text-slate-500">Integrated Medical &amp; Holistic Specialist Care Services</p>
            <p className="text-[11px] text-slate-500 mt-1">Digital Tele-EMR &amp; Healthcare Hub • Phone: +91 80 4567 8900</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-serif text-aubergine-800 font-bold">Rx</span>
            <p className="text-xs font-mono font-bold text-slate-500">{rx.id}</p>
            <p className="text-xs text-slate-500">{rx.date}</p>
          </div>
        </div>

        {/* Doctor & Patient Bar */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs">
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Patient Information</p>
            <p className="font-black text-slate-800 text-sm mt-0.5">{patient.name}</p>
            <p className="text-slate-600">{patient.age} Yrs {patient.gender ? `/ ${patient.gender}` : ''} / {patient.blood} • {patient.phone}</p>
            <p className="text-aubergine-700 font-bold mt-1">Diagnosis: {patient.diagnosis}</p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Prescribing Specialist</p>
            <p className="font-black text-slate-800 text-sm mt-0.5">{rx.prescribedBy || 'Attending Practitioner'}</p>
            <p className="text-slate-600">{rx.doctorSpecialty || 'Clinical Specialist'}</p>
            <p className="text-slate-500">{rx.doctorRegNo ? `Reg No: ${rx.doctorRegNo}` : 'Verified Clinical Practitioner'}</p>
          </div>
        </div>

        {/* Prescription Table */}
        <div>
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Prescribed Medications</h4>
          <div className="crm-table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Schedule</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {rx.medicines?.map((m, i) => (
                  <tr key={i}>
                    <td className="font-black text-slate-800">{m.medName}</td>
                    <td className="font-semibold text-slate-700">{m.dosage || 'Standard'}</td>
                    <td>
                      <span className="crm-badge bg-aubergine-50 text-aubergine-700 border border-aubergine-200">
                        {m.schedule}
                      </span>
                    </td>
                    <td>{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {matchingLabTests.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 mt-4">Suggested Lab Tests</h4>
            <div className="bg-aubergine-50 border border-aubergine-100 rounded-xl p-3.5 text-xs">
              <ul className="list-disc pl-4 space-y-1 text-aubergine-900 font-medium">
                {matchingLabTests.map((req, i) => (
                  <li key={i}>{req.requested_tests}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
          <p className="font-bold text-amber-900 mb-1"><i className="fas fa-info-circle mr-1"></i> Special Doctor Instructions:</p>
          <p className="text-amber-800">{rx.instructions}</p>
        </div>

        {/* Signature & Footer */}
        <div className="flex justify-between items-end pt-4 border-t border-slate-200">
          <div>
            <p className="text-[10px] text-slate-500">Digitally signed &amp; stored in EMR encrypted registry.</p>
            <p className="text-[10px] text-slate-500">Valid until: {rx.duration}</p>
          </div>
          <div className="text-center">
            <div className="font-serif italic text-aubergine-800 text-lg font-bold">{rx.prescribedBy || 'Attending Practitioner'}</div>
            <div className="w-32 border-b border-slate-400 my-1 mx-auto"></div>
            <p className="text-[10px] font-bold text-slate-500">Authorized Medical Practitioner Signature</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => {
            openPrescriptionPrintWindow({
              rxId: rx.id,
              date: rx.date,
              doctor: {
                name: rx.prescribedBy || 'Attending Practitioner',
                specialty: rx.doctorSpecialty || 'Clinical Specialist',
                qualifications: 'Medical Practitioner',
                regNo: rx.doctorRegNo || 'REG-VERIFIED',
              },
              patient: {
                name: patient.name,
                age: patient.age,
                gender: patient.gender || 'Not specified',
                blood: patient.blood,
                mrn: patient.mrn,
                phone: patient.phone,
                allergies: patient.allergies,
              },
              diagnosis: patient.diagnosis,
              medicines: rx.medicines?.map(m => ({
                name: m.medName || m.name,
                dosage: m.dosage,
                schedule: m.schedule,
                timing: m.timing,
                duration: m.duration,
                instructions: m.instructions,
              })) || [],
              labTests: matchingLabTests.map(r => r.requested_tests),
              instructions: rx.instructions,
            });
          }} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
            <i className="fas fa-download"></i> Download PDF
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50">
            Close Document
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── View Lab Document Modal ─────────────────────────── */
function ViewLabDocModal({ report, patient, isOpen, onClose }) {
  const { getLabReportUrl, refreshPatients } = useClinicData();
  const toast = useToast();
  const [interpretation, setInterpretation] = useState('');
  const [doctorAction, setDoctorAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setInterpretation(report?.interpretation || '');
    setDoctorAction(report?.doctorAction || '');
  }, [report?.id]);

  if (!isOpen || !report || !patient) return null;

  const openFile = async () => {
    setOpening(true);
    try {
      const { url } = await getLabReportUrl(report.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast(err.message || 'Failed to open report file', 'error');
    } finally {
      setOpening(false);
    }
  };

  const submitReview = async () => {
    setSaving(true);
    try {
      await apiFetch(`/records/lab-reports/${report.id}/review`, { method: 'PUT', body: { interpretation, doctorAction } });
      toast('Report reviewed.', 'success');
      await refreshPatients();
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to save review', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lab Report" size="lg">
      <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-5 text-slate-800 font-sans shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-black text-aubergine-900 tracking-tight">{report.testName}</h2>
            <p className="text-xs text-slate-500">{report.testCategory} • {report.labName || 'Lab not specified'}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${report.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {report.status}
            </span>
            <p className="text-xs text-slate-500 mt-1">Uploaded {report.date}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs">
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Patient</p>
            <p className="font-black text-slate-800 text-sm">{patient.name}</p>
            <p className="text-slate-600">{patient.age}Y / {patient.blood} • {patient.phone}</p>
          </div>
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">File</p>
            <button onClick={openFile} disabled={opening} className="font-black text-aubergine-700 text-sm hover:underline disabled:opacity-50 flex items-center gap-1.5">
              <i className="fas fa-file-arrow-up"></i> {opening ? 'Opening…' : 'Open Uploaded Report'}
            </button>
          </div>
        </div>

        {/* Review form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Clinical Interpretation</label>
            <textarea rows={3} value={interpretation} onChange={e => setInterpretation(e.target.value)}
              placeholder="Your reading of this report..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Action / Next Steps</label>
            <textarea rows={2} value={doctorAction} onChange={e => setDoctorAction(e.target.value)}
              placeholder="e.g. Start supplementation, repeat in 3 months..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50">
            Close
          </button>
          <button onClick={submitReview} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
            <i className="fas fa-check"></i> {saving ? 'Saving…' : report.status === 'Reviewed' ? 'Update Review' : 'Mark Reviewed'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Diet & Yoga / Exercise Regimen Modal ─────────── */
function DietYogaModal({ isOpen, onClose, patient, activePlan, onSavePlan }) {
  const { user } = useAuth();
  const [modalTab, setModalTab] = useState(activePlan ? 'view' : 'compose');
  const [dietPlan, setDietPlan] = useState(activePlan?.dietPlan || '');
  const [exercisePlan, setExercisePlan] = useState(activePlan?.exercisePlan || '');
  const [followUpAdvice, setFollowUpAdvice] = useState(activePlan?.followUpAdvice || 'Review in 4 weeks');
  const [clinicalNotes, setClinicalNotes] = useState(activePlan?.clinicalNotes || 'Personalized clinical dietetics and mindful movement protocol.');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activePlan) {
      setDietPlan(activePlan.dietPlan || '');
      setExercisePlan(activePlan.exercisePlan || '');
      setFollowUpAdvice(activePlan.followUpAdvice || 'Review in 4 weeks');
      setClinicalNotes(activePlan.clinicalNotes || 'Personalized clinical dietetics and mindful movement protocol.');
      setModalTab('view');
    } else {
      setModalTab('compose');
    }
  }, [activePlan, isOpen]);

  if (!isOpen || !patient) return null;

  const handleDownload = () => {
    openLifestylePlanPrintWindow({
      rxId: activePlan?.rxId ? `HN-${String(activePlan.rxId).slice(0, 8).toUpperCase()}` : 'HN-LIFESTYLE',
      date: activePlan?.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      doctor: { name: user?.name, specialty: user?.specialty || user?.profile?.specialty, regNo: user?.regNo || user?.profile?.registration_no },
      patient: { name: patient.name, age: patient.age, gender: patient.gender || 'Female' },
      dietPlan: activePlan?.dietPlan || dietPlan,
      exercisePlan: activePlan?.exercisePlan || exercisePlan,
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!dietPlan.trim() && !exercisePlan.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await onSavePlan({
        diagnosis: patient.diagnosis && patient.diagnosis !== 'Pending' ? patient.diagnosis : 'Lifestyle & Nutrition Protocol',
        instructions: JSON.stringify({
          type: 'healnari-holistic-v1',
          clinicalNotes: clinicalNotes.trim(),
          dietPlan: dietPlan.trim(),
          exercisePlan: exercisePlan.trim(),
          followUpAdvice: followUpAdvice.trim(),
        }),
        medicines: [{
          name: 'Clinical Consultation & Lifestyle Protocol',
          dosage: 'Advisory',
          frequency: 'As directed',
          duration: 'Ongoing',
        }],
        followUpAdvice: followUpAdvice.trim(),
        isDraft: false,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Diet & Mindful Movement Protocol — ${patient.name}`} size="lg">
      <div className="space-y-4">
        {/* Navigation Mode Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex gap-2">
            {activePlan && (
              <button
                type="button"
                onClick={() => setModalTab('view')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  modalTab === 'view' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="fas fa-eye"></i> Active Plan
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalTab('compose')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                modalTab === 'compose' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <i className="fas fa-pen-to-square"></i> {activePlan ? 'Update / New Regimen' : 'Compose Regimen'}
            </button>
          </div>

          {activePlan && (
            <button
              type="button"
              onClick={handleDownload}
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <i className="fas fa-file-pdf text-emerald-600"></i> Download Official A4 PDF
            </button>
          )}
        </div>

        {modalTab === 'view' && activePlan ? (
          <div className="space-y-4 text-xs">
            {/* Doctor Info header banner */}
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Current Regimen On File</span>
                <p className="font-black text-slate-900 text-sm mt-0.5">Prescribed by {activePlan.prescribedBy || 'Clinical Specialist'}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Date: {activePlan.date}</p>
              </div>
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
                ● Active Protocol
              </span>
            </div>

            {/* Diet Card */}
            <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-800 uppercase tracking-wide text-xs flex items-center gap-2">
                  <i className="fas fa-seedling text-emerald-600 text-sm"></i> Clinical Diet &amp; Nutrition Plan
                </span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  Doctor / Nutritionist
                </span>
              </div>
              <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-line font-medium bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/80">
                {activePlan.dietPlan || 'No specific dietary protocol recorded.'}
              </p>
            </div>

            {/* Exercise Card */}
            <div className="bg-white border-2 border-amber-100 rounded-2xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-800 uppercase tracking-wide text-xs flex items-center gap-2">
                  <i className="fas fa-om text-amber-600 text-sm"></i> Yoga &amp; Mindful Movement Protocol
                </span>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Yoga Specialist / Trainer
                </span>
              </div>
              <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-line font-medium bg-amber-50/40 p-3 rounded-xl border border-amber-100/80">
                {activePlan.exercisePlan || 'No specific yoga/movement protocol recorded.'}
              </p>
            </div>

            {/* Follow-up advice */}
            {activePlan.followUpAdvice && (
              <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-purple-900">
                <div className="flex items-center gap-2">
                  <i className="fas fa-calendar-check text-purple-600 text-sm"></i>
                  <span><strong>Next Review:</strong> {activePlan.followUpAdvice}</span>
                </div>
                <span className="text-[10px] text-purple-700 font-semibold bg-purple-100 px-2 py-0.5 rounded-full">Follow-up Target</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalTab('compose')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <i className="fas fa-pen"></i> Update / Revise Protocol
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Compose / Update Mode */
          <form onSubmit={handleSave} className="space-y-4">
            {/* Diet Box */}
            <div className="bg-emerald-50/30 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <i className="fas fa-seedling text-emerald-600"></i> Clinical Diet &amp; Nutrition Plan
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Doctor / Clinical Nutritionist
                </span>
              </div>
              <textarea
                rows={3}
                value={dietPlan}
                onChange={e => setDietPlan(e.target.value)}
                placeholder="e.g. Low glycemic index whole foods, 25-30g protein per main meal, 30g+ dietary fibre daily, anti-inflammatory Mediterranean principles, hydration guidelines..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white leading-relaxed resize-none"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Quick Add:</span>
                {['Personalized Low-GI Plate', 'Protein Balance (20-30g/meal)', 'Fiber & Prebiotics (30g+/day)', 'Plant Polyphenols & Omega-3', 'Regular Meal Timing & Hydration', 'Sustainable Cultural Customization'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setDietPlan(p => p ? `${p}, ${tag}` : tag)}
                    className="bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Yoga & Movement Box */}
            <div className="bg-amber-50/30 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-2">
                  <i className="fas fa-om text-amber-600"></i> Yoga &amp; Mindful Movement Protocol
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Yoga Specialist &amp; Trainer
                </span>
              </div>
              <textarea
                rows={3}
                value={exercisePlan}
                onChange={e => setExercisePlan(e.target.value)}
                placeholder="e.g. 150m moderate movement weekly, gentle pelvic yoga (Badhakonasana, Cat-Cow), diaphragmatic breathing (Pranayama), resistance training 2x/wk..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white leading-relaxed resize-none"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Quick Add:</span>
                {['Beginner Movement (Walking/Steps)', 'Gentle Yoga & Asanas', 'Flexibility & Pelvic Mobility', 'Relaxation & Restorative', 'Breathing & Mindfulness (Pranayama)', 'Strength & Resistance (2-3x/wk)'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setExercisePlan(p => p ? `${p}, ${tag}` : tag)}
                    className="bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-up target */}
            <div className="bg-purple-50/30 border border-purple-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-purple-800 uppercase tracking-wide flex items-center gap-2">
                  <i className="fas fa-calendar-check text-purple-600"></i> Recommended Next Follow-Up
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Auto-populates to patient reminder</span>
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
                    type="button"
                    onClick={() => setFollowUpAdvice(chip.text)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      followUpAdvice === chip.text
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white hover:bg-purple-50 text-purple-800 border-purple-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={followUpAdvice}
                onChange={e => setFollowUpAdvice(e.target.value)}
                placeholder="Or custom timeline..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (!dietPlan.trim() && !exercisePlan.trim())}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving to EMR...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> Issue &amp; Send to Patient
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

/* ─── FULL PAGE EMR COMPONENT ───────────────────────── */
function PatientEMRFullPage({ patient, onBack, toast, onUpdatePatient }) {
  const { user } = useAuth();
  const userCurrency = user?.profile?.currency || user?.currency || 'INR';
  const capabilities = useMemo(() => getProviderCapabilities(user), [user]);
  const { addRx, requestLabReport, addClinicalNote, recordCharge, listLabReportRequests, cancelLabReportRequest, appointments } = useClinicData();
  const [tab, setTab] = useState('overview');
  const patientTimeline = useMemo(
    () => buildPatientTimeline(patient, (appointments || []).filter(a => a.patientId === patient.id)),
    [patient, appointments]
  );

  const groupedRx = useMemo(() => {
    if (!patient || !patient.meds) return [];
    const byGroup = new Map();
    patient.meds.forEach(m => {
      const groupId = m.groupId || m.date || m.prescribedOn || 'unknown';
      if (!byGroup.has(groupId)) byGroup.set(groupId, []);
      byGroup.get(groupId).push(m);
    });
    return [...byGroup.entries()].map(([groupId, items]) => ({
      id: items[0].groupId || items[0].id,
      date: items[0].date || items[0].prescribedOn || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      prescribedBy: items[0].prescribedBy || items[0].doctor || capabilities.displayName,
      status: items[0].status || 'Active', // Now uses the status from backend
      diagnosis: items.find(m => m.diagnosis)?.diagnosis || '',
      instructions: items.find(m => m.instructions)?.instructions || '',
      medicines: items.map(m => ({
        id: m.id,
        medName: m.medName || m.name,
        dosage: m.dosage,
        schedule: m.schedule || m.frequency,
        duration: m.duration,
        refillsLeft: m.refillsLeft || 0,
        status: m.status || 'Active'
      }))
    })).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [patient]);

  const [labFilter, setLabFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [labRequests, setLabRequests] = useState([]);

  // Sub-modals state
  const [showWriteRx, setShowWriteRx] = useState(false);
  const [showDietYogaMaker, setShowDietYogaMaker] = useState(false);
  const [showDietYogaModal, setShowDietYogaModal] = useState(false);
  const [showOrderLab, setShowOrderLab] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedRxDoc, setSelectedRxDoc] = useState(null);
  const [selectedLabDoc, setSelectedLabDoc] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showAiBrief, setShowAiBrief] = useState(false);

  const holisticPlans = useMemo(() => {
    const list = [];
    groupedRx.forEach(rx => {
      try {
        if (rx.instructions && rx.instructions.startsWith('{')) {
          const parsed = JSON.parse(rx.instructions);
          if (parsed.type === 'healnari-holistic-v1' && (parsed.dietPlan || parsed.exercisePlan)) {
            list.push({ ...parsed, rxId: rx.id, date: rx.date, prescribedBy: rx.prescribedBy });
          }
        }
      } catch(e) {}
    });
    return list;
  }, [groupedRx]);

  const activeLifestylePlan = holisticPlans[0] || null;

  const loadLabRequests = () => {
    if (!patient) return;
    listLabReportRequests(patient.id).then(r => setLabRequests(r.filter(x => x.status === 'Pending'))).catch(() => setLabRequests([]));
  };
  useEffect(() => { loadLabRequests(); }, [patient?.id]);

  if (!patient) return null;

  const handleAddRx = async (patientId, newRx) => {
    try {
      const activeAppt = appointments?.find(a => a.patientId === patientId && ['In Progress', 'Waiting', 'Upcoming'].includes(a.status) && (a.paymentId || a.payment_id));
      const medsArray = Array.isArray(newRx.medicines) && newRx.medicines.length > 0
        ? newRx.medicines
        : [{ name: newRx.medName, dosage: newRx.dosage, frequency: newRx.schedule, duration: newRx.duration }];

      await addRx(patientId, {
        appointmentId: newRx.appointmentId || activeAppt?.id,
        diagnosis: newRx.diagnosis,
        instructions: newRx.instructions,
        isDraft: newRx.isDraft !== undefined ? newRx.isDraft : false,
        medicines: medsArray.map(m => ({
          name: m.name || m.medName,
          dosage: m.dosage || m.strength || 'Standard',
          frequency: m.frequency || m.schedule || '1-0-1',
          duration: m.duration || '30 Days',
        })),
      });
      toast(`Prescription with ${medsArray.length} medicine(s) ${newRx.isDraft ? 'saved as draft' : 'finalized & signed'} for ${patient.name}.`, 'success');
    } catch (err) {
      toast(err.message || `Failed to add prescription for ${patient.name}`, 'error');
    }
  };

  const { finalizeRx, cancelRx } = useClinicData();

  const handleFinalizeRx = async (groupId) => {
    try {
      await finalizeRx(groupId);
      toast('Prescription finalized and signed. Patient has been notified.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to finalize prescription', 'error');
    }
  };

  const handleCancelRx = async (groupId) => {
    try {
      await cancelRx(groupId);
      toast('Prescription cancelled successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to cancel prescription', 'error');
    }
  };

  if (showWriteRx) {
    return <WriteRxPage patient={patient} onBack={() => setShowWriteRx(false)} onSaveRx={handleAddRx} />;
  }

  if (showDietYogaMaker) {
    return (
      <DietAndYogaMakerPage
        patient={patient}
        onBack={() => setShowDietYogaMaker(false)}
        onSaveProtocol={(plan) => handleAddRx(patient.id, plan)}
        activePlan={activeLifestylePlan}
      />
    );
  }

  const handleRequestLab = async (patientId, request) => {
    try {
      const activeAppt = appointments?.find(a => a.patientId === patientId && ['In Progress', 'Waiting', 'Upcoming'].includes(a.status) && (a.paymentId || a.payment_id));
      await requestLabReport(patientId, { ...request, appointmentId: request.appointmentId || activeAppt?.id });
      toast(`Report request sent to ${patient.name}.`, 'success');
      loadLabRequests();
    } catch (err) {
      toast(err.message || `Failed to request lab report for ${patient.name}`, 'error');
      throw err;
    }
  };

  const handleCancelLabRequest = async (id) => {
    try {
      await cancelLabReportRequest(id);
      toast('Request cancelled.', 'info');
      loadLabRequests();
    } catch (err) {
      toast(err.message || 'Failed to cancel request', 'error');
    }
  };

  const handleAddPayment = async (patientId, newPayment) => {
    try {
      await recordCharge(patientId, {
        service: newPayment.service,
        category: newPayment.category,
        amount: newPayment.amount,
        method: newPayment.method,
        status: newPayment.status,
      });
      toast(`Payment transaction invoice recorded for ${patient.name}.`, 'success');
    } catch (err) {
      toast(err.message || `Failed to record payment for ${patient.name}`, 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addClinicalNote(patient.id, newNote.trim());
      setNewNote('');
      toast('Clinical note saved to EMR.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save clinical note', 'error');
    }
  };
  const filteredReports = patient.reports.filter((r) => {
    if (labFilter === 'all') return true;
    if (labFilter === 'awaiting') return r.status === 'Report Available';
    return r.status === 'Reviewed';
  });

  const totalPaid = (patient.payments || []).reduce((acc, curr) => (curr.status === 'Paid' ? acc + curr.amount : acc), 0);
  const totalPending = (patient.payments || []).reduce((acc, curr) => (curr.status === 'Pending' ? acc + curr.amount : acc), 0);

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Navigation Breadcrumb Bar */}
      <button
        onClick={onBack}
        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
      >
        <i className="fas fa-arrow-left text-aubergine-600"></i> Back to Patients
      </button>

      {/* Main Full Page EMR Banner */}
      <div className="rounded-2xl p-5 text-white shadow-lg space-y-5 bg-gradient-to-br from-aubergine-900 via-aubergine-600 to-magenta-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 text-white font-black text-xl flex items-center justify-center border-2 border-white/20 shadow-inner flex-shrink-0">
              {patient.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-white font-black text-xl tracking-tight">{patient.name}</h1>
                <span className="bg-white/20 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-white/20" title={patient.id}>
                  #{String(patient.id).slice(0, 8).toUpperCase()}
                </span>
                {patient.status === 'active' && (
                  <span className="bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/50">
                    ● Active
                  </span>
                )}
              </div>
              <p className="text-aubergine-100 text-xs">
                {patient.age} Yrs {patient.gender ? `• ${patient.gender}` : ''} • Blood Group <strong className="text-white font-black">{patient.blood}</strong> • {patient.phone}
              </p>
              <p className="text-aubergine-200 text-xs font-semibold flex items-center gap-1.5">
                <i className="fas fa-stethoscope text-magenta-200"></i> {patient.diagnosis}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap self-stretch md:self-center justify-end">
            <AiButton
              variant="glass"
              size="sm"
              icon="fa-wand-magic-sparkles"
              badge="AI"
              onClick={() => setShowAiBrief(true)}
              title="Generate 30-Second AI Clinical Brief"
            >
              AI Brief
            </AiButton>
            {capabilities.canPrescribeDrugs && (
              <button
                onClick={() => setShowWriteRx(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <i className="fas fa-file-prescription"></i> Rx
              </button>
            )}
            {(capabilities.canFormulateDiet || capabilities.canFormulateYoga) && (
              <button
                onClick={() => setShowDietYogaMaker(true)}
                className={`${
                  !capabilities.canPrescribeDrugs
                    ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                    : 'bg-teal-600 hover:bg-teal-700'
                } text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]`}
                title="Open Clinical Diet Chart &amp; Yoga Protocol Maker"
              >
                <i className="fas fa-seedling"></i> Diet &amp; Yoga
              </button>
            )}
            {capabilities.canOrderLabs && (
              <button
                onClick={() => setShowOrderLab(true)}
                className="bg-aubergine-700 hover:bg-aubergine-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <i className="fas fa-vial"></i> Lab
              </button>
            )}
            <button
              onClick={() => setShowRecordPayment(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <i className="fas fa-receipt"></i> Payment
            </button>
            <button
              onClick={() => openPatientEmrPrintWindow({ patient, doctor: user, groupedRx })}
              title="Print Comprehensive Patient EMR & Health Record"
              aria-label="Print Patient EMR"
              className="w-9 h-9 bg-white/10 hover:bg-white/25 active:scale-95 text-white rounded-xl border border-white/20 transition-all flex items-center justify-center shadow-xs cursor-pointer"
            >
              <i className="fas fa-print text-xs"></i>
            </button>
          </div>
        </div>

        {/* Quick EMR Metrics Grid inside Header */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 text-[10px] block font-medium">Visits</span>
            <span className="font-black text-white text-base">{patient.visits}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 text-[10px] block font-medium">Active Rx</span>
            <span className="font-black text-white text-base">{patient.meds.filter((m) => m.status === 'Active').length}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 text-[10px] block font-medium">Reports</span>
            <span className="font-black text-white text-base">{patient.reports.length}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 text-[10px] block font-medium">Billed</span>
            <span className="font-black text-white text-base">{formatCurrency(totalPaid + totalPending, userCurrency)}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 text-[10px] block font-medium">Last Visit</span>
            <span className="font-black text-white text-base">{patient.lastVisit}</span>
          </div>
        </div>
      </div>

      {/* Clinical Alert Banner */}
      {patient.alert && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-3 text-xs shadow-xs">
          <i className="fas fa-triangle-exclamation text-rose-500 text-lg mt-0.5 flex-shrink-0"></i>
          <div>
            <p className="font-black text-rose-900 text-sm">Clinical Alert</p>
            <p className="text-rose-800 mt-0.5">{patient.alert}</p>
          </div>
        </div>
      )}

      {/* Main Full Page Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
        <div className="flex gap-1 text-xs font-bold overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: 'fa-clipboard-list' },
            { key: 'timeline', label: 'Timeline', icon: 'fa-timeline' },
            { key: 'prescriptions', label: `Prescriptions (${patient.meds.length})`, icon: 'fa-pills' },
            { key: 'lifestyle', label: `Diet & Yoga (${holisticPlans.length})`, icon: 'fa-seedling' },
            { key: 'reports', label: `Lab & Reports (${patient.reports.length})`, icon: 'fa-vial' },
            { key: 'payments', label: `Billing (${(patient.payments || []).length})`, icon: 'fa-receipt' },
            { key: 'consultations', label: `Consultations (${patient.consultations.length})`, icon: 'fa-calendar-days' },
            { key: 'history', label: 'History', icon: 'fa-notes-medical' },
            { key: 'notes', label: `Notes (${patient.clinicalNotes.length})`, icon: 'fa-note-sticky' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${tab === t.key
                ? 'bg-aubergine-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              <i className={`fas ${t.icon} text-[11px]`}></i> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT AREAS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-h-[400px]">
        {/* Tab: TIMELINE */}
        {tab === 'timeline' && (
          <div>
            {patientTimeline.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <i className="fas fa-timeline text-3xl mb-3 block text-slate-300"></i>
                <p className="font-bold text-sm">Nothing on file yet for this patient.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {patientTimeline.map((e, i) => (
                  <div key={e.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${e.color}`}>
                        <i className={`fas ${e.icon} text-xs`}></i>
                      </div>
                      {i < patientTimeline.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1"></div>}
                    </div>
                    <div className="pb-6 flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {new Date(e.dateRaw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="font-bold text-slate-800 text-sm">{e.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 break-words">{e.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Vitals Cards */}
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-2.5">Vitals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">Blood Pressure</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.bp}</p>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <i className="fas fa-circle-check"></i> Optimal BP Range
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">Body Mass Index (BMI)</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.bmi} <span className="text-xs font-normal text-slate-500">({patient.weight})</span></p>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Height: {patient.height}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">Pulse / SpO2</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.pulse} <span className="text-xs font-normal text-slate-500">/ {patient.spo2}</span></p>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <i className="fas fa-heart-pulse"></i> Normal Resting Rate
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">Fasting Glucose</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.bloodSugar}</p>
                  <span className="text-[10px] text-amber-600 font-bold block mt-1">Monitored Metric</span>
                </div>
              </div>
            </div>

            {/* Allergies & Key Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-2.5 flex items-center gap-2">
                  <i className="fas fa-hand-dots text-rose-500"></i> Allergies
                </h4>
                {patient.allergies.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="bg-rose-100 text-rose-800 font-bold px-3 py-1.5 rounded-xl border border-rose-200 text-xs flex items-center gap-1.5">
                        <i className="fas fa-triangle-exclamation text-rose-600"></i> {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No drug allergies reported in EMR.</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-2.5 flex items-center gap-2">
                  <i className="fas fa-wallet text-emerald-600"></i> Payments
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold text-[10px] block uppercase">Total Settled Paid</span>
                    <span className="font-black text-emerald-700 text-base">{formatCurrency(totalPaid, userCurrency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold text-[10px] block uppercase">Outstanding Due</span>
                    <span className={`font-black text-base ${totalPending > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatCurrency(totalPending, userCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Prescriptions Preview */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Active Prescriptions</h3>
                <button onClick={() => setTab('prescriptions')} className="text-xs text-aubergine-700 font-bold hover:underline">
                  View all ({patient.meds.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patient.meds.slice(0, 2).map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{m.medName}</p>
                      <p className="text-slate-500 mt-1">{m.instructions}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="bg-aubergine-100 text-aubergine-800 font-bold px-3 py-1 rounded-xl border border-aubergine-200 text-xs">
                        {m.schedule}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">{m.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Lab Findings Snapshot */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Latest Lab Report</h3>
                <button onClick={() => setTab('reports')} className="text-xs text-aubergine-700 font-bold hover:underline">
                  View all ({patient.reports.length}) →
                </button>
              </div>
              {patient.reports.length > 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-black text-slate-900 text-sm">{patient.reports[0].testName}</span>
                      <p className="text-slate-500 mt-0.5">{patient.reports[0].testCategory} • {patient.reports[0].date}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${patient.reports[0].status === 'Reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {patient.reports[0].status}
                    </span>
                  </div>
                  {patient.reports[0].interpretation && (
                    <p className="text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5">
                      <span className="font-bold text-slate-800">Interpretation: </span>{patient.reports[0].interpretation}
                    </p>
                  )}
                  <button onClick={() => setSelectedLabDoc(patient.reports[0])} className="w-full bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 font-bold py-2 rounded-xl border border-aubergine-200 transition-colors flex items-center justify-center gap-1.5 shadow-xs">
                    <i className="fas fa-file-arrow-up"></i> {patient.reports[0].status === 'Reviewed' ? 'View / Edit Review' : 'Review Report'}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 text-center">
                  No reports uploaded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: PRESCRIPTIONS */}
        {tab === 'prescriptions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-base">Prescriptions</h3>
              <button
                onClick={() => setShowWriteRx(true)}
                className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className="fas fa-plus"></i> Write New Rx
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {groupedRx.map((rxGroup) => (
                <div key={rxGroup.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-aubergine-300 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">Prescription on {rxGroup.date}</span>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                            rxGroup.status === 'Finalized' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            rxGroup.status === 'Draft' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            rxGroup.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-slate-200 text-slate-600'
                          }`}
                        >
                          ● {rxGroup.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        Prescription ID: <span className="font-mono font-bold text-slate-600">{rxGroup.id}</span> • Prescribed by {rxGroup.prescribedBy}
                      </p>
                    </div>

                      <div className="flex gap-2">
                        {rxGroup.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => handleFinalizeRx(rxGroup.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                              <i className="fas fa-file-signature"></i> Sign & Finalize
                            </button>
                            <button
                              onClick={() => handleCancelRx(rxGroup.id)}
                              className="bg-white hover:bg-rose-50 text-rose-600 font-bold px-3.5 py-2 rounded-xl border border-rose-200 text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                              <i className="fas fa-trash"></i> Discard Draft
                            </button>
                          </>
                        )}
                        {rxGroup.status === 'Finalized' && (
                          <button
                            onClick={() => handleCancelRx(rxGroup.id)}
                            className="bg-white hover:bg-rose-50 text-rose-600 font-bold px-3.5 py-2 rounded-xl border border-rose-200 text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <i className="fas fa-ban"></i> Cancel Finalized
                          </button>
                        )}
                        {(() => {
                          try {
                            if (rxGroup.instructions && rxGroup.instructions.startsWith('{')) {
                              const p = JSON.parse(rxGroup.instructions);
                              if (p.type === 'healnari-holistic-v1' && (p.dietPlan || p.exercisePlan)) {
                                return (
                                  <button
                                    onClick={() => {
                                      openLifestylePlanPrintWindow({
                                        rxId: `HN-${String(rxGroup.id).slice(0, 8).toUpperCase()}`,
                                        date: rxGroup.date,
                                        doctor: { name: user?.name, specialty: user?.specialty || user?.profile?.specialty, regNo: user?.regNo || user?.profile?.registration_no },
                                        patient: { name: patient.name, age: patient.age, gender: patient.gender || 'Female' },
                                        dietPlan: p.dietPlan,
                                        exercisePlan: p.exercisePlan,
                                      });
                                    }}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-2 rounded-xl border border-emerald-200 text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                                    title="Download Lifestyle & Yoga Protocol"
                                  >
                                    <i className="fas fa-seedling text-emerald-600"></i> Lifestyle Plan
                                  </button>
                                );
                              }
                            }
                          } catch(e) {}
                          return null;
                        })()}
                        <button
                          onClick={() => setSelectedRxDoc(rxGroup)}
                          className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2 rounded-xl border border-slate-200 text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <i className="fas fa-file-prescription text-aubergine-600"></i> View Rx
                        </button>
                      </div>
                  </div>

                  <div className="space-y-3">
                    {rxGroup.medicines.map((m, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl p-3.5 border border-slate-100 text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <div>
                          <p className="font-black text-slate-800 text-sm mb-1">{m.medName}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {m.schedule} • {m.duration} • {m.refillsLeft} refills left
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 sm:mt-0 ${m.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    let parsedNotes = null;
                    try {
                      if (rxGroup.instructions && rxGroup.instructions.startsWith('{')) {
                        const p = JSON.parse(rxGroup.instructions);
                        if (p.type === 'healnari-holistic-v1') parsedNotes = p;
                      }
                    } catch(e) {}

                    if (parsedNotes) {
                      return (
                        <div className="space-y-2 mt-2">
                          {parsedNotes.dietPlan && (
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                              <span className="font-bold flex items-center gap-1.5 text-xs text-emerald-800 mb-1">
                                <i className="fas fa-seedling text-emerald-600"></i> Clinical Diet &amp; Nutrition Plan:
                              </span>
                              <p className="text-[11px] leading-relaxed whitespace-pre-line text-emerald-900 font-medium">{parsedNotes.dietPlan}</p>
                            </div>
                          )}

                          {parsedNotes.exercisePlan && (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-amber-900">
                              <span className="font-bold flex items-center gap-1.5 text-xs text-amber-800 mb-1">
                                <i className="fas fa-om text-amber-600"></i> Yoga &amp; Mindful Movement:
                              </span>
                              <p className="text-[11px] leading-relaxed whitespace-pre-line text-amber-900 font-medium">{parsedNotes.exercisePlan}</p>
                            </div>
                          )}

                          {parsedNotes.clinicalNotes && (
                            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-800">
                              <strong className="font-bold text-xs">Clinical Advice:</strong> {parsedNotes.clinicalNotes}
                            </div>
                          )}

                          {parsedNotes.followUpAdvice && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-purple-900 flex items-center gap-2 text-xs">
                              <i className="fas fa-calendar-check text-purple-600"></i>
                              <span><strong>Follow-Up Target:</strong> {parsedNotes.followUpAdvice}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return rxGroup.instructions ? (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-amber-900 mt-2">
                        <strong className="font-bold">Doctor Instructions:</strong> {rxGroup.instructions}
                      </div>
                    ) : null;
                  })()}
                </div>
              ))}

              {groupedRx.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-500">No prescription records found for this patient.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: DIET & YOGA REGIMEN */}
        {tab === 'lifestyle' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <i className="fas fa-seedling text-emerald-600"></i> Clinical Diet &amp; Yoga Regimen
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Evidence-based nutrition therapy &amp; pelvic-aligned mindful movement protocols
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeLifestylePlan && (
                  <button
                    onClick={() => {
                      openLifestylePlanPrintWindow({
                        rxId: `HN-${String(activeLifestylePlan.rxId).slice(0, 8).toUpperCase()}`,
                        date: activeLifestylePlan.date,
                        doctor: { name: user?.name, specialty: user?.specialty || user?.profile?.specialty, regNo: user?.regNo || user?.profile?.registration_no },
                        patient: { name: patient.name, age: patient.age, gender: patient.gender || 'Female' },
                        dietPlan: activeLifestylePlan.dietPlan,
                        exercisePlan: activeLifestylePlan.exercisePlan,
                      });
                    }}
                    className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-3.5 py-2.5 rounded-xl text-xs border border-emerald-200 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <i className="fas fa-file-pdf text-emerald-600"></i> Download A4 Plan
                  </button>
                )}
                <button
                  onClick={() => setShowDietYogaMaker(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <i className="fas fa-pen-to-square"></i> {activeLifestylePlan ? 'Open Chart Maker / Edit' : 'Open Diet & Yoga Chart Maker'}
                </button>
              </div>
            </div>

            {activeLifestylePlan ? (
              <div className="space-y-4">
                {/* Active Protocol Header Card */}
                <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Active Regimen</span>
                    <h4 className="text-base font-black text-white mt-0.5">Issued by {activeLifestylePlan.prescribedBy}</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Date: {activeLifestylePlan.date} • Rx Ref: {activeLifestylePlan.rxId}</p>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-3 py-1 rounded-full">
                    ● Synchronized with Patient Portal
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Diet Plan Card */}
                  <div className="bg-white rounded-2xl border-2 border-emerald-100 p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-seedling text-emerald-600 text-sm"></i> Clinical Diet &amp; Nutrition Plan
                      </h4>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Doctor &amp; Nutritionist
                      </span>
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-line font-medium bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/60">
                      {activeLifestylePlan.dietPlan || 'No dietary notes recorded.'}
                    </p>
                  </div>

                  {/* Yoga & Movement Card */}
                  <div className="bg-white rounded-2xl border-2 border-amber-100 p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-2">
                        <i className="fas fa-om text-amber-600 text-sm"></i> Yoga &amp; Mindful Movement Protocol
                      </h4>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Yoga Specialist &amp; Trainer
                      </span>
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-line font-medium bg-amber-50/40 p-4 rounded-xl border border-amber-100/60">
                      {activeLifestylePlan.exercisePlan || 'No yoga/movement notes recorded.'}
                    </p>
                  </div>
                </div>

                {activeLifestylePlan.followUpAdvice && (
                  <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 flex items-center justify-between text-xs text-purple-900">
                    <div className="flex items-center gap-2.5">
                      <i className="fas fa-calendar-check text-purple-600 text-base"></i>
                      <div>
                        <span className="font-bold block">Recommended Next Follow-up Review</span>
                        <span className="text-purple-700">{activeLifestylePlan.followUpAdvice}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* History of previous protocols if > 1 */}
                {holisticPlans.length > 1 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Protocol History ({holisticPlans.length})</h4>
                    <div className="space-y-2">
                      {holisticPlans.slice(1).map((hPlan, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800">Prescription from {hPlan.date}</span>
                            <p className="text-slate-500 text-[11px]">By {hPlan.prescribedBy}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              openLifestylePlanPrintWindow({
                                rxId: `HN-${String(hPlan.rxId).slice(0, 8).toUpperCase()}`,
                                date: hPlan.date,
                                doctor: { name: hPlan.prescribedBy },
                                patient: { name: patient.name, age: patient.age, gender: patient.gender || 'Female' },
                                dietPlan: hPlan.dietPlan,
                                exercisePlan: hPlan.exercisePlan,
                              });
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                          >
                            <i className="fas fa-download"></i> View / Print
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-emerald-200">
                  <i className="fas fa-seedling"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">No Active Diet &amp; Movement Regimen</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Prescribe a customized nutritional protocol, low-GI dietary targets, and cycle-aligned yoga routines for {patient.name}.
                  </p>
                </div>
                <button
                  onClick={() => setShowDietYogaMaker(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <i className="fas fa-plus"></i> Open Diet &amp; Yoga Chart Maker
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: LAB & REPORTS */}
        {tab === 'reports' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-black text-slate-800 text-base">Lab Reports</h3>

              <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {[['all', 'All'], ['awaiting', 'Awaiting Review'], ['reviewed', 'Reviewed']].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setLabFilter(key)}
                      className={`px-3.5 py-1.5 rounded-lg transition-all ${labFilter === key ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowOrderLab(true)}
                  className="bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <i className="fas fa-plus"></i> Request Report
                </button>
              </div>
            </div>

            {labRequests.length > 0 && (
              <div className="space-y-2">
                {labRequests.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{r.requested_tests}</p>
                      <p className="text-slate-500 mt-0.5">
                        Awaiting patient upload{r.due_date ? ` • Due ${new Date(r.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleCancelLabRequest(r.id)} className="shrink-0 text-slate-500 hover:text-rose-600 font-bold px-2 py-1">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {filteredReports.map((r) => (
                <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs hover:border-aubergine-300 transition-all">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">{r.testName}</span>
                        {r.urgent && <span className="bg-rose-100 text-rose-700 font-bold px-3 py-0.5 rounded-full text-[11px]">⚡ Urgent</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'Reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        {r.testCategory} • {r.labName || 'Lab not specified'} • {r.date}
                      </p>
                      {r.status === 'Reviewed' && r.interpretation && (
                        <p className="text-slate-700 mt-2 bg-white border border-slate-200 rounded-lg p-2.5">
                          <span className="font-bold">Note: </span>{r.interpretation}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedLabDoc(r)}
                      className="bg-aubergine-50 hover:bg-aubergine-100 text-aubergine-700 font-bold px-3.5 py-2 rounded-xl border border-aubergine-200 transition-colors flex items-center gap-2 shadow-xs shrink-0"
                    >
                      <i className="fas fa-file-arrow-up"></i> {r.status === 'Reviewed' ? 'View / Edit' : 'Review'}
                    </button>
                  </div>
                </div>
              ))}

              {filteredReports.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-500">No lab reports in this view.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: PAYMENTS & BILLING */}
        {tab === 'payments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-black text-slate-800 text-base">Billing History</h3>

              <button
                onClick={() => setShowRecordPayment(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className="fas fa-receipt"></i> Record Payment
              </button>
            </div>

            {/* Financial Summary Metric Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold text-[10px] uppercase">Total Billed</span>
                <p className="font-black text-slate-900 text-xl mt-1">{formatCurrency(totalPaid + totalPending, userCurrency)}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold text-[10px] uppercase">Total Settled Payments</span>
                <p className="font-black text-emerald-700 text-xl mt-1">{formatCurrency(totalPaid, userCurrency)}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <i className="fas fa-check-circle"></i> Successfully Received
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold text-[10px] uppercase">Outstanding Due</span>
                <p className={`font-black text-xl mt-1 ${totalPending > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatCurrency(totalPending, userCurrency)}
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="crm-table-container">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Date</th>
                    <th>Service Description</th>
                    <th>Category</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th className="text-right">Invoice Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(patient.payments || []).map((pay) => (
                    <tr key={pay.id}>
                      <td className="font-mono font-bold text-slate-800">{pay.id}</td>
                      <td>{pay.date}</td>
                      <td className="font-bold text-slate-900">{pay.service}</td>
                      <td>
                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded text-[11px]">
                          {pay.category}
                        </span>
                      </td>
                      <td className="font-medium">{pay.method}</td>
                      <td className="font-black text-slate-900">{formatCurrency(pay.amount, pay.currency || userCurrency)}</td>
                      <td>
                        <span
                          className={`crm-badge border ${pay.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pay.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-aubergine-50 text-aubergine-700 border-aubergine-200'
                            }`}
                        >
                          ● {pay.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedInvoice(pay)}
                          className="crm-btn-secondary h-8 text-[11px] px-3 py-1"
                        >
                          <i className="fas fa-file-invoice text-aubergine-600 mr-1"></i> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(patient.payments || []).length === 0 && (
              <div className="text-center py-12 text-slate-500">No payment transaction records found.</div>
            )}
          </div>
        )}

        {/* Tab 5: CONSULTATIONS */}
        {tab === 'consultations' && (
          <div className="space-y-3 text-xs">
            <h3 className="font-black text-slate-800 text-base mb-1">Consultation History</h3>
            {patient.consultations.map((c, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs hover:border-aubergine-200 transition-all space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-base">{c.type}</span>
                  <span className="text-slate-500 font-medium">{c.date}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Chief Complaint</span>
                    <span className="text-slate-800 font-medium text-xs mt-1 block">{c.chiefComplaint}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Clinical Assessment</span>
                    <span className="text-aubergine-800 font-bold text-xs mt-1 block">{c.assessment}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block text-[10px] uppercase">Management Plan</span>
                    <span className="text-slate-800 font-medium text-xs mt-1 block">{c.plan}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 6: MEDICAL HISTORY */}
        {tab === 'history' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-black text-slate-800 text-base mb-1">Medical History</h3>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <i className="fas fa-notes-medical text-aubergine-600"></i> Chronic Conditions
              </h4>
              <div className="flex gap-2 flex-wrap">
                {patient.medicalHistory.chronicConditions.map((cond, i) => (
                  <span key={i} className="bg-aubergine-100 text-aubergine-800 font-bold px-3 py-1 rounded-lg text-xs border border-aubergine-200">
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <i className="fas fa-scissors text-slate-500"></i> Surgical History
                </h4>
                <p className="text-slate-700 font-medium text-xs">{patient.medicalHistory.surgeries.join(', ') || 'None reported'}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <i className="fas fa-users text-slate-500"></i> Family History
                </h4>
                <p className="text-slate-700 font-medium text-xs">{patient.medicalHistory.familyHistory.join(', ') || 'None reported'}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i className="fas fa-heart-pulse text-slate-500"></i> Lifestyle &amp; Diet
              </h4>
              <p className="text-slate-700 font-medium text-xs">{patient.medicalHistory.lifestyle}</p>
            </div>
          </div>
        )}

        {/* Tab 7: CLINICAL NOTES */}
        {tab === 'notes' && (
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-base mb-1">Clinical Notes</h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Add a Progress Note</h4>
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Clinical observations, treatment changes, or updates..."
                className="w-full border border-slate-200 rounded-xl p-3.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddNote}
                  className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  <i className="fas fa-save"></i> Save Note
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {patient.clinicalNotes.map((note, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                  <p className="text-slate-800 leading-relaxed font-medium text-xs">{note.text}</p>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                    <span>{note.author}</span>
                    <span>{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub Modals */}
      <DietYogaModal isOpen={showDietYogaModal} onClose={() => setShowDietYogaModal(false)} patient={patient} activePlan={activeLifestylePlan} onSavePlan={(plan) => handleAddRx(patient.id, plan)} />
      <RequestLabReportModal isOpen={showOrderLab} onClose={() => setShowOrderLab(false)} patient={patient} onRequest={handleRequestLab} />
      <InlineRecordPaymentModal isOpen={showRecordPayment} onClose={() => setShowRecordPayment(false)} patient={patient} onSavePayment={handleAddPayment} />
      <ViewRxDocModal rx={selectedRxDoc} patient={patient} labRequests={labRequests} isOpen={!!selectedRxDoc} onClose={() => setSelectedRxDoc(null)} />
      <ViewLabDocModal report={selectedLabDoc} patient={patient} isOpen={!!selectedLabDoc} onClose={() => setSelectedLabDoc(null)} />
      <ViewInvoiceModal invoice={selectedInvoice} patient={patient} isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}

/* ─── Add Patient Modal ─────────────────────────── */
function AddPatientModal({ isOpen, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', age: '', blood: '', diagnosis: '', address: '' });
  const handle = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    onAdd({ ...form, age: form.age ? Number(form.age) : '—' });
    setForm({ name: '', phone: '', email: '', age: '', blood: '', diagnosis: '', address: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Patient" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Full Name *</label>
            <input required value={form.name} onChange={(e) => handle('name', e.target.value)} placeholder="e.g. Meera Nair"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Phone *</label>
            <input required value={form.phone} onChange={(e) => handle('phone', e.target.value)} placeholder="+91 90000 00000"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Age</label>
            <input type="number" value={form.age} onChange={(e) => handle('age', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Blood Group</label>
            <input value={form.blood} onChange={(e) => handle('blood', e.target.value)} placeholder="e.g. B+"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={(e) => handle('email', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Presenting Concern / Diagnosis</label>
          <input value={form.diagnosis} onChange={(e) => handle('diagnosis', e.target.value)} placeholder="e.g. Irregular Cycles"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300" />
        </div>
        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          <button type="submit" className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
            <i className="fas fa-user-plus"></i> Add to Registry
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorPatients() {
  const toast = useToast();
  const navigate = useNavigate();
  const { patients, updatePatient, addPatient } = useClinicData();
  const [search, setSearch] = useState('');
  const [callingPatientId, setCallingPatientId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkModalParams, setBulkModalParams] = useState({ isOpen: false, channel: '' });
  const actionsMenuRef = useRef(null);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  // Hooks must run unconditionally on every render, so the outside-click listener is
  // wired up here regardless of whether the full-page EMR view is about to short-circuit
  // the rest of this render — moving it below the early return caused a hook-count
  // mismatch (and a hard crash) whenever selectedPatient toggled between renders.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdatePatient = (updatedPatient) => {
    updatePatient(updatedPatient);
  };

  const startInstantCall = async (patient) => {
    if (callingPatientId) return; // one call attempt at a time
    setCallingPatientId(patient.id);
    try {
      const appt = await apiFetch('/appointments/instant-call', { method: 'POST', body: { patientId: patient.id } });
      navigate('/doctor-dashboard/telemedicine', {
        state: {
          instantCallSession: {
            id: appt.id,
            patientId: appt.patient_id,
            patient: appt.patientName,
            age: patient.age ? `${patient.age}F` : '—',
            type: 'Instant Video Consultation',
            time: appt.scheduled_time,
            date: 'Today',
            phone: patient.phone || '—',
            waiting: true,
            accepted: true,
            status: appt.status,
          },
        },
      });
    } catch (err) {
      toast(err.message || `Failed to start a video call with ${patient.name}`, 'error');
    } finally {
      setCallingPatientId(null);
    }
  };

  const handleAddPatient = async (form) => {
    try {
      const created = await addPatient(form);
      setShowAddPatient(false);
      toast(`${created.name} added to the patient registry.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to add patient', 'error');
    }
  };

  // If a patient is selected, render the FULL PAGE EMR view!
  if (selectedPatient) {
    return (
      <PatientEMRFullPage
        patient={selectedPatient}
        onBack={() => setSelectedPatientId(null)}
        toast={toast}
        onUpdatePatient={handleUpdatePatient}
      />
    );
  }

  const filtered = patients.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      (p.mrn && p.mrn.toLowerCase().includes(search.toLowerCase())) ||
      (p.phone && p.phone.includes(search));
    const matchStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'alert'
        ? Boolean(p.alert)
        : p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const exportPatientsCsv = () => {
    const selected = filtered.filter(p => selectedIds.includes(p.id));
    const header = ['Name', 'Phone', 'Email', 'Age', 'Blood Group', 'MRN', 'Diagnosis', 'City'];
    const csvRows = selected.map(p => [p.name, p.phone, p.email, p.age, p.blood, p.mrn, p.diagnosis, p.city]);
    const csv = [header, ...csvRows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${selected.length} patients.`, 'success');
  };

  const sendBulkMessage = async (channel, messageText) => {
    const recipients = filtered.filter(p => selectedIds.includes(p.id));
    try {
      await apiFetch('/communications/broadcasts', {
        method: 'POST',
        body: {
          subject: channel,
          body: messageText,
          audience: `Selected Patients — ${recipients.length} patient(s)`,
          channels: [channel],
          scheduleType: 'immediate',
          patientIds: recipients.map(p => p.id),
        },
      });
      toast(`${channel} sent to ${recipients.length} patient(s).`, 'success');
    } catch (err) {
      toast(err.message || `Failed to send ${channel}`, 'error');
    }
    setSelectedIds([]);
  };

  const handleBulkAction = (action) => {
    setShowActionsMenu(false);
    if (selectedIds.length === 0) {
      toast('Please select at least one patient first.', 'error');
      return;
    }
    if (action === 'Export CSV') {
      exportPatientsCsv();
    } else {
      setBulkModalParams({ isOpen: true, channel: action });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalPrescriptionsCount = patients.reduce((acc, p) => acc + (p.meds?.length || 0), 0);
  const totalReportsCount = patients.reduce((acc, p) => acc + (p.reports?.length || 0), 0);

  const AVATAR_GRADIENTS = [
    'from-aubergine-600 via-indigo-700 to-purple-800 text-white',
    'from-teal-600 via-emerald-600 to-teal-800 text-white',
    'from-rose-500 via-pink-600 to-rose-700 text-white',
    'from-violet-600 via-purple-700 to-indigo-800 text-white',
    'from-amber-500 via-orange-600 to-amber-700 text-white',
    'from-sky-600 via-blue-600 to-indigo-700 text-white',
  ];

  const getDiagnosisStyle = (diagnosis = '') => {
    const d = diagnosis.toLowerCase();
    if (d.includes('pcos') || d.includes('ovary') || d.includes('ovarian')) {
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-900',
        border: 'border-purple-200',
        icon: 'fa-dna text-purple-600',
        dot: 'bg-purple-500',
      };
    }
    if (d.includes('thyroid') || d.includes('hypothyroid') || d.includes('hashimoto')) {
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        border: 'border-amber-200',
        icon: 'fa-sun text-amber-600',
        dot: 'bg-amber-500',
      };
    }
    if (d.includes('pregnan') || d.includes('prenatal') || d.includes('trimester') || d.includes('fertility')) {
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-900',
        border: 'border-emerald-200',
        icon: 'fa-baby text-emerald-600',
        dot: 'bg-emerald-500',
      };
    }
    if (d.includes('endo') || d.includes('fibroid') || d.includes('pelvic') || d.includes('dysmenorrhea')) {
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-900',
        border: 'border-rose-200',
        icon: 'fa-shield-halved text-rose-600',
        dot: 'bg-rose-500',
      };
    }
    return {
      bg: 'bg-indigo-50',
      text: 'text-indigo-900',
      border: 'border-indigo-200',
      icon: 'fa-stethoscope text-indigo-600',
      dot: 'bg-indigo-500',
    };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-purple-900/5 via-aubergine-900/5 to-transparent p-4 sm:p-6 rounded-3xl border border-purple-100/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-aubergine-800 font-mono bg-aubergine-100/70 px-2.5 py-0.5 rounded-md border border-aubergine-200/50">
              Verified Clinical EMR Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Patients &amp; Medical Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Electronic health records, hormonal profiles, active prescriptions, and diagnostic lab monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs hover:border-slate-300"
            >
              <i className="fas fa-layer-group text-aubergine-600"></i>
              <span>Batch Actions</span>
              <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}></i>
            </button>
            {showActionsMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                <div className="px-3 py-1.5 mb-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bulk Messaging</p>
                </div>
                <button onClick={() => handleBulkAction('Bulk Email')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-aubergine-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-envelope text-aubergine-600 w-4"></i> Bulk Email
                </button>
                <button onClick={() => handleBulkAction('Push Notification')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-3 transition-colors">
                  <i className="fas fa-bell text-amber-500 w-4"></i> Push Notification
                </button>
                <button onClick={() => handleBulkAction('WhatsApp Message')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-3 transition-colors">
                  <i className="fab fa-whatsapp text-emerald-500 w-4 text-base"></i> WhatsApp Message
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button onClick={() => handleBulkAction('Export CSV')} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-3 transition-colors">
                  <i className="fas fa-file-export text-slate-500 w-4"></i> Export Selected ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddPatient(true)}
            className="bg-gradient-to-r from-aubergine-700 via-aubergine-800 to-indigo-900 hover:from-aubergine-600 hover:to-indigo-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-aubergine-900/20 hover:shadow-lg hover:-translate-y-0.5"
          >
            <i className="fas fa-user-plus text-xs text-aubergine-200"></i>
            <span>Add Walk-in Patient</span>
          </button>
        </div>
      </div>

      {/* Top Clinical Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Registry */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-indigo-50/30 rounded-2xl border border-purple-100/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-purple-300 hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Total Registry
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight font-display">{patients.length}</h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                <i className="fas fa-check-circle text-[10px]"></i> Synchronized EMR
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-aubergine-600 via-aubergine-700 to-indigo-800 text-white flex items-center justify-center text-lg shadow-md shadow-purple-900/20">
              <i className="fas fa-hospital-user"></i>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-purple-400/10 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 2: Active Care Pathways */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 rounded-2xl border border-emerald-100/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Active Pathways
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight font-display">
                {patients.filter(p => p.status === 'active').length}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <i className="fas fa-heart-pulse text-[10px]"></i> Under Care Management
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-700/20">
              <i className="fas fa-heart-pulse"></i>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 3: Clinical Alerts */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-rose-50/50 to-pink-50/30 rounded-2xl border border-rose-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Clinical Alerts
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-950 mt-1.5 tracking-tight font-display">
                {patients.filter(p => p.alert).length}
              </h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                <i className="fas fa-bell text-[10px]"></i> Requires Doctor Review
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 text-white flex items-center justify-center text-lg shadow-md shadow-rose-700/20 animate-pulse">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-rose-400/10 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 4: Prescriptions & Diagnostics */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-violet-50/40 to-fuchsia-50/30 rounded-2xl border border-violet-100/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-violet-700 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                Rx &amp; Diagnostics
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight font-display">
                {totalPrescriptionsCount + totalReportsCount}
              </h3>
              <p className="text-[11px] text-violet-600 font-semibold mt-0.5 flex items-center gap-1">
                <span>{totalPrescriptionsCount} Rx</span> • <span>{totalReportsCount} Labs</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white flex items-center justify-center text-lg shadow-md shadow-violet-700/20">
              <i className="fas fa-file-waveform"></i>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-violet-400/10 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name, diagnosis, MRN, or phone number..."
              className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-400/30 focus:border-aubergine-500 bg-slate-50/70 hover:bg-slate-50 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-slate-200/60 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Patients', count: patients.length, activeClass: 'bg-gradient-to-r from-aubergine-800 to-[#2A1647] text-white shadow-sm shadow-aubergine-900/20 border-aubergine-900', icon: 'fa-users' },
              { id: 'active', label: 'Active Care', count: patients.filter(p => p.status === 'active').length, activeClass: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-700/20 border-emerald-700', icon: 'fa-heart-pulse' },
              { id: 'alert', label: 'Clinical Alerts', count: patients.filter(p => p.alert).length, activeClass: 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-sm shadow-rose-700/20 border-rose-700', icon: 'fa-triangle-exclamation' },
              { id: 'inactive', label: 'Inactive', count: patients.filter(p => p.status === 'inactive').length, activeClass: 'bg-slate-700 text-white border-slate-700', icon: 'fa-clock-rotate-left' },
            ].map(({ id, label, count, activeClass, icon }) => (
              <button
                key={id}
                onClick={() => setFilterStatus(id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-2 ${filterStatus === id
                  ? activeClass
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                <i className={`fas ${icon} text-[11px] ${filterStatus === id ? 'text-white' : 'text-slate-400'}`}></i>
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${filterStatus === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selection & Quick Count Bar */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-aubergine-700 focus:ring-aubergine-400 h-4 w-4"
              checked={selectedIds.length === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="font-semibold text-slate-700">Select All ({filtered.length})</span>
          </label>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-aubergine-800 font-bold bg-aubergine-50 px-2.5 py-0.5 rounded-md border border-aubergine-200">
                {selectedIds.length} Selected
              </span>
            )}
            <span>Showing <strong className="text-slate-800 font-bold">{filtered.length}</strong> patient{filtered.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      {/* Patient Cards List */}
      <div className="space-y-3.5">
        {filtered.map((p, idx) => {
          const isSelected = selectedIds.includes(p.id);
          const initials = p.name ? p.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'PT';
          const rxCount = p.meds?.length || 0;
          const labCount = p.reports?.length || 0;
          const diagStyle = getDiagnosisStyle(p.diagnosis);
          const avatarGradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

          return (
            <div
              key={p.id}
              className={`group bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs hover:shadow-md ${isSelected
                ? 'border-aubergine-400 bg-aubergine-50/20 ring-2 ring-aubergine-400/20'
                : 'border-slate-200 hover:border-aubergine-200'
                }`}
            >
              {/* Left Column: Checkbox, Avatar, Identity */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Selection Checkbox */}
                <div className="pt-1.5 sm:pt-0 flex-shrink-0">
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-aubergine-700 focus:ring-aubergine-400 h-4 w-4"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </label>
                </div>

                {/* Vibrant Gradient Avatar with Status Pulse */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient} font-black text-sm flex items-center justify-center shadow-sm tracking-wider border border-white/20`}>
                    {initials}
                  </div>
                  {p.status === 'active' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5" title="Active Patient">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white shadow-xs"></span>
                    </span>
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-400 rounded-full border-2 border-white shadow-xs" title="Inactive"></span>
                  )}
                </div>

                {/* Patient Primary Details */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 text-base leading-snug group-hover:text-aubergine-800 transition-colors">
                      {p.name}
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                      #{p.mrn || p.id?.slice(0, 8)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 bg-purple-50/70 border border-purple-100 px-2 py-0.5 rounded-md">
                      {p.age} Yrs • Female
                    </span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                      <i className="fas fa-droplet text-[9px] text-rose-500"></i> {p.blood || 'O+'}
                    </span>
                    {p.status === 'active' && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Active Care
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {/* Rich Condition Badge */}
                    <span className={`text-xs font-bold ${diagStyle.bg} ${diagStyle.text} border ${diagStyle.border} px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-2xs`}>
                      <i className={`fas ${diagStyle.icon} text-[11px]`}></i>
                      <span>{p.diagnosis || 'Clinical Evaluation'}</span>
                    </span>

                    {/* Prominent Clinical Alert */}
                    {p.alert && (
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-2xs animate-pulse">
                        <i className="fas fa-triangle-exclamation text-[11px] text-rose-600"></i>
                        <span>{p.alert}</span>
                      </span>
                    )}

                    {/* Vitals: BP, Pulse, etc. */}
                    {p.bp && p.bp !== '—' && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <i className="fas fa-gauge-high text-[10px] text-slate-400"></i>
                        <span>BP: <strong className="text-slate-800 font-bold">{p.bp}</strong></span>
                      </span>
                    )}

                    {p.city && (
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <i className="fas fa-location-dot text-[10px] text-slate-400"></i>
                        <span>{p.city}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Metrics: Prescriptions, Lab Reports, Visits */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-left border-y sm:border-y-0 sm:border-l sm:border-r border-slate-100 py-2.5 sm:py-0 sm:px-5 shrink-0 w-full sm:w-auto">
                <div className="bg-emerald-50/60 border border-emerald-100/90 rounded-xl px-3 py-2 text-center min-w-[95px]">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Rx Orders</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-950 flex items-center justify-center gap-1 mt-0.5">
                    <i className="fas fa-file-prescription text-emerald-600 text-xs"></i>
                    <span>{rxCount} Active</span>
                  </span>
                </div>
                <div className="bg-indigo-50/60 border border-indigo-100/90 rounded-xl px-3 py-2 text-center min-w-[95px]">
                  <span className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider block">Lab Tests</span>
                  <span className="text-xs sm:text-sm font-black text-indigo-950 flex items-center justify-center gap-1 mt-0.5">
                    <i className="fas fa-vial text-indigo-600 text-xs"></i>
                    <span>{labCount} Tests</span>
                  </span>
                </div>
                <div className="bg-purple-50/60 border border-purple-100/90 rounded-xl px-3 py-2 text-center min-w-[95px]">
                  <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">Last Visit</span>
                  <span className="text-xs sm:text-sm font-black text-purple-950 flex items-center justify-center gap-1 mt-0.5">
                    <i className="fas fa-calendar-check text-purple-600 text-xs"></i>
                    <span className="truncate">{p.lastVisit || 'Initial'}</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={() => startInstantCall(p)}
                  disabled={callingPatientId === p.id}
                  className="h-10 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 disabled:opacity-50 flex items-center gap-2 transition-all font-bold text-xs shadow-xs hover:shadow"
                  title={`Start a live telemedicine video call with ${p.name}`}
                >
                  {callingPatientId === p.id ? (
                    <i className="fas fa-circle-notch fa-spin"></i>
                  ) : (
                    <i className="fas fa-video text-emerald-600 group-hover:text-white"></i>
                  )}
                  <span>Call</span>
                </button>

                <button
                  onClick={() => setSelectedPatientId(p.id)}
                  className="h-10 bg-gradient-to-r from-aubergine-800 via-aubergine-900 to-[#231139] hover:from-aubergine-700 hover:to-aubergine-800 text-white font-bold px-4 sm:px-5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <i className="fas fa-notes-medical text-xs text-aubergine-200"></i>
                  <span>View EMR</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xs border border-purple-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-200/60 shadow-xs">
              <i className="fas fa-users-slash text-3xl text-aubergine-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1 font-display">No Patients Matching Filter</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5 font-medium">
              We couldn't find any patient record matching your search query or status filter. Try clearing your filters or searching by phone number or MRN.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setFilterStatus('all');
              }}
              className="bg-gradient-to-r from-aubergine-700 to-aubergine-800 hover:from-aubergine-600 hover:to-aubergine-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm hover:shadow transition-all"
            >
              Reset Search &amp; Filters
            </button>
          </div>
        )}
      </div>

      <BulkMessageModal
        isOpen={bulkModalParams.isOpen}
        onClose={() => setBulkModalParams({ isOpen: false, channel: '' })}
        channel={bulkModalParams.channel}
        selectedCount={selectedIds.length}
        onSend={(msg) => sendBulkMessage(bulkModalParams.channel, msg)}
      />

      <AddPatientModal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onAdd={handleAddPatient}
      />
    </div>
  );
}

export default DoctorPatients;
