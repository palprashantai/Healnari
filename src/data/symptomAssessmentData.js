/**
 * HealNari Symptom Assessment & Clinical Triage Data Architecture
 * 
 * Multi-Domain Health Concern Taxonomy, Non-Diagnostic Clinical Pattern Engine,
 * Contextual Intake Questions, Educational Condition Registry, Specialist Mapping,
 * and Safety Red Flag Protocols.
 * 
 * Medical Principle: HealNari is a symptom-assessment and care-navigation tool, NOT a diagnostic tool.
 * Forbidden phrases: "You have [condition]", "This confirms [condition]", "This means you have..."
 * Correct phrases: "[Condition] is one possible condition associated with this symptom pattern",
 * "These symptoms can occur with several conditions...", "An evaluation is needed to determine the cause."
 */

// ── 1. HEALTH CONCERN TAXONOMY (13 STRUCTURED AREAS) ──────────────────────────
// ── 1. PATIENT-FIRST HEALTH CONCERN TAXONOMY (8 FRIENDLY PROBLEM DOMAINS) ────
export const SYMPTOM_CATEGORIES = [
  {
    id: 'periods_hormones',
    label: 'Periods & Hormones',
    icon: 'fa-droplet',
    color: 'text-rose-700 bg-rose-50/90 border-rose-200',
    description: 'Irregular periods, painful cramps, heavy bleeding, missed periods, PCOS concerns, and hormone changes',
    symptoms: [
      { id: 'irregular_periods', label: 'Irregular Periods', subtitle: 'Periods not coming regularly, earlier, later or skipping?', icon: 'fa-calendar-xmark' },
      { id: 'painful_periods', label: 'Period Pain', subtitle: 'Pain or cramping that makes daily activities difficult?', icon: 'fa-circle-exclamation' },
      { id: 'heavy_periods', label: 'Very Heavy Periods', subtitle: 'Soaking pads quickly, passing large clots, or bleeding > 7 days?', icon: 'fa-droplet' },
      { id: 'missed_periods', label: 'Missed Periods', subtitle: 'Skipping periods or cycles stopping unexpectedly?', icon: 'fa-calendar-minus' },
      { id: 'pcos_concerns', label: 'PCOS Concerns', subtitle: 'Questions about periods, hormones, acne, hair or fertility?', icon: 'fa-dna' },
      { id: 'hormonal_concerns', label: 'Hormone Changes', subtitle: 'Feeling like your overall hormone balance has shifted?', icon: 'fa-arrows-rotate' },
      { id: 'pelvic_pain', label: 'Pelvic Pain', subtitle: 'Dull ache, cramping, or pressure in lower belly?', icon: 'fa-shield-heart' },
      { id: 'bleeding_between_periods', label: 'Bleeding Between Periods', subtitle: 'Spotting or unexpected bleeding outside your expected period?', icon: 'fa-droplet-slash' },
      { id: 'pms_symptoms', label: 'PMS Symptoms', subtitle: 'Mood shifts, breast tenderness or bloating before periods?', icon: 'fa-cloud-moon' }
    ]
  },
  {
    id: 'vaginal_health',
    label: 'Vaginal Health',
    icon: 'fa-hand-dots',
    color: 'text-pink-700 bg-pink-50/90 border-pink-200',
    description: 'Itching, unusual discharge, burning, dryness, unusual smell, and discomfort during intimacy',
    symptoms: [
      { id: 'vaginal_itching', label: 'Vaginal Itching', subtitle: 'Itching, burning, or persistent irritation inside or around vulva?', icon: 'fa-hand-dots' },
      { id: 'unusual_discharge', label: 'Unusual Vaginal Discharge', subtitle: 'Change in discharge amount, smell, color, or texture?', icon: 'fa-water' },
      { id: 'vaginal_burning', label: 'Burning or Irritation', subtitle: 'Stinging, raw feeling or burning sensation during urination or touch?', icon: 'fa-fire' },
      { id: 'vaginal_dryness', label: 'Vaginal Dryness', subtitle: 'Friction, tightness or lack of natural lubrication during daily life or intimacy?', icon: 'fa-droplet-slash' },
      { id: 'vaginal_odor', label: 'Unusual Smell', subtitle: 'Distinct fishy, foul, or chemical scent noticeably different from normal?', icon: 'fa-wind' },
      { id: 'pain_intercourse', label: 'Pain During Sex', subtitle: 'Burning at entrance or deep pelvic discomfort during intimacy?', icon: 'fa-heart-crack' }
    ]
  },
  {
    id: 'skin',
    label: 'Skin',
    icon: 'fa-spa',
    color: 'text-amber-700 bg-amber-50/90 border-amber-200',
    description: 'Acne, pimples, dark spots, skin itching, and irritation',
    symptoms: [
      { id: 'acne', label: 'Acne & Pimples', subtitle: 'New, frequent, tender or stubborn pimples on face or jawline?', icon: 'fa-spa' },
      { id: 'sudden_acne', label: 'Sudden Breakouts', subtitle: 'Abrupt outbreak of inflammatory papules or cysts in recent weeks?', icon: 'fa-wand-magic-sparkles' },
      { id: 'dark_spots', label: 'Dark Spots & Pigmentation', subtitle: 'Post-acne dark marks, sun spots, or melasma patches?', icon: 'fa-circle-dot' },
      { id: 'skin_itching', label: 'Skin Itching & Irritation', subtitle: 'Pruritus, persistent urge to scratch, redness, or skin barrier flaring?', icon: 'fa-hand' },
      { id: 'darkened_skin_folds', label: 'Darkened Skin Folds', subtitle: 'Velvety darker skin around neck, underarms, or groin folds?', icon: 'fa-fingerprint' }
    ]
  },
  {
    id: 'hair_scalp',
    label: 'Hair & Scalp',
    icon: 'fa-wind',
    color: 'text-teal-700 bg-teal-50/90 border-teal-200',
    description: 'Hair fall, hair thinning, dandruff, itchy scalp, and extra facial/body hair',
    symptoms: [
      { id: 'hair_fall', label: 'Hair Fall', subtitle: 'Losing more hair than usual in brush, shower, or pillow?', icon: 'fa-wind' },
      { id: 'hair_thinning', label: 'Hair Thinning', subtitle: 'Widening partition, thinning ponytail, or diffuse loss of density?', icon: 'fa-scissors' },
      { id: 'dandruff', label: 'Dandruff & Flaking', subtitle: 'Persistent white or greasy yellow flakes on scalp and shoulders?', icon: 'fa-snowflake' },
      { id: 'itchy_scalp', label: 'Itchy Scalp', subtitle: 'Scalp tightness, persistent itching, or irritation around follicles?', icon: 'fa-head-side-virus' },
      { id: 'facial_body_hair', label: 'Extra Facial or Body Hair', subtitle: 'Coarser, darker hair growing on chin, upper lip, chest or abdomen?', icon: 'fa-user-pen' }
    ]
  },
  {
    id: 'weight_nutrition',
    label: 'Weight & Nutrition',
    icon: 'fa-scale-unbalanced',
    color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200',
    description: 'Weight gain, weight loss, difficulty losing weight, feeling tired, and nutrition concerns',
    symptoms: [
      { id: 'weight_gain', label: 'Weight Gain', subtitle: 'Unexpected weight gain or weight shifting toward abdomen?', icon: 'fa-scale-unbalanced' },
      { id: 'weight_loss', label: 'Weight Loss', subtitle: 'Unintentional drop in weight without changes in diet or exercise?', icon: 'fa-arrow-trend-down' },
      { id: 'difficulty_losing_weight', label: 'Difficulty Losing Weight', subtitle: 'Weight remaining stubborn despite structured dietary habits and movement?', icon: 'fa-gauge-high' },
      { id: 'fatigue', label: 'Feeling Tired', subtitle: 'Persistent sluggishness or waking unrefreshed despite sleeping?', icon: 'fa-battery-quarter' },
      { id: 'suspected_deficiency', label: 'Nutrition Concerns', subtitle: 'Suspected low iron or vitamin levels, restrictive meals, or low physical stamina?', icon: 'fa-carrot' }
    ]
  },
  {
    id: 'fertility',
    label: 'Fertility',
    icon: 'fa-seedling',
    color: 'text-violet-700 bg-violet-50/90 border-violet-200',
    description: 'Trying to conceive, fertility questions, irregular ovulation, and pre-pregnancy health',
    symptoms: [
      { id: 'difficulty_conceiving', label: 'Trying to Conceive', subtitle: 'Not achieving pregnancy after months of regular, timed unprotected intercourse?', icon: 'fa-seedling' },
      { id: 'fertility_concerns', label: 'Fertility Questions', subtitle: 'Wondering about ovulatory health, cycle predictability, or conception timing?', icon: 'fa-circle-question' },
      { id: 'ovulation_concerns', label: 'Irregular Ovulation', subtitle: 'Absence of fertile cues, negative ovulation tests, or irregular ovulation timing?', icon: 'fa-chart-line' },
      { id: 'preconception_concerns', label: 'Pre-Pregnancy Health', subtitle: 'Optimizing thyroid, metabolic health, or nutrition before starting to conceive?', icon: 'fa-baby' }
    ]
  },
  {
    id: 'mind_lifestyle',
    label: 'Mind & Lifestyle',
    icon: 'fa-brain',
    color: 'text-purple-700 bg-purple-50/90 border-purple-200',
    description: 'Stress, poor sleep, low energy, and mood changes',
    symptoms: [
      { id: 'stress', label: 'Stress', subtitle: 'High mental tension, feeling overwhelmed, or nervous system exhaustion?', icon: 'fa-brain' },
      { id: 'poor_sleep', label: 'Poor Sleep', subtitle: 'Trouble falling asleep, restless nights, or waking frequently?', icon: 'fa-moon' },
      { id: 'weakness', label: 'Low Energy', subtitle: 'Physical lack of muscle stamina or feeling easily exhausted by light activity?', icon: 'fa-bolt-lightning' },
      { id: 'mood_swings', label: 'Mood Changes', subtitle: 'Feeling more anxious, low, irritable, or emotionally different?', icon: 'fa-cloud-rain' }
    ]
  },
  {
    id: 'general_health',
    label: 'General Health',
    icon: 'fa-notes-medical',
    color: 'text-blue-700 bg-blue-50/90 border-blue-200',
    description: 'Headache, dizziness, digestive problems, temperature sensitivity, and other concerns',
    symptoms: [
      { id: 'headache', label: 'Headache', subtitle: 'Tension ache, throbbing migraines, or cycle-linked headaches?', icon: 'fa-head-side-cough' },
      { id: 'dizziness', label: 'Dizziness', subtitle: 'Lightheadedness, feeling faint, or unsteadiness when standing up?', icon: 'fa-compass' },
      { id: 'digestive_discomfort', label: 'Digestive Problems', subtitle: 'Abdominal bloating, stomach cramping, constipation, or irregular bowel rhythm?', icon: 'fa-wheat-awn-circle-exclamation' },
      { id: 'feeling_cold', label: 'Feeling Unusually Cold or Hot', subtitle: 'Constant cold hands/feet or heat sensitivity with temperature swings?', icon: 'fa-temperature-half' },
      { id: 'something_else', label: 'Something Else', subtitle: 'Can\'t find your problem? Tell us what\'s bothering you in your own words.', icon: 'fa-stethoscope' }
    ]
  }
];

// Flat lookup map of all symptoms by ID + Alias mapping for backward compatibility
export const ALL_SYMPTOMS_MAP = SYMPTOM_CATEGORIES.reduce((acc, cat) => {
  cat.symptoms.forEach(sym => {
    if (!acc[sym.id]) {
      acc[sym.id] = { ...sym, categoryId: cat.id, categoryLabel: cat.label };
    }
  });
  return acc;
}, {});

