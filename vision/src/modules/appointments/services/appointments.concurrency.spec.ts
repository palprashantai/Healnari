/**
 * AUDIT_REPORT.md OPS-1 — the real double-booking guarantee: fire many
 * concurrent booking attempts at the exact same doctor/date/time slot and
 * assert exactly one succeeds. Mocks cannot prove this (see the note in
 * appointments.service.spec.ts) — only a real database enforcing
 * appointments_no_double_booking (migration 0020) can. This talks to a real
 * Supabase project via its REST API, the same way this session's manual
 * verification did, so it only runs when explicitly opted into:
 *
 *   RUN_LIVE_DB_TESTS=1 npx jest appointments.concurrency
 *
 * It is skipped by default so plain `npm test` never touches a live
 * database or requires secrets. Uses whatever SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY are already in the environment — point those at
 * a disposable/staging project, not production, before opting in. The test
 * cleans up every row it creates, win or lose.
 *
 * Until migration 0020 is applied to the target database, this test is
 * EXPECTED to fail (more than one booking will succeed) — that failure is
 * the regression signal DB-4 describes, not a bug in the test.
 */
const RUN = process.env.RUN_LIVE_DB_TESTS === '1';
const describeIfLive = RUN ? describe : describe.skip;

describeIfLive('Appointment double-booking — live concurrency guard', () => {
  const SUPABASE_URL = process.env.SUPABASE_URL as string;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const CONCURRENT_ATTEMPTS = 25; // enough to reliably surface a race without hammering the project
  const createdIds: string[] = [];

  async function rest(path: string, init?: RequestInit) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      ...init,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init?.headers || {}),
      },
    });
    return res.json();
  }

  afterEach(async () => {
    for (const id of createdIds.splice(0)) {
      await rest(`/appointments?id=eq.${id}`, { method: 'DELETE' }).catch(() => {});
    }
  });

  it('lets exactly one of many simultaneous bookings for the same slot succeed', async () => {
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY must be set to run this test.');

    const [patient] = await rest(`/profiles?role=eq.patient&select=id&limit=1`);
    const [doctor] = await rest(`/profiles?role=eq.doctor&select=id&limit=1`);
    if (!patient || !doctor) throw new Error('Need at least one patient and one doctor profile in the target database.');

    const slot = { scheduled_date: '2099-06-15', scheduled_time: '11:15 AM' };

    const attempts = Array.from({ length: CONCURRENT_ATTEMPTS }, () =>
      rest('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patient.id,
          doctor_id: doctor.id,
          type: 'video',
          status: 'Upcoming',
          ...slot,
        }),
      }),
    );

    const results = await Promise.all(attempts);
    const succeeded = results.filter((r) => Array.isArray(r) && r[0]?.id);
    succeeded.forEach((r) => createdIds.push(r[0].id));

    expect(succeeded.length).toBe(1);
  }, 30000);
});
