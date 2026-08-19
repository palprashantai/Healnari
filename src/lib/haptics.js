/**
 * Light cross-platform haptic feedback helper using navigator.vibrate.
 * Safely ignores execution on non-supporting devices or desktops.
 */

export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        navigator.vibrate([12, 40, 15]);
        break;
      case 'warning':
        navigator.vibrate([20, 60, 20]);
        break;
      case 'error':
        navigator.vibrate([40, 80, 40, 80, 40]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch {
    // Graceful fallback if permission is restricted
  }
};
