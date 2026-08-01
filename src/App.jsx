import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';

const LandingPage = lazy(() => import('./landing/pages/LandingPage.jsx'));
const PatientLayout = lazy(() => import('./patient/layouts/PatientLayout.jsx'));
const DoctorLayout = lazy(() => import('./doctor/layouts/DoctorLayout.jsx'));
const AdminLayout = lazy(() => import('./admin/layouts/AdminLayout.jsx'));

// Patient Pages
const PatientDashboard = lazy(() => import('./patient/pages/Dashboard.jsx'));
const PatientDiscovery = lazy(() => import('./patient/pages/Discovery.jsx'));
const PatientTracking = lazy(() => import('./patient/pages/Tracking.jsx'));
const PatientAppointments = lazy(() => import('./patient/pages/Appointments.jsx'));
const PatientPrescriptions = lazy(() => import('./patient/pages/Prescriptions.jsx'));
const PatientRecords = lazy(() => import('./patient/pages/Records.jsx'));
const PatientFamily = lazy(() => import('./patient/pages/Family.jsx'));
const PatientBilling = lazy(() => import('./patient/pages/Billing.jsx'));
const PatientProfile = lazy(() => import('./patient/pages/Profile.jsx'));

// Doctor Pages
const DoctorDashboard = lazy(() => import('./doctor/pages/Dashboard.jsx'));
const DoctorAppointments = lazy(() => import('./doctor/pages/Appointments.jsx'));
const DoctorPatients = lazy(() => import('./doctor/pages/Patients.jsx'));
const DoctorPrescriptions = lazy(() => import('./doctor/pages/Prescriptions.jsx'));
const DoctorTelemedicine = lazy(() => import('./doctor/pages/Telemedicine.jsx'));
const DoctorReports = lazy(() => import('./doctor/pages/Reports.jsx'));
const DoctorBilling = lazy(() => import('./doctor/pages/Billing.jsx'));
const DoctorStaff = lazy(() => import('./doctor/pages/Staff.jsx'));
const DoctorProfile = lazy(() => import('./doctor/pages/Profile.jsx'));
const NotFound = lazy(() => import('./NotFound.jsx'));

// Admin Pages
const AdminDashboard = lazy(() => import('./admin/pages/Dashboard.jsx'));
const AdminUsers = lazy(() => import('./admin/pages/Users.jsx'));
const AdminVerification = lazy(() => import('./admin/pages/Verification.jsx'));
const AdminClinics = lazy(() => import('./admin/pages/Clinics.jsx'));
const AdminRevenue = lazy(() => import('./admin/pages/Revenue.jsx'));
const AdminCMS = lazy(() => import('./admin/pages/CMS.jsx'));
const AdminReports = lazy(() => import('./admin/pages/Reports.jsx'));

// Protected Route Wrapper — demo mode: always allow access
function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-aubergine-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Loading FemCare...</p>
      </div>
    </div>
  );

  // Demo mode: allow access even without strict auth match
  if (!user) return <Navigate to="/" replace />;

  return children;
}

import CookieBanner from './landing/components/CookieBanner.jsx';

function App() {
  // Subtle aubergine cursor — elegant 10px circle that follows the mouse
  useEffect(() => {
    const cursor = document.createElement('div');
    cursor.id = 'femcare-cursor';
    Object.assign(cursor.style, {
      position: 'fixed',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#7a3e65',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'translate(-50%, -50%)',
      transition: 'transform 0.08s ease, opacity 0.2s ease',
      opacity: '0',
      mixBlendMode: 'multiply',
    });
    document.body.appendChild(cursor);

    const move = (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.style.opacity = '0.6';
    };
    const hide = () => { cursor.style.opacity = '0'; };
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', hide);

    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', hide);
      cursor.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-500 font-bold tracking-wider uppercase animate-pulse">Loading Platform...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
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
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="patients" element={<DoctorPatients />} />
              <Route path="prescriptions" element={<DoctorPrescriptions />} />
              <Route path="telemedicine" element={<DoctorTelemedicine />} />
              <Route path="reports" element={<DoctorReports />} />
              <Route path="billing" element={<DoctorBilling />} />
              <Route path="staff" element={<DoctorStaff />} />
              <Route path="profile" element={<DoctorProfile />} />
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
              <Route path="users" element={<AdminUsers />} />
              <Route path="verification" element={<AdminVerification />} />
              <Route path="clinics" element={<AdminClinics />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="cms" element={<AdminCMS />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
        </Suspense>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
