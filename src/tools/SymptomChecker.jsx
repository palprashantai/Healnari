import React, { useState } from 'react';
import { detectUserCountry, getCountryByCode } from '../lib/countries.js';
import { formatCurrency } from '../lib/currency.js';

const totalSteps = 5;

const concernOptions = [
  {
    id: 'pcos',
    value: 'PCOS / PCOD & Multi-Symptom Concerns',
    icon: 'fa-venus-double',
    desc: 'Cycle irregularities, facial hair, cystic acne, and metabolic changes combined.',
    recommendedSpecialty: 'Gynaecologist & Endocrinologist'
  },
  {
    id: 'periods',
    value: 'Irregular or Painful Periods',
    icon: 'fa-calendar-days',
    desc: 'Delayed cycles, missed periods, severe cramps, or spotting between cycles.',
    recommendedSpecialty: 'Gynaecologist'
  },
  {
    id: 'acne',
    value: 'Acne & Skin Breakouts',
    icon: 'fa-wand-magic-sparkles',
    desc: 'Adult cystic acne, stubborn jawline breakouts, or sudden skin barrier inflammation.',
    recommendedSpecialty: 'Dermatologist'
  },
  {
    id: 'hair',
    value: 'Hair Fall & Scalp Thinning',
    icon: 'fa-spa',
    desc: 'Excess wash shedding, widening partition line, or diffuse scalp visibility.',
    recommendedSpecialty: 'Dermatologist & Hair Specialist'
  },
  {
    id: 'nutrition',
    value: 'Healthy Eating & Metabolic Nutrition',
    icon: 'fa-carrot',
    desc: 'Personalized meal plans for steady energy, healthy metabolism, and digestive balance.',
    recommendedSpecialty: 'Clinical Dietitian'
  },
  {
    id: 'yoga',
    value: 'Yoga, Stress Relief & Movement',
    icon: 'fa-person-praying',
    desc: 'Gentle, hormone-supportive movement, somatic stress release, and pelvic mobility.',
    recommendedSpecialty: 'Yoga & Mindful Movement Specialist'
  }
];

const durationOptions = [
  { label: 'Less than 3 months (recent onset)', value: 'short' },
  { label: '3 to 12 months (ongoing)', value: 'medium' },
  { label: 'More than 1 year (chronic pattern)', value: 'long' }
];

const metabolicOptions = [
  { label: 'Dark velvety patches on neck or armpits (often related to insulin sensitivity)', value: 'acanthosis' },
  { label: 'Unexplained weight changes, especially around the midsection', value: 'abdominal_fat' },
  { label: 'Sudden energy crashes or intense sugar cravings shortly after meals', value: 'sugar_cravings' },
  { label: 'Frequent skin tags around the neck, collarbone, or chest area', value: 'skin_tags' }
];

const secondaryOptions = [
  { label: 'Excess coarse facial or body hair (on upper lip, chin, or chest)', value: 'hirsutism' },
  { label: 'Deep, tender cystic breakouts along jawline or cheeks', value: 'cystic_acne' },
  { label: 'Noticeable hair thinning along the center partition', value: 'androgenic_thinning' },
  { label: 'Persistent fatigue or feeling unrefreshed despite adequate sleep', value: 'chronic_fatigue' },
  { label: 'Severe menstrual cramps or pelvic heaviness requiring rest', value: 'pelvic_cramps' },
  { label: 'Elevated stress, racing thoughts, or sleep disruption', value: 'sleep_anxiety' }
];

