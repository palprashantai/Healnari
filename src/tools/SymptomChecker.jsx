import React, { useState } from 'react';

const totalSteps = 5;

const concernOptions = [
  { value: 'PCOS (Polycystic Ovary Syndrome)', icon: 'fa-venus-double', desc: 'Irregular cycles, excess facial/body hair, hormonal acne, metabolic changes (often termed PCOD)' },
  { value: 'Hair fall & thinning', icon: 'fa-spa', desc: 'Excess shedding, thinning partition, scalp visibility' },
  { value: 'Irregular periods', icon: 'fa-calendar-days', desc: 'Missed periods, spotted cycles, heavy clotting' },
  { value: 'Hormonal imbalance', icon: 'fa-sliders', desc: 'Mood swings, persistent fatigue, adult cystic acne' }
];

const durationOptions = [
  { label: 'Less than 3 months', value: 'short' },
  { label: '3 to 12 months', value: 'medium' },
  { label: 'More than 1 year', value: 'long' }
];

const metabolicOptions = [
  { label: 'Dark patches on neck/armpits (Acanthosis Nigricans)', value: 'acanthosis' },
  { label: 'Sudden weight gain specifically around abdomen', value: 'abdominal_fat' },
  { label: 'Intense sugar or carb cravings shortly after meals', value: 'sugar_cravings' },
  { label: 'Frequent skin tags around neck or chest area', value: 'skin_tags' }
];

const secondaryOptions = [
  { label: 'Excess facial or body hair growth (Hirsutism)', value: 'hirsutism' },
  { label: 'Persistent cystic or jawline acne', value: 'cystic_acne' },
  { label: 'Severe hair thinning or widened center part', value: 'androgenic_thinning' },
  { label: 'Chronic unrefreshing fatigue or afternoon crashes', value: 'chronic_fatigue' },
  { label: 'Severe menstrual cramps or heavy pelvic pressure', value: 'pelvic_cramps' },
  { label: 'Sleep disturbance, insomnia, or elevated anxiety', value: 'sleep_anxiety' }
];

const symptomList = {
  'PCOS (Polycystic Ovary Syndrome)': [
    'Excess facial hair growth (hirsutism)',
    'Severe jawline or cystic acne',
    'Chronic fatigue and energy crashes',
    'Pelvic pain or heavy cramps'
  ],
  'Hair fall & thinning': [
    'Significant hair shedding during wash',
    'Widening partition line',
    'Scalp visibility on top',
    'Brittle or thinning hair shaft'
  ],
  'Irregular periods': [
    'Cycles lasting longer than 35 days',
    'Spotting between periods',
    'Heavy blood clots during flow',
    'Extreme pelvic pain requiring bed rest'
  ],
  'Hormonal imbalance': [
    'Constant unexplained fatigue',
    'Sudden mood shifts or mood swings',
    'Insomnia or poor sleep cycles',
    'Stubborn adult acne'
  ]
};

