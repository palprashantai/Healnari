import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ClinicDataProvider } from './context/ClinicDataContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { IncomingCallModal } from './components/IncomingCallModal.jsx';
import { IosInstallPrompt } from './components/IosInstallPrompt.jsx';

const queryClient = new QueryClient();

import LandingPage from './landing/pages/LandingPage.jsx';
const DoctorLandingPage = lazy(() => import('./landing/pages/DoctorLandingPage.jsx'));
const DoctorPublicProfile = lazy(() => import('./landing/pages/DoctorPublicProfile.jsx'));
const ConditionPage = lazy(() => import('./landing/pages/ConditionPage.jsx'));
const GlossaryArticle = lazy(() => import('./landing/pages/GlossaryArticle.jsx'));
const GuidePage = lazy(() => import('./landing/pages/GuidePage.jsx'));
const LegalPage = lazy(() => import('./landing/pages/LegalPage.jsx'));
const PatientLayout = lazy(() => import('./patient/layouts/PatientLayout.jsx'));
const DoctorLayout = lazy(() => import('./doctor/layouts/DoctorLayout.jsx'));
const AdminLayout = lazy(() => import('./admin/layouts/AdminLayout.jsx'));

// Patient Pages
const PatientDashboard = lazy(() => import('./patient/pages/Dashboard.jsx'));
const PatientDiscovery = lazy(() => import('./patient/pages/Discovery.jsx'));
const PatientTracking = lazy(() => import('./patient/pages/Tracking.jsx'));
const PatientFertility = lazy(() => import('./patient/pages/Fertility.jsx'));
const PatientAppointments = lazy(() => import('./patient/pages/Appointments.jsx'));
const PatientPrescriptions = lazy(() => import('./patient/pages/Prescriptions.jsx'));
const PatientRecords = lazy(() => import('./patient/pages/Records.jsx'));
const PatientFamily = lazy(() => import('./patient/pages/Family.jsx'));
const PatientBilling = lazy(() => import('./patient/pages/Billing.jsx'));
const PatientProfile = lazy(() => import('./patient/pages/Profile.jsx'));

// Doctor Pages
const DoctorDashboard = lazy(() => import('./doctor/pages/Dashboard.jsx'));
const DoctorAnalytics = lazy(() => import('./doctor/pages/Analytics.jsx'));
const DoctorAppointments = lazy(() => import('./doctor/pages/Appointments.jsx'));
const DoctorPatientRequests = lazy(() => import('./doctor/pages/PatientRequests.jsx'));
const DoctorPatients = lazy(() => import('./doctor/pages/Patients.jsx'));
const DoctorPrescriptions = lazy(() => import('./doctor/pages/Prescriptions.jsx'));
const DoctorTelemedicine = lazy(() => import('./doctor/pages/Telemedicine.jsx'));
const DoctorReports = lazy(() => import('./doctor/pages/Reports.jsx'));
const DoctorBilling = lazy(() => import('./doctor/pages/Billing.jsx'));
const DoctorStaff = lazy(() => import('./doctor/pages/Staff.jsx'));
const DoctorProfile = lazy(() => import('./doctor/pages/Profile.jsx'));
const DoctorCommunications = lazy(() => import('./doctor/pages/Communications.jsx'));
const NotFound = lazy(() => import('./NotFound.jsx'));

// Admin Pages
const AdminDashboard = lazy(() => import('./admin/pages/Dashboard.jsx'));
const AdminAnalytics = lazy(() => import('./admin/pages/Analytics.jsx'));
const AdminUsers = lazy(() => import('./admin/pages/Users.jsx'));
const AdminVerification = lazy(() => import('./admin/pages/Verification.jsx'));
const AdminRevenue = lazy(() => import('./admin/pages/Revenue.jsx'));
const AdminCMS = lazy(() => import('./admin/pages/CMS.jsx'));
const AdminReports = lazy(() => import('./admin/pages/Reports.jsx'));
const AdminCommunications = lazy(() => import('./admin/pages/Communications.jsx'));
const AdminLandingManager = lazy(() => import('./admin/pages/LandingManager.jsx'));
const AdminDoctorManager = lazy(() => import('./admin/pages/DoctorManager.jsx'));
const AdminDoctorDetails = lazy(() => import('./admin/pages/DoctorDetails.jsx'));
const AdminPatientDetails = lazy(() => import('./admin/pages/PatientDetails.jsx'));
const AdminTemplates = lazy(() => import('./admin/pages/TemplatesManager.jsx'));
const AdminLeads = lazy(() => import('./admin/pages/Leads.jsx'));
const AdminCronManager = lazy(() => import('./admin/pages/CronManager.jsx'));
const AdminAuditLogs = lazy(() => import('./admin/pages/AuditLogs.jsx'));
const AdminSpecialties = lazy(() => import('./admin/pages/Specialties.jsx'));


