import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');

const moves = [
  // DOCTOR
  { from: 'features/dashboards/pages/DoctorDashboard.jsx', to: 'doctor/pages/Dashboard.jsx' },
  { from: 'features/appointments/pages/DoctorAppointments.jsx', to: 'doctor/pages/Appointments.jsx' },
  { from: 'features/billing/pages/DoctorBilling.jsx', to: 'doctor/pages/Billing.jsx' },
  { from: 'features/health-records/pages/DoctorPatients.jsx', to: 'doctor/pages/Patients.jsx' },
  { from: 'features/health-records/pages/DoctorPrescriptions.jsx', to: 'doctor/pages/Prescriptions.jsx' },
  { from: 'features/reports/pages/DoctorReports.jsx', to: 'doctor/pages/Reports.jsx' },
  { from: 'features/users/pages/DoctorStaff.jsx', to: 'doctor/pages/Staff.jsx' },
  { from: 'features/telemedicine/pages/DoctorTelemedicine.jsx', to: 'doctor/pages/Telemedicine.jsx' },
  { from: 'features/dashboards/layouts/DoctorLayout.jsx', to: 'doctor/layouts/DoctorLayout.jsx' },

  // PATIENT
  { from: 'features/dashboards/pages/PatientDashboard.jsx', to: 'patient/pages/Dashboard.jsx' },
  { from: 'features/appointments/pages/PatientAppointments.jsx', to: 'patient/pages/Appointments.jsx' },
  { from: 'features/billing/pages/PatientBilling.jsx', to: 'patient/pages/Billing.jsx' },
  { from: 'features/discovery/pages/PatientDiscovery.jsx', to: 'patient/pages/Discovery.jsx' },
  { from: 'features/users/pages/PatientFamily.jsx', to: 'patient/pages/Family.jsx' },
  { from: 'features/health-records/pages/PatientPrescriptions.jsx', to: 'patient/pages/Prescriptions.jsx' },
  { from: 'features/health-records/pages/PatientRecords.jsx', to: 'patient/pages/Records.jsx' },
  { from: 'features/health-records/pages/PatientTracking.jsx', to: 'patient/pages/Tracking.jsx' },
  { from: 'features/dashboards/layouts/PatientLayout.jsx', to: 'patient/layouts/PatientLayout.jsx' },

  // ADMIN
  { from: 'features/dashboards/pages/AdminDashboard.jsx', to: 'admin/pages/Dashboard.jsx' },
  { from: 'features/admin/pages/AdminCMS.jsx', to: 'admin/pages/CMS.jsx' },
  { from: 'features/admin/pages/AdminClinics.jsx', to: 'admin/pages/Clinics.jsx' },
  { from: 'features/reports/pages/AdminReports.jsx', to: 'admin/pages/Reports.jsx' },
  { from: 'features/billing/pages/AdminRevenue.jsx', to: 'admin/pages/Revenue.jsx' },
  { from: 'features/users/pages/AdminUsers.jsx', to: 'admin/pages/Users.jsx' },
  { from: 'features/admin/pages/AdminVerification.jsx', to: 'admin/pages/Verification.jsx' },
  { from: 'features/dashboards/layouts/AdminLayout.jsx', to: 'admin/layouts/AdminLayout.jsx' },

  // LANDING
  { from: 'features/landing/pages/LandingPage.jsx', to: 'landing/pages/LandingPage.jsx' },
  { from: 'features/landing/components/Hero.jsx', to: 'landing/components/Hero.jsx' },
  { from: 'features/landing/components/Stats.jsx', to: 'landing/components/Stats.jsx' },
  { from: 'features/landing/components/HowItWorks.jsx', to: 'landing/components/HowItWorks.jsx' },
  { from: 'features/landing/components/PcosDiagram.jsx', to: 'landing/components/PcosDiagram.jsx' },
  { from: 'features/landing/components/Testimonials.jsx', to: 'landing/components/Testimonials.jsx' },
  { from: 'features/landing/components/Faq.jsx', to: 'landing/components/Faq.jsx' },
  { from: 'features/landing/components/NewsletterSignup.jsx', to: 'landing/components/NewsletterSignup.jsx' },
  { from: 'features/landing/components/Header.jsx', to: 'landing/components/Header.jsx' },
  { from: 'features/landing/components/Footer.jsx', to: 'landing/components/Footer.jsx' },
  { from: 'features/health-records/components/LabTests.jsx', to: 'landing/components/LabTests.jsx' },
  { from: 'features/discovery/components/Doctors.jsx', to: 'landing/components/Doctors.jsx' },
  { from: 'features/discovery/components/Conditions.jsx', to: 'landing/components/Conditions.jsx' },
  { from: 'features/discovery/components/Outcomes.jsx', to: 'landing/components/Outcomes.jsx' },

  // TOOLS
  { from: 'features/health-records/components/CycleTracker.jsx', to: 'tools/CycleTracker.jsx' },
  { from: 'features/health-records/components/SymptomChecker.jsx', to: 'tools/SymptomChecker.jsx' },
  { from: 'features/health-records/components/HealthTips.jsx', to: 'tools/HealthTips.jsx' },
  { from: 'features/health-records/components/GuideModal.jsx', to: 'tools/GuideModal.jsx' },
  { from: 'components/common/AuthModal.jsx', to: 'tools/AuthModal.jsx' },
  { from: 'components/common/BloodDropCursor.jsx', to: 'tools/BloodDropCursor.jsx' },
  { from: 'components/common/BookingModal.jsx', to: 'tools/BookingModal.jsx' },
  { from: 'components/common/FloatingCTA.jsx', to: 'tools/FloatingCTA.jsx' },
  { from: 'components/common/SuccessModal.jsx', to: 'tools/SuccessModal.jsx' }
];

