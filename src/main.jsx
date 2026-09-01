import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { setupPWA } from './pwa.js';

const SpeedInsights = React.lazy(() => import('@vercel/speed-insights/react').then(m => ({ default: m.SpeedInsights })));
const Analytics = React.lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })));

setupPWA();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <React.Suspense fallback={null}>
      <SpeedInsights />
      <Analytics />
    </React.Suspense>
  </React.StrictMode>
);