function dashboardPathFor(role) {
  if (role === 'doctor') return '/doctor-dashboard';
  if (role === 'admin') return '/admin-dashboard';
  return '/patient-dashboard';
}

const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-aubergine-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-slate-500 font-medium">Loading HealNari...</p>
    </div>
  </div>
);

// Protected Route Wrapper — demo mode: always allow access
function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;

  if (!user) return <Navigate to="/" replace />;

  // Enforce role-based access control
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// AuthContext restores a valid session from localStorage on every load (see
// AuthContext.loadMe) — but the "/" route rendered the marketing landing
// page unconditionally, with no check of that restored session at all. That
// meant a returning, still-logged-in user launching the installed PWA (whose
// start_url is "/") always landed back on the landing page and had to log
// in again, even though their token was still valid. Wait out the same
// `loading` window ProtectedRoute does (avoids a landing-page flash before
// the redirect) and send an already-authenticated visitor straight to their
// dashboard instead.
function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (user) return <Navigate to={dashboardPathFor(user.role)} replace />;

  return <LandingPage />;
}

import CookieBanner from './landing/components/CookieBanner.jsx';
import PWASplashScreen from './components/PWASplashScreen.jsx';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator.jsx';
import { GlobalNotificationPrompt } from './components/GlobalNotificationPrompt.jsx';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <ClinicDataProvider>
      <ToastProvider>
      <NotificationsProvider>
        <Router>
          <PWASplashScreen />
          <NetworkStatusIndicator />
          <IosInstallPrompt />
          <GlobalNotificationPrompt />
          <IncomingCallModal />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-slate-500 font-bold tracking-wider uppercase animate-pulse">Loading Platform...</p>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/for-doctors" element={<DoctorLandingPage />} />
              <Route path="/dr/:doctorId" element={<DoctorPublicProfile />} />
              <Route path="/book/:doctorId" element={<DoctorPublicProfile />} />
              <Route path="/doctor/:doctorId" element={<DoctorPublicProfile />} />
              <Route path="/guide/:guideId" element={<GuidePage />} />
              <Route path="/legal/:document" element={<LegalPage />} />
              <Route path="/:conditionId" element={<ConditionPage />} />
              <Route path="/learn/:slug" element={<GlossaryArticle />} />

              <Route
                path="/patient-dashboard"
                element={
                  <ProtectedRoute allowedRole="patient">
                    <PatientLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<PatientDashboard />} />
                <Route path="find-doctor" element={<PatientDiscovery />} />
                <Route path="tracking" element={<PatientTracking />} />
                <Route path="fertility" element={<PatientFertility />} />
                <Route path="appointments" element={<PatientAppointments />} />
                <Route path="prescriptions" element={<PatientPrescriptions />} />
                <Route path="records" element={<PatientRecords />} />
                <Route path="family" element={<PatientFamily />} />
                <Route path="billing" element={<PatientBilling />} />
                <Route path="profile" element={<PatientProfile />} />
              </Route>

              <Route
                path="/doctor-dashboard"
                element={
                  <ProtectedRoute allowedRole="doctor">
                    <DoctorLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DoctorDashboard />} />
                <Route path="analytics" element={<DoctorAnalytics />} />
                <Route path="appointments" element={<DoctorAppointments />} />
                <Route path="requests" element={<DoctorPatientRequests />} />
                <Route path="patients" element={<DoctorPatients />} />
                <Route path="prescriptions" element={<DoctorPrescriptions />} />
                <Route path="telemedicine" element={<DoctorTelemedicine />} />
                <Route path="reports" element={<DoctorReports />} />
                <Route path="billing" element={<DoctorBilling />} />
                <Route path="staff" element={<DoctorStaff />} />
                <Route path="profile" element={<DoctorProfile />} />
                <Route path="communications" element={<DoctorCommunications />} />
              </Route>

              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="landing" element={<AdminLandingManager />} />
                <Route path="doctors" element={<AdminDoctorManager />} />
                <Route path="doctors/:id" element={<AdminDoctorDetails />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminPatientDetails />} />
                <Route path="verification" element={<AdminVerification />} />
                <Route path="revenue" element={<AdminRevenue />} />
                <Route path="cms" element={<AdminCMS />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="communications" element={<AdminCommunications />} />
                <Route path="templates" element={<AdminTemplates />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="crons" element={<AdminCronManager />} />
                <Route path="specialties" element={<AdminSpecialties />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieBanner />
          </Suspense>
        </Router>
      </NotificationsProvider>
      </ToastProvider>
      </ClinicDataProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
