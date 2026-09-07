/**
 * Provider Capability Engine
 *
 * Replaces hardcoded `specialty === '...'` conditions with a clean, extensible
 * capability matrix that separates Provider Type, Clinical Capabilities,
 * Navigation, KPI Metrics, and Workflow Deliverables.
 */

export const PROVIDER_TYPES = {
  MEDICAL_DOCTOR: 'medical_doctor',
  NUTRITIONIST: 'nutritionist',
  YOGA_EXPERT: 'yoga_expert',
  MENTAL_HEALTH: 'mental_health',
  ALLIED_HEALTH: 'allied_health',
};

// Canonical mapping of specialties to provider types and clinical scopes
export const SPECIALTY_DEFINITIONS = {
  // Medical Physicians
  'General Physician': {
    type: PROVIDER_TYPES.MEDICAL_DOCTOR,
    label: 'General Physician',
    badge: 'Primary Care',
    description: 'Comprehensive adult health, preventative care, acute illnesses, and metabolic management.',
    canPrescribeDrugs: true,
    canOrderLabs: true,
    canFormulateDiet: true,
    canFormulateYoga: true,
    canManageRefills: true,
    canReviewLabs: true,
    titlePrefix: 'Dr.',
    clientLabel: 'Patient',
    consultationLabel: 'Clinical Consultation',
    primaryAction: { name: 'Write Prescription', icon: 'fa-file-prescription', mode: 'rx' },
    councilLabel: 'Medical Council (NMC / GMC)',
  },
  'Gynaecologist': {
    type: PROVIDER_TYPES.MEDICAL_DOCTOR,
    label: 'Gynecologist & Obstetrician',
    badge: 'Women’s Health',
    description: 'Menstrual cycles, reproductive endocrinology, PCOS, fertility, and pelvic health.',
    canPrescribeDrugs: true,
    canOrderLabs: true,
    canFormulateDiet: true,
    canFormulateYoga: true,
    canManageRefills: true,
    canReviewLabs: true,
    titlePrefix: 'Dr.',
    clientLabel: 'Patient',
    consultationLabel: 'Gynecology Consultation',
    primaryAction: { name: 'Write Prescription', icon: 'fa-file-prescription', mode: 'rx' },
    councilLabel: 'Medical Council (NMC / GMC)',
  },
  'Endocrinologist': {
    type: PROVIDER_TYPES.MEDICAL_DOCTOR,
    label: 'Endocrinologist',
    badge: 'Hormones & Metabolism',
    description: 'Thyroid disorders, insulin resistance, diabetes, pituitary, and adrenal health.',
    canPrescribeDrugs: true,
    canOrderLabs: true,
    canFormulateDiet: true,
    canFormulateYoga: true,
    canManageRefills: true,
    canReviewLabs: true,
    titlePrefix: 'Dr.',
    clientLabel: 'Patient',
    consultationLabel: 'Endocrine Consultation',
    primaryAction: { name: 'Write Prescription', icon: 'fa-file-prescription', mode: 'rx' },
    councilLabel: 'Medical Council (NMC / GMC)',
  },
  'Dermatologist': {
    type: PROVIDER_TYPES.MEDICAL_DOCTOR,
    label: 'Dermatologist & Trichologist',
    badge: 'Skin & Hair Health',
    description: 'Acne, hirsutism, eczema, skin barrier disorders, scalp thinning, and aesthetics.',
    canPrescribeDrugs: true,
    canOrderLabs: true,
    canFormulateDiet: true,
    canFormulateYoga: false,
    canManageRefills: true,
    canReviewLabs: true,
    titlePrefix: 'Dr.',
    clientLabel: 'Patient',
    consultationLabel: 'Dermatology Consultation',
    primaryAction: { name: 'Write Prescription', icon: 'fa-file-prescription', mode: 'rx' },
    councilLabel: 'Medical Council (NMC / GMC)',
  },

  // Clinical Nutrition & Dietetics
  'Clinical Dietitian': {
    type: PROVIDER_TYPES.NUTRITIONIST,
    label: 'Clinical Dietitian & Nutritionist',
    badge: 'Clinical Nutrition',
    description: 'Evidence-based therapeutic meal planning, macro splits, and gut health.',
    canPrescribeDrugs: false,
    canOrderLabs: false,
    canFormulateDiet: true,
    canFormulateYoga: true,
    canManageRefills: false,
    canReviewLabs: false,
    titlePrefix: 'Dt.',
    clientLabel: 'Client',
    consultationLabel: 'Nutrition Consultation',
    primaryAction: { name: 'Formulate Diet Chart', icon: 'fa-seedling', mode: 'diet' },
    councilLabel: 'Dietetic Association (IDA / RD)',
  },
  'Nutritionist': {
    type: PROVIDER_TYPES.NUTRITIONIST,
    label: 'Clinical Nutritionist',
    badge: 'Nutrition & Dietetics',
    description: 'Metabolic diet plans, insulin sensitivity nutrition, and gut health.',
    canPrescribeDrugs: false,
    canOrderLabs: false,
    canFormulateDiet: true,
    canFormulateYoga: true,
    canManageRefills: false,
    canReviewLabs: false,
    titlePrefix: 'Dt.',
    clientLabel: 'Client',
    consultationLabel: 'Nutrition Consultation',
    primaryAction: { name: 'Formulate Diet Chart', icon: 'fa-seedling', mode: 'diet' },
    councilLabel: 'Dietetic Association (IDA / RD)',
  },

  // Yoga & Mindful Movement
  'Yoga & Movement Specialist': {
    type: PROVIDER_TYPES.YOGA_EXPERT,
    label: 'Yoga & Mindful Movement Specialist',
    badge: 'Mindful Movement',
    description: 'Cycle-synced asanas, somatic relaxation, diaphragmatic pranayama, and mobility.',
    canPrescribeDrugs: false,
    canOrderLabs: false,
    canFormulateDiet: false,
    canFormulateYoga: true,
    canManageRefills: false,
    canReviewLabs: false,
    titlePrefix: '',
    clientLabel: 'Client',
    consultationLabel: 'Yoga & Movement Session',
    primaryAction: { name: 'Design Yoga Protocol', icon: 'fa-om', mode: 'yoga' },
    councilLabel: 'Yoga Alliance / Certification Body',
  },
  'Yoga Expert': {
    type: PROVIDER_TYPES.YOGA_EXPERT,
    label: 'Yoga Therapist & Instructor',
    badge: 'Yoga Therapy',
    description: 'Therapeutic yoga routines, pelvic floor mobility, stress release, and breathwork.',
    canPrescribeDrugs: false,
    canOrderLabs: false,
    canFormulateDiet: false,
    canFormulateYoga: true,
    canManageRefills: false,
    canReviewLabs: false,
    titlePrefix: '',
    clientLabel: 'Client',
    consultationLabel: 'Yoga & Movement Session',
    primaryAction: { name: 'Design Yoga Protocol', icon: 'fa-om', mode: 'yoga' },
    councilLabel: 'Yoga Alliance / Certification Body',
  },

  // Mental Health
  'Mental Health Professional': {
    type: PROVIDER_TYPES.MENTAL_HEALTH,
    label: 'Clinical Psychologist / Counselor',
    badge: 'Mental Wellness',
    description: 'Cognitive behavioral therapy, stress down-regulation, anxiety, and somatic care.',
    canPrescribeDrugs: false,
    canOrderLabs: false,
    canFormulateDiet: false,
    canFormulateYoga: true,
    canManageRefills: false,
    canReviewLabs: false,
    titlePrefix: '',
    clientLabel: 'Client',
    consultationLabel: 'Therapy & Counseling Session',
    primaryAction: { name: 'Create Session Plan', icon: 'fa-brain', mode: 'wellness' },
    councilLabel: 'RCI / Psychology Board',
  },
};

