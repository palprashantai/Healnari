import React, { useState } from 'react';

const totalSteps = 5;

const concernOptions = [
  { value: 'PCOS / PCOD', icon: 'fa-venus-double', desc: 'Cysts, cycle delays, excess facial hair, insulin changes' },
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

const symptomList = {
  'PCOS / PCOD': [
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

function SymptomChecker({ onClose, onBook }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    concern: '',
    duration: '',
    lmp: '',
    cycleLength: '28',
    cycleRegularity: 'regular', // regular, irregular, skipping_months
    insulinResistance: [],
    symptoms: []
  });

  const handleConcernSelect = (val) => {
    setAnswers(prev => ({ ...prev, concern: val, symptoms: [] }));
    setStep(2);
  };

  const handleNext = () => {
    // Analytics tracking for funnel drop-off analysis
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

  const toggleSymptom = (sym) => {
    setAnswers(prev => {
      const list = prev.symptoms.includes(sym)
        ? prev.symptoms.filter(x => x !== sym)
        : [...prev.symptoms, sym];
      return { ...prev, symptoms: list };
    });
  };

  const getAssessmentResult = () => {
    const symptomCount = answers.symptoms.length + answers.insulinResistance.length;
    let severity = 'Mild';

    // Urgent Guardrail
    const urgentSymptoms = [
      'Heavy blood clots during flow',
      'Extreme pelvic pain requiring bed rest'
    ];

    const hasUrgent = answers.symptoms.some(sym => urgentSymptoms.includes(sym));

    if (hasUrgent) {
      return {
        severity: 'URGENT CARE REQUIRED',
        specialtyMatch: null,
        reasoning: 'You have reported severe symptoms (such as extreme pain or heavy bleeding clots). This digital platform is not a substitute for emergency care. Please visit your nearest hospital immediately for physical evaluation.',
        isUrgent: true
      };
    }

    if (symptomCount >= 4 || answers.duration === 'long' || answers.cycleRegularity === 'skipping_months') {
      severity = 'Moderate to Severe';
    }

    // Rotterdam Criteria & Phenotype Assessment
    const hasOligo = answers.cycleRegularity !== 'regular';
    const hasHyperAndro = answers.symptoms.some(s => s.includes('facial hair') || s.includes('acne'));
    const isPCOSProbable = hasOligo && (hasHyperAndro || answers.concern === 'PCOS / PCOD');
    const metabolicRiskScore = Math.min(100, Math.round((answers.insulinResistance.length / 4) * 60 + (answers.duration === 'long' ? 25 : answers.duration === 'medium' ? 15 : 5) + (answers.symptoms.length * 5)));

    let specialtyMatch = 'Gynaecologist & Reproductive Endocrinologist';
    let reasoning = '';
    let diagnosisSummary = '';
    let recommendedLabTests = [];

    if (isPCOSProbable) {
      diagnosisSummary = 'Your cycle irregularity and hyperandrogenic indicators align closely with the Rotterdam International Consensus for PCOS/PCOD Phenotype.';
      recommendedLabTests = ['Serum AMH (Ovarian Reserve)', 'LH : FSH Ratio', 'Fasting Insulin & HOMA-IR', 'Free & Total Testosterone'];
    } else if (answers.concern === 'Hair fall & thinning') {
      specialtyMatch = 'Dermatologist & Trichology Specialist';
      diagnosisSummary = 'Follicular shedding patterns indicate potential DHT sensitivity, ferritin deficiency, or androgen-receptor upregulation.';
      recommendedLabTests = ['Serum Ferritin & Iron Studies', 'Total Testosterone & DHEAS', 'Thyroid Profile (TSH, FT4)', 'Vitamin D3 & B12'];
    } else if (answers.insulinResistance.length >= 2) {
      specialtyMatch = 'Clinical Endocrinologist & Diabetologist';
      diagnosisSummary = 'Multiple peripheral insulin resistance markers detected (metabolic score: ' + metabolicRiskScore + '%). High risk of compensatory hyperinsulinemia affecting ovarian function.';
      recommendedLabTests = ['HbA1c & Fasting Plasma Glucose', 'Fasting Lipid Profile', 'Fasting Serum Insulin', 'Liver Function Panel'];
    } else {
      specialtyMatch = 'Holistic Gynaecologist & Lifestyle Physician';
      diagnosisSummary = 'Symptoms indicate early neuroendocrine axis dysregulation or luteal phase defect.';
      recommendedLabTests = ['Complete Thyroid Panel', 'Day 21 Progesterone', 'Serum Cortisol (Morning)'];
    }

    reasoning = `${diagnosisSummary} Based on your ${answers.duration || 'recent'} symptom timeline, early clinical protocol and personalized nutritional titration can prevent long-term metabolic complications.`;

    return {
      severity,
      specialtyMatch,
      reasoning,
      metabolicRiskScore,
      isPCOSProbable,
      recommendedLabTests,
      isUrgent: false
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
                <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all btn-interactive shadow shadow-brand-100">
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
                        ? 'border-brand-500 bg-brand-50/20 font-bold text-brand-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
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
                  className="bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all btn-interactive shadow shadow-brand-100"
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
                <p className="text-slate-500 text-xs font-semibold mt-1">Select all indicators you currently experience.</p>
              </div>

              <div className="space-y-2.5">
                {(symptomList[answers.concern] || []).map((sym) => {
                  const isChecked = answers.symptoms.includes(sym);
                  return (
                    <div
                      key={sym}
                      onClick={() => toggleSymptom(sym)}
                      className={`p-3.5 border rounded-2xl cursor-pointer flex items-center justify-between transition-all select-none ${isChecked
                        ? 'border-brand-500 bg-brand-50/20 font-bold text-brand-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-sm font-semibold">{sym}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
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
              <div className={`border rounded-3xl p-6 text-center space-y-3 relative overflow-hidden ${results.isUrgent ? 'bg-red-50 border-red-200' : 'bg-gradient-to-tr from-brand-50 to-indigo-50 border-brand-100'
                }`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl mx-auto shadow ${results.isUrgent ? 'bg-red-600 text-white shadow-red-200' : 'bg-brand-600 text-white shadow-brand-100'
                  }`}>
                  <i className={`fas ${results.isUrgent ? 'fa-triangle-exclamation' : 'fa-receipt'}`}></i>
                </div>
                <h4 className="font-extrabold text-xl text-slate-800">
                  {results.isUrgent ? 'Medical Alert' : 'Assessment Complete'}
                </h4>
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${results.isUrgent ? 'bg-red-100 text-red-800' : 'bg-brand-100 text-brand-800'
                  }`}>
                  Severity: {results.severity}
                </div>
              </div>

              {/* Assessment details */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Synthesis</h5>
                  <p className={`text-sm font-medium mt-1 leading-relaxed ${results.isUrgent ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                    {results.reasoning}
                  </p>
                </div>

                {!results.isUrgent && results.metabolicRiskScore !== undefined && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-purple-900 flex items-center gap-1.5">
                        <i className="fas fa-chart-pie text-purple-600"></i> Metabolic & Hormone Stress Index
                      </span>
                      <span className="font-mono text-purple-700">{results.metabolicRiskScore}%</span>
                    </div>
                    <div className="w-full bg-purple-200/60 rounded-full h-2 overflow-hidden">
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
                      <i className="fas fa-vial-virus text-indigo-500"></i> Recommended Diagnostic Roadmap:
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
                      <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Matched Medical Department</h5>
                      <p className="text-slate-800 text-sm font-extrabold mt-0.5">{results.specialtyMatch}</p>
                    </div>
                  </div>
                )}

                {/* SaMD Clinical Governance Disclaimer */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-slate-500 text-[11px] leading-relaxed flex items-start gap-2">
                  <i className="fas fa-shield-halved text-aubergine-600 mt-0.5 flex-shrink-0 text-xs"></i>
                  <span>
                    <strong className="text-slate-700">Medical Notice: </strong>
                    This questionnaire provides automated triage mapping (Rotterdam risk stratification) and is not a clinical medical diagnosis. Formal PCOS confirmation requires clinical pelvic ultrasound and lab exclusion.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {!results.isUrgent && (
                  <button
                    onClick={() => {
                      onBook(results.specialtyMatch);
                      onClose();
                    }}
                    className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all btn-interactive text-base"
                  >
                    Book a {results.specialtyMatch}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className={`w-full border font-semibold py-3.5 rounded-xl transition-all btn-interactive text-sm ${results.isUrgent ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                >
                  {results.isUrgent ? 'I understand, Close Assessment' : 'Close & Back to Home'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SymptomChecker;
