import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationPermissionModal from './NotificationPermissionModal.jsx';

/**
 * Global Contextual Permission Prompt.
 * Automatically checks if a logged-in user has not yet enabled push notifications on their device
 * and gently prompts them so their phone can receive reminders when the app is closed.
 */
export function GlobalNotificationPrompt() {
  const { user, pushPermissionState, isPushSubscribed, isPushSupported } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported) return;

    // Check if permission has never been asked
    if (pushPermissionState === 'default' && !isPushSubscribed) {
      const dismissed = sessionStorage.getItem('healnari_notif_prompt_dismissed');
      if (!dismissed) {
        // Show after a brief gentle 2.5s delay so the dashboard can load smoothly
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, pushPermissionState, isPushSubscribed, isPushSupported]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('healnari_notif_prompt_dismissed', 'true');
  };

  const handlePermissionHandled = (granted) => {
    setIsOpen(false);
    sessionStorage.setItem('healnari_notif_prompt_dismissed', 'true');
  };

  if (!isOpen) return null;

  return (
    <NotificationPermissionModal
      isOpen={isOpen}
      onClose={handleClose}
      onPermissionHandled={handlePermissionHandled}
    />
  );
}

export default GlobalNotificationPrompt;
