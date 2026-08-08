-- Optional demo data — fills in clinical detail for real accounts you've
-- already created through the app's own sign-up flow.
--
-- Why not seed auth.users directly? Faking a password hash + identity row
-- for auth.users is fragile and drifts across Supabase/GoTrue versions.
-- Signing up for real through the app is one extra minute and guaranteed
-- to work.
--
-- Steps:
--   1. Run the app, sign up ONE doctor account and a few patient accounts
--      through the real signup form (Doctor: e.g. sarah.mitchell@example.com;
--      Patients: priya@example.com, anita@example.com, kavita@example.com …).
--      handle_new_user() (see migration 0001) already created their
--      profiles + patient_records rows with a real MRN.
--   2. Replace the placeholder emails below with the ones you used.
--   3. Run this file in the Supabase SQL editor.

do $$
declare
  v_doctor_id uuid;
  v_priya_id uuid;
  v_anita_id uuid;
  v_kavita_id uuid;
begin
  select id into v_doctor_id from auth.users where email = 'sarah.mitchell@example.com';
  select id into v_priya_id  from auth.users where email = 'priya@example.com';
  select id into v_anita_id  from auth.users where email = 'anita@example.com';
  select id into v_kavita_id from auth.users where email = 'kavita@example.com';

  if v_doctor_id is null or v_priya_id is null then
    raise notice 'Skipping seed: create the doctor + patient accounts described above first, then re-run this file.';
    return;
  end if;

  -- Doctor profile detail
  update public.profiles
  set specialty = 'Gynaecologist', registration_no = 'KMC-84920', kyc_verified = true
  where id = v_doctor_id;

  -- Priya Sharma — richer clinical identity
  update public.patient_records
  set dob = '1996-05-14', blood_group = 'B+',
      allergies = array['Penicillin', 'Sulfa Drugs'],
      chronic_conditions = array['Polycystic Ovary Syndrome (PCOS)', 'Subclinical Hypothyroidism'],
      primary_doctor_id = v_doctor_id
  where patient_id = v_priya_id;

  -- Today's queue: one in progress, one waiting, one upcoming
  insert into public.appointments (patient_id, doctor_id, specialty, type, scheduled_date, scheduled_time, reason, status)
  values
    (v_priya_id, v_doctor_id, 'Gynaecology', 'clinic', current_date, '09:30 AM', 'PCOS Follow-up', 'In Progress');

  if v_anita_id is not null then
    insert into public.appointments (patient_id, doctor_id, specialty, type, scheduled_date, scheduled_time, reason, status)
    values (v_anita_id, v_doctor_id, 'Gynaecology', 'video', current_date, '10:00 AM', 'Fertility Consult', 'Waiting');
  end if;

  if v_kavita_id is not null then
    insert into public.appointments (patient_id, doctor_id, specialty, type, scheduled_date, scheduled_time, reason, status)
    values (v_kavita_id, v_doctor_id, 'Gynaecology', 'clinic', current_date + 2, '10:30 AM', 'Irregular Cycles', 'Upcoming');

    -- The refill Kavita is actually on, correctly flagged this time.
    insert into public.prescriptions (patient_id, doctor_id, med_name, dosage, schedule, duration, refills_left, status, instructions, valid_till, refill_requested)
    values (v_kavita_id, v_doctor_id, 'Norethisterone', '5mg', '1-0-0', '10 Days', 1, 'Active', 'Take for 10 days. Bleed expected 2-4 days after stopping.', current_date + 10, true);
  end if;

  -- Priya's active prescriptions
  insert into public.prescriptions (patient_id, doctor_id, med_name, dosage, schedule, duration, refills_left, status, instructions, valid_till)
  values
    (v_priya_id, v_doctor_id, 'Metformin', '500mg', '1-0-1', '30 Days', 2, 'Active', 'Take after meals to reduce GI disturbance.', current_date + 20),
    (v_priya_id, v_doctor_id, 'Myo-Inositol Sachet', '2g', '1-0-0', '30 Days', 2, 'Active', 'Dissolve in 200ml water on empty stomach.', current_date + 20);

  -- A cycle log so the doctor-visible read path has something to show
  insert into public.cycle_logs (patient_id, log_date, phase, flow, cramps, mood, symptoms)
  values (v_priya_id, current_date, 'ovulation', 'light', 2, 'good', array['Bloating'])
  on conflict (patient_id, log_date) do nothing;

  raise notice 'Seed complete.';
end $$;
