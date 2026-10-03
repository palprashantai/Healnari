import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import './index.css';
import { setupPWA } from './pwa.js';

const SpeedInsights = React.lazy(() => import('@vercel/speed-insights/react').then(m => ({ default: m.SpeedInsights })));
const Analytics = React.lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })));

// Auto self-heal on new production deployments when old chunk hashes 404
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite Preload Error] Outdated chunk requested after new deployment. Auto-reloading...', event);
    const lastReload = sessionStorage.getItem('healnari_preload_reload');
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem('healnari_preload_reload', String(now));
      window.location.reload();
    }
  });
}

setupPWA();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
      <React.Suspense fallback={null}>
        <SpeedInsights />
        <Analytics />
      </React.Suspense>
    </HelmetProvider>
  </React.StrictMode>
);
