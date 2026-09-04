/**
 * HealNari Global Countries & Currency System
 * 
 * STRICT FINANCIAL POLICY:
 * Accept users from every country globally, but process transactions in ONLY two currencies:
 * 1. 🇮🇳 India (IN) -> INR (₹) via Cashfree / UPI / NetBanking / Indian Cards
 * 2. 🌐 All other countries (Global) -> USD ($) via Stripe / Apple Pay / International Cards
 */

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
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', dialCode: '+41' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dialCode: '+45' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', dialCode: '+66' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', dialCode: '+94' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977' },
];

/**
 * Returns strictly 'INR' for India (IN) and 'USD' for ANY other country in the world.
 */
export function getCurrencyForCountry(countryCode) {
  const code = (countryCode || 'IN').toUpperCase().trim();
  return code === 'IN' ? 'INR' : 'USD';
}

/**
 * Full List of Countries with strict INR / USD currency mapping
 */
export const COUNTRIES = COUNTRY_DIAL_CODES.map((c) => {
  const isIndia = c.code === 'IN';
  return {
    code: c.code,
    name: c.name,
    flag: c.flag,
    currency: isIndia ? 'INR' : 'USD',
    symbol: isIndia ? '₹' : '$',
    defaultPatientFee: isIndia ? 799 : 29,
    defaultDoctorFee: isIndia ? 800 : 50,
    phonePrefix: c.dialCode,
    councils: isIndia
      ? [
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
          'Other / Not Listed',
        ]
      : [
          `${c.name} Medical Council / Licensing Board`,
          'US State Medical Board (All 50 States)',
          'General Medical Council (GMC)',
          'International Medical Graduate / Licensing Authority',
          'Other / International Board',
        ],
    payoutRail: isIndia
      ? 'NEFT / IMPS / Direct UPI Payouts'
      : 'Weekly Direct Deposit (ACH / Stripe Global / Wire)',
    payoutLabel: isIndia
      ? 'IFSC Code & Bank Account / UPI ID'
      : 'Bank Routing & Account Number / SWIFT / IBAN',
    payoutFields: isIndia
      ? [
          { id: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
          { id: 'accountNo', label: 'Bank Account Number', placeholder: '50100234567890' },
        ]
      : [
          { id: 'routingNo', label: 'SWIFT / BIC / Routing Code', placeholder: 'SWIFTCODE' },
          { id: 'accountNo', label: 'IBAN / Account Number', placeholder: 'GB29NWBK60161331926819' },
        ],
    gatewayName: isIndia
      ? 'Cashfree / Razorpay (UPI, GPay, PhonePe, Cards, NetBanking)'
      : 'Stripe Global (Apple Pay, Google Pay, International Cards)',
  };
});

/**
 * Resolves country metadata by code.
 * Guarantees that ANY country outside India returns USD ($) with Stripe.
 */
export function getCountryByCode(code) {
  const cleanCode = (code || 'IN').toUpperCase().trim();
  const found = COUNTRIES.find((c) => c.code === cleanCode);
  if (found) return found;

  const dial = COUNTRY_DIAL_CODES.find((d) => d.code === cleanCode);
  const isIndia = cleanCode === 'IN';
  return {
    code: cleanCode,
    name: dial?.name || cleanCode,
    flag: dial?.flag || '🌐',
    currency: isIndia ? 'INR' : 'USD',
    symbol: isIndia ? '₹' : '$',
    defaultPatientFee: isIndia ? 799 : 29,
    defaultDoctorFee: isIndia ? 800 : 50,
    phonePrefix: dial?.dialCode || '+1',
    payoutRail: isIndia
      ? 'NEFT / IMPS / Direct UPI Payouts'
      : 'Weekly Direct Deposit (ACH / Stripe Global / Wire)',
    payoutLabel: isIndia
      ? 'IFSC Code & Bank Account / UPI ID'
      : 'Bank Routing & Account Number / SWIFT / IBAN',
    payoutFields: isIndia
      ? [
          { id: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
          { id: 'accountNo', label: 'Bank Account Number', placeholder: '50100234567890' },
        ]
      : [
          { id: 'routingNo', label: 'SWIFT / BIC / Routing Code', placeholder: 'SWIFTCODE' },
          { id: 'accountNo', label: 'IBAN / Account Number', placeholder: 'GB29NWBK60161331926819' },
        ],
    gatewayName: isIndia
      ? 'Cashfree / Razorpay (UPI, GPay, PhonePe, Cards, NetBanking)'
      : 'Stripe Global (Apple Pay, Google Pay, International Cards)',
  };
}

/**
 * Detects user country from user profile, phone, or browser timezone.
 * Defaults to 'IN' if in Indian timezone/profile, otherwise 'US' (which maps to USD).
 */
export function detectUserCountry(user = null) {
  const profileCountry = (user?.profile?.country || user?.country || '').trim().toUpperCase();
  if (profileCountry === 'IN' || profileCountry === 'INDIA') return 'IN';
  if (profileCountry && profileCountry !== 'IN') return profileCountry;

  const phone = (user?.profile?.phone || user?.phone || '').trim();
  if (phone.startsWith('+91') || (phone.startsWith('91') && phone.length >= 10)) return 'IN';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('India')) return 'IN';
    if (tz.includes('London') || tz.includes('Europe/London')) return 'GB';
    if (tz.includes('Dubai')) return 'AE';
    if (tz.includes('Toronto') || tz.includes('Vancouver')) return 'CA';
    if (tz.includes('Sydney') || tz.includes('Melbourne')) return 'AU';
    if (tz.includes('Singapore')) return 'SG';
  } catch (e) {
    // default
  }
  return 'US'; // default US & International (USD)
}

/**
 * Returns 'INR' if user is Indian (profile, phone or timezone), else 'USD'.
 */
export function getUserCurrency(user = null) {
  const country = detectUserCountry(user);
  return country === 'IN' ? 'INR' : 'USD';
}

/**
 * Boolean helper to check if user is in India.
 */
export function isIndianUser(user = null) {
  return detectUserCountry(user) === 'IN';
}