function SymptomChecker({ onClose, onBook, onOpenBooking }) {
  const handleBookingTrigger = onBook || onOpenBooking || (() => {});
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    concern: '',
    duration: '',
    lmp: '',
    cycleLength: '28',
    cycleRegularity: 'regular', // regular, irregular, skipping_months
    insulinResistance: [],
    secondarySymptoms: [],
    symptoms: []
  });

  const handleConcernSelect = (val) => {
    setAnswers(prev => ({ ...prev, concern: val, symptoms: [] }));
    setStep(2);
  };

  const handleNext = () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'symptom_quiz_step_complete',
        step: step,
        total_steps: 5
      });
    }

    if (step < 5) {
      setStep(prev => prev + 1);
    }
  };

  const handleCycleSubmit = (e) => {
    e.preventDefault();
    if (!answers.lmp) return;
    setStep(3);
  };

  const toggleMetabolic = (val) => {
    setAnswers(prev => {
      const list = prev.insulinResistance.includes(val)
        ? prev.insulinResistance.filter(x => x !== val)
        : [...prev.insulinResistance, val];
      return { ...prev, insulinResistance: list };
    });
  };

  const toggleSecondary = (val) => {
    setAnswers(prev => {
      const list = prev.secondarySymptoms.includes(val)
        ? prev.secondarySymptoms.filter(x => x !== val)
        : [...prev.secondarySymptoms, val];
      return { ...prev, secondarySymptoms: list };
    });
  };

  const toggleSymptom = (sym) => {
    setAnswers(prev => {
      const list = prev.symptoms.includes(sym)
        ? prev.symptoms.filter(x => x !== sym)
        : [...prev.symptoms, sym];
      return { ...prev, symptoms: list };
    });
  };

  const getAssessmentResult = () => {
    const symptomCount = answers.symptoms.length + answers.insulinResistance.length + answers.secondarySymptoms.length;
    let severity = 'Mild to Moderate';

    // Urgent Red Flag Guardrail
    const urgentSymptoms = [
      'Heavy blood clots during flow',
      'Extreme pelvic pain requiring bed rest'
    ];

    const hasUrgent = answers.symptoms.some(sym => urgentSymptoms.includes(sym));

    if (hasUrgent) {
      return {
        severity: 'URGENT CARE / CLINICAL EVALUATION REQUIRED',
        specialtyMatch: null,
        reasoning: 'You have reported severe symptoms (such as extreme pain or heavy bleeding clots). This digital screening tool is not a substitute for clinical or emergency medical care. Please visit your nearest hospital or healthcare provider immediately for physical evaluation.',
        isUrgent: true,
        action: 'Seek immediate in-person medical evaluation.',
        actionType: 'URGENT'
      };
    }

    if (symptomCount >= 4 || answers.duration === 'long' || answers.cycleRegularity === 'skipping_months') {
      severity = 'Moderate to Significant Pattern';
    }

    // Rotterdam Criteria & Phenotype Assessment (Screening Estimate Only - 2023 International Guideline)
    const hasOligo = answers.cycleRegularity !== 'regular';
    const hasHyperAndro = answers.secondarySymptoms.includes('hirsutism') || answers.secondarySymptoms.includes('cystic_acne') || answers.symptoms.some(s => s.includes('facial hair') || s.includes('acne'));
    const isPCOSProbable = hasOligo && (hasHyperAndro || answers.concern.includes('PCOS'));
    const metabolicRiskScore = Math.min(100, Math.round((answers.insulinResistance.length / 4) * 50 + (answers.duration === 'long' ? 20 : answers.duration === 'medium' ? 10 : 5) + (answers.secondarySymptoms.length * 5)));

    let specialtyMatch = 'Gynaecologist & Reproductive Endocrinologist';
    let reasoning = '';
    let diagnosisSummary = '';
    let recommendedLabTests = [];
    let safetyStatus = {
      level: 'DISCUSS_WITH_DOCTOR',
      label: 'Possible topic to discuss with a doctor',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      dot: 'bg-amber-500',
      icon: 'fa-user-doctor'
    };

    if (hasUrgent) {
      return {
        severity: 'URGENT CARE / CLINICAL EVALUATION REQUIRED',
        safetyStatus: {
          level: 'MEDICAL_ASSESSMENT_REQUIRED',
          label: 'Professional medical assessment recommended',
          badge: 'bg-rose-100 text-rose-900 border-rose-200',
          dot: 'bg-rose-500',
          icon: 'fa-triangle-exclamation'
        },
        specialtyMatch: null,
        reasoning: 'You have reported severe symptoms (such as extreme pain or heavy bleeding clots). This digital screening tool is not a substitute for clinical or emergency medical care. Please visit your nearest hospital or healthcare provider immediately for physical evaluation.',
        isUrgent: true,
        action: 'Seek immediate in-person medical evaluation.',
        actionType: 'URGENT'
      };
    }

    if (isPCOSProbable) {
      safetyStatus = {
        level: (symptomCount >= 4 || answers.duration === 'long') ? 'MEDICAL_ASSESSMENT_REQUIRED' : 'DISCUSS_WITH_DOCTOR',
        label: (symptomCount >= 4 || answers.duration === 'long') ? 'Professional medical assessment recommended' : 'Possible topic to discuss with a doctor',
        badge: (symptomCount >= 4 || answers.duration === 'long') ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-amber-100 text-amber-900 border-amber-200',
        dot: (symptomCount >= 4 || answers.duration === 'long') ? 'bg-rose-500' : 'bg-amber-500',
        icon: (symptomCount >= 4 || answers.duration === 'long') ? 'fa-triangle-exclamation' : 'fa-user-doctor'
      };
      diagnosisSummary = 'These symptoms may be associated with PCOS, but symptoms alone cannot confirm a diagnosis. They may also occur for other reasons. Under the 2023 International Guideline, formal evaluation involves assessment of ovulatory history, clinical/biochemical androgens, and excluding other mimics.';
      recommendedLabTests = ['Total & Free Testosterone / DHEAS', 'Fasting Insulin & Glucose (HOMA-IR)', 'Serum AMH (or Pelvic Ultrasound in adults)', 'TSH & Prolactin (to rule out mimics)'];
    } else if (answers.concern === 'Hair fall & thinning' || answers.secondarySymptoms.includes('androgenic_thinning')) {
      safetyStatus = {
        level: 'DISCUSS_WITH_DOCTOR',
        label: 'Possible topic to discuss with a doctor',
        badge: 'bg-amber-100 text-amber-900 border-amber-200',
        dot: 'bg-amber-500',
        icon: 'fa-user-doctor'
      };
      specialtyMatch = 'Dermatologist & Trichology Specialist';
      diagnosisSummary = 'Reported scalp shedding patterns suggest potential androgenic sensitivity, serum ferritin depletion, or thyroid co-factors requiring diagnostic bloodwork.';
      recommendedLabTests = ['Serum Ferritin & Iron Studies', 'Total Testosterone & DHEAS', 'Thyroid Profile (TSH, FT4)', 'Vitamin D3 & B12'];
    } else if (answers.insulinResistance.length >= 2) {
      safetyStatus = {
        level: 'DISCUSS_WITH_DOCTOR',
        label: 'Possible topic to discuss with a doctor',
        badge: 'bg-amber-100 text-amber-900 border-amber-200',
        dot: 'bg-amber-500',
        icon: 'fa-user-doctor'
      };
      specialtyMatch = 'Endocrinologist & Clinical Nutritionist';
      diagnosisSummary = 'Multiple metabolic and insulin sensitivity indicators detected. Early clinical evaluation and nutrition titration can support hormonal and metabolic balance.';
      recommendedLabTests = ['HbA1c & Fasting Plasma Glucose', 'Fasting Lipid Profile', 'Fasting Serum Insulin', 'Liver Function Panel'];
    } else {
      safetyStatus = {
        level: 'GENERAL_WELLNESS',
        label: 'General wellness information',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: 'fa-leaf'
      };
      specialtyMatch = 'Holistic Gynaecologist & Lifestyle Specialist';
      diagnosisSummary = 'Reported symptoms indicate mild lifestyle or cycle variations.';
      recommendedLabTests = ['Complete Thyroid Panel (TSH, FT4)', 'Day 21 Progesterone (Ovulation Confirmation)', 'Serum Cortisol (Morning)'];
    }

    reasoning = `${diagnosisSummary} Based on your ${answers.duration || 'recent'} timeline, a qualified healthcare professional can help evaluate your symptoms and design a personalized care protocol.`;

    return {
      severity,
      safetyStatus,
      specialtyMatch,
      reasoning,
      metabolicRiskScore,
      isPCOSProbable,
      recommendedLabTests,
      isUrgent: false,
      action: 'Consult a specialist doctor for confirmed clinical assessment and personalized care protocol.',
      actionType: 'BOOK_CONSULTATION'
    };
  };

  const results = step === 5 ? getAssessmentResult() : null;

  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="symptom-title"
    >
      <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-lg sm:mx-auto shadow-2xl overflow-hidden border-0 sm:border border-slate-100 animate-slide-up flex flex-col my-auto max-h-[100dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-10">
          <div>
            <h3 id="symptom-title" className="font-extrabold text-lg sm:text-xl text-slate-800 font-display">
              Health Assessment Wizard
            </h3>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">
              Instant Rotterdam Criteria & Metabolic Triage
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition btn-interactive"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-brand-600 h-1 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>

        {/* Content Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-grow space-y-5">

          {/* STEP 1: CONCERN SELECT */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="font-extrabold text-lg text-slate-800">What is your primary health concern?</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Select one to begin your diagnostic mapping.</p>
              </div>
              <div className="grid gap-3">
                {concernOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleConcernSelect(opt.value)}
                    className="p-4 text-left border border-slate-200 rounded-2xl bg-white hover:border-brand-500 hover:bg-brand-50/20 hover:shadow-md transition-all btn-interactive flex gap-4 items-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-lg flex-shrink-0">
                      <i className={`fas ${opt.icon}`}></i>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-base leading-snug">{opt.value}</div>
                      <div className="text-slate-500 text-xs font-semibold mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: LMP & CYCLE DETAILS (Rotterdam Checks) */}
          {step === 2 && (
            <form onSubmit={handleCycleSubmit} className="space-y-5">
              <div className="text-center">
                <h4 className="font-extrabold text-lg text-slate-800 font-display">LMP & Cycle History</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Required to evaluate ovulatory cycles under clinical criteria.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Last Menstrual Period (LMP) Date *</label>
                  <input
                    type="date"
                    required
                    value={answers.lmp}
                    onChange={e => setAnswers(prev => ({ ...prev, lmp: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Average Cycle Length (Days)</label>
                  <input
                    type="number"
                    min="15"
                    max="90"
                    value={answers.cycleLength}
                    onChange={e => setAnswers(prev => ({ ...prev, cycleLength: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Cycle Regularity (Over last 6 months)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                    {[
                      { label: 'Regular (21-35 days)', value: 'regular' },
                      { label: 'Irregular (>35 days)', value: 'irregular' },
                      { label: 'Skipping months', value: 'skipping_months' }
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setAnswers(prev => ({ ...prev, cycleRegularity: opt.value }))}
                        className={`p-3 border rounded-xl transition-all ${answers.cycleRegularity === opt.value ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-center justify-between pt-2">
                <button type="button" onClick={() => setStep(1)} className="text-slate-500 font-bold text-sm hover:text-slate-700 btn-interactive">
                  ← Back
                </button>
                <button type="submit" className="bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all btn-interactive shadow shadow-aubergine-500/20">
                  Next Step
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: METABOLIC & INSULIN REGULATORS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="font-extrabold text-lg text-slate-800">Metabolic & Insulin Markers</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Screening for insulin resistance (IR), a primary trigger for androgen excess.</p>
              </div>

              <div className="space-y-2.5">
                {metabolicOptions.map((opt) => {
                  const isChecked = answers.insulinResistance.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleMetabolic(opt.value)}
                      className={`p-3.5 border rounded-2xl cursor-pointer flex items-center justify-between transition-all select-none ${isChecked
                        ? 'border-aubergine-500 bg-aubergine-50/40 font-bold text-aubergine-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-aubergine-600 bg-aubergine-600 text-white' : 'border-slate-300'
                        }`}>
                        {isChecked && <i className="fas fa-check text-[9px]"></i>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 items-center justify-between pt-2">
                <button onClick={() => setStep(2)} className="text-slate-500 font-bold text-sm hover:text-slate-700 btn-interactive">
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all btn-interactive shadow shadow-aubergine-500/20"
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SECONDARY SYMPTOMS & DURATION */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="font-extrabold text-lg text-slate-800">Additional Secondary Symptoms</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Refining phenotypic subtyping (Adrenal, Inflammatory, Post-Pill).</p>
              </div>

              <div className="space-y-2.5">
                {secondaryOptions.map((opt) => {
                  const isChecked = answers.secondarySymptoms.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleSecondary(opt.value)}
                      className={`p-3.5 border rounded-2xl cursor-pointer flex items-center justify-between transition-all select-none ${isChecked
                        ? 'border-aubergine-500 bg-aubergine-50/40 font-bold text-aubergine-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-aubergine-600 bg-aubergine-600 text-white' : 'border-slate-300'
                        }`}>
                        {isChecked && <i className="fas fa-check text-[9px]"></i>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">How long have you noticed these issues?</label>
                <select
                  value={answers.duration}
                  onChange={e => setAnswers(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="">Select duration...</option>
                  {durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="flex gap-4 items-center justify-between pt-2">
                <button onClick={() => setStep(3)} className="text-slate-500 font-bold text-sm hover:text-slate-700 btn-interactive">
                  ← Back
                </button>
                <button
                  disabled={!answers.duration}
                  onClick={() => setStep(5)}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all btn-interactive shadow shadow-brand-100 disabled:opacity-50"
                >
                  Calculate Results
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: RECOMMENDATION SUMMARY */}
          {step === 5 && results && (
            <div className="space-y-6">
              {/* Score Header */}
              <div className={`border rounded-3xl p-6 text-center space-y-3 relative overflow-hidden ${results.isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-aubergine-50/70 border-aubergine-100'
                }`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl mx-auto shadow ${results.isUrgent ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-aubergine-600 text-white shadow-aubergine-200'
                  }`}>
                  <i className={`fas ${results.isUrgent ? 'fa-triangle-exclamation' : 'fa-receipt'}`}></i>
                </div>
                <h4 className="font-extrabold text-xl text-slate-800">
                  {results.isUrgent ? 'Medical Alert' : 'Assessment Complete'}
                </h4>
                {results.safetyStatus && (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full border shadow-2xs ${results.safetyStatus.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${results.safetyStatus.dot} animate-pulse`}></span>
                    <span>{results.safetyStatus.label}</span>
                  </div>
                )}
              </div>

              {/* Assessment details */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Synthesis</h5>
                  <p className={`text-sm font-medium mt-1 leading-relaxed ${results.isUrgent ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                    {results.reasoning}
                  </p>
                </div>

                {!results.isUrgent && results.metabolicRiskScore !== undefined && (
                  <div className="p-4 bg-aubergine-50/60 border border-aubergine-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-aubergine-900 flex items-center gap-1.5">
                        <i className="fas fa-chart-pie text-aubergine-600"></i> Metabolic & Hormone Stress Index
                      </span>
                      <span className="font-mono text-aubergine-700">{results.metabolicRiskScore}%</span>
                    </div>
                    <div className="w-full bg-aubergine-200/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${results.metabolicRiskScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {!results.isUrgent && results.recommendedLabTests?.length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fas fa-vial-virus text-aubergine-600"></i> Recommended Diagnostic Roadmap:
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {results.recommendedLabTests.map(test => (
                        <span key={test} className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                          {test}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!results.isUrgent && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <i className="fas fa-user-md text-emerald-600 text-xl flex-shrink-0"></i>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-900">Dedicated Hormone Care Team</h5>
                      <p className="text-xs text-emerald-700 leading-snug">
                        {results.action}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {results.actionType === 'BOOK_CONSULTATION' && (
                  <button
                    onClick={() => {
                      onClose();
                      handleBookingTrigger();
                    }}
                    className="w-full bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all btn-interactive text-base"
                  >
                    Consult a Women's Health Specialist (₹799)
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`w-full border font-semibold py-3.5 rounded-xl transition-all btn-interactive text-sm ${results.isUrgent ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                >
                  {results.isUrgent ? 'Locate Nearest Emergency Facility' : 'Return to Symptom Index'}
                </button>
              </div>

              {/* Clinical Screening Disclaimer */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed italic pt-1">
                * Educational screening analysis only. This digital tool does not diagnose conditions or replace physical examination and lab testing by a registered medical practitioner.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SymptomChecker;
