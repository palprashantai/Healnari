import React, { useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { DoseSchedule } from '../../components/DoseSchedule.jsx';
import { RxStatusBadge } from '../../components/RxStatus.jsx';

/* ─── Rich Dummy Data ──────────────────────────────── */
const INITIAL_PATIENTS = [
  {
    id: 1,
    name: 'Priya Sharma',
    age: 28,
    blood: 'B+',
    phone: '+91 98765 43210',
    email: 'priya.sharma@example.com',
    address: 'Indiranagar, Bengaluru, KA',
    since: 'Jan 2023',
    visits: 12,
    diagnosis: 'PCOS — IR Subtype',
    lastVisit: '25 Jun 2026',
    nextVisit: '5 Jul 2026',
    status: 'active',
    alert: 'Elevated TSH (5.2 mIU/L) — review pending',
    height: '163 cm',
    weight: '64.5 kg',
    bmi: '24.2',
    bp: '118/76 mmHg',
    pulse: '72 bpm',
    spo2: '99%',
    temp: '98.4 °F',
    bloodSugar: '112 mg/dL (Fasting)',
    allergies: ['Penicillin', 'Sulfa Drugs'],
    meds: [
      { id: 'RX-101', date: '25 Jun 2026', medName: 'Metformin 500mg', dosage: '500mg', schedule: '1-0-1', duration: '30 Days', refillsLeft: 2, status: 'Active', instructions: 'Take after meals to reduce GI disturbance.', prescribedBy: 'Dr. Sarah Mitchell' },
      { id: 'RX-102', date: '25 Jun 2026', medName: 'Myo-Inositol Sachet 2g', dosage: '2g', schedule: '1-0-0', duration: '30 Days', refillsLeft: 2, status: 'Active', instructions: 'Dissolve in 200ml water on empty stomach.', prescribedBy: 'Dr. Sarah Mitchell' },
      { id: 'RX-103', date: '10 May 2026', medName: 'Vitamin D3 60,000 IU', dosage: '60K IU', schedule: '0-0-1', duration: '8 Weeks', refillsLeft: 0, status: 'Expired', instructions: 'Take weekly with milk after dinner.', prescribedBy: 'Dr. Sarah Mitchell' },
    ],
    reports: [
      {
        id: 'REP-901',
        date: '24 Jun 2026',
        testCategory: 'Pathology',
        testName: 'Comprehensive Thyroid & Metabolic Profile',
        labName: 'Dr. Lal PathLabs',
        status: 'Completed',
        urgent: true,
        results: {
          'TSH (Serum)': { value: '5.2 mIU/L', ref: '0.4 – 4.0 mIU/L', status: 'high' },
          'Free T4': { value: '1.1 ng/dL', ref: '0.8 – 1.8 ng/dL', status: 'normal' },
          'Anti-TPO Ab': { value: '98 IU/mL', ref: '< 35 IU/mL', status: 'high' },
          'Fasting Insulin': { value: '18.4 uIU/mL', ref: '2.6 – 24.9 uIU/mL', status: 'normal' },
          'HOMA-IR Index': { value: '3.8', ref: '< 2.5', status: 'high' },
        },
        interpretation: 'Elevated TSH combined with elevated Anti-TPO titers indicates autoimmune subclinical hypothyroidism. Insulin resistance is evident (HOMA-IR 3.8). Suggest initiating low-dose Levothyroxine 25mcg.',
        doctorAction: 'Patient informed. Follow-up consultation scheduled.',
      },
      {
        id: 'REP-902',
        date: '15 Mar 2026',
        testCategory: 'Imaging',
        testName: 'Pelvic Ultrasound (TVS)',
        labName: 'City Scans & Diagnostics',
        status: 'Completed',
        urgent: false,
        results: {
          'Right Ovarian Volume': { value: '11.4 cc', ref: '< 10 cc', status: 'high' },
          'Left Ovarian Volume': { value: '12.1 cc', ref: '< 10 cc', status: 'high' },
          'Follicle Count': { value: '> 14 peripherally arranged follicles per ovary', ref: '< 12', status: 'high' },
          'Endometrial Thickness': { value: '7.8 mm (Proliferative)', ref: '4 – 12 mm', status: 'normal' },
        },
        interpretation: 'Bilateral enlarged polycystic ovaries with peripheral string-of-pearls follicle pattern, classic for PCOS morphology.',
        doctorAction: 'Reviewed & saved to baseline EMR.',
      },
    ],
    consultations: [
      { date: '25 Jun 2026', type: 'Follow-up', chiefComplaint: 'Weight management difficulty, mild fatigue', assessment: 'Subclinical Hypothyroidism + PCOS Insulin Resistance', plan: 'Continue Metformin & Myo-Inositol. Repeat TSH in 6 weeks.', doctor: 'Dr. Sarah Mitchell' },
      { date: '10 May 2026', type: 'Routine Review', chiefComplaint: 'Irregular cycles (38-45 days)', assessment: 'Anovulatory PCOS cycles', plan: 'Started Vit D3 loading dose. Cycle calendar advised.', doctor: 'Dr. Sarah Mitchell' },
      { date: '15 Jan 2026', type: 'Initial Consultation', chiefComplaint: 'Oligomenorrhea, facial acne, weight gain', assessment: 'PCOS Primary Diagnosis', plan: 'Full hormonal panel & pelvic ultrasound ordered.', doctor: 'Dr. Sarah Mitchell' },
    ],
    medicalHistory: {
      chronicConditions: ['Polycystic Ovary Syndrome (PCOS)', 'Subclinical Hypothyroidism'],
      surgeries: ['Appendectomy (2018)'],
      familyHistory: ['Mother: Type 2 Diabetes Mellitus', 'Maternal Aunt: Hypothyroidism'],
      lifestyle: 'Sedentary work, Non-smoker, Social drinker, Moderate Stress',
    },
    clinicalNotes: [
      { text: 'Patient reports improved cycle regularity with Metformin. Weight lost: 1.5kg over 2 months. Encouraged low-GI diet.', date: '25 Jun 2026 11:30 AM', author: 'Dr. Sarah Mitchell' },
      { text: 'Patient counseled on lifestyle modification and 30 mins daily brisk walk.', date: '10 May 2026 04:15 PM', author: 'Dr. Sarah Mitchell' },
    ],
    payments: [
      { id: 'INV-7801', date: '25 Jun 2026', service: 'PCOS Follow-up Consultation', category: 'Consultation Fee', amount: 799, status: 'Paid', method: 'UPI (GPay)', txnRef: 'UPI-948201', invoiceUrl: '#' },
      { id: 'INV-7802', date: '24 Jun 2026', service: 'Comprehensive Thyroid & Metabolic Lab Panel', category: 'Lab & Diagnostics', amount: 2450, status: 'Paid', method: 'Credit Card', txnRef: 'TXN-882014', invoiceUrl: '#' },
      { id: 'INV-7803', date: '10 May 2026', service: 'Routine Gynecological Review & Vit D Test', category: 'Consultation Fee', amount: 1299, status: 'Paid', method: 'UPI (PhonePe)', txnRef: 'UPI-774102', invoiceUrl: '#' },
      { id: 'INV-7804', date: '15 Mar 2026', service: 'Pelvic TVS Ultrasound Scan', category: 'Imaging Scan', amount: 1800, status: 'Paid', method: 'Net Banking', txnRef: 'HDFC-663219', invoiceUrl: '#' },
    ],
  },
  {
    id: 2,
    name: 'Anita Desai',
    age: 34,
    blood: 'A+',
    phone: '+91 97654 32109',
    email: 'anita.desai@example.com',
    address: 'Koramangala, Bengaluru, KA',
    since: 'Mar 2023',
    visits: 7,
    diagnosis: 'Primary Infertility',
    lastVisit: '20 Jun 2026',
    nextVisit: '10 Jul 2026',
    status: 'active',
    alert: null,
    height: '158 cm',
    weight: '58 kg',
    bmi: '23.2',
    bp: '120/80 mmHg',
    pulse: '76 bpm',
    spo2: '98%',
    temp: '98.6 °F',
    bloodSugar: '95 mg/dL',
    allergies: [],
    meds: [
      { id: 'RX-201', date: '20 Jun 2026', medName: 'Clomiphene Citrate 50mg', dosage: '50mg', schedule: '1-0-0', duration: '5 Days', refillsLeft: 1, status: 'Active', instructions: 'Take from Cycle Day 2 to Day 6.', prescribedBy: 'Dr. Sarah Mitchell' },
      { id: 'RX-202', date: '20 Jun 2026', medName: 'Folic Acid 5mg', dosage: '5mg', schedule: '1-0-0', duration: '90 Days', refillsLeft: 3, status: 'Active', instructions: 'Take daily with breakfast.', prescribedBy: 'Dr. Sarah Mitchell' },
    ],
    reports: [
      {
        id: 'REP-903',
        date: '18 Jun 2026',
        testCategory: 'Pathology',
        testName: 'Ovarian Reserve & Hormone Panel',
        labName: 'Apollo Diagnostics',
        status: 'Completed',
        urgent: false,
        results: {
          'Serum AMH': { value: '2.8 ng/mL', ref: '1.5 – 4.0 ng/mL', status: 'normal' },
          'FSH (Day 3)': { value: '6.5 mIU/mL', ref: '3.5 – 12.5 mIU/mL', status: 'normal' },
          'LH (Day 3)': { value: '5.8 mIU/mL', ref: '2.4 – 12.6 mIU/mL', status: 'normal' },
          'Serum Prolactin': { value: '14.2 ng/mL', ref: '4.8 – 23.3 ng/mL', status: 'normal' },
        },
        interpretation: 'Normal ovarian reserve parameters. Good response potential for ovulation induction protocols.',
        doctorAction: 'Approved for Clomiphene Cycle #2.',
      },
      {
        id: 'REP-904',
        date: '02 May 2026',
        testCategory: 'Imaging',
        testName: 'Hysterosalpingography (HSG Scan)',
        labName: 'City Scans & Diagnostics',
        status: 'Completed',
        urgent: false,
        results: {
          'Uterine Cavity': { value: 'Normal size, smooth contour, no filling defect', ref: 'Normal', status: 'normal' },
          'Bilateral Fallopian Tubes': { value: 'Patent with free peritoneal spill of contrast', ref: 'Patent', status: 'normal' },
        },
        interpretation: 'Normal uterine cavity with bilateral patent Fallopian tubes.',
        doctorAction: 'Tubal factor ruled out.',
      },
    ],
    consultations: [
      { date: '20 Jun 2026', type: 'Follicular Monitoring', chiefComplaint: 'Cycle Day 10 ovulation tracking', assessment: 'Leading follicle 16mm Right Ovary', plan: 'Plan HCG trigger on Day 13.', doctor: 'Dr. Sarah Mitchell' },
      { date: '02 May 2026', type: 'HSG Review', chiefComplaint: 'Reviewing tubal patency scan', assessment: 'Normal pelvic anatomy & patent tubes', plan: 'Proceeding with ovulation induction.', doctor: 'Dr. Sarah Mitchell' },
    ],
    medicalHistory: {
      chronicConditions: ['Primary Subfertility (2 Years TTC)'],
      surgeries: ['None'],
      familyHistory: ['No significant reproductive illness'],
      lifestyle: 'Active yoga practitioner, Non-smoker',
    },
    clinicalNotes: [
      { text: 'Couples counseling completed regarding timed intercourse window. Follicular scan scheduled.', date: '20 Jun 2026 10:00 AM', author: 'Dr. Sarah Mitchell' },
    ],
    payments: [
      { id: 'INV-7805', date: '20 Jun 2026', service: 'Follicular Monitoring Ultrasound', category: 'Ultrasound Scan', amount: 1500, status: 'Paid', method: 'Credit Card', txnRef: 'TXN-902145', invoiceUrl: '#' },
      { id: 'INV-7806', date: '18 Jun 2026', service: 'Ovarian Reserve AMH & Hormone Panel', category: 'Lab & Diagnostics', amount: 3200, status: 'Paid', method: 'UPI (Paytm)', txnRef: 'UPI-302194', invoiceUrl: '#' },
      { id: 'INV-7807', date: '02 May 2026', service: 'HSG Procedure & Specialist Fee', category: 'Procedure', amount: 4500, status: 'Paid', method: 'Health Insurance', txnRef: 'INS-774012', invoiceUrl: '#' },
    ],
  },
  {
    id: 3,
    name: 'Kavita Patel',
    age: 22,
    blood: 'O+',
    phone: '+91 96543 21098',
    email: 'kavita.patel@example.com',
    address: 'Whitefield, Bengaluru, KA',
    since: 'Jun 2024',
    visits: 4,
    diagnosis: 'Oligomenorrhea',
    lastVisit: '10 Jun 2026',
    nextVisit: '30 Jun 2026',
    status: 'active',
    alert: null,
    height: '160 cm',
    weight: '55 kg',
    bmi: '21.5',
    bp: '112/70 mmHg',
    pulse: '68 bpm',
    spo2: '99%',
    temp: '98.2 °F',
    bloodSugar: '88 mg/dL',
    allergies: [],
    meds: [
      { id: 'RX-301', date: '10 Jun 2026', medName: 'Norethisterone 5mg', dosage: '5mg', schedule: '1-0-0', duration: '10 Days', refillsLeft: 1, status: 'Active', instructions: 'Take for 10 days. Bleed expected 2-4 days after stopping.', prescribedBy: 'Dr. Sarah Mitchell' },
    ],
    reports: [
      {
        id: 'REP-905',
        date: '08 Jun 2026',
        testCategory: 'Pathology',
        testName: 'Serum Prolactin & Thyroid Panel',
        labName: 'Dr. Lal PathLabs',
        status: 'Completed',
        urgent: false,
        results: {
          'Serum Prolactin': { value: '12.5 ng/mL', ref: '4.8 – 23.3 ng/mL', status: 'normal' },
          'TSH': { value: '2.1 mIU/L', ref: '0.4 – 4.0 mIU/L', status: 'normal' },
          'Beta-hCG': { value: '< 1.2 mIU/mL (Negative)', ref: '< 5.0 mIU/mL', status: 'normal' },
        },
        interpretation: 'Hyperprolactinemia and Thyroid dysfunction ruled out. Pregnancy test negative.',
        doctorAction: 'Initiated withdrawal bleeding course.',
      },
    ],
    consultations: [
      { date: '10 Jun 2026', type: 'Amenorrhea Evaluation', chiefComplaint: 'No menses for 60 days', assessment: 'Stress-induced hypothalamic oligomenorrhea', plan: 'Norethisterone withdrawal challenge.', doctor: 'Dr. Sarah Mitchell' },
    ],
    medicalHistory: {
      chronicConditions: ['Occasional Anovulatory Cycles'],
      surgeries: ['None'],
      familyHistory: ['Unremarkable'],
      lifestyle: 'College student, High exam stress',
    },
    clinicalNotes: [
      { text: 'Advised stress reduction techniques and regular sleep routine.', date: '10 Jun 2026 02:40 PM', author: 'Dr. Sarah Mitchell' },
    ],
    payments: [
      { id: 'INV-7808', date: '10 Jun 2026', service: 'Amenorrhea Teleconsultation', category: 'Consultation Fee', amount: 499, status: 'Paid', method: 'UPI (GPay)', txnRef: 'UPI-440219', invoiceUrl: '#' },
      { id: 'INV-7809', date: '08 Jun 2026', service: 'Prolactin & Thyroid Screening Lab', category: 'Lab & Diagnostics', amount: 1200, status: 'Paid', method: 'Debit Card', txnRef: 'TXN-110294', invoiceUrl: '#' },
    ],
  },
  {
    id: 4,
    name: 'Aisha Khan',
    age: 29,
    blood: 'AB-',
    phone: '+91 95432 10987',
    email: 'aisha.khan@example.com',
    address: 'HSR Layout, Bengaluru, KA',
    since: 'Sep 2022',
    visits: 18,
    diagnosis: 'Endometriosis Gr.2',
    lastVisit: '1 Jun 2026',
    nextVisit: null,
    status: 'active',
    alert: 'Pain score 7/10 reported. Consider escalating therapy.',
    height: '155 cm',
    weight: '52 kg',
    bmi: '21.6',
    bp: '122/82 mmHg',
    pulse: '78 bpm',
    spo2: '98%',
    temp: '98.5 °F',
    bloodSugar: '92 mg/dL',
    allergies: ['Aspirin'],
    meds: [
      { id: 'RX-401', date: '01 Jun 2026', medName: 'Dienogest 2mg', dosage: '2mg', schedule: '1-0-0', duration: '6 Months', refillsLeft: 3, status: 'Active', instructions: 'Take fixed time daily without interruption.', prescribedBy: 'Dr. Sarah Mitchell' },
      { id: 'RX-402', date: '01 Jun 2026', medName: 'Mefenamic Acid 500mg', dosage: '500mg', schedule: '0-0-1', duration: 'PRN', refillsLeft: 0, status: 'Active', instructions: 'Take during severe dysmenorrhea episodes with food.', prescribedBy: 'Dr. Sarah Mitchell' },
    ],
    reports: [
      {
        id: 'REP-906',
        date: '28 May 2026',
        testCategory: 'Pathology',
        testName: 'CA-125 Biomarker & Inflammatory Screen',
        labName: 'SRL Diagnostics',
        status: 'Completed',
        urgent: true,
        results: {
          'Serum CA-125': { value: '48.5 U/mL', ref: '< 35 U/mL', status: 'high' },
          'ESR': { value: '28 mm/hr', ref: '0 – 20 mm/hr', status: 'high' },
          'hs-CRP': { value: '4.2 mg/L', ref: '< 3.0 mg/L', status: 'high' },
        },
        interpretation: 'Moderately elevated CA-125 consistent with active Grade 2 Pelvic Endometriosis inflammation.',
        doctorAction: 'Escalated progestin suppressive therapy.',
      },
      {
        id: 'REP-907',
        date: '15 Jan 2026',
        testCategory: 'Imaging',
        testName: 'Pelvic MRI with Endometriosis Protocol',
        labName: 'City Scans & Diagnostics',
        status: 'Completed',
        urgent: false,
        results: {
          'Left Ovary': { value: '2.4 cm Endometrioma (Chocolate Cyst)', ref: 'Absent', status: 'high' },
          'Uterosacral Ligaments': { value: 'Thickened with small endometriotic implants', ref: 'Normal', status: 'high' },
          'Pouch of Douglas': { value: 'Minimal obliteration', ref: 'Free', status: 'normal' },
        },
        interpretation: 'Grade 2 pelvic endometriosis with left ovarian endometrioma.',
        doctorAction: 'Medical management initiated over surgical intervention.',
      },
    ],
    consultations: [
      { date: '01 Jun 2026', type: 'Pain Management Review', chiefComplaint: 'Cyclic pelvic pain 7/10, dyspareunia', assessment: 'Active Endometriosis symptom flare', plan: 'Adjusted Dienogest schedule & PRN analgesia.', doctor: 'Dr. Sarah Mitchell' },
    ],
    medicalHistory: {
      chronicConditions: ['Pelvic Endometriosis Grade 2', 'Dysmenorrhea'],
      surgeries: ['Diagnostic Laparoscopy (Nov 2023)'],
      familyHistory: ['Sister: Endometriosis'],
      lifestyle: 'IT Professional, Pilates twice weekly',
    },
    clinicalNotes: [
      { text: 'Discussed conservative management vs laparoscopic ablation. Patient prefers continuing medical suppression with Dienogest.', date: '01 Jun 2026 05:00 PM', author: 'Dr. Sarah Mitchell' },
    ],
    payments: [
      { id: 'INV-7810', date: '01 Jun 2026', service: 'Pain Management In-Person Review', category: 'Consultation Fee', amount: 799, status: 'Pending', method: 'UPI Pending', txnRef: 'REQ-551029', invoiceUrl: '#' },
      { id: 'INV-7811', date: '28 May 2026', service: 'CA-125 Biomarker & Inflammatory Lab', category: 'Lab & Diagnostics', amount: 1950, status: 'Paid', method: 'Credit Card', txnRef: 'TXN-771029', invoiceUrl: '#' },
      { id: 'INV-7812', date: '15 Jan 2026', service: 'Pelvic Contrast MRI Scan', category: 'Imaging Scan', amount: 6500, status: 'Paid', method: 'Health Insurance', txnRef: 'INS-994021', invoiceUrl: '#' },
    ],
  },
  {
    id: 5,
    name: 'Sunita Desai',
    age: 38,
    blood: 'B-',
    phone: '+91 94321 09876',
    email: 'sunita.desai@example.com',
    address: 'Jayanagar, Bengaluru, KA',
    since: 'Nov 2021',
    visits: 24,
    diagnosis: 'PCOS + Type 2 DM',
    lastVisit: '15 May 2026',
    nextVisit: null,
    status: 'inactive',
    alert: null,
    height: '161 cm',
    weight: '72 kg',
    bmi: '27.7',
    bp: '130/84 mmHg',
    pulse: '80 bpm',
    spo2: '97%',
    temp: '98.6 °F',
    bloodSugar: '154 mg/dL (Post-Prandial)',
    allergies: [],
    meds: [
      { id: 'RX-501', date: '15 May 2026', medName: 'Metformin 1000mg ER', dosage: '1000mg', schedule: '1-0-1', duration: '90 Days', refillsLeft: 1, status: 'Active', instructions: 'Take after principal meals.', prescribedBy: 'Dr. Sarah Mitchell' },
      { id: 'RX-502', date: '15 May 2026', medName: 'Sitagliptin 50mg', dosage: '50mg', schedule: '1-0-0', duration: '90 Days', refillsLeft: 1, status: 'Active', instructions: 'Take in morning with water.', prescribedBy: 'Dr. Sarah Mitchell' },
    ],
    reports: [
      {
        id: 'REP-908',
        date: '12 May 2026',
        testCategory: 'Pathology',
        testName: 'Glycemia & Renal Panel',
        labName: 'SRL Diagnostics',
        status: 'Completed',
        urgent: false,
        results: {
          'HbA1c': { value: '7.2%', ref: '< 5.7%', status: 'high' },
          'Fasting Plasma Glucose': { value: '142 mg/dL', ref: '70 – 99 mg/dL', status: 'high' },
          'Serum Creatinine': { value: '0.8 mg/dL', ref: '0.5 – 1.1 mg/dL', status: 'normal' },
        },
        interpretation: 'Suboptimal diabetic control (HbA1c 7.2%). Dose escalation recommended.',
        doctorAction: 'Sitagliptin added to Metformin ER.',
      },
    ],
    consultations: [
      { date: '15 May 2026', type: 'Endocrine Follow-up', chiefComplaint: 'Polydipsia, mild weight gain', assessment: 'T2DM Suboptimal Control + PCOS', plan: 'Escalated therapy, endocrinologist referral.', doctor: 'Dr. Sarah Mitchell' },
    ],
    medicalHistory: {
      chronicConditions: ['Type 2 Diabetes Mellitus', 'PCOS', 'Dyslipidemia'],
      surgeries: ['Cesarean Section (2015)'],
      familyHistory: ['Father: Type 2 DM, CAD'],
      lifestyle: 'Sedentary',
    },
    clinicalNotes: [
      { text: 'Referred to clinical nutritionist for medical nutrition therapy.', date: '15 May 2026 12:15 PM', author: 'Dr. Sarah Mitchell' },
    ],
    payments: [
      { id: 'INV-7813', date: '15 May 2026', service: 'Diabetic & Endocrine Consultation', category: 'Consultation Fee', amount: 799, status: 'Paid', method: 'Cash', txnRef: 'CSH-10492', invoiceUrl: '#' },
      { id: 'INV-7814', date: '12 May 2026', service: 'HbA1c & Renal Function Lab Panel', category: 'Lab & Diagnostics', amount: 1600, status: 'Paid', method: 'UPI (Paytm)', txnRef: 'UPI-883019', invoiceUrl: '#' },
    ],
  },
  {
    id: 6,
    name: 'Divya Menon',
    age: 26,
    blood: 'A-',
    phone: '+91 93210 98765',
    email: 'divya.menon@example.com',
    address: 'Hebbal, Bengaluru, KA',
    since: 'Feb 2024',
    visits: 3,
    diagnosis: 'Low AMH / Diminished Ovarian Reserve',
    lastVisit: '18 Jun 2026',
    nextVisit: '20 Jul 2026',
    status: 'active',
    alert: null,
    height: '165 cm',
    weight: '60 kg',
    bmi: '22.0',
    bp: '116/74 mmHg',
    pulse: '74 bpm',
    spo2: '99%',
    temp: '98.4 °F',
    bloodSugar: '90 mg/dL',
    allergies: [],
    meds: [
      { id: 'RX-601', date: '18 Jun 2026', medName: 'DHEA 25mg', dosage: '25mg', schedule: '1-1-1', duration: '60 Days', refillsLeft: 2, status: 'Active', instructions: 'Take 25mg three times daily.', prescribedBy: 'Dr. Sarah Mitchell' },
      { id: 'RX-602', date: '18 Jun 2026', medName: 'Coenzyme Q10 600mg', dosage: '600mg', schedule: '1-0-0', duration: '60 Days', refillsLeft: 2, status: 'Active', instructions: 'Take with fat-containing breakfast.', prescribedBy: 'Dr. Sarah Mitchell' },
    ],
    reports: [
      {
        id: 'REP-909',
        date: '15 Jun 2026',
        testCategory: 'Pathology',
        testName: 'Ovarian Reserve Markers',
        labName: 'Apollo Diagnostics',
        status: 'Completed',
        urgent: false,
        results: {
          'Serum AMH': { value: '0.9 ng/mL', ref: '1.5 – 4.0 ng/mL', status: 'low' },
          'Antral Follicle Count (AFC)': { value: '5 (Bilateral Total)', ref: '> 10', status: 'low' },
        },
        interpretation: 'Diminished Ovarian Reserve for age. Pre-conception optimization advised promptly.',
        doctorAction: 'Started DHEA & CoQ10 supplementation.',
      },
    ],
    consultations: [
      { date: '18 Jun 2026', type: 'DOR Counseling', chiefComplaint: 'Concerns regarding low AMH results', assessment: 'Diminished Ovarian Reserve', plan: 'Pre-IVF oocyte quality priming protocol.', doctor: 'Dr. Sarah Mitchell' },
    ],
    medicalHistory: {
      chronicConditions: ['Diminished Ovarian Reserve (DOR)'],
      surgeries: ['Ovarian Cystectomy (2022)'],
      familyHistory: ['Mother: Early Menopause (Age 42)'],
      lifestyle: 'Fitness enthusiast, Balanced diet',
    },
    clinicalNotes: [
      { text: 'Discussed fertility preservation vs immediate ART options.', date: '18 Jun 2026 03:20 PM', author: 'Dr. Sarah Mitchell' },
    ],
    payments: [
      { id: 'INV-7815', date: '18 Jun 2026', service: 'DOR Fertility Counseling Session', category: 'Consultation Fee', amount: 999, status: 'Paid', method: 'UPI (GPay)', txnRef: 'UPI-701928', invoiceUrl: '#' },
      { id: 'INV-7816', date: '15 Jun 2026', service: 'AMH & Antral Follicle Count Scan', category: 'Lab & Diagnostics', amount: 2800, status: 'Paid', method: 'Credit Card', txnRef: 'TXN-401928', invoiceUrl: '#' },
    ],
  },
];

/* ─── Write Rx Modal ─────────────────────────── */
function InlineWriteRxModal({ isOpen, onClose, patient, onSaveRx }) {
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('1-0-1');
  const [duration, setDuration] = useState('30 Days');
  const [instructions, setInstructions] = useState('');

  if (!isOpen || !patient) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!medName.trim()) return;
    const newRx = {
      id: `RX-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      medName: `${medName.trim()} ${dosage.trim()}`.trim(),
      dosage: dosage || 'Standard',
      schedule: schedule || '1-0-1',
      duration: duration || '30 Days',
      refillsLeft: 2,
      status: 'Active',
      instructions: instructions || 'Take as directed.',
      prescribedBy: 'Dr. Sarah Mitchell',
    };
    onSaveRx(patient.id, newRx);
    setMedName('');
    setDosage('');
    setSchedule('1-0-1');
    setDuration('30 Days');
    setInstructions('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Write Prescription for ${patient.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Medication Name *</label>
          <input
            type="text"
            required
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
            placeholder="e.g. Metformin, Myo-Inositol, Norethisterone"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Strength / Dosage</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 500mg, 2g, 5mg"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Dose Frequency</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="1-0-1">1-0-1 (Morning & Night)</option>
              <option value="1-0-0">1-0-0 (Morning Only)</option>
              <option value="0-0-1">0-0-1 (Night Only)</option>
              <option value="1-1-1">1-1-1 (Thrice Daily)</option>
              <option value="PRN">PRN (As Needed / SOS)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 10 Days, 30 Days, 3 Months"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Doctor Instructions</label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Take after meals with plenty of water. Avoid alcohol."
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300"
          />
        </div>

        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
            <i className="fas fa-check"></i> Add to EMR Rx
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Order Lab Modal ─────────────────────────── */
function InlineOrderLabModal({ isOpen, onClose, patient, onSaveLab }) {
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Pathology');
  const [labName, setLabName] = useState('Dr. Lal PathLabs');
  const [urgent, setUrgent] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!testName.trim()) return;
    const newReport = {
      id: `REP-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      testCategory: category,
      testName: testName.trim(),
      labName: labName,
      status: 'Pending',
      urgent: urgent,
      results: {
        'Status Note': { value: 'Sample Sent / Order Placed', ref: 'Pending', status: 'normal' },
      },
      interpretation: 'Sample under processing at lab. Results will be uploaded automatically once received.',
      doctorAction: 'Order placed by Dr. Sarah Mitchell.',
    };
    onSaveLab(patient.id, newReport);
    setTestName('');
    setUrgent(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Lab Test for ${patient.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">Test Name / Panel *</label>
          <input
            type="text"
            required
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. Serum AMH, TSH & Free T4, TVS Ultrasound Scan"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="Pathology">Pathology (Blood/Urine)</option>
              <option value="Imaging">Imaging (Ultrasound/MRI)</option>
              <option value="Hormonal">Hormonal Profile</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Diagnostic Partner</label>
            <select
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="Dr. Lal PathLabs">Dr. Lal PathLabs</option>
              <option value="Apollo Diagnostics">Apollo Diagnostics</option>
              <option value="SRL Diagnostics">SRL Diagnostics</option>
              <option value="City Scans & Diagnostics">City Scans & Diagnostics</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="urgentOrder"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="w-4 h-4 text-aubergine-600 rounded border-slate-300 focus:ring-aubergine-300"
          />
          <label htmlFor="urgentOrder" className="text-xs font-bold text-amber-700 cursor-pointer">
            Mark as Urgent / Priority Processing ⚡
          </label>
        </div>

        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
            <i className="fas fa-paper-plane"></i> Send Order
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Record Payment / Charge Modal ─────────────────────────── */
function InlineRecordPaymentModal({ isOpen, onClose, patient, onSavePayment }) {
  const [service, setService] = useState('');
  const [category, setCategory] = useState('Consultation Fee');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI (GPay)');
  const [status, setStatus] = useState('Paid');

  if (!isOpen || !patient) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!service.trim() || !amount) return;
    const newPayment = {
      id: `INV-${Math.floor(7800 + Math.random() * 200)}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      service: service.trim(),
      category: category,
      amount: parseFloat(amount),
      status: status,
      method: method,
      txnRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      invoiceUrl: '#',
    };
    onSavePayment(patient.id, newPayment);
    setService('');
    setAmount('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment / Charge for ${patient.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-bold text-slate-500 mb-1 block">Service / Description *</label>
          <input
            type="text"
            required
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="e.g. Follow-up Consultation Fee, Ultrasound Scan, Blood Test"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="Consultation Fee">Consultation Fee</option>
              <option value="Lab & Diagnostics">Lab & Diagnostics</option>
              <option value="Ultrasound Scan">Ultrasound Scan</option>
              <option value="Procedure">Procedure / Treatment</option>
              <option value="Medication">Medication / Pharmacy</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Amount (₹) *</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 799"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-aubergine-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="UPI (GPay)">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Health Insurance">Health Insurance</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-500 mb-1 block">Payment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white"
            >
              <option value="Paid">Paid (Settled)</option>
              <option value="Pending">Pending</option>
              <option value="Insurance Claimed">Insurance Claimed</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5">
            <i className="fas fa-receipt"></i> Save Payment Invoice
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── View Invoice Modal ─────────────────────────── */
function ViewInvoiceModal({ invoice, patient, isOpen, onClose }) {
  if (!isOpen || !invoice || !patient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Payment Invoice" size="md">
      <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-6 text-slate-800 font-sans shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-aubergine-900 tracking-tight">HealNari Clinic</h2>
            <p className="text-xs text-slate-500">Medical Billing &amp; Payment Receipt</p>
            <p className="text-[11px] text-slate-400 mt-0.5">GSTIN: 29AAAAA0000A1Z5</p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              ● {invoice.status}
            </span>
            <p className="text-xs font-mono font-bold text-slate-600 mt-1">{invoice.id}</p>
            <p className="text-[11px] text-slate-400">{invoice.date}</p>
          </div>
        </div>

        {/* Patient Bar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px]">Billed To</p>
            <p className="font-black text-slate-800 text-sm mt-0.5">{patient.name}</p>
            <p className="text-slate-600">{patient.phone}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px]">Payment Details</p>
            <p className="font-bold text-slate-800 text-xs mt-0.5">{invoice.method}</p>
            <p className="text-slate-500 font-mono text-[11px]">Ref: {invoice.txnRef}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Service Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 font-bold text-slate-800">{invoice.service}</td>
                <td className="p-3 text-slate-600">{invoice.category}</td>
                <td className="p-3 text-right font-black text-slate-900 text-sm">₹{invoice.amount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Total Billed Amount Paid</span>
            <span className="font-black text-aubergine-900 text-base">₹{invoice.amount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => window.print()} className="flex-1 bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
            <i className="fas fa-print"></i> Print Invoice PDF
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── View Rx Document Modal ─────────────────────────── */
function ViewRxDocModal({ rx, patient, isOpen, onClose }) {
  if (!isOpen || !rx || !patient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Prescription Document" size="lg">
      <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-6 text-slate-800 font-sans shadow-sm">
        {/* Clinic Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-aubergine-900 tracking-tight">HealNari Women's Health Clinic</h2>
            <p className="text-xs text-slate-500">Center for Gynaecology, PCOS & Advanced Reproductive Medicine</p>
            <p className="text-[11px] text-slate-400 mt-1">102 Medical Hub, Indiranagar, Bengaluru • Phone: +91 80 4567 8900</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-serif text-aubergine-800 font-bold">Rx</span>
            <p className="text-xs font-mono font-bold text-slate-500">{rx.id}</p>
            <p className="text-xs text-slate-400">{rx.date}</p>
          </div>
        </div>

        {/* Doctor & Patient Bar */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Patient Information</p>
            <p className="font-black text-slate-800 text-sm mt-0.5">{patient.name}</p>
            <p className="text-slate-600">{patient.age} Yrs / {patient.blood} • {patient.phone}</p>
            <p className="text-aubergine-700 font-bold mt-1">Diagnosis: {patient.diagnosis}</p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Prescribing Doctor</p>
            <p className="font-black text-slate-800 text-sm mt-0.5">{rx.prescribedBy}</p>
            <p className="text-slate-600">MD, DGO (Obstetrics & Gynaecology)</p>
            <p className="text-slate-500">Reg No: KMC-84920</p>
          </div>
        </div>

        {/* Prescription Table */}
        <div>
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Prescribed Medications</h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Medication</th>
                  <th className="p-3">Dosage</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-black text-slate-800">{rx.medName}</td>
                  <td className="p-3 font-semibold text-slate-700">{rx.dosage}</td>
                  <td className="p-3">
                    <span className="bg-aubergine-50 text-aubergine-700 border border-aubergine-200 font-bold px-2 py-0.5 rounded text-[11px]">
                      {rx.schedule}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{rx.duration}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs">
          <p className="font-bold text-amber-900 mb-1"><i className="fas fa-info-circle mr-1"></i> Special Doctor Instructions:</p>
          <p className="text-amber-800">{rx.instructions}</p>
        </div>

        {/* Signature & Footer */}
        <div className="flex justify-between items-end pt-4 border-t border-slate-200">
          <div>
            <p className="text-[10px] text-slate-400">Digitally signed & stored in EMR encrypted registry.</p>
            <p className="text-[10px] text-slate-400">Valid until: {rx.duration}</p>
          </div>
          <div className="text-center">
            <div className="font-serif italic text-aubergine-800 text-lg font-bold">Dr. Sarah Mitchell</div>
            <div className="w-32 border-b border-slate-400 my-1 mx-auto"></div>
            <p className="text-[10px] font-bold text-slate-500">Authorized Medical Practitioner Signature</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => window.print()} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
            <i className="fas fa-print"></i> Print Prescription
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50">
            Close Document
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── View Lab Document Modal ─────────────────────────── */
function ViewLabDocModal({ report, patient, isOpen, onClose }) {
  if (!isOpen || !report || !patient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Diagnostic Lab Report Document" size="lg">
      <div className="bg-white p-6 border border-slate-200 rounded-2xl space-y-6 text-slate-800 font-sans shadow-sm">
        {/* Lab Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-black text-sky-900 tracking-tight">{report.labName}</h2>
            <p className="text-xs text-slate-500">NABL & CAP Accredited Diagnostic Laboratory</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Report ID: <span className="font-mono font-bold text-slate-700">{report.id}</span></p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${report.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {report.status}
            </span>
            <p className="text-xs text-slate-400 mt-1">{report.date}</p>
          </div>
        </div>

        {/* Patient Bar */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Patient Name</p>
            <p className="font-black text-slate-800 text-sm">{patient.name}</p>
            <p className="text-slate-600">{patient.age}Y / {patient.blood} • {patient.phone}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Referred By</p>
            <p className="font-black text-slate-800 text-sm">Dr. Sarah Mitchell</p>
            <p className="text-slate-600">HealNari Women's Health Clinic</p>
          </div>
        </div>

        {/* Test Name & Values */}
        <div>
          <h3 className="font-black text-slate-800 text-sm mb-3 flex items-center gap-2">
            <i className="fas fa-vial text-sky-600"></i> {report.testName}
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Test Parameter</th>
                  <th className="p-3">Observed Value</th>
                  <th className="p-3">Reference Range</th>
                  <th className="p-3">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(report.results).map(([param, data]) => (
                  <tr key={param} className={data.status === 'high' || data.status === 'low' ? 'bg-rose-50/50' : ''}>
                    <td className="p-3 font-bold text-slate-800">{param}</td>
                    <td className="p-3 font-black text-slate-900">{data.value}</td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{data.ref}</td>
                    <td className="p-3">
                      {data.status === 'high' && <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">HIGH ↑</span>}
                      {data.status === 'low' && <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px]">LOW ↓</span>}
                      {data.status === 'normal' && <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">NORMAL</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="bg-slate-900 rounded-xl p-4 text-xs text-slate-200 space-y-2">
          <p className="font-bold text-aubergine-300 flex items-center gap-1.5">
            <i className="fas fa-brain"></i> AI Clinical Interpretation & Findings:
          </p>
          <p className="leading-relaxed text-slate-300">{report.interpretation}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => window.print()} className="flex-1 bg-sky-700 hover:bg-sky-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
            <i className="fas fa-file-pdf"></i> Download PDF Report
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-50">
            Close Report
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── FULL PAGE EMR COMPONENT ───────────────────────── */
function PatientEMRFullPage({ patient, onBack, toast, onUpdatePatient }) {
  const [tab, setTab] = useState('overview');
  const [labFilter, setLabFilter] = useState('all');
  const [newNote, setNewNote] = useState('');

  // Sub-modals state
  const [showWriteRx, setShowWriteRx] = useState(false);
  const [showOrderLab, setShowOrderLab] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedRxDoc, setSelectedRxDoc] = useState(null);
  const [selectedLabDoc, setSelectedLabDoc] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  if (!patient) return null;

  const handleAddRx = (patientId, newRx) => {
    const updated = {
      ...patient,
      meds: [newRx, ...patient.meds],
    };
    onUpdatePatient(updated);
    toast(`Prescription added for ${patient.name}.`, 'success');
  };

  const handleAddLab = (patientId, newReport) => {
    const updated = {
      ...patient,
      reports: [newReport, ...patient.reports],
    };
    onUpdatePatient(updated);
    toast(`Lab test requested for ${patient.name}.`, 'success');
  };

  const handleAddPayment = (patientId, newPayment) => {
    const updated = {
      ...patient,
      payments: [newPayment, ...(patient.payments || [])],
    };
    onUpdatePatient(updated);
    toast(`Payment transaction invoice recorded for ${patient.name}.`, 'success');
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const noteObj = {
      text: newNote.trim(),
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      author: 'Dr. Sarah Mitchell',
    };
    const updated = {
      ...patient,
      clinicalNotes: [noteObj, ...patient.clinicalNotes],
    };
    onUpdatePatient(updated);
    setNewNote('');
    toast('Clinical note saved to EMR.', 'success');
  };

  const filteredReports = patient.reports.filter((r) => {
    if (labFilter === 'all') return true;
    return r.testCategory.toLowerCase() === labFilter.toLowerCase();
  });

  const totalPaid = (patient.payments || []).reduce((acc, curr) => (curr.status === 'Paid' ? acc + curr.amount : acc), 0);
  const totalPending = (patient.payments || []).reduce((acc, curr) => (curr.status === 'Pending' ? acc + curr.amount : acc), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Navigation Breadcrumb Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all"
        >
          <i className="fas fa-arrow-left text-aubergine-600"></i> Back to Patient Registry
        </button>
        <p className="text-xs text-slate-400 font-medium hidden sm:block">
          Doctor Portal &gt; Patients &amp; EMR &gt; <span className="text-slate-700 font-bold">{patient.name}</span>
        </p>
      </div>

      {/* Main Full Page EMR Banner */}
      <div className="rounded-3xl p-6 text-white shadow-lg space-y-6 bg-gradient-to-br from-aubergine-900 via-aubergine-600 to-magenta-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-white/15 text-white font-black text-3xl flex items-center justify-center border-2 border-white/20 shadow-inner flex-shrink-0 font-serif">
              {patient.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white font-black text-2xl tracking-tight font-serif">{patient.name}</h1>
                <span className="bg-white/20 text-white text-xs font-mono font-bold px-3 py-1 rounded-full border border-white/20">
                  ID: #{patient.id * 1042}
                </span>
                {patient.status === 'active' && (
                  <span className="bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/50 shadow-xs">
                    ● Active Patient
                  </span>
                )}
              </div>
              <p className="text-aubergine-100 text-sm">
                {patient.age} Years Female • Blood Group: <strong className="text-white font-black">{patient.blood}</strong> • Phone: {patient.phone}
              </p>
              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                <p className="text-aubergine-200 text-xs font-semibold flex items-center gap-1.5">
                  <i className="fas fa-stethoscope text-magenta-200"></i> Primary Diagnosis: <span className="text-amber-300 font-bold">{patient.diagnosis}</span>
                </p>
                <span className="text-white/40 text-xs">•</span>
                <span className="text-magenta-200 text-[11px] font-medium italic tracking-wide">
                  — AI Care, Every Woman, Every Stage —
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3 flex-wrap self-stretch md:self-center justify-end">
            <button
              onClick={() => setShowWriteRx(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-emerald-900/30"
            >
              <i className="fas fa-file-prescription text-sm"></i> Write Prescription
            </button>
            <button
              onClick={() => setShowOrderLab(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-sky-900/30"
            >
              <i className="fas fa-vial text-sm"></i> Order Lab Test
            </button>
            <button
              onClick={() => setShowRecordPayment(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-md hover:shadow-amber-900/30"
            >
              <i className="fas fa-receipt text-sm"></i> Record Payment
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-3 rounded-2xl border border-white/20 transition-all flex items-center gap-2"
            >
              <i className="fas fa-print"></i> Print EMR
            </button>
          </div>
        </div>

        {/* Quick EMR Metrics Grid inside Header */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
            <span className="text-white/60 text-[11px] block font-medium">Consultations</span>
            <span className="font-black text-white text-lg">{patient.visits} Visits</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
            <span className="text-white/60 text-[11px] block font-medium">Active Rx</span>
            <span className="font-black text-white text-lg">{patient.meds.filter((m) => m.status === 'Active').length} Active</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
            <span className="text-white/60 text-[11px] block font-medium">Lab &amp; Scans</span>
            <span className="font-black text-white text-lg">{patient.reports.length} Reports</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
            <span className="text-white/60 text-[11px] block font-medium">Total Billed</span>
            <span className="font-black text-white text-lg">₹{(totalPaid + totalPending).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 backdrop-blur-xs">
            <span className="text-white/60 text-[11px] block font-medium">Last Visit Date</span>
            <span className="font-black text-white text-lg">{patient.lastVisit}</span>
          </div>
        </div>
      </div>

      {/* Clinical Alert Banner */}
      {patient.alert && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-xs shadow-xs">
          <i className="fas fa-triangle-exclamation text-rose-500 text-lg mt-0.5 flex-shrink-0"></i>
          <div>
            <p className="font-black text-rose-900 text-sm">Critical Clinical Alert</p>
            <p className="text-rose-800 mt-0.5">{patient.alert}</p>
          </div>
        </div>
      )}

      {/* Main Full Page Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        <div className="flex gap-2 text-xs font-bold overflow-x-auto">
          {[
            { key: 'overview', label: '📋 Patient Overview & Vitals' },
            { key: 'prescriptions', label: `💊 Prescriptions (${patient.meds.length})` },
            { key: 'reports', label: `🧪 Lab & Reports (${patient.reports.length})` },
            { key: 'payments', label: `💳 Payments & Billing (${(patient.payments || []).length})` },
            { key: 'consultations', label: `📅 Consultations (${patient.consultations.length})` },
            { key: 'history', label: '🩸 Medical History' },
            { key: 'notes', label: `📝 Clinical Notes (${patient.clinicalNotes.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 rounded-xl whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-aubergine-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT AREAS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm min-h-[400px]">
        {/* Tab 1: OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Vitals Cards */}
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-3">Recorded Patient Vitals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Blood Pressure</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.bp}</p>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <i className="fas fa-circle-check"></i> Optimal BP Range
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Body Mass Index (BMI)</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.bmi} <span className="text-xs font-normal text-slate-500">({patient.weight})</span></p>
                  <span className="text-[10px] text-slate-500 font-medium block mt-1">Height: {patient.height}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Pulse / SpO2</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.pulse} <span className="text-xs font-normal text-slate-500">/ {patient.spo2}</span></p>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <i className="fas fa-heart-pulse"></i> Normal Resting Rate
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-slate-400 font-bold text-[10px] uppercase">Fasting Glucose</p>
                  <p className="font-black text-slate-900 text-lg mt-1">{patient.bloodSugar}</p>
                  <span className="text-[10px] text-amber-600 font-bold block mt-1">Monitored Metric</span>
                </div>
              </div>
            </div>

            {/* Allergies & Key Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <i className="fas fa-hand-dots text-rose-500"></i> Known Allergies &amp; Adverse Reactions
                </h4>
                {patient.allergies.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="bg-rose-100 text-rose-800 font-bold px-3 py-1.5 rounded-xl border border-rose-200 text-xs flex items-center gap-1.5">
                        <i className="fas fa-triangle-exclamation text-rose-600"></i> {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No drug allergies reported in EMR.</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <i className="fas fa-wallet text-emerald-600"></i> Payment &amp; Financial Summary
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] block uppercase">Total Settled Paid</span>
                    <span className="font-black text-emerald-700 text-base">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] block uppercase">Outstanding Due</span>
                    <span className={`font-black text-base ${totalPending > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      ₹{totalPending.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Prescriptions Preview */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Active Prescriptions Snapshot</h3>
                <button onClick={() => setTab('prescriptions')} className="text-xs text-aubergine-700 font-bold hover:underline">
                  View Full Rx Registry ({patient.meds.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patient.meds.slice(0, 2).map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{m.medName}</p>
                      <p className="text-slate-500 mt-1">{m.instructions}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="bg-aubergine-100 text-aubergine-800 font-bold px-3 py-1 rounded-xl border border-aubergine-200 text-xs">
                        {m.schedule}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">{m.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Lab Findings Snapshot */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Latest Diagnostic Report</h3>
                <button onClick={() => setTab('reports')} className="text-xs text-sky-700 font-bold hover:underline">
                  View All Lab Reports ({patient.reports.length}) →
                </button>
              </div>
              {patient.reports.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900 text-sm">{patient.reports[0].testName}</span>
                    <span className="text-slate-500 font-medium">Date: {patient.reports[0].date}</span>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 text-slate-200">
                    <p className="font-bold text-aubergine-300 mb-1 flex items-center gap-1.5">
                      <i className="fas fa-brain"></i> AI Interpretation Summary:
                    </p>
                    <p className="leading-relaxed text-slate-300">{patient.reports[0].interpretation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: PRESCRIPTIONS */}
        {tab === 'prescriptions' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-base">Medication &amp; Prescription Records</h3>
                <p className="text-xs text-slate-500">History of active and completed medication courses</p>
              </div>
              <button
                onClick={() => setShowWriteRx(true)}
                className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className="fas fa-plus"></i> Write New Rx
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {patient.meds.map((m) => (
                <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-aubergine-300 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">{m.medName}</span>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                            m.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          ● {m.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">
                        Prescription ID: <span className="font-mono font-bold text-slate-600">{m.id}</span> • Prescribed on {m.date} by {m.prescribedBy}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedRxDoc(m)}
                      className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl border border-slate-200 text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <i className="fas fa-file-prescription text-aubergine-600"></i> View Digital Rx Document
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-slate-100 text-slate-700">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block uppercase">Dose Frequency</span>
                      <span className="font-black text-aubergine-800 text-sm">{m.schedule}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block uppercase">Course Duration</span>
                      <span className="font-black text-slate-800 text-sm">{m.duration}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block uppercase">Authorized Refills</span>
                      <span className="font-black text-slate-800 text-sm">{m.refillsLeft} Remaining</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-amber-900">
                    <strong>Doctor Instructions:</strong> {m.instructions}
                  </div>
                </div>
              ))}

              {patient.meds.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-400">No prescription records found for this patient.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: LAB & REPORTS */}
        {tab === 'reports' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-black text-slate-800 text-base">Diagnostic Lab &amp; Imaging Reports</h3>
                <p className="text-xs text-slate-500">Pathology scans, ultrasound imaging and hormonal analysis</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {['all', 'pathology', 'imaging'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLabFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-lg capitalize transition-all ${
                        labFilter === cat ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowOrderLab(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <i className="fas fa-plus"></i> Order New Lab
                </button>
              </div>
            </div>

            <div className="space-y-5 text-xs">
              {filteredReports.map((r) => (
                <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-sky-300 transition-all space-y-4">
                  <div className="flex justify-between items-start flex-wrap gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">{r.testName}</span>
                        {r.urgent && <span className="bg-rose-100 text-rose-700 font-bold px-3 py-0.5 rounded-full text-[11px]">⚡ Priority Urgent</span>}
                      </div>
                      <p className="text-slate-400 text-xs mt-1">
                        Category: <strong className="text-slate-700">{r.testCategory}</strong> • Lab: {r.labName} • Date: {r.date}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedLabDoc(r)}
                      className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-4 py-2 rounded-xl border border-sky-200 transition-colors flex items-center gap-2 shadow-xs"
                    >
                      <i className="fas fa-file-pdf"></i> Full Diagnostic Report PDF
                    </button>
                  </div>

                  {/* Results preview table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Test Parameter</th>
                          <th className="p-3">Observed Value</th>
                          <th className="p-3">Reference Range</th>
                          <th className="p-3">Status Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(r.results).map(([k, v]) => (
                          <tr key={k} className={v.status === 'high' || v.status === 'low' ? 'bg-rose-50/40' : ''}>
                            <td className="p-3 font-bold text-slate-800">{k}</td>
                            <td className={`p-3 font-black text-sm ${v.status === 'high' ? 'text-rose-600' : v.status === 'low' ? 'text-amber-600' : 'text-emerald-700'}`}>
                              {v.value}
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-xs">{v.ref}</td>
                            <td className="p-3">
                              {v.status === 'high' && <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">HIGH ↑</span>}
                              {v.status === 'low' && <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px]">LOW ↓</span>}
                              {v.status === 'normal' && <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">NORMAL</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 text-slate-200">
                    <p className="font-bold text-aubergine-300 text-xs mb-1 flex items-center gap-1.5">
                      <i className="fas fa-brain"></i> AI Clinical Interpretation:
                    </p>
                    <p className="text-slate-300 leading-relaxed">{r.interpretation}</p>
                  </div>
                </div>
              ))}

              {filteredReports.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-400">No lab reports found in this category.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: PAYMENTS & BILLING */}
        {tab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-black text-slate-800 text-base">Payment &amp; Billing History</h3>
                <p className="text-xs text-slate-500">Invoices, consultation fees, diagnostic charges &amp; payment receipts</p>
              </div>

              <button
                onClick={() => setShowRecordPayment(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className="fas fa-receipt"></i> Record Payment / Charge
              </button>
            </div>

            {/* Financial Summary Metric Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Total Amount Billed</span>
                <p className="font-black text-slate-900 text-xl mt-1">₹{(totalPaid + totalPending).toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-slate-500 font-medium">Cumulative consultations &amp; lab orders</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Total Settled Payments</span>
                <p className="font-black text-emerald-700 text-xl mt-1">₹{totalPaid.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <i className="fas fa-check-circle"></i> Successfully Received
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Outstanding Pending Due</span>
                <p className={`font-black text-xl mt-1 ${totalPending > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  ₹{totalPending.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {totalPending > 0 ? 'Payment reminder pending' : 'Zero pending dues'}
                </span>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Invoice ID</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Service Description</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Invoice Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(patient.payments || []).map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-800">{pay.id}</td>
                      <td className="p-3.5 text-slate-600">{pay.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{pay.service}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded text-[11px]">
                          {pay.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{pay.method}</td>
                      <td className="p-3.5 font-black text-slate-900 text-sm">₹{pay.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                            pay.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : pay.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          ● {pay.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedInvoice(pay)}
                          className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] transition-colors shadow-xs"
                        >
                          <i className="fas fa-file-invoice text-aubergine-600 mr-1"></i> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(patient.payments || []).length === 0 && (
                <div className="text-center py-12 text-slate-400">No payment transaction records found.</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: CONSULTATIONS */}
        {tab === 'consultations' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-black text-slate-800 text-base mb-2">Chronological Consultation Logs</h3>
            {patient.consultations.map((c, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-aubergine-200 transition-all space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-base">{c.type}</span>
                  <span className="text-slate-500 font-medium">📅 Consultation Date: {c.date}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Chief Complaint</span>
                    <span className="text-slate-800 font-medium text-xs mt-1 block">{c.chiefComplaint}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Clinical Assessment</span>
                    <span className="text-aubergine-800 font-bold text-xs mt-1 block">{c.assessment}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Management Plan</span>
                    <span className="text-slate-800 font-medium text-xs mt-1 block">{c.plan}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 6: MEDICAL HISTORY */}
        {tab === 'history' && (
          <div className="space-y-5 text-xs">
            <h3 className="font-black text-slate-800 text-base mb-2">Patient Medical Profile &amp; History</h3>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
                <i className="fas fa-notes-medical text-aubergine-600"></i> Chronic Medical Conditions
              </h4>
              <div className="flex gap-2 flex-wrap">
                {patient.medicalHistory.chronicConditions.map((cond, i) => (
                  <span key={i} className="bg-aubergine-100 text-aubergine-800 font-bold px-4 py-1.5 rounded-xl text-xs border border-aubergine-200">
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <i className="fas fa-scissors text-slate-500"></i> Surgical History
                </h4>
                <p className="text-slate-700 font-medium text-xs">{patient.medicalHistory.surgeries.join(', ') || 'None reported'}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <i className="fas fa-users text-slate-500"></i> Family Medical History
                </h4>
                <p className="text-slate-700 font-medium text-xs">{patient.medicalHistory.familyHistory.join(', ') || 'None reported'}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <i className="fas fa-heart-pulse text-slate-500"></i> Lifestyle, Habits &amp; Diet
              </h4>
              <p className="text-slate-700 font-medium text-xs">{patient.medicalHistory.lifestyle}</p>
            </div>
          </div>
        )}

        {/* Tab 7: CLINICAL NOTES */}
        {tab === 'notes' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-black text-slate-800 text-base mb-1">Clinical Progress Notes</h3>
              <p className="text-xs text-slate-500">Record timestamped clinical observations into the patient EMR file</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Add New Progress Note</h4>
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type clinical observations, treatment modifications, or patient updates here..."
                className="w-full border border-slate-200 rounded-xl p-4 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-white shadow-xs"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddNote}
                  className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  <i className="fas fa-save"></i> Save Clinical Note
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {patient.clinicalNotes.map((note, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                  <p className="text-slate-800 leading-relaxed font-medium text-xs">{note.text}</p>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                    <span>Recorded by {note.author}</span>
                    <span>🕒 {note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub Modals */}
      <InlineWriteRxModal isOpen={showWriteRx} onClose={() => setShowWriteRx(false)} patient={patient} onSaveRx={handleAddRx} />
      <InlineOrderLabModal isOpen={showOrderLab} onClose={() => setShowOrderLab(false)} patient={patient} onSaveLab={handleAddLab} />
      <InlineRecordPaymentModal isOpen={showRecordPayment} onClose={() => setShowRecordPayment(false)} patient={patient} onSavePayment={handleAddPayment} />
      <ViewRxDocModal rx={selectedRxDoc} patient={patient} isOpen={!!selectedRxDoc} onClose={() => setSelectedRxDoc(null)} />
      <ViewLabDocModal report={selectedLabDoc} patient={patient} isOpen={!!selectedLabDoc} onClose={() => setSelectedLabDoc(null)} />
      <ViewInvoiceModal invoice={selectedInvoice} patient={patient} isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  );
}

/* ─── Main Component ─────────────────────────── */
function DoctorPatients() {
  const toast = useToast();
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const handleUpdatePatient = (updatedPatient) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
    setSelectedPatient(updatedPatient);
  };

  // If a patient is selected, render the FULL PAGE EMR view!
  if (selectedPatient) {
    return (
      <PatientEMRFullPage
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
        toast={toast}
        onUpdatePatient={handleUpdatePatient}
      />
    );
  }

  // Filter logic for main patient registry grid
  const filtered = patients.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Patients &amp; EMR</h1>
          <p className="text-sm text-slate-500">Comprehensive patient electronic medical records, prescriptions &amp; lab histories</p>
        </div>
        <button
          onClick={() => toast('New patient registration form opened.', 'info')}
          className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <i className="fas fa-user-plus"></i> Add Patient
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name, phone, or diagnosis..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-aubergine-300 bg-slate-50"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            ['all', 'All Patients'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                filterStatus === v
                  ? 'bg-aubergine-600 text-white border-aubergine-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-aubergine-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 font-medium">{filtered.length} results</p>
      </div>

      {/* Patient Cards List */}
      <div className="space-y-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-aubergine-300 transition-all overflow-hidden group p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-aubergine-100 text-aubergine-700 font-black text-xl flex items-center justify-center shadow-inner">
                {p.name.split(' ').map((n) => n[0]).join('')}
              </div>
              {p.status === 'active' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-800 text-base">{p.name}</h3>
                <span className="text-[11px] text-slate-400 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded">ID: #{p.id * 1042}</span>
                {p.alert && <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">⚠ {p.alert}</span>}
              </div>

              <p className="text-xs text-aubergine-700 font-bold">Diagnosis: {p.diagnosis}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  <i className="fas fa-user mr-1 text-slate-400"></i> {p.age}F • Blood: <strong>{p.blood}</strong>
                </span>
                <span>
                  <i className="fas fa-file-prescription mr-1 text-emerald-500"></i> {p.meds.length} Prescriptions
                </span>
                <span>
                  <i className="fas fa-vial mr-1 text-sky-500"></i> {p.reports.length} Lab Reports
                </span>
                <span>
                  <i className="fas fa-calendar-check mr-1 text-slate-400"></i> Last: {p.lastVisit}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
              <button
                onClick={() => toast(`Calling ${p.name} at ${p.phone}...`, 'info')}
                className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center transition-colors shadow-xs"
                title={`Call ${p.phone}`}
              >
                <i className="fas fa-phone text-sm"></i>
              </button>
              <button
                onClick={() => setSelectedPatient(p)}
                className="bg-aubergine-700 hover:bg-aubergine-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
              >
                <i className="fas fa-folder-open text-amber-300"></i> Open Complete EMR Page
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-xs">
              <i className="fas fa-users-slash text-3xl text-slate-300"></i>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">No Patients Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">We couldn't find any patient record matching your search filter.</p>
            <button
              onClick={() => {
                setSearch('');
                setFilterStatus('all');
              }}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorPatients;