// Aliases for historical / alternate symptom IDs
const SYMPTOM_ALIASES = {
  scalp_hair_thinning: 'hair_thinning',
  sudden_hair_loss: 'hair_fall',
  patchy_hair_loss: 'hair_fall',
  adult_acne: 'acne',
  hormonal_acne: 'acne',
  pigmentation: 'dark_spots',
  skin_rash: 'skin_itching',
  skin_irritation: 'skin_itching',
  vulvar_irritation: 'vaginal_itching',
  vulvar_redness: 'vaginal_burning',
  discharge_color_change: 'unusual_discharge',
  discharge_consistency_change: 'unusual_discharge',
  pain_urination: 'vaginal_burning',
  vaginal_discomfort: 'vaginal_itching',
  recurrent_vaginal_symptoms: 'vaginal_itching',
  long_cycles: 'irregular_periods',
  infrequent_periods: 'irregular_periods',
  long_periods: 'heavy_periods',
  short_cycles: 'irregular_periods',
  spotting: 'bleeding_between_periods',
  bleeding_after_intercourse: 'bleeding_between_periods',
  lower_abdominal_pain: 'pelvic_pain',
  pelvic_pressure: 'pelvic_pain',
  abnormal_bleeding: 'heavy_periods',
  severe_pms_mood: 'mood_swings',
  recurrent_pregnancy_loss: 'fertility_concerns',
  fertility_planning: 'preconception_concerns',
  palpitations: 'stress',
  constipation: 'digestive_discomfort',
  diarrhea: 'digestive_discomfort',
  increased_thirst: 'feeling_cold',
  frequent_urination: 'feeling_cold',
  poor_diet: 'suspected_deficiency',
  restrictive_diets: 'suspected_deficiency',
  digestive_concerns: 'digestive_discomfort',
  cycle_changes_menopause: 'irregular_periods',
  night_sweats: 'feeling_cold',
  sleep_changes: 'poor_sleep',
  body_comp_changes: 'weight_gain',
  low_libido: 'hormonal_concerns',
  genital_itching: 'vaginal_itching',
  genital_discharge: 'unusual_discharge',
  fever: 'headache',
  feeling_tired: 'fatigue'
};

Object.entries(SYMPTOM_ALIASES).forEach(([aliasId, targetId]) => {
  if (!ALL_SYMPTOMS_MAP[aliasId] && ALL_SYMPTOMS_MAP[targetId]) {
    ALL_SYMPTOMS_MAP[aliasId] = { ...ALL_SYMPTOMS_MAP[targetId], id: aliasId };
  }
});

// ── 2. RED FLAG EMERGENCY SYMPTOMS REGISTRY ───────────────────────────────────
export const RED_FLAG_SYMPTOMS = [
  {
    id: 'red_flag_severe_pelvic_pain',
    label: 'Severe pelvic or lower abdominal pain',
    description: 'Sudden, excruciating, sharp, or progressively worsening pain',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_heavy_bleeding',
    label: 'Heavy uncontrolled vaginal bleeding',
    description: 'Soaking 2 or more large pads/tampons per hour for 2+ consecutive hours or passing golf-ball sized clots',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_fainting',
    label: 'Fainting or severe dizziness (Syncope)',
    description: 'Loss of consciousness, collapse, or feeling like you will black out upon standing',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_shortness_breath',
    label: 'Severe shortness of breath',
    description: 'Struggling to catch your breath at rest, gasping, or lips turning bluish',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_chest_pain',
    label: 'Chest pain or chest tightness',
    description: 'Pressure, squeezing, or pain radiating to the left arm, neck, jaw, or back',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_neurological',
    label: 'Sudden neurological symptoms',
    description: 'Sudden one-sided weakness, numbness, facial drooping, slurred speech, or vision loss',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_allergic',
    label: 'Severe allergic reaction (Anaphylaxis)',
    description: 'Swelling of the tongue, lips, throat, or audible wheezing and difficulty swallowing',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_pregnancy_urgent',
    label: 'Pregnancy-related urgent symptoms',
    description: 'Positive pregnancy test with sharp one-sided pelvic pain, shoulder-tip pain, or vaginal bleeding (ectopic pregnancy risk)',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_severe_infection',
    label: 'Severe infection signs',
    description: 'High fever (>101°F / 38.3°C) with rigid abdomen, intense chills, foul discharge, or altered mental status',
    urgency: 'Immediate Emergency Care'
  },
  {
    id: 'red_flag_mental_crisis',
    label: 'Suicidal thoughts or immediate crisis',
    description: 'Thoughts of harming yourself, feeling unable to stay safe, or extreme crisis',
    urgency: 'Immediate Emergency Helpline'
  }
];

// ── 3. CONTEXTUAL INTAKE QUESTIONS (STEP 2 ENGINE) ─────────────────────────────
export function getContextualQuestions(selectedSymptomIds = []) {
  const hasVaginalVulvar = selectedSymptomIds.some(id => 
    ['vaginal_itching', 'vaginal_burning', 'unusual_discharge', 'discharge_color_change', 
     'discharge_consistency_change', 'vaginal_odor', 'vaginal_dryness', 'vulvar_irritation', 
     'vulvar_redness', 'pain_urination', 'vaginal_discomfort', 'recurrent_vaginal_symptoms', 
     'genital_discharge', 'genital_itching'].includes(id)
  );

  const hasPCOSOrPeriod = selectedSymptomIds.some(id => 
    ['irregular_periods', 'missed_periods', 'long_cycles', 'infrequent_periods', 
     'heavy_periods', 'painful_periods', 'long_periods', 'short_cycles', 'spotting', 
     'bleeding_between_periods', 'pms_symptoms', 'severe_pms_mood', 
     'darkened_skin_folds', 'metabolic_concerns', 'hormonal_concerns', 'pcos_concerns', 'pelvic_pain'].includes(id)
  );

  const hasFertility = selectedSymptomIds.some(id => 
    ['difficulty_conceiving', 'ovulation_concerns', 'fertility_concerns', 
     'recurrent_pregnancy_loss', 'fertility_planning', 'preconception_concerns'].includes(id)
  );

  const hasWeightOrMetabolic = selectedSymptomIds.some(id => 
    ['weight_changes', 'weight_gain', 'weight_loss', 'difficulty_losing_weight', 
     'increased_thirst', 'frequent_urination', 'feeling_cold', 'feeling_hot'].includes(id)
  );

  const hasHair = selectedSymptomIds.some(id => 
    ['hair_fall', 'hair_thinning', 'sudden_hair_loss', 'patchy_hair_loss', 
     'dandruff', 'itchy_scalp', 'facial_body_hair', 'scalp_hair_thinning'].includes(id)
  );

  const hasSkin = selectedSymptomIds.some(id => 
    ['acne', 'sudden_acne', 'adult_acne', 'hormonal_acne', 'pigmentation', 
     'dark_spots', 'dry_skin', 'skin_itching', 'skin_rash', 'skin_irritation'].includes(id)
  );

  const questions = [
    {
      id: 'duration',
      title: 'When did it start?',
      subtitle: 'Understanding the timeline helps doctors differentiate acute, temporary triggers from recurring or long-standing patterns.',
      type: 'single_choice',
      required: true,
      options: [
        { value: 'short', label: 'Less than 4 weeks ago', desc: 'Recent onset or newly emerging changes' },
        { value: 'medium', label: '1 to 6 months ago', desc: 'Ongoing or fluctuating over several months' },
        { value: 'long', label: 'More than 6 months to years', desc: 'Long-standing, chronic, or recurring pattern' }
      ]
    },
    {
      id: 'severity',
      title: 'How much is this affecting your daily comfort?',
      subtitle: 'This helps gauge functional impact on your daily routine, sleep, comfort, and wellbeing.',
      type: 'single_choice',
      required: true,
      options: [
        { value: 'mild', label: 'Mild impact', desc: 'Noticeable, but does not interfere with daily activities or sleep' },
        { value: 'moderate', label: 'Moderate impact', desc: 'Frequently impacts my energy, comfort, skin, cycles, or confidence' },
        { value: 'severe', label: 'Severe impact', desc: 'Significantly limits daily tasks, sleep, work, relationships, or quality of life' }
      ]
    }
  ];

  // Hair Fall Specific Questions (Requirement 3: Hair Fall Journey)
  if (hasHair) {
    questions.push({
      id: 'hair_pattern',
      title: 'Is the hair falling from all over the scalp or one area?',
      subtitle: 'Where hair sheds helps differentiate diffuse temporary shedding from localized or pattern thinning.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'diffuse_all_over', label: 'All over the scalp (diffuse shedding)', desc: 'High shedding in the shower, on pillow, or in your hairbrush' },
        { value: 'scalp_center_part', label: 'Gradual thinning along center partition or crown', desc: 'Hair partition looks wider or ponytail feels noticeably thinner' },
        { value: 'patchy_circular', label: 'Circular, smooth coin-shaped bald spot(s)', desc: 'Distinct localized patch with smooth scalp skin' },
        { value: 'hairline_temples', label: 'Front hairline or temples receding', desc: 'Receding edges or tension along hair borders' }
      ]
    });

    questions.push({
      id: 'hair_onset',
      title: 'Did the hair loss start suddenly or gradually?',
      subtitle: 'Sudden shedding often follows a physiological trigger 2–3 months earlier.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'sudden_shedding', label: 'Started suddenly (within days to weeks)', desc: 'Sudden large clumps of hair falling out' },
        { value: 'gradual_thinning', label: 'Progressed slowly and gradually over months/years', desc: 'Slow, steady decrease in overall hair volume' },
        { value: 'cyclical_fluctuating', label: 'Fluctuates with periods or stress levels', desc: 'Increases at certain times of the month or year' }
      ]
    });

    questions.push({
      id: 'hair_triggers',
      title: 'Any recent illness, major stress, or period/hormone changes?',
      subtitle: 'Hair follicles are sensitive to systemic physiological shifts.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'illness_stress', label: 'Recent high fever, illness, surgery, or major emotional stress', desc: 'Classic trigger for acute telogen effluvium shedding' },
        { value: 'period_hormone_changes', label: 'Yes, experiencing irregular periods, acne, or weight changes', desc: 'Points toward possible hormonal or ovulatory connection' },
        { value: 'diet_low_iron', label: 'Strict diet, low iron stores, or heavy periods', desc: 'Cellular iron or protein levels may be involved' },
        { value: 'none_apparent', label: 'None of these / no obvious trigger', desc: 'No recent illness or cycle changes noted' }
      ]
    });
  }

  // Skin Specific Questions
  if (hasSkin) {
    questions.push({
      id: 'skin_pattern',
      title: 'Where do you notice the skin breakouts or changes most?',
      subtitle: 'Breakout location helps clinicians evaluate hormonal sensitivity versus topical/barrier irritation.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'jawline_chin', label: 'Jawline, chin, lower face, or neck', desc: 'Classic hormonal/androgen-sensitive breakout region' },
        { value: 'forehead_cheeks', label: 'Forehead, cheeks, or surface skin', desc: 'Skin barrier sensitivity, surface pores, or cosmetic irritation' },
        { value: 'chest_back', label: 'Back, chest, or shoulders', desc: 'Follicular or body breakout distribution' }
      ]
    });
  }

  // Vaginal & Vulvar Context Question
  if (hasVaginalVulvar) {
    questions.push({
      id: 'discharge_appearance',
      title: 'What does the vaginal discharge look or smell like?',
      subtitle: 'Discharge characteristics vary across different conditions, helping clinicians determine appropriate swab testing.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'thick_white_clumpy', label: 'Thick, white, curd-like (like cottage cheese)', desc: 'Often accompanied by intense itching and burning' },
        { value: 'thin_grey_fishy', label: 'Thin, watery, grayish-white with a fishy odor', desc: 'Often more noticeable after periods or intimacy' },
        { value: 'yellow_green_frothy', label: 'Yellowish-green, frothy, or foul-smelling', desc: 'Often accompanied by vulvar redness or urinary stinging' },
        { value: 'dry_irritated_minimal', label: 'Minimal or absent discharge with dryness/friction', desc: 'Sensation of tightness, burning, or post-wash irritation' },
        { value: 'normal_clear_stretchy', label: 'Clear or cloudy whitish without unpleasant odor', desc: 'Normal physiological cervical mucus variation' }
      ]
    });
  }

  // Menstrual Pattern Question
  if (hasPCOSOrPeriod) {
    questions.push({
      id: 'menstrual_pattern',
      title: 'How would you describe your typical menstrual cycle pattern?',
      subtitle: 'Menstrual variations provide crucial clues about ovulatory, endometrial, and hormonal health.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'regular_normal', label: 'Regular (every 24–35 days)', desc: 'Predictable onset with 4–7 days of moderate bleeding' },
        { value: 'delayed_infrequent', label: 'Irregular or delayed (> 35 days apart)', desc: 'Unpredictable, often skipping months or occurring fewer than 8 times a year' },
        { value: 'heavy_with_clots', label: 'Very heavy flow with large clots', desc: 'Soaking through protection rapidly or feeling drained/fatigued during period' },
        { value: 'severe_pain_cramping', label: 'Extremely painful periods (cramping)', desc: 'Pain not relieved by simple painkillers, radiating to back or legs' },
        { value: 'not_menstruating', label: 'Not menstruating / On birth control / Menopause', desc: 'Naturally absent, suppressed by hormonal contraception, or postmenopausal' }
      ]
    });
  }

  // Fertility & Reproductive Context Question
  if (hasFertility) {
    questions.push({
      id: 'fertility_time_context',
      title: 'How long have you been actively trying to conceive?',
      subtitle: 'Clinical guidelines define fertility evaluation timelines based on age and duration of trying. A short period of trying is normal.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'planning_future', label: 'Not actively trying yet / Future planning', desc: 'Curious about reproductive health and preconception prep' },
        { value: 'less_than_6m', label: 'Trying for less than 6 months', desc: 'Recently started timed intercourse; normal conception window' },
        { value: '6_to_12m_under35', label: '6 to 12 months (under age 35)', desc: 'Standard initial window for spontaneous conception' },
        { value: 'over_12m_or_over35', label: 'Over 12 months (or > 6 months if age 35+)', desc: 'Timeline where a proactive fertility evaluation is clinically recommended' }
      ]
    });
  }

  // Metabolic & Weight Details
  if (hasWeightOrMetabolic) {
    questions.push({
      id: 'metabolic_pattern',
      title: 'Have you noticed any of these metabolic patterns?',
      subtitle: 'Insulin sensitivity and thyroid hormone regulation directly influence energy balance and body composition.',
      type: 'single_choice',
      required: false,
      options: [
        { value: 'abdominal_plateau', label: 'Midsection weight gain and difficulty losing', desc: 'Weight gain concentrated around abdomen despite consistent food intake' },
        { value: 'energy_crashes_craving', label: 'Afternoon crashes and intense carbohydrate cravings', desc: 'Feeling shaky, foggy, or hungry shortly after meals' },
        { value: 'cold_sluggish_constipated', label: 'Feeling unusually cold with dry skin and sluggish gut', desc: 'Classic signs commonly evaluated for thyroid function' },
        { value: 'stable_unrelated', label: 'Weight and energy are relatively stable', desc: 'No significant metabolic shifts noted' }
      ]
    });
  }

  // Medications Question
  questions.push({
    id: 'medications',
    title: 'Are you currently taking any prescription medications or supplements?',
    subtitle: 'Certain medications, birth control pills, and nutritional supplements directly interact with hormonal and metabolic pathways.',
    type: 'single_choice',
    required: false,
    options: [
      { value: 'none', label: 'None currently', desc: 'No regular prescription medications or high-dose supplements' },
      { value: 'birth_control', label: 'Oral contraceptives, hormonal IUD, or implant', desc: 'Pills, hormonal coil, patch, or injection' },
      { value: 'thyroid_meds', label: 'Thyroid medication (e.g. Levothyroxine)', desc: 'Daily thyroid hormone replacement' },
      { value: 'vitamins_iron', label: 'Nutritional supplements (Iron, Vitamin D, Biotin, etc.)', desc: 'Daily multivitamin or targeted deficiency supplements' },
      { value: 'other_prescription', label: 'Other prescription medications', desc: 'For blood pressure, diabetes, mood, or other conditions' }
    ]
  });

  // Safety & Urgent Red Flag Screening
  questions.push({
    id: 'safety_flags',
    title: 'Safety check: Are you experiencing any urgent or emergency signs?',
    subtitle: 'Your health and safety come first. If you have severe or acute warning signs, prompt medical care is required.',
    type: 'multiple_choice',
    required: false,
    options: [
      { value: 'red_flag_severe_pelvic_pain', label: 'Sudden, excruciating, or worsening pelvic/abdominal pain', isRedFlag: true },
      { value: 'red_flag_heavy_bleeding', label: 'Heavy uncontrolled bleeding (soaking 2+ pads/hr for 2+ hours)', isRedFlag: true },
      { value: 'red_flag_fainting', label: 'Fainting, collapse, or severe shortness of breath / chest pain', isRedFlag: true },
      { value: 'red_flag_pregnancy_urgent', label: 'Sharp one-sided pelvic pain with positive pregnancy test', isRedFlag: true },
      { value: 'red_flag_severe_infection', label: 'High fever (>101°F) with rigid pelvic tenderness or severe chills', isRedFlag: true },
      { value: 'none_of_these', label: 'None of these urgent symptoms apply to me', isRedFlag: false }
    ]
  });

  return questions;
}

