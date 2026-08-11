import React, { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'healnari_install_dismissed_until';
const DISMISS_DAYS = 14;
const IOS_SHOW_DELAY_MS = 4000;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

function isDismissedForNow() {
  const until = localStorage.getItem(DISMISS_KEY);
  return !!until && Date.now() < Number(until);
}

/**
 * Floating "install the app" prompt for the landing page. `beforeinstallprompt`
 * only fires on Chromium (desktop + Android) once the browser's own install
 * heuristics are satisfied — we just capture and re-trigger it. iOS Safari
 * never fires that event at all, so it gets a manual "Add to Home Screen"
 * variant instead. Neither shows if already installed (standalone display
 * mode) or recently dismissed.
 */
function AppInstallToast() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [platform, setPlatform] = useState(null); // 'chromium' | 'ios'
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedForNow()) return undefined;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('chromium');
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setInstalled(true);
      setTimeout(() => setVisible(false), 2500);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    let iosTimer;
    if (isIOS()) {
      iosTimer = setTimeout(() => {
        setPlatform('ios');
        setVisible(true);
      }, IOS_SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    setVisible(false);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome !== 'accepted') dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div
      className="fixed top-20 right-4 md:right-6 z-[900] w-[calc(100%-2rem)] max-w-sm animate-slide-in-right"
      role="dialog"
      aria-label="Install the HealNari app"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-aubergine-100/60 blur-xl"></div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors z-10"
        >
          <i className="fas fa-times text-xs"></i>
        </button>

        {installed ? (
          <div className="relative flex items-center gap-3 pr-4">
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg shrink-0">
              <i className="fas fa-check"></i>
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">App installed!</h3>
              <p className="text-xs text-slate-500 mt-0.5">Find HealNari on your home screen.</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-start gap-3 pr-4">
              <img
                src="/brand/logo-icon.jpg"
                alt="HealNari"
                className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0"
              />
              <div>
                <span className="inline-block text-[10px] font-black uppercase tracking-wider text-aubergine-600 bg-aubergine-50 px-2 py-0.5 rounded-full mb-1">
                  New
                </span>
                <h3 className="font-black text-slate-900 text-sm leading-snug">Install the HealNari App</h3>
              </div>
            </div>

            <ul className="mt-3.5 space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <i className="fas fa-bolt text-amber-500 w-4 text-center"></i>
                Launch instantly from your home screen
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-bell text-emerald-500 w-4 text-center"></i>
                Never miss a doctor's call — alerts even when closed
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-shield-halved text-aubergine-500 w-4 text-center"></i>
                Same secure, DPDP Act-compliant experience
              </li>
            </ul>

            {platform === 'chromium' ? (
              <button
                onClick={handleInstall}
                className="w-full mt-4 bg-aubergine-600 hover:bg-aubergine-700 text-white font-bold text-sm py-2.5 rounded-xl shadow-md shadow-aubergine-100 transition-all btn-interactive flex items-center justify-center gap-2"
              >
                <i className="fas fa-download"></i> Install Now
              </button>
            ) : (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                <i className="fas fa-arrow-up-from-bracket text-aubergine-500"></i>
                Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AppInstallToast;
