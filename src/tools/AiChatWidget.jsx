import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import {
  ArrowUp,
  ChevronDown,
  Lock,
  FileUp,
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { getTokens, apiFetch } from '../lib/apiClient.js';
import { triggerHaptic } from '../lib/haptics.js';
import { AIUsageUpgradeModal } from '../components/ai/AIUsageUpgradeModal.jsx';

// The vision ChatGateway listens on the API's own origin (no /api suffix, no
// separate ws proxy) — see vision/src/modules/ai/gateways/chat.gateway.ts.
const RAW_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = RAW_API_URL ? RAW_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

/**
 * 1-Click Sample Lab Reports for Instant Demonstration & Testing
 */
export const SAMPLE_REPORTS = [
  {
    id: 'thyroid',
    label: '🦋 Thyroid (TSH & T4)',
    name: 'Comprehensive Thyroid Panel (TSH / T3 / T4)',
    cyclePhase: 'general',
    text: `Test: Thyroid Profile (CLIA)\n• TSH (Thyroid Stimulating Hormone): 6.85 µIU/mL (Ref: 0.40 - 4.20 µIU/mL) [ELEVATED]\n• Free T4 (Thyroxine): 0.88 ng/dL (Ref: 0.93 - 1.70 ng/dL) [BORDERLINE LOW]\n• Free T3 (Triiodothyronine): 2.4 pg/mL (Ref: 2.0 - 4.4 pg/mL) [NORMAL]\n• Anti-TPO Antibodies: 142 IU/mL (Ref: < 34 IU/mL) [ELEVATED - Hashimoto marker]\nClinical Symptoms: Persistent fatigue, mild weight gain, sensitivity to cold.`,
  },
  {
    id: 'pcos',
    label: '🌸 PCOS Hormone Panel',
    name: 'PCOS & Reproductive Hormone Panel',
    cyclePhase: 'follicular',
    text: `Test: Female Reproductive Endocrine Panel (Day 3 of cycle)\n• LH (Luteinizing Hormone): 14.8 mIU/mL (Ref: 2.4 - 12.6 mIU/mL) [HIGH]\n• FSH (Follicle Stimulating Hormone): 4.9 mIU/mL (Ref: 3.5 - 12.5 mIU/mL) [NORMAL]\n• LH : FSH Ratio: 3.02 : 1 (Normal ratio ~ 1:1; >2.0 indicates PCOS hormonal pattern)\n• Total Testosterone: 68 ng/dL (Ref: 15 - 70 ng/dL) [UPPER BORDERLINE]\n• AMH (Anti-Müllerian Hormone): 8.6 ng/mL (Ref: 1.0 - 4.0 ng/mL) [HIGH - typical of polycystic ovaries]\n• Fasting Insulin: 19.4 µIU/mL (Ref: < 10 µIU/mL) [ELEVATED - Insulin Resistance]`,
  },
  {
    id: 'cbc',
    label: '🩸 CBC & Iron Deficiency',
    name: 'Complete Blood Count & Ferritin',
    cyclePhase: 'general',
    text: `Test: Complete Hemogram & Iron Profile\n• Hemoglobin (Hb): 9.6 g/dL (Ref: 12.0 - 15.5 g/dL) [LOW - Moderate Microcytic Anemia]\n• RBC Count: 3.7 million/µL (Ref: 4.2 - 5.4) [LOW]\n• MCV: 72 fL (Ref: 80 - 100 fL) [LOW]\n• Serum Ferritin: 9.8 ng/mL (Ref: 20 - 200 ng/mL) [SEVERELY LOW - depleted iron stores]\n• Total Iron Binding Capacity (TIBC): 440 µg/dL (Ref: 250 - 400 µg/dL) [HIGH]\nClinical Symptoms: Dizziness on standing, heavy periods, cold extremities.`,
  },
  {
    id: 'metabolic',
    label: '🩺 Metabolic & Blood Sugar',
    name: 'HbA1c & Fasting Lipids',
    cyclePhase: 'general',
    text: `Test: Glycemic & Lipid Evaluation\n• Fasting Blood Sugar (FBS): 116 mg/dL (Ref: 70 - 99 mg/dL) [IMPAIRED FASTING GLUCOSE]\n• HbA1c (Glycated Hemoglobin): 6.3% (Ref: < 5.7% Normal; 5.7 - 6.4% Prediabetes) [PREDIABETIC RANGE]\n• Total Cholesterol: 224 mg/dL (Ref: < 200 mg/dL) [HIGH]\n• Triglycerides: 198 mg/dL (Ref: < 150 mg/dL) [ELEVATED]\n• HDL (Good Cholesterol): 39 mg/dL (Ref: > 50 mg/dL for females) [LOW]\n• LDL (Bad Cholesterol): 145 mg/dL (Ref: < 100 mg/dL) [ELEVATED]`,
  },
];

/**
 * Design direction: "vitals monitor" — a single motif (the ECG/pulse line)
 * appears three times at different scales: the scanning header strip, the
 * idle ring on the launcher, and the typing indicator. Everything else is
 * quiet: solid clinical colors, no gradients, no stock chat-bubble clichés.
 */

const THEMES = {
  landing: {
    primary: '#6B46C1',
    primaryDeep: '#2A1647',
    tint: '#EDE7FF',
    ring: 'rgba(107,70,193,0.28)',
    label: 'HealNari Care Assistant',
    greeting: "Hi! I'm HealNari AI — ask me about specialists, conditions, PCOS, hormone health, or how the platform works.",
    discoveryChips: [
      '📄 Upload & Analyze Report',
      '🔍 Find a PCOS specialist',
      '💊 Hormone health basics',
      '🩺 How does HealNari work?',
      '🧪 What tests do I need?',
    ],
  },
  patient: {
    primary: '#6B46C1',
    primaryDeep: '#2A1647',
    tint: '#EDE7FF',
    ring: 'rgba(107,70,193,0.28)',
    label: 'Your Care Companion',
  },
  doctor: {
    primary: '#1e293b',       /* slate-800 — clinical dark */
    primaryDeep: '#0f172a',   /* slate-900 */
    tint: '#EDE7FF',
    ring: 'rgba(107,70,193,0.28)',
    label: 'AI Copilot',
    greeting: "Hello, Doctor. I can summarize charts, draft notes, check interactions, or query clinical guidelines.",
  },
};

/* ─── Contextual quick actions per doctor route ──────── */
const DOCTOR_QUICK_ACTIONS = {
  '/doctor-dashboard/patients': [
    { label: 'Summarize Chart',     icon: 'fa-file-lines',          prompt: 'Summarize the active patient chart: chief complaint, history, recent labs, and current medications.' },
    { label: 'Draft SOAP Note',     icon: 'fa-file-medical',        prompt: 'Draft a SOAP-format clinical note for today\'s consultation with the active patient.' },
    { label: 'Drug Interactions',   icon: 'fa-pills',               prompt: 'Check the active patient medication list for drug-drug or drug-allergy interactions.' },
    { label: 'DDx Suggestions',     icon: 'fa-diagram-project',     prompt: 'Suggest a differential diagnosis with probability ranking based on the active patient symptoms and history.' },
  ],
  '/doctor-dashboard/prescriptions': [
    { label: 'Contraindications',   icon: 'fa-hand-dots',           prompt: 'Check the active patient prescriptions for contraindications with their allergy profile.' },
    { label: 'Dosage Review',       icon: 'fa-scale-balanced',      prompt: 'Review current dosages against clinical guidelines for the active patient demographics.' },
    { label: 'Generic Alternatives',icon: 'fa-tags',                prompt: 'Suggest generic or biosimilar alternatives for the active patient branded medications.' },
    { label: 'Adherence Tips',      icon: 'fa-clock-rotate-left',   prompt: 'Draft patient-friendly adherence instructions for the current medications.' },
  ],
  '/doctor-dashboard/reports': [
    { label: 'Upload & Interpret',  icon: 'fa-file-arrow-up',       isReportTool: true },
    { label: 'Interpret Results',   icon: 'fa-flask',               prompt: 'Interpret the active patient latest lab results and flag any values outside the reference range.' },
    { label: 'Flag Critical Values',icon: 'fa-triangle-exclamation',prompt: 'Identify any critical or panic-level values in the active patient recent lab reports.' },
    { label: 'Next Steps',          icon: 'fa-list-check',          prompt: 'Suggest appropriate next diagnostic steps or specialist referrals based on the lab results.' },
  ],
  '/doctor-dashboard/appointments': [
    { label: 'Pre-Consult Brief',   icon: 'fa-clipboard-list',      prompt: 'Prepare a concise pre-consultation brief for the next appointment based on patient history.' },
    { label: 'Follow-Up Interval',  icon: 'fa-calendar-check',      prompt: 'Suggest an appropriate follow-up interval and milestones for the active patient.' },
    { label: 'Referral Letter',     icon: 'fa-envelope-open-text',  prompt: 'Draft a referral letter for the active patient to a relevant specialist.' },
    { label: 'Appointment Prep',    icon: 'fa-notes-medical',       prompt: 'What key questions should I ask and what information should I review for my next patient?' },
  ],
  '/doctor-dashboard': [
    { label: "Today's Queue",       icon: 'fa-list-ol',             prompt: 'Give me a brief summary of today appointment queue, any urgent flags, and telemedicine sessions.' },
    { label: 'Pending Actions',     icon: 'fa-clipboard-check',     prompt: 'List all pending clinical actions: lab reviews, refill requests, and unread messages.' },
    { label: 'Clinical Guideline',  icon: 'fa-book-medical',        prompt: 'What are the current clinical guidelines for ' },
    { label: 'Drug Information',    icon: 'fa-capsules',            prompt: 'Give me clinical information about the drug: ' },
  ],
};

function getDoctorActions(pathname) {
  const match = Object.keys(DOCTOR_QUICK_ACTIONS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? DOCTOR_QUICK_ACTIONS[match] : DOCTOR_QUICK_ACTIONS['/doctor-dashboard'];
}

function getPageLabel(pathname) {
  if (pathname.includes('/patients'))      return { icon: 'fa-users',               label: 'Patients & EMR' };
  if (pathname.includes('/prescriptions')) return { icon: 'fa-file-prescription',   label: 'Prescriptions' };
  if (pathname.includes('/reports'))       return { icon: 'fa-flask',               label: 'Lab & Reports' };
  if (pathname.includes('/appointments'))  return { icon: 'fa-calendar-check',      label: 'Appointments' };
  if (pathname.includes('/telemedicine'))  return { icon: 'fa-video',               label: 'Telemedicine' };
  if (pathname.includes('/analytics'))     return { icon: 'fa-chart-line',          label: 'Analytics' };
  return { icon: 'fa-chart-pie', label: 'Dashboard' };
}

/* ─── Patient contextual quick actions per route ─────── */
const PATIENT_QUICK_ACTIONS = {
  '/patient-dashboard/records': [
    { label: 'Upload & Decode Report', icon: 'fa-file-arrow-up',    isReportTool: true },
    { label: 'Explain My Results', icon: 'fa-flask',               prompt: 'Help me understand my latest lab results in simple language. What do the values mean?' },
    { label: 'What Tests Do I Need?', icon: 'fa-vial-circle-check',  prompt: 'Based on my health history and symptoms, what diagnostic tests should I ask my doctor about?' },
    { label: 'Ask My Doctor',      icon: 'fa-comment-medical',     prompt: 'Help me prepare a list of questions to ask my doctor about my recent medical records.' },
  ],
  '/patient-dashboard/prescriptions': [
    { label: 'What Is This Drug?', icon: 'fa-pills',               prompt: 'Explain what my prescribed medication does, its side effects, and what to avoid.' },
    { label: 'Missed Dose?',       icon: 'fa-clock',               prompt: 'What should I do if I miss a dose of my medication? Is it safe to double up?' },
    { label: 'Side Effects Help',  icon: 'fa-face-grimace',        prompt: 'I am experiencing side effects from my medication. What are common ones and when should I call my doctor?' },
    { label: 'Food Interactions',  icon: 'fa-utensils',            prompt: 'Are there foods or drinks I should avoid while taking my current medications?' },
  ],
  '/patient-dashboard/appointments': [
    { label: 'Prep for Visit',     icon: 'fa-clipboard-list',      prompt: 'Help me prepare for my upcoming doctor appointment. What symptoms and information should I bring?' },
    { label: 'What to Expect',     icon: 'fa-stethoscope',         prompt: 'What typically happens during a gynaecology or specialist consultation? How should I prepare?' },
    { label: 'Telemedicine Tips',  icon: 'fa-video',               prompt: 'Give me tips for making the most of a telemedicine video consultation with my doctor.' },
    { label: 'Follow-Up Timing',   icon: 'fa-calendar-plus',       prompt: 'How do I know when I need a follow-up appointment vs waiting to see if symptoms resolve?' },
  ],
  '/patient-dashboard/tracking': [
    { label: 'Understand My Data', icon: 'fa-chart-line',          prompt: 'Help me interpret my health tracking trends. What do changes in my vitals mean?' },
    { label: 'Improve My Numbers', icon: 'fa-arrow-trend-up',      prompt: 'What lifestyle changes can help improve my health tracking numbers like weight, BP, or glucose?' },
    { label: 'Symptom Checker',    icon: 'fa-magnifying-glass',    prompt: 'I have been experiencing symptoms. Help me understand possible causes and whether to see a doctor.' },
    { label: 'Track More',         icon: 'fa-plus-circle',         prompt: 'What health metrics should I track regularly for better insight into my hormonal and overall health?' },
  ],
  '/patient-dashboard/fertility': [
    { label: 'Cycle Explained',    icon: 'fa-circle-dot',          prompt: 'Explain my menstrual cycle phases and what each phase means for my hormones and fertility.' },
    { label: 'PCOS & Fertility',   icon: 'fa-seedling',            prompt: 'How does PCOS affect fertility and what can I do to support my reproductive health naturally?' },
    { label: 'Ovulation Window',   icon: 'fa-calendar-heart',      prompt: 'How do I calculate my ovulation window and what are the most reliable signs of ovulation?' },
    { label: 'Hormone Balance',    icon: 'fa-balance-scale',       prompt: 'What are signs of hormone imbalance in women and what natural steps can help balance them?' },
  ],
  '/patient-dashboard/lifestyle': [
    { label: 'PCOS Diet Tips',     icon: 'fa-apple-whole',         prompt: 'Give me evidence-based dietary recommendations for managing PCOS and insulin resistance.' },
    { label: 'Yoga for Hormones',  icon: 'fa-person-dots-from-line', prompt: 'Which yoga poses and exercises are best for hormone balance and PCOS management?' },
    { label: 'Stress & Hormones',  icon: 'fa-brain',               prompt: 'How does chronic stress affect women hormonal health and what stress-reduction techniques help most?' },
    { label: 'Sleep & Hormones',   icon: 'fa-moon',                prompt: 'How does sleep quality affect hormones like cortisol, estrogen, and insulin? Tips to improve sleep?' },
  ],
  '/patient-dashboard/ai': [
    { label: 'Health Summary',     icon: 'fa-file-lines',          prompt: 'Give me a summary of common health topics for women: PCOS, thyroid, iron deficiency, and hormones.' },
    { label: 'Ask About PCOS',     icon: 'fa-circle-question',     prompt: 'Explain PCOS: symptoms, causes, diagnosis, and management options available.' },
    { label: 'Symptom Help',       icon: 'fa-stethoscope',         prompt: 'I have a symptom I want to understand. Please ask me questions to help identify possible causes.' },
    { label: 'Wellness Plan',      icon: 'fa-heart-pulse',         prompt: 'Help me create a personalised wellness plan covering diet, exercise, sleep, and stress management.' },
  ],
  '/patient-dashboard': [
    { label: 'How Am I Doing?',    icon: 'fa-chart-pie',           prompt: 'Give me a friendly overview of things I should focus on for my health this week.' },
    { label: 'PCOS Basics',        icon: 'fa-circle-question',     prompt: 'Explain PCOS in simple terms: what it is, common symptoms, and first steps to manage it.' },
    { label: 'Ask a Question',     icon: 'fa-comment-medical',     prompt: 'I have a health question I would like help understanding:' },
    { label: 'Find a Specialist',  icon: 'fa-user-doctor',         prompt: 'What type of specialist should I see for my symptoms and how do I find the right one?' },
  ],
};

function getPatientActions(pathname) {
  const match = Object.keys(PATIENT_QUICK_ACTIONS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PATIENT_QUICK_ACTIONS[match] : PATIENT_QUICK_ACTIONS['/patient-dashboard'];
}

function getPatientPageLabel(pathname) {
  if (pathname.includes('/records'))       return { icon: 'fa-file-medical',        label: 'Medical Records' };
  if (pathname.includes('/prescriptions')) return { icon: 'fa-pills',               label: 'Prescriptions' };
  if (pathname.includes('/appointments'))  return { icon: 'fa-calendar-check',      label: 'Appointments' };
  if (pathname.includes('/tracking'))      return { icon: 'fa-heart-pulse',         label: 'Health Tracking' };
  if (pathname.includes('/fertility'))     return { icon: 'fa-circle-dot',          label: 'Cycle & Fertility' };
  if (pathname.includes('/lifestyle'))     return { icon: 'fa-seedling',            label: 'Diet & Wellness' };
  if (pathname.includes('/ai'))            return { icon: 'fa-wand-magic-sparkles', label: 'AI Health Hub' };
  if (pathname.includes('/find-doctor'))   return { icon: 'fa-user-doctor',         label: 'Find Specialist' };
  if (pathname.includes('/family'))        return { icon: 'fa-users',               label: 'Care Circle' };
  if (pathname.includes('/billing'))       return { icon: 'fa-credit-card',         label: 'Billing' };
  return { icon: 'fa-house', label: 'My Dashboard' };
}

const ECG_PATH =
  'M0,12 L28,12 L34,3 L40,21 L46,1 L52,12 L96,12 L102,3 L108,21 L114,1 L120,12 L168,12 L200,12 ' +
  'M200,12 L228,12 L234,3 L240,21 L246,1 L252,12 L296,12 L302,3 L308,21 L314,1 L320,12 L368,12 L400,12';

function PulseLine({ color, opacity = 0.32 }) {
  return (
    <div className="absolute left-0 right-0 bottom-0 h-6 overflow-hidden pointer-events-none" style={{ opacity }}>
      <svg className="hn-scan" width="400" height="24" viewBox="0 0 400 24">
        <path d={ECG_PATH} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function parseMessageStatus(rawText) {
  if (!rawText || typeof rawText !== 'string') return { status: null, cleanText: '' };

  if (rawText.includes('[STATUS: GENERAL_WELLNESS]')) {
    return {
      status: {
        type: 'wellness',
        label: 'General wellness information',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: 'fa-leaf',
      },
      cleanText: rawText.replace(/\[STATUS:\s*GENERAL_WELLNESS\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: DISCUSS_WITH_DOCTOR]')) {
    return {
      status: {
        type: 'discuss',
        label: 'Possible topic to discuss with a doctor',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        icon: 'fa-user-doctor',
      },
      cleanText: rawText.replace(/\[STATUS:\s*DISCUSS_WITH_DOCTOR\]/g, '').trim(),
    };
  }
  if (rawText.includes('[STATUS: MEDICAL_ASSESSMENT_REQUIRED]')) {
    return {
      status: {
        type: 'urgent',
        label: 'Professional medical assessment recommended',
        color: 'bg-rose-50 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
        icon: 'fa-triangle-exclamation',
      },
      cleanText: rawText.replace(/\[STATUS:\s*MEDICAL_ASSESSMENT_REQUIRED\]/g, '').trim(),
    };
  }

  return { status: null, cleanText: rawText };
}

export const openAiChatWidget = (prompt = '') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-healnari-ai-chat', { detail: { prompt } }));
  }
};

export default function AiChatWidget({ context = 'landing', activePatient = null }) {
  const theme = THEMES[context] || THEMES.landing;
  const location = useLocation();
  const isDoctor  = context === 'doctor';
  const isPatient = context === 'patient';
  const isLanding = context === 'landing';

  /* Doctor-context derived values */
  const pageCtx    = isDoctor ? getPageLabel(location.pathname) : null;
  const docActions = isDoctor ? getDoctorActions(location.pathname) : [];
  const hasPatient = isDoctor && activePatient?.name && activePatient.name !== 'No Patient Selected';

  /* Patient-context derived values */
  const patPageCtx    = isPatient ? getPatientPageLabel(location.pathname) : null;
  const patActions    = isPatient ? getPatientActions(location.pathname) : [];

  /* Save-to-note confirmation state per message index */
  const [saveConfirm, setSaveConfirm] = useState(null); // index of message being confirmed
  const [savedNotes,  setSavedNotes]  = useState(new Set());

  const [isOpen, setIsOpen] = useState(false);

  // Global listener to allow opening widget programmatically from anywhere
  useEffect(() => {
    const handleOpen = (e) => {
      setIsOpen(true);
      if (e?.detail?.prompt) {
        setInput(e.detail.prompt);
      }
      if (e?.detail?.openReportTool) {
        setReportModalOpen(true);
      }
    };
    window.addEventListener('open-healnari-ai-chat', handleOpen);
    return () => window.removeEventListener('open-healnari-ai-chat', handleOpen);
  }, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [activeToolActivity, setActiveToolActivity] = useState(null);
  const [paywallModalOpen, setPaywallModalOpen] = useState(false);
  const [paywallData, setPaywallData] = useState(null);
  const [subData, setSubData] = useState(null);
  const [remainingUses, setRemainingUses] = useState(null);
  const socketRef = useRef(null);

  /* Report Analyzer Tool State */
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportFile, setReportFile] = useState(null); // { name, size, type, previewUrl }
  const [reportName, setReportName] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportCyclePhase, setReportCyclePhase] = useState('general');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      setFileError('Please upload a PDF, PNG, JPG, or TXT file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size should be under 10 MB.');
      return;
    }

    setIsReadingFile(true);

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result || '';
        setReportFile({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB', type: 'text' });
        setReportText(text);
        if (!reportName) {
          setReportName(file.name.replace(/\.[^/.]+$/, ''));
        }
        setIsReadingFile(false);
      };
      reader.onerror = () => {
        setFileError('Failed to read text file.');
        setIsReadingFile(false);
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        setReportFile({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: 'image',
          previewUrl: dataUrl,
        });
        if (!reportName) {
          setReportName(file.name.replace(/\.[^/.]+$/, ''));
        }
        setIsReadingFile(false);
      };
      reader.onerror = () => {
        setFileError('Failed to load image preview.');
        setIsReadingFile(false);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setReportFile({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: 'pdf',
      });
      if (!reportName) {
        setReportName(file.name.replace(/\.[^/.]+$/, ''));
      }
      setIsReadingFile(false);
    }
  };

  const handleAnalyzeReportSubmit = (e) => {
    e?.preventDefault();
    if (!reportText.trim() && !reportFile) {
      setFileError('Please provide report details or upload a report file.');
      return;
    }

    const title = reportName.trim() || reportFile?.name || 'Diagnostic Lab Report';
    const phaseLabel = {
      general: 'General / Standard Reference Range',
      follicular: 'Follicular Phase (Days 1–14)',
      ovulation: 'Ovulation Window (Mid-cycle)',
      luteal: 'Luteal Phase (Days 15–28)',
      menstrual: 'Menstrual Phase (Bleeding days)',
      menopause: 'Perimenopause / Menopause',
    }[reportCyclePhase] || reportCyclePhase;

    let compiledPrompt = `[REPORT ANALYZER REQUEST]\n📋 Report Name: ${title}\n🩸 Hormonal / Cycle Context: ${phaseLabel}\n`;
    if (reportFile) {
      compiledPrompt += `📎 Attached File: ${reportFile.name} (${reportFile.size})\n`;
    }
    if (reportText.trim()) {
      compiledPrompt += `\n📊 Report Findings & Biomarkers:\n${reportText.trim()}\n`;
    } else if (reportFile) {
      compiledPrompt += `\n(User uploaded diagnostic document: ${reportFile.name} for medical evaluation)\n`;
    }

    compiledPrompt += `\n❓ CLINICAL GUIDANCE REQUEST:
Please evaluate this diagnostic report thoroughly and explain in clear, structured, reassuring language:
1. 📋 Biomarker Status: Which markers are Normal, High, or Low with brief plain-English physiological meaning.
2. 🎯 ACTIONABLE STEPS — "What Can Be Done Based on This Report" ("Is report me kya kya kar sakte hai"):
   - 🥗 Diet & Nutrition: Specific foods to prioritize and foods to avoid based on the abnormal biomarkers.
   - 🏃‍♀️ Lifestyle & Exercise: Tailored physical movement, sleep, and stress management habits.
   - 👩‍⚕️ Which Doctor to Consult: Advise specifically which specialist department to visit (e.g. Gynaecologist, Endocrinologist, General Physician) and suggested urgency.
   - 🧪 Follow-up & Retesting: Recommended timeline to retest and companion tests to consider.
   - 💬 Smart Questions for Your Doctor: 3-4 precise questions prepared for the consultation.
   - ⚠️ Red Flags / Warning Signs: Symptoms that warrant prompt medical evaluation.`;

    setReportModalOpen(false);
    sendQuery(compiledPrompt, {
      isReport: true,
      reportTitle: title,
      reportAttachment: reportFile?.name,
    });

    setReportFile(null);
    setReportText('');
    setReportName('');
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: theme.greeting || "Hello! I'm your HealNari AI Care Companion. Ask me about PCOS symptoms, lab reports, hormonal nutrition, or cycle tracking.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeToolActivity]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: getTokens()?.accessToken || null },
      autoConnect: false,
    });
    socketRef.current = socket;

    socket.on('tool_activity', (data) => {
      if (data?.status === 'executing') {
        setActiveToolActivity(data.label || `Consulting ${data.toolName}...`);
      } else if (data?.status === 'completed') {
        setActiveToolActivity(null);
      }
    });

    socket.on('chat_reply', (data) => {
      setIsLoading(false);
      setActiveToolActivity(null);

      if (data?.status === 'paywall') {
        setPaywallData(data.paywallData || {
          title: 'Unlock HealNari AI Assistant',
          description: 'You have reached your free monthly AI allowance. Upgrade to continue your personalized health companion.',
          planName: context === 'doctor' ? 'Doctor AI Pro' : 'HealNari AI Premium',
          features: [
            'Unlimited AI Health Companion questions',
            'Full clinical tool integrations',
            'Priority response processing',
          ],
        });
        setPaywallModalOpen(true);
        return;
      }

      if (data?.status === 'error') {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            role: 'assistant',
            text: data?.message || 'Unable to process request right now. Please try again shortly.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      const replyText = typeof data === 'string'
        ? data
        : (data?.reply || data?.data || data?.text || data?.message || 'I understand. Please consult your HealNari doctor for tailored guidance.');
      
      if (typeof data?.creditsRemaining === 'number') {
        setRemainingUses(data.creditsRemaining);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          toolsUsed: data?.toolsUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    socket.on('error', (err) => {
      setIsLoading(false);
      setActiveToolActivity(null);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Temporary network disconnect. Our encrypted clinical AI engine will reconnect automatically.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    return () => socket.disconnect();
  }, [context]);

  // Fetch Authoritative Plan Status & Remaining Quota
  const loadSubscriptionStatus = async () => {
    try {
      const res = await apiFetch('/ai/subscription/status');
      if (res && res.subscription) {
        setSubData(res);
        setRemainingUses(typeof res.creditsRemaining === 'number' ? res.creditsRemaining : null);
      }
    } catch (e) {
      console.warn('Could not fetch AI subscription in widget:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSubscriptionStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, [isOpen]);

  // Resolve Canonical Plan Details
  // isDoctor is declared at component top — do not redeclare here
  const currentPlanId = subData?.subscription?.plan_id || (isDoctor ? 'doctor_plan_1' : 'patient_plan_1');
  const planDisplayNames = {
    doctor_plan_1: 'Doctor Starter',
    doctor_free: 'Doctor Starter',
    doctor_plan_2: 'Doctor Pro',
    doctor_pro: 'Doctor Pro',
    doctor_plan_3: 'Doctor Premium',
    patient_plan_1: 'Patient Basic',
    patient_free: 'Patient Basic',
    patient_plan_2: 'Patient Pro',
    patient_premium: 'Patient Pro',
    patient_plan_3: 'Patient Premium',
  };
  const currentPlanName = subData?.subscription?.plan_name || planDisplayNames[currentPlanId] || (isDoctor ? 'Doctor Starter' : 'Patient Basic');
  // Only show quota-exhausted state when the server has confirmed the count AND it is 0.
  // null means the subscription status hasn't loaded yet — never block the user on unloaded data.
  const isQuotaExhausted = typeof remainingUses === 'number' && remainingUses <= 0;
  const isHighestTier = currentPlanId === 'doctor_plan_3' || currentPlanId === 'patient_plan_3';

  const sendQuery = (text, meta = {}) => {
    if (!text.trim() || isLoading) return;
    const userMessage = text.trim();
    setInput('');
    setIsLoading(true);

    /* For doctor context, prepend active patient context to the emitted message */
    const patientPrefix = hasPatient
      ? `[Patient context: ${activePatient.name} | MRN: ${activePatient.mrn} | DOB: ${activePatient.dob} | Blood: ${activePatient.bloodGroup} | Allergies: ${(activePatient.allergies || []).join(', ')}] `
      : '';

    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: userMessage,
        isReport: meta.isReport || false,
        reportTitle: meta.reportTitle || null,
        reportAttachment: meta.reportAttachment || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    socketRef.current?.emit('chat_message', { message: patientPrefix + userMessage, context });
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const isDashboardRoute = typeof window !== 'undefined' && window.location.pathname.includes('-dashboard');

  useEffect(() => {
    if (!isDashboardRoute) {
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            setIsScrolled(window.scrollY > 400);
            ticking = false;
          });
          ticking = true;
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isDashboardRoute]);

  const bottomClass = isDashboardRoute
    ? 'bottom-24 md:bottom-8'
    : (isScrolled ? 'bottom-24 md:bottom-8' : 'bottom-5 md:bottom-8');

  return (
    <div
      className={`fixed ${bottomClass} right-3 sm:right-5 md:right-6 z-[60] flex flex-col items-end pointer-events-none transition-all duration-300`}
      style={{
        '--primary': theme.primary,
        '--primary-deep': theme.primaryDeep,
        '--tint': theme.tint,
        '--ring-color': theme.ring,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        .hn-display { font-family: 'Space Grotesk', sans-serif; }
        .hn-body { font-family: 'Inter', sans-serif; }

        @keyframes hn-scan-move { from { transform: translateX(0); } to { transform: translateX(-200px); } }
        .hn-scan { animation: hn-scan-move 3.4s linear infinite; }

        @keyframes hn-ring { 0% { transform: scale(0.85); opacity: 0.55; } 75% { transform: scale(1.55); opacity: 0; } 100% { opacity: 0; } }
        .hn-ring-pulse { animation: hn-ring 2.6s cubic-bezier(0.4,0,0.2,1) infinite; border: 1.5px solid var(--primary); }

        @keyframes hn-panel-in { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .hn-panel-open { animation: hn-panel-in 0.32s cubic-bezier(0.34,1.4,0.64,1) both; }

        .hn-toggle { background-color: var(--primary); }
        .hn-toggle:hover { background-color: var(--primary-deep); }
        .hn-header { background-color: var(--primary); }
        .hn-send { background-color: var(--primary); }
        .hn-send:hover:not(:disabled) { background-color: var(--primary-deep); }
        .hn-input-wrap:focus-within { box-shadow: 0 0 0 3px var(--ring-color); border-color: var(--primary); }

        @media (prefers-reduced-motion: reduce) {
          .hn-scan, .hn-ring-pulse, .hn-panel-open { animation: none !important; }
        }
      `}</style>

      {/* CHAT PANEL */}
      <div
        className={`transition-all duration-300 origin-bottom-right ${
          isOpen ? 'pointer-events-auto mb-4 opacity-100' : 'pointer-events-none opacity-0 absolute bottom-0 right-0 scale-95'
        }`}
      >
        <div
          className={`w-[calc(100vw-2rem)] sm:w-[410px] bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_25px_60px_rgba(42,22,71,0.25)] flex flex-col overflow-hidden border border-aubergine-100/80 ${
            isOpen ? 'hn-panel-open' : ''
          }`}
          style={{ height: 600, maxHeight: 'calc(100dvh - 120px)' }}
        >
          {/* Header — robot icon for all contexts, dark slate for doctor, purple for others */}
          <div className="hn-header relative px-5 pt-4 pb-5 shrink-0 overflow-hidden shadow-md">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    isDoctor
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/20 border-white/30 backdrop-blur-md'
                  }`}>
                    <i className={`fas fa-robot text-[18px] ${
                      isDoctor ? 'text-purple-300' : 'text-white'
                    }`} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="hn-display font-bold text-white text-[15px] tracking-tight leading-none">
                      {isDoctor ? 'AI Copilot' : 'HealNari AI'}
                    </h3>
                    <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/20">
                      {currentPlanName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="hn-body text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {isDoctor ? 'Clinical Intelligence' : isPatient ? 'Your Care Companion' : theme.label}
                    </p>
                    {remainingUses !== null && (
                      <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full ${
                        remainingUses > 5
                          ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                          : remainingUses > 0
                          ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40'
                          : 'bg-rose-400/30 text-rose-200 border border-rose-400/40'
                      }`}>
                        {remainingUses} uses left
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 2 && (
                  <button
                    onClick={() => { triggerHaptic('light'); setMessages([messages[0]]); setSaveConfirm(null); setSavedNotes(new Set()); }}
                    title="Clear Conversation"
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <i className="fas fa-rotate-right text-xs" />
                  </button>
                )}
                <button
                  onClick={() => { triggerHaptic('light'); setIsOpen(false); }}
                  aria-label="Minimize chat"
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-white/90 hover:bg-white/20 transition-colors focus:outline-none"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>
            <PulseLine color="#ffffff" opacity={0.25} />
          </div>

          {/* Doctor: page context + patient strip under header */}
          {isDoctor && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <i className={`fas ${pageCtx?.icon} text-purple-500 text-[10px]`} />
                <span className="font-bold text-slate-700">{pageCtx?.label}</span>
              </div>
              {hasPatient && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <i className="fas fa-user-circle text-emerald-500 text-[10px]" />
                    <span className="font-bold text-slate-700 truncate max-w-[110px]">{activePatient.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">[{activePatient.mrn}]</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clinical Governance Banner — patient/landing only */}
          {!isDoctor && (
            <div className="px-4 py-2 bg-aubergine-50/80 border-b border-aubergine-100 shrink-0 flex items-center gap-2">
              <i className="fas fa-shield-heart text-aubergine-600 text-xs flex-shrink-0" />
              <p className="hn-body text-[10.5px] font-medium text-aubergine-900 leading-snug">
                Encrypted educational care assistant. Not a substitute for direct medical diagnosis or emergency care.
              </p>
            </div>
          )}

          {/* Patient: page context strip */}
          {isPatient && (
            <div className="px-4 py-1.5 bg-aubergine-50/60 border-b border-aubergine-100 shrink-0 flex items-center gap-2">
              <i className={`fas ${patPageCtx?.icon} text-aubergine-500 text-[10px]`} />
              <span className="text-[11px] font-bold text-aubergine-800">{patPageCtx?.label}</span>
              <span className="ml-auto text-[10px] text-aubergine-500 font-medium">Your Care Companion</span>
            </div>
          )}

          {/* Chat Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-50/50 via-white to-aubergine-50/30">
            {messages.map((msg, msgIdx) => {
              const { status, cleanText } = msg.role === 'assistant' ? parseMessageStatus(msg.text) : { status: null, cleanText: msg.text };
              const isSaved = savedNotes.has(msgIdx);
              const isConfirming = saveConfirm === msgIdx;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs transition-all ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-aubergine-600 to-magenta-600 text-white rounded-br-xs font-medium shadow-md shadow-aubergine-500/10'
                        : isDoctor
                          ? 'bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 text-slate-800 rounded-bl-xs font-normal'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs font-normal'
                    }`}
                  >
                    {/* User Report Attachment Badge */}
                    {msg.isReport && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20 text-[11px] font-bold text-white">
                        <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                          <i className="fas fa-file-waveform text-[10px]" />
                        </div>
                        <span className="truncate flex-1">{msg.reportTitle || 'Diagnostic Lab Report'}</span>
                        {msg.reportAttachment && (
                          <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0">
                            {msg.reportAttachment}
                          </span>
                        )}
                      </div>
                    )}

                    {msg.role === 'assistant' && (
                      <div className="space-y-1.5 mb-2">
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                          isDoctor ? 'text-indigo-700' : 'text-aubergine-700'
                        }`}>
                          <i className={`fas ${isDoctor ? 'fa-wand-magic-sparkles text-purple-500' : 'fa-stethoscope text-aubergine-500'}`} />
                          {isDoctor ? 'AI Copilot' : 'HealNari Care Intelligence'}
                        </div>

                        {status && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                            <span>{status.label}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-line text-inherit leading-relaxed">{cleanText}</p>
                  </div>

                  {/* Actions & Timestamp row */}
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    {/* Doctor: Save to Note chip on AI messages */}
                    {isDoctor && msg.role === 'assistant' && msg.id !== 'welcome' && (
                      isSaved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <i className="fas fa-circle-check text-emerald-500" /> Saved to notes
                        </span>
                      ) : isConfirming ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                          <i className="fas fa-triangle-exclamation text-amber-500 text-[10px]" />
                          <span className="text-[10px] font-bold text-amber-800">Confirm?</span>
                          <button onClick={() => { setSavedNotes(p => new Set(p).add(msgIdx)); setSaveConfirm(null); }}
                            className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 ml-0.5">Yes</button>
                          <button onClick={() => setSaveConfirm(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setSaveConfirm(msgIdx)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-2.5 py-0.5 rounded-full transition-all">
                          <i className="fas fa-file-medical text-[9px]" /> Save to Note
                        </button>
                      )
                    )}

                    {msg.role === 'assistant' && msg.id !== 'welcome' && (
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          navigator.clipboard?.writeText(cleanText);
                          setCopiedMsgId(msg.id);
                          setTimeout(() => setCopiedMsgId(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-purple-700 bg-white border border-slate-200 hover:border-purple-300 px-2 py-0.5 rounded-full transition-all"
                        title="Copy response"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check size={10} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    <span className="text-[9px] text-slate-400 font-medium ml-auto">{msg.timestamp}</span>
                  </div>
                </div>
              );
            })}

            {/* Active Tool Execution Pill */}
            {activeToolActivity && (
              <div className="flex flex-col items-start animate-fade-in">
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-3 shadow-sm flex items-center gap-2.5 text-xs text-purple-950 font-bold">
                  <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] animate-spin">
                    <i className="fas fa-gear"></i>
                  </div>
                  <span>{activeToolActivity}</span>
                </div>
              </div>
            )}

            {isLoading && !activeToolActivity && (
              <div className="flex flex-col items-start animate-fade-in">
                <div className="bg-white border border-aubergine-100 rounded-2xl rounded-bl-xs p-3.5 shadow-md flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-aubergine-50 flex items-center justify-center text-aubergine-600 text-xs animate-spin">
                    <i className="fas fa-circle-notch"></i>
                  </div>
                  <div>
                    <span className="text-xs text-slate-700 font-bold block">Synthesizing clinical response...</span>
                    <span className="text-[10px] text-slate-400">Referencing PCOS & hormone protocols</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Discovery chips for landing — shown before user types */}
          {isLanding && messages.length <= 1 && (
            <div className="px-4 pt-1 pb-2.5 border-b border-slate-100 shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-1.5">
                {(theme.discoveryChips || []).map(chip => (
                  <button
                    key={chip}
                    onClick={() => {
                      triggerHaptic('light');
                      if (chip.includes('Report')) {
                        setReportModalOpen(true);
                      } else {
                        sendQuery(chip);
                      }
                    }}
                    className="bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-400 text-slate-700 hover:text-purple-800 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors shadow-2xs active:scale-95 flex items-center gap-1.5"
                  >
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Doctor: contextual quick actions grid (changes per page) */}
          {isDoctor && messages.length <= 1 && (
            <div className="px-3.5 pt-2 pb-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                <i className={`fas ${pageCtx?.icon} text-purple-400 mr-1 text-[9px]`} />
                {pageCtx?.label} — Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {docActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      triggerHaptic('light');
                      if (action.isReportTool) {
                        setReportModalOpen(true);
                      } else {
                        sendQuery(action.prompt);
                      }
                    }}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="ai-intent-card text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/60 transition-all active:scale-95 group bg-white"
                  >
                    <i className={`fas ${action.icon} text-purple-500 text-[10px] mb-1 block group-hover:text-purple-700`} />
                    <p className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 leading-tight">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Patient: contextual quick actions grid (changes per page) */}
          {isPatient && messages.length <= 1 && (
            <div className="px-3.5 pt-2 pb-3 border-b border-aubergine-100/60 bg-aubergine-50/40 shrink-0">
              <p className="text-[10px] font-black text-aubergine-400 uppercase tracking-wider mb-2">
                <i className={`fas ${patPageCtx?.icon} text-aubergine-400 mr-1 text-[9px]`} />
                {patPageCtx?.label} — Ask Me
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {patActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      triggerHaptic('light');
                      if (action.isReportTool) {
                        setReportModalOpen(true);
                      } else {
                        sendQuery(action.prompt);
                      }
                    }}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="text-left p-2.5 rounded-xl border border-aubergine-200/60 hover:border-aubergine-400 hover:bg-aubergine-50 transition-all active:scale-95 group bg-white"
                  >
                    <i className={`fas ${action.icon} text-aubergine-500 text-[10px] mb-1 block group-hover:text-aubergine-700`} />
                    <p className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 leading-tight">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* In-Chat Quota Exhausted Plan Upgrade Banner */}
          {isQuotaExhausted && (
            <div className="mx-4 mb-2 p-3.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div>
                <h4 className="font-bold text-purple-950 flex items-center gap-1.5">
                  <i className="fas fa-lock text-purple-600"></i> Monthly AI Allowance Reached
                </h4>
                <p className="text-[11px] text-purple-800 mt-0.5">
                  You have used all queries in <strong>{currentPlanName}</strong>. Upgrade to unlock more monthly uses.
                </p>
              </div>
              {!isHighestTier && (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    const nextPlanId = isDoctor
                      ? (currentPlanId === 'doctor_plan_2' ? 'doctor_plan_3' : 'doctor_plan_2')
                      : (currentPlanId === 'patient_plan_2' ? 'patient_plan_3' : 'patient_plan_2');
                    setPaywallData({
                      title: `Upgrade from ${currentPlanName}`,
                      description: 'Unlock more monthly AI uses and faster clinical intelligence.',
                      planId: nextPlanId,
                    });
                    setPaywallModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
                >
                  Upgrade Plan →
                </button>
              )}
            </div>
          )}

          {/* INPUT FORM */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-slate-100 shrink-0">
            {/* Quick tool pill bar above input */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); setReportModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-800 border border-purple-200 transition-all shrink-0 active:scale-95 shadow-2xs group"
              >
                <FileText size={12} className="text-purple-600 group-hover:scale-110 transition-transform" />
                <span>Upload Report &amp; Next Steps</span>
                <span className="text-[8.5px] bg-purple-200 text-purple-900 px-1 py-0.2 rounded font-black tracking-wider">TOOL</span>
              </button>
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-2 pr-3 py-1.5 focus-within:ring-2 focus-within:ring-aubergine-500/20 focus-within:border-aubergine-600 transition-all"
            >
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); setReportModalOpen(true); }}
                title="Upload &amp; Analyze Lab Report"
                aria-label="Upload and analyze lab report"
                className="w-7 h-7 rounded-full flex items-center justify-center text-purple-600 hover:text-purple-800 hover:bg-purple-100/60 transition-all active:scale-95 shrink-0"
              >
                <FileUp size={15} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isQuotaExhausted
                    ? `Monthly limit reached (${currentPlanName}). Upgrade to continue...`
                    : isDoctor
                    ? "Ask clinical question or analyze patient case..."
                    : "Ask about symptoms, reports, diet..."
                }
                className="hn-body flex-1 bg-transparent border-none text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoading || isQuotaExhausted}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isQuotaExhausted}
                aria-label="Send message"
                className="hn-send w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white transition-transform disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-sm"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </form>
            <div className="flex items-center justify-between px-2 mt-2">
              <span className="hn-body text-[9.5px] font-medium text-slate-400 flex items-center gap-1">
                <Lock size={10} className="text-emerald-500" /> Private &amp; encrypted
              </span>
              <span className="text-[9.5px] font-bold text-slate-400">Press Enter ↵</span>
            </div>
            {/* Landing: sign-in boundary */}
            {context === 'landing' && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-500">
                <i className="fas fa-lock text-purple-400 text-[9px]" />
                <span>Sign in for your personal health assistant —</span>
                <a href="/" className="text-purple-700 font-black hover:underline">Get started free</a>
              </div>
            )}
          </div>

          {/* REPORT ACTION ANALYZER TOOL DRAWER / MODAL */}
          {reportModalOpen && (
            <div className="absolute inset-0 z-30 bg-white flex flex-col rounded-[2rem] overflow-hidden animate-fade-in shadow-2xl">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-purple-700 via-aubergine-700 to-indigo-800 text-white shrink-0 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-xs">
                    <FileText size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-[13px] tracking-tight text-white leading-none">Report Action Analyzer</h4>
                      <span className="text-[9px] bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 px-1.5 py-0.2 rounded-full font-bold">AI Tool</span>
                    </div>
                    <p className="text-[10.5px] text-purple-200 mt-0.5">Biomarker Decoder &amp; "Kya Karein" Action Guide</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { triggerHaptic('light'); setReportModalOpen(false); }}
                  className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  aria-label="Close report tool"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/60 text-xs">
                {/* Introduction banner */}
                <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/80 text-purple-950 text-[11px] leading-relaxed flex items-start gap-2">
                  <Sparkles size={14} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Discover what your report means and what to do next:</span>
                    <p className="text-purple-800 text-[10.5px] mt-0.5">
                      Get personalized diet modifications, daily lifestyle habits, recommended specialist, follow-up tests, and questions for your doctor.
                    </p>
                  </div>
                </div>

                {/* 1-Click Sample Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                      Quick Sample Reports:
                    </span>
                    <span className="text-[9.5px] text-purple-600 font-bold">1-click test</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SAMPLE_REPORTS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setReportName(preset.name);
                          setReportText(preset.text);
                          setReportCyclePhase(preset.cyclePhase || 'general');
                          setReportFile(null);
                          setFileError(null);
                        }}
                        className="text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 transition-all text-[11px] font-bold text-slate-700 active:scale-95 shadow-2xs group"
                      >
                        <span className="block truncate group-hover:text-purple-800">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Box */}
                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Upload File (PDF / Image / TXT)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!reportFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/40 rounded-xl p-3 text-center cursor-pointer transition-all group"
                    >
                      <Upload size={18} className="mx-auto text-purple-500 group-hover:scale-110 transition-transform mb-1" />
                      <p className="text-[11px] font-bold text-slate-700">Click to upload or drag &amp; drop</p>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">PDF, PNG, JPG, or TXT (Max 10MB)</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-purple-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {reportFile.previewUrl ? (
                          <img src={reportFile.previewUrl} alt="Report preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <FileText size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{reportFile.name}</p>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500">
                            <span>{reportFile.size}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle2 size={10} /> Attached
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReportFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {isReadingFile && (
                    <p className="text-[10px] text-purple-600 font-bold mt-1 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" /> Reading report content...
                    </p>
                  )}
                  {fileError && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle size={11} /> {fileError}
                    </p>
                  )}
                </div>

                {/* Report Name */}
                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Report Name / Test Type
                  </label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="e.g., Complete Blood Count, Thyroid Panel, Ultrasound Pelvis..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {/* Cycle Phase / Context Selector */}
                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Cycle / Life Stage (Optional - For Hormone Calibration)
                  </label>
                  <select
                    value={reportCyclePhase}
                    onChange={(e) => setReportCyclePhase(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  >
                    <option value="general">Standard / General Adult Range</option>
                    <option value="follicular">Follicular Phase (Days 1–14)</option>
                    <option value="ovulation">Ovulation Window (Mid-cycle)</option>
                    <option value="luteal">Luteal Phase (Days 15–28)</option>
                    <option value="menstrual">Menstrual Phase (Bleeding days)</option>
                    <option value="menopause">Perimenopause / Menopause</option>
                  </select>
                </div>

                {/* Report Text or Observations */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                      Report Values / Observations
                    </label>
                    <span className="text-[9.5px] text-slate-400">Type or paste results</span>
                  </div>
                  <textarea
                    rows={4}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Paste report text or enter biomarker readings here...&#10;e.g., TSH: 6.8 µIU/mL, HbA1c: 6.2%, Fasting Glucose: 115 mg/dL, Vitamin D: 14 ng/mL"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[11.5px] font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 leading-relaxed"
                  />
                </div>
              </div>

              {/* Footer action button */}
              <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { triggerHaptic('light'); setReportModalOpen(false); }}
                  className="px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={(!reportText.trim() && !reportFile) || isReadingFile}
                  onClick={handleAnalyzeReportSubmit}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Sparkles size={14} />
                  <span>Analyze Report &amp; Next Steps</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOGGLE BUTTON */}
      <div
        className={`pointer-events-auto transition-all duration-300 relative ${
          isOpen ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100'
        }`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <span className="hn-ring-pulse absolute inset-0 rounded-full pointer-events-none" />
        {isLanding ? (
          // Landing: pill-shaped "Ask HealNari" FAB with robot icon
          <button
            onClick={() => { triggerHaptic('medium'); setIsOpen(true); }}
            aria-label="Ask HealNari AI"
            className="hn-toggle relative flex items-center gap-2.5 pl-4 pr-5 h-12 sm:h-14 rounded-full text-white shadow-[0_10px_25px_rgba(42,22,71,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none group"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
              <i className={`fas fa-robot text-[13px] transition-transform ${isHovering ? 'scale-110' : 'scale-100'}`} />
            </div>
            <span className="text-[13px] font-black tracking-tight whitespace-nowrap">Ask HealNari</span>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-xs" />
          </button>
        ) : isDoctor ? (
          // Doctor: dark pill "Copilot" FAB with robot icon
          <button
            onClick={() => { triggerHaptic('medium'); setIsOpen(true); }}
            aria-label="Open AI Copilot"
            className="hn-toggle relative flex items-center gap-2 pl-3.5 pr-4 h-12 sm:h-14 rounded-full text-white shadow-[0_10px_30px_rgba(15,23,42,0.45)] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
          >
            <div className="w-7 h-7 rounded-xl bg-purple-500/25 flex items-center justify-center border border-purple-400/30 shrink-0">
              <i className={`fas fa-robot text-purple-200 text-[13px] ${isHovering ? 'scale-110' : 'scale-100'} transition-transform`} />
            </div>
            <span className="text-[13px] font-black tracking-tight whitespace-nowrap">Copilot</span>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-xs" />
          </button>
        ) : (
          // Patient: purple pill "My Care AI" FAB with robot icon
          <button
            onClick={() => { triggerHaptic('medium'); setIsOpen(true); }}
            aria-label="Open Care Companion"
            className="hn-toggle relative flex items-center gap-2.5 pl-3.5 pr-4 h-12 sm:h-14 rounded-full text-white shadow-[0_10px_25px_rgba(107,70,193,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
              <i className={`fas fa-robot text-[13px] transition-transform ${isHovering ? 'scale-110' : 'scale-100'}`} />
            </div>
            <span className="text-[13px] font-black tracking-tight whitespace-nowrap">My Care AI</span>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-xs" />
          </button>
        )}
      </div>

      <AIUsageUpgradeModal
        isOpen={paywallModalOpen}
        onClose={() => setPaywallModalOpen(false)}
        role={context}
        currentPlanId={currentPlanId}
        tokensRemaining={remainingUses ?? 0}
        onUpgraded={() => {
          setPaywallModalOpen(false);
          loadSubscriptionStatus();
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              text: '🎉 Your AI plan upgrade is active! Your monthly uses have been refreshed.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }}
      />
    </div>
  );
}