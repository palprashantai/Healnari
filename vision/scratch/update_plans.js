const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
};

const supabase = createClient(supabaseUrl, supabaseKey, clientOptions);

async function run() {
  console.log('--- Updating AI Plans in Supabase ---');

  // 1. Update doctor_plan_2 (Doctor Pro)
  const { data: p2, error: err2 } = await supabase
    .from('ai_plans')
    .update({
      included_monthly_credits: 150,
      feature_limits: {
        DOCTOR_RX_AUTOCOMPLETE: { limit: 150, is_unlimited: false, unit: 'uses' },
        DOCTOR_DRUG_SAFETY: { limit: 150, is_unlimited: false, unit: 'uses' },
        DOCTOR_PATIENT_BRIEF: { limit: 150, is_unlimited: false, unit: 'uses' },
        DOCTOR_CONSULT_SUMMARY: { limit: 150, is_unlimited: false, unit: 'uses' },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'doctor_plan_2')
    .select();

  if (err2) {
    console.error('Error updating doctor_plan_2:', err2.message);
  } else {
    console.log('Successfully updated doctor_plan_2 to 150 credits:', p2?.length ? p2[0].name : 'Done');
  }

  // 2. Update doctor_plan_3 (Doctor Premium)
  const { data: p3, error: err3 } = await supabase
    .from('ai_plans')
    .update({
      included_monthly_credits: 500,
      feature_limits: {
        DOCTOR_RX_AUTOCOMPLETE: { limit: 500, is_unlimited: false, unit: 'uses' },
        DOCTOR_DRUG_SAFETY: { limit: 500, is_unlimited: false, unit: 'uses' },
        DOCTOR_PATIENT_BRIEF: { limit: 500, is_unlimited: false, unit: 'uses' },
        DOCTOR_CONSULT_SUMMARY: { limit: 500, is_unlimited: false, unit: 'uses' },
        DOCTOR_SOAP_NOTES: { limit: 500, is_unlimited: false, unit: 'uses' },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'doctor_plan_3')
    .select();

  if (err3) {
    console.error('Error updating doctor_plan_3:', err3.message);
  } else {
    console.log('Successfully updated doctor_plan_3 to 500 credits:', p3?.length ? p3[0].name : 'Done');
  }

  // 3. Update existing active subscriptions if any
  const { data: subs2, error: sErr2 } = await supabase
    .from('ai_subscriptions')
    .update({
      monthly_ai_credits: 150,
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', 'doctor_plan_2')
    .eq('status', 'active')
    .select('id, user_id, plan_id, monthly_ai_credits');

  console.log('Updated active doctor_plan_2 subscriptions:', subs2?.length || 0);

  const { data: subs3, error: sErr3 } = await supabase
    .from('ai_subscriptions')
    .update({
      monthly_ai_credits: 500,
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', 'doctor_plan_3')
    .eq('status', 'active')
    .select('id, user_id, plan_id, monthly_ai_credits');

  console.log('Updated active doctor_plan_3 subscriptions:', subs3?.length || 0);

  // 4. Fetch all 6 plans to display current state
  const { data: allPlans, error: allErr } = await supabase
    .from('ai_plans')
    .select('id, name, included_monthly_credits, is_active')
    .order('id');

  if (allErr) {
    console.error('Error fetching all plans:', allErr.message);
  } else {
    console.log('\n--- Current Active AI Plans in Database ---');
    console.table(allPlans);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
