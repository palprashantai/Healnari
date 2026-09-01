import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mcwmaywvgvirebepzubr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd21heXd2Z3ZpcmViZXB6dWJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE0NDIyMCwiZXhwIjoyMTAxNzIwMjIwfQ.R0yx3c9rROlZ0hxJuYh2agrv8IoTD13aGSIQacuSQbM'
);
async function run() {
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').eq('role', 'doctor').ilike('full_name', '%Demo%');
  const doctorId = profiles[0].id;
  
  const { data: payments } = await supabase.from('payments').select('id, amount, provider_payout_amount, status, created_at').eq('doctor_id', doctorId);
  console.log('Payments:', payments);

  const { data: payouts } = await supabase.from('payouts').select('id, amount, status').eq('doctor_id', doctorId);
  console.log('Payouts:', payouts);
}
run();
