-- Migration 0044: Clinical Protocol Bundles Table
-- Stores multi-drug evidence-based protocol presets for the doctor prescription panel.
-- Each row = one complete protocol bundle (many medicines, labs, diagnosis, clinical notes).

create table if not exists public.clinical_protocols (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references public.profiles(id) on delete cascade,
  name          text not null,
  short_name    text,
  category      text not null default 'General',
  badge         text,
  description   text,
  diagnosis     text,
  meds          jsonb not null default '[]',
  labs          jsonb not null default '[]',
  clinical_notes text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists clinical_protocols_doctor_idx on public.clinical_protocols (doctor_id) where deleted_at is null;
create index if not exists clinical_protocols_category_idx on public.clinical_protocols (category) where deleted_at is null;
create index if not exists clinical_protocols_active_idx on public.clinical_protocols (is_active) where deleted_at is null;

alter table public.clinical_protocols enable row level security;

create policy "Users can view global or own protocols"
  on public.clinical_protocols for select
  using (
    deleted_at is null and is_active = true and (
      doctor_id is null or
      doctor_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Doctors and Admins can create protocols"
  on public.clinical_protocols for insert
  with check (
    (doctor_id = auth.uid()) or
    (doctor_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

create policy "Doctors and Admins can update own protocols"
  on public.clinical_protocols for update
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Doctors and Admins can delete own protocols"
  on public.clinical_protocols for delete
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- SEED: 5 Evidence-Based Women's Health Protocol Bundles
insert into public.clinical_protocols (doctor_id, name, short_name, category, badge, description, diagnosis, meds, labs, clinical_notes) values
  (null, '🌸 PCOS Insulin-Sensitizing & Metabolic Protocol', 'PCOS First-Line', 'PCOS', '1st-Line Metabolic',
   'Evidence-based combination of Metformin ER, Myo-Inositol (40:1), and Vitamin D3 repletion for PCOS with insulin resistance.',
   'Polycystic Ovary Syndrome (PCOS) — Insulin Resistant Phenotype',
   '[{"name":"Metformin ER 500mg","schedule":"1-0-1","duration":"30 Days","timing":"After Food","instructions":"Take strictly after meals to minimize GI disturbance."},{"name":"Myo-Inositol & D-Chiro Inositol (40:1) 2g Sachet","schedule":"1-0-0","duration":"30 Days","timing":"Before Food","instructions":"Dissolve in 200ml lukewarm water on empty stomach."},{"name":"Vitamin D3 60,000 IU Capsule","schedule":"1-0-0","duration":"8 Weeks","timing":"After Food","instructions":"Take 1 capsule once weekly on Sundays after breakfast."}]',
   '["LH & FSH Ratio (PCOS Marker)","Serum AMH (Anti-Müllerian Hormone / Ovarian Reserve)","Fasting Blood Glucose (FBG)","Fasting Insulin & HOMA-IR (Insulin Resistance Index)","Total Serum Testosterone"]',
   'Patient evaluated for PCOS phenotype. Advised low glycemic diet, daily 30-minute brisk walk. Review with hormone and fasting insulin reports in 6 weeks.'),

  (null, '🌺 Fertility & Ovulation Induction Protocol', 'Fertility Boost', 'Fertility', 'Ovulation Induction',
   'Letrozole-based ovulation induction with trigger support and luteal phase supplementation for anovulatory infertility.',
   'Anovulatory Infertility — Oligo/Amenorrhea with PCOS',
   '[{"name":"Letrozole 2.5mg","schedule":"0-0-1","duration":"5 Days","timing":"Night (Day 2 to Day 6)","instructions":"Start Day 2 of menses. Monitor follicle growth with TVS on Day 10-12."},{"name":"Micronized Natural Progesterone (Oral/Vaginal) 200mg","schedule":"0-0-1","duration":"15 Days","timing":"Bedtime","instructions":"Start Day 15 after ovulation confirmation for luteal support."},{"name":"Folic Acid 5mg","schedule":"1-0-0","duration":"90 Days","timing":"After Breakfast","instructions":"Essential pre-conception supplement."}]',
   '["Serum AMH (Anti-Müllerian Hormone / Ovarian Reserve)","LH (Luteinizing Hormone)","FSH (Follicle Stimulating Hormone)","Serum Progesterone (Day 21 / Mid-Luteal Phase)","Pelvic Ultrasound (TVS) — Antral Follicle Count"]',
   'Ovulation induction cycle initiated. Serial TVS monitoring required. Mid-luteal progesterone to confirm ovulation.'),

  (null, '🩸 Dysmenorrhea & Heavy Flow Protocol', 'Menorrhagia Relief', 'Menstrual Health', 'Acute Flow Control',
   'Tranexamic acid + Mefenamic acid combination with iron replenishment for acute menorrhagia and severe dysmenorrhea.',
   'Acute Menorrhagia with Primary Dysmenorrhea',
   '[{"name":"Tranexamic Acid 500mg","schedule":"1-1-1","duration":"4 Days","timing":"During Heavy Bleeding Only","instructions":"Take only during active heavy bleeding days. Do not take prophylactically."},{"name":"Mefenamic Acid 500mg","schedule":"1-0-1","duration":"5 Days","timing":"After Food (SOS Pain)","instructions":"Take at onset of cramps with food or milk."},{"name":"Ferrous Ascorbate 100mg + Folic Acid 1.5mg + Zinc","schedule":"0-0-1","duration":"30 Days","timing":"2h after dinner or at bedtime","instructions":"Do not take with milk or tea. Orange juice enhances absorption."}]',
   '["Complete Blood Count (CBC) with Differential","Serum Ferritin & Iron Studies (TIBC)","Pelvic Ultrasound (USG Abdomen/Pelvis)","Coagulation Profile (PT, aPTT, INR)"]',
   'Acute menorrhagia management counseled. If bleeding exceeds 7 days or Hb drops below 8 g/dL, present to emergency immediately.'),

  (null, '🛡️ UTI Fast Relief Protocol', 'UTI First-Line', 'UTI & Bladder', 'Acute Cystitis',
   'Nitrofurantoin-based first-line UTI management with urinary alkalizer for immediate dysuria relief.',
   'Acute Uncomplicated Urinary Tract Infection (Cystitis)',
   '[{"name":"Nitrofurantoin 100mg Sustained Release (Macrobid)","schedule":"1-0-1","duration":"5 Days","timing":"With Food or Milk","instructions":"Take with food. Complete the full 5-day course."},{"name":"Disodium Hydrogen Citrate Syrup","schedule":"1-1-1","duration":"5 Days","timing":"Diluted in a glass of water","instructions":"Mix 15ml in a full glass of water. Relieves burning."},{"name":"Cranberry Extract + D-Mannose + Potassium Citrate Sachet","schedule":"1-0-1","duration":"15 Days","timing":"Dissolved in full glass of water","instructions":"Prevents E. coli adhesion. Drink 3+ litres of water daily."}]',
   '["Urine Routine & Microscopy (Midstream Clean Catch)","Urine Culture & Sensitivity (C/S)","Serum Creatinine & BUN (Renal Function)"]',
   'Acute uncomplicated cystitis managed empirically. Complete the antibiotic course. Escalate to IV antibiotics if fever or flank pain develop.'),

  (null, '🦋 Thyroid Balance & Replacement Protocol', 'Thyroid First-Line', 'Thyroid', 'Hypothyroidism Rx',
   'Levothyroxine titration protocol with Selenium support for Hashimoto thyroiditis.',
   'Primary Hypothyroidism / Hashimoto Thyroiditis',
   '[{"name":"Levothyroxine Sodium 50mcg","schedule":"1-0-0","duration":"90 Days","timing":"Strictly Empty Stomach Morning","instructions":"Take with plain water only. Wait 45-60 mins before tea or food. 4h gap from iron/calcium."},{"name":"Vitamin D3 (Cholecalciferol) 60,000 IU Capsule","schedule":"1-0-0","duration":"8 Weeks","timing":"With fatty meal or warm milk","instructions":"Take once weekly on the same day every week."}]',
   '["Complete Thyroid Profile (TSH, FT3, FT4)","Anti-TPO Antibodies (Thyroid Peroxidase / Hashimoto'\''s)","Anti-Thyroglobulin (Anti-Tg) Antibodies","25-OH Vitamin D (Serum Vitamin D3 Level)","Lipid Profile (Cholesterol, LDL, HDL, TG)"]',
   'Hypothyroidism management initiated. Target TSH: 1.0-2.5 mIU/L. Re-check TSH and FT4 in 6-8 weeks for dose adjustment.')

on conflict do nothing;

-- Auto-update updated_at timestamp
create or replace function public.update_clinical_protocol_timestamp()
returns trigger language plpgsql as 
begin
  new.updated_at = now();
  return new;
end;
;

create trigger clinical_protocols_updated_at
  before update on public.clinical_protocols
  for each row execute function public.update_clinical_protocol_timestamp();
