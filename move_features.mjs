import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';
const FEATURES_DIR = path.join(SRC_DIR, 'features');

const moves = [
  // Appointments
  { from: 'pages/patient/Appointments.jsx', to: 'features/appointments/pages/PatientAppointments.jsx' },
  { from: 'pages/doctor/Appointments.jsx', to: 'features/appointments/pages/DoctorAppointments.jsx' },
  
  // Billing
  { from: 'pages/patient/Billing.jsx', to: 'features/billing/pages/PatientBilling.jsx' },
  { from: 'pages/doctor/Billing.jsx', to: 'features/billing/pages/DoctorBilling.jsx' },
  { from: 'pages/admin/Revenue.jsx', to: 'features/billing/pages/AdminRevenue.jsx' },
  
  // Telemedicine
  { from: 'pages/doctor/Telemedicine.jsx', to: 'features/telemedicine/pages/DoctorTelemedicine.jsx' },
  
  // Users
  { from: 'pages/admin/Users.jsx', to: 'features/users/pages/AdminUsers.jsx' },
  { from: 'pages/doctor/Staff.jsx', to: 'features/users/pages/DoctorStaff.jsx' },
  { from: 'pages/patient/Family.jsx', to: 'features/users/pages/PatientFamily.jsx' },
  
  // Health Records
  { from: 'pages/doctor/Patients.jsx', to: 'features/health-records/pages/DoctorPatients.jsx' },
  { from: 'pages/doctor/Prescriptions.jsx', to: 'features/health-records/pages/DoctorPrescriptions.jsx' },
  { from: 'pages/patient/Prescriptions.jsx', to: 'features/health-records/pages/PatientPrescriptions.jsx' },
  { from: 'pages/patient/Records.jsx', to: 'features/health-records/pages/PatientRecords.jsx' },
  { from: 'pages/patient/Tracking.jsx', to: 'features/health-records/pages/PatientTracking.jsx' },
  { from: 'components/features/CycleTracker.jsx', to: 'features/health-records/components/CycleTracker.jsx' },
  { from: 'components/features/SymptomChecker.jsx', to: 'features/health-records/components/SymptomChecker.jsx' },
  { from: 'components/landing/LabTests.jsx', to: 'features/health-records/components/LabTests.jsx' },
  { from: 'components/features/HealthTips.jsx', to: 'features/health-records/components/HealthTips.jsx' },
  { from: 'components/features/GuideModal.jsx', to: 'features/health-records/components/GuideModal.jsx' },
  
  // Discovery
  { from: 'pages/patient/Discovery.jsx', to: 'features/discovery/pages/PatientDiscovery.jsx' },
  { from: 'components/landing/Doctors.jsx', to: 'features/discovery/components/Doctors.jsx' },
  { from: 'components/landing/Conditions.jsx', to: 'features/discovery/components/Conditions.jsx' },
  { from: 'components/landing/Outcomes.jsx', to: 'features/discovery/components/Outcomes.jsx' },
  
  // Dashboards & Layouts
  { from: 'pages/admin/Dashboard.jsx', to: 'features/dashboards/pages/AdminDashboard.jsx' },
  { from: 'pages/doctor/Dashboard.jsx', to: 'features/dashboards/pages/DoctorDashboard.jsx' },
  { from: 'pages/patient/Dashboard.jsx', to: 'features/dashboards/pages/PatientDashboard.jsx' },
  { from: 'layouts/AdminLayout.jsx', to: 'features/dashboards/layouts/AdminLayout.jsx' },
  { from: 'layouts/DoctorLayout.jsx', to: 'features/dashboards/layouts/DoctorLayout.jsx' },
  { from: 'layouts/PatientLayout.jsx', to: 'features/dashboards/layouts/PatientLayout.jsx' },
  
  // Reports
  { from: 'pages/admin/Reports.jsx', to: 'features/reports/pages/AdminReports.jsx' },
  { from: 'pages/doctor/Reports.jsx', to: 'features/reports/pages/DoctorReports.jsx' },
  
  // Admin Operations
  { from: 'pages/admin/CMS.jsx', to: 'features/admin/pages/AdminCMS.jsx' },
  { from: 'pages/admin/Clinics.jsx', to: 'features/admin/pages/AdminClinics.jsx' },
  { from: 'pages/admin/Verification.jsx', to: 'features/admin/pages/AdminVerification.jsx' },
  
  // Landing (Marketing)
  { from: 'pages/LandingPage.jsx', to: 'features/landing/pages/LandingPage.jsx' },
  { from: 'components/landing/Hero.jsx', to: 'features/landing/components/Hero.jsx' },
  { from: 'components/landing/Stats.jsx', to: 'features/landing/components/Stats.jsx' },
  { from: 'components/landing/HowItWorks.jsx', to: 'features/landing/components/HowItWorks.jsx' },
  { from: 'components/landing/PcosDiagram.jsx', to: 'features/landing/components/PcosDiagram.jsx' },
  { from: 'components/landing/Testimonials.jsx', to: 'features/landing/components/Testimonials.jsx' },
  { from: 'components/landing/Faq.jsx', to: 'features/landing/components/Faq.jsx' },
  { from: 'components/landing/NewsletterSignup.jsx', to: 'features/landing/components/NewsletterSignup.jsx' },
  { from: 'components/landing/Header.jsx', to: 'features/landing/components/Header.jsx' },
  { from: 'components/landing/Footer.jsx', to: 'features/landing/components/Footer.jsx' }
];

// Create dirs and move files
for (const move of moves) {
  const fromPath = path.join(SRC_DIR, move.from);
  const toPath = path.join(SRC_DIR, move.to);
  
  if (fs.existsSync(fromPath)) {
    fs.mkdirSync(path.dirname(toPath), { recursive: true });
    fs.renameSync(fromPath, toPath);
    console.log(`Moved: ${move.from} -> ${move.to}`);
  } else {
    console.warn(`File not found: ${fromPath}`);
  }
}

// Write the mapping to a JSON file for the import fixer script
fs.writeFileSync('moves.json', JSON.stringify(moves, null, 2));
console.log('moves.json created for import fixing.');