// Helper to get all files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });
  return arrayOfFiles;
}

// 1. Move files
console.log('--- MOVING FILES TO CATEGORIES ---');
const oldToNewMap = {};

for (const move of moves) {
  const fromPath = path.join(SRC_DIR, move.from);
  const toPath = path.join(SRC_DIR, move.to);
  
  oldToNewMap[fromPath.toLowerCase()] = toPath;

  if (fs.existsSync(fromPath)) {
    fs.mkdirSync(path.dirname(toPath), { recursive: true });
    const content = fs.readFileSync(fromPath, 'utf8');
    fs.writeFileSync(toPath, content);
    fs.unlinkSync(fromPath);
    console.log(`Moved: ${move.from} -> ${move.to}`);
  } else {
    if (fs.existsSync(toPath)) {
      console.log(`Already at destination: ${move.to}`);
    } else {
      console.warn(`File not found: ${fromPath}`);
    }
  }
}

// 2. Fix imports in ALL .jsx files
console.log('\n--- FIXING IMPORTS ---');
const allJsxFiles = getAllFiles(SRC_DIR).filter(f => f.endsWith('.jsx'));
const importRegex = /from\s+['"]([^'"]+)['"]/g;

for (const filePath of allJsxFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  const currentFileDir = path.dirname(filePath);

  content = content.replace(importRegex, (match, importPath) => {
    if (!importPath.startsWith('.')) return match;
    
    let oldFilePath = Object.keys(oldToNewMap).find(oldP => oldToNewMap[oldP] === filePath) || filePath;
    let oldFileDir = path.dirname(oldFilePath);
    
    let depOldAbsolutePath = path.resolve(oldFileDir, importPath);
    
    let depNewAbsolutePath = Object.keys(oldToNewMap).find(oldP => oldP === depOldAbsolutePath.toLowerCase());
    depNewAbsolutePath = depNewAbsolutePath ? oldToNewMap[depNewAbsolutePath] : depOldAbsolutePath;
    
    let newRelativePath = path.relative(currentFileDir, depNewAbsolutePath);
    
    if (!newRelativePath.startsWith('.')) {
      newRelativePath = './' + newRelativePath;
    }
    
    newRelativePath = newRelativePath.replace(/\\/g, '/');
    
    if (newRelativePath !== importPath) {
      hasChanges = true;
      return `from '${newRelativePath}'`;
    }
    
    return match;
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated imports in: ${path.relative(SRC_DIR, filePath)}`);
  }
}

// 3. Clean up empty features and components directories
function deleteEmptyDirs(dir) {
  const targetDir = path.join(SRC_DIR, dir);
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length === 0) {
      fs.rmdirSync(targetDir);
    } else {
      for (const file of files) {
        const fullPath = path.join(targetDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          deleteEmptyDirs(path.join(dir, file));
        }
      }
      if (fs.readdirSync(targetDir).length === 0) {
        fs.rmdirSync(targetDir);
      }
    }
  }
}

deleteEmptyDirs('features');
deleteEmptyDirs('components');

console.log('\n✅ 5-Category Restructuring complete!');
