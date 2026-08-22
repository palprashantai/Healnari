// Shared concern -> recommended specialty mapping, used by both the public
// landing-page symptom checker and the logged-in patient's "not sure which
// doctor?" picker on Discovery.jsx — one list instead of two copies that
// can drift apart.
export const CONCERN_OPTIONS = [
  { 
    label: 'PCOS / PCOD & Ovulatory Health', 
    specialty: 'Gynaecologist', 
    description: 'Irregular cycles, missed periods, fertility, and reproductive wellness.',
    icon: 'fa-venus-double' 
  },
  { 
    label: 'Irregular or Painful Periods', 
    specialty: 'Gynaecologist', 
    description: 'Cycle irregularities, heavy flow, dysmenorrhea, or spotting.',
    icon: 'fa-calendar-days' 
  },
  { 
    label: 'Fertility & Preconception Planning', 
    specialty: 'Gynaecologist', 
    description: 'Ovulation tracking, fertility assessment, and pre-pregnancy guidance.',
    icon: 'fa-baby' 
  },
  { 
    label: 'Acne & Skin Breakouts', 
    specialty: 'Dermatologist', 
    description: 'Adult acne, cystic breakouts, hyperpigmentation, and skin barrier health.',
    icon: 'fa-wand-magic-sparkles' 
  },
  { 
    label: 'Hair Fall & Scalp Thinning', 
    specialty: 'Dermatologist', 
    description: 'Excess shedding, widened partition, scalp conditions, and hair vitality.',
    icon: 'fa-spa' 
  },
  { 
    label: 'Hormonal & Metabolic Balance', 
    specialty: 'Endocrinologist', 
    description: 'Insulin resistance, metabolic slowdown, weight plateau, and cortisol health.',
    icon: 'fa-sliders' 
  },
  { 
    label: 'Thyroid & Energy Concerns', 
    specialty: 'Endocrinologist', 
    description: 'Hypothyroidism, Hashimoto’s, chronic fatigue, and thermoregulation.',
    icon: 'fa-bolt' 
  },
  { 
    label: 'Personalized Nutrition & Diet', 
    specialty: 'Clinical Dietitian', 
    description: 'Balanced blood-sugar meal planning, anti-inflammatory nutrition, and digestive health.',
    icon: 'fa-carrot' 
  },
  { 
    label: 'Stress, Yoga & Mindful Movement', 
    specialty: 'Yoga & Movement Specialist', 
    description: 'Nervous system down-regulation, pelvic mobility, and somatic stress relief.',
    icon: 'fa-person-praying' 
  },
  { 
    label: 'General Women’s Health Checkup', 
    specialty: 'General Physician', 
    description: 'Preventive routine checkups, blood work reviews, and holistic health screening.',
    icon: 'fa-heart-pulse' 
  },
];

export const SPECIALIST_GUIDES = {
  'Gynaecologist': {
    title: 'Gynaecologist',
    focus: "Periods, reproductive health, ovulation, and pelvic well-being.",
    bestFor: "Irregular cycles, heavy bleeding, PCOS confirmation, fertility planning, or pelvic discomfort."
  },
  'Endocrinologist': {
    title: 'Endocrinologist',
    focus: 'Hormonal systems, thyroid function, insulin sensitivity, and metabolic regulation.',
    bestFor: 'Insulin resistance, thyroid imbalances, sudden unexplained weight shifts, or adrenal fatigue.'
  },
  'Dermatologist': {
    title: 'Dermatologist',
    focus: 'Skin barrier health, adult cystic acne, hormonal hyperpigmentation, and scalp vitality.',
    bestFor: 'Persistent breakouts, jawline cystic acne, scalp hair thinning, or skin texture changes.'
  },
  'Clinical Dietitian': {
    title: 'Clinical Dietitian',
    focus: 'Sustainable, non-restrictive nutrition tailored to metabolism, digestion, and energy.',
    bestFor: 'Practical blood-sugar balancing meal plans, gut health, and supportive lifestyle nutrition.'
  },
  'Yoga & Movement Specialist': {
    title: 'Yoga & Mindful Movement Specialist',
    focus: 'Supportive movement, stress reduction, restorative breathwork, and pelvic mobility.',
    bestFor: 'Somatic stress relief, low-impact hormone-friendly movement, and sleep optimization.'
  },
  'General Physician': {
    title: 'General Physician',
    focus: 'Comprehensive overall health assessments, preventative care, and routine screenings.',
    bestFor: 'Annual health checkups, initial symptom evaluation, and preventative wellness blood panels.'
  }
};

export function specialtyForConcern(concern) {
  return CONCERN_OPTIONS.find(c => c.label === concern)?.specialty || 'Gynaecologist';
}

/** Real doctor specialty text is free-form ("Gynecology" vs
 * "Gynaecologist", etc.) — matches the recommended specialty against a real
 * list of specialties loosely (case-insensitive substring both ways)
 * instead of requiring an exact string match that would silently return
 * nothing. */
export function findClosestSpecialty(recommended, availableSpecialties) {
  const rec = (recommended || '').toLowerCase();
  const stem = rec.slice(0, Math.min(5, rec.length)); // "gynae", "derma", "endoc", "dieti", "nutri", "yoga"
  return availableSpecialties.find(s => {
    const low = (s || '').toLowerCase();
    return low.includes(stem) || rec.includes(low);
  }) || null;
}