function SymptomChecker({ onClose, onBook, onOpenBooking }) {
  const handleBookingTrigger = onBook || onOpenBooking || (() => {});
  const userCountry = getCountryByCode(detectUserCountry());
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    concernId: 'pcos',
    concern: '',
    duration: '',
    // Period details
    lmp: '',
    cycleLength: '28',
    cycleRegularity: 'regular', // regular, irregular, skipping_months
    // Acne details
    acneAreas: [],
    // Hair details
    hairPattern: '',
    // Nutrition details
    dietaryPreference: 'Vegetarian',
    nutritionGoal: 'Hormonal Balance & Energy',
    // Yoga details
    movementStyle: 'Gentle Restorative',
    stressLevel: 'Moderate',
    // Metabolic & Secondary
    insulinResistance: [],
    secondarySymptoms: [],
    symptoms: []
  });

  const handleConcernSelect = (opt) => {
    setAnswers(prev => ({
      ...prev,
      concernId: opt.id,
      concern: opt.value,
      symptoms: []
    }));
    setStep(2);
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

  const toggleAcneArea = (area) => {
    setAnswers(prev => {
      const list = prev.acneAreas.includes(area)
        ? prev.acneAreas.filter(x => x !== area)
        : [...prev.acneAreas, area];
      return { ...prev, acneAreas: list };
    });
  };

  const getAssessmentResult = () => {
    const isUrgent = answers.secondarySymptoms.includes('pelvic_cramps') && answers.duration === 'long' && answers.cycleRegularity === 'skipping_months';

    // 1. URGENT RED FLAG
    if (isUrgent) {
      return {
        severity: 'Medical Evaluation Recommended',
        safetyStatus: {
          level: 'MEDICAL_ASSESSMENT_REQUIRED',
          label: 'Professional medical evaluation recommended',
          badge: 'bg-rose-100 text-rose-900 border-rose-200',
          dot: 'bg-rose-500',
          icon: 'fa-triangle-exclamation'
        },
        specialtyMatch: 'In-Person Gynaecologist / Urgent Clinic',
        reasoning: 'You have reported significant ongoing pelvic pain with prolonged missed cycles. We recommend scheduling an in-person physical assessment with a gynaecologist for a pelvic ultrasound and full evaluation.',
        isUrgent: true,
        action: 'Seek clinical evaluation with an in-person healthcare provider.',
        actionType: 'URGENT'
      };
    }

    // 2. PATHWAY: ACNE & SKIN
    if (answers.concernId === 'acne') {
      const hasHormonalCues = answers.secondarySymptoms.includes('hirsutism') || answers.insulinResistance.length > 0;
      return {
        severity: 'Focused Skin Health Pathway',
        safetyStatus: {
          level: 'DISCUSS_WITH_DOCTOR',
          label: 'Specialist consultation recommended',
          badge: 'bg-amber-100 text-amber-900 border-amber-200',
          dot: 'bg-amber-500',
          icon: 'fa-user-doctor'
        },
        specialtyMatch: 'Dermatologist',
        reasoning: `Based on your skin symptoms${answers.acneAreas.length > 0 ? ` (${answers.acneAreas.join(', ')})` : ''}, a Dermatologist is the appropriate starting specialist. Sudden breakouts can arise from skin barrier disruptions, comedogenic products, or androgen sensitivity. Symptoms alone do not mean you have PCOS. ${hasHormonalCues ? 'Because you also noted metabolic or hair changes, your dermatologist can coordinate bloodwork if hormonal co-factors are suspected.' : 'Your care will focus directly on skin barrier restoration and clinical topical treatment.'}`,
        metabolicRiskScore: Math.min(100, answers.insulinResistance.length * 25 + answers.secondarySymptoms.length * 10),
        recommendedLabTests: ['Serum Total Testosterone & DHEAS', 'Serum Ferritin & Complete Blood Count', 'Fasting Blood Glucose'],
        isUrgent: false,
        action: 'Schedule a video consultation with a certified Dermatologist.',
        actionType: 'BOOK_CONSULTATION'
      };
    }

    // 3. PATHWAY: HAIR FALL & SCALP
    if (answers.concernId === 'hair') {
      return {
        severity: 'Scalp & Follicular Health Pathway',
        safetyStatus: {
          level: 'DISCUSS_WITH_DOCTOR',
          label: 'Dermatology & trichology review',
          badge: 'bg-amber-100 text-amber-900 border-amber-200',
          dot: 'bg-amber-500',
          icon: 'fa-user-doctor'
        },
        specialtyMatch: 'Dermatologist & Hair Specialist',
        reasoning: 'Hair shedding and partition changes can stem from nutritional factors (like low iron stores or Vitamin D), thyroid changes, temporary stress shedding (telogen effluvium), or androgen sensitivity. This is not automatically a PCOS diagnosis. A specialized dermatologist can evaluate follicle density and blood panels to find the root cause.',
        metabolicRiskScore: Math.min(100, answers.insulinResistance.length * 20 + 15),
        recommendedLabTests: ['Serum Ferritin & Total Iron Binding Capacity (TIBC)', 'Thyroid Panel (TSH, FT4)', 'Vitamin D3 & B12', 'Serum Zinc & Free Testosterone'],
        isUrgent: false,
        action: 'Book a consultation with a Hair & Scalp Specialist.',
        actionType: 'BOOK_CONSULTATION'
      };
    }

    // 4. PATHWAY: PERSONALIZED NUTRITION
    if (answers.concernId === 'nutrition') {
      return {
        severity: 'Personalized Nutrition & Dietary Guidance',
        safetyStatus: {
          level: 'GENERAL_WELLNESS',
          label: 'Holistic clinical nutrition pathway',
          badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: 'fa-leaf'
        },
        specialtyMatch: 'Clinical Dietitian',
        reasoning: `We focus on sustainable, balanced nourishment tailored to your ${answers.dietaryPreference} preference. HealNari avoids extreme crash diets or unproven cure claims. A Clinical Dietitian will help you stabilize blood sugar, optimize gut microbiome health, and build meals that keep you satisfied and energized.`,
        metabolicRiskScore: Math.min(100, answers.insulinResistance.length * 20),
        recommendedLabTests: ['HbA1c & Fasting Glucose', 'Lipid Panel', 'Liver Function Panel'],
        isUrgent: false,
        action: 'Connect with a Clinical Dietitian for your personalized meal protocol.',
        actionType: 'BOOK_CONSULTATION'
      };
    }

    // 5. PATHWAY: YOGA & MOVEMENT
    if (answers.concernId === 'yoga') {
      return {
        severity: 'Supportive Mindful Movement Pathway',
        safetyStatus: {
          level: 'GENERAL_WELLNESS',
          label: 'Restorative somatic movement guidance',
          badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: 'fa-leaf'
        },
        specialtyMatch: 'Yoga & Mindful Movement Specialist',
        reasoning: `Mindful movement is designed as a supportive wellness practice to lower physiological stress, support healthy sleep, and improve pelvic circulation. We do not claim yoga replaces medical therapy. Working with a Mindful Movement Specialist provides safe, enjoyable somatic practices that meet your body where it is.`,
        metabolicRiskScore: 10,
        recommendedLabTests: ['Morning Serum Cortisol (optional)', 'Thyroid Profile (TSH)'],
        isUrgent: false,
        action: 'Book a 1-on-1 session with a Mindful Movement Specialist.',
        actionType: 'BOOK_CONSULTATION'
      };
    }

    // 6. PATHWAY: PERIODS & REPRODUCTIVE HEALTH / PCOS
    const hasIrregular = answers.cycleRegularity !== 'regular';
    const hasAndrogens = answers.secondarySymptoms.includes('hirsutism') || answers.secondarySymptoms.includes('cystic_acne');
    const metabolicCount = answers.insulinResistance.length;

    let reasoning = '';
    if (hasIrregular && hasAndrogens) {
      reasoning = 'Your reported combination of cycle irregularity alongside signs of androgen sensitivity (such as excess hair or cystic acne) is a pattern commonly evaluated for PCOS. Symptoms alone do not equal a confirmed diagnosis; international guidelines require clinical evaluation, hormonal blood panels, and ruling out thyroid or prolactin mimics.';
    } else if (hasIrregular) {
      reasoning = 'Cycle irregularities can happen for many reasons, including recent stress, thyroid variations, nutritional shifts, or ovulatory changes. A gynaecologist can evaluate your history and recommend gentle, targeted steps.';
    } else {
      reasoning = 'Your cycle history appears regular. You may be experiencing mild hormonal fluctuations or lifestyle stress. A specialist can review your wellness goals and provide peace of mind.';
    }

    return {
      severity: hasIrregular ? 'Moderate Cycle Variation' : 'Mild Lifestyle Pattern',
      safetyStatus: {
        level: hasIrregular ? 'MEDICAL_ASSESSMENT_REQUIRED' : 'DISCUSS_WITH_DOCTOR',
        label: hasIrregular ? 'Gynaecologist assessment recommended' : 'General hormonal review',
        badge: hasIrregular ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-amber-100 text-amber-900 border-amber-200',
        dot: hasIrregular ? 'bg-rose-500' : 'bg-amber-500',
        icon: 'fa-user-doctor'
      },
      specialtyMatch: 'Gynaecologist & Reproductive Endocrinologist',
      reasoning,
      metabolicRiskScore: Math.min(100, metabolicCount * 25 + (answers.duration === 'long' ? 20 : 10)),
      recommendedLabTests: ['Total & Free Testosterone / DHEAS', 'Fasting Insulin & Glucose (HOMA-IR)', 'TSH & Serum Prolactin', 'Serum AMH (or Pelvic Ultrasound)'],
      isUrgent: false,
      action: 'Consult a Women\'s Health Gynaecologist for personalized evaluation.',
      actionType: 'BOOK_CONSULTATION'
    };
  };

  const results = step === 5 ? getAssessmentResult() : null;

  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
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
      <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-lg sm:mx-auto shadow-2xl overflow-hidden border-0 sm:border border-slate-100 animate-slide-up flex flex-col my-auto max-h-[100dvh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-10">
          <div>
            <h3 id="symptom-title" className="font-extrabold text-lg sm:text-xl text-slate-800 font-display">
              Smart Health &amp; Specialist Navigator
            </h3>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">
              Empathetic, evidence-informed care matching without forced diagnosis
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition btn-interactive"
            aria-label="Close symptom checker"
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
                <h4 className="font-extrabold text-lg text-slate-800 font-display">What would you like help with?</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Select your primary area of focus to start your guided roadmap.</p>
              </div>
              <div className="grid gap-2.5">
                {concernOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleConcernSelect(opt)}
                    className="p-3.5 text-left border border-slate-200 rounded-2xl bg-white hover:border-brand-500 hover:bg-brand-50/20 hover:shadow-xs transition-all btn-interactive flex gap-3.5 items-center group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-base flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                      <i className={`fas ${opt.icon}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm leading-snug">{opt.value}</div>
                      <div className="text-slate-500 text-xs font-medium mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                    <i className="fas fa-chevron-right text-slate-300 group-hover:text-brand-600 text-xs transition-colors"></i>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: CONTEXTUAL QUESTIONS */}
          {step === 2 && (
            <div className="space-y-5">
              {/* If Period or PCOS Concern */}
              {(answers.concernId === 'pcos' || answers.concernId === 'periods') && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-lg text-slate-800 font-display">Cycle &amp; Period History</h4>
                    <p className="text-slate-500 text-xs font-semibold mt-1">Helps evaluate ovulatory rhythm and hormonal balance.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Approximate Last Period Start Date (LMP)</label>
                    <input
                      type="date"
                      value={answers.lmp}
                      onChange={e => setAnswers(prev => ({ ...prev, lmp: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Cycle Regularity (Over the last 6 months)</label>
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
              )}

              {/* If Acne Concern */}
              {answers.concernId === 'acne' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-lg text-slate-800 font-display">Skin Concern Context</h4>
                    <p className="text-slate-500 text-xs font-semibold mt-1">Where are you primarily noticing breakouts or skin irritation?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Jawline & Chin', 'Cheeks & Forehead', 'Back & Chest', 'Cystic / Deep & Painful'].map(area => {
                      const isChecked = answers.acneAreas.includes(area);
                      return (
                        <button
                          type="button"
                          key={area}
                          onClick={() => toggleAcneArea(area)}
                          className={`p-3 border rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between ${isChecked ? 'bg-brand-50 text-brand-700 border-brand-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                          <span>{area}</span>
                          {isChecked && <i className="fas fa-check text-brand-600 text-[10px]"></i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If Hair Concern */}
              {answers.concernId === 'hair' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-lg text-slate-800 font-display">Hair &amp; Scalp Pattern</h4>
                    <p className="text-slate-500 text-xs font-semibold mt-1">What pattern of hair loss are you experiencing?</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Diffuse shedding all over (excess hair in shower/brush)', value: 'diffuse' },
                      { label: 'Widening partition line along the center or top', value: 'widening_part' },
                      { label: 'Dry, flaky, or sensitive scalp with itching', value: 'scalp_inflammation' },
                      { label: 'Brittle strands and loss of volume', value: 'brittle' }
                    ].map(p => (
                      <button
                        type="button"
                        key={p.value}
                        onClick={() => setAnswers(prev => ({ ...prev, hairPattern: p.value }))}
                        className={`w-full p-3 border rounded-xl text-xs font-bold text-left transition-all ${answers.hairPattern === p.value ? 'bg-brand-50 text-brand-700 border-brand-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* If Nutrition Concern */}
              {answers.concernId === 'nutrition' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-lg text-slate-800 font-display">Your Dietary Preferences</h4>
                    <p className="text-slate-500 text-xs font-semibold mt-1">Personalized nutrition without extreme restrictions.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Dietary Preference</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Vegetarian', 'Vegan', 'Eggetarian', 'Non-Veg'].map(d => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setAnswers(prev => ({ ...prev, dietaryPreference: d }))}
                          className={`p-2.5 border rounded-xl text-xs font-bold transition-all ${answers.dietaryPreference === d ? 'bg-brand-50 text-brand-700 border-brand-300' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Primary Nutritional Goal</label>
                    <select
                      value={answers.nutritionGoal}
                      onChange={e => setAnswers(prev => ({ ...prev, nutritionGoal: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                      <option value="Hormonal Balance & Energy">Hormonal Balance &amp; Steady Energy</option>
                      <option value="Insulin Sensitivity & Weight Health">Insulin Sensitivity &amp; Metabolic Balance</option>
                      <option value="Gut Health & Bloating Relief">Gut Health &amp; Bloating Relief</option>
                      <option value="Preconception & Fertility Nourishment">Preconception &amp; Fertility Nourishment</option>
                    </select>
                  </div>
                </div>
              )}

              {/* If Yoga Concern */}
              {answers.concernId === 'yoga' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-extrabold text-lg text-slate-800 font-display">Movement &amp; Stress Relief Goals</h4>
                    <p className="text-slate-500 text-xs font-semibold mt-1">Supportive wellness practices tailored to your energy.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Preferred Movement Style</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {['Gentle Restorative', 'Pelvic & Core Flow', 'Stress & Breathwork'].map(m => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setAnswers(prev => ({ ...prev, movementStyle: m }))}
                          className={`p-2.5 border rounded-xl text-xs font-bold transition-all ${answers.movementStyle === m ? 'bg-brand-50 text-brand-700 border-brand-300' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 items-center justify-between pt-2">
                <button type="button" onClick={() => setStep(1)} className="text-slate-500 font-bold text-sm hover:text-slate-700 btn-interactive">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all btn-interactive shadow shadow-aubergine-500/20"
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: METABOLIC & ENERGY MARKERS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h4 className="font-extrabold text-lg text-slate-800 font-display">Metabolic &amp; Energy Signals</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Screening for insulin sensitivity and metabolic patterns.</p>
              </div>

              <div className="space-y-2.5">
                {metabolicOptions.map((opt) => {
                  const isChecked = answers.insulinResistance.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleMetabolic(opt.value)}
                      className={`p-3.5 border rounded-2xl cursor-pointer flex items-center justify-between transition-all select-none ${isChecked
                        ? 'border-aubergine-500 bg-aubergine-50/40 font-bold text-aubergine-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-xs font-semibold leading-relaxed pr-2">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-aubergine-600 bg-aubergine-600 text-white' : 'border-slate-300'}`}>
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
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ASSOCIATED SECONDARY SYMPTOMS & DURATION */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center">
                <h4 className="font-extrabold text-lg text-slate-800 font-display">Associated Health Factors &amp; Timeline</h4>
                <p className="text-slate-500 text-xs font-semibold mt-1">Select any additional symptoms and how long you've noticed them.</p>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {secondaryOptions.map((opt) => {
                  const isChecked = answers.secondarySymptoms.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleSecondary(opt.value)}
                      className={`p-3 border rounded-2xl cursor-pointer flex items-center justify-between transition-all select-none ${isChecked
                        ? 'border-aubergine-500 bg-aubergine-50/40 font-bold text-aubergine-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-xs font-semibold leading-relaxed pr-2">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isChecked ? 'border-aubergine-600 bg-aubergine-600 text-white' : 'border-slate-300'}`}>
                        {isChecked && <i className="fas fa-check text-[9px]"></i>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">How long have you been experiencing these concerns? *</label>
                <select
                  value={answers.duration}
                  onChange={e => setAnswers(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 font-medium"
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
                  View My Assessment →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: RECOMMENDATION SUMMARY */}
          {step === 5 && results && (
            <div className="space-y-5">
              {/* Header Badge */}
              <div className={`border rounded-3xl p-5 text-center space-y-2.5 relative overflow-hidden ${results.isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-aubergine-50/70 border-aubergine-100'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mx-auto shadow ${results.isUrgent ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-aubergine-600 text-white shadow-aubergine-200'}`}>
                  <i className={`fas ${results.isUrgent ? 'fa-triangle-exclamation' : 'fa-clipboard-check'}`}></i>
                </div>
                <h4 className="font-extrabold text-lg text-slate-800 font-display">
                  {results.isUrgent ? 'Clinical Alert' : 'Recommended Care Pathway'}
                </h4>
                {results.safetyStatus && (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${results.safetyStatus.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${results.safetyStatus.dot} animate-pulse`}></span>
                    <span>{results.safetyStatus.label}</span>
                  </div>
                )}
              </div>

              {/* Specialist Recommendation Card */}
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                  <i className="fas fa-user-doctor"></i>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Recommended Specialist</span>
                  <h5 className="font-black text-slate-800 text-sm">{results.specialtyMatch}</h5>
                </div>
              </div>

              {/* Assessment details */}
              <div className="space-y-3.5">
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Clinical Synthesis</h5>
                  <p className={`text-xs font-medium mt-1 leading-relaxed ${results.isUrgent ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>
                    {results.reasoning}
                  </p>
                </div>

                {!results.isUrgent && results.recommendedLabTests?.length > 0 && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <h5 className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fas fa-vial-virus text-aubergine-600"></i> Suggested Discussion &amp; Diagnostic Roadmap:
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {results.recommendedLabTests.map(test => (
                        <span key={test} className="bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-2xs">
                          {test}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {results.actionType === 'BOOK_CONSULTATION' && (
                  <button
                    onClick={() => {
                      onClose();
                      handleBookingTrigger();
                    }}
                    className="w-full bg-gradient-to-r from-aubergine-600 to-magenta-600 hover:opacity-95 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all btn-interactive text-sm flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-calendar-check"></i>
                    <span>Consult a {results.specialtyMatch.split('&')[0].trim()} ({formatCurrency(userCountry.defaultPatientFee, userCountry.currency)})</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full border border-slate-200 bg-white hover:bg-slate-50 font-semibold py-3 rounded-xl transition-all btn-interactive text-xs text-slate-600"
                >
                  Close &amp; Return to Home
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
