import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

/**
 * Contextual Pre-Permission Modal (Phase 3 & 4 compliant).
 * Explains healthcare value before prompting for browser push permission.
 */
export function NotificationPermissionModal({ isOpen, onClose, onPermissionHandled }) {
  const { subscribePush, pushPermissionState } = useAuth();
  const toast = useToast();
  const [subscribing, setSubscribing] = useState(false);

  if (!isOpen) return null;

  const isDenied = pushPermissionState === 'denied';

  const handleEnable = async () => {
    if (isDenied) {
      toast('Notifications are blocked. Please allow them in your browser/device site settings.', 'info');
      onClose();
      return;
    }

    setSubscribing(true);
    const res = await subscribePush();
    setSubscribing(false);

    if (res?.success) {
      toast('Health alerts & reminders enabled!', 'success');
      onPermissionHandled?.(true);
      onClose();
    } else if (res?.reason === 'ios_requires_pwa') {
      toast('On iOS, please add HealNari to Home Screen first (Share > Add to Home Screen) to enable push notifications.', 'info');
      onPermissionHandled?.(false);
      onClose();
    } else if (res?.reason === 'denied') {
      toast('Notifications blocked. You can enable them later in device settings.', 'warning');
      onPermissionHandled?.(false);
      onClose();
    } else if (res?.reason === 'dismissed') {
      toast('Notification permission was dismissed.', 'info');
      onClose();
    } else {
      const errMsg = res?.error?.message || 'Could not enable notifications. Please try again.';
      toast(errMsg, 'error');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label="Close"
        >
          <i className="fas fa-times text-sm"></i>
        </button>

        <div className="w-12 h-12 rounded-2xl bg-aubergine-50 text-aubergine-600 flex items-center justify-center text-xl mb-4">
          <i className="fas fa-bell"></i>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2">
          {isDenied ? 'Notifications Are Blocked' : 'Stay Connected to Your Care'}
        </h3>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {isDenied
            ? 'Browser notifications are currently blocked for HealNari. To receive video call alerts and refill reminders, please enable permissions in your browser URL bar or settings.'
            : 'Get timely alerts for video consultations, prescription refill windows, cycle wellness reminders, and secure messages from your doctor.'}
        </p>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-5 space-y-2">
          <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
            <i className="fas fa-shield-halved text-emerald-600"></i>
            <span>Privacy-Safe: Medical details stay private and protected.</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
            <i className="fas fa-sliders text-aubergine-600"></i>
            <span>Customizable: Adjust quiet hours and preferences anytime.</span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {isDenied ? 'Close' : 'Not now'}
          </button>

          {!isDenied && (
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className="px-5 py-2 text-sm font-bold bg-aubergine-600 hover:bg-aubergine-700 text-white rounded-xl shadow-md shadow-aubergine-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {subscribing && <i className="fas fa-spinner fa-spin text-xs"></i>}
              <span>{subscribing ? 'Enabling...' : 'Enable notifications'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPermissionModal;
