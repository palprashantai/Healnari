export interface CountryConfig {
  code: string; // 'IN', 'US', 'AE', 'GB', 'DE', 'CA', 'AU'
  name: string;
  region: string;
  default_currency: string;
  supported_currencies: string[];
  timezone: string;
  locale: string;
  phone_prefix: string;
  tax_rate: number;
  tax_name: string;
  tax_type: 'inclusive' | 'exclusive';
  payment_gateway: 'cashfree' | 'stripe' | 'razorpay' | 'manual';
  is_active: boolean;
  is_ai_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CurrencyConfig {
  code: string; // 'USD', 'INR', 'AED', 'EUR', 'GBP', 'CAD', 'AUD'
  symbol: string;
  name: string;
  minor_decimals: number;
  is_active: boolean;
  is_reporting_currency: boolean;
  usd_base_rate: number; // 1 USD = X Currency
  created_at?: string;
  updated_at?: string;
}

export interface AiProduct {
  id: string; // 'prod_patient_ai', 'prod_doctor_ai'
  name: string;
  description: string;
  target_role: 'patient' | 'doctor' | 'all';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AiPlanFeatureLimit {
  limit: number | null;
  is_unlimited: boolean;
  unit?: string;
}

export interface AiPlan {
  id: string; // 'patient_free', 'patient_premium', 'doctor_free', 'doctor_pro'
  product_id: string;
  name: string;
  description: string;
  billing_cycle: 'monthly' | 'yearly' | 'pay_per_use' | 'credit_pack' | 'lifetime';
  plan_type: 'subscription' | 'credit_pack' | 'pay_per_use' | 'add_on';
  included_monthly_credits: number;
  bonus_credits: number;
  rollover_unused_credits: boolean;
  max_credit_cap?: number;
  is_active: boolean;
  is_public: boolean;
  plan_version: number;
  features: string[];
  feature_limits?: Record<string, AiPlanFeatureLimit>;
  price_inr?: number;
  price_usd?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AiRegionalPrice {
  id?: string;
  plan_id: string;
  country_code: string;
  currency: string;
  base_amount: number;
  price_version: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AiResolvedPriceQuote {
  planId: string;
  planName: string;
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  baseAmount: number;
  taxRate: number;
  taxName: string;
  taxType: 'inclusive' | 'exclusive';
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  priceVersion: number;
  billingCycle: string;
  billing_cycle?: string;
  includedCredits: number;
  included_monthly_credits?: number;
  bonus_credits?: number;
  rollover_unused_credits?: boolean;
  product_id?: string;
  is_public?: boolean;
  features: string[];
  feature_limits?: Record<string, AiPlanFeatureLimit>;
  is_active?: boolean;
  description?: string;
  price_inr?: number;
  price_usd?: number;
  gateway: 'cashfree' | 'stripe' | 'razorpay' | 'manual';
}

export interface AiCreditLedgerEntry {
  id?: string;
  user_id: string;
  entry_type: 'GRANT' | 'CONSUME' | 'REFUND' | 'BONUS' | 'ADJUSTMENT' | 'EXPIRATION';
  amount: number; // positive = add, negative = deduct
  balance_after: number;
  feature?: string;
  reference_id?: string;
  reason: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface AiModelCostConfig {
  id?: string;
  provider: string;
  model: string;
  input_cost_per_million: number;
  output_cost_per_million: number;
  version: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
}

export interface AiCoupon {
  id?: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  allowed_country?: string | null;
  allowed_currency?: string | null;
  allowed_plan_ids?: string[];
  max_uses: number;
  current_uses: number;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
}

export interface AiTransactionRecord {
  id?: string;
  user_id: string;
  plan_id: string;
  country_code: string;
  original_currency: string;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  reporting_currency: string;
  reporting_amount: number;
  fx_rate_applied: number;
  gateway: string;
  gateway_txn_id?: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  refund_amount?: number;
  coupon_code?: string;
  created_at?: string;
}

export interface AiAdminAuditLogEntry {
  id?: string;
  admin_id?: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  reason?: string;
  created_at?: string;
}

export interface PricingSimulationInput {
  planId?: string;
  countryCode: string;
  currency: string;
  basePrice: number;
  monthlyCredits: number;
  expectedAvgQueriesPerUser: number;
  model?: string; // 'gemini-1.5-flash', 'gpt-4o-mini', etc.
  taxRatePercent?: number;
  gatewayFeePercent?: number; // e.g. 2.0%
  expectedUsers?: number;
}

export interface PricingSimulationResult {
  countryCode: string;
  currency: string;
  basePrice: number;
  grossRevenuePerUser: number;
  taxAmountPerUser: number;
  netRevenuePerUser: number;
  estimatedAiCostPerUserUsd: number;
  estimatedAiCostPerUserLocal: number;
  gatewayFeePerUserLocal: number;
  grossContributionPerUserLocal: number;
  grossMarginPercent: number;
  isProfitable: boolean;
  totalMonthlyRevenueLocal?: number;
  totalMonthlyProfitLocal?: number;
  reportingCurrency: string;
  grossContributionPerUserReporting: number;
}
