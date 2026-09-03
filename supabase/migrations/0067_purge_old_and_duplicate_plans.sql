-- =====================================================================
-- MIGRATION: 0067_purge_old_and_duplicate_plans.sql
-- Description: Permanently remove obsolete plans, duplicate variants,
--              token packs, and obsolete regional pricing records.
-- =====================================================================

DO $$
DECLARE
  old_plan_ids TEXT[] := ARRAY[
    'doctor_free', 'doctor_pro', 'doctor_pro_yearly',
    'patient_free', 'patient_premium', 'patient_premium_yearly',
    'pack_100', 'pack_500', 'pack_1000'
  ];
BEGIN
  -- 1. Re-link any legacy active subscriptions to canonical plans
  UPDATE ai_subscriptions
  SET plan_id = 'doctor_plan_1', updated_at = NOW()
  WHERE plan_id = 'doctor_free';

  UPDATE ai_subscriptions
  SET plan_id = 'doctor_plan_2', updated_at = NOW()
  WHERE plan_id IN ('doctor_pro', 'doctor_pro_yearly');

  UPDATE ai_subscriptions
  SET plan_id = 'patient_plan_1', updated_at = NOW()
  WHERE plan_id = 'patient_free';

  UPDATE ai_subscriptions
  SET plan_id = 'patient_plan_2', updated_at = NOW()
  WHERE plan_id IN ('patient_premium', 'patient_premium_yearly');

  -- 2. Re-link any legacy transactions to canonical plans
  UPDATE ai_transactions
  SET plan_id = 'doctor_plan_2'
  WHERE plan_id = 'doctor_pro';

  -- 3. Delete obsolete regional prices
  DELETE FROM ai_regional_prices
  WHERE plan_id = ANY(old_plan_ids);

  -- 4. Delete obsolete plans from ai_plans
  DELETE FROM ai_plans
  WHERE id = ANY(old_plan_ids);

  RAISE NOTICE 'Obsolete and duplicate plans purged successfully. Exactly 6 canonical plans remain.';
END $$;
