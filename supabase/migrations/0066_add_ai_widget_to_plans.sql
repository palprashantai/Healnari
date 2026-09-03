-- =====================================================================
-- MIGRATION: 0066_add_ai_widget_to_plans.sql
-- Description: Add explicit AI Widget configuration to plans and feature flags
-- =====================================================================

-- 1. Add dedicated columns to ai_plans for explicit widget management
ALTER TABLE IF EXISTS ai_plans 
  ADD COLUMN IF NOT EXISTS has_ai_widget BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_widget_monthly_limit INTEGER DEFAULT 25;

-- 2. Update the 6 canonical plans with explicit widget settings
UPDATE ai_plans 
SET 
  has_ai_widget = true,
  ai_widget_monthly_limit = CASE id
    WHEN 'doctor_plan_1'  THEN 25
    WHEN 'doctor_plan_2'  THEN 100
    WHEN 'doctor_plan_3'  THEN 300
    WHEN 'patient_plan_1' THEN 15
    WHEN 'patient_plan_2' THEN 60
    WHEN 'patient_plan_3' THEN 150
    ELSE 10
  END,
  updated_at = NOW()
WHERE id IN ('doctor_plan_1', 'doctor_plan_2', 'doctor_plan_3', 'patient_plan_1', 'patient_plan_2', 'patient_plan_3');

-- 3. Register DOCTOR_CHAT / AI Widget in ai_feature_flags if not already present
INSERT INTO ai_feature_flags (
  feature_key,
  name,
  description,
  is_enabled,
  applicable_roles,
  credit_cost,
  unit,
  usage_type,
  is_system,
  status
)
VALUES (
  'DOCTOR_CHAT',
  'Clinical AI Chat Widget',
  'Interactive clinical guidance, guideline lookup, and case inquiry assistant',
  true,
  ARRAY['doctor'],
  1,
  'uses',
  'uses',
  true,
  'active'
)
ON CONFLICT (feature_key) DO UPDATE SET
  applicable_roles = ARRAY['doctor'],
  credit_cost = 1,
  unit = 'uses',
  usage_type = 'uses',
  is_enabled = true,
  status = 'active',
  updated_at = NOW();

-- 4. Ensure all 3 doctor plans include DOCTOR_CHAT in features and feature_limits
UPDATE ai_plans
SET 
  features = ARRAY(
    SELECT DISTINCT unnest(array_append(features, 'DOCTOR_CHAT'))
  ),
  feature_limits = jsonb_set(
    COALESCE(feature_limits, '{}'::jsonb),
    '{DOCTOR_CHAT}',
    jsonb_build_object(
      'unit', 'uses',
      'limit', CASE id
        WHEN 'doctor_plan_1' THEN 25
        WHEN 'doctor_plan_2' THEN 100
        WHEN 'doctor_plan_3' THEN 300
        ELSE 25
      END,
      'is_unlimited', false
    )
  ),
  updated_at = NOW()
WHERE id IN ('doctor_plan_1', 'doctor_plan_2', 'doctor_plan_3');

-- 5. Ensure all 3 patient plans include PATIENT_CHAT in features and feature_limits
UPDATE ai_plans
SET 
  features = ARRAY(
    SELECT DISTINCT unnest(array_append(features, 'PATIENT_CHAT'))
  ),
  feature_limits = jsonb_set(
    COALESCE(feature_limits, '{}'::jsonb),
    '{PATIENT_CHAT}',
    jsonb_build_object(
      'unit', 'uses',
      'limit', CASE id
        WHEN 'patient_plan_1' THEN 15
        WHEN 'patient_plan_2' THEN 60
        WHEN 'patient_plan_3' THEN 150
        ELSE 15
      END,
      'is_unlimited', false
    )
  ),
  updated_at = NOW()
WHERE id IN ('patient_plan_1', 'patient_plan_2', 'patient_plan_3');