// ── 4. CLINICAL EDUCATIONAL CONDITIONS CATALOG (CMS SCHEMA COMPLIANT) ─────────
/**
 * Each condition entity supports:
 * - name: Full condition title
 * - category: Clinical domain
 * - description: Non-diagnostic medical overview
 * - symptoms: Associated primary symptoms
 * - relatedSymptoms: Associated secondary symptoms
 * - possibleCauses: Known physiological/etiological mechanisms
 * - specialist: Primary specialist recommendations
 * - redFlags: Condition-specific warning signs
 * - patientEducation: 7 structured patient-friendly education questions
 * - disclaimer: Mandatory non-diagnostic disclaimer
 * - reviewStatus: 'Draft' | 'Clinical Review' | 'Approved' | 'Published'
 * - medicalReviewer: Credentialed medical doctor
 * - lastReviewedDate: ISO date
 * - sources: Clinical references / guidelines
 * - publishedStatus: boolean
 */
export const DEFAULT_CLINICAL_CONDITIONS = [
  {
    id: 'pcos_ovulatory_dysfunction',
    name: 'Polycystic Ovary Syndrome (PCOS)',
    category: 'PCOS / Ovulatory Health',
    description: 'PCOS is a common endocrine and metabolic condition characterized by irregular ovulation, androgen sensitivity, and often underlying insulin resistance.',
    symptoms: ['irregular_periods', 'missed_periods', 'long_cycles', 'acne', 'facial_body_hair', 'scalp_hair_thinning', 'weight_changes', 'difficulty_losing_weight'],
    relatedSymptoms: ['fertility_concerns', 'ovulation_concerns', 'darkened_skin_folds', 'metabolic_concerns', 'mood_swings'],
    possibleCauses: [
      'Ovarian hyperandrogenism (elevated androgen receptor sensitivity)',
      'Hyperinsulinemia and peripheral insulin resistance',
      'Neuroendocrine pulsatility shifts (elevated LH to FSH ratio)',
      'Low-grade chronic systemic inflammation and genetic factors'
    ],
    specialist: {
      primary: 'Gynaecologist',
      secondary: ['Endocrinologist', 'Clinical Nutritionist']
    },
    redFlags: [
      'Sudden excruciating one-sided lower abdominal pain (risk of ovarian torsion or hemorrhagic cyst rupture)',
      'Prolonged continuous heavy vaginal bleeding causing dizziness or severe pallor'
    ],
    patientEducation: {
      whatIsIt: 'Polycystic Ovary Syndrome (PCOS) is a multi-system hormonal and metabolic condition affecting up to 10–15% of women of reproductive age. It involves irregular communication between the brain’s pituitary gland and the ovaries, leading to infrequent ovulation, variable hormone levels, and often insulin resistance. Symptoms vary widely across individuals.',
      whatSymptomsCanBeAssociated: 'Common associated symptoms include irregular, delayed, or missed menstrual cycles; acne concentrated along the jawline; increased dark or coarse hair on the face, chest, or abdomen (hirsutism); diffuse thinning of scalp hair along the center partition; and difficulty with weight management.',
      whyMightItRelateToMySymptoms: 'PCOS is one possible condition associated with this symptom pattern. When higher androgen levels or insulin resistance are present, they can simultaneously influence the menstrual cycle, oil glands in the skin, and hair follicle growth cycles.',
      howIsItUsuallyEvaluated: 'Clinicians usually evaluate PCOS using the internationally recognized Rotterdam Diagnostic Criteria, which require at least two of the following three features (after ruling out other conditions): 1) Irregular or absent ovulation; 2) Clinical or biochemical signs of elevated androgens; 3) Polycystic appearance on a pelvic ultrasound.',
      whatSpecialistEvaluatesIt: 'A Gynaecologist is the primary specialist for menstrual and reproductive evaluation. An Endocrinologist may also evaluate systemic hormone and insulin dynamics, and a Clinical Nutritionist provides supportive dietary care.',
      whatTreatmentApproachesExist: 'Evidence-based management is individualized. It typically combines supportive nutrition (steadying blood glucose), enjoyable physical activity, and medical options prescribed by a doctor (such as cycle-regulating therapies, anti-androgen medications, or insulin-sensitizing agents like metformin).',
      whenShouldISeekMedicalAttention: 'Schedule a medical consultation if you have periods more than 35 days apart, fewer than 8 periods a year, sudden adult acne with facial hair growth, or if you are planning pregnancy.'
    },
    pcodClarification: 'PCOD (Polycystic Ovarian Disease) is an older descriptive term often used colloquially in South Asia referring to ovaries containing multiple immature follicles on ultrasound. In modern clinical guidelines, PCOS is the standard term, emphasizing that it is an endocrine and metabolic condition rather than an isolated ovarian disease. Neither should be treated as an automatic diagnosis without full clinical evaluation.',
    disclaimer: 'PCOS is one possible condition associated with this symptom pattern. This information is educational and does not constitute a medical diagnosis. Only a qualified clinician can determine if PCOS criteria are met.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology), DGO',
    lastReviewedDate: '2026-09-15',
    sources: [
      'International Evidence-based Guideline for the Assessment and Management of PCOS (Monash University / ASRM / ESHRE 2023)',
      'ACOG Practice Bulletin No. 194: Polycystic Ovary Syndrome'
    ],
    publishedStatus: true
  },
  {
    id: 'vaginal_infections_dysbiosis',
    name: 'Vaginal Infections & Microbiome Dysbiosis',
    category: 'Vaginal & Vulvar Health',
    description: 'Vaginal symptoms such as itching, burning, odor, and discharge changes can occur with several conditions including yeast infection, bacterial vaginosis, STIs, or irritant contact causes.',
    symptoms: ['vaginal_itching', 'vaginal_burning', 'unusual_discharge', 'discharge_color_change', 'discharge_consistency_change', 'vaginal_odor'],
    relatedSymptoms: ['vaginal_dryness', 'vulvar_irritation', 'vulvar_redness', 'pain_urination', 'pain_intercourse', 'recurrent_vaginal_symptoms'],
    possibleCauses: [
      'Candida albicans or non-albicans fungal overgrowth (Yeast infection / Candidiasis)',
      'Loss of protective hydrogen-peroxide-producing Lactobacillus with anaerobic overgrowth (Bacterial Vaginosis)',
      'Sexually transmitted pathogens (Trichomonas vaginalis, Chlamydia trachomatis, Neisseria gonorrhoeae)',
      'Irritant contact dermatitis from scented soaps, synthetic washes, detergents, or condoms',
      'Vulvovaginal atrophy or hypoestrogenism (hormonal changes during lactation or perimenopause)'
    ],
    specialist: {
      primary: 'Gynaecologist',
      secondary: ['General Physician']
    },
    redFlags: [
      'Pelvic or lower abdominal pain accompanied by high fever, severe nausea, or chills',
      'Unusual foul-smelling discharge during pregnancy (urgent evaluation needed to prevent complications)',
      'Severe painful genital sores, blisters, or open ulcerations'
    ],
    patientEducation: {
      whatIsIt: 'The healthy vaginal ecosystem maintains a delicate balance dominated by beneficial Lactobacillus bacteria that produce lactic acid. When this balance shifts—due to antibiotics, hormonal changes, immune shifts, or external irritants—microorganisms can overgrow, or mucosal tissues can become inflamed (vaginitis).',
      whatSymptomsCanBeAssociated: 'Symptoms commonly include changes in discharge color (thick white, yellowish-green, grey), consistency (clumpy, thin, frothy), noticeable odor (especially fishy), intense vulvar itching, burning when urinating, or pain during intercourse.',
      whyMightItRelateToMySymptoms: 'These symptoms can occur with several conditions, including yeast infection, bacterial vaginosis, some sexually transmitted infections, or non-infectious irritation. Because symptoms often overlap, visual self-diagnosis is notoriously inaccurate.',
      howIsItUsuallyEvaluated: 'A healthcare professional evaluates this through a gentle physical examination, vaginal pH measurement, microscopic wet mount examination, and targeted NAAT or PCR swab testing to identify the exact cause.',
      whatSpecialistEvaluatesIt: 'A Gynaecologist is the primary specialist for accurate diagnosis and prescription of targeted antimicrobials. A General Physician can also provide initial swab evaluation.',
      whatTreatmentApproachesExist: 'Targeted medical treatment depends strictly on the identified cause: antifungal medications for yeast infections, specific oral or topical antibiotics for bacterial vaginosis or trichomoniasis, or soothing barrier ointments for contact dermatitis. Over-the-counter self-treatment without testing can mask symptoms or worsen irritation.',
      whenShouldISeekMedicalAttention: 'Seek clinical evaluation promptly when symptoms first appear, especially if this is your first episode, if symptoms are recurrent, if you are pregnant, or if you have pelvic pain.'
    },
    disclaimer: 'These symptoms can occur with several conditions, including yeast infection, bacterial vaginosis, sexually transmitted infections, or irritation. A healthcare professional may need to examine you or perform testing to determine the cause.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology), DGO',
    lastReviewedDate: '2026-09-10',
    sources: [
      'CDC Sexually Transmitted Infections Treatment Guidelines (2021)',
      'ACOG Practice Bulletin No. 215: Vaginitis in Nonpregnant Patients'
    ],
    publishedStatus: true
  },
  {
    id: 'endometriosis_adenomyosis',
    name: 'Endometriosis & Pelvic Conditions',
    category: 'Pelvic & Menstrual Health',
    description: 'Pelvic pain, severe menstrual cramps, and pain during intercourse can be associated with conditions such as endometriosis, adenomyosis, or uterine fibroids.',
    symptoms: ['pelvic_pain', 'painful_periods', 'pain_intercourse', 'lower_abdominal_pain'],
    relatedSymptoms: ['heavy_periods', 'long_periods', 'pelvic_pressure', 'spotting', 'difficulty_conceiving'],
    possibleCauses: [
      'Endometriosis (endometrial-like tissue growing outside the uterus in the pelvic cavity)',
      'Adenomyosis (endometrial tissue growing into the muscular uterine wall / myometrium)',
      'Uterine leiomyomas (fibroids) or endometrial polyps',
      'Pelvic inflammatory disease (PID) or chronic pelvic floor muscle hypertonicity'
    ],
    specialist: {
      primary: 'Gynaecologist',
      secondary: ['Pelvic Health Specialist']
    },
    redFlags: [
      'Sudden excruciating abdominal or pelvic pain with guarding or rigid abdomen',
      'Severe pain accompanied by high fever, vomiting, or inability to urinate',
      'Bleeding so heavy that you feel faint, lightheaded, or short of breath'
    ],
    patientEducation: {
      whatIsIt: 'Endometriosis is an inflammatory condition where tissue similar to the lining of the uterus grows outside the uterus—on the ovaries, fallopian tubes, bladder, bowel, or pelvic lining. Adenomyosis occurs when this tissue grows into the muscular wall of the uterus itself.',
      whatSymptomsCanBeAssociated: 'Common symptoms include severe, debilitating period pain (dysmenorrhea) that does not respond to regular over-the-counter painkillers; deep pelvic pain during or after intercourse; chronic lower pelvic or lower back ache; heavy or prolonged bleeding; and fertility challenges.',
      whyMightItRelateToMySymptoms: 'Several conditions can cause similar menstrual and pelvic symptoms. Pelvic pain combined with painful periods and pain during intercourse is a classic clinical cluster that warrants dedicated gynaecological evaluation.',
      howIsItUsuallyEvaluated: 'A Gynaecologist evaluates this through a detailed symptom history, pelvic examination, high-resolution transvaginal pelvic ultrasound (looking for endometriomas, adenomyosis signs, or fibroids), pelvic MRI, or laparoscopic surgical visualization.',
      whatSpecialistEvaluatesIt: 'A Gynaecologist, especially one with expertise in minimally invasive gynaecological surgery and pelvic pain.',
      whatTreatmentApproachesExist: 'Treatment options include medical pain management, hormonal therapies (such as progestins, combined contraceptives, or GnRH modulators to suppress cyclical bleeding), specialized pelvic floor physical therapy, and conservative laparoscopic surgery when indicated.',
      whenShouldISeekMedicalAttention: 'Seek a gynaecological consultation if menstrual pain forces you to miss work, school, or daily activities, or if intimacy causes deep pelvic pain.'
    },
    disclaimer: 'Several conditions can cause similar pelvic and menstrual symptoms. An evaluation by a gynaecologist is needed to determine the underlying cause.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology), DGO',
    lastReviewedDate: '2026-08-28',
    sources: [
      'ESHRE Guideline on Endometriosis (2022)',
      'ACOG Practice Bulletin No. 114: Management of Endometriosis'
    ],
    publishedStatus: true
  },
  {
    id: 'thyroid_endocrine_disorders',
    name: 'Thyroid-Related & Endocrine Conditions',
    category: 'Thyroid / Endocrine / Metabolic',
    description: 'Thyroid disorders (such as hypothyroidism or Hashimoto’s) and metabolic factors can affect baseline energy, menstrual regularity, body temperature, and hair cycles.',
    symptoms: ['fatigue', 'weight_gain', 'weight_loss', 'feeling_cold', 'feeling_hot', 'hair_thinning'],
    relatedSymptoms: ['menstrual_changes', 'irregular_periods', 'constipation', 'palpitations', 'weakness', 'dry_skin', 'mood_swings'],
    possibleCauses: [
      'Primary Hypothyroidism or Autoimmune Hashimoto’s Thyroiditis',
      'Hyperthyroidism or Graves’ Disease',
      'Subclinical thyroid dysfunction',
      'Hypothalamic-pituitary-adrenal axis disruption'
    ],
    specialist: {
      primary: 'Endocrinologist',
      secondary: ['General Physician', 'Gynaecologist']
    },
    redFlags: [
      'Severe resting heart palpitations (>120 bpm), chest pain, or irregular heart rhythm',
      'Extreme swelling of the throat with difficulty swallowing or hoarse voice',
      'Severe confusion, hypothermia, or fainting'
    ],
    patientEducation: {
      whatIsIt: 'The thyroid is a small gland at the base of the neck that secretes hormones (T3 and T4) regulating body metabolism, cellular energy, temperature, heart rate, and reproductive hormone sensitivity.',
      whatSymptomsCanBeAssociated: 'An underactive thyroid (hypothyroidism) can cause sluggishness, fatigue, feeling cold, weight gain, constipation, dry skin, hair thinning, and heavier or irregular menstrual periods. An overactive thyroid (hyperthyroidism) can cause palpitations, heat intolerance, weight loss, and anxiety.',
      whyMightItRelateToMySymptoms: 'Thyroid-related conditions can produce broad symptoms across multiple body systems because thyroid receptors exist on almost every cell, including ovarian follicles and hair follicles.',
      howIsItUsuallyEvaluated: 'Evaluation is straightforward and highly reliable via targeted blood tests: Serum TSH (Thyroid Stimulating Hormone), Free T4, Free T3, and thyroid antibody titers (Anti-TPO and Anti-TG) to check for autoimmune thyroiditis.',
      whatSpecialistEvaluatesIt: 'An Endocrinologist or a General Physician conducts thyroid assessments and manages precise medication dosing.',
      whatTreatmentApproachesExist: 'Hypothyroidism is treated with daily bio-identical thyroid hormone replacement (e.g. Levothyroxine) prescribed and monitored by a doctor, combined with supportive nutrition (ensuring adequate selenium, zinc, and iron stores).',
      whenShouldISeekMedicalAttention: 'Consult a physician if you experience unexplained fatigue, weight changes, sensitivity to cold or heat, and changing menstrual cycles.'
    },
    disclaimer: 'Thyroid disorders can produce symptoms that mimic reproductive or lifestyle conditions. Blood testing ordered by a physician is necessary to evaluate thyroid function.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ritu Khanna, MD (Endocrinology & Metabolism)',
    lastReviewedDate: '2026-09-02',
    sources: [
      'American Thyroid Association (ATA) Guidelines for the Treatment of Hypothyroidism',
      'Endocrine Society Clinical Practice Guidelines on Thyroid Dysfunction'
    ],
    publishedStatus: true
  },
  {
    id: 'heavy_bleeding_iron_deficiency',
    name: 'Heavy Menstrual Bleeding & Iron Deficiency',
    category: 'Menstrual & Nutritional Health',
    description: 'Heavy menstrual bleeding can progressively deplete cellular iron stores (ferritin), contributing to persistent fatigue, weakness, and diffuse hair shedding.',
    symptoms: ['heavy_periods', 'fatigue', 'hair_fall'],
    relatedSymptoms: ['weakness', 'dizziness', 'headache', 'pale_skin', 'shortness_breath_exertion'],
    possibleCauses: [
      'Uterine structural causes (fibroids, adenomyosis, endometrial polyps)',
      'Ovulatory dysfunction leading to unopposed estrogen and thick endometrial shedding',
      'Bleeding disorders (e.g. Von Willebrand disease) or medication side effects',
      'Depletion of serum ferritin and hemoglobin (Iron Deficiency Anemia)'
    ],
    specialist: {
      primary: 'Gynaecologist',
      secondary: ['General Physician', 'Clinical Nutritionist']
    },
    redFlags: [
      'Soaking through two or more overnight pads every hour for 2 hours in a row',
      'Fainting, collapse, or feeling severely breathless when walking across a room',
      'Chest pain or severe palpitations alongside heavy blood loss'
    ],
    patientEducation: {
      whatIsIt: 'Heavy menstrual bleeding (menorrhagia) is defined as menstrual blood loss that interferes with physical, emotional, or social quality of life. Over time, losing more iron each month than dietary intake replaces depletes bone marrow iron stores (ferritin) before overt anemia even shows on a routine test.',
      whatSymptomsCanBeAssociated: 'Signs include bleeding lasting > 7 days, passing clots larger than a coin, needing double protection, profound exhaustion, waking unrefreshed, dizziness upon standing, and diffuse hair shedding (telogen effluvium).',
      whyMightItRelateToMySymptoms: 'Heavy periods, fatigue, and hair fall form a classic clinical triad. When cellular iron drops, hair follicles prematurely shift from the growing (anagen) phase into the shedding (telogen) phase.',
      howIsItUsuallyEvaluated: 'Doctors evaluate the cause of bleeding with a pelvic ultrasound and evaluate iron stores with a Complete Blood Count (CBC), Serum Ferritin, and Total Iron Binding Capacity (TIBC).',
      whatSpecialistEvaluatesIt: 'A Gynaecologist evaluates the uterine and hormonal cause of heavy bleeding; a General Physician or Clinical Nutritionist guides medical iron replenishment.',
      whatTreatmentApproachesExist: 'Dual management is standard: addressing the menstrual flow (via tranexamic acid, hormonal IUD, or cycle regulators) and clinically replenishing iron stores via oral elemental iron or intravenous iron infusion under medical direction.',
      whenShouldISeekMedicalAttention: 'Seek evaluation if your period causes you to change protection overnight, if you feel weak or dizzy, or if hair shedding is noticeable.'
    },
    disclaimer: 'Do not start high-dose iron supplements without blood testing, as excess iron can accumulate. A healthcare professional should evaluate the cause of heavy bleeding and check ferritin levels.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology), DGO',
    lastReviewedDate: '2026-09-18',
    sources: [
      'FIGO Menstrual Disorders Committee Classification System (PALM-COEIN)',
      'WHO Guidelines on the Assessment of Iron Deficiency'
    ],
    publishedStatus: true
  },
  {
    id: 'androgen_hair_skin_concerns',
    name: 'Dermatological & Androgen-Sensitive Hair/Skin Patterns',
    category: 'Acne & Skin / Hair & Scalp',
    description: 'Adult acne, increased facial hair, or scalp thinning can reflect follicular androgen sensitivity, skin barrier changes, or scalp microenvironment shifts.',
    symptoms: ['acne', 'sudden_acne', 'adult_acne', 'hormonal_acne', 'facial_body_hair', 'scalp_hair_thinning'],
    relatedSymptoms: ['pigmentation', 'dark_spots', 'hair_fall', 'itchy_scalp', 'dandruff'],
    possibleCauses: [
      'Localized sensitivity of sebaceous glands and hair follicles to dihydrotestosterone (DHT)',
      'Underlying hormonal conditions (PCOS, adrenal or ovarian androgen production)',
      'Skin barrier disruption, comedogenic cosmetics, or follicular inflammation',
      'Post-inflammatory hyperpigmentation or scalp micro-inflammation'
    ],
    specialist: {
      primary: 'Dermatologist',
      secondary: ['Gynaecologist', 'Trichology / Hair & Scalp Specialist']
    },
    redFlags: [
      'Rapidly deepening voice or clitoromegaly (virilization signs requiring urgent endocrine workup)',
      'Sudden severe cystic acne with joint pain and fever (acne fulminans pattern)'
    ],
    patientEducation: {
      whatIsIt: 'Hair follicles and oil-producing sebaceous glands are hormone-responsive organs. In hormone-sensitive regions (like the jawline or scalp crown), enzymes convert testosterone to DHT, which can stimulate sebum production while miniaturizing scalp hair follicles.',
      whatSymptomsCanBeAssociated: 'Associated concerns include tender cystic bumps on the lower face, dark coarse hairs on chin or neck, widening hair partition, and post-inflammatory dark marks.',
      whyMightItRelateToMySymptoms: 'When skin and hair symptoms appear together with menstrual or weight changes, clinicians investigate both dermatological and endocrine causes.',
      howIsItUsuallyEvaluated: 'A Dermatologist performs clinical dermoscopy and scalp trichoscopy, reviews topical regimens, and orders hormone blood panels (Free Testosterone, DHEA-S, 17-OHP) if internal hormonal conditions are suspected.',
      whatSpecialistEvaluatesIt: 'A Dermatologist or Trichologist for skin and scalp; a Gynaecologist or Endocrinologist if systemic hormonal symptoms are present.',
      whatTreatmentApproachesExist: 'Evidence-based topical treatments (retinoids, azelaic acid, salicylic acid, medicated hair solutions), anti-androgenic oral medications (e.g. spironolactone when prescribed by a doctor), and gentle skin barrier repair.',
      whenShouldISeekMedicalAttention: 'Consult a dermatologist if acne is painful, leaves scars or deep dark marks, or if scalp hair thinning is noticeably progressing.'
    },
    disclaimer: 'Skin and hair symptoms can have topical, nutritional, or hormonal causes. A dermatologist and gynaecologist can determine whether testing is appropriate.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Shreya Verma, MD (Dermatology, Venereology & Leprosy)',
    lastReviewedDate: '2026-09-08',
    sources: [
      'American Academy of Dermatology (AAD) Guidelines of Care for the Management of Acne Vulgaris',
      'British Association of Dermatologists Guidelines for the Management of Alopecia'
    ],
    publishedStatus: true
  },
  {
    id: 'ovulatory_fertility_health',
    name: 'Ovulatory Dysfunction & Preconception Planning',
    category: 'Fertility & Reproductive Health',
    description: 'Irregular cycles and difficulty conceiving often involve ovulatory timing, endocrine factors, or reproductive health considerations requiring structured evaluation.',
    symptoms: ['difficulty_conceiving', 'ovulation_concerns', 'fertility_concerns', 'irregular_periods'],
    relatedSymptoms: ['missed_periods', 'recurrent_pregnancy_loss', 'preconception_concerns'],
    possibleCauses: [
      'Anovulation or oligo-ovulation (commonly associated with PCOS or hypothalamic factors)',
      'Tubal factors or pelvic adhesions',
      'Male-factor fertility parameters (semen volume, count, motility, morphology)',
      'Age-related ovarian reserve variations or thyroid/prolactin fluctuations'
    ],
    specialist: {
      primary: 'Gynaecologist',
      secondary: ['Fertility Specialist / Reproductive Endocrinologist']
    },
    redFlags: [
      'Severe one-sided pelvic pain with a positive pregnancy test (urgent ectopic pregnancy risk)',
      'Pelvic infection symptoms (fever, purulent discharge, bilateral severe pelvic tenderness)'
    ],
    patientEducation: {
      whatIsIt: 'Conception is a complex physiological sequence requiring regular ovulation, healthy sperm parameters, open fallopian tubes, and a receptive uterine lining. For healthy couples under 35, it normally takes up to 12 months of regular unprotected intercourse to conceive.',
      whatSymptomsCanBeAssociated: 'Symptoms can include unpredictable cycle lengths, difficulty identifying fertile days with ovulation predictor kits, absent fertile cervical mucus, or painful cycles.',
      whyMightItRelateToMySymptoms: 'Do not imply infertility from a short period of trying. If you have irregular cycles, it is helpful to evaluate ovulatory health early so that timing can be optimized.',
      howIsItUsuallyEvaluated: 'Clinical evaluation includes menstrual cycle mapping, mid-luteal progesterone testing to confirm ovulation, ovarian reserve markers (AMH and Antral Follicle Count via ultrasound), semen analysis for the male partner, and tubal patency testing (HSG/HyCoSy) when indicated.',
      whatSpecialistEvaluatesIt: 'A Gynaecologist or a Reproductive Endocrinologist / Fertility Specialist.',
      whatTreatmentApproachesExist: 'Evidence-based options include cycle-tracking guidance, lifestyle and nutritional optimization, ovulation induction medications (e.g. letrozole or clomiphene under specialist ultrasound monitoring), or assisted reproductive technologies.',
      whenShouldISeekMedicalAttention: 'Seek evaluation if you have been trying for 12 months (or 6 months if age 35+), or earlier if you have known irregular periods or pelvic conditions.'
    },
    disclaimer: 'Conception naturally takes time for many couples. A short period of trying is normal. A reproductive specialist can provide structured testing and guidance.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology), DGO',
    lastReviewedDate: '2026-08-30',
    sources: [
      'ASRM Practice Committee: Diagnostic Evaluation of the Infertile Female (2021)',
      'NICE Clinical Guideline on Fertility Assessment and Treatment'
    ],
    publishedStatus: true
  },
  {
    id: 'perimenopause_menopause_transition',
    name: 'Perimenopause & Menopausal Transition',
    category: 'Menopause / Perimenopause',
    description: 'Cycle variability in the 40s or 50s, hot flashes, night sweats, sleep disruption, and vaginal dryness reflect natural neuroendocrine and ovarian follicular changes.',
    symptoms: ['hot_flashes', 'cycle_changes_menopause', 'night_sweats', 'sleep_changes', 'vaginal_dryness'],
    relatedSymptoms: ['mood_swings', 'libido_changes', 'body_comp_changes', 'irregular_periods'],
    possibleCauses: [
      'Fluctuating and declining ovarian estrogen and progesterone production',
      'Hypothalamic thermoregulatory reset driving vasomotor flushing and night sweats',
      'Vulvovaginal atrophy (Genitourinary Syndrome of Menopause - GSM)'
    ],
    specialist: {
      primary: 'Gynaecologist',
      secondary: ['General Physician']
    },
    redFlags: [
      'Any vaginal bleeding occurring more than 12 months after your final menstrual period (postmenopausal bleeding requires immediate endometrial evaluation)',
      'Unusually heavy prolonged bleeding requiring urgent gynaecological care'
    ],
    patientEducation: {
      whatIsIt: 'Perimenopause is the natural transition leading up to menopause, usually beginning in the 40s. The ovaries produce fluctuating levels of estrogen and progesterone as follicle numbers decline, before periods permanently stop (menopause is marked after 12 consecutive months without a period).',
      whatSymptomsCanBeAssociated: 'Common experiences include changing cycle lengths (often shorter intervals initially, then skipped months), hot flashes, night sweats, broken sleep, brain fog, mood variability, vaginal dryness, and changes in body composition.',
      whyMightItRelateToMySymptoms: 'When hot flashes, night sweats, and cycle shifts occur in women in their 40s or early 50s, perimenopause is a common physiological explanation.',
      howIsItUsuallyEvaluated: 'Perimenopause is primarily a clinical diagnosis based on age, menstrual history, and vasomotor symptoms. Routine hormone blood tests (like FSH) fluctuate widely from day to day and are not required for diagnosis in women over 45.',
      whatSpecialistEvaluatesIt: 'A Gynaecologist or Menopause Specialist.',
      whatTreatmentApproachesExist: 'Evidence-based care includes non-hormonal lifestyle strategies (layered clothing, cool sleeping environments), localized vaginal estrogen creams for dryness, Menopausal Hormone Therapy (MHT) when clinically appropriate and safe, and non-hormonal prescription options for hot flashes.',
      whenShouldISeekMedicalAttention: 'Consult a gynaecologist if vasomotor symptoms disrupt your sleep or daily function, or if you experience very heavy or postmenopausal bleeding.'
    },
    disclaimer: 'Perimenopause is a natural hormonal transition. A gynaecologist can evaluate symptom patterns, rule out thyroid mimics, and discuss safe evidence-based symptom relief.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Ananya Mehta, MD (Obstetrics & Gynaecology), DGO',
    lastReviewedDate: '2026-09-12',
    sources: [
      'The 2022 Hormone Therapy Position Statement of The North American Menopause Society (NAMS)',
      'IMS Recommendations on Women’s Midlife Health and Menopause Hormone Therapy'
    ],
    publishedStatus: true
  },
  {
    id: 'lifestyle_stress_metabolic',
    name: 'Chronic Stress, Sleep Disruption & Nervous System Load',
    category: 'General Health / Lifestyle',
    description: 'Prolonged psychological tension, poor sleep quality, and high stress can dysregulate the hypothalamic-pituitary-adrenal (HPA) axis, impacting digestion and overall stamina.',
    symptoms: ['stress', 'poor_sleep', 'fatigue', 'headache', 'digestive_discomfort'],
    relatedSymptoms: ['weakness', 'dizziness', 'mood_swings'],
    possibleCauses: [
      'Chronic elevation of cortisol disrupting circadian sleep-wake architecture',
      'Autonomic nervous system imbalance (sympathetic overdrive / low vagal tone)',
      'Altered gut-brain axis signaling and microbiome composition'
    ],
    specialist: {
      primary: 'General Physician',
      secondary: ['Yoga & Lifestyle Specialist', 'Clinical Nutritionist']
    },
    redFlags: [
      'Thoughts of self-harm, persistent hopelessness, or acute crisis (immediate mental health helpline required)',
      'Sudden worst headache of life ("thunderclap" headache requiring immediate emergency department care)'
    ],
    patientEducation: {
      whatIsIt: 'The body’s nervous system is designed for short-term stress responses. When psychological or physiological stress becomes chronic, elevated cortisol and adrenaline affect deep sleep cycles, gut motility, blood pressure, and menstrual ovulatory signaling.',
      whatSymptomsCanBeAssociated: 'Common symptoms include difficulty falling asleep, waking at night with racing thoughts, morning exhaustion, tension headaches, indigestion, bloating, and irritability.',
      whyMightItRelateToMySymptoms: 'When fatigue, headaches, poor sleep, and digestive unease appear without specific organ disease, chronic stress load is a frequent contributing factor.',
      howIsItUsuallyEvaluated: 'A General Physician performs a thorough clinical history, screening for underlying organic conditions (ruling out anemia, thyroid issues, or sleep apnea), and evaluates lifestyle, work hours, and mental health.',
      whatSpecialistEvaluatesIt: 'A General Physician for medical evaluation; a Yoga & Lifestyle Therapist or mental health professional for supportive behavioral care.',
      whatTreatmentApproachesExist: 'Evidence-based supportive strategies include circadian sleep hygiene, diaphragmatic breathing routines, daily restorative movement, stress-management techniques, and targeted clinical support when indicated.',
      whenShouldISeekMedicalAttention: 'Consult a doctor if fatigue or headaches persist, if sleep does not improve with routine habits, or if you feel overwhelmed.'
    },
    disclaimer: 'Lifestyle and nervous system practices support baseline wellbeing. They do not replace clinical care for diagnosed medical conditions.',
    reviewStatus: 'Published',
    medicalReviewer: 'Dr. Priya Nair, MBBS, MD (General Medicine)',
    lastReviewedDate: '2026-09-05',
    sources: [
      'NICE Guidelines on Assessment and Management of Chronic Fatigue',
      'American Academy of Sleep Medicine (AASM) Clinical Practice Guidelines'
    ],
    publishedStatus: true
  }
];

