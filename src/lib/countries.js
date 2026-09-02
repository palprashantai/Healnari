export const COUNTRIES = [
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
    code: 'US',
    name: 'United States & International',
    flag: '🇺🇸',
    currency: 'USD',
    symbol: '$',
    defaultPatientFee: 29,
    defaultDoctorFee: 50,
    councils: [
      'US State Medical Board (All 50 States)',
      'American Board of Obstetrics & Gynecology (ABOG)',
      'American Board of Internal Medicine (ABIM - Endocrinology)',
      'International Medical Graduate / Licensing Board',
      'DEA Registered Practitioner'
    ],
    phonePrefix: '+1',
    payoutRail: 'Weekly Direct Deposit (ACH / Stripe US / Wire)',
    payoutLabel: 'US Bank Routing & Account Number / SWIFT',
    payoutFields: [
      { id: 'routingNo', label: '9-Digit Routing Number (ABA) or SWIFT', placeholder: '021000021' },
      { id: 'accountNo', label: 'Account Number / IBAN', placeholder: '1234567890' }
    ],
    gatewayName: 'Stripe Global (Apple Pay, Google Pay, International Cards)'
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
  } catch (e) {
    // default
  }
  return 'US'; // default US & International
}
