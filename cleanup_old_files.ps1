# FEMCARE Directory Cleanup Script
# Run this PowerShell script from the project root (d:\FEMCARE) AFTER verifying 
# the app still works correctly with the new structure.
#
# This removes all the OLD flat files from src/pages/ and src/components/ 
# that have been migrated to their new organized subdirectories.

Write-Host "🧹 FemCare - Old File Cleanup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

$pagesDir = "src\pages"
$componentsDir = "src\components"

# --- OLD ADMIN PAGE FILES ---
$adminFiles = @(
    "$pagesDir\AdminCMS.jsx",
    "$pagesDir\AdminClinics.jsx",
    "$pagesDir\AdminDashboard.jsx",
    "$pagesDir\AdminReports.jsx",
    "$pagesDir\AdminRevenue.jsx",
    "$pagesDir\AdminUsers.jsx",
    "$pagesDir\AdminVerification.jsx"
)

# --- OLD DOCTOR PAGE FILES ---
$doctorFiles = @(
    "$pagesDir\DoctorAppointments.jsx",
    "$pagesDir\DoctorBilling.jsx",
    "$pagesDir\DoctorDashboard.jsx",
    "$pagesDir\DoctorPatients.jsx",
    "$pagesDir\DoctorPrescriptions.jsx",
    "$pagesDir\DoctorReports.jsx",
    "$pagesDir\DoctorStaff.jsx",
    "$pagesDir\DoctorTelemedicine.jsx"
)

# --- OLD PATIENT PAGE FILES ---
$patientFiles = @(
    "$pagesDir\PatientAppointments.jsx",
    "$pagesDir\PatientBilling.jsx",
    "$pagesDir\PatientDashboard.jsx",
    "$pagesDir\PatientDiscovery.jsx",
    "$pagesDir\PatientFamily.jsx",
    "$pagesDir\PatientPrescriptions.jsx",
    "$pagesDir\PatientRecords.jsx",
    "$pagesDir\PatientTracking.jsx"
)

# --- OLD COMPONENT FILES (landing) ---
$landingComponentFiles = @(
    "$componentsDir\Conditions.jsx",
    "$componentsDir\Doctors.jsx",
    "$componentsDir\Faq.jsx",
    "$componentsDir\Footer.jsx",
    "$componentsDir\Header.jsx",
    "$componentsDir\Hero.jsx",
    "$componentsDir\HowItWorks.jsx",
    "$componentsDir\LabTests.jsx",
    "$componentsDir\NewsletterSignup.jsx",
    "$componentsDir\Outcomes.jsx",
    "$componentsDir\PcosDiagram.jsx",
    "$componentsDir\Stats.jsx",
    "$componentsDir\Testimonials.jsx"
)

# --- OLD COMPONENT FILES (common) ---
$commonComponentFiles = @(
    "$componentsDir\AuthModal.jsx",
    "$componentsDir\BloodDropCursor.jsx",
    "$componentsDir\BookingModal.jsx",
    "$componentsDir\FloatingCTA.jsx",
    "$componentsDir\SuccessModal.jsx"
)

# --- OLD COMPONENT FILES (features) ---
$featureComponentFiles = @(
    "$componentsDir\CycleTracker.jsx",
    "$componentsDir\GuideModal.jsx",
    "$componentsDir\HealthTips.jsx",
    "$componentsDir\SymptomChecker.jsx"
)

$allFiles = $adminFiles + $doctorFiles + $patientFiles + $landingComponentFiles + $commonComponentFiles + $featureComponentFiles

$deleted = 0
$notFound = 0

foreach ($file in $allFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✅ Deleted: $file" -ForegroundColor Green
        $deleted++
    } else {
        Write-Host "  ⚠️  Not found (already removed?): $file" -ForegroundColor Yellow
        $notFound++
    }
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host "   Deleted: $deleted files" -ForegroundColor Green
if ($notFound -gt 0) {
    Write-Host "   Skipped (not found): $notFound files" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Your new directory structure:" -ForegroundColor Cyan
Write-Host "  src/components/common/    → AuthModal, BloodDropCursor, BookingModal, FloatingCTA, SuccessModal"
Write-Host "  src/components/landing/   → Conditions, Doctors, Faq, Footer, Header, Hero, ..."
Write-Host "  src/components/features/  → CycleTracker, GuideModal, HealthTips, SymptomChecker"
Write-Host "  src/pages/admin/          → CMS, Clinics, Dashboard, Reports, Revenue, Users, Verification"
Write-Host "  src/pages/doctor/         → Appointments, Billing, Dashboard, Patients, Prescriptions, ..."
Write-Host "  src/pages/patient/        → Appointments, Billing, Dashboard, Discovery, Family, ..."
