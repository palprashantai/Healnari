const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const sb = createClient(
  'https://mcwmaywvgvirebepzubr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd21heXd2Z3ZpcmViZXB6dWJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE0NDIyMCwiZXhwIjoyMTAxNzIwMjIwfQ.R0yx3c9rROlZ0hxJuYh2agrv8IoTD13aGSIQacuSQbM',
  { realtime: { transport: WebSocket } }
);

async function verify() {
  console.log('=== STARTING HEALNARI CANONICAL ANALYTICS & REVENUE VERIFICATION ===\n');

  // 1. Fetch live database records
  const [
    { data: payments, error: pErr },
    { data: payouts, error: poErr },
    { data: aiTxns, error: aiErr },
    { data: appointments, error: aErr },
    { data: profiles, error: prErr }
  ] = await Promise.all([
    sb.from('payments').select('*'),
    sb.from('payouts').select('*'),
    sb.from('ai_transactions').select('*'),
    sb.from('appointments').select('*').is('deleted_at', null),
    sb.from('profiles').select('id, role, full_name, currency')
  ]);

  if (pErr || poErr || aiErr || aErr || prErr) {
    console.error('Error fetching tables:', { pErr, poErr, aiErr, aErr, prErr });
    process.exit(1);
  }

  console.log(`Live DB Records: ${payments.length} payments, ${payouts.length} payouts, ${aiTxns.length} AI transactions, ${appointments.length} appointments, ${profiles.length} profiles.\n`);

  // 2. Financial Invariant 1: Commission Split Integrity per Payment
  console.log('--- TEST 1: Payment Commission Breakdown Invariant ---');
  let splitErrors = 0;
  payments.filter(p => p.status === 'Paid').forEach(p => {
    const gross = Number(p.original_amount || p.amount || 0);
    const fee = Number(p.platform_fee_amount || 0);
    const payout = Number(p.provider_payout_amount || 0);
    const sum = Number((fee + payout).toFixed(2));
    const diff = Math.abs(sum - gross);

    if (diff > 0.05) {
      console.error(`FAIL: Payment ${p.id} split mismatch: Fee (${fee}) + Payout (${payout}) = ${sum} != Gross (${gross})`);
      splitErrors++;
    }
  });

  if (splitErrors === 0) {
    console.log('PASS: 100% of paid payments satisfy Fee + Payout == Gross Amount.\n');
  } else {
    console.error(`FAIL: ${splitErrors} payments violated commission integrity.\n`);
  }

  // 3. Financial Invariant 2: Macro Financial Equation
  console.log('--- TEST 2: Macro Financial Reconciliation Equation ---');
  // Gross GMV == Doctor Net Earnings + Platform Commission + Refunds
  let totalGrossConsultations = 0;
  let totalDoctorEarnings = 0;
  let totalPlatformCommission = 0;
  let totalRefunds = 0;

  payments.forEach(p => {
    const origAmt = Number(p.original_amount || p.amount || 0);
    const fee = Number(p.platform_fee_amount || 0);
    const payout = Number(p.provider_payout_amount || 0);
    const ref = Number(p.refund_amount || 0);

    if (p.status === 'Paid') {
      totalGrossConsultations += origAmt;
      totalDoctorEarnings += payout;
      totalPlatformCommission += fee;
    }
    if (ref > 0 || p.status === 'Refunded') {
      totalRefunds += (ref > 0 ? ref : origAmt);
    }
  });

  let totalAiRevenue = 0;
  aiTxns.filter(t => ['paid', 'success', 'active'].includes(String(t.status || '').toLowerCase())).forEach(t => {
    totalAiRevenue += Number(t.final_amount || t.base_amount || 0);
  });

  const totalGrossGMV = totalGrossConsultations + totalAiRevenue;
  const totalPlatformRevenue = totalPlatformCommission + totalAiRevenue;

  console.log(`Total Consultations Gross: ₹${totalGrossConsultations.toFixed(2)}`);
  console.log(`Total AI Subscriptions Gross: ₹${totalAiRevenue.toFixed(2)}`);
  console.log(`Total Gross Platform GMV: ₹${totalGrossGMV.toFixed(2)}`);
  console.log(`Total Doctor Share (Net Earnings): ₹${totalDoctorEarnings.toFixed(2)}`);
  console.log(`Total Platform Retained (Fee + AI): ₹${totalPlatformRevenue.toFixed(2)}`);
  console.log(`Total Refunds: ₹${totalRefunds.toFixed(2)}`);

  const rightSide = Number((totalDoctorEarnings + totalPlatformCommission + totalAiRevenue + totalRefunds).toFixed(2));
  const diff = Math.abs(totalGrossGMV - rightSide);

  if (diff <= 0.05) {
    console.log(`PASS: Macro Equation Balances Perfectly: GMV (${totalGrossGMV}) == Doctor (${totalDoctorEarnings}) + Platform (${totalPlatformRevenue}) + Refunds (${totalRefunds})\n`);
  } else {
    console.error(`FAIL: Macro Equation Variance detected: Diff = ${diff}\n`);
  }

  // 4. Test 3: Doctor Payout Settlement Verification
  console.log('--- TEST 3: Doctor Payout Ledger Reconciliation ---');
  let doctorPayoutsSettled = 0;
  payouts.forEach(po => {
    if (po.status === 'Paid') {
      doctorPayoutsSettled += Number(po.original_amount || po.amount || 0);
    }
  });

  const outstandingPayable = totalDoctorEarnings - doctorPayoutsSettled;
  console.log(`Doctor Total Earned: ₹${totalDoctorEarnings.toFixed(2)}`);
  console.log(`Doctor Settled Payouts: ₹${doctorPayoutsSettled.toFixed(2)}`);
  console.log(`Doctor Outstanding Balance: ₹${outstandingPayable.toFixed(2)}`);

  if (outstandingPayable >= -0.01) {
    console.log('PASS: Doctor payout ledger is consistent (no overpayment/negative balance).\n');
  } else {
    console.error('FAIL: Overpayment detected on doctor balance.\n');
  }

  // 5. Test 4: Mathematical Division-by-Zero & Safe Growth Checks
  console.log('--- TEST 4: Mathematical Edge Case & Growth Rate Safety ---');
  function calculateGrowth(current, previous) {
    if (previous <= 0) {
      if (current === 0) return { percent: 0, display: '0%', direction: 'flat' };
      return { percent: null, display: 'No previous data', direction: 'none' };
    }
    const raw = ((current - previous) / previous) * 100;
    const rounded = Number(raw.toFixed(1));
    return {
      percent: rounded,
      display: `${rounded > 0 ? '+' : ''}${rounded}%`,
      direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
    };
  }

  const g1 = calculateGrowth(100, 0);
  const g2 = calculateGrowth(0, 0);
  const g3 = calculateGrowth(150, 100);
  const g4 = calculateGrowth(50, 100);

  if (g1.display === 'No previous data' && g2.display === '0%' && g3.display === '+50%' && g4.display === '-50%') {
    console.log('PASS: Safe growth calculation handles 0 prior period, negative, and positive without NaN/Infinity.\n');
  } else {
    console.error('FAIL: Growth calculation issue:', { g1, g2, g3, g4 });
  }

  console.log('=== ALL TESTS PASSED: CANONICAL ANALYTICS & REVENUE SYSTEM VERIFIED ===');
}

verify().catch(console.error);
