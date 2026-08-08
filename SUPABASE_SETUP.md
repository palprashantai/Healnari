# Supabase backend — setup

The schema, RLS policies, and frontend client are written. You need to do the
account/project part yourself — I can't create a Supabase account or project
on your behalf.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and create a free project (any
   region close to you). Note the **database password** you set — you won't
   need it for the app itself, only if you ever connect via `psql`.
2. Once it's provisioned, go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public** key (not the `service_role` key — that one never
     belongs in frontend code)

## 2. Wire up the frontend

```bash
cp .env.example .env
```

Paste the URL and anon key into `.env`. It's already gitignored.

## 3. Run the migration

Easiest path — **SQL editor**:

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the contents of `supabase/migrations/0001_init.sql`, run it.

Or, if you have the Supabase CLI installed and prefer that:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

This creates: `profiles`, `patient_records`, `appointments`, `prescriptions`,
`lab_reports`, `payments`, `clinical_notes`, `cycle_logs` — all with Row
Level Security enabled, plus a trigger that auto-creates a `profiles` (and,
for patients, a `patient_records`) row the moment someone signs up.

## 4. Enable email auth

**Authentication → Providers → Email** should already be on by default for a
new project. For local testing, you'll likely also want **Authentication →
Settings → Email → "Confirm email"** turned **off**, otherwise every signup
needs a real inbox to click a confirmation link before it can log in.

## 5. (Optional) seed some demo data

1. Sign up a doctor account and a couple of patient accounts through the
   app's own signup form once it's wired to Supabase (next step, not done
   yet — see below).
2. Edit the placeholder emails at the top of `supabase/seed.sql` to match
   what you actually used.
3. Run `supabase/seed.sql` in the SQL editor.

## Where things stand right now

The schema and client are ready, but **the React app doesn't call Supabase
yet** — `AuthContext.jsx` still runs in "demo mode, always allow" and the
doctor/patient data layer is still an in-memory `ClinicDataContext`. That's
the next step: swapping `AuthContext` to use `supabase.auth`
(`signUp`/`signInWithPassword`/`signOut` + a session listener) and swapping
`ClinicDataContext`'s internals from local `useState` to Supabase
queries/mutations against the tables above, keeping the same action names
(`addAppointment`, `approveRefill`, etc.) so the page components barely
change. I'll do that once it's ready to avoid touching the same files two
things are mid-edit on at once.

## A few schema decisions worth knowing about

- **Single-clinic assumption.** Any doctor can currently see/write any
  patient's `prescriptions`, `lab_reports`, `payments`, and `patient_records`
  (not just their own). Fine for one clinic; if you ever support multiple
  independent clinics, tighten those policies to check a real doctor↔patient
  relationship (e.g. "only if they share an appointment").
- **Patients can't edit their own prescriptions directly** — only a
  `request_refill(prescription_id)` RPC that flips one flag on a row they
  own. Doctors do the rest through normal table access.
- **`clinical_notes` is doctor-only** — patients can't read their own chart
  notes in this schema. Easy to open up later with one more SELECT policy if
  you want that.
- MRNs are generated server-side (`HN-XXXXXX`) the moment a patient account
  is created, so there's exactly one MRN per patient, everywhere.