// Helper to access clinical conditions with local persistence support (Admin CMS integration)
export const LOCAL_STORAGE_CONDITIONS_KEY = 'healnari_clinical_conditions';

export function getClinicalConditions() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONDITIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read clinical conditions from localStorage:', e);
  }
  return DEFAULT_CLINICAL_CONDITIONS;
}

export function saveClinicalConditions(conditionsArray) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CONDITIONS_KEY, JSON.stringify(conditionsArray));
      return true;
    }
  } catch (e) {
    console.error('Failed to save clinical conditions to localStorage:', e);
  }
  return false;
}

// ── 5. STRUCTURED SPECIALISTS REGISTRY ─────────────────────────────────────────
export const SPECIALISTS_CATALOG = [
  {
    id: 'gynaecologist',
    name: 'Gynaecologist',
    title: 'Obstetrician & Gynaecologist',
    icon: 'fa-venus',
    color: 'rose',
    tag: 'Reproductive, Cycle & Pelvic Care',
    whyRelevant: 'Evaluates menstrual irregularities, vaginal infections, pelvic pain, diagnostic criteria for PCOS, endometriosis, and reproductive health.',
    startingPointFor: ['vaginal_vulvar', 'pcos_ovulatory', 'menstrual_health', 'pelvic_health', 'fertility_reproductive', 'menopause_perimenopause', 'sexual_health'],
    relevantSymptoms: [
      'vaginal_itching', 'vaginal_burning', 'unusual_discharge', 'discharge_color_change', 
      'discharge_consistency_change', 'vaginal_odor', 'vaginal_dryness', 'vulvar_irritation', 
      'vulvar_redness', 'pain_urination', 'pain_intercourse', 'vaginal_discomfort', 
      'recurrent_vaginal_symptoms', 'irregular_periods', 'missed_periods', 'long_cycles', 
      'infrequent_periods', 'heavy_periods', 'painful_periods', 'long_periods', 'short_cycles', 
      'spotting', 'bleeding_between_periods', 'bleeding_after_intercourse', 'pelvic_pain', 
      'lower_abdominal_pain', 'pelvic_pressure', 'abnormal_bleeding', 'pms_symptoms', 
      'severe_pms_mood', 'difficulty_conceiving', 'fertility_concerns', 'ovulation_concerns', 
      'cycle_changes_menopause', 'hot_flashes', 'night_sweats', 'genital_discharge', 'genital_itching', 'sti_concerns'
    ],
    demoDoctorMatch: 'Dr. Ananya Mehta, MD'
  },
  {
    id: 'endocrinologist',
    name: 'Endocrinologist',
    title: 'Clinical Endocrinologist & Metabolism Specialist',
    icon: 'fa-dna',
    color: 'indigo',
    tag: 'Hormonal & Thyroid Care',
    whyRelevant: 'Specializes in systemic hormone synthesis, thyroid disorders (hypo/hyperthyroidism), insulin resistance, metabolic balance, and complex PCOS hormone pathways.',
    startingPointFor: ['thyroid_endocrine_metabolic'],
    relevantSymptoms: [
      'fatigue', 'weight_gain', 'weight_loss', 'feeling_cold', 'feeling_hot', 'palpitations', 
      'hair_thinning', 'metabolic_concerns', 'darkened_skin_folds', 'increased_thirst', 
      'frequent_urination', 'difficulty_losing_weight', 'hormonal_concerns', 'irregular_periods'
    ],
    demoDoctorMatch: 'Dr. Ritu Khanna, MD'
  },
  {
    id: 'dermatologist',
    name: 'Dermatologist',
    title: 'Clinical Dermatologist',
    icon: 'fa-wand-magic-sparkles',
    color: 'amber',
    tag: 'Skin & Barrier Health',
    whyRelevant: 'Diagnoses adult and hormonal acne, skin barrier inflammation, hyperpigmentation, rashes, and coordinates evidence-based medical topicals.',
    startingPointFor: ['acne_skin'],
    relevantSymptoms: [
      'acne', 'sudden_acne', 'adult_acne', 'hormonal_acne', 'pigmentation', 'dark_spots', 
      'dry_skin', 'skin_itching', 'skin_rash', 'skin_irritation', 'hair_related_skin'
    ],
    demoDoctorMatch: 'Dr. Shreya Verma, MD'
  },
  {
    id: 'trichologist',
    name: 'Trichologist / Hair & Scalp Specialist',
    title: 'Hair & Scalp Specialist',
    icon: 'fa-spa',
    color: 'teal',
    tag: 'Hair & Follicle Care',
    whyRelevant: 'Performs scalp dermoscopy, investigates shedding patterns (telogen effluvium vs androgenic thinning), dandruff, and rules out scalp micro-inflammation.',
    startingPointFor: ['hair_scalp'],
    relevantSymptoms: [
      'hair_fall', 'hair_thinning', 'sudden_hair_loss', 'patchy_hair_loss', 'dandruff', 
      'itchy_scalp', 'scalp_redness', 'scalp_hair_thinning', 'facial_body_hair'
    ],
    demoDoctorMatch: 'Dr. Shreya Verma, MD'
  },
  {
    id: 'general_physician',
    name: 'General Physician',
    title: 'Consultant Internal Medicine / General Physician',
    icon: 'fa-user-doctor',
    color: 'blue',
    tag: 'Primary Medical Evaluation',
    whyRelevant: 'Conducts primary physical exams, routine blood work (CBC, ferritin, thyroid, glucose), screens for systemic conditions, and coordinates specialist referrals.',
    startingPointFor: ['general_health', 'nutritional_health'],
    relevantSymptoms: [
      'fatigue', 'weakness', 'headache', 'dizziness', 'fever', 'poor_sleep', 'stress', 
      'digestive_discomfort', 'weight_changes', 'suspected_deficiency', 'poor_diet'
    ],
    demoDoctorMatch: 'Dr. Priya Nair, MD'
  },
  {
    id: 'nutritionist',
    name: 'Clinical Nutritionist',
    title: 'Clinical Dietitian & Metabolic Nutritionist',
    icon: 'fa-carrot',
    color: 'emerald',
    tag: 'Metabolic & Nutritional Care',
    whyRelevant: 'Provides supportive low-glycemic dietary planning, micronutrient replenishment strategies, and gut health support after clinical evaluation.',
    startingPointFor: [],
    relevantSymptoms: [
      'weight_changes', 'difficulty_losing_weight', 'metabolic_concerns', 'poor_diet', 
      'restrictive_diets', 'digestive_concerns', 'suspected_deficiency', 'fatigue'
    ],
    demoDoctorMatch: 'Dt. Pooja Sen, RD'
  },
  {
    id: 'yoga_lifestyle',
    name: 'Yoga & Lifestyle Specialist',
    title: 'Mindful Movement & Somatic Therapist',
    icon: 'fa-person-praying',
    color: 'purple',
    tag: 'Somatic Movement & Stress Relief',
    whyRelevant: 'Guides restorative movement, pelvic mobility routines, and breathwork for nervous system recovery and sleep support alongside medical care.',
    startingPointFor: [],
    relevantSymptoms: [
      'stress', 'poor_sleep', 'painful_periods', 'headache', 'fatigue'
    ],
    demoDoctorMatch: 'Dr. Priya Nair'
  }
];

