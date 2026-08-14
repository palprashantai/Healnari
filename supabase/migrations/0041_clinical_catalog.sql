-- Migration 0041: Comprehensive Clinical Catalog for Women's Health (250+ Categorized Medicines & Lab Tests)

create table if not exists public.clinical_catalog (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('medicine', 'lab_test')),
  doctor_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  default_dose text,
  default_freq text,
  default_timing text,
  default_duration text,
  badge text,
  instructions text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists clinical_catalog_type_doctor_idx on public.clinical_catalog (type, doctor_id) where deleted_at is null;
create index if not exists clinical_catalog_category_idx on public.clinical_catalog (category) where deleted_at is null;
create index if not exists clinical_catalog_name_idx on public.clinical_catalog (name) where deleted_at is null;

-- Enable RLS
alter table public.clinical_catalog enable row level security;

-- Policies:
create policy "Users can view global or own catalog items"
  on public.clinical_catalog
  for select
  using (
    deleted_at is null and (
      doctor_id is null or
      doctor_id = auth.uid() or
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Doctors and Admins can create catalog items"
  on public.clinical_catalog
  for insert
  with check (
    (doctor_id = auth.uid()) or
    (doctor_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

create policy "Doctors and Admins can update catalog items"
  on public.clinical_catalog
  for update
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Doctors and Admins can delete catalog items"
  on public.clinical_catalog
  for delete
  using (
    doctor_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ==============================================================================
-- 💊 1. GLOBAL MEDICINES CATALOG (ORGANIZED BY CLINICAL CATEGORY)
-- ==============================================================================

insert into public.clinical_catalog (type, doctor_id, name, category, default_dose, default_freq, default_timing, default_duration, badge, instructions)
values
  -- ─── 1. PCOS & Metabolic Health ───
  ('medicine', null, 'Metformin ER 500mg', 'PCOS & Metabolic Health', '500mg', '1-0-1', 'After Food', '90 Days', 'PCOS / IR', 'Take with or after main meals to minimize GI distress'),
  ('medicine', null, 'Metformin ER 850mg', 'PCOS & Metabolic Health', '850mg', '1-0-1', 'After Meals', '90 Days', 'PCOS / IR', 'Titrate dosage as advised'),
  ('medicine', null, 'Metformin ER 1000mg', 'PCOS & Metabolic Health', '1000mg', '1-0-1', 'After Meals', '90 Days', 'PCOS / IR', 'Extended release formulation'),
  ('medicine', null, 'Myo-Inositol & D-Chiro Inositol (40:1) Sachet', 'PCOS & Metabolic Health', '2g', '1-0-0', 'Morning with water', '90 Days', 'Ovulation & Oocyte', 'Dissolve 1 sachet in a glass of water'),
  ('medicine', null, 'Myo-Inositol + Melatonin + Folic Acid', 'PCOS & Metabolic Health', '1 Sachet', '0-0-1', 'Bedtime with water', '90 Days', 'Sleep & Oocyte Quality', 'Improves sleep and egg quality in PCOS'),
  ('medicine', null, 'Berberine HCl 500mg', 'PCOS & Metabolic Health', '500mg', '1-0-1', 'Before Food (20 mins)', '60 Days', 'Insulin & Lipid Control', 'Natural insulin sensitizer'),
  ('medicine', null, 'N-Acetylcysteine (NAC) 600mg', 'PCOS & Metabolic Health', '600mg', '1-0-1', 'After Food', '60 Days', 'Antioxidant / PCOS', 'Supports ovarian follicle health and reduces androgen levels'),
  ('medicine', null, 'Alpha Lipoic Acid 300mg', 'PCOS & Metabolic Health', '300mg', '1-0-0', 'Empty Stomach', '60 Days', 'Metabolic Antioxidant', 'Take 30 mins before morning breakfast'),
  ('medicine', null, 'Chromium Picolinate 200mcg', 'PCOS & Metabolic Health', '200mcg', '1-0-0', 'After Breakfast', '90 Days', 'Glucose Metabolism', 'Aids carbohydrate metabolism and reduces sugar cravings'),
  ('medicine', null, 'Spironolactone 25mg', 'PCOS & Metabolic Health', '25mg', '1-0-0', 'After Food (Morning)', '90 Days', 'Hirsutism / Acne', 'Requires baseline serum potassium check'),
  ('medicine', null, 'Spironolactone 50mg', 'PCOS & Metabolic Health', '50mg', '1-0-0', 'After Food (Morning)', '90 Days', 'Hirsutism / Acne', 'Monitor blood pressure and electrolytes'),
  ('medicine', null, 'Spironolactone 100mg', 'PCOS & Metabolic Health', '100mg', '1-0-0', 'After Food (Morning)', '90 Days', 'Severe Hirsutism', 'Ensure reliable contraception during therapy'),
  ('medicine', null, 'Cyproterone Acetate 2mg + Ethinylestradiol 0.035mg', 'PCOS & Metabolic Health', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'PCOS / Hyperandrogenism', 'Take daily for 21 days followed by 7-day pill-free interval'),
  ('medicine', null, 'Drospirenone 3mg + Ethinylestradiol 0.03mg', 'PCOS & Metabolic Health', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'PCOS / Acne', 'Low water retention profile'),
  ('medicine', null, 'Drospirenone 3mg + Ethinylestradiol 0.02mg (24/4 Regimen)', 'PCOS & Metabolic Health', '1 Tab', '0-0-1', 'Fixed time night', '28 Days', 'PCOS / PMDD', '24 active pills + 4 inactive placebo pills'),
  ('medicine', null, 'Coenzyme Q10 (Ubiquinol) 100mg', 'PCOS & Metabolic Health', '100mg', '1-0-0', 'After Breakfast', '90 Days', 'Oocyte Health', 'Lipid-soluble antioxidant for mitochondrial energy'),
  ('medicine', null, 'Coenzyme Q10 (Ubiquinol) 200mg', 'PCOS & Metabolic Health', '200mg', '1-0-0', 'After Breakfast', '90 Days', 'Advanced Oocyte Support', 'For advanced maternal age / diminished reserve'),

  -- ─── 2. Progestins & Cycle Regulators ───
  ('medicine', null, 'Norethisterone 5mg', 'Progestins & Cycle Regulators', '5mg', '1-0-1', 'After Food', '10 Days', 'Cycle Regulation', 'Withdrawal bleed usually occurs 3-5 days after stopping'),
  ('medicine', null, 'Norethisterone Controlled Release 10mg (CR)', 'Progestins & Cycle Regulators', '10mg', '1-0-0', 'After Food', '20 Days', 'Menorrhagia / DUB', 'Continuous release formulation'),
  ('medicine', null, 'Norethisterone Controlled Release 15mg (CR)', 'Progestins & Cycle Regulators', '15mg', '1-0-0', 'After Food', '20 Days', 'Severe DUB', 'Take whole with water'),
  ('medicine', null, 'Medroxyprogesterone Acetate 10mg', 'Progestins & Cycle Regulators', '10mg', '0-0-1', 'Bedtime', '10 Days', 'Secondary Amenorrhea', 'Withdrawal bleed expected within 7 days post-treatment'),
  ('medicine', null, 'Medroxyprogesterone Acetate 5mg', 'Progestins & Cycle Regulators', '5mg', '0-0-1', 'Bedtime', '10 Days', 'Cycle Inducer', 'Mild progestational support'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 100mg', 'Progestins & Cycle Regulators', '100mg', '0-0-1', 'Bedtime', '15 Days', 'Bioidentical Support', 'Take at bedtime (mild sedative effect if taken orally)'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 200mg', 'Progestins & Cycle Regulators', '200mg', '0-0-1', 'Bedtime / Vaginal', '15 Days', 'Luteal Support / Preterm Prevention', 'Can be inserted deeply vaginally or taken orally at night'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 300mg SR', 'Progestins & Cycle Regulators', '300mg', '0-0-1', 'Bedtime', '15 Days', 'Sustained Luteal Support', 'Sustained release formulation'),
  ('medicine', null, 'Micronized Natural Progesterone (Oral/Vaginal) 400mg SR', 'Progestins & Cycle Regulators', '400mg', '0-0-1', 'Bedtime', '15 Days', 'High-Dose Luteal Support', 'Used in IVF/ART cycles'),
  ('medicine', null, 'Progesterone 8% Vaginal Gel (Crinone)', 'Progestins & Cycle Regulators', '90mg/appl', '1-0-0', 'Morning Vaginal', '15 Days', 'Targeted Luteal Support', 'Single-use prefilled applicator inserted daily'),
  ('medicine', null, 'Dydrogesterone 10mg', 'Progestins & Cycle Regulators', '10mg', '1-0-1', 'After Food (Day 16-25)', '10 Days', 'Retro-Progesterone / Threat. Ab', 'Selective progestin without androgenic or glucocorticoid activity'),
  ('medicine', null, 'Dydrogesterone 10mg (TDS in Threat. Ab)', 'Progestins & Cycle Regulators', '10mg', '1-1-1', 'After Food', '14 Days', 'Threatened Miscarriage', 'Continue until bleeding ceases completely'),
  ('medicine', null, 'Hydroxyprogesterone Caproate 250mg IM Depot', 'Progestins & Cycle Regulators', '250mg', 'Once Weekly', 'Intramuscular Deep Gluteal', '8 Weeks', 'Preterm Labor Prevention', 'For singleton pregnancy with history of spontaneous preterm birth'),
  ('medicine', null, 'Hydroxyprogesterone Caproate 500mg IM Depot', 'Progestins & Cycle Regulators', '500mg', 'Once Weekly', 'Intramuscular Deep Gluteal', '8 Weeks', 'High-Risk Preterm Prevention', 'Administer strictly via deep IM injection in upper outer quadrant'),
  ('medicine', null, 'Megestrol Acetate 40mg', 'Progestins & Cycle Regulators', '40mg', '1-0-0', 'After Food', '30 Days', 'Endometrial Hyperplasia', 'Potent progestational therapy'),
  ('medicine', null, 'Ormeloxifene (Centchroman) 30mg', 'Progestins & Cycle Regulators', '30mg', 'Twice Weekly', 'After Food (Sun & Wed)', '12 Weeks', 'DUB / Non-hormonal Regimen', 'Twice weekly for 12 weeks, then once weekly thereafter'),
  ('medicine', null, 'Ormeloxifene (Centchroman) 60mg', 'Progestins & Cycle Regulators', '60mg', 'Twice Weekly', 'After Food (Sun & Wed)', '12 Weeks', 'AUB-E / DUB', 'Selective estrogen receptor modulator'),

  -- ─── 3. Ovulation Induction & Fertility ───
  ('medicine', null, 'Clomiphene Citrate 50mg', 'Ovulation Induction & Fertility', '50mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Ovulation Induction', 'Initiate on Day 2 or Day 3 of menstrual cycle'),
  ('medicine', null, 'Clomiphene Citrate 100mg', 'Ovulation Induction & Fertility', '100mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Ovulation Induction Step-Up', 'Monitor follicular development by serial TVS'),
  ('medicine', null, 'Letrozole 2.5mg', 'Ovulation Induction & Fertility', '2.5mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Aromatase Inhibitor / PCOS', 'First-line ovulation induction agent for PCOS'),
  ('medicine', null, 'Letrozole 5mg', 'Ovulation Induction & Fertility', '5mg', '0-0-1', 'Night (Day 2 to Day 6)', '5 Days', 'Aromatase Inhibitor Step-Up', 'Higher dose for resistant PCOS ovaries'),
  ('medicine', null, 'Recombinant FSH (rFSH) 75 IU Inj', 'Ovulation Induction & Fertility', '75 IU', 'Once Daily (SC)', 'Evening (Day 3-10)', '7 Days', 'Controlled Ovarian Stimulation', 'Subcutaneous injection into lower abdomen'),
  ('medicine', null, 'Human Menopausal Gonadotropin (hMG) 150 IU Inj', 'Ovulation Induction & Fertility', '150 IU', 'Once Daily (IM/SC)', 'Evening', '7 Days', 'Gonadotropin Therapy', 'Contains equal FSH and LH activity'),
  ('medicine', null, 'Human Chorionic Gonadotropin (hCG) 5000 IU Inj', 'Ovulation Induction & Fertility', '5000 IU', 'Single Dose (IM/SC)', 'Trigger time as advised', '1 Day', 'Ovulation Trigger', 'Administer when lead follicle reaches 18-20mm'),
  ('medicine', null, 'Human Chorionic Gonadotropin (hCG) 10000 IU Inj', 'Ovulation Induction & Fertility', '10000 IU', 'Single Dose (IM/SC)', 'Trigger time as advised', '1 Day', 'IVF Oocyte Trigger', 'Timed trigger 34-36h before oocyte retrieval'),
  ('medicine', null, 'Recombinant hCG (Choriogonadotropin Alfa 250mcg)', 'Ovulation Induction & Fertility', '250mcg', 'Single Dose (SC)', 'Trigger time as advised', '1 Day', 'Recombinant Trigger', 'Prefilled pen for self-administration'),
  ('medicine', null, 'Cetrorelix 0.25mg Inj', 'Ovulation Induction & Fertility', '0.25mg', 'Once Daily (SC)', 'Morning', '5 Days', 'GnRH Antagonist', 'Prevents premature LH surge during stimulation'),
  ('medicine', null, 'Ganirelix 0.25mg Inj', 'Ovulation Induction & Fertility', '0.25mg', 'Once Daily (SC)', 'Morning', '5 Days', 'GnRH Antagonist', 'Prefilled syringe for subcutaneous administration'),
  ('medicine', null, 'Cabergoline 0.5mg', 'Ovulation Induction & Fertility', '0.5mg', 'Twice Weekly', 'With Food at Bedtime', '8 Weeks', 'Hyperprolactinemia', 'Take with light snack to avoid nausea/dizziness'),
  ('medicine', null, 'Bromocriptine 2.5mg', 'Ovulation Induction & Fertility', '2.5mg', '1-0-1', 'With Meals', '60 Days', 'Dopamine Agonist', 'Preferred in pregnancy wishing for hyperprolactinemia'),
  ('medicine', null, 'Dehydroepiandrosterone (DHEA) 25mg', 'Ovulation Induction & Fertility', '25mg', '1-1-1', 'After Meals', '90 Days', 'Diminished Ovarian Reserve', 'Supports follicular recruitment in poor ovarian responders'),
  ('medicine', null, 'L-Arginine 3g + Zinc + Proanthocyanidins Sachet', 'Ovulation Induction & Fertility', '1 Sachet', '1-0-1', 'With water after food', '30 Days', 'Uterine Perfusion / Lining', 'Enhances endometrial blood flow and thickness'),
  ('medicine', null, 'Sildenafil Citrate 25mg Vaginal Tablet', 'Ovulation Induction & Fertility', '25mg', '1-0-1 (Vaginal)', 'Deep Vaginal', '10 Days', 'Thin Endometrium', 'Vasodilator to improve uterine radial artery blood flow'),

  -- ─── 4. Endometriosis & Pelvic Pain ───
  ('medicine', null, 'Dienogest 2mg', 'Endometriosis & Pelvic Pain', '2mg', '0-0-1', 'Fixed time night', '90 Days', 'Endometriosis / Pelvic Pain', 'Take continuously without pill-free intervals'),
  ('medicine', null, 'Tranexamic Acid 500mg', 'Endometriosis & Pelvic Pain', '500mg', '1-1-1', 'During Heavy Flow', '4 Days', 'Menorrhagia / Heavy Flow', 'Take only during active bleeding days; do not take prophylactically'),
  ('medicine', null, 'Tranexamic Acid 500mg + Mefenamic Acid 250mg', 'Endometriosis & Pelvic Pain', '1 Tab', '1-1-1', 'After Food during Heavy Pain/Flow', '4 Days', 'Heavy Bleeding + Cramps', 'Dual action anti-fibrinolytic + NSAID'),
  ('medicine', null, 'Mefenamic Acid 500mg', 'Endometriosis & Pelvic Pain', '500mg', '1-1-1', 'After Food (SOS Pain)', '5 Days', 'Primary Dysmenorrhea', 'Take at onset of cramps with food or milk'),
  ('medicine', null, 'Drotaverine HCl 80mg', 'Endometriosis & Pelvic Pain', '80mg', '1-0-1', 'After Food (SOS Cramps)', '5 Days', 'Smooth Muscle Spasms', 'Non-anticholinergic antispasmodic for uterine colic'),
  ('medicine', null, 'Drotaverine 80mg + Mefenamic Acid 250mg', 'Endometriosis & Pelvic Pain', '1 Tab', '1-0-1', 'After Food', '5 Days', 'Severe Dysmenorrhea', 'Potent dual relief for acute uterine cramps'),
  ('medicine', null, 'Dicyclomine HCl 20mg + Paracetamol 500mg', 'Endometriosis & Pelvic Pain', '1 Tab', '1-0-1', 'After Food (SOS)', '5 Days', 'Pelvic Spasms', 'Antispasmodic and analgesic combination'),
  ('medicine', null, 'Hyoscine Butylbromide 10mg (Buscopan)', 'Endometriosis & Pelvic Pain', '10mg', '1-1-1', 'Before Food (SOS)', '5 Days', 'Spasmodic Pain', 'Targeted visceral antispasmodic'),
  ('medicine', null, 'Goserelin 3.6mg Depot (Zoladex)', 'Endometriosis & Pelvic Pain', '3.6mg', 'Monthly Depot (SC)', 'Anterior Abdominal Wall', '3 Months', 'Severe Endometriosis / Fibroids', 'Monthly GnRH agonist implant with add-back HRT'),
  ('medicine', null, 'Leuprolide Acetate 3.75mg Depot', 'Endometriosis & Pelvic Pain', '3.75mg', 'Monthly (IM/SC)', 'Intramuscular', '3 Months', 'Endometriosis / Uterine Fibroids', 'Consider add-back tibolone or low-dose estrogen/progesterone'),
  ('medicine', null, 'Triptorelin 3.75mg Depot', 'Endometriosis & Pelvic Pain', '3.75mg', 'Monthly (IM)', 'Deep IM Gluteal', '3 Months', 'GnRH Agonist Depot', 'Down-regulates pituitary gonadotropin secretion'),
  ('medicine', null, 'Ulipristal Acetate 5mg', 'Endometriosis & Pelvic Pain', '5mg', '1-0-0', 'With or without food', '90 Days', 'Uterine Fibroids Pre-op', 'Selective progesterone receptor modulator; monitor LFT'),
  ('medicine', null, 'Danazol 100mg', 'Endometriosis & Pelvic Pain', '100mg', '1-0-1', 'After Food', '90 Days', 'Refractory Endometriosis', 'Synthetic androgen; monitor lipid and liver profiles'),

  -- ─── 5. Contraception & Family Planning ───
  ('medicine', null, 'Desogestrel 0.15mg + Ethinylestradiol 0.03mg', 'Contraception & Family Planning', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'Cycle Control', 'Minimal androgenic side effects'),
  ('medicine', null, 'Desogestrel 0.15mg + Ethinylestradiol 0.02mg', 'Contraception & Family Planning', '1 Tab', '0-0-1', 'Fixed time night', '21 Days', 'Ultra-Low Dose OC', 'Low estrogen dosage'),
  ('medicine', null, 'Levonorgestrel 0.15mg + Ethinylestradiol 0.03mg (Mala-D/Novel)', 'Contraception & Family Planning', '1 Tab', '0-0-1', 'Fixed time night', '28 Days', 'Standard Oral Contraceptive', '21 hormone pills + 7 ferrous fumarate spacer pills'),
  ('medicine', null, 'Desogestrel 75mcg (Cerazette / POP)', 'Contraception & Family Planning', '75mcg', '0-0-1', 'Fixed time daily (Exact)', '28 Days', 'Progestin-Only / Lactating', 'Safe for breastfeeding mothers and estrogen-contraindicated women'),
  ('medicine', null, 'Levonorgestrel 1.5mg (I-Pill / Emergency Pill)', 'Contraception & Family Planning', '1.5mg', 'Single Dose', 'Immediate (Within 72h)', '1 Day', 'Emergency Contraceptive', 'Take as early as possible within 72 hours of unprotected intercourse'),
  ('medicine', null, 'Ulipristal Acetate 30mg (Ella / Emergency)', 'Contraception & Family Planning', '30mg', 'Single Dose', 'Immediate (Within 120h)', '1 Day', 'Advanced Emergency Contraceptive', 'Effective up to 120 hours (5 days) post-intercourse'),
  ('medicine', null, 'Depot Medroxyprogesterone Acetate (DMPA 150mg / Antara)', 'Contraception & Family Planning', '150mg', 'Every 3 Months', 'Deep IM Gluteal/Deltoid', '1 Dose', 'Injectable Contraceptive', 'Next dose due in exactly 12-13 weeks'),
  ('medicine', null, 'Norelgestromin 6mg + Ethinylestradiol 0.6mg Transdermal Patch', 'Contraception & Family Planning', '1 Patch', 'Weekly', 'Apply to clean dry skin', '3 Weeks', 'Contraceptive Patch', 'Apply 1 patch weekly for 3 weeks followed by 1 patch-free week'),
  ('medicine', null, 'Etonogestrel + Ethinylestradiol Vaginal Ring (NuvaRing)', 'Contraception & Family Planning', '1 Ring', 'Continuous 3 Weeks', 'Insert into vagina', '3 Weeks', 'Vaginal Contraceptive Ring', 'Insert for 3 continuous weeks; remove for 1 week for withdrawal bleed'),

  -- ─── 6. Vaginal Health & Infections ───
  ('medicine', null, 'Fluconazole 150mg', 'Vaginal Health & Infections', '150mg', 'Single Dose', 'After Food', '1 Day', 'Vulvovaginal Candidiasis', 'Single oral dose for acute uncomplicated yeast infection'),
  ('medicine', null, 'Fluconazole 150mg (Recurrent Protocol: D1, D4, D7)', 'Vaginal Health & Infections', '150mg', 'Pulse (Day 1, 4, 7)', 'After Food', '7 Days', 'Recurrent Candidiasis', 'Then weekly maintenance 150mg for 6 months if recurrent'),
  ('medicine', null, 'Itraconazole 100mg', 'Vaginal Health & Infections', '100mg', '1-0-1', 'Immediately After Full Meal', '7 Days', 'Refractory Vaginal Mycosis', 'Absorption requires gastric acidity and full meal'),
  ('medicine', null, 'Itraconazole 200mg', 'Vaginal Health & Infections', '200mg', '1-0-1', 'Immediately After Full Meal', '1 Day', 'Single-Day Pulse Antifungal', 'High-dose 1-day pulse therapy'),
  ('medicine', null, 'Clotrimazole 100mg Vaginal Pessary', 'Vaginal Health & Infections', '100mg', '0-0-1 (Vaginal)', 'Bedtime with applicator', '6 Days', 'Vaginal Yeast Infection', 'Insert deeply into vagina at bedtime for 6 consecutive nights'),
  ('medicine', null, 'Clotrimazole 500mg Vaginal Pessary', 'Vaginal Health & Infections', '500mg', 'Single Dose (Vaginal)', 'Bedtime with applicator', '1 Night', '1-Night Yeast Treatment', 'Single-dose high potency vaginal pessary'),
  ('medicine', null, 'Miconazole Nitrate 2% Vaginal Cream', 'Vaginal Health & Infections', '5g/appl', '0-0-1 (Vaginal)', 'Bedtime with applicator', '7 Days', 'Vaginal & Vulval Yeast', 'Apply intravaginally and to external irritated vulva'),
  ('medicine', null, 'Sertaconazole Nitrate 500mg Vaginal Tablet', 'Vaginal Health & Infections', '500mg', 'Single Dose (Vaginal)', 'Bedtime', '1 Night', 'Broad Spectrum Antifungal', 'Broad spectrum fungicidal vaginal ovule'),
  ('medicine', null, 'Metronidazole 400mg', 'Vaginal Health & Infections', '400mg', '1-0-1', 'After Food', '7 Days', 'Bacterial Vaginosis / Trichomoniasis', 'Strictly avoid all alcohol consumption during and for 48h after therapy'),
  ('medicine', null, 'Metronidazole 500mg (TDS Protocol)', 'Vaginal Health & Infections', '500mg', '1-1-1', 'After Meals', '7 Days', 'Pelvic Inflammatory Disease', 'Partner treatment required if Trichomoniasis confirmed'),
  ('medicine', null, 'Tinidazole 500mg', 'Vaginal Health & Infections', '500mg', '1-0-1', 'After Food', '5 Days', 'Trichomoniasis / BV', 'Second-generation 5-nitroimidazole'),
  ('medicine', null, 'Tinidazole 2g Single Dose (4 x 500mg)', 'Vaginal Health & Infections', '2g (4 tabs)', 'Single Dose', 'With Food', '1 Day', '1-Day Trichomoniasis Protocol', 'Take all 4 tablets together with a heavy meal'),
  ('medicine', null, 'Secnidazole 2g Sachet/Tablets', 'Vaginal Health & Infections', '2g', 'Single Dose', 'With main meal', '1 Day', 'Single Dose BV/Trich', 'Long half-life nitroimidazole for single-dose cure'),
  ('medicine', null, 'Clindamycin 300mg', 'Vaginal Health & Infections', '300mg', '1-0-1', 'After Food with full glass water', '7 Days', 'Bacterial Vaginosis (Oral)', 'Alternative for metronidazole-intolerant patients'),
  ('medicine', null, 'Clindamycin 2% Vaginal Cream', 'Vaginal Health & Infections', '5g/appl', '0-0-1 (Vaginal)', 'Bedtime with applicator', '7 Days', 'Topical BV Therapy', 'May weaken latex condoms; use non-latex barrier'),
  ('medicine', null, 'Dequalinium Chloride 10mg Vaginal Tablet (Fluomizin)', 'Vaginal Health & Infections', '10mg', '0-0-1 (Vaginal)', 'Bedtime', '6 Days', 'Mixed Vaginal Infections / BV', 'Broad spectrum antiseptic without disrupting normal lactobacilli'),
  ('medicine', null, 'Oral Vaginal Probiotics (L. rhamnosus GR-1 & L. reuteri RC-14)', 'Vaginal Health & Infections', '1 Cap', '1-0-0', 'Morning with water', '30 Days', 'Vaginal Flora Restoration', 'Restores healthy acidic vaginal microbiome and prevents BV/yeast relapse'),
  ('medicine', null, 'Lactic Acid & Tea Tree Vaginal Gel', 'Vaginal Health & Infections', '1 Appl', '0-0-1 (Vaginal)', 'Bedtime', '7 Days', 'pH Balancer', 'Restores natural acidic vaginal pH (3.8-4.5)'),

  -- ─── 7. UTI & Bladder Care ───
  ('medicine', null, 'Nitrofurantoin 100mg Sustained Release (Macrobid)', 'UTI & Bladder Care', '100mg', '1-0-1', 'With Food or Milk', '5 Days', 'Acute Uncomplicated UTI', 'First-line urinary antiseptic; take with food to improve absorption'),
  ('medicine', null, 'Nitrofurantoin 50mg (Prophylaxis)', 'UTI & Bladder Care', '50mg', '0-0-1', 'Bedtime after emptying bladder', '30 Days', 'Recurrent UTI Prophylaxis', 'Long-term post-coital or nightly suppression'),
  ('medicine', null, 'Fosfomycin Trometamol 3g Sachet (Monurol)', 'UTI & Bladder Care', '3g', 'Single Dose', 'Empty bladder at bedtime with 100ml water', '1 Day', '1-Dose Acute Cystitis', 'Dissolve in cold water on empty stomach 2 hours after dinner'),
  ('medicine', null, 'Cefixime 200mg', 'UTI & Bladder Care', '200mg', '1-0-1', 'After Food', '5 Days', 'Urinary / Respiratory Infection', 'Third-generation oral cephalosporin'),
  ('medicine', null, 'Cefixime 400mg', 'UTI & Bladder Care', '400mg', '1-0-0', 'After Food', '5 Days', 'Complicated UTI', 'Once-daily cephalosporin regimen'),
  ('medicine', null, 'Ciprofloxacin 500mg', 'UTI & Bladder Care', '500mg', '1-0-1', '2h after food', '5 Days', 'Complicated UTI / PID', 'Drink plenty of fluids; avoid antacids/dairy within 2 hours'),
  ('medicine', null, 'Ofloxacin 200mg + Ornidazole 500mg', 'UTI & Bladder Care', '1 Tab', '1-0-1', 'After Meals', '5 Days', 'Pelvic & UTI Mixed Infection', 'Dual coverage for aerobic gram-negative and anaerobes'),
  ('medicine', null, 'Doxycycline 100mg', 'UTI & Bladder Care', '100mg', '1-0-1', 'With large glass of water sitting upright', '14 Days', 'Pelvic Inflammatory Disease / Chlamydia', 'Do not lie down for 30 minutes after taking to prevent esophagitis'),
  ('medicine', null, 'Azithromycin 1g Single Dose (2 x 500mg)', 'UTI & Bladder Care', '1g (2 tabs)', 'Single Dose', '1h before or 2h after food', '1 Day', 'Chlamydia STI Protocol', 'Single-dose cure for uncomplicated genital chlamydia; treat partner'),
  ('medicine', null, 'Cranberry Extract + D-Mannose + Potassium Citrate Sachet', 'UTI & Bladder Care', '1 Sachet', '1-0-1', 'Dissolved in full glass of water', '15 Days', 'UTI Cleanser / Anti-Adhesion', 'Prevents E. coli adhesion to uroepithelial receptors'),
  ('medicine', null, 'Disodium Hydrogen Citrate Syrup', 'UTI & Bladder Care', '15ml', '1-1-1', 'Diluted in a glass of water', '5 Days', 'Urinary Burning Sensation', 'Relieves dysuria by raising urinary pH'),
  ('medicine', null, 'Flavoxate HCl 200mg', 'UTI & Bladder Care', '200mg', '1-1-1', 'After Food', '5 Days', 'Bladder Spasms / Dysuria', 'Urological antispasmodic for bladder neck irritation'),

  -- ─── 8. Thyroid, Endocrine & Bone Health ───
  ('medicine', null, 'Levothyroxine Sodium 12.5mcg', 'Thyroid, Endocrine & Bone Health', '12.5mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Subclinical Hypothyroidism', 'Take with plain water 45-60 mins before tea/coffee/breakfast'),
  ('medicine', null, 'Levothyroxine Sodium 25mcg', 'Thyroid, Endocrine & Bone Health', '25mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Hypothyroidism Start Dose', 'Do not take with iron or calcium supplements (keep 4h gap)'),
  ('medicine', null, 'Levothyroxine Sodium 50mcg', 'Thyroid, Endocrine & Bone Health', '50mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Target TSH 1.0-2.5 in Pregnancy', 'Re-check serum TSH in 6 weeks for dose adjustment'),
  ('medicine', null, 'Levothyroxine Sodium 75mcg', 'Thyroid, Endocrine & Bone Health', '75mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Hypothyroidism Maintenance', 'Consistent morning timing is mandatory'),
  ('medicine', null, 'Levothyroxine Sodium 88mcg', 'Thyroid, Endocrine & Bone Health', '88mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Fine-Tuning Thyroid Dose', 'Take with plain water only'),
  ('medicine', null, 'Levothyroxine Sodium 100mcg', 'Thyroid, Endocrine & Bone Health', '100mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Full Replacement Dose', 'Maintain 4-hour separation from calcium/iron/antacids'),
  ('medicine', null, 'Levothyroxine Sodium 112mcg', 'Thyroid, Endocrine & Bone Health', '112mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'Thyroid Replacement', 'For postoperative or post-ablation hypothyroidism'),
  ('medicine', null, 'Levothyroxine Sodium 125mcg', 'Thyroid, Endocrine & Bone Health', '125mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'High-Dose Thyroid Hormone', 'Check ECG and free hormones regularly in elderly patients'),
  ('medicine', null, 'Levothyroxine Sodium 150mcg', 'Thyroid, Endocrine & Bone Health', '150mcg', '1-0-0', 'Strictly Empty Stomach Morning', '90 Days', 'TSH Suppression Therapy', 'Used in post-thyroid carcinoma or severe hypothyroidism'),
  ('medicine', null, 'Carbimazole 5mg', 'Thyroid, Endocrine & Bone Health', '5mg', '1-0-1', 'After Food', '60 Days', 'Hyperthyroidism', 'Monitor WBC count for fever/sore throat (agranulocytosis risk)'),
  ('medicine', null, 'Carbimazole 10mg', 'Thyroid, Endocrine & Bone Health', '10mg', '1-0-1', 'After Food', '60 Days', 'Thyrotoxicosis', 'Antithyroid agent'),
  ('medicine', null, 'Propylthiouracil (PTU) 50mg', 'Thyroid, Endocrine & Bone Health', '50mg', '1-1-1', 'After Food', '60 Days', 'Hyperthyroidism (1st Trimester)', 'Preferred antithyroid drug in first trimester of pregnancy'),
  ('medicine', null, 'Vitamin D3 (Cholecalciferol) 60,000 IU Capsule', 'Thyroid, Endocrine & Bone Health', '60,000 IU', 'Once Weekly', 'With fatty meal or warm milk', '8 Weeks', 'Vitamin D Deficiency', 'Fat-soluble vitamin; best absorbed with milk or dietary fat'),
  ('medicine', null, 'Vitamin D3 (Cholecalciferol) 60,000 IU Oral Solution / Shots', 'Thyroid, Endocrine & Bone Health', '60k IU/5ml', 'Once Weekly', 'With milk after meal', '8 Weeks', 'Liquid Vitamin D Shot', 'Pre-measured 5ml sugar-free liquid shot'),
  ('medicine', null, 'Vitamin D3 2,000 IU Daily Maintenance', 'Thyroid, Endocrine & Bone Health', '2,000 IU', '1-0-0', 'After Breakfast', '90 Days', 'Daily Maintenance D3', 'For long-term maintenance after deficiency correction'),
  ('medicine', null, 'Calcium Citrate Malate 1200mg + Calcitriol + Zinc + Magnesium', 'Thyroid, Endocrine & Bone Health', '1 Tab', '0-0-1', 'After Dinner', '60 Days', 'Bone & Mineral Density', 'Better absorption and lower kidney stone risk than calcium carbonate'),
  ('medicine', null, 'Elemental Calcium 500mg + Vitamin D3 250 IU (Shelcal)', 'Thyroid, Endocrine & Bone Health', '1 Tab', '1-0-0', 'After Lunch', '60 Days', 'Standard Calcium Supplement', 'Do not take at same time as iron or thyroid tablets'),
  ('medicine', null, 'Alendronate Sodium 70mg (Weekly)', 'Thyroid, Endocrine & Bone Health', '70mg', 'Once Weekly', 'First thing morning with full glass plain water', '12 Weeks', 'Postmenopausal Osteoporosis', 'Must sit or stand upright for 30 minutes; do not eat for 30 mins'),
  ('medicine', null, 'Ibandronic Acid 150mg (Monthly)', 'Thyroid, Endocrine & Bone Health', '150mg', 'Once Monthly', 'Morning empty stomach with plain water', '6 Months', 'Monthly Bisphosphonate', 'Take same calendar day each month; stay upright for 60 minutes'),
  ('medicine', null, 'Zoledronic Acid 5mg IV Infusion', 'Thyroid, Endocrine & Bone Health', '5mg', 'Once Yearly (IV)', 'Slow IV over 20 mins with adequate hydration', '1 Year', 'Annual Osteoporosis Infusion', 'Ensure normal serum calcium and creatinine before infusion'),
  ('medicine', null, 'Denosumab 60mg SubQ (Prolia)', 'Thyroid, Endocrine & Bone Health', '60mg', 'Every 6 Months (SC)', 'Upper Arm / Thigh / Abdomen', '6 Months', 'RANKL Inhibitor', 'Administer every 6 months; ensure adequate calcium and D3 co-therapy'),
  ('medicine', null, 'Teriparatide 20mcg/day SubQ (Forteo)', 'Thyroid, Endocrine & Bone Health', '20mcg', 'Once Daily (SC)', 'Thigh / Lower Abdominal wall', '1 Year', 'Anabolic Bone Builder', 'For severe osteoporosis with prior vertebral fractures'),

  -- ─── 9. Prenatal & Antenatal Care ───
  ('medicine', null, 'Folic Acid 5mg', 'Prenatal & Antenatal Care', '5mg', '1-0-0', 'After Breakfast', '90 Days', 'Pre-Conception & 1st Trimester', 'Essential for preventing neural tube defects (NTDs)'),
  ('medicine', null, 'L-Methylfolate 1mg + Methylcobalamin 1500mcg + Pyridoxal-5-Phosphate', 'Prenatal & Antenatal Care', '1 Tab', '1-0-0', 'After Breakfast', '90 Days', 'Active Bio-Folate (MTHFR Safe)', 'Directly bioavailable folate for MTHFR gene variants'),
  ('medicine', null, 'Ferrous Ascorbate 100mg + Folic Acid 1.5mg + Zinc', 'Prenatal & Antenatal Care', '1 Tab', '0-0-1', '2h after dinner or at bedtime', '90 Days', 'Pregnancy Anemia / Iron Def.', 'Do not take with milk/tea; orange juice enhances absorption'),
  ('medicine', null, 'Liposomal Iron 30mg + Vitamin C (Gentle Iron)', 'Prenatal & Antenatal Care', '1 Cap', '1-0-0', 'Anytime with or without food', '60 Days', 'Non-Constipating Iron', 'Liposomal encapsulation prevents GI upset and constipation'),
  ('medicine', null, 'Sodium Feredetate (Iron Sodium EDTA) 33mg/5ml Syrup', 'Prenatal & Antenatal Care', '10ml', '1-0-1', 'After Meals', '60 Days', 'Liquid Iron Supplement', 'High bioavailability with low teeth staining'),
  ('medicine', null, 'Ferric Carboxymaltose 500mg IV Infusion', 'Prenatal & Antenatal Care', '500mg', 'Single IV Drip', 'Diluted in 100ml 0.9% NaCl over 15 mins', '1 Day', 'Severe Gestational Anemia', 'For rapid iron repletion when oral iron fails or Hb < 8.0 g/dL'),
  ('medicine', null, 'DHA 200mg (Vegetarian / Algal Omega-3)', 'Prenatal & Antenatal Care', '200mg', '1-0-0', 'After Lunch', '90 Days', 'Fetal Neurodevelopment', 'Promotes fetal brain, retinal, and neural development'),
  ('medicine', null, 'Doxylamine Succinate 10mg + Pyridoxine (Vit B6) 10mg (Doxinate)', 'Prenatal & Antenatal Care', '1 Tab', '0-0-2 (Night)', 'Bedtime with water', '30 Days', 'Hyperemesis Gravidarum / Morning Sickness', 'First-line FDA approved combination for pregnancy nausea and vomiting'),
  ('medicine', null, 'Doxylamine 20mg + Pyridoxine 20mg + Folic Acid 5mg (Doxinate Plus)', 'Prenatal & Antenatal Care', '1 Tab', '0-0-1', 'Bedtime', '30 Days', 'Morning Sickness Plus Folate', 'Take 1 tablet at night; add 1 tablet morning if daytime nausea occurs'),
  ('medicine', null, 'Ondansetron 4mg (Mouth Dissolving)', 'Prenatal & Antenatal Care', '4mg', '1-0-1', 'Place on tongue 30 mins before food', '5 Days', 'Severe Refractory Vomiting', 'Quick dissolve formulation for acute pregnancy nausea'),
  ('medicine', null, 'Metoclopramide 10mg', 'Prenatal & Antenatal Care', '10mg', '1-0-1', '15 mins Before Meals', '5 Days', 'Gastric Motility & Nausea', 'Prokinetic antiemetic'),
  ('medicine', null, 'Labetalol 100mg', 'Prenatal & Antenatal Care', '100mg', '1-0-1', 'With Meals', '30 Days', 'Gestational Hypertension / Preeclampsia', 'First-line oral antihypertensive in pregnancy; monitor maternal BP'),
  ('medicine', null, 'Methyldopa 250mg', 'Prenatal & Antenatal Care', '250mg', '1-1-1', 'After Food', '30 Days', 'Chronic Hypertension in Pregnancy', 'Centrally acting alpha-2 agonist with extensive pregnancy safety record'),
  ('medicine', null, 'Nifedipine 20mg Retard / SR', 'Prenatal & Antenatal Care', '20mg', '1-0-1', 'After Food', '30 Days', 'Preeclampsia / Tocolysis', 'Calcium channel blocker for blood pressure and preterm labor tocolysis'),
  ('medicine', null, 'Aspirin 75mg (Low Dose / Ecosprin 75)', 'Prenatal & Antenatal Care', '75mg', '0-0-1', 'After Dinner', '150 Days', 'Preeclampsia Prophylaxis', 'Initiate between 12-16 weeks for high risk preeclampsia or APS history'),
  ('medicine', null, 'Aspirin 150mg (Low Dose / Ecosprin 150)', 'Prenatal & Antenatal Care', '150mg', '0-0-1', 'After Dinner', '150 Days', 'High-Risk Preeclampsia Prevention', 'ACOG/NICE recommended dose for high preeclampsia uterine Doppler notches'),
  ('medicine', null, 'Enoxaparin Sodium 40mg (0.4ml) SubQ (LMWH)', 'Prenatal & Antenatal Care', '40mg (0.4ml)', 'Once Daily (SC)', 'Subcutaneous in anterolateral abdomen', '30 Days', 'Thrombophilia / APS in Pregnancy', 'Rotate injection sites around umbilical region; do not rub site'),
  ('medicine', null, 'Enoxaparin Sodium 60mg (0.6ml) SubQ (LMWH)', 'Prenatal & Antenatal Care', '60mg (0.6ml)', 'Once Daily (SC)', 'Subcutaneous', '30 Days', 'Therapeutic Anticoagulation', 'For acute DVT or mechanical valve in pregnancy'),

  -- ─── 10. Menopause, HRT & Atrophy ───
  ('medicine', null, '17-Beta Estradiol 1mg (Oral)', 'Menopause, HRT & Atrophy', '1mg', '1-0-0', 'Morning with food', '30 Days', 'Menopausal Vasomotor Symptoms', 'For hot flashes and night sweats; combine with progestin if uterus intact'),
  ('medicine', null, '17-Beta Estradiol 2mg (Oral)', 'Menopause, HRT & Atrophy', '2mg', '1-0-0', 'Morning with food', '30 Days', 'Moderate-Severe Hot Flashes', 'Titrate to lowest effective dose'),
  ('medicine', null, 'Estradiol Transdermal Gel 0.06% (Oestrogel)', 'Menopause, HRT & Atrophy', '1.25g (1 measure)', 'Once Daily', 'Apply to arms/shoulders after morning bath', '30 Days', 'Transdermal Bioidentical Estrogen', 'Avoid breasts and vulval area; lower thromboembolic risk than oral estrogen'),
  ('medicine', null, 'Estradiol Transdermal Patch 50mcg (Estraderm)', 'Menopause, HRT & Atrophy', '50mcg/day', 'Twice Weekly Patch', 'Apply to lower abdomen/buttocks', '4 Weeks', 'Constant-Rate Estrogen Patch', 'Change patch every 3-4 days; rotate application sites'),
  ('medicine', null, 'Estriol 0.1% Vaginal Cream (Ovestin)', 'Menopause, HRT & Atrophy', '1 Appl', '0-0-1 (Vaginal)', 'Bedtime with applicator', '14 Days', 'Genitourinary Syndrome of Menopause', 'Use daily for 2 weeks, then reduce to twice weekly maintenance'),
  ('medicine', null, 'Conjugated Estrogens 0.625mg + MPA 2.5mg (Prempro)', 'Menopause, HRT & Atrophy', '1 Tab', '1-0-0', 'Fixed time morning', '28 Days', 'Continuous Combined HRT', 'For postmenopausal women with intact uterus to prevent hyperplasia'),
  ('medicine', null, 'Tibolone 2.5mg (Livial)', 'Menopause, HRT & Atrophy', '2.5mg', '1-0-0', 'Fixed time morning', '30 Days', 'STEAR / Menopausal Health', 'Triple estrogenic, progestogenic, and androgenic action; improves libido'),
  ('medicine', null, 'Isoflavones (Soy & Red Clover 40mg) + Cohosh', 'Menopause, HRT & Atrophy', '1 Tab', '1-0-1', 'After Meals', '60 Days', 'Phytoestrogen Menopause Support', 'Natural non-hormonal management for mild climacteric symptoms'),
  ('medicine', null, 'Paroxetine 7.5mg (Brisdelle)', 'Menopause, HRT & Atrophy', '7.5mg', '0-0-1', 'Bedtime', '60 Days', 'Non-Hormonal Hot Flash Relief', 'Only FDA approved non-hormonal SSRI for vasomotor hot flashes'),
  ('medicine', null, 'Gabapentin 300mg', 'Menopause, HRT & Atrophy', '300mg', '0-0-1', 'Bedtime', '30 Days', 'Nocturnal Hot Flashes & Insomnia', 'Helps nighttime awakenings and severe sweating'),

  -- ─── 11. Dermatology & PCOS Aesthetics ───
  ('medicine', null, 'Eflornithine 13.9% Topical Cream (Vaniqa)', 'Dermatology & PCOS Aesthetics', 'Thin Film', 'Twice Daily', 'Rub thoroughly into facial hirsutism areas', '60 Days', 'Facial Hirsutism / Facial Hair', 'Slows hair growth; visible results in 6-8 weeks; do not wash face for 4h'),
  ('medicine', null, 'Azelaic Acid 15% Gel (Finacea)', 'Dermatology & PCOS Aesthetics', 'Thin Film', '1-0-1', 'Clean dry facial skin', '60 Days', 'PCOS Hormonal Acne / Rosacea', 'Anti-inflammatory, anti-androgenic and pregnancy-safe acne treatment'),
  ('medicine', null, 'Azelaic Acid 20% Cream', 'Dermatology & PCOS Aesthetics', 'Thin Film', '0-0-1', 'Bedtime on affected areas', '60 Days', 'Acne & Post-Inflammatory Hyperpigmentation', 'Reduces melanin production and clears blemishes'),
  ('medicine', null, 'Clindamycin 1% + Nicotinamide 4% Gel', 'Dermatology & PCOS Aesthetics', 'Thin Film', '1-0-1', 'Topical application to acne lesions', '30 Days', 'Inflammatory Acne Vulgaris', 'Non-drying antibiotic and anti-inflammatory gel'),
  ('medicine', null, 'Tretinoin 0.025% Cream', 'Dermatology & PCOS Aesthetics', 'Pea Sized', '0-0-1', 'Bedtime on dry face', '60 Days', 'Comedonal Acne', 'Strictly contraindicated in pregnancy; use sunscreen in daytime'),
  ('medicine', null, 'Minoxidil 2% Topical Solution (Women)', 'Dermatology & PCOS Aesthetics', '1ml', '1-0-1', 'Apply to dry scalp with dropper', '90 Days', 'Female Pattern Hair Loss (FPHL)', 'Apply directly to vertex thinning; massage gently; wash hands'),
  ('medicine', null, 'Minoxidil 5% Topical Foam (Once Daily for Women)', 'Dermatology & PCOS Aesthetics', 'Half Capful', '0-0-1', 'Night on dry scalp', '90 Days', 'Androgenetic Alopecia in Women', 'Once-daily convenient foam formulation with low scalp irritation'),
  ('medicine', null, 'Biotin 10mg + Amino Acids + Zinc + Silica (Follicle Nourish)', 'Dermatology & PCOS Aesthetics', '1 Tab', '1-0-0', 'After Breakfast', '90 Days', 'Hair & Nail Fortifier', 'Supports keratin synthesis for telogen effluvium and thinning hair')
on conflict do nothing;

-- ==============================================================================
-- 🧪 2. GLOBAL LAB & DIAGNOSTIC TEST CATALOG (ORGANIZED BY CLINICAL CATEGORY)
-- ==============================================================================

insert into public.clinical_catalog (type, doctor_id, name, category, badge, instructions)
values
  -- ─── 1. Hormonal & Ovarian Reserve ───
  ('lab_test', null, 'LH (Luteinizing Hormone)', 'Hormonal & Ovarian Reserve', '🌸 Hormones', 'Recommended Day 2 to Day 4 of menstrual cycle (Fasting)'),
  ('lab_test', null, 'FSH (Follicle Stimulating Hormone)', 'Hormonal & Ovarian Reserve', '🌸 Hormones', 'Recommended Day 2 to Day 4 of cycle for baseline ovarian assessment'),
  ('lab_test', null, 'LH & FSH Ratio (PCOS Marker)', 'Hormonal & Ovarian Reserve', '🌸 PCOS/Cycle', 'LH:FSH ratio > 2:1 on Day 2/3 strongly indicates PCOS pattern'),
  ('lab_test', null, 'Serum AMH (Anti-Müllerian Hormone / Ovarian Reserve)', 'Hormonal & Ovarian Reserve', '🌸 Fertility', 'Can be tested on any day of cycle; unaffected by oral contraceptives'),
  ('lab_test', null, 'Serum Estradiol (E2) - Baseline', 'Hormonal & Ovarian Reserve', '🌸 Hormones', 'Collect Day 2 or 3 of cycle (Baseline follicular level < 50 pg/mL)'),
  ('lab_test', null, 'Serum Estradiol (E2) - Pre-Ovulatory Peak', 'Hormonal & Ovarian Reserve', '🌸 Fertility', 'Collect mid-cycle when lead follicle is 18mm+ (200-300 pg/mL per mature follicle)'),
  ('lab_test', null, 'Serum Progesterone (Day 21 / Mid-Luteal Phase)', 'Hormonal & Ovarian Reserve', '🌸 Ovulation Check', 'Collect 7 days before expected menses (Day 21 in 28-day cycle); > 10 ng/mL confirms ovulation'),
  ('lab_test', null, 'Serum Prolactin (Fasting)', 'Hormonal & Ovarian Reserve', '⚡ Pituitary', 'Collect between 8-10 AM; rest quietly for 20 mins prior; avoid breast stimulation/exercise'),
  ('lab_test', null, 'Macroprolactin Screen (PEG Precipitation)', 'Hormonal & Ovarian Reserve', '⚡ Pituitary', 'Differentiates true hyperprolactinemia from monomeric/macroprolactin complexes'),
  ('lab_test', null, 'Total Serum Testosterone', 'Hormonal & Ovarian Reserve', '🌸 Androgens', 'Early morning sample preferred when androgen levels peak'),
  ('lab_test', null, 'Free & Bioavailable Testosterone', 'Hormonal & Ovarian Reserve', '🌸 Hyperandrogenism', 'Sensitive marker for clinical hyperandrogenism and hirsutism in women'),
  ('lab_test', null, 'Free Androgen Index (FAI = Total T / SHBG x 100)', 'Hormonal & Ovarian Reserve', '🌸 Androgen Excess', 'Key calculated biochemical marker for PCOS phenotype diagnostic criteria'),
  ('lab_test', null, 'Sex Hormone Binding Globulin (SHBG)', 'Hormonal & Ovarian Reserve', '🌸 Proteins', 'Circulating carrier protein; lower levels increase active free androgen fraction'),
  ('lab_test', null, 'DHEA-Sulfate (Dehydroepiandrosterone Sulfate)', 'Hormonal & Ovarian Reserve', '🌸 Adrenal Androgen', 'Evaluates adrenal androgen contribution to virilization/hirsutism'),
  ('lab_test', null, 'Serum Androstenedione', 'Hormonal & Ovarian Reserve', '🌸 Androgens', 'Intermediate androgen produced by both ovaries and adrenal cortex'),
  ('lab_test', null, '17-Hydroxyprogesterone (17-OHP - Fasting Morning)', 'Hormonal & Ovarian Reserve', '🌸 CAH Screening', 'Screening test to rule out Non-Classical Congenital Adrenal Hyperplasia (NCAH)'),
  ('lab_test', null, 'Serum Inhibin B', 'Hormonal & Ovarian Reserve', '🌸 Ovarian Reserve', 'Day 3 marker of granulosa cell activity and functional ovarian pool'),
  ('lab_test', null, 'Beta hCG (Quantitative Pregnancy / Tumour Marker)', 'Hormonal & Ovarian Reserve', '🤰 Pregnancy / hCG', 'Serial doubling time evaluated every 48 hours in early pregnancy assessment'),

  -- ─── 2. Thyroid, Endocrine & Autoimmune ───
  ('lab_test', null, 'Thyroid Profile (Total T3, Total T4, Ultrasensitive TSH)', 'Thyroid, Endocrine & Autoimmune', '🦋 Thyroid Standard', 'Overnight fasting; take morning levothyroxine tablet AFTER blood draw'),
  ('lab_test', null, 'Free Thyroid Panel (FT3, FT4, TSH Ultrasensitive 4th Gen)', 'Thyroid, Endocrine & Autoimmune', '🦋 Free Hormones', 'Unbound active thyroid hormones; essential during pregnancy & OCP use'),
  ('lab_test', null, 'Anti-TPO Antibodies (Thyroid Peroxidase / Hashimoto''s)', 'Thyroid, Endocrine & Autoimmune', '🦋 Autoimmune Thyroid', 'Identifies autoimmune thyroiditis and risk of miscarriage/hypothyroidism'),
  ('lab_test', null, 'Anti-Thyroglobulin (Anti-Tg) Antibodies', 'Thyroid, Endocrine & Autoimmune', '🦋 Autoimmune Thyroid', 'Complementary marker for autoimmune thyroid destruction'),
  ('lab_test', null, 'TSH Receptor Antibodies (TRAb / TSI - Graves'' Disease)', 'Thyroid, Endocrine & Autoimmune', '🦋 Hyperthyroid Autoimmune', 'Confirms Graves'' thyrotoxicosis and transplacental transfer risk'),
  ('lab_test', null, 'Antinuclear Antibodies (ANA by Indirect Immunofluorescence - IFA)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Connective Tissue', 'Screens for systemic autoimmune and connective tissue disorders (SLE, Sjogren)'),
  ('lab_test', null, 'Anti-dsDNA Antibodies (Quantitative)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Lupus / SLE', 'Specific marker for Systemic Lupus Erythematosus flare and nephritis'),
  ('lab_test', null, 'Anti-Phospholipid Antibodies Panel (aPL Complete)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Recurrent Loss / APS', 'Includes Lupus Anticoagulant, aCL, and Anti-Beta2 Glycoprotein I for recurrent pregnancy loss'),
  ('lab_test', null, 'Lupus Anticoagulant Screen (dRVVT Screen & Confirm)', 'Thyroid, Endocrine & Autoimmune', '🛡️ Thrombophilia', 'Evaluates prolonged phospholipid-dependent clotting for APS diagnosis'),
  ('lab_test', null, 'Anti-Cardiolipin Antibodies (IgG & IgM)', 'Thyroid, Endocrine & Autoimmune', '🛡️ APS Panel', 'Enzyme immunoassay for antiphospholipid syndrome evaluation'),
  ('lab_test', null, 'Anti-Beta-2 Glycoprotein I Antibodies (IgG & IgM)', 'Thyroid, Endocrine & Autoimmune', '🛡️ APS Specific', 'Highly specific antibody for vascular thrombosis and obstetric complications'),

  -- ─── 3. Metabolic & Cardiovascular ───
  ('lab_test', null, 'Fasting Blood Glucose (FBG)', 'Metabolic & Cardiovascular', '🍬 Glucose', '10-12 hours overnight fasting mandatory'),
  ('lab_test', null, 'Postprandial Blood Glucose (2-Hour PPBG)', 'Metabolic & Cardiovascular', '🍬 Glucose', 'Exactly 2 hours from the start of a standard meal'),
  ('lab_test', null, 'Oral Glucose Tolerance Test (OGTT - 75g 3-Point: 0, 1h, 2h)', 'Metabolic & Cardiovascular', '🍬 GDM & PCOS Screen', 'Gold standard for Gestational Diabetes Mellitus and occult impaired glucose tolerance'),
  ('lab_test', null, 'HbA1c (Glycated Hemoglobin - HPLC Certified)', 'Metabolic & Cardiovascular', '🍬 3-Month Sugar', 'Evaluates mean glycemic control over preceding 90-120 days; no fasting required'),
  ('lab_test', null, 'Fasting Serum Insulin', 'Metabolic & Cardiovascular', '🍬 Insulin', 'Overnight 10h fast; assess hyperinsulinemia and metabolic syndrome'),
  ('lab_test', null, 'Postprandial Serum Insulin (2-Hour)', 'Metabolic & Cardiovascular', '🍬 Insulin Peak', 'Evaluates delayed compensatory hyperinsulinemic surge in PCOS'),
  ('lab_test', null, 'HOMA-IR (Homeostatic Model Assessment of Insulin Resistance)', 'Metabolic & Cardiovascular', '🩸 Insulin Resistance', 'Calculated from fasting glucose and fasting insulin; values > 2.0 indicate IR'),
  ('lab_test', null, 'Complete Lipid Profile (TC, HDL, LDL, VLDL, TG, Non-HDL)', 'Metabolic & Cardiovascular', '🫀 Cardio Screen', '12-hour strict fasting; assesses dyslipidemia in PCOS and metabolic syndrome'),
  ('lab_test', null, 'High-Sensitivity C-Reactive Protein (hs-CRP)', 'Metabolic & Cardiovascular', '🫀 Inflammation', 'Cardiovascular risk and systemic low-grade chronic inflammation marker in PCOS'),
  ('lab_test', null, 'Liver Function Test (LFT - Bilirubin, SGOT, SGPT, ALP, Protein, Albumin)', 'Metabolic & Cardiovascular', '🫁 Hepatic Screen', 'Baseline check prior to starting statins, OCPs, or hormonal agents'),
  ('lab_test', null, 'Kidney Function Test (KFT / RFT - Urea, BUN, Creatinine, eGFR, Uric Acid)', 'Metabolic & Cardiovascular', '🩺 Renal Screen', 'Assesses renal function, hydration, and uric acid status in preeclampsia & PCOS'),
  ('lab_test', null, 'Serum Electrolytes (Sodium, Potassium, Chloride, Bicarbonate)', 'Metabolic & Cardiovascular', '⚡ Electrolytes', 'Required when initiating spironolactone, drospirenone, or in hyperemesis'),

  -- ─── 4. Hematology, Anemia & Micronutrients ───
  ('lab_test', null, 'Complete Blood Count (CBC) with Automated Differential & ESR', 'Hematology, Anemia & Micronutrients', '🩸 Hematology', 'Evaluates anemia, infection, platelet count, and systemic inflammatory activity'),
  ('lab_test', null, 'Peripheral Blood Smear Examination (PBS)', 'Hematology, Anemia & Micronutrients', '🩸 Morphology', 'Pathologist review of red cell indices (microcytic, macrocytic, dimorphic)'),
  ('lab_test', null, 'Serum Ferritin (Iron Storage Protein)', 'Hematology, Anemia & Micronutrients', '🩸 Iron Stores', 'Most sensitive test for latent and absolute iron deficiency anemia'),
  ('lab_test', null, 'Total Iron Binding Capacity (TIBC) & Transferrin Saturation (%)', 'Hematology, Anemia & Micronutrients', '🩸 Iron Kinetics', 'Full iron kinetics profile with serum iron and transferrin saturation index'),
  ('lab_test', null, '25-Hydroxy Vitamin D3 (Total 25-OH D2 + D3)', 'Hematology, Anemia & Micronutrients', '☀️ Bone & Ovary', 'Optimal level: 30-100 ng/mL; vital for fertility, PCOS, and bone mineralization'),
  ('lab_test', null, 'Serum Vitamin B12 (Cyanocobalamin)', 'Hematology, Anemia & Micronutrients', '⚡ Neurological & Cell', 'Monitor regularly in patients on long-term Metformin therapy'),
  ('lab_test', null, 'Serum Folate & RBC Folate', 'Hematology, Anemia & Micronutrients', '⚡ RBC Folate', 'Evaluates tissue folate sufficiency prior to conception'),
  ('lab_test', null, 'Serum Calcium & Ionic Calcium', 'Hematology, Anemia & Micronutrients', '🦴 Calcium', 'Evaluates bone metabolism, hypocalcemia, and preeclampsia risk factors'),
  ('lab_test', null, 'Serum Magnesium', 'Hematology, Anemia & Micronutrients', '⚡ Micronutrients', 'Important cofactor for insulin sensitivity and prevention of neuromuscular spasms'),
  ('lab_test', null, 'Serum Zinc', 'Hematology, Anemia & Micronutrients', '⚡ Trace Elements', 'Essential for oocyte development, immune function, and epidermal healing'),

  -- ─── 5. Infections & STI Screening ───
  ('lab_test', null, 'High Vaginal Swab (HVS) Gram Stain & Wet Mount', 'Infections & STI Screening', '🛡️ Vaginal Wet Mount', 'Detects bacterial vaginosis (clue cells, Nugent score), trichomonas, and candida'),
  ('lab_test', null, 'Vaginal Swab Aerobic Culture & Antibiotic Sensitivity (Automated)', 'Infections & STI Screening', '🛡️ Microbiology', 'Identifies pathogenic bacteria (Group B Strep, Enterococcus, E. coli) with MIC sensitivity'),
  ('lab_test', null, 'Candida Species Identification & Antifungal Sensitivity', 'Infections & STI Screening', '🛡️ Mycology', 'Differentiates C. albicans from resistant non-albicans species (C. glabrata, C. krusei)'),
  ('lab_test', null, 'Urine Routine & Microscopic Examination', 'Infections & STI Screening', '🛡️ Urinalysis', 'Clean catch midstream morning urine sample; checks pus cells, RBCs, protein, nitrites'),
  ('lab_test', null, 'Urine Culture & Automated Antibiotic Sensitivity (MIC)', 'Infections & STI Screening', '🛡️ Urine Culture', 'Clean catch midstream; colony count > 10^5 CFU/mL indicates significant bacteriuria'),
  ('lab_test', null, 'Chlamydia trachomatis & Neisseria gonorrhoeae DNA PCR', 'Infections & STI Screening', '🛡️ STI Nucleic Acid', 'High-sensitivity multiplex NAAT from cervical swab or first-catch urine'),
  ('lab_test', null, 'Trichomonas vaginalis & Mycoplasma genitalium DNA PCR', 'Infections & STI Screening', '🛡️ STI NAAT Screen', 'Molecular test for atypical cause of non-responsive vaginitis/cervicitis'),
  ('lab_test', null, 'Syphilis Antibody Screen (VDRL / RPR & Treponema TPHA Confirm)', 'Infections & STI Screening', '🛡️ Serology', 'Mandatory antenatal and pre-conceptional screening'),
  ('lab_test', null, 'HIV 1 & 2 4th Gen Duo (p24 Antigen + Antibodies Combo)', 'Infections & STI Screening', '🛡️ Viral Serology', 'Early detection with p24 antigen reduction in diagnostic window period'),
  ('lab_test', null, 'Hepatitis B Surface Antigen (HBsAg - Quantitative/Qualitative)', 'Infections & STI Screening', '🛡️ Viral Hepatitis', 'Mandatory antenatal screen to prevent vertical perinatal transmission'),
  ('lab_test', null, 'Anti-HCV (Hepatitis C Virus Total Antibody)', 'Infections & STI Screening', '🛡️ Hepatitis C', 'Screens for chronic hepatitis C infection'),
  ('lab_test', null, 'Herpes Simplex Virus (HSV 1 & 2) IgG & IgM Serology', 'Infections & STI Screening', '🛡️ Herpes Screen', 'Distinguishes primary acute genital herpes infection from past exposure'),

  -- ─── 6. Cervical Screening & Cytology ───
  ('lab_test', null, 'Liquid-Based Cytology (LBC / ThinPrep Pap Smear)', 'Cervical Screening & Cytology', '🔬 Cervical Cytology', 'Superior specimen preservation and filtration over conventional Pap smear'),
  ('lab_test', null, 'High-Risk HPV DNA PCR with Genotyping (HPV 16, 18 & 12 Others)', 'Cervical Screening & Cytology', '🔬 HR-HPV Screen', 'Gold-standard primary cervical screening for high oncogenic risk HPV strains'),
  ('lab_test', null, 'Cervical Co-Testing (LBC Pap Smear + High-Risk HPV DNA PCR)', 'Cervical Screening & Cytology', '🔬 Dual Co-Testing', 'Highest negative predictive value for cervical intraepithelial neoplasia (CIN)'),
  ('lab_test', null, 'Colposcopy Directed Cervical Punch Biopsy & Histopathology', 'Cervical Screening & Cytology', '🔬 Tissue Biopsy', 'Histopathological grading of CIN 1, CIN 2, CIN 3 / Carcinoma in situ'),
  ('lab_test', null, 'Endometrial Biopsy (Pipelle / Histopathology)', 'Cervical Screening & Cytology', '🔬 Endometrial Tissue', 'Evaluates abnormal uterine bleeding (AUB), hyperplasia, or endometrial malignancy'),

  -- ─── 7. Antenatal & Genetic Diagnostics ───
  ('lab_test', null, 'First Trimester Dual Marker Screen (Free Beta hCG + PAPP-A + NT Scan)', 'Antenatal & Genetic Diagnostics', '🤰 Aneuploidy Screen', 'Performed between 11w0d and 13w6d for Down Syndrome (Trisomy 21, 18, 13) risk calculation'),
  ('lab_test', null, 'Second Trimester Quadruple Marker Screen (AFP, hCG, uE3, Inhibin A)', 'Antenatal & Genetic Diagnostics', '🤰 Genetic Screen', 'Performed between 15w0d and 20w0d when first trimester screen was missed'),
  ('lab_test', null, 'Non-Invasive Prenatal Testing (NIPT / Cell-Free Fetal DNA Screen)', 'Antenatal & Genetic Diagnostics', '🧬 cfDNA Genomics', 'High accuracy non-invasive maternal blood screen from 10 weeks gestation onward'),
  ('lab_test', null, 'Blood Group (ABO) & Rh Typing + Indirect Coomb''s Test (ICT)', 'Antenatal & Genetic Diagnostics', '🩸 Rh Isoimmunization', 'Identifies Rh-negative status and maternal anti-D antibody sensitization'),
  ('lab_test', null, 'Thalassemia Screening by HPLC (Hb Variant / Hemoglobin Electrophoresis)', 'Antenatal & Genetic Diagnostics', '🩸 Thalassemia Trait', 'Essential pre-marital / pre-conceptional screen for HbA2 levels and beta-thalassemia trait'),
  ('lab_test', null, 'TORCH Profile (IgG & IgM for Toxoplasma, Rubella, CMV, HSV)', 'Antenatal & Genetic Diagnostics', '🤰 TORCH Panel', 'Assesses immune protection and acute maternal congenital infections'),
  ('lab_test', null, 'Rubella Virus IgG Antibodies (Immunity Titre)', 'Antenatal & Genetic Diagnostics', '🤰 Vaccine Immunity', 'Confirms protective immunity (Titre > 10 IU/mL) prior to pregnancy'),
  ('lab_test', null, 'Maternal Serum Alpha-Fetoprotein (MSAFP - Neural Tube Defects)', 'Antenatal & Genetic Diagnostics', '🤰 Spina Bifida Screen', 'Screening between 15-20 weeks for open neural tube defects and abdominal wall defects'),

  -- ─── 8. Ultrasound & Imaging Procedures ───
  ('lab_test', null, 'Pelvic Ultrasound (USG Abdomen & Pelvis - Transabdominal)', 'Ultrasound & Imaging Procedures', '📸 Pelvic USG', 'Requires full bladder; evaluates uterus, fibroids, adenomyosis, ovarian morphology'),
  ('lab_test', null, 'Transvaginal Ultrasound (USG TVS - High Resolution)', 'Ultrasound & Imaging Procedures', '📸 High-Res TVS', 'Empty bladder; gold standard for endometrial stripe thickness, AFC, and subtle ovarian pathology'),
  ('lab_test', null, 'Follicular Monitoring Study (Serial TVS Ovulation Tracking - 4-5 Scans)', 'Ultrasound & Imaging Procedures', '📸 Follicular Study', 'Tracking dominant follicle growth (2mm/day), vascularity, and ovulation collapse'),
  ('lab_test', null, '3D/4D Pelvic Ultrasound (Uterine Cavity & Myometrium)', 'Ultrasound & Imaging Procedures', '📸 3D Uterine Cavity', 'Differentiates septate, arcuate, bicornuate uterus and deep infiltrating endometriosis'),
  ('lab_test', null, 'Saline Infusion Sonohysterography (SIS / Saline Hysterography)', 'Ultrasound & Imaging Procedures', '📸 Cavity SIS', 'Distends cavity with saline to delineate endometrial polyps, submucosal fibroids, adhesions'),
  ('lab_test', null, 'Hysterosalpingography (HSG - Fluoroscopic Tubal Patency)', 'Ultrasound & Imaging Procedures', '📸 HSG Tubal Test', 'Performed Day 7 to Day 10 of cycle to verify bilateral fallopian tube spill and contour'),
  ('lab_test', null, 'Pelvic MRI with Contrast (Endometriosis & Fibroid Mapping)', 'Ultrasound & Imaging Procedures', '🧲 Pelvic MRI', 'Precision pre-surgical mapping for deep infiltrating endometriosis (DIE) and rectovaginal septum'),
  ('lab_test', null, 'Digital Bilateral Mammography (Low-Dose Breast Screen)', 'Ultrasound & Imaging Procedures', '📸 Mammogram', 'Annual or biennial breast cancer screen for women aged 40 and older'),
  ('lab_test', null, 'High-Resolution Sonomammography (Bilateral Breast Ultrasound)', 'Ultrasound & Imaging Procedures', '📸 Breast Ultrasound', 'Preferred modality for dense breasts and differentiating cystic from solid breast nodules'),
  ('lab_test', null, 'DEXA Bone Mineral Density Scan (Dual Energy X-Ray Absorptiometry)', 'Ultrasound & Imaging Procedures', '🦴 Bone Density DEXA', 'Evaluates T-score and Z-score of lumbar spine (L1-L4) and femoral neck for osteoporosis')
on conflict do nothing;