/**
 * Standard fallback definition for generic or unclassified providers
 */
const DEFAULT_PROVIDER_DEFINITION = {
  type: PROVIDER_TYPES.MEDICAL_DOCTOR,
  label: 'General Healthcare Specialist',
  badge: 'Specialist',
  description: 'Evidence-based healthcare consultation and management.',
  canPrescribeDrugs: true,
  canOrderLabs: true,
  canFormulateDiet: true,
  canFormulateYoga: true,
  canManageRefills: true,
  canReviewLabs: true,
  titlePrefix: 'Dr.',
  clientLabel: 'Patient',
  consultationLabel: 'Clinical Consultation',
  primaryAction: { name: 'Write Prescription', icon: 'fa-file-prescription', mode: 'rx' },
  councilLabel: 'Medical Council Registration',
};

/**
 * Normalizes specialty string to find closest match in capability matrix
 */
export function normalizeSpecialty(rawSpecialty = '') {
  if (!rawSpecialty) return 'General Physician';
  const clean = String(rawSpecialty).trim().toLowerCase();

  if (clean.includes('gyn') || clean.includes('obg') || clean.includes('obstetric')) return 'Gynaecologist';
  if (clean.includes('derm') || clean.includes('skin') || clean.includes('tricho')) return 'Dermatologist';
  if (clean.includes('endo') || clean.includes('thyroid') || clean.includes('diabet')) return 'Endocrinologist';
  if (clean.includes('diet') || clean.includes('nutri')) return 'Clinical Dietitian';
  if (clean.includes('yoga') || clean.includes('movement') || clean.includes('fitness')) return 'Yoga & Movement Specialist';
  if (clean.includes('mental') || clean.includes('psych') || clean.includes('counsel') || clean.includes('therapy')) return 'Mental Health Professional';
  if (clean.includes('physician') || clean.includes('general') || clean.includes('mbbs') || clean.includes('internal')) return 'General Physician';

  // Look for exact key match
  for (const key of Object.keys(SPECIALTY_DEFINITIONS)) {
    if (key.toLowerCase() === clean) return key;
  }
  return rawSpecialty;
}