// ── 6. WELLNESS & MOVEMENT EXERCISES (STRICT SAFETY COMPLIANCE) ────────────────
/**
 * Strict Rule: General wellness guidance only — NOT a medical treatment or cure.
 * Never claim exercise cures PCOS, vaginal infections, endometriosis, thyroid disease, acne, or hair loss.
 */
export const WELLNESS_EXERCISES = [
  {
    id: 'mindful_walk',
    name: '20-Minute Mindful Walk',
    category: 'Walking & Cardiovascular',
    difficulty: 'Beginner',
    duration: '20 minutes',
    frequency: '4–5 days per week',
    icon: 'fa-person-walking',
    color: 'emerald',
    tags: ['General Fitness', 'Gentle Movement', 'Stress Relief'],
    benefits: 'Encourages gentle aerobic circulation, supports daily physical activity, and promotes mental decompression without placing high stress on the body.',
    instructions: [
      'Walk at an easy, conversational pace outdoors or on a level treadmill.',
      'Maintain an upright, comfortable posture with relaxed shoulders.',
      'Breathe gently through your nose rather than shallow mouth breathing.',
      'Finish with 2 minutes of gentle ankle rolls and calf stretches.'
    ],
    safetyNotes: 'Wear supportive, comfortable footwear. Stay hydrated. Pause and rest if you feel fatigued or dizzy.'
  },
  {
    id: 'pelvic_spine_mobility',
    name: 'Gentle Pelvic & Spinal Mobility',
    category: 'Mobility & Stretching',
    difficulty: 'Beginner',
    duration: '8 minutes',
    frequency: 'Daily (Morning or Evening)',
    icon: 'fa-person-dots-from-line',
    color: 'blue',
    tags: ['Pelvic Circulation', 'Spine Flexibility', 'Gentle Comfort'],
    benefits: 'Gently eases lower back tension, encourages healthy pelvic circulation, and supports abdominal ease through comfortable ranges of motion.',
    instructions: [
      'Cat-Cow Stretch: On hands and knees, gently arch and round the spine for 6 slow breath cycles.',
      'Wide-Knee Child’s Pose: Lower hips toward heels, rest torso gently forward on a mat or cushion, and take 8 deep belly breaths.',
      'Gentle Supine Knee Hugs: Lie on back and gently draw knees toward chest, rocking side to side for 30 seconds.'
    ],
    safetyNotes: 'Move strictly within a comfortable, pain-free range. Never force a stretch or compress painful joints.'
  },
  {
    id: 'restorative_breathwork',
    name: 'Diaphragmatic 4-7-8 Breathing',
    category: 'Breathing & Nervous System',
    difficulty: 'All Levels',
    duration: '5 minutes',
    frequency: 'Daily or during high stress',
    icon: 'fa-wind',
    color: 'purple',
    tags: ['Stress Relief', 'Better Sleep', 'Nervous System'],
    benefits: 'Engages the parasympathetic nervous system, helps calm physiological tension, and prepares the mind for restful sleep.',
    instructions: [
      'Sit comfortably with your spine supported. Place one hand on your chest and one on your abdomen.',
      'Inhale quietly through your nose for a count of 4, feeling your abdomen rise.',
      'Hold your breath gently for a count of 7 (or 4 if 7 feels uncomfortable).',
      'Exhale completely through your mouth with a soft whoosh for a count of 8.',
      'Repeat for 4 to 6 gentle cycles.'
    ],
    safetyNotes: 'If breath retention causes lightheadedness, switch to equal 4-count inhales and 4-count exhales without holding.'
  },
  {
    id: 'gentle_yoga_flow',
    name: 'Restorative Gentle Yoga',
    category: 'Yoga & Recovery',
    difficulty: 'Gentle',
    duration: '10 minutes',
    frequency: 'Evening or recovery days',
    icon: 'fa-spa',
    color: 'rose',
    tags: ['Relaxation', 'Gentle Postures', 'Mindful Movement'],
    benefits: 'Promotes restorative physical relaxation, relieves heavy limb sensations, and supports evening winding down.',
    instructions: [
      'Legs-Up-The-Wall (Viparita Karani): Rest on back with legs supported against a wall and arms relaxed by your sides for 5 minutes.',
      'Supported Reclined Butterfly: Lie back with soles of feet together and knees resting outward supported on pillows for 3 minutes.',
      'Seated Gentle Side Reach: Inhale arms overhead, gently lean right and left for 1 minute.'
    ],
    safetyNotes: 'Avoid inverted postures if experiencing acute dizziness or severe pelvic discomfort.'
  },
  {
    id: 'low_impact_strength',
    name: 'Low-Impact Functional Strength',
    category: 'Strength Training',
    difficulty: 'Beginner',
    duration: '15 minutes',
    frequency: '2–3 days per week',
    icon: 'fa-dumbbell',
    color: 'amber',
    tags: ['Muscle Stamina', 'Physical Vitality', 'Functional Tone'],
    benefits: 'Engages major lower body and core muscle groups to support daily functional stamina and baseline metabolic vitality.',
    instructions: [
      'Chair Squats (Sit-to-Stands): Stand up and sit down from a sturdy chair with steady control (2 sets of 8–10 reps).',
      'Wall Push-Ups: Hands shoulder-width against a wall, gently press and lower with core engaged (2 sets of 8 reps).',
      'Glute Bridges: Lie on mat with knees bent, gently raise hips toward ceiling, hold for 2 seconds, and lower (2 sets of 10 reps).'
    ],
    safetyNotes: 'Warm up for 2 minutes with shoulder and ankle circles. Discontinue immediately if you experience joint pain or dizziness.'
  },
  {
    id: 'full_body_stretching',
    name: 'Full-Body Gentle Stretching',
    category: 'Stretching & Flexibility',
    difficulty: 'Beginner',
    duration: '8 minutes',
    frequency: 'Daily or post-walk',
    icon: 'fa-person-walking-arrow-right',
    color: 'teal',
    tags: ['Flexibility', 'Muscle Tension', 'Daily Ease'],
    benefits: 'Eases postural tension across neck, chest, hamstrings, and hips accumulated from sedentary desk work.',
    instructions: [
      'Chest Opener: Interlace fingers behind your back or place hands on hips, gently drawing elbows together for 30 seconds.',
      'Hamstring Reach: Extend one leg forward with heel on the floor, hinge gently at hips with flat back for 30 seconds per side.',
      'Neck Release: Gently tilt right ear toward right shoulder for 20 seconds, repeat on left side.'
    ],
    safetyNotes: 'Never bounce during a stretch. Breathe continuously and move within gentle tension without pain.'
  }
];

