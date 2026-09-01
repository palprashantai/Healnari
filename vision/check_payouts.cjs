const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const supabase = createClient(
  'https://mcwmaywvgvirebepzubr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd21heXd2Z3ZpcmViZXB6dWJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE0NDIyMCwiZXhwIjoyMTAxNzIwMjIwfQ.R0yx3c9rROlZ0hxJuYh2agrv8IoTD13aGSIQacuSQbM',
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

async function run() {
  const doctorId = 'df8144c7-0b13-4d11-8649-8cf85734667f';
  const { data, error } = await supabase.from('payouts').select('*').eq('doctor_id', doctorId);
  console.log('Payouts for doctor:', data);
  if (error) console.error('Error:', error);
}

run();
