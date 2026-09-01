import React from 'react';
import { Outlet } from 'react-router-dom';
import { ClinicDataProvider } from '../context/ClinicDataContext.jsx';
import { NotificationsProvider } from '../context/NotificationsContext.jsx';
import { IncomingCallModal } from '../components/IncomingCallModal.jsx';
import { GlobalNotificationPrompt } from '../components/GlobalNotificationPrompt.jsx';

export default function AuthenticatedLayout() {
  return (
    <NotificationsProvider>
      <ClinicDataProvider>
        <GlobalNotificationPrompt />
        <IncomingCallModal />
        <Outlet />
      </ClinicDataProvider>
    </NotificationsProvider>
  );
}