// ── 7. SYMPTOM COMBINATION & ASSESSMENT EVALUATION ENGINE ─────────────────────
/**
 * Evaluates selected symptoms against structured multi-symptom rules,
 * red-flag safety protocols, clinical conditions, and specialist mappings.
 * Strictly non-diagnostic.
 */
export function evaluateAssessment({ selectedSymptoms = [], answers = {} }) {
  // 1. Red Flag Detection
  const safetyFlags = Array.isArray(answers.safety_flags) ? answers.safety_flags : [];
  const selectedRedFlags = RED_FLAG_SYMPTOMS.filter(rf => 
    safetyFlags.includes(rf.id) || selectedSymptoms.includes(rf.id)
  );

  const hasRedFlag = selectedRedFlags.length > 0;

  if (hasRedFlag) {
    return {
      isEmergency: true,
      selectedSymptomsInfo: selectedSymptoms.map(id => ALL_SYMPTOMS_MAP[id] || { id, label: id, subtitle: '' }),
      redFlagsDetected: selectedRedFlags,
      emergencyNotice: {
        title: 'Please get medical help promptly',
        message: 'Some symptoms need prompt medical attention. Please contact a healthcare professional or local emergency service if you are experiencing acute, severe, or sudden symptoms.',
        actions: [
          'Contact a qualified healthcare professional or visit the nearest emergency department promptly.',
          'Call your local emergency ambulance service (e.g. 112 / 102 in India, 911 in the US).',
          'If you are experiencing severe emotional distress or thoughts of self-harm, contact a crisis helpline immediately (e.g. 988 or local emergency lines).',
          'Do NOT attempt vigorous exercise, self-medication, or wait for symptoms to resolve on their own.',
          'Ask a family member or trusted friend to accompany you to the clinic or hospital.'
        ]
      },
      possibleHealthAreas: [],
      relevantHealthAreaLabels: [],
      conditionsToDiscuss: [],
      recommendedSpecialists: [
        {
          id: 'urgent_care',
          name: 'Emergency Medical Services / Urgent Care',
          title: 'Immediate Clinical Care',
          icon: 'fa-truck-medical',
          color: 'rose',
          tag: 'Urgent Care',
          whyRelevant: 'Immediate in-person clinical examination and medical evaluation.',
          plainLanguageDescription: 'Emergency medical professionals who provide urgent clinical care.',
          isPrimaryStartingPoint: true
        }
      ],
      clinicalEvaluationOverview: {
        history: 'Immediate medical triage and vital signs evaluation.',
        physicalExam: 'Prompt physical examination by an attending physician.',
        tests: 'Emergency diagnostics, blood tests, or imaging as clinically indicated.'
      },
      wellnessExercises: [],
      safetyDisclaimer: 'Please seek prompt in-person medical evaluation. Normal wellness routines and symptom assessments are paused when urgent symptoms are reported.'
    };
  }

  // 2. Multi-Symptom Pattern Matching Engine
  const conditionsCatalog = getClinicalConditions();
  const matchedConditionIds = new Set();
  const relevantHealthAreaLabels = new Set();

  // Helper symptom checks
  const has = (symId) => selectedSymptoms.includes(symId);
  const hasAny = (symIds) => symIds.some(id => selectedSymptoms.includes(id));

  // --- Specific Combination Engine Rules (Matching Prompt Section 2 & 13) ---

  // Combination Rule 1 (Prompt Example 1 & Test 5): Acne + facial hair + irregular periods + hair fall
  if (has('acne') && has('irregular_periods') && (has('facial_body_hair') || has('hair_fall'))) {
    matchedConditionIds.add('pcos_ovulatory_dysfunction');
    matchedConditionIds.add('androgen_hair_skin_concerns');
    if (has('hair_fall')) {
      matchedConditionIds.add('thyroid_endocrine_disorders');
      matchedConditionIds.add('heavy_bleeding_iron_deficiency');
    }
    relevantHealthAreaLabels.add('PCOS / Ovulatory Health');
    relevantHealthAreaLabels.add('Hormonal Health');
    relevantHealthAreaLabels.add('Acne & Skin');
  }

  // Combination Rule 2 (Prompt Example 2, Test 1 & Test 2): Vaginal symptoms
  const hasVaginalSymptoms = hasAny([
    'vaginal_itching', 'vaginal_burning', 'unusual_discharge', 
    'discharge_color_change', 'discharge_consistency_change', 'vaginal_odor', 
    'vulvar_irritation', 'vulvar_redness', 'genital_discharge', 'genital_itching'
  ]);
  if (hasVaginalSymptoms) {
    matchedConditionIds.add('vaginal_infections_dysbiosis');
    relevantHealthAreaLabels.add('Vaginal & Vulvar Health');
    relevantHealthAreaLabels.add('Sexual Health');
  }

  // Combination Rule 3 (Prompt Example 3 & Test 3): Irregular periods + acne / weight gain
  if (has('irregular_periods') && (has('acne') || has('weight_changes') || has('weight_gain') || has('difficulty_losing_weight'))) {
    matchedConditionIds.add('pcos_ovulatory_dysfunction');
    matchedConditionIds.add('thyroid_endocrine_disorders');
    relevantHealthAreaLabels.add('PCOS / Ovulatory Health');
    relevantHealthAreaLabels.add('Thyroid / Endocrine / Metabolic');
  }

  // Combination Rule 4 (Prompt Example 4 & Test 7): Heavy periods + fatigue + hair fall
  if (has('heavy_periods') && (has('fatigue') || has('hair_fall') || has('weakness'))) {
    matchedConditionIds.add('heavy_bleeding_iron_deficiency');
    matchedConditionIds.add('thyroid_endocrine_disorders');
    relevantHealthAreaLabels.add('Menstrual Health');
    relevantHealthAreaLabels.add('Nutritional Health');
  }

  // Combination Rule 5 (Prompt Example 5, Test 8 & Test 9): Pelvic pain + painful periods + pain during intercourse
  if (has('pelvic_pain') || has('painful_periods') || has('pain_intercourse') || has('lower_abdominal_pain')) {
    matchedConditionIds.add('endometriosis_adenomyosis');
    relevantHealthAreaLabels.add('Pelvic Health');
    relevantHealthAreaLabels.add('Menstrual Health');
  }

  // Test Case 4: Irregular periods + hair fall
  if (has('irregular_periods') && has('hair_fall')) {
    matchedConditionIds.add('pcos_ovulatory_dysfunction');
    matchedConditionIds.add('thyroid_endocrine_disorders');
    matchedConditionIds.add('heavy_bleeding_iron_deficiency');
    relevantHealthAreaLabels.add('Hormonal Health');
    relevantHealthAreaLabels.add('Hair & Scalp');
  }

  // Test Case 6: Hair fall + fatigue
  if (has('hair_fall') && (has('fatigue') || has('weakness'))) {
    matchedConditionIds.add('heavy_bleeding_iron_deficiency');
    matchedConditionIds.add('thyroid_endocrine_disorders');
    relevantHealthAreaLabels.add('Nutritional Health');
    relevantHealthAreaLabels.add('Hair & Scalp');
  }

  // Test Case 10: Fertility concern + irregular cycles
  if (hasAny(['difficulty_conceiving', 'ovulation_concerns', 'fertility_concerns']) || (has('irregular_periods') && hasAny(['fertility_planning', 'preconception_concerns']))) {
    matchedConditionIds.add('ovulatory_fertility_health');
    matchedConditionIds.add('pcos_ovulatory_dysfunction');
    relevantHealthAreaLabels.add('Fertility & Reproductive Health');
    relevantHealthAreaLabels.add('PCOS / Ovulatory Health');
  }

  // Test Case 11: Hot flashes + cycle changes
  if (has('hot_flashes') || has('night_sweats') || has('cycle_changes_menopause')) {
    matchedConditionIds.add('perimenopause_menopause_transition');
    relevantHealthAreaLabels.add('Menopause / Perimenopause');
    relevantHealthAreaLabels.add('Hormonal Health');
  }

  // Test Case 12: Weight change + fatigue + menstrual changes
  if ((has('weight_changes') || has('weight_gain')) && has('fatigue') && (has('irregular_periods') || has('menstrual_changes') || has('heavy_periods'))) {
    matchedConditionIds.add('thyroid_endocrine_disorders');
    matchedConditionIds.add('pcos_ovulatory_dysfunction');
    matchedConditionIds.add('heavy_bleeding_iron_deficiency');
    relevantHealthAreaLabels.add('Thyroid / Endocrine / Metabolic');
    relevantHealthAreaLabels.add('PCOS / Ovulatory Health');
  }

  // Test Case 13: Stress + poor sleep
  if (has('stress') || has('poor_sleep')) {
    matchedConditionIds.add('lifestyle_stress_metabolic');
    relevantHealthAreaLabels.add('General Health');
  }

  // General fallback matches if sparse
  if (matchedConditionIds.size === 0) {
    if (hasAny(['acne', 'sudden_acne', 'adult_acne', 'pigmentation'])) {
      matchedConditionIds.add('androgen_hair_skin_concerns');
      relevantHealthAreaLabels.add('Acne & Skin');
    }
    if (hasAny(['fatigue', 'weakness', 'poor_diet'])) {
      matchedConditionIds.add('heavy_bleeding_iron_deficiency');
      matchedConditionIds.add('thyroid_endocrine_disorders');
      relevantHealthAreaLabels.add('Nutritional Health');
    }
  }

  // Always ensure at least 2 relevant educational conditions to discuss
  if (matchedConditionIds.size < 2) {
    matchedConditionIds.add('lifestyle_stress_metabolic');
  }

  // Extract condition objects
  const conditionsToDiscuss = conditionsCatalog.filter(c => matchedConditionIds.has(c.id));

  // Determine Specialist Recommendations & Clear Primary Starting Point
  // Determine Primary Starting Point:
  let primarySpecialistId = 'general_physician';
  if (hasVaginalSymptoms || hasAny(['irregular_periods', 'missed_periods', 'heavy_periods', 'painful_periods', 'pelvic_pain', 'pain_intercourse', 'hot_flashes', 'difficulty_conceiving'])) {
    primarySpecialistId = 'gynaecologist';
  } else if (hasAny(['feeling_cold', 'feeling_hot', 'increased_thirst', 'weight_gain', 'weight_loss']) && !hasAny(['acne', 'hair_fall'])) {
    primarySpecialistId = 'endocrinologist';
  } else if (hasAny(['acne', 'sudden_acne', 'adult_acne', 'pigmentation', 'skin_rash']) && !hasAny(['irregular_periods', 'heavy_periods'])) {
    primarySpecialistId = 'dermatologist';
  } else if (hasAny(['hair_fall', 'hair_thinning', 'dandruff']) && !hasAny(['irregular_periods', 'heavy_periods', 'fatigue'])) {
    primarySpecialistId = 'trichologist';
  }

  // Plain-Language Specialist Descriptions (Requirement 3 & 11)
  const plainSpecialistDescriptions = {
    dermatologist: 'A doctor who helps with skin, hair and nail problems.',
    gynaecologist: "A doctor who helps with periods, reproductive health and many women's health concerns.",
    endocrinologist: 'A doctor who helps with hormone and metabolism-related health problems.',
    trichologist: 'A specialist who focuses on scalp health, hair thinning, and shedding causes.',
    general_physician: 'A doctor who helps with overall health checks, routine blood tests, and medical evaluation.',
    nutritionist: 'A specialist who helps with balanced nutrition, iron replenishment, and metabolic diet guidance.',
    yoga_lifestyle: 'A specialist who helps with gentle movement, pelvic comfort, and stress regulation.'
  };

  // Filter relevant specialists
  const candidateSpecialists = SPECIALISTS_CATALOG.filter(spec => {
    return spec.relevantSymptoms.some(sym => selectedSymptoms.includes(sym)) || spec.id === primarySpecialistId;
  });

  // Mark the primary starting point clearly & attach plain-language explanation
  const recommendedSpecialists = (candidateSpecialists.length > 0 ? candidateSpecialists : SPECIALISTS_CATALOG.slice(0, 3)).map(spec => ({
    ...spec,
    isPrimaryStartingPoint: spec.id === primarySpecialistId,
    plainLanguageDescription: plainSpecialistDescriptions[spec.id] || spec.whyRelevant
  }));

  // Sort so the primary starting point specialist is always first
  recommendedSpecialists.sort((a, b) => (b.isPrimaryStartingPoint ? 1 : 0) - (a.isPrimaryStartingPoint ? 1 : 0));

  // Plain-Language Possible Reasons (Requirement 3 & 6: "THIS MAY BE RELATED TO")
  const possibleReasonsMap = new Map();
  if (has('hair_fall') || has('hair_thinning') || has('scalp_hair_thinning')) {
    possibleReasonsMap.set('Hormone changes', 'Hormone changes (shifts in estrogen, progesterone, or androgens can alter growth cycles)');
    possibleReasonsMap.set('Nutrition or low iron', 'Nutrition or low iron (cellular iron reserves and ferritin are vital for hair follicles)');
    possibleReasonsMap.set('Thyroid-related problems', 'Thyroid-related problems (underactive or overactive thyroid signaling affects metabolism)');
    possibleReasonsMap.set('Scalp conditions', 'Scalp conditions (dandruff, inflammation, or microenvironment shifts around hair roots)');
    possibleReasonsMap.set('Stress or recent illness', 'Stress or recent illness (acute stress or fever can trigger temporary shedding 2–3 months later)');
    possibleReasonsMap.set('Medicines', 'Medicines (certain prescription medications or contraceptive transitions)');
    possibleReasonsMap.set('Family-related hair loss', 'Family-related hair loss (genetic sensitivity of hair follicles to natural hormone variations)');
  }
  if (hasVaginalSymptoms) {
    possibleReasonsMap.set('Microbiome balance shifts', 'Microbiome balance shifts (natural fluctuations in protective Lactobacillus bacteria)');
    possibleReasonsMap.set('Soaps or contact irritation', 'Soaps or contact irritation (reactions to synthetic washes, scented products, or detergents)');
    possibleReasonsMap.set('Hormone changes', 'Hormone changes (estrogen variations during cycles, lactation, or perimenopause affecting tissue moisture)');
  }
  if (has('acne') || has('sudden_acne')) {
    possibleReasonsMap.set('Hormone changes', 'Hormone changes (androgen sensitivity of sebaceous oil glands along jawline or chin)');
    possibleReasonsMap.set('Skin barrier changes', 'Skin barrier changes (surface follicular congestion, cosmetic buildup, or inflammation)');
    possibleReasonsMap.set('Metabolic factors', 'Metabolic factors (dietary carbohydrate and insulin dynamics affecting sebum)');
  }
  if (has('irregular_periods') || has('heavy_periods') || has('painful_periods') || has('missed_periods')) {
    possibleReasonsMap.set('Hormone changes', 'Hormone changes (ovulatory variations affecting estrogen and progesterone balance)');
    possibleReasonsMap.set('Thyroid-related problems', 'Thyroid-related problems (thyroid hormones directly interact with menstrual regularity)');
    possibleReasonsMap.set('Uterine or pelvic factors', 'Uterine or pelvic factors (cramping, pelvic muscular tone, or endometrial lining shifts)');
  }
  if (has('weight_changes') || has('weight_gain') || has('difficulty_losing_weight')) {
    possibleReasonsMap.set('Metabolic & insulin dynamics', 'Metabolic & insulin dynamics (how efficiently your body processes energy and carbohydrates)');
    possibleReasonsMap.set('Thyroid-related problems', 'Thyroid-related problems (basal metabolic rate and temperature regulation)');
  }
  if (has('stress') || has('poor_sleep') || has('fatigue')) {
    possibleReasonsMap.set('Stress or recent illness', 'Stress or recent illness (nervous system fatigue and elevated cortisol load)');
    possibleReasonsMap.set('Nutrition or low iron', 'Nutrition or low iron (iron, Vitamin D, or B12 stores affecting baseline stamina)');
  }

  // Ensure standard common reasons are present
  if (possibleReasonsMap.size === 0) {
    possibleReasonsMap.set('Hormone changes', 'Hormone changes (natural cyclical or endocrine fluctuations)');
    possibleReasonsMap.set('Nutrition or low iron', 'Nutrition or low iron (micronutrient reserves and dietary factors)');
    possibleReasonsMap.set('Stress or recent illness', 'Stress or recent illness (physiological stress load or immune recovery)');
  }

  const possibleReasons = Array.from(possibleReasonsMap.values());

  // Multi-Symptom Explanation (Requirement 5: Never automatically diagnose PCOS)
  let multiSymptomExplanation = null;
  if (selectedSymptoms.length > 1) {
    if (has('acne') && has('irregular_periods') && (has('facial_body_hair') || has('hair_fall') || has('hair_thinning'))) {
      multiSymptomExplanation = "These symptoms can sometimes occur together. There are several possible reasons, including hormone-related conditions, thyroid problems, nutrition issues and skin/hair conditions. PCOS is one condition that can sometimes be associated with this group of symptoms. A doctor needs to evaluate your symptoms and medical history.";
    } else {
      multiSymptomExplanation = "These symptoms can sometimes occur together. There are several possible reasons, including interconnected hormone-related conditions, thyroid problems, nutrition issues and lifestyle factors. A doctor needs to evaluate your symptoms and medical history.";
    }
  }

  // High-Level Clinical Evaluation Overview (Prompt Section 3 & 11)
  const clinicalEvaluationOverview = {
    history: 'Comprehensive symptom timeline, cycle mapping, family history, and medication review.',
    physicalExam: hasVaginalSymptoms || hasAny(['pelvic_pain', 'painful_periods', 'irregular_periods'])
      ? 'Physical examination and gynaecological / pelvic evaluation when indicated.'
      : 'Targeted physical examination, skin/scalp evaluation, and vital signs.',
    tests: hasVaginalSymptoms
      ? 'Vaginal pH evaluation, microscopy/wet mount, and targeted swab testing (ruling out yeast, BV, and STIs).'
      : hasAny(['irregular_periods', 'acne', 'facial_body_hair'])
      ? 'Hormone blood panels (LH, FSH, Estradiol, Free Testosterone, DHEA-S, TSH, Fasting Glucose/Insulin) and pelvic ultrasound.'
      : 'Complete blood count (CBC), serum ferritin, thyroid profile (TSH), and metabolic panels.',
    questionsToAskDoctor: [
      'Based on my symptoms, what diagnostic tests or swabs do you recommend?',
      'Could my symptoms be interconnected across my cycles, metabolism, or nutrition?',
      'Are there specific hormonal, thyroid, or iron levels we should evaluate?',
      'What are the next safe steps and timeline for my care plan?'
    ]
  };

  // Safe Tailored Wellness & Movement Selection (Prompt Section 10)
  let selectedExercises = [];
  if (hasAny(['stress', 'poor_sleep', 'headache'])) {
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'restorative_breathwork'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'mindful_walk'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'gentle_yoga_flow'));
  } else if (hasAny(['painful_periods', 'pelvic_pain', 'digestive_discomfort'])) {
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'pelvic_spine_mobility'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'mindful_walk'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'full_body_stretching'));
  } else if (hasAny(['weight_changes', 'difficulty_losing_weight', 'metabolic_concerns'])) {
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'mindful_walk'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'low_impact_strength'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'full_body_stretching'));
  } else {
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'mindful_walk'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'pelvic_spine_mobility'));
    selectedExercises.push(WELLNESS_EXERCISES.find(e => e.id === 'full_body_stretching'));
  }
  selectedExercises = selectedExercises.filter(Boolean);

  const selectedSymptomsInfo = selectedSymptoms.map(id => ALL_SYMPTOMS_MAP[id] || { id, label: id, subtitle: '' });

  return {
    isEmergency: false,
    selectedSymptomsInfo,
    answers,
    possibleReasons,
    multiSymptomExplanation,
    relevantHealthAreaLabels: Array.from(relevantHealthAreaLabels),
    conditionsToDiscuss,
    recommendedSpecialists: recommendedSpecialists.slice(0, 4),
    primarySpecialist: recommendedSpecialists[0] || null,
    clinicalEvaluationOverview,
    wellnessExercises: selectedExercises,
    safetyDisclaimer: 'HealNari provides educational health assessment and care navigation only. It is not a medical diagnosis. Always consult a licensed physician for clinical examination, laboratory interpretation, and medical prescriptions.'
  };
}

// ── 8. LOCAL STORAGE PERSISTENCE ──────────────────────────────────────────────
export const LOCAL_STORAGE_ASSESSMENT_KEY = 'healnari_symptom_assessment';
export const LOCAL_STORAGE_HISTORY_KEY = 'healnari_assessment_history';

export function saveAssessmentLocally(data) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const timestamp = new Date().toISOString();
    const record = { ...data, timestamp, id: `assess_${Date.now()}` };
    localStorage.setItem(LOCAL_STORAGE_ASSESSMENT_KEY, JSON.stringify(record));

    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) || '[]');
    const updated = [record, ...existing.filter(item => item.id !== record.id)].slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
    return record;
  } catch (e) {
    console.warn('Failed to save assessment locally:', e);
    return null;
  }
}

export function getLatestAssessment() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const data = localStorage.getItem(LOCAL_STORAGE_ASSESSMENT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
