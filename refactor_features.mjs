import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');

// Define the moves (relative to src directory)
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
  { from: 'components/landing/Footer.jsx', to: 'features/landing/components/Footer.jsx' },
  
  // Also rename App.jsx? No, App.jsx stays in src/
];

// Helper to get all files in a dir
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

// 1. Move files
console.log('--- MOVING FILES ---');
const oldToNewMap = {}; // Maps absolute old path to absolute new path

for (const move of moves) {
  const fromPath = path.join(SRC_DIR, move.from);
  const toPath = path.join(SRC_DIR, move.to);
  
  oldToNewMap[fromPath.toLowerCase()] = toPath;

  if (fs.existsSync(fromPath)) {
    fs.mkdirSync(path.dirname(toPath), { recursive: true });
    // Read content, save it to new location
    const content = fs.readFileSync(fromPath, 'utf8');
    fs.writeFileSync(toPath, content);
    // Delete old file
    fs.unlinkSync(fromPath);
    console.log(`Moved: ${move.from} -> ${move.to}`);
  } else {
    // If it's already moved, just map it so we can fix imports if needed
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
    // We only care about relative imports
    if (!importPath.startsWith('.')) return match;
    
    // Resolve the absolute path of what it was TRYING to import
    // Note: Since we moved the file, the current dir is new, but the old import path string is based on the old location!
    // Wait! If the file was moved, its old directory is different.
    
    // To handle this correctly:
    // What was the old directory of THIS file?
    let oldFilePath = Object.keys(oldToNewMap).find(oldP => oldToNewMap[oldP] === filePath) || filePath;
    // (If the file wasn't moved, oldFilePath == filePath)
    let oldFileDir = path.dirname(oldFilePath);
    
    // The absolute path of the dependency based on the OLD file location
    let depOldAbsolutePath = path.resolve(oldFileDir, importPath);
    
    // Did the dependency move?
    let depNewAbsolutePath = Object.keys(oldToNewMap).find(oldP => oldP === depOldAbsolutePath.toLowerCase());
    depNewAbsolutePath = depNewAbsolutePath ? oldToNewMap[depNewAbsolutePath] : depOldAbsolutePath;
    
    // Now compute the new relative path from the NEW file location to the NEW dependency location
    let newRelativePath = path.relative(currentFileDir, depNewAbsolutePath);
    
    // Ensure relative path starts with ./ or ../
    if (!newRelativePath.startsWith('.')) {
      newRelativePath = './' + newRelativePath;
    }
    
    // Replace windows backslashes with forward slashes for imports
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

console.log('\n✅ Restructuring complete! Please check the app to ensure everything works.');
