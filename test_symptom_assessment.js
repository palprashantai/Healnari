import { evaluateAssessment } from './src/data/symptomAssessmentData.js';

const FORBIDDEN_PHRASES = [
  "you have pcos",
  "you have a vaginal infection",
  "you have hormonal imbalance",
  "you have thyroid disease",
  "this confirms pcos",
  "this means you have"
];

function checkForForbiddenPhrases(obj) {
  const json = JSON.stringify(obj).toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (json.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

const TEST_CASES = [
  {
    id: 1,
    name: 'Vaginal itching + discharge',
    symptoms: ['vaginal_itching', 'unusual_discharge'],
    answers: {},
    expectedHealthArea: 'Vaginal & Vulvar Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 2,
    name: 'Vaginal odor + burning',
    symptoms: ['vaginal_odor', 'vaginal_burning'],
    answers: {},
    expectedHealthArea: 'Vaginal & Vulvar Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 3,
    name: 'Irregular periods + acne',
    symptoms: ['irregular_periods', 'acne'],
    answers: {},
    expectedHealthArea: 'PCOS / Ovulatory Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 4,
    name: 'Irregular periods + hair fall',
    symptoms: ['irregular_periods', 'hair_fall'],
    answers: {},
    expectedHealthArea: 'Hormonal Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 5,
    name: 'Acne + facial hair + irregular periods',
    symptoms: ['acne', 'facial_body_hair', 'irregular_periods'],
    answers: {},
    expectedHealthArea: 'PCOS / Ovulatory Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 6,
    name: 'Hair fall + fatigue',
    symptoms: ['hair_fall', 'fatigue'],
    answers: {},
    expectedHealthArea: 'Nutritional Health',
    expectedSpecialist: 'general_physician',
    isEmergency: false
  },
  {
    id: 7,
    name: 'Heavy periods + fatigue',
    symptoms: ['heavy_periods', 'fatigue'],
    answers: {},
    expectedHealthArea: 'Menstrual Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 8,
    name: 'Pelvic pain + painful periods',
    symptoms: ['pelvic_pain', 'painful_periods'],
    answers: {},
    expectedHealthArea: 'Pelvic Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 9,
    name: 'Pain during intercourse + pelvic pain',
    symptoms: ['pain_intercourse', 'pelvic_pain'],
    answers: {},
    expectedHealthArea: 'Pelvic Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 10,
    name: 'Fertility concern + irregular cycles',
    symptoms: ['fertility_concerns', 'irregular_periods'],
    answers: {},
    expectedHealthArea: 'Fertility & Reproductive Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 11,
    name: 'Hot flashes + cycle changes',
    symptoms: ['hot_flashes', 'cycle_changes_menopause'],
    answers: {},
    expectedHealthArea: 'Menopause / Perimenopause',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 12,
    name: 'Weight change + fatigue + menstrual changes',
    symptoms: ['weight_changes', 'fatigue', 'irregular_periods'],
    answers: {},
    expectedHealthArea: 'PCOS / Ovulatory Health',
    expectedSpecialist: 'gynaecologist',
    isEmergency: false
  },
  {
    id: 13,
    name: 'Stress + poor sleep',
    symptoms: ['stress', 'poor_sleep'],
    answers: {},
    expectedHealthArea: 'General Health',
    expectedSpecialist: 'general_physician',
    isEmergency: false
  },
  {
    id: 14,
    name: 'Emergency/red-flag symptoms',
    symptoms: ['red_flag_severe_pelvic_pain'],
    answers: { safety_flags: ['red_flag_severe_pelvic_pain'] },
    expectedHealthArea: null,
    expectedSpecialist: 'urgent_care',
    isEmergency: true
  }
];

let allPassed = true;
console.log('====================================================');
console.log('HEALNARI SYMPTOM ASSESSMENT TEST SUITE (14 TEST CASES)');
console.log('====================================================\n');

TEST_CASES.forEach((tc) => {
  const result = evaluateAssessment({
    selectedSymptoms: tc.symptoms,
    answers: tc.answers
  });

  const forbidden = checkForForbiddenPhrases(result);
  const emergencyMatch = result.isEmergency === tc.isEmergency;
  const specialistMatch = tc.expectedSpecialist
    ? result.recommendedSpecialists.some(s => s.id === tc.expectedSpecialist)
    : true;
  const healthAreaMatch = tc.expectedHealthArea
    ? result.relevantHealthAreaLabels.includes(tc.expectedHealthArea)
    : true;

  const passed = !forbidden && emergencyMatch && specialistMatch && healthAreaMatch;

  if (passed) {
    console.log(`✓ Test ${tc.id}: ${tc.name} -> PASSED`);
    console.log(`  - Areas: [${result.relevantHealthAreaLabels?.join(', ') || 'Emergency Triage'}]`);
    console.log(`  - Primary Specialist: ${result.recommendedSpecialists[0]?.name}`);
    console.log(`  - Non-diagnostic compliance: VERIFIED (Zero forbidden diagnostic assertions)\n`);
  } else {
    allPassed = false;
    console.error(`✗ Test ${tc.id}: ${tc.name} -> FAILED`);
    if (forbidden) console.error(`  - Found forbidden diagnostic phrase: "${forbidden}"`);
    if (!emergencyMatch) console.error(`  - Emergency status mismatch: expected ${tc.isEmergency}, got ${result.isEmergency}`);
    if (!specialistMatch) console.error(`  - Specialist mismatch: expected ${tc.expectedSpecialist}`);
    if (!healthAreaMatch) console.error(`  - Health area mismatch: expected ${tc.expectedHealthArea}, got [${result.relevantHealthAreaLabels.join(', ')}]`);
    console.log('');
  }
});

console.log('====================================================');
if (allPassed) {
  console.log('ALL 14 TEST CASES PASSED WITH 100% CLINICAL COMPLIANCE!');
  process.exit(0);
} else {
  console.error('SOME TEST CASES FAILED.');
  process.exit(1);
}
