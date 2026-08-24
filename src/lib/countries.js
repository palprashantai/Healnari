export const COUNTRIES = [
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    symbol: '$',
    defaultPatientFee: 29,
    defaultDoctorFee: 50,
    councils: [
      'US State Medical Board (All 50 States)',
      'American Board of Obstetrics & Gynecology (ABOG)',
      'American Board of Internal Medicine (ABIM - Endocrinology)',
      'DEA Registered Practitioner'
    ],
    phonePrefix: '+1',
    payoutRail: 'Weekly Direct Deposit (ACH / Stripe US)',
    payoutLabel: 'US Bank Routing & Account Number',
    payoutFields: [
      { id: 'routingNo', label: '9-Digit Routing Number (ABA)', placeholder: '021000021' },
      { id: 'accountNo', label: 'Account Number', placeholder: '1234567890' }
    ],
    gatewayName: 'Stripe Global Telehealth (Apple Pay, Google Pay, Cards)'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    symbol: '£',
    defaultPatientFee: 24,
    defaultDoctorFee: 40,
    councils: [
      'General Medical Council (GMC - UK)',
      'Royal College of Obstetricians and Gynaecologists (RCOG)',
      'Royal College of Physicians (RCP - Endocrinology)'
    ],
    phonePrefix: '+44',
    payoutRail: 'BACS / Faster Payments / Stripe UK',
    payoutLabel: 'UK Bank Sort Code & Account Number',
    payoutFields: [
      { id: 'sortCode', label: '6-Digit Sort Code', placeholder: '20-00-00' },
      { id: 'accountNo', label: '8-Digit Account Number', placeholder: '12345678' }
    ],
    gatewayName: 'Stripe UK (Apple Pay, Google Pay, UK Cards)'
  },
  {
    code: 'AE',
    name: 'United Arab Emirates & GCC',
    flag: '🇦🇪',
    currency: 'AED',
    symbol: 'AED ',
    defaultPatientFee: 110,
    defaultDoctorFee: 180,
    councils: [
      'Dubai Health Authority (DHA)',
      'Ministry of Health and Prevention (MOHAP - UAE)',
      'Department of Health (DOH - Abu Dhabi)',
      'Dubai Healthcare City Authority (DHCR)'
    ],
    phonePrefix: '+971',
    payoutRail: 'UAE Central Bank Direct IBAN Transfer',
    payoutLabel: 'UAE Bank IBAN',
    payoutFields: [
      { id: 'iban', label: 'UAE IBAN (23 Characters)', placeholder: 'AE070330000000000123456' }
    ],
    gatewayName: 'Stripe UAE / Apple Pay / Cards'
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    symbol: '₹',
    defaultPatientFee: 799,
    defaultDoctorFee: 800,
    councils: [
      'National Medical Commission (NMC)',
      'State Medical Council (SMC)',
      'Dental Council of India (DCI)',
      'State Dental Council (SDC)',
      'Indian Nursing Council (INC)',
      'State Nursing Council (SNC)',
      'Rehabilitation Council of India (RCI)',
      'Central Council of Indian Medicine (CCIM)',
      'Central Council of Homoeopathy (CCH)',
      'Pharmacy Council of India (PCI)',
      'Indian Association of Physiotherapists (IAP)',
      'Other / Not Listed'
    ],
    phonePrefix: '+91',
    payoutRail: 'NEFT / IMPS / Direct UPI Payouts',
    payoutLabel: 'IFSC Code & Bank Account / UPI ID',
    payoutFields: [
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
      { id: 'accountNo', label: 'Bank Account Number', placeholder: '50100234567890' }
    ],
    gatewayName: 'Cashfree / Razorpay (UPI, GPay, PhonePe, Cards, NetBanking)'
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    symbol: 'CA$',
    defaultPatientFee: 39,
    defaultDoctorFee: 65,
    councils: [
      'Royal College of Physicians and Surgeons of Canada (RCPSC)',
      'College of Physicians and Surgeons of Ontario (CPSO)',
      'College of Physicians and Surgeons of BC (CPSBC)'
    ],
    phonePrefix: '+1',
    payoutRail: 'Direct EFT / Interac / Stripe Canada',
    payoutLabel: 'Canadian Transit & Account Number',
    payoutFields: [
      { id: 'transitNo', label: 'Transit (Branch) Number (5 Digits)', placeholder: '12345' },
      { id: 'institutionNo', label: 'Institution Number (3 Digits)', placeholder: '004' },
      { id: 'accountNo', label: 'Account Number', placeholder: '1234567' }
    ],
    gatewayName: 'Stripe Canada (Interac, Apple Pay, Cards)'
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    symbol: 'A$',
    defaultPatientFee: 45,
    defaultDoctorFee: 75,
    councils: [
      'Australian Health Practitioner Regulation Agency (AHPRA)',
      'Royal Australian and New Zealand College of Obstetricians (RANZCOG)'
    ],
    phonePrefix: '+61',
    payoutRail: 'Direct BSB & Account Credit (Stripe AU)',
    payoutLabel: 'Australian BSB & Account Number',
    payoutFields: [
      { id: 'bsb', label: '6-Digit BSB', placeholder: '082-001' },
      { id: 'accountNo', label: 'Account Number', placeholder: '12345678' }
    ],
    gatewayName: 'Stripe Australia (Apple Pay, Google Pay, Cards)'
  },
  {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    currency: 'EUR',
    symbol: '€',
    defaultPatientFee: 28,
    defaultDoctorFee: 45,
    councils: [
      'National Medical Licensing Board (EU Member State)',
      'European Board and College of Obstetrics and Gynaecology (EBCOG)',
      'European Society of Endocrinology (ESE)'
    ],
    phonePrefix: '+49',
    payoutRail: 'SEPA Direct Credit Transfer / Stripe EU',
    payoutLabel: 'SEPA IBAN & BIC',
    payoutFields: [
      { id: 'iban', label: 'IBAN', placeholder: 'DE89370400440532013000' },
      { id: 'bic', label: 'BIC / SWIFT', placeholder: 'DEUTDEDB' }
    ],
    gatewayName: 'Stripe EU (SEPA, iDEAL, Bancontact, Apple Pay, Cards)'
  },
  {
    code: 'GLOBAL',
    name: 'Other International',
    flag: '🌍',
    currency: 'USD',
    symbol: '$',
    defaultPatientFee: 29,
    defaultDoctorFee: 50,
    councils: [
      'National Ministry of Health / Government Medical Licensing Council',
      'International Medical Graduate / Licensing Board'
    ],
    phonePrefix: '+',
    payoutRail: 'International Wire / SWIFT / Stripe Global',
    payoutLabel: 'International SWIFT / BIC & Account Number',
    payoutFields: [
      { id: 'swift', label: 'SWIFT / BIC Code', placeholder: 'CHASUS33' },
      { id: 'accountNo', label: 'Account Number / IBAN', placeholder: 'GB29NWBK60161331926819' }
    ],
    gatewayName: 'Stripe Global (International Cards & Apple Pay)'
  }
];

export const COUNTRY_DIAL_CODES = [
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dialCode: '+971' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977' },
];

export function getCountryByCode(code) {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
}

export function detectUserCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('India')) return 'IN';
    if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('Denver') || tz.includes('America')) return 'US';
    if (tz.includes('London') || tz.includes('Europe/London')) return 'GB';
    if (tz.includes('Dubai') || tz.includes('Muscat') || tz.includes('Asia/Dubai')) return 'AE';
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) return 'CA';
    if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane') || tz.includes('Australia')) return 'AU';
    if (tz.includes('Berlin') || tz.includes('Paris') || tz.includes('Madrid') || tz.includes('Rome') || tz.includes('Amsterdam') || tz.includes('Europe')) return 'EU';
  } catch (e) {
    // default
  }
  return 'US'; // default global
}