/**
 * Resolves full capability profile, terminology, navigation, and KPIs for any provider
 */
export function getProviderCapabilities(userOrProfile = null) {
  const profile = userOrProfile?.profile || userOrProfile || {};
  const rawSpecialty = profile.specialty || userOrProfile?.specialty || '';
  const canonicalSpecialty = normalizeSpecialty(rawSpecialty);
  const def = SPECIALTY_DEFINITIONS[canonicalSpecialty] || DEFAULT_PROVIDER_DEFINITION;

  const isPhysician = def.type === PROVIDER_TYPES.MEDICAL_DOCTOR;
  const isNutritionist = def.type === PROVIDER_TYPES.NUTRITIONIST;
  const isYogaExpert = def.type === PROVIDER_TYPES.YOGA_EXPERT;
  const isMentalHealth = def.type === PROVIDER_TYPES.MENTAL_HEALTH;

  // Formatted display name with proper title prefix
  const rawName = userOrProfile?.name || profile.full_name || 'Consultant Specialist';
  let displayName = rawName;
  if (def.titlePrefix && !displayName.startsWith(def.titlePrefix)) {
    displayName = `${def.titlePrefix} ${displayName}`;
  }

  // Dynamic Navigation Categories tailored to this provider
  const navCategories = [
    {
      title: 'Core',
      items: [
        { name: 'Dashboard', icon: 'fa-chart-pie', path: '/doctor-dashboard', end: true, color: '#6B46C1' },
        { name: 'AI Clinical Tools', icon: 'fa-wand-magic-sparkles', path: '/doctor-dashboard/ai', end: false, color: '#a855f7', badge: 'AI' },
        { name: 'Analytics & Growth', icon: 'fa-chart-line', path: '/doctor-dashboard/analytics', end: false, color: '#f59e0b' },
      ],
    },
    {
      title: 'Scheduling',
      items: [
        { name: isYogaExpert ? 'Session Queue' : 'Appointments', icon: 'fa-calendar-check', path: '/doctor-dashboard/appointments', end: false, color: '#10b981' },
        { name: 'My Schedule', icon: 'fa-clock', path: '/doctor-dashboard/schedule', end: false, color: '#059669' },
        { name: `${def.clientLabel} Requests`, icon: 'fa-user-plus', path: '/doctor-dashboard/requests', end: false, color: '#22c55e' },
      ],
    },
    {
      title: isPhysician ? 'Clinical Care' : 'Care & Deliverables',
      items: [
        { name: `${def.clientLabel}s & EMR`, icon: 'fa-users', path: '/doctor-dashboard/patients', end: false, color: '#0ea5e9' },
        ...(def.canPrescribeDrugs ? [{ name: 'Prescriptions', icon: 'fa-file-prescription', path: '/doctor-dashboard/prescriptions', end: false, color: '#f43f5e' }] : []),
        ...(isNutritionist ? [{ name: 'Diet & Nutrition Plans', icon: 'fa-seedling', path: '/doctor-dashboard/prescriptions', end: false, color: '#10b981' }] : []),
        ...(isYogaExpert ? [{ name: 'Yoga & Movement Plans', icon: 'fa-om', path: '/doctor-dashboard/prescriptions', end: false, color: '#f59e0b' }] : []),
        ...(isMentalHealth ? [{ name: 'Session Plans & Notes', icon: 'fa-brain', path: '/doctor-dashboard/prescriptions', end: false, color: '#8b5cf6' }] : []),
        { name: 'Telemedicine', icon: 'fa-video', path: '/doctor-dashboard/telemedicine', end: false, color: '#6366f1' },
        ...(def.canReviewLabs ? [{ name: 'Lab & Reports', icon: 'fa-flask', path: '/doctor-dashboard/reports', end: false, color: '#f59e0b' }] : []),
      ],
    },
    {
      title: 'Practice Management',
      items: [
        { name: 'Communication', icon: 'fa-bullhorn', path: '/doctor-dashboard/communications', end: false, color: '#ec4899' },
        { name: 'Earnings & Payouts', icon: 'fa-file-invoice-dollar', path: '/doctor-dashboard/billing', end: false, color: '#14b8a6' },
        { name: 'Staff Management', icon: 'fa-user-nurse', path: '/doctor-dashboard/staff', end: false, color: '#d946ef' },
        { name: 'My Profile', icon: 'fa-circle-user', path: '/doctor-dashboard/profile', end: false, color: '#64748b' },
      ],
    },
  ];

  // Dynamic Mobile Bottom Bar Tabs (Ergonomic 5 items)
  const bottomTabs = [
    { name: 'Overview', icon: 'fa-chart-pie', path: '/doctor-dashboard', end: true },
    { name: isYogaExpert ? 'Sessions' : 'Queue', icon: 'fa-calendar-check', path: '/doctor-dashboard/appointments' },
    { name: 'Telemed', icon: 'fa-video', path: '/doctor-dashboard/telemedicine', isFab: true },
    { name: def.clientLabel + 's', icon: 'fa-users', path: '/doctor-dashboard/patients' },
    {
      name: isPhysician ? 'Prescribe' : (isNutritionist ? 'Diet Plan' : (isYogaExpert ? 'Yoga Plan' : 'Plan')),
      icon: def.primaryAction.icon,
      path: '/doctor-dashboard/prescriptions',
    },
  ];

  return {
    // Identity & Meta
    providerType: def.type,
    specialty: canonicalSpecialty,
    specialtyLabel: def.label,
    specialtyBadge: def.badge,
    description: def.description,
    displayName,
    titlePrefix: def.titlePrefix,
    clientLabel: def.clientLabel,
    consultationLabel: def.consultationLabel,
    councilLabel: def.councilLabel,

    // Clinical Capabilities
    canPrescribeDrugs: def.canPrescribeDrugs,
    canOrderLabs: def.canOrderLabs,
    canFormulateDiet: def.canFormulateDiet,
    canFormulateYoga: def.canFormulateYoga,
    canManageRefills: def.canManageRefills,
    canReviewLabs: def.canReviewLabs,

    // Primary Action Deliverable
    primaryAction: def.primaryAction,

    // Type Booleans
    isPhysician,
    isNutritionist,
    isYogaExpert,
    isMentalHealth,

    // Navigation Schemes
    navCategories,
    bottomTabs,
  };
}
