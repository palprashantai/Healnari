-- ─────────────────────────────────────────────────────────────
-- 0034_life_stages_and_biomarkers.sql
-- Adds multi-modal fertility biomarkers (BBT, LH ratio, Cervical Mucus),
-- life-stage personalization (Cycle, PCOS, TTC, Pregnancy, Menopause),
-- customizable luteal phase, and extends vitals keys in vitals_logs.
-- ─────────────────────────────────────────────────────────────

-- 1. Extend vitals_logs check constraint to allow multi-modal biomarkers
alter table public.vitals_logs drop constraint if exists vitals_logs_vital_key_check;
alter table public.vitals_logs add constraint vitals_logs_vital_key_check 
  check (vital_key in (
    'weight', 'bp', 'sugar', 'sleep', 'hirsutism', 
    'bbt', 'lh', 'hotflashes', 'mfg_score', 
    'systolic', 'diastolic', 'fasting_glucose', 'postprandial_glucose'
  ));

-- 2. Extend cycle_logs with multi-modal biomarker fields
alter table public.cycle_logs 
  add column if not exists bbt numeric(5,2) null,
  add column if not exists lh_ratio numeric(4,2) null,
  add column if not exists cervical_mucus text null check (cervical_mucus in ('Dry', 'Sticky', 'Creamy', 'Egg-White', null)),
  add column if not exists ovulation_test text null check (ovulation_test in ('Low', 'High', 'Peak', null)),
  add column if not exists intercourse boolean null default false;

-- 3. Extend patient_records with life stage modes, regional currency & luteal calibration
alter table public.patient_records
  add column if not exists life_stage_mode text not null default 'cycle' check (life_stage_mode in ('cycle', 'pcos', 'ttc', 'pregnancy', 'menopause')),
  add column if not exists currency_preference text not null default 'INR',
  add column if not exists luteal_phase_days int not null default 14 check (luteal_phase_days between 10 and 16),
  add column if not exists gestational_due_date date null,
  add column if not exists last_mfg_score int null check (last_mfg_score between 0 and 36);

-- 4. Indices for efficient biomarker analysis and timeline queries
create index if not exists cycle_logs_patient_biomarker_idx 
  on public.cycle_logs (patient_id, log_date desc) 
  where bbt is not null or lh_ratio is not null or cervical_mucus is not null;
